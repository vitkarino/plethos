"""Programmatic access to the Alembic migration state.

Schema evolution is owned by Alembic, not by application startup. This module is
the only supported way for Python code to drive or inspect migrations, so tests,
the `migrate` container, and the readiness probe all agree on one mechanism.

The application does **not** call :func:`run_migrations` while serving. Startup
verifies that the database is already at head (see :func:`pending_revisions`) and
refuses to serve otherwise; applying migrations is a separate, deliberate step.
"""

from __future__ import annotations

from pathlib import Path

from alembic import command
from alembic.config import Config
from alembic.runtime.migration import MigrationContext
from alembic.script import ScriptDirectory
from sqlalchemy import create_engine

from app.storage.recording_repository import normalize_database_url

SERVER_ROOT = Path(__file__).resolve().parents[2]
ALEMBIC_INI = SERVER_ROOT / "alembic.ini"
ALEMBIC_DIRECTORY = SERVER_ROOT / "alembic"


def alembic_config(database_url: str, *, configure_logging: bool = False) -> Config:
    """Build an Alembic config bound to ``database_url``.

    Absolute paths are injected so the config works regardless of the caller's
    working directory — containers and tests do not run from `server/`.
    """
    config = Config(str(ALEMBIC_INI))
    config.set_main_option("script_location", str(ALEMBIC_DIRECTORY))
    config.attributes["database_url"] = normalize_database_url(database_url)
    config.attributes["configure_logging"] = configure_logging
    return config


def run_migrations(database_url: str, *, revision: str = "head") -> None:
    """Upgrade ``database_url`` to ``revision`` (default: the latest revision)."""
    command.upgrade(alembic_config(database_url), revision)


def downgrade_migrations(database_url: str, revision: str) -> None:
    """Step ``database_url`` back to ``revision``.

    Destructive at the baseline: downgrading past `0002` drops every table. Take
    a backup first.
    """
    command.downgrade(alembic_config(database_url), revision)


def head_revision(database_url: str) -> str | None:
    """The newest revision defined in the migration scripts."""
    return ScriptDirectory.from_config(alembic_config(database_url)).get_current_head()


def current_revision(database_url: str) -> str | None:
    """The revision the database is actually stamped with, or None if unmigrated."""
    engine = create_engine(normalize_database_url(database_url), future=True)
    try:
        with engine.connect() as connection:
            return MigrationContext.configure(connection).get_current_revision()
    finally:
        engine.dispose()


def pending_revisions(database_url: str) -> bool:
    """Whether the database is behind the migration scripts.

    Used by the readiness probe: a database that is not at head must not receive
    traffic, because the application's queries assume the newest schema.
    """
    return current_revision(database_url) != head_revision(database_url)
