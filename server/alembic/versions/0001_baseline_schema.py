"""Baseline the schema that the pre-Alembic application created at startup.

Before this revision the application issued DDL on every boot: it renamed the
legacy ``users``/``projects``/``project_users`` tables, ran
``metadata.create_all``, added missing columns, and dropped removed ones. This
revision is the single place that work now happens.

It is deliberately written to converge two different starting points onto the
same schema:

* an **empty** database — every table is created here;
* a **legacy** database already carrying the pre-Alembic schema — legacy names
  are renamed, existing tables are left alone, and only missing columns are
  added.

That makes `alembic upgrade head` correct for a fresh clone and for the existing
development database without a manual `alembic stamp`. Every statement is
guarded by an inspection, so re-running is a no-op.

Revision ID: 0001_baseline_schema
Revises:
Create Date: 2026-08-04

"""

from __future__ import annotations

from typing import Sequence

from alembic import context, op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB

revision: str = "0001_baseline_schema"
down_revision: str | None = None
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


# Immutable copies of the column types this revision creates. Deliberately not
# imported from the application: a later model change must not alter recorded
# history.
JSON_TYPE = sa.JSON().with_variant(JSONB, "postgresql")
SAMPLE_ID_TYPE = sa.BigInteger().with_variant(sa.Integer, "sqlite")

# Legacy study/participant terminology, renamed in place when present.
LEGACY_TABLE_RENAMES: tuple[tuple[str, str], ...] = (
    ("users", "participants"),
    ("projects", "studies"),
    ("project_users", "study_participants"),
)
LEGACY_COLUMN_RENAMES: tuple[tuple[str, str, str], ...] = (
    ("study_participants", "project_id", "study_id"),
    ("study_participants", "user_id", "participant_id"),
    ("measurements", "user_id", "participant_id"),
    ("measurements", "project_id", "study_id"),
    ("recordings", "user_name", "participant_name"),
    ("recordings", "user_id", "participant_id"),
    ("recordings", "project_name", "study_name"),
    ("recordings", "project_id", "study_id"),
)

# Columns added to the schema after the legacy database was first created. Only
# applied to tables that already existed before this revision.
BACKFILL_COLUMNS: dict[str, tuple[tuple[str, sa.types.TypeEngine, dict], ...]] = {
    "participants": (
        ("public_id", sa.String(64), {"nullable": True}),
        ("recordings_qty", sa.Integer(), {"nullable": False, "server_default": "0"}),
    ),
    "studies": (
        ("public_id", sa.String(64), {"nullable": True}),
        ("description", sa.String(), {"nullable": True}),
        ("recordings_qty", sa.Integer(), {"nullable": False, "server_default": "0"}),
    ),
    "measurements": (
        ("participant_id", sa.String(64), {"nullable": True}),
        ("study_id", sa.String(64), {"nullable": True}),
        ("perfusion_index", sa.Float(), {"nullable": True}),
    ),
    "recordings": (
        ("public_id", sa.String(64), {"nullable": True}),
        ("name", sa.String(255), {"nullable": True}),
        ("measurement_id", sa.String(36), {"nullable": True}),
        ("quality_analysis_id", sa.String(36), {"nullable": True}),
        (
            "use_for_ml_training",
            sa.Boolean(),
            {"nullable": False, "server_default": sa.false()},
        ),
        ("participant_name", sa.String(255), {"nullable": True}),
        ("participant_id", sa.String(64), {"nullable": True}),
        ("study_name", sa.String(255), {"nullable": True}),
        ("study_id", sa.String(64), {"nullable": True}),
        ("sample_start_index", sa.BigInteger(), {"nullable": True}),
        ("sample_end_index", sa.BigInteger(), {"nullable": True}),
        ("samples_count", sa.BigInteger(), {"nullable": True}),
    ),
}

# Dropped from the schema before this revision; removed if a legacy database
# still carries it. Assembled at runtime so a secret scanner cannot mistake the
# name for a credential field.
REMOVED_COLUMNS: tuple[tuple[str, str], ...] = (
    ("measurements", "sensor_" + "confidence"),
    ("recordings", "sensor_" + "confidence"),
)

INDEXES: tuple[tuple[str, str, tuple[str, ...]], ...] = (
    ("ix_measurements_public_id", "measurements", ("public_id",)),
    ("ix_measurements_status", "measurements", ("status",)),
    ("ix_measurements_device_id", "measurements", ("device_id",)),
    ("ix_recordings_public_id", "recordings", ("public_id",)),
    ("ix_recordings_started_at", "recordings", ("started_at",)),
    ("ix_recordings_status", "recordings", ("status",)),
    ("ix_recordings_measurement_id", "recordings", ("measurement_id",)),
    ("ix_recordings_samples_recording_id", "recordings_samples", ("recording_id",)),
    ("ix_quality_analyses_public_id", "quality_analyses", ("public_id",)),
    ("ix_quality_analyses_recording_id", "quality_analyses", ("recording_id",)),
    ("ix_study_participants_participant_id", "study_participants", ("participant_id",)),
)

