from __future__ import annotations

import argparse
import asyncio
import contextlib
import json
import math
import random
import re
import signal
from dataclasses import dataclass
from typing import Any
from urllib.parse import urlparse, urlunparse

import websockets
from websockets.exceptions import ConnectionClosed


PROTOCOL_VERSION = 1
DEFAULT_SAMPLE_RATE_HZ = 100.0
MAX_BATCH_SIZE = 64
MAX_PAYLOAD_BYTES = 8192
PUBLIC_DEVICE_ID_PATTERN = re.compile(r"^dev_[A-Za-z0-9:._-]{1,59}$")


@dataclass(frozen=True)
class MeasurementProfile:
    bpm: float
    spo2_ratio: float
    temperature: float
    noise: float
    ir_dc: float
    red_dc: float
    ir_ac: float
    phase_offset: float


@dataclass(frozen=True)
class SimulatorConfig:
    host: str = "127.0.0.1"
    port: int = 8080
    device_id: str = "sim-device-001"
    fs: float = DEFAULT_SAMPLE_RATE_HZ
    batch_size: int = 64
    bpm: float | None = None
    spo2_ratio: float | None = None
    temperature: float | None = None
    noise: float | None = None
    extra_noise: float = 0.0
    auto_start: bool = False
    auto_duration_s: float | None = None
    once: bool = False
    scheme: str = "ws"
    url_override: str | None = None
    device_token: str | None = None
    seed: int | None = None
    reconnect_delay_s: float = 2.0
    disconnect_after_batches: int | None = None
    duplicate_every_batches: int | None = None
    missing_every_batches: int | None = None
    malformed_every_batches: int | None = None

    @property
    def public_device_id(self) -> str:
        return _public_device_id(self.device_id)

    @property
    def url(self) -> str:
        if self.url_override is not None:
            return self.url_override
        return f"{self.scheme}://{self.host}:{self.port}/ws/devices/{self.public_device_id}"


@dataclass
class MeasurementSession:
    measurement_id: str
    duration_s: float | None
    profile: MeasurementProfile
    next_sample_index: int = 0
    next_batch_number: int = 0
    pending_dropped_samples: int = 0
    total_dropped_samples: int = 0
    disconnect_injected: bool = False


