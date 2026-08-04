"""Liveness and readiness for the Plethos API.

The two questions are deliberately different:

* **Liveness** — is this process running and able to answer? It touches no
  dependency, so a database outage never causes an orchestrator to kill and
  restart an otherwise healthy container.
* **Readiness** — can this process correctly serve traffic *right now*? It
  executes a real query and confirms the schema is at head. A database that is
  unreachable, or behind the migrations, means not ready.

The old `/api/health` reported the database as "connected" whenever a URL was
merely *configured*, so it stayed green against a stopped database. Readiness
here proves reachability instead of assuming it.
"""

from __future__ import annotations

from dataclasses import dataclass
import os

from app.storage.recording_repository import RecordingRepository


class WorkerCountError(RuntimeError):
    """Raised when the process is configured to run more than one worker.

    Live device connections, measurement sessions, sample buffers, and browser
    subscribers are all process-local. A second worker would own a different
    half of that state, so a device could be connected to one worker while the
    REST request that starts its measurement lands on another. Until live state
    moves out of process, one worker is a correctness requirement rather than a
    tuning choice.
    """


#: Environment variables that ASGI servers read to fork additional workers.
WORKER_COUNT_VARIABLES = ("WEB_CONCURRENCY", "UVICORN_WORKERS", "GUNICORN_WORKERS")


def enforce_single_worker(environ: dict[str, str] | None = None) -> None:
    """Fail fast when the deployment asks for more than one worker."""
    source = os.environ if environ is None else environ
    for name in WORKER_COUNT_VARIABLES:
        raw = source.get(name)
        if raw is None or not raw.strip():
            continue
        try:
            count = int(raw)
        except ValueError as exc:
            raise WorkerCountError(
                f"{name}={raw!r} is not an integer; Plethos requires exactly one "
                "API worker because live measurement state is process-local"
            ) from exc
        if count != 1:
            raise WorkerCountError(
                f"{name}={count} is unsupported: Plethos requires exactly one API "
                "worker because device connections, measurement sessions, sample "
                "buffers, and browser subscribers are process-local state. Scale "
                "with a single worker until that state is externalised."
            )


@dataclass(frozen=True)
class DependencyStatus:
    """One checked dependency and why it is or is not usable."""

    name: str
    ok: bool
    detail: str | None = None


@dataclass(frozen=True)
class HealthReport:
    ready: bool
    dependencies: tuple[DependencyStatus, ...]

    def detail_for(self, name: str) -> DependencyStatus | None:
        for dependency in self.dependencies:
            if dependency.name == name:
                return dependency
        return None


class HealthService:
    """Answers liveness and readiness questions about this process."""

    def __init__(
        self,
        repository: RecordingRepository | None,
        *,
        expected_revision: str | None,
    ) -> None:
        self._repository = repository
        # Resolved once at composition time: the migration scripts on disk cannot
        # change while the process runs, so there is no reason to re-read them on
        # every probe.
        self._expected_revision = expected_revision

    def liveness(self) -> bool:
        """True whenever the process can execute a request. No dependencies."""
        return True

    def readiness(self) -> HealthReport:
        database = self._check_database()
        schema = self._check_schema(database.ok)
        dependencies = (database, schema)
        return HealthReport(
            ready=all(dependency.ok for dependency in dependencies),
            dependencies=dependencies,
        )

    def _check_database(self) -> DependencyStatus:
        if self._repository is None or not self._repository.enabled:
            return DependencyStatus(
                "database", False, "DATABASE_URL is not configured"
            )
        if not self._repository.ping():
            return DependencyStatus("database", False, "database is unreachable")
        return DependencyStatus("database", True)

    def _check_schema(self, database_reachable: bool) -> DependencyStatus:
        if not database_reachable:
            return DependencyStatus(
                "schema", False, "cannot verify the schema without a database"
            )
        if self._expected_revision is None:
            return DependencyStatus(
                "schema", False, "no migration head is defined"
            )

        applied = self._repository.applied_revision() if self._repository else None
        if applied is None:
            return DependencyStatus(
                "schema",
                False,
                "database has no applied migration; run `alembic upgrade head`",
            )
        if applied != self._expected_revision:
            return DependencyStatus(
                "schema",
                False,
                f"database is at {applied}, expected {self._expected_revision}; "
                "run `alembic upgrade head`",
            )
        return DependencyStatus("schema", True, applied)
