"""Validation schema for the versioned device WebSocket protocol (v1).

This module is the pure validation layer for `contracts/websocket/v1/README.md`.
It has no FastAPI, database, or app-state dependencies: it only parses and
validates message *shape*. Authentication, token comparison, storage, batch
dedup bookkeeping, and route wiring belong to the caller (see the contract and
`app/realtime/websocket.py`, which this module intentionally does not import).

Two message directions are covered:

- Inbound (device -> server): ``hello``, ``samples``, ``start_ack``,
  ``stop_ack``, ``log``, ``finished``. Parse with :func:`parse_inbound_message`
  or the :data:`InboundDeviceMessage` discriminated union directly.
- Outbound (server -> device): ``start``, ``stop`` commands. Parse/build with
  :func:`parse_outbound_command` or the :data:`OutboundCommand` union.

Use :func:`check_payload_size` on the raw encoded message *before* decoding it,
so oversized payloads are rejected without doing further validation work.

Security note on credentials
-----------------------------
``HelloMessage.credential`` is a :class:`pydantic.SecretStr`, never a plain
``str``. That means ``repr(hello)``, ``str(hello)``, and
``hello.model_dump()`` all render the credential as the fixed mask
``**********`` instead of the real token, so a stray ``logger.info(hello)`` or
``logger.info(hello.model_dump())`` cannot leak it. The only way to obtain the
real value is the explicit ``hello.credential.get_secret_value()`` call, which
callers should use exactly once, right before comparing it against stored
device tokens, and never pass to a logger.
"""

from __future__ import annotations

import re
from typing import Annotated, Any, Literal, Union

from pydantic import (
    AliasChoices,
    BaseModel,
    ConfigDict,
    Field,
    SecretStr,
    TypeAdapter,
    field_validator,
)

from app.core.ids import DEVICE_PREFIX, MEASUREMENT_PREFIX

# ---------------------------------------------------------------------------
# Contract-defined limits
# ---------------------------------------------------------------------------

#: "Every message contains `protocol_version: 1`" (README).
PROTOCOL_VERSION = 1

#: Sample batches "at most 64 samples" (README, "Sample batches have these limits").
MAX_SAMPLES_PER_BATCH = 64

#: Sample batches "at most 8,192 UTF-8 encoded JSON bytes" (README, same list).
MAX_PAYLOAD_BYTES = 8192

#: Device/measurement IDs are "UTF-8 strings of at most 63 bytes" (README, para 1).
MAX_PUBLIC_ID_BYTES = 63

#: Allowed characters "after the prefix": letters, digits, `.`, `:`, `_`, `-` (README, para 1).
_ID_SUFFIX_PATTERN = re.compile(r"^[A-Za-z0-9:._-]+$")


class PayloadTooLargeError(ValueError):
    """Raised by :func:`check_payload_size` when a raw message exceeds the wire cap."""


def check_payload_size(raw: bytes | str) -> None:
    """Reject a raw (not-yet-parsed) message that exceeds ``MAX_PAYLOAD_BYTES``.

    ``raw`` is the exact bytes/text that will be (or was) sent over the wire.
    Call this *before* JSON-decoding untrusted input so an oversized payload is
    rejected without spending effort parsing it. Str input is measured by its
    UTF-8 encoding, matching the contract's "UTF-8 encoded JSON bytes" wording.
    """
    size = len(raw) if isinstance(raw, bytes) else len(raw.encode("utf-8"))
    if size > MAX_PAYLOAD_BYTES:
        raise PayloadTooLargeError(
            f"encoded payload is {size} bytes, exceeding the {MAX_PAYLOAD_BYTES}-byte limit"
        )


def _check_public_id(value: str, *, prefix: str, field_name: str) -> str:
    """Shared prefix/length/charset check for `device_id` and `measurement_id`.

    Reuses the prefix constants from `app.core.ids` (`DEVICE_PREFIX`,
    `MEASUREMENT_PREFIX`) rather than hardcoding "dev_"/"mes_" again; the
    charset/length rules below are new (ids.py only strips/adds prefixes, it
    does not validate suffix shape).
    """
    if not isinstance(value, str) or not value.startswith(prefix):
        raise ValueError(f"{field_name} must start with {prefix!r}")
    if len(value.encode("utf-8")) > MAX_PUBLIC_ID_BYTES:
        raise ValueError(f"{field_name} must be at most {MAX_PUBLIC_ID_BYTES} UTF-8 bytes")
    suffix = value[len(prefix) :]
    if not suffix or not _ID_SUFFIX_PATTERN.match(suffix):
        raise ValueError(
            f"{field_name} suffix must be non-empty and contain only letters, digits, "
            "'.', ':', '_', or '-'"
        )
    return value