class DeviceSimulator:
    """A deterministic WebSocket device simulator for protocol version 1.

    MeasurementSession deliberately outlives a WebSocket connection.  This keeps
    sample indices and batch IDs stable when a temporary transport failure occurs.
    """

    def __init__(self, config: SimulatorConfig) -> None:
        if not 0 < config.batch_size <= MAX_BATCH_SIZE:
            raise ValueError(f"batch_size must be in 1..{MAX_BATCH_SIZE}")
        if PUBLIC_DEVICE_ID_PATTERN.fullmatch(config.public_device_id) is None:
            raise ValueError("device_id must be a dev_-prefixed protocol identifier")
        self._config = config
        self._rng = random.Random(config.seed)
        self._stop_event = asyncio.Event()
        self._active_task: asyncio.Task[None] | None = None
        self._session: MeasurementSession | None = None
        self._completed_once = False

    async def run(self) -> None:
        while not self._stop_event.is_set():
            disconnect_reason: str | None = None
            try:
                async with websockets.connect(self._config.url) as websocket:
                    print(f"connected: {_safe_url(self._config.url)}", flush=True)
                    await self._send_json(websocket, self._hello_payload())

                    if self._config.auto_start and self._session is None and not self._completed_once:
                        await self._start_stream(
                            websocket,
                            measurement_id=f"mes_sim-{self._config.device_id}",
                            duration_s=self._config.auto_duration_s,
                            command_id=None,
                        )
                    else:
                        await self._resume_stream_if_needed(websocket)

                    await self._receive_loop(websocket)
                    await self._wait_for_active_transport_task()
                    if self._config.once and self._completed_once:
                        break
            except (OSError, ConnectionClosed) as exc:
                disconnect_reason = type(exc).__name__

            if self._stop_event.is_set() or (self._config.once and self._completed_once):
                break
            await self._wait_for_active_transport_task()
            reason = disconnect_reason or "connection closed"
            print(
                f"connection lost: {reason}; reconnecting in {self._config.reconnect_delay_s:g}s",
                flush=True,
            )
            await asyncio.sleep(self._config.reconnect_delay_s)

    def stop(self) -> None:
        self._stop_event.set()
        if self._active_task is not None:
            self._active_task.cancel()

    def _hello_payload(self) -> dict[str, Any]:
        payload = self._base_payload("hello")
        payload["is_simulated"] = True
        if self._config.device_token is not None:
            payload["credential"] = self._config.device_token
        return payload

    async def _receive_loop(self, websocket: websockets.ClientConnection) -> None:
        async for raw_message in websocket:
            message = _decode_json(raw_message)
            if message is None:
                await self._send_log(websocket, "received non-json message")
                continue

            message_type = message.get("type")
            if message_type == "hello_ack":
                print("server acknowledged device channel", flush=True)
                continue
            if message_type == "start":
                measurement_id = message.get("measurement_id")
                if not isinstance(measurement_id, str) or not measurement_id:
                    await self._send_log(websocket, "start command without measurement_id")
                    continue
                duration_s = _positive_float(message.get("duration"))
                print(f"start command received: measurement_id={measurement_id}", flush=True)
                await self._start_stream(websocket, measurement_id, duration_s, _command_id(message))
                continue
            if message_type == "stop":
                await self._stop_stream(
                    websocket,
                    requested_measurement_id=message.get("measurement_id"),
                    command_id=_command_id(message),
                )
                continue

            print(f"ignored server message type: {message_type}", flush=True)
            await self._send_log(websocket, f"ignored message type: {message_type}")

    async def _start_stream(
        self,
        websocket: websockets.ClientConnection,
        measurement_id: str,
        duration_s: float | None,
        command_id: str | None,
    ) -> None:
        if self._session is not None:
            if self._session.measurement_id == measurement_id:
                ack = self._base_payload("start_ack", measurement_id)
                _add_command_id(ack, command_id)
                await self._send_json(websocket, ack)
            else:
                await self._send_log(
                    websocket,
                    "start command ignored while another measurement is active",
                )
            return
        await self._cancel_active_task()
        self._session = MeasurementSession(
            measurement_id=measurement_id,
            duration_s=duration_s,
            profile=self._new_profile(),
        )
        ack = self._base_payload("start_ack", measurement_id)
        _add_command_id(ack, command_id)
        await self._send_json(websocket, ack)
        self._active_task = asyncio.create_task(self._stream_measurement(websocket, self._session))

    async def _resume_stream_if_needed(self, websocket: websockets.ClientConnection) -> None:
        if self._session is not None and (self._active_task is None or self._active_task.done()):
            print(f"resuming stream: measurement_id={self._session.measurement_id}", flush=True)
            self._active_task = asyncio.create_task(self._stream_measurement(websocket, self._session))

    async def _stop_stream(
        self,
        websocket: websockets.ClientConnection,
        *,
        requested_measurement_id: object,
        command_id: str | None,
    ) -> None:
        current = self._session
        requested = requested_measurement_id if isinstance(requested_measurement_id, str) else None
        if current is not None and requested is not None and requested != current.measurement_id:
            # An old command must never terminate the measurement that replaced it.
            ack = self._base_payload("stop_ack", requested)
            _add_command_id(ack, command_id)
            await self._send_json(websocket, ack)
            print(f"ignored stale stop command: measurement_id={requested}", flush=True)
            return

        stopped_measurement_id = current.measurement_id if current is not None else requested
        await self._cancel_active_task()
        self._session = None
        self._completed_once = True
        ack = self._base_payload("stop_ack", stopped_measurement_id)
        _add_command_id(ack, command_id)
        await self._send_json(websocket, ack)
        if stopped_measurement_id is None:
            print("stop command ignored: stream is already idle", flush=True)
        else:
            print(f"stream stopped by server: measurement_id={stopped_measurement_id}", flush=True)
        if self._config.once:
            self.stop()

    async def _stream_measurement(
        self,
        websocket: websockets.ClientConnection,
        session: MeasurementSession,
    ) -> None:
        total_samples = (
            max(1, int(math.ceil(session.duration_s * self._config.fs - 1e-9)))
            if session.duration_s is not None
            else None
        )
        profile = session.profile
        print(
            f"stream started: measurement_id={session.measurement_id}, samples={total_samples or 'unbounded'}",
            flush=True,
        )

        try:
            while (
                (total_samples is None or session.next_sample_index < total_samples)
                and not self._stop_event.is_set()
                and self._session is session
            ):
                batch_count = self._config.batch_size
                if total_samples is not None:
                    batch_count = min(batch_count, total_samples - session.next_sample_index)
                batch_number = session.next_batch_number
                batch_id = (
                    f"{self._config.public_device_id}:{session.measurement_id}:{batch_number}"
                )
                samples = [
                    self._sample(sample_index, profile)
                    for sample_index in range(session.next_sample_index, session.next_sample_index + batch_count)
                ]
                session.next_sample_index += batch_count
                session.next_batch_number += 1

                if _is_due(self._config.missing_every_batches, batch_number):
                    session.pending_dropped_samples += batch_count
                    session.total_dropped_samples += batch_count
                    print(f"omitted batch: batch_id={batch_id}", flush=True)
                else:
                    payload = self._samples_payload(session, batch_id, samples)
                    if _is_due(self._config.malformed_every_batches, batch_number):
                        await websocket.send('{"type":"samples","malformed":')
                    await self._send_json(websocket, payload)
                    if _is_due(self._config.duplicate_every_batches, batch_number):
                        await self._send_json(websocket, payload)

                if (
                    self._config.disconnect_after_batches is not None
                    and not session.disconnect_injected
                    and session.next_batch_number >= self._config.disconnect_after_batches
                ):
                    session.disconnect_injected = True
                    print("injected disconnect; retaining measurement session for reconnect", flush=True)
                    await websocket.close(code=1012, reason="simulated transient disconnect")
                    return

                if total_samples is None or session.next_sample_index < total_samples:
                    await asyncio.sleep(batch_count / self._config.fs)

            if total_samples is not None and self._session is session and not self._stop_event.is_set():
                await self._send_json(
                    websocket,
                    self._base_payload(
                        "finished",
                        session.measurement_id,
                        reason="duration_reached",
                        samples_acquired=session.next_sample_index,
                        dropped_samples=session.total_dropped_samples,
                    ),
                )
                print(f"stream finished: measurement_id={session.measurement_id}", flush=True)
                self._session = None
                self._completed_once = True
                if self._config.once:
                    self.stop()
                    await websocket.close(code=1000, reason="measurement finished")
        except asyncio.CancelledError:
            raise
        except ConnectionClosed:
            # run() reconnects and creates a new transport task for the same session.
            print("stream interrupted: websocket closed", flush=True)

    def _samples_payload(
        self,
        session: MeasurementSession,
        batch_id: str,
        samples: list[dict[str, float]],
    ) -> dict[str, Any]:
        payload = self._base_payload("samples", session.measurement_id)
        payload.update(
            {
                "recording_id": None,
                "batch_id": batch_id,
                "dropped_samples": session.pending_dropped_samples,
                "sample_rate_hz": self._config.fs,
                "sensor_temp_c": session.profile.temperature,
                "samples": samples,
            }
        )
        session.pending_dropped_samples = 0
        return payload

    async def _cancel_active_task(self) -> None:
        task = self._active_task
        self._active_task = None
        if task is not None and not task.done():
            task.cancel()
            with contextlib.suppress(asyncio.CancelledError, ConnectionClosed):
                await task

    async def _wait_for_active_transport_task(self) -> None:
        task = self._active_task
        if task is not None and not task.done():
            with contextlib.suppress(asyncio.CancelledError, ConnectionClosed):
                await task

    def _base_payload(
        self,
        message_type: str,
        measurement_id: str | None = None,
        **fields: Any,
    ) -> dict[str, Any]:
        payload: dict[str, Any] = {
            "type": message_type,
            "protocol_version": PROTOCOL_VERSION,
            "device_id": self._config.public_device_id,
        }
        if measurement_id is not None:
            payload["measurement_id"] = measurement_id
        payload.update(fields)
        return payload

    def _new_profile(self) -> MeasurementProfile:
        return MeasurementProfile(
            bpm=self._config.bpm if self._config.bpm is not None else self._rng.uniform(58.0, 96.0),
            spo2_ratio=(
                self._config.spo2_ratio
                if self._config.spo2_ratio is not None
                else self._rng.uniform(0.45, 0.68)
            ),
            temperature=(
                self._config.temperature
                if self._config.temperature is not None
                else self._rng.uniform(30.5, 33.5)
            ),
            noise=(self._config.noise if self._config.noise is not None else self._rng.uniform(25.0, 90.0))
            + self._config.extra_noise,
            ir_dc=self._rng.uniform(78_000.0, 96_000.0),
            red_dc=self._rng.uniform(48_000.0, 60_000.0),
            ir_ac=self._rng.uniform(1_000.0, 2_200.0),
            phase_offset=self._rng.uniform(0.0, 2.0 * math.pi),
        )

    def _sample(self, sample_index: int, profile: MeasurementProfile) -> dict[str, float]:
        t = sample_index / self._config.fs
        frequency_hz = profile.bpm / 60.0
        red_ac = profile.spo2_ratio * profile.ir_ac * profile.red_dc / profile.ir_dc
        phase = 2.0 * math.pi * frequency_hz * t + profile.phase_offset
        return {
            "index": sample_index,
            "ir": profile.ir_dc + profile.ir_ac * math.sin(phase) + self._rng.gauss(0.0, profile.noise),
            "red": profile.red_dc + red_ac * math.sin(phase) + self._rng.gauss(0.0, profile.noise * 0.75),
        }

    async def _send_json(self, websocket: websockets.ClientConnection, payload: dict[str, Any]) -> None:
        encoded = json.dumps(payload, separators=(",", ":"))
        if len(encoded.encode("utf-8")) > MAX_PAYLOAD_BYTES:
            raise ValueError(f"protocol payload exceeds {MAX_PAYLOAD_BYTES} byte ceiling")
        await websocket.send(encoded)

    async def _send_log(self, websocket: websockets.ClientConnection, message: str) -> None:
        await self._send_json(websocket, self._base_payload("log", message=message))


