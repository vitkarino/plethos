from __future__ import annotations

from datetime import UTC, datetime
from typing import Any

from sqlalchemy import (
    BigInteger,
    Boolean,
    Column,
    DateTime,
    Float,
    ForeignKey,
    Identity,
    Index,
    Integer,
    JSON,
    MetaData,
    String,
    Table,
    UniqueConstraint,
    create_engine,
    delete,
    desc,
    func,
    insert,
    inspect,
    select,
    text,
    update,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.engine import Connection, Engine

from app.core.ids import (
    STUDY_PREFIX,
    RECORDING_PREFIX,
    PARTICIPANT_PREFIX,
    numeric_id,
    prefixed_id,
    public_study_id,
    public_recording_id,
    public_participant_id,
    strip_prefix,
)


JSON_TYPE = JSON().with_variant(JSONB, "postgresql")
SAMPLE_ID_TYPE = BigInteger().with_variant(Integer, "sqlite")

metadata = MetaData()

participants_table = Table(
    "participants",
    metadata,
    Column("id", Integer, Identity(), primary_key=True),
    Column("public_id", String(64), nullable=True, unique=True),
    Column("name", String(255), nullable=False),
    Column("age", Integer, nullable=True),
    Column("sex", String(32), nullable=True),
    Column("created_at", DateTime(timezone=True), nullable=False),
    Column("updated_at", DateTime(timezone=True), nullable=False),
    Column("recordings_qty", Integer, nullable=False, default=0, server_default="0"),
)

studies_table = Table(
    "studies",
    metadata,
    Column("id", Integer, Identity(), primary_key=True),
    Column("public_id", String(64), nullable=True, unique=True),
    Column("title", String(255), nullable=False),
    Column("description", String, nullable=True),
    Column("created_at", DateTime(timezone=True), nullable=False),
    Column("updated_at", DateTime(timezone=True), nullable=False),
    Column("recordings_qty", Integer, nullable=False, default=0, server_default="0"),
)

study_participants_table = Table(
    "study_participants",
    metadata,
    Column(
        "study_id",
        Integer,
        ForeignKey("studies.id", ondelete="CASCADE"),
        primary_key=True,
    ),
    Column(
        "participant_id",
        Integer,
        ForeignKey("participants.id", ondelete="CASCADE"),
        primary_key=True,
    ),
    Column("assigned_at", DateTime(timezone=True), nullable=False),
)

measurements_table = Table(
    "measurements",
    metadata,
    Column("id", String(36), primary_key=True),
    Column("public_id", String(64), nullable=True, unique=True),
    Column("participant_id", String(64), nullable=True),
    Column("study_id", String(64), nullable=True),
    Column("device_id", String(255), nullable=True),
    Column("active_recording_id", String(36), nullable=True),
    Column("started_at", DateTime(timezone=True), nullable=False),
    Column("finished_at", DateTime(timezone=True), nullable=True),
    Column("duration_ms", BigInteger, nullable=True),
    Column("status", String(32), nullable=False),
    Column("signal_type", String(16), nullable=False, default="IR+R"),
    Column("sample_rate", Float, nullable=True),
    Column("sensor_temp", Float, nullable=True),
    Column("bpm", Float, nullable=True),
    Column("spo2", Float, nullable=True),
    Column("perfusion_index", Float, nullable=True),
    Column("ratio", Float, nullable=True),
    Column("signal_quality", JSON_TYPE, nullable=True),
    Column("peak_count", BigInteger, nullable=True),
    Column("created_at", DateTime(timezone=True), nullable=False),
    Column("updated_at", DateTime(timezone=True), nullable=False),
)

recordings_table = Table(
    "recordings",
    metadata,
    Column("id", String(36), primary_key=True),
    Column("public_id", String(64), nullable=True, unique=True),
    Column("name", String(255), nullable=True),
    Column("measurement_id", String(36), ForeignKey("measurements.id", ondelete="SET NULL"), nullable=True),
    Column("quality_analysis_id", String(36), nullable=True),
    Column("use_for_ml_training", Boolean, nullable=False, default=False, server_default="false"),
    Column("participant_name", String(255), nullable=True),
    Column("participant_id", String(64), nullable=True),
    Column("study_name", String(255), nullable=True),
    Column("study_id", String(64), nullable=True),
    Column("started_at", DateTime(timezone=True), nullable=False),
    Column("finished_at", DateTime(timezone=True), nullable=True),
    Column("duration_ms", BigInteger, nullable=True),
    Column("bpm", Float, nullable=True),
    Column("spo2", Float, nullable=True),
    Column("status", String(32), nullable=False),
    Column("signal_type", String(16), nullable=False),
    Column("sample_rate", Float, nullable=True),
    Column("created_at", DateTime(timezone=True), nullable=False),
    Column("updated_at", DateTime(timezone=True), nullable=False),
    Column("signal_quality", JSON_TYPE, nullable=True),
    Column("sensor_temp", Float, nullable=True),
    Column("device_id", String(255), nullable=True),
    Column("perfusion_index", Float, nullable=True),
    Column("ratio", Float, nullable=True),
    Column("peak_count", BigInteger, nullable=True),
    Column("sample_start_index", BigInteger, nullable=True),
    Column("sample_end_index", BigInteger, nullable=True),
    Column("samples_count", BigInteger, nullable=True),
)

recording_samples_table = Table(
    "recordings_samples",
    metadata,
    Column("id", SAMPLE_ID_TYPE, primary_key=True, autoincrement=True),
    Column(
        "recording_id",
        String(36),
        ForeignKey("recordings.id", ondelete="CASCADE"),
        nullable=False,
    ),
    Column("sample_index", BigInteger, nullable=False),
    Column("raw_data", JSON_TYPE, nullable=False),
    Column("created_at", DateTime(timezone=True), nullable=False),
    UniqueConstraint("recording_id", "sample_index", name="uq_recordings_samples_index"),
)

quality_analyses_table = Table(
    "quality_analyses",
    metadata,
    Column("id", String(36), primary_key=True),
    Column("public_id", String(64), nullable=True, unique=True),
    Column("recording_id", String(36), ForeignKey("recordings.id", ondelete="CASCADE"), nullable=False),
    Column("timestamp", DateTime(timezone=True), nullable=False),
    Column("model", JSON_TYPE, nullable=False),
    Column("quality_result", JSON_TYPE, nullable=False),
    Column("features", JSON_TYPE, nullable=False),
    Column("created_at", DateTime(timezone=True), nullable=False),
    Column("updated_at", DateTime(timezone=True), nullable=False),
)

Index("ix_measurements_public_id", measurements_table.c.public_id)
Index("ix_measurements_status", measurements_table.c.status)
Index("ix_measurements_device_id", measurements_table.c.device_id)
Index("ix_recordings_public_id", recordings_table.c.public_id)
Index("ix_recordings_started_at", recordings_table.c.started_at)
Index("ix_recordings_status", recordings_table.c.status)
Index("ix_recordings_measurement_id", recordings_table.c.measurement_id)
Index("ix_recordings_samples_recording_id", recording_samples_table.c.recording_id)
Index("ix_quality_analyses_public_id", quality_analyses_table.c.public_id)
Index("ix_quality_analyses_recording_id", quality_analyses_table.c.recording_id)
Index("ix_study_participants_participant_id", study_participants_table.c.participant_id)


class RecordingRepository:
    def __init__(self, database_url: str | None) -> None:
        self._engine: Engine | None = None
        if database_url:
            self._engine = create_engine(
                _normalize_database_url(database_url),
                pool_pre_ping=True,
                future=True,
            )

    @property
    def enabled(self) -> bool:
        return self._engine is not None

    def dispose(self) -> None:
        if self._engine is not None:
            self._engine.dispose()

    def create_schema(self) -> None:
        engine = self._require_engine()
        with engine.begin() as connection:
            self._rename_legacy_entity_schema(connection)
        metadata.create_all(engine)
        with engine.begin() as connection:
            self._ensure_schema_columns(connection)
            self._backfill_public_ids(connection)
            self._backfill_recording_names(connection)
            self._backfill_legacy_measurements(connection)
            self._drop_removed_columns(connection)
            self._refresh_recording_counts(connection)
            self._cancel_running_rows(connection)

    def list_participants(
        self,
        *,
        study_id: str | int | None = None,
        limit: int | None = None,
        offset: int = 0,
    ) -> list[dict[str, Any]]:
        numeric_study_id = numeric_id(study_id, STUDY_PREFIX) if study_id is not None else None
        statement = select(participants_table).order_by(desc(participants_table.c.created_at))
        if numeric_study_id is not None:
            statement = (
                select(participants_table, study_participants_table.c.assigned_at)
                .select_from(
                    study_participants_table.join(
                        participants_table,
                        study_participants_table.c.participant_id == participants_table.c.id,
                    )
                )
                .where(study_participants_table.c.study_id == numeric_study_id)
                .order_by(desc(study_participants_table.c.assigned_at))
            )
        statement = statement.offset(offset)
        if limit is not None:
            statement = statement.limit(limit)
        with self._require_engine().connect() as connection:
            rows = connection.execute(statement).mappings().all()
            output = [dict(row) for row in rows]
            for row in output:
                row["studies_count"] = self._count_participant_studies(connection, int(row["id"]))
        return output

    def get_participant(self, participant_id: str | int) -> dict[str, Any] | None:
        with self._require_engine().connect() as connection:
            row = self._get_participant(connection, participant_id)
            if row is not None:
                row["studies_count"] = self._count_participant_studies(connection, int(row["id"]))
            return row

    def create_participant(self, values: dict[str, Any]) -> dict[str, Any]:
        now = datetime.now(UTC)
        row = {
            "public_id": None,
            "name": values["name"],
            "age": values.get("age"),
            "sex": values.get("sex"),
            "created_at": now,
            "updated_at": now,
            "recordings_qty": 0,
        }
        with self._require_engine().begin() as connection:
            result = connection.execute(insert(participants_table).values(**row))
            participant_id = self._inserted_id(result.inserted_primary_key)
            connection.execute(
                update(participants_table)
                .where(participants_table.c.id == participant_id)
                .values(public_id=public_participant_id(participant_id))
            )
            created = self._get_participant(connection, participant_id)
        if created is None:
            raise RuntimeError("failed to create participant")
        return created

    def update_participant(self, participant_id: str | int, values: dict[str, Any]) -> dict[str, Any] | None:
        update_values = {key: value for key, value in values.items() if key in {"name", "age", "sex"}}
        if update_values:
            update_values["updated_at"] = datetime.now(UTC)
        with self._require_engine().begin() as connection:
            existing = self._get_participant(connection, participant_id)
            if existing is None:
                return None
            if update_values:
                connection.execute(
                    update(participants_table)
                    .where(participants_table.c.id == existing["id"])
                    .values(**update_values)
                )
            return self._get_participant(connection, existing["id"])

    def delete_participant(self, participant_id: str | int) -> bool:
        with self._require_engine().begin() as connection:
            existing = self._get_participant(connection, participant_id)
            if existing is None:
                return False
            connection.execute(delete(study_participants_table).where(study_participants_table.c.participant_id == existing["id"]))
            result = connection.execute(delete(participants_table).where(participants_table.c.id == existing["id"]))
        return result.rowcount > 0

    def list_studies(
        self,
        *,
        limit: int | None = None,
        offset: int = 0,
    ) -> list[dict[str, Any]]:
        statement = select(studies_table).order_by(desc(studies_table.c.created_at)).offset(offset)
        if limit is not None:
            statement = statement.limit(limit)
        with self._require_engine().connect() as connection:
            rows = connection.execute(statement).mappings().all()
            output = [dict(row) for row in rows]
            for row in output:
                row["participants_count"] = self._count_study_participants(connection, int(row["id"]))
        return output

    def get_study(self, study_id: str | int) -> dict[str, Any] | None:
        with self._require_engine().connect() as connection:
            row = self._get_study(connection, study_id)
            if row is not None:
                row["participants_count"] = self._count_study_participants(connection, int(row["id"]))
            return row

    def create_study(self, values: dict[str, Any]) -> dict[str, Any]:
        now = datetime.now(UTC)
        row = {
            "public_id": None,
            "title": values["title"],
            "description": values.get("description"),
            "created_at": now,
            "updated_at": now,
            "recordings_qty": 0,
        }
        with self._require_engine().begin() as connection:
            result = connection.execute(insert(studies_table).values(**row))
            study_id = self._inserted_id(result.inserted_primary_key)
            connection.execute(
                update(studies_table)
                .where(studies_table.c.id == study_id)
                .values(public_id=public_study_id(study_id))
            )
            created = self._get_study(connection, study_id)
        if created is None:
            raise RuntimeError("failed to create study")
        return created

    def update_study(self, study_id: str | int, values: dict[str, Any]) -> dict[str, Any] | None:
        update_values = {key: value for key, value in values.items() if key in {"title", "description"}}
        if update_values:
            update_values["updated_at"] = datetime.now(UTC)
        with self._require_engine().begin() as connection:
            existing = self._get_study(connection, study_id)
            if existing is None:
                return None
            if update_values:
                connection.execute(
                    update(studies_table)
                    .where(studies_table.c.id == existing["id"])
                    .values(**update_values)
                )
            return self._get_study(connection, existing["id"])

    def delete_study(self, study_id: str | int) -> bool:
        with self._require_engine().begin() as connection:
            existing = self._get_study(connection, study_id)
            if existing is None:
                return False
            connection.execute(delete(study_participants_table).where(study_participants_table.c.study_id == existing["id"]))
            result = connection.execute(delete(studies_table).where(studies_table.c.id == existing["id"]))
        return result.rowcount > 0

    def list_study_participants(self, study_id: str | int) -> list[dict[str, Any]]:
        numeric_study_id = numeric_id(study_id, STUDY_PREFIX)
        if numeric_study_id is None:
            return []
        statement = (
            select(participants_table, study_participants_table.c.assigned_at)
            .select_from(
                study_participants_table.join(
                    participants_table,
                    study_participants_table.c.participant_id == participants_table.c.id,
                )
            )
            .where(study_participants_table.c.study_id == numeric_study_id)
            .order_by(desc(study_participants_table.c.assigned_at))
        )
        with self._require_engine().connect() as connection:
            rows = connection.execute(statement).mappings().all()
        return [dict(row) for row in rows]

    def add_study_participant(self, study_id: str | int, participant_id: str | int) -> dict[str, Any]:
        numeric_study_id = numeric_id(study_id, STUDY_PREFIX)
        numeric_participant_id = numeric_id(participant_id, PARTICIPANT_PREFIX)
        if numeric_study_id is None or numeric_participant_id is None:
            raise ValueError("study_id and participant_id must be valid")
        with self._require_engine().begin() as connection:
            existing = self._get_study_participant(connection, numeric_study_id, numeric_participant_id)
            if existing is not None:
                raise ValueError("study participant already exists")

            assigned_at = datetime.now(UTC)
            connection.execute(
                insert(study_participants_table).values(
                    study_id=numeric_study_id,
                    participant_id=numeric_participant_id,
                    assigned_at=assigned_at,
                )
            )
            created = self._get_study_participant(connection, numeric_study_id, numeric_participant_id)
        if created is None:
            raise RuntimeError("failed to assign study participant")
        return created

    def delete_study_participant(self, study_id: str | int, participant_id: str | int) -> bool:
        numeric_study_id = numeric_id(study_id, STUDY_PREFIX)
        numeric_participant_id = numeric_id(participant_id, PARTICIPANT_PREFIX)
        if numeric_study_id is None or numeric_participant_id is None:
            return False
        with self._require_engine().begin() as connection:
            result = connection.execute(
                delete(study_participants_table).where(
                    study_participants_table.c.study_id == numeric_study_id,
                    study_participants_table.c.participant_id == numeric_participant_id,
                )
            )
        return result.rowcount > 0

    def create_measurement(self, values: dict[str, Any]) -> dict[str, Any]:
        with self._require_engine().begin() as connection:
            connection.execute(insert(measurements_table).values(**values))
            row = self._get_external_id_row(connection, measurements_table, values["id"])
        if row is None:
            raise RuntimeError("failed to create measurement")
        return row

    def update_measurement(self, measurement_id: str, values: dict[str, Any]) -> dict[str, Any] | None:
        if not values:
            return self.get_measurement(measurement_id)
        with self._require_engine().begin() as connection:
            internal_id = self._resolve_external_id(connection, measurements_table, measurement_id)
            if internal_id is None:
                return None
            connection.execute(
                update(measurements_table)
                .where(measurements_table.c.id == internal_id)
                .values(**values)
            )
            return self._get_external_id_row(connection, measurements_table, internal_id)

    def get_measurement(self, measurement_id: str) -> dict[str, Any] | None:
        with self._require_engine().connect() as connection:
            return self._get_external_id_row(connection, measurements_table, measurement_id)

    def list_measurements(
        self,
        *,
        limit: int | None,
        offset: int,
        date_from: datetime | None = None,
        date_to: datetime | None = None,
        device_id: str | None = None,
        participant_id: str | None = None,
        study_id: str | None = None,
        status: str | None = None,
    ) -> list[dict[str, Any]]:
        statement = select(measurements_table)
        if date_from is not None:
            statement = statement.where(measurements_table.c.started_at >= date_from)
        if date_to is not None:
            statement = statement.where(measurements_table.c.started_at <= date_to)
        if device_id is not None:
            statement = statement.where(measurements_table.c.device_id == strip_prefix(device_id, "dev_"))
        if participant_id is not None:
            statement = statement.where(measurements_table.c.participant_id == public_participant_id(participant_id))
        if study_id is not None:
            statement = statement.where(measurements_table.c.study_id == public_study_id(study_id))
        if status is not None:
            statement = statement.where(measurements_table.c.status == status)
        statement = statement.order_by(desc(measurements_table.c.started_at)).offset(offset)
        if limit is not None:
            statement = statement.limit(limit)

        with self._require_engine().connect() as connection:
            rows = connection.execute(statement).mappings().all()
        return [dict(row) for row in rows]

    def create_recording(self, values: dict[str, Any]) -> dict[str, Any]:
        with self._require_engine().begin() as connection:
            row_values = dict(values)
            if not row_values.get("name"):
                row_values["name"] = self._next_recording_name(connection)
            connection.execute(insert(recordings_table).values(**row_values))
            self._increment_recording_counts(connection, row_values)
            row = self._get_external_id_row(connection, recordings_table, row_values["id"])
        if row is None:
            raise RuntimeError("failed to create recording")
        return row

    def update_recording(self, recording_id: str, values: dict[str, Any]) -> dict[str, Any] | None:
        if not values:
            return self.get_recording(recording_id)
        with self._require_engine().begin() as connection:
            internal_id = self._resolve_external_id(connection, recordings_table, recording_id)
            if internal_id is None:
                return None
            connection.execute(
                update(recordings_table)
                .where(recordings_table.c.id == internal_id)
                .values(**values)
            )
            return self._get_external_id_row(connection, recordings_table, internal_id)

    def delete_recording(self, recording_id: str) -> bool:
        with self._require_engine().begin() as connection:
            internal_id = self._resolve_external_id(connection, recordings_table, recording_id)
            if internal_id is None:
                return False
            connection.execute(delete(quality_analyses_table).where(quality_analyses_table.c.recording_id == internal_id))
            connection.execute(
                delete(recording_samples_table).where(recording_samples_table.c.recording_id == internal_id)
            )
            result = connection.execute(delete(recordings_table).where(recordings_table.c.id == internal_id))
            if result.rowcount > 0:
                self._refresh_recording_counts(connection)
        return result.rowcount > 0

    def insert_samples(self, recording_id: str, samples: list[dict[str, Any]]) -> None:
        if not samples:
            return
        with self._require_engine().begin() as connection:
            internal_id = self._resolve_external_id(connection, recordings_table, recording_id)
            if internal_id is None:
                return
            rows = [dict(sample, recording_id=internal_id) for sample in samples]
            connection.execute(insert(recording_samples_table), rows)

    def get_recording(self, recording_id: str) -> dict[str, Any] | None:
        with self._require_engine().connect() as connection:
            return self._get_external_id_row(connection, recordings_table, recording_id)

    def list_recordings(
        self,
        *,
        limit: int | None,
        offset: int,
        date_from: datetime | None = None,
        date_to: datetime | None = None,
        device_id: str | None = None,
        participant_id: str | None = None,
        study_id: str | None = None,
        status: str | None = None,
    ) -> list[dict[str, Any]]:
        statement = select(recordings_table)
        if date_from is not None:
            statement = statement.where(recordings_table.c.started_at >= date_from)
        if date_to is not None:
            statement = statement.where(recordings_table.c.started_at <= date_to)
        if device_id is not None:
            statement = statement.where(recordings_table.c.device_id == strip_prefix(device_id, "dev_"))
        if participant_id is not None:
            statement = statement.where(recordings_table.c.participant_id == public_participant_id(participant_id))
        if study_id is not None:
            statement = statement.where(recordings_table.c.study_id == public_study_id(study_id))
        if status is not None:
            statement = statement.where(recordings_table.c.status == status)
        statement = statement.order_by(desc(recordings_table.c.started_at)).offset(offset)
        if limit is not None:
            statement = statement.limit(limit)

        with self._require_engine().connect() as connection:
            rows = connection.execute(statement).mappings().all()
        return [dict(row) for row in rows]

    def list_recording_samples(
        self,
        recording_id: str,
        *,
        limit: int | None,
        offset: int,
    ) -> list[dict[str, Any]]:
        with self._require_engine().connect() as connection:
            internal_id = self._resolve_external_id(connection, recordings_table, recording_id)
            if internal_id is None:
                return []
            statement = (
                select(recording_samples_table)
                .where(recording_samples_table.c.recording_id == internal_id)
                .order_by(recording_samples_table.c.sample_index)
                .offset(offset)
            )
            if limit is not None:
                statement = statement.limit(limit)
            rows = connection.execute(statement).mappings().all()
        return [dict(row) for row in rows]

    def upsert_quality_analysis(self, values: dict[str, Any]) -> dict[str, Any]:
        with self._require_engine().begin() as connection:
            recording_id = self._resolve_external_id(connection, recordings_table, values["recording_id"])
            if recording_id is None:
                raise ValueError("recording not found")
            existing = connection.execute(
                select(quality_analyses_table).where(quality_analyses_table.c.recording_id == recording_id)
            ).mappings().first()
            payload = dict(values, recording_id=recording_id)
            if existing is None:
                connection.execute(insert(quality_analyses_table).values(**payload))
                analysis_id = payload["id"]
            else:
                analysis_id = existing["id"]
                update_values = {
                    "timestamp": payload["timestamp"],
                    "model": payload["model"],
                    "quality_result": payload["quality_result"],
                    "features": payload["features"],
                    "updated_at": payload["updated_at"],
                }
                connection.execute(
                    update(quality_analyses_table)
                    .where(quality_analyses_table.c.id == analysis_id)
                    .values(**update_values)
                )
            connection.execute(
                update(recordings_table)
                .where(recordings_table.c.id == recording_id)
                .values(quality_analysis_id=analysis_id, updated_at=datetime.now(UTC))
            )
            row = self._get_external_id_row(connection, quality_analyses_table, analysis_id)
        if row is None:
            raise RuntimeError("failed to store quality analysis")
        return row

    def get_quality_analysis_for_recording(self, recording_id: str) -> dict[str, Any] | None:
        with self._require_engine().connect() as connection:
            internal_id = self._resolve_external_id(connection, recordings_table, recording_id)
            if internal_id is None:
                return None
            row = connection.execute(
                select(quality_analyses_table).where(quality_analyses_table.c.recording_id == internal_id)
            ).mappings().first()
        return dict(row) if row is not None else None

    def _require_engine(self) -> Engine:
        if self._engine is None:
            raise RuntimeError("DATABASE_URL is not configured")
        return self._engine

    @staticmethod
    def _rename_legacy_entity_schema(connection: Connection) -> None:
        inspector = inspect(connection)
        table_names = set(inspector.get_table_names())

        _rename_table(connection, table_names, "users", "participants")
        _rename_table(connection, table_names, "projects", "studies")
        _rename_table(connection, table_names, "project_users", "study_participants")

        inspector = inspect(connection)
        table_names = set(inspector.get_table_names())
        if "study_participants" in table_names:
            _rename_column(connection, "study_participants", "project_id", "study_id")
            _rename_column(connection, "study_participants", "user_id", "participant_id")
        if "measurements" in table_names:
            _rename_column(connection, "measurements", "user_id", "participant_id")
            _rename_column(connection, "measurements", "project_id", "study_id")
        if "recordings" in table_names:
            _rename_column(connection, "recordings", "user_name", "participant_name")
            _rename_column(connection, "recordings", "user_id", "participant_id")
            _rename_column(connection, "recordings", "project_name", "study_name")
            _rename_column(connection, "recordings", "project_id", "study_id")

    @staticmethod
    def _ensure_schema_columns(connection: Connection) -> None:
        inspector = inspect(connection)
        table_names = set(inspector.get_table_names())
        if "participants" in table_names:
            _ensure_columns(
                connection,
                "participants",
                {
                    "public_id": "VARCHAR(64)",
                    "recordings_qty": "INTEGER NOT NULL DEFAULT 0",
                },
            )
        if "studies" in table_names:
            _ensure_columns(
                connection,
                "studies",
                {
                    "public_id": "VARCHAR(64)",
                    "description": "TEXT",
                    "recordings_qty": "INTEGER NOT NULL DEFAULT 0",
                },
            )
        if "measurements" in table_names:
            _ensure_columns(
                connection,
                "measurements",
                {
                    "participant_id": "VARCHAR(64)",
                    "study_id": "VARCHAR(64)",
                    "perfusion_index": "FLOAT",
                },
            )
        if "recordings" in table_names:
            _ensure_columns(
                connection,
                "recordings",
                {
                    "public_id": "VARCHAR(64)",
                    "name": "VARCHAR(255)",
                    "measurement_id": "VARCHAR(36)",
                    "quality_analysis_id": "VARCHAR(36)",
                    "use_for_ml_training": "BOOLEAN NOT NULL DEFAULT FALSE",
                    "participant_name": "VARCHAR(255)",
                    "participant_id": "VARCHAR(64)",
                    "study_name": "VARCHAR(255)",
                    "study_id": "VARCHAR(64)",
                    "sample_start_index": "BIGINT",
                    "sample_end_index": "BIGINT",
                    "samples_count": "BIGINT",
                },
            )

    @staticmethod
    def _backfill_public_ids(connection: Connection) -> None:
        for row in connection.execute(select(participants_table.c.id, participants_table.c.public_id)).mappings().all():
            if row["public_id"] != public_participant_id(row["id"]):
                connection.execute(
                    update(participants_table)
                    .where(participants_table.c.id == row["id"])
                    .values(public_id=public_participant_id(row["id"]))
                )

        for row in connection.execute(select(studies_table.c.id, studies_table.c.public_id)).mappings().all():
            if row["public_id"] != public_study_id(row["id"]):
                connection.execute(
                    update(studies_table)
                    .where(studies_table.c.id == row["id"])
                    .values(public_id=public_study_id(row["id"]))
                )

        measurement_rows = connection.execute(
            select(
                measurements_table.c.id,
                measurements_table.c.public_id,
                measurements_table.c.participant_id,
                measurements_table.c.study_id,
            )
        ).mappings().all()
        for row in measurement_rows:
            values: dict[str, Any] = {}
            if not row["public_id"]:
                values["public_id"] = prefixed_id("mes_", row["id"])
            if row["participant_id"] is not None:
                values["participant_id"] = public_participant_id(row["participant_id"])
            if row["study_id"] is not None:
                values["study_id"] = public_study_id(row["study_id"])
            if values:
                connection.execute(update(measurements_table).where(measurements_table.c.id == row["id"]).values(**values))

        rows = connection.execute(
            select(
                recordings_table.c.id,
                recordings_table.c.public_id,
                recordings_table.c.participant_id,
                recordings_table.c.study_id,
            )
        ).mappings().all()
        for row in rows:
            values: dict[str, Any] = {}
            if not row["public_id"]:
                values["public_id"] = public_recording_id(row["id"])
            if row["participant_id"] is not None:
                values["participant_id"] = public_participant_id(row["participant_id"])
            if row["study_id"] is not None:
                values["study_id"] = public_study_id(row["study_id"])
            if values:
                connection.execute(update(recordings_table).where(recordings_table.c.id == row["id"]).values(**values))

    @staticmethod
    def _backfill_recording_names(connection: Connection) -> None:
        rows = connection.execute(
            select(
                recordings_table.c.id,
                recordings_table.c.name,
                recordings_table.c.started_at,
                recordings_table.c.created_at,
            ).order_by(recordings_table.c.started_at, recordings_table.c.created_at, recordings_table.c.id)
        ).mappings().all()
        for index, row in enumerate(rows, start=1):
            if row["name"]:
                continue
            connection.execute(
                update(recordings_table)
                .where(recordings_table.c.id == row["id"])
                .values(name=f"Запис {index}")
            )

    @staticmethod
    def _backfill_legacy_measurements(connection: Connection) -> None:
        rows = connection.execute(
            select(recordings_table).where(recordings_table.c.measurement_id.is_(None))
        ).mappings().all()
        for row in rows:
            measurement_id = row["id"]
            existing = connection.execute(
                select(measurements_table.c.id).where(measurements_table.c.id == measurement_id)
            ).first()
            if existing is None:
                connection.execute(
                    insert(measurements_table).values(
                        id=measurement_id,
                        public_id=prefixed_id("mes_", measurement_id),
                        participant_id=row["participant_id"],
                        study_id=row["study_id"],
                        device_id=row["device_id"],
                        active_recording_id=None,
                        started_at=row["started_at"],
                        finished_at=row["finished_at"],
                        duration_ms=row["duration_ms"],
                        status=row["status"],
                        signal_type=row["signal_type"],
                        sample_rate=row["sample_rate"],
                        sensor_temp=row["sensor_temp"],
                        bpm=row["bpm"],
                        spo2=row["spo2"],
                        perfusion_index=row["perfusion_index"],
                        ratio=row["ratio"],
                        signal_quality=row["signal_quality"],
                        peak_count=row["peak_count"],
                        created_at=row["created_at"],
                        updated_at=row["updated_at"],
                    )
                )
            connection.execute(
                update(recordings_table)
                .where(recordings_table.c.id == row["id"])
                .values(measurement_id=measurement_id)
            )

    @staticmethod
    def _drop_removed_columns(connection: Connection) -> None:
        inspector = inspect(connection)
        table_names = set(inspector.get_table_names())
        legacy_column = "sensor_" + "confidence"
        preparer = connection.dialect.identifier_preparer
        for table_name in ("measurements", "recordings"):
            if table_name not in table_names:
                continue
            column_names = {column["name"] for column in inspector.get_columns(table_name)}
            if legacy_column not in column_names:
                continue
            connection.execute(
                text(
                    f"ALTER TABLE {preparer.quote(table_name)} "
                    f"DROP COLUMN {preparer.quote(legacy_column)}"
                )
            )

    @staticmethod
    def _cancel_running_rows(connection: Connection) -> None:
        now = datetime.now(UTC)
        for table in (measurements_table, recordings_table):
            rows = connection.execute(
                select(table.c.id, table.c.started_at).where(table.c.status == "running")
            ).mappings().all()
            for row in rows:
                started_at = row["started_at"]
                duration_ms = None
                if isinstance(started_at, datetime):
                    if started_at.tzinfo is None:
                        started_at = started_at.replace(tzinfo=UTC)
                    duration_ms = int(round(max(0.0, (now - started_at).total_seconds()) * 1000))
                connection.execute(
                    update(table)
                    .where(table.c.id == row["id"])
                    .values(
                        status="cancelled",
                        finished_at=now,
                        duration_ms=duration_ms,
                        updated_at=now,
                    )
                )

    @staticmethod
    def _inserted_id(primary_key: tuple[Any, ...]) -> int:
        if not primary_key or primary_key[0] is None:
            raise RuntimeError("database did not return inserted primary key")
        return int(primary_key[0])

    @staticmethod
    def _get_participant(connection: Connection, participant_id: str | int) -> dict[str, Any] | None:
        numeric = numeric_id(participant_id, PARTICIPANT_PREFIX)
        statement = select(participants_table).where(participants_table.c.public_id == public_participant_id(participant_id))
        if numeric is not None:
            statement = select(participants_table).where(
                (participants_table.c.id == numeric) | (participants_table.c.public_id == public_participant_id(participant_id))
            )
        row = connection.execute(statement).mappings().first()
        return dict(row) if row is not None else None

    @staticmethod
    def _get_study(connection: Connection, study_id: str | int) -> dict[str, Any] | None:
        numeric = numeric_id(study_id, STUDY_PREFIX)
        statement = select(studies_table).where(studies_table.c.public_id == public_study_id(study_id))
        if numeric is not None:
            statement = select(studies_table).where(
                (studies_table.c.id == numeric) | (studies_table.c.public_id == public_study_id(study_id))
            )
        row = connection.execute(statement).mappings().first()
        return dict(row) if row is not None else None

    @staticmethod
    def _get_external_id_row(connection: Connection, table: Table, row_id: str) -> dict[str, Any] | None:
        internal_id = RecordingRepository._resolve_external_id(connection, table, row_id)
        if internal_id is None:
            return None
        row = connection.execute(select(table).where(table.c.id == internal_id)).mappings().first()
        return dict(row) if row is not None else None

    @staticmethod
    def _resolve_external_id(connection: Connection, table: Table, row_id: str) -> str | None:
        row = connection.execute(
            select(table.c.id).where((table.c.id == row_id) | (table.c.public_id == row_id))
        ).first()
        return str(row[0]) if row is not None else None

    @staticmethod
    def _get_study_participant(
        connection: Connection,
        study_id: int,
        participant_id: int,
    ) -> dict[str, Any] | None:
        statement = select(study_participants_table).where(
            study_participants_table.c.study_id == study_id,
            study_participants_table.c.participant_id == participant_id,
        )
        row = connection.execute(statement).mappings().first()
        return dict(row) if row is not None else None

    @staticmethod
    def _count_participant_studies(connection: Connection, participant_id: int) -> int:
        return int(
            connection.execute(
                select(func.count()).select_from(study_participants_table).where(study_participants_table.c.participant_id == participant_id)
            ).scalar_one()
        )

    @staticmethod
    def _count_study_participants(connection: Connection, study_id: int) -> int:
        return int(
            connection.execute(
                select(func.count())
                .select_from(study_participants_table)
                .where(study_participants_table.c.study_id == study_id)
            ).scalar_one()
        )

    @staticmethod
    def _increment_recording_counts(connection: Connection, values: dict[str, Any]) -> None:
        participant_public_id = public_participant_id(values.get("participant_id"))
        if participant_public_id is not None:
            connection.execute(
                update(participants_table)
                .where(participants_table.c.public_id == participant_public_id)
                .values(recordings_qty=participants_table.c.recordings_qty + 1)
            )

        study_public_id = public_study_id(values.get("study_id"))
        if study_public_id is not None:
            connection.execute(
                update(studies_table)
                .where(studies_table.c.public_id == study_public_id)
                .values(recordings_qty=studies_table.c.recordings_qty + 1)
            )

    @staticmethod
    def _refresh_recording_counts(connection: Connection) -> None:
        for row in connection.execute(select(participants_table.c.id, participants_table.c.public_id)).mappings().all():
            count = connection.execute(
                select(func.count(recordings_table.c.id)).where(recordings_table.c.participant_id == row["public_id"])
            ).scalar_one()
            connection.execute(
                update(participants_table)
                .where(participants_table.c.id == row["id"])
                .values(recordings_qty=int(count))
            )

        for row in connection.execute(select(studies_table.c.id, studies_table.c.public_id)).mappings().all():
            count = connection.execute(
                select(func.count(recordings_table.c.id)).where(recordings_table.c.study_id == row["public_id"])
            ).scalar_one()
            connection.execute(
                update(studies_table)
                .where(studies_table.c.id == row["id"])
                .values(recordings_qty=int(count))
            )

    @staticmethod
    def _next_recording_name(connection: Connection) -> str:
        count = connection.execute(select(func.count(recordings_table.c.id))).scalar_one()
        return f"Запис {int(count) + 1}"


def _ensure_columns(connection: Connection, table_name: str, columns: dict[str, str]) -> None:
    existing = {column["name"] for column in inspect(connection).get_columns(table_name)}
    for column_name, ddl_type in columns.items():
        if column_name not in existing:
            connection.execute(text(f"ALTER TABLE {table_name} ADD COLUMN {column_name} {ddl_type}"))


def _rename_table(connection: Connection, table_names: set[str], old_name: str, new_name: str) -> None:
    if old_name not in table_names or new_name in table_names:
        return
    preparer = connection.dialect.identifier_preparer
    connection.execute(
        text(f"ALTER TABLE {preparer.quote(old_name)} RENAME TO {preparer.quote(new_name)}")
    )
    table_names.remove(old_name)
    table_names.add(new_name)


def _rename_column(connection: Connection, table_name: str, old_name: str, new_name: str) -> None:
    column_names = {column["name"] for column in inspect(connection).get_columns(table_name)}
    if old_name not in column_names or new_name in column_names:
        return
    preparer = connection.dialect.identifier_preparer
    connection.execute(
        text(
            f"ALTER TABLE {preparer.quote(table_name)} "
            f"RENAME COLUMN {preparer.quote(old_name)} TO {preparer.quote(new_name)}"
        )
    )


def _normalize_database_url(database_url: str) -> str:
    if database_url.startswith("postgresql://"):
        return database_url.replace("postgresql://", "postgresql+psycopg://", 1)
    if database_url.startswith("postgres://"):
        return database_url.replace("postgres://", "postgresql+psycopg://", 1)
    return database_url
