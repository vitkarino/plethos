from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field

from app.schemas.metrics import VitalSigns


class MeasurementState(BaseModel):
    id: str | None = None
    participant_id: str | None = None
    study_id: str | None = None
    device_id: str | None = None
    active_recording_id: str | None = None
    status: Literal["running", "completed", "cancelled", "failed"]
    started_at: datetime
    completed_at: datetime | None = None
    duration_seconds: float | None = None
    elapsed_seconds: float
    progress: float = Field(ge=0.0, le=1.0)
    samples_collected: int
    result: VitalSigns | None = None
    reason: str | None = None


class RecordingState(BaseModel):
    id: str
    measurement_id: str
    status: Literal["running", "completed", "cancelled", "failed"]
    started_at: datetime
    completed_at: datetime | None = None
    sample_start_index: int
    sample_end_index: int | None = None
    samples_count: int | None = None


class MeasurementStartRequest(BaseModel):
    participant_id: str = Field(min_length=1)
    study_id: str = Field(min_length=1)


class RecordingStartRequest(BaseModel):
    duration_s: float = Field(gt=0)
    name: str | None = Field(default=None, min_length=1)
    use_for_ml_training: bool = False


class ParticipantCreateRequest(BaseModel):
    name: str = Field(min_length=1)
    age: int | None = Field(default=None, ge=0)
    sex: Literal["male", "female", "other"] | None = None


class ParticipantPatchRequest(BaseModel):
    name: str | None = Field(default=None, min_length=1)
    age: int | None = Field(default=None, ge=0)
    sex: Literal["male", "female", "other"] | None = None


class StudyCreateRequest(BaseModel):
    title: str = Field(min_length=1)
    description: str | None = None


class StudyPatchRequest(BaseModel):
    title: str | None = Field(default=None, min_length=1)
    description: str | None = None


class StudyParticipantAssignRequest(BaseModel):
    participant_id: str = Field(min_length=1)