def parse_args(argv: list[str] | None = None) -> SimulatorConfig:
    parser = argparse.ArgumentParser(description="Protocol v1 embedded device simulator")
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--port", type=int, default=8080)
    parser.add_argument("--scheme", choices=("ws", "wss"), default="ws")
    parser.add_argument("--secure", action="store_true", help="Use wss:// when --url is not supplied.")
    parser.add_argument("--url", dest="url_override", help="Complete ws:// or wss:// device endpoint.")
    parser.add_argument("--device-id", default="sim-device-001")
    parser.add_argument("--device-token", help="Provisioned credential sent only in the hello payload.")
    parser.add_argument("--fs", type=float, default=DEFAULT_SAMPLE_RATE_HZ)
    parser.add_argument("--batch-size", type=int, default=64)
    parser.add_argument("--bpm", type=float, default=None)
    parser.add_argument("--spo2-ratio", type=float, default=None)
    parser.add_argument("--temperature", type=float, default=None)
    parser.add_argument("--noise", type=float, default=None)
    parser.add_argument("--extra-noise", type=float, default=0.0, help="Additional Gaussian sample noise.")
    parser.add_argument("--seed", type=int, help="Seed for reproducible profiles and samples.")
    parser.add_argument("--reconnect-delay-s", type=float, default=2.0)
    parser.add_argument("--disconnect-after-batches", type=int)
    parser.add_argument("--duplicate-every-batches", type=int)
    parser.add_argument("--missing-every-batches", type=int)
    parser.add_argument("--malformed-every-batches", type=int)
    parser.add_argument("--auto-start", action="store_true")
    parser.add_argument("--auto-duration-s", type=float, default=None)
    parser.add_argument("--once", action="store_true")
    args = parser.parse_args(argv)
    _validate_args(parser, args)
    return SimulatorConfig(
        host=args.host,
        port=args.port,
        scheme="wss" if args.secure else args.scheme,
        url_override=args.url_override,
        device_id=args.device_id,
        device_token=args.device_token,
        fs=args.fs,
        batch_size=args.batch_size,
        bpm=args.bpm,
        spo2_ratio=args.spo2_ratio,
        temperature=args.temperature,
        noise=args.noise,
        extra_noise=args.extra_noise,
        seed=args.seed,
        reconnect_delay_s=args.reconnect_delay_s,
        disconnect_after_batches=args.disconnect_after_batches,
        duplicate_every_batches=args.duplicate_every_batches,
        missing_every_batches=args.missing_every_batches,
        malformed_every_batches=args.malformed_every_batches,
        auto_start=args.auto_start,
        auto_duration_s=args.auto_duration_s,
        once=args.once,
    )


