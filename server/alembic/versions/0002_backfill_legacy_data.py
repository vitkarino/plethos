"""Backfill the legacy data repairs the application used to run on every boot.

The pre-Alembic application recomputed public IDs, named unnamed recordings,
synthesised a measurement for every pre-measurement recording, and recounted
recordings-per-study on each startup. All of it was idempotent busywork on a
healthy database and a silent data migration on a legacy one.

This revision performs each repair exactly once. It is data-only: no DDL, and
every step is a no-op on a database that is already consistent, so re-running is
safe.

The ID prefix rules are copied here rather than imported from ``app.core.ids``
so a future change to the application's prefixes cannot retroactively alter what
this revision did.

Revision ID: 0002_backfill_legacy_data
Revises: 0001_baseline_schema
Create Date: 2026-08-04

"""

from __future__ import annotations

from typing import Sequence

from alembic import context, op
import sqlalchemy as sa

revision: str = "0002_backfill_legacy_data"
down_revision: str | None = "0001_baseline_schema"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


# Immutable snapshot of the prefix scheme at the time of this revision.
PARTICIPANT_PREFIX = "par_"
STUDY_PREFIX = "std_"
RECORDING_PREFIX = "rec_"
MEASUREMENT_PREFIX = "mes_"
LEGACY_PARTICIPANT_PREFIX = "usr_"
LEGACY_STUDY_PREFIX = "prj_"

# Ukrainian for "Recording N" — preserves the names the application generated.
RECORDING_NAME_TEMPLATE = "Запис {index}"

RECORDING_COPY_COLUMNS: tuple[str, ...] = (
    "participant_id",
    "study_id",
    "device_id",
    "started_at",
    "finished_at",
    "duration_ms",
    "status",
    "signal_type",
    "sample_rate",
    "sensor_temp",
    "bpm",
    "spo2",
    "perfusion_index",
    "ratio",
    "signal_quality",
    "peak_count",
    "created_at",
    "updated_at",
)


def _strip(value: object | None, prefix: str) -> str | None:
    if value is None:
        return None
    raw = str(value)
    return raw[len(prefix) :] if raw.startswith(prefix) else raw


def _prefixed(prefix: str, value: object | None) -> str | None:
    if value is None:
        return None
    raw = str(value)
    return raw if raw.startswith(prefix) else f"{prefix}{raw}"


def _participant_public_id(value: object | None) -> str | None:
    return _prefixed(
        PARTICIPANT_PREFIX,
        _strip(_strip(value, PARTICIPANT_PREFIX), LEGACY_PARTICIPANT_PREFIX),
    )


def _study_public_id(value: object | None) -> str | None:
    return _prefixed(
        STUDY_PREFIX, _strip(_strip(value, STUDY_PREFIX), LEGACY_STUDY_PREFIX)
    )


def _table(name: str, *columns: str) -> sa.TableClause:
    return sa.table(name, *(sa.column(column) for column in columns))


def _backfill_entity_public_ids(bind: sa.Connection) -> None:
    """Give every participant and study a prefixed public ID."""
    for table_name, to_public in (
        ("participants", _participant_public_id),
        ("studies", _study_public_id),
    ):
        table = _table(table_name, "id", "public_id")
        rows = bind.execute(sa.select(table.c.id, table.c.public_id)).mappings().all()
        for row in rows:
            expected = to_public(row["id"])
            if row["public_id"] != expected:
                bind.execute(
                    sa.update(table)
                    .where(table.c.id == row["id"])
                    .values(public_id=expected)
                )


