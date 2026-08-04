from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field


class SignalQuality(BaseModel):
    level: Literal["warming_up", "no_contact", "low", "medium", "high"]
    score: float = Field(ge=0.0, le=1.0)
    samples_in_window: int
    window_seconds: float
    perfusion_index: float | None = None
    peak_count: int = 0
    shape_score: float | None = Field(default=None, ge=0.0, le=1.0)
    reason: str | None = None


class WaveformMorphology(BaseModel):
    enabled: bool = True
    valid_pulse_count: int = 0
    pulse_amplitude: float | None = None
    pulse_duration_ms: float | None = None
    rise_time_ms: float | None = None
    decay_time_ms: float | None = None
    pulse_width_50_ms: float | None = None
    rise_slope: float | None = None
    decay_slope: float | None = None
    area: float | None = None
    symmetry_ratio: float | None = None
    shape_similarity: float | None = None
    amplitude_variability: float | None = None
    duration_variability: float | None = None
    morphology_variability: float | None = None
    shape_score: float | None = Field(default=None, ge=0.0, le=1.0)
    shape_quality: Literal[
        "stable",
        "moderately_stable",
        "unstable",
        "insufficient_pulses",
        "low_amplitude",
        "irregular_shape",
        "invalid_signal",
    ]
    reason: str | None = None
    average_pulse_template: list[float] | None = None


class VitalSigns(BaseModel):
    device_id: str
    timestamp: datetime
    fs: float
    temperature: float | None = None
    bpm: float | None = None
    spo2: float | None = None
    ratio: float | None = None
    signal_quality: SignalQuality
    waveform_morphology: WaveformMorphology | None = None
