"""Alembic environment for the Plethos backend.

The database URL is resolved from the application settings so migrations and the
application can never disagree about which database they target. Resolution
order:

1. ``config.attributes["database_url"]``, set by programmatic callers;
2. ``-x url=...`` passed on the Alembic command line;
3. ``ALEMBIC_DATABASE_URL``;
4. the application's own ``DATABASE_URL`` / ``POSTGRES_*`` resolution.

``target_metadata`` is imported only so ``alembic revision --autogenerate`` can
diff against the live models. Individual revisions never import application
models: each revision carries its own immutable copy of the schema it changes,
so editing a model can never retroactively change recorded history.
"""

from __future__ import annotations

import sys
from logging.config import fileConfig
from pathlib import Path

from alembic import context
from sqlalchemy import create_engine

SERVER_ROOT = Path(__file__).resolve().parents[1]
if str(SERVER_ROOT) not in sys.path:
    sys.path.insert(0, str(SERVER_ROOT))

from app.core.config import settings  # noqa: E402
from app.storage.recording_repository import (  # noqa: E402
    metadata as target_metadata,
    normalize_database_url,
)

config = context.config
# Programmatic callers (tests, the readiness probe) pass configure_logging=False
# so running a migration cannot reconfigure the host process's logging.
if config.config_file_name is not None and config.attributes.get("configure_logging", True):
    fileConfig(config.config_file_name)


def _database_url() -> str:
    programmatic = config.attributes.get("database_url")
    if programmatic:
        return normalize_database_url(str(programmatic))

    override = context.get_x_argument(as_dictionary=True).get("url")
    if override:
        return normalize_database_url(override)

    import os

    from_env = os.getenv("ALEMBIC_DATABASE_URL")
    if from_env:
        return normalize_database_url(from_env)

    if not settings.database_url:
        raise RuntimeError(
            "No database URL configured. Set DATABASE_URL, ALEMBIC_DATABASE_URL, "
            "or pass `-x url=...` to Alembic."
        )
    return normalize_database_url(settings.database_url)


def run_migrations_offline() -> None:
    """Emit SQL to stdout without connecting, for review or manual application."""
    context.configure(
        url=_database_url(),
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        compare_type=True,
    )
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """Apply migrations against a live connection in a single transaction."""
    url = _database_url()
    engine = create_engine(url, poolclass=None, future=True)
    try:
        with engine.connect() as connection:
            context.configure(
                connection=connection,
                target_metadata=target_metadata,
                compare_type=True,
                # SQLite cannot ALTER in place; batch mode rewrites the table
                # instead. Harmless on PostgreSQL, required for the test suite.
                render_as_batch=connection.dialect.name == "sqlite",
            )
            with context.begin_transaction():
                context.run_migrations()
    finally:
        engine.dispose()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