def _validate_args(parser: argparse.ArgumentParser, args: argparse.Namespace) -> None:
    if args.url_override is not None:
        parsed_url = urlparse(args.url_override)
        if parsed_url.scheme not in {"ws", "wss"} or parsed_url.hostname is None:
            parser.error("--url must be an absolute ws:// or wss:// URL")
        if parsed_url.username or parsed_url.password or parsed_url.query or parsed_url.fragment:
            parser.error("--url cannot contain user-info, query credentials, or fragments")
        endpoint_device_id = parsed_url.path.rstrip("/").rsplit("/", 1)[-1]
        if endpoint_device_id != _public_device_id(args.device_id):
            parser.error("--url device ID must match --device-id")
    if PUBLIC_DEVICE_ID_PATTERN.fullmatch(_public_device_id(args.device_id)) is None:
        parser.error("--device-id contains unsupported characters or exceeds 63 bytes")
    if args.fs <= 0 or args.reconnect_delay_s < 0:
        parser.error("--fs must be positive; --reconnect-delay-s cannot be negative")
    if not 0 < args.batch_size <= MAX_BATCH_SIZE:
        parser.error(f"--batch-size must be in 1..{MAX_BATCH_SIZE}")
    if args.auto_duration_s is not None and args.auto_duration_s <= 0:
        parser.error("--auto-duration-s must be positive")
    for name in (
        "disconnect_after_batches",
        "duplicate_every_batches",
        "missing_every_batches",
        "malformed_every_batches",
    ):
        value = getattr(args, name)
        if value is not None and value <= 0:
            parser.error(f"--{name.replace('_', '-')} must be positive")