# ---------------------------------------------------------------------------
# Shared mixins
# ---------------------------------------------------------------------------


class _ProtocolMessage(BaseModel):
    """Fields and behavior common to every v1 protocol message.

    `extra="ignore"` implements the contract's "unknown fields must be ignored
    for forward compatibility" rule: additional fields sent by a newer device
    or server do not cause a validation error, they are simply dropped.
    """

    model_config = ConfigDict(populate_by_name=True, extra="ignore")

    protocol_version: int

    @field_validator("protocol_version")
    @classmethod
    def _reject_unknown_protocol_version(cls, value: int) -> int:
        if value != PROTOCOL_VERSION:
            raise ValueError(
                f"unsupported protocol_version {value!r}: this server only speaks "
                f"version {PROTOCOL_VERSION}"
            )
        return value


class _DeviceScoped(BaseModel):
    """Mixin for inbound messages, which "carry the device's stable device_id"."""

    device_id: str

    @field_validator("device_id")
    @classmethod
    def _validate_device_id(cls, value: str) -> str:
        return _check_public_id(value, prefix=DEVICE_PREFIX, field_name="device_id")


class _MeasurementScoped(BaseModel):
    """Mixin for messages that carry a target/associated `measurement_id`."""

    measurement_id: str

    @field_validator("measurement_id")
    @classmethod
    def _validate_measurement_id(cls, value: str) -> str:
        return _check_public_id(value, prefix=MEASUREMENT_PREFIX, field_name="measurement_id")


# ---------------------------------------------------------------------------
# Inbound (device -> server) messages
# ---------------------------------------------------------------------------


class Sample(BaseModel):
    """A single reading within a `samples` batch.

    The contract's limits section only discusses `index`, but the committed
    `samples.json` fixture carries the `ir` and `red` photodiode readings, and
    they are the entire payload of a measurement — dropping them here would
    discard the signal. They are modelled explicitly and required.

    `red` also accepts the shorter `r` key, matching `app.schemas.device.PPGSample`
    so both the versioned and legacy paths accept the same device output. Any
    other per-sample field is ignored for forward compatibility.
    """

    model_config = ConfigDict(populate_by_name=True, extra="ignore")

    index: int = Field(ge=0)
    ir: float = Field(gt=0)
    red: float = Field(validation_alias=AliasChoices("red", "r"), gt=0)


class HelloMessage(_ProtocolMessage, _DeviceScoped):
    """Device announces itself and authenticates over WSS.

    `credential` is the device's "provisioned opaque token" (README). It is a
    `SecretStr` so it cannot be accidentally leaked via `repr()`, `str()`, or
    `model_dump()` — see the module docstring's "Security note".
    """

    type: Literal["hello"]
    is_simulated: bool = False
    credential: SecretStr = Field(min_length=1)
    capabilities: dict[str, Any] | None = None


class SamplesMessage(_ProtocolMessage, _DeviceScoped, _MeasurementScoped):
    """A batch of acquisition samples for an in-progress measurement."""

    type: Literal["samples"]
    batch_id: str = Field(min_length=1)
    sample_rate_hz: float = Field(gt=0)
    # Optional: the fixture carries it, but a device without a usable temperature
    # read must still be able to ship samples.
    sensor_temp_c: float | None = None
    dropped_samples: int = Field(ge=0)
    samples: list[Sample] = Field(min_length=1, max_length=MAX_SAMPLES_PER_BATCH)

    @field_validator("samples")
    @classmethod
    def _validate_monotonic_index(cls, value: list[Sample]) -> list[Sample]:
        """Enforce "monotonic sample index within a measurement".

        Gaps between indices are legal (a drop may skip values) and are
        preserved as-is — this validator only rejects non-increasing runs
        (duplicates or reordering), it never renumbers anything.
        """
        previous: int | None = None
        for sample in value:
            if previous is not None and sample.index <= previous:
                raise ValueError(
                    "sample index must be strictly increasing within a batch "
                    f"(got {sample.index} after {previous})"
                )
            previous = sample.index
        return value


