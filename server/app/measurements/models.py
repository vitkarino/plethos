from dataclasses import dataclass

from app.schemas.metrics import VitalSigns


@dataclass(frozen=True)
class RecordingMetadata:
    participant_name: str | None = None
    participant_id: str | None = None
    study_name: str | None = None
    study_id: str | None = None


@dataclass(frozen=True)
class CompletedMeasurement:
    measurement_id: str
    device_id: str | None
    result: VitalSigns | None


@dataclass(frozen=True)
class RecordingEvent:
    type: str
    measurement_id: str
    recording_id: str
    sample_start_index: int
    sample_end_index: int | None
    samples_count: int | None