def _backfill_measurement_and_recording_ids(bind: sa.Connection) -> None:
    """Normalise public IDs and denormalised owner IDs on the string-keyed tables."""
    for table_name, prefix in (
        ("measurements", MEASUREMENT_PREFIX),
        ("recordings", RECORDING_PREFIX),
    ):
        table = _table(table_name, "id", "public_id", "participant_id", "study_id")
        rows = bind.execute(
            sa.select(
                table.c.id, table.c.public_id, table.c.participant_id, table.c.study_id
            )
        ).mappings().all()
        for row in rows:
            values: dict[str, object] = {}
            if not row["public_id"]:
                values["public_id"] = _prefixed(prefix, row["id"])
            if row["participant_id"] is not None:
                values["participant_id"] = _participant_public_id(row["participant_id"])
            if row["study_id"] is not None:
                values["study_id"] = _study_public_id(row["study_id"])
            if values:
                bind.execute(
                    sa.update(table).where(table.c.id == row["id"]).values(**values)
                )


def _backfill_recording_names(bind: sa.Connection) -> None:
    """Name unnamed recordings in the order they were started."""
    table = _table("recordings", "id", "name", "started_at", "created_at")
    rows = bind.execute(
        sa.select(table.c.id, table.c.name).order_by(
            table.c.started_at, table.c.created_at, table.c.id
        )
    ).mappings().all()
    for index, row in enumerate(rows, start=1):
        if row["name"]:
            continue
        bind.execute(
            sa.update(table)
            .where(table.c.id == row["id"])
            .values(name=RECORDING_NAME_TEMPLATE.format(index=index))
        )


def _backfill_legacy_measurements(bind: sa.Connection) -> None:
    """Give pre-measurement recordings an owning measurement row.

    Recordings created before measurements existed reuse their own ID as the
    measurement ID, which is what the startup code did.
    """
    recordings = _table("recordings", "id", "measurement_id", *RECORDING_COPY_COLUMNS)
    measurements = _table(
        "measurements",
        "id",
        "public_id",
        "active_recording_id",
        *RECORDING_COPY_COLUMNS,
    )

    orphans = bind.execute(
        sa.select(recordings).where(recordings.c.measurement_id.is_(None))
    ).mappings().all()

    for row in orphans:
        measurement_id = row["id"]
        already_present = bind.execute(
            sa.select(measurements.c.id).where(measurements.c.id == measurement_id)
        ).first()
        if already_present is None:
            bind.execute(
                sa.insert(measurements).values(
                    id=measurement_id,
                    public_id=_prefixed(MEASUREMENT_PREFIX, measurement_id),
                    active_recording_id=None,
                    **{column: row[column] for column in RECORDING_COPY_COLUMNS},
                )
            )
        bind.execute(
            sa.update(recordings)
            .where(recordings.c.id == row["id"])
            .values(measurement_id=measurement_id)
        )


def _refresh_recording_counts(bind: sa.Connection) -> None:
    """Recompute the denormalised recordings-per-owner counters."""
    recordings = _table("recordings", "id", "participant_id", "study_id")
    for table_name, recording_column in (
        ("participants", recordings.c.participant_id),
        ("studies", recordings.c.study_id),
    ):
        owners = _table(table_name, "id", "public_id", "recordings_qty")
        rows = bind.execute(
            sa.select(owners.c.id, owners.c.public_id)
        ).mappings().all()
        for row in rows:
            count = bind.execute(
                sa.select(sa.func.count(recordings.c.id)).where(
                    recording_column == row["public_id"]
                )
            ).scalar_one()
            bind.execute(
                sa.update(owners)
                .where(owners.c.id == row["id"])
                .values(recordings_qty=int(count))
            )


def upgrade() -> None:
    if context.is_offline_mode():
        raise RuntimeError(
            f"{revision} cannot run in offline (--sql) mode: the repairs depend on "
            "the rows actually present. Run `alembic upgrade head` against a live "
            "connection instead."
        )
    bind = op.get_bind()
    _backfill_entity_public_ids(bind)
    _backfill_measurement_and_recording_ids(bind)
    _backfill_recording_names(bind)
    _backfill_legacy_measurements(bind)
    _refresh_recording_counts(bind)


def downgrade() -> None:
    """Intentionally empty.

    These are one-way data repairs: the pre-repair state carried NULL public IDs
    and orphaned recordings, which is not a state worth restoring. Nothing here
    blocks `0001_baseline_schema.downgrade()`.
    """