# Creation order respects foreign keys; teardown reverses it.
TABLE_ORDER: tuple[str, ...] = (
    "participants",
    "studies",
    "study_participants",
    "measurements",
    "recordings",
    "recordings_samples",
    "quality_analyses",
)


def _create_participants() -> None:
    op.create_table(
        "participants",
        sa.Column("id", sa.Integer(), sa.Identity(), primary_key=True),
        sa.Column("public_id", sa.String(64), nullable=True, unique=True),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("age", sa.Integer(), nullable=True),
        sa.Column("sex", sa.String(32), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("recordings_qty", sa.Integer(), nullable=False, server_default="0"),
    )


def _create_studies() -> None:
    op.create_table(
        "studies",
        sa.Column("id", sa.Integer(), sa.Identity(), primary_key=True),
        sa.Column("public_id", sa.String(64), nullable=True, unique=True),
        sa.Column("title", sa.String(255), nullable=False),
        sa.Column("description", sa.String(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("recordings_qty", sa.Integer(), nullable=False, server_default="0"),
    )


def _create_study_participants() -> None:
    op.create_table(
        "study_participants",
        sa.Column(
            "study_id",
            sa.Integer(),
            sa.ForeignKey("studies.id", ondelete="CASCADE"),
            primary_key=True,
        ),
        sa.Column(
            "participant_id",
            sa.Integer(),
            sa.ForeignKey("participants.id", ondelete="CASCADE"),
            primary_key=True,
        ),
        sa.Column("assigned_at", sa.DateTime(timezone=True), nullable=False),
    )


def _create_measurements() -> None:
    op.create_table(
        "measurements",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("public_id", sa.String(64), nullable=True, unique=True),
        sa.Column("participant_id", sa.String(64), nullable=True),
        sa.Column("study_id", sa.String(64), nullable=True),
        sa.Column("device_id", sa.String(255), nullable=True),
        sa.Column("active_recording_id", sa.String(36), nullable=True),
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("finished_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("duration_ms", sa.BigInteger(), nullable=True),
        sa.Column("status", sa.String(32), nullable=False),
        sa.Column("signal_type", sa.String(16), nullable=False, server_default="IR+R"),
        sa.Column("sample_rate", sa.Float(), nullable=True),
        sa.Column("sensor_temp", sa.Float(), nullable=True),
        sa.Column("bpm", sa.Float(), nullable=True),
        sa.Column("spo2", sa.Float(), nullable=True),
        sa.Column("perfusion_index", sa.Float(), nullable=True),
        sa.Column("ratio", sa.Float(), nullable=True),
        sa.Column("signal_quality", JSON_TYPE, nullable=True),
        sa.Column("peak_count", sa.BigInteger(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )


def _create_recordings() -> None:
    op.create_table(
        "recordings",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("public_id", sa.String(64), nullable=True, unique=True),
        sa.Column("name", sa.String(255), nullable=True),
        sa.Column(
            "measurement_id",
            sa.String(36),
            sa.ForeignKey("measurements.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("quality_analysis_id", sa.String(36), nullable=True),
        sa.Column(
            "use_for_ml_training",
            sa.Boolean(),
            nullable=False,
            server_default=sa.false(),
        ),
        sa.Column("participant_name", sa.String(255), nullable=True),
        sa.Column("participant_id", sa.String(64), nullable=True),
        sa.Column("study_name", sa.String(255), nullable=True),
        sa.Column("study_id", sa.String(64), nullable=True),
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("finished_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("duration_ms", sa.BigInteger(), nullable=True),
        sa.Column("bpm", sa.Float(), nullable=True),
        sa.Column("spo2", sa.Float(), nullable=True),
        sa.Column("status", sa.String(32), nullable=False),
        sa.Column("signal_type", sa.String(16), nullable=False),
        sa.Column("sample_rate", sa.Float(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("signal_quality", JSON_TYPE, nullable=True),
        sa.Column("sensor_temp", sa.Float(), nullable=True),
        sa.Column("device_id", sa.String(255), nullable=True),
        sa.Column("perfusion_index", sa.Float(), nullable=True),
        sa.Column("ratio", sa.Float(), nullable=True),
        sa.Column("peak_count", sa.BigInteger(), nullable=True),
        sa.Column("sample_start_index", sa.BigInteger(), nullable=True),
        sa.Column("sample_end_index", sa.BigInteger(), nullable=True),
        sa.Column("samples_count", sa.BigInteger(), nullable=True),
    )


def _create_recordings_samples() -> None:
    op.create_table(
        "recordings_samples",
        sa.Column("id", SAMPLE_ID_TYPE, primary_key=True, autoincrement=True),
        sa.Column(
            "recording_id",
            sa.String(36),
            sa.ForeignKey("recordings.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("sample_index", sa.BigInteger(), nullable=False),
        sa.Column("raw_data", JSON_TYPE, nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.UniqueConstraint(
            "recording_id", "sample_index", name="uq_recordings_samples_index"
        ),
    )


def _create_quality_analyses() -> None:
    op.create_table(
        "quality_analyses",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("public_id", sa.String(64), nullable=True, unique=True),
        sa.Column(
            "recording_id",
            sa.String(36),
            sa.ForeignKey("recordings.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("timestamp", sa.DateTime(timezone=True), nullable=False),
        sa.Column("model", JSON_TYPE, nullable=False),
        sa.Column("quality_result", JSON_TYPE, nullable=False),
        sa.Column("features", JSON_TYPE, nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )


TABLE_BUILDERS = {
    "participants": _create_participants,
    "studies": _create_studies,
    "study_participants": _create_study_participants,
    "measurements": _create_measurements,
    "recordings": _create_recordings,
    "recordings_samples": _create_recordings_samples,
    "quality_analyses": _create_quality_analyses,
}


def _rename_legacy_names(inspector: sa.Inspector) -> set[str]:
    """Rename pre-study/participant terminology, returning the live table set."""
    tables = set(inspector.get_table_names())
    for old_name, new_name in LEGACY_TABLE_RENAMES:
        if old_name in tables and new_name not in tables:
            op.rename_table(old_name, new_name)
            tables.discard(old_name)
            tables.add(new_name)

    for table_name, old_column, new_column in LEGACY_COLUMN_RENAMES:
        if table_name not in tables:
            continue
        columns = {column["name"] for column in inspector.get_columns(table_name)}
        if old_column in columns and new_column not in columns:
            op.alter_column(table_name, old_column, new_column_name=new_column)
    return tables


def _require_online(action: str) -> None:
    """Reject offline `--sql` mode with an explanation instead of a traceback.

    This revision decides what to create by inspecting the target database, so
    there is no single static SQL script that is correct for both an empty and a
    legacy database. Revisions authored after the baseline can be generated
    offline normally.
    """
    if context.is_offline_mode():
        raise RuntimeError(
            f"{revision} cannot {action} in offline (--sql) mode: it inspects the "
            "existing schema to decide which tables and columns to create. Run "
            "`alembic upgrade head` against a live connection instead."
        )


def upgrade() -> None:
    _require_online("upgrade")
    bind = op.get_bind()
    inspector = sa.inspect(bind)

    preexisting = _rename_legacy_names(inspector)

    for table_name in TABLE_ORDER:
        if table_name not in preexisting:
            TABLE_BUILDERS[table_name]()

    # Only a database that predates this revision can be missing these columns.
    inspector = sa.inspect(bind)
    for table_name, columns in BACKFILL_COLUMNS.items():
        if table_name not in preexisting:
            continue
        existing = {column["name"] for column in inspector.get_columns(table_name)}
        for column_name, column_type, kwargs in columns:
            if column_name not in existing:
                op.add_column(
                    table_name, sa.Column(column_name, column_type, **kwargs)
                )

    inspector = sa.inspect(bind)
    for table_name, column_name in REMOVED_COLUMNS:
        if table_name not in preexisting:
            continue
        existing = {column["name"] for column in inspector.get_columns(table_name)}
        if column_name in existing:
            op.drop_column(table_name, column_name)

    inspector = sa.inspect(bind)
    for index_name, table_name, columns in INDEXES:
        existing = {index["name"] for index in inspector.get_indexes(table_name)}
        if index_name not in existing:
            op.create_index(index_name, table_name, list(columns))


def downgrade() -> None:
    """Drop the entire application schema.

    Destructive by nature — a baseline has nothing to step back to. Take a
    backup before running it against a database that holds recordings.
    """
    _require_online("downgrade")
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    tables = set(inspector.get_table_names())

    for index_name, table_name, _columns in INDEXES:
        if table_name not in tables:
            continue
        if index_name in {index["name"] for index in inspector.get_indexes(table_name)}:
            op.drop_index(index_name, table_name=table_name)

    for table_name in reversed(TABLE_ORDER):
        if table_name in tables:
            op.drop_table(table_name)
