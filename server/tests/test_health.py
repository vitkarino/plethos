from __future__ import annotations

import tempfile
import unittest
from pathlib import Path

from app.health import HealthService, WorkerCountError, enforce_single_worker
from app.storage.migrations import head_revision, run_migrations
from app.storage.recording_repository import RecordingRepository


class SingleWorkerEnforcementTests(unittest.TestCase):
    """Live measurement state is process-local, so >1 worker must fail loudly."""

    def test_absent_or_single_worker_is_accepted(self) -> None:
        for environ in ({}, {"WEB_CONCURRENCY": "1"}, {"WEB_CONCURRENCY": "  "}):
            with self.subTest(environ=environ):
                enforce_single_worker(environ)  # should not raise

    def test_multiple_workers_are_rejected(self) -> None:
        for name in ("WEB_CONCURRENCY", "UVICORN_WORKERS", "GUNICORN_WORKERS"):
            with self.subTest(variable=name):
                with self.assertRaises(WorkerCountError):
                    enforce_single_worker({name: "4"})

    def test_non_integer_worker_count_is_rejected(self) -> None:
        with self.assertRaises(WorkerCountError):
            enforce_single_worker({"WEB_CONCURRENCY": "many"})


class ReadinessTests(unittest.TestCase):
    def setUp(self) -> None:
        self._tempdir = tempfile.TemporaryDirectory()
        self.database_url = f"sqlite:///{Path(self._tempdir.name) / 'health.db'}"
        self._repositories: list[RecordingRepository] = []

    def tearDown(self) -> None:
        for repository in self._repositories:
            repository.dispose()
        self._tempdir.cleanup()

    def _repository(self, url: str | None) -> RecordingRepository:
        repository = RecordingRepository(url)
        self._repositories.append(repository)
        return repository

    def test_migrated_database_is_ready(self) -> None:
        run_migrations(self.database_url)
        service = HealthService(
            self._repository(self.database_url), expected_revision=head_revision()
        )

        report = service.readiness()

        self.assertTrue(report.ready)
        self.assertTrue(all(dependency.ok for dependency in report.dependencies))

    def test_liveness_ignores_dependencies(self) -> None:
        # No database at all: still alive, so an orchestrator will not restart us.
        service = HealthService(self._repository(None), expected_revision=head_revision())

        self.assertTrue(service.liveness())
        self.assertFalse(service.readiness().ready)

    def test_unconfigured_database_is_not_ready(self) -> None:
        service = HealthService(self._repository(None), expected_revision=head_revision())

        report = service.readiness()

        self.assertFalse(report.ready)
        database = report.detail_for("database")
        self.assertIsNotNone(database)
        self.assertFalse(database.ok)
        self.assertIn("not configured", database.detail or "")

    def test_unmigrated_database_is_not_ready(self) -> None:
        # Reachable, but `alembic upgrade head` was never run.
        service = HealthService(
            self._repository(self.database_url), expected_revision=head_revision()
        )

        report = service.readiness()

        self.assertFalse(report.ready)
        schema = report.detail_for("schema")
        self.assertIsNotNone(schema)
        self.assertFalse(schema.ok)
        self.assertIn("alembic upgrade head", schema.detail or "")

    def test_schema_behind_the_migration_head_is_not_ready(self) -> None:
        run_migrations(self.database_url)
        service = HealthService(
            self._repository(self.database_url),
            expected_revision="9999_a_future_revision",
        )

        report = service.readiness()

        self.assertFalse(report.ready)
        schema = report.detail_for("schema")
        self.assertIn("expected 9999_a_future_revision", schema.detail or "")

    def test_unreachable_database_is_not_ready(self) -> None:
        """The case the old health endpoint reported as healthy.

        A URL that is configured but points nowhere used to satisfy
        `database_enabled`, so health stayed green against a stopped database.
        """
        unreachable = "postgresql+psycopg://plethos@127.0.0.1:1/plethos"
        service = HealthService(
            self._repository(unreachable), expected_revision=head_revision()
        )

        report = service.readiness()

        self.assertFalse(report.ready)
        database = report.detail_for("database")
        self.assertFalse(database.ok)
        self.assertIn("unreachable", database.detail or "")


class UnreachableDatabaseStartupTests(unittest.TestCase):
    """Booting must survive a dead database, coming up live but not ready.

    Regression test: startup recovery used to run unconditionally and raised
    OperationalError against an unreachable database, so the process crash-looped
    instead of reporting why it was not ready.
    """

    UNREACHABLE = "postgresql+psycopg://plethos@127.0.0.1:1/plethos"

    def setUp(self) -> None:
        from app import main as main_module
        from app.core.config import AppConfig
        from app.processing.service import PPGProcessingService
        from app.realtime.store import MetricsStore

        self._main = main_module
        self._saved = {
            name: getattr(main_module, name)
            for name in ("recording_repository", "processing_service", "health_service")
        }

        self.repository = RecordingRepository(self.UNREACHABLE)
        main_module.recording_repository = self.repository
        main_module.processing_service = PPGProcessingService(
            AppConfig(database_url=self.UNREACHABLE), MetricsStore(), self.repository
        )
        main_module.health_service = HealthService(
            self.repository, expected_revision=head_revision()
        )

    def tearDown(self) -> None:
        for name, value in self._saved.items():
            setattr(self._main, name, value)
        self.repository.dispose()

    def test_app_boots_live_but_not_ready(self) -> None:
        from starlette.testclient import TestClient

        with TestClient(self._main.app) as client:
            self.assertEqual(client.get("/api/health/live").status_code, 200)

            ready = client.get("/api/health/ready")
            self.assertEqual(ready.status_code, 503)
            self.assertEqual(ready.json()["$meta"]["error"]["code"], "not_ready")

            aggregate = client.get("/api/health")
            self.assertEqual(aggregate.status_code, 200)
            self.assertEqual(aggregate.json()["data"]["status"], "degraded")
            self.assertEqual(
                aggregate.json()["data"]["services"]["database"], "disconnected"
            )


if __name__ == "__main__":
    unittest.main()