class StartAckMessage(_ProtocolMessage, _DeviceScoped, _MeasurementScoped):
    """Device acknowledges a `start` command, echoing `command_id` and `measurement_id`."""

    type: Literal["start_ack"]
    command_id: str = Field(min_length=1)


class StopAckMessage(_ProtocolMessage, _DeviceScoped, _MeasurementScoped):
    """Device acknowledges a `stop` command, echoing `command_id` and `measurement_id`."""

    type: Literal["stop_ack"]
    command_id: str = Field(min_length=1)


class LogMessage(_ProtocolMessage, _DeviceScoped):
    """Device-reported diagnostic event (e.g. dropped-sample warnings).

    `measurement_id` is optional here, unlike on samples and acknowledgements: a
    device also logs while connecting or idle, when no measurement exists. The
    contract requires the field on start/stop commands, not on diagnostics, and
    rejecting a connection-time warning would throw away exactly the diagnostic
    that matters most.
    """

    type: Literal["log"]
    measurement_id: str | None = None
    level: str = Field(min_length=1)
    code: str = Field(min_length=1)
    message: str = Field(min_length=1)

    @field_validator("measurement_id")
    @classmethod
    def _validate_optional_measurement_id(cls, value: str | None) -> str | None:
        if value is None:
            return None
        return _check_public_id(
            value, prefix=MEASUREMENT_PREFIX, field_name="measurement_id"
        )


class FinishedMessage(_ProtocolMessage, _DeviceScoped, _MeasurementScoped):
    """Device reports that a measurement has ended."""

    type: Literal["finished"]
    reason: str = Field(min_length=1)
    samples_acquired: int = Field(ge=0)
    dropped_samples: int = Field(ge=0)


InboundDeviceMessage = Annotated[
    Union[
        HelloMessage,
        SamplesMessage,
        StartAckMessage,
        StopAckMessage,
        LogMessage,
        FinishedMessage,
    ],
    Field(discriminator="type"),
]

_inbound_adapter: TypeAdapter[InboundDeviceMessage] = TypeAdapter(InboundDeviceMessage)


def parse_inbound_message(raw: bytes | str | dict[str, Any]) -> InboundDeviceMessage:
    """Validate and parse one device-to-server v1 message.

    Accepts already-decoded JSON (`dict`) or raw JSON (`str`/`bytes`). Raises
    `pydantic.ValidationError` if the message does not match any known
    inbound message shape. Callers that hold the raw encoded bytes/text should
    call `check_payload_size` on it first — this function does not repeat
    that check once the input is a `dict`.
    """
    if isinstance(raw, (bytes, str)):
        return _inbound_adapter.validate_json(raw)
    return _inbound_adapter.validate_python(raw)


# ---------------------------------------------------------------------------
# Outbound (server -> device) commands
# ---------------------------------------------------------------------------


class StartCommand(_ProtocolMessage, _MeasurementScoped):
    """Server instructs a device to begin a measurement.

    `duration` (seconds) is present in the v1 fixture but is not described by
    the contract's limits text; treated here as an optional positive float.
    """

    type: Literal["start"]
    command_id: str = Field(min_length=1)
    duration: float | None = Field(default=None, gt=0)


class StopCommand(_ProtocolMessage, _MeasurementScoped):
    """Server instructs a device to stop the current measurement."""

    type: Literal["stop"]
    command_id: str = Field(min_length=1)


OutboundCommand = Annotated[
    Union[StartCommand, StopCommand],
    Field(discriminator="type"),
]

_outbound_adapter: TypeAdapter[OutboundCommand] = TypeAdapter(OutboundCommand)


def parse_outbound_command(raw: bytes | str | dict[str, Any]) -> OutboundCommand:
    """Validate and parse one server-to-device v1 command (`start`/`stop`)."""
    if isinstance(raw, (bytes, str)):
        return _outbound_adapter.validate_json(raw)
    return _outbound_adapter.validate_python(raw)