def _decode_json(raw_message: str | bytes) -> dict[str, Any] | None:
    try:
        payload = json.loads(raw_message)
    except (TypeError, json.JSONDecodeError):
        return None
    return payload if isinstance(payload, dict) else None


def _positive_float(value: object) -> float | None:
    try:
        parsed = float(value)
    except (TypeError, ValueError):
        return None
    return parsed if parsed > 0 else None


def _public_device_id(device_id: str) -> str:
    return device_id if device_id.startswith("dev_") else f"dev_{device_id}"


def _command_id(message: dict[str, Any]) -> str | None:
    value = message.get("command_id")
    return value if isinstance(value, str) and value else None


def _add_command_id(payload: dict[str, Any], command_id: str | None) -> None:
    if command_id is not None:
        payload["command_id"] = command_id


def _is_due(every: int | None, batch_number: int) -> bool:
    return every is not None and (batch_number + 1) % every == 0


def _safe_url(url: str) -> str:
    """Keep query credentials and URL user-info out of operator logs."""
    parsed = urlparse(url)
    host = parsed.hostname or ""
    if parsed.port is not None:
        host = f"{host}:{parsed.port}"
    return urlunparse((parsed.scheme, host, parsed.path, "", "", ""))


async def _main() -> None:
    simulator = DeviceSimulator(parse_args())
    loop = asyncio.get_running_loop()
    for signum in (signal.SIGINT, signal.SIGTERM):
        with contextlib.suppress(NotImplementedError):
            loop.add_signal_handler(signum, simulator.stop)
    await simulator.run()


if __name__ == "__main__":
    asyncio.run(_main())
