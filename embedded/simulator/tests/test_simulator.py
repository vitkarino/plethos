import asyncio
import json
import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from simulator import (  # noqa: E402
    DEFAULT_SAMPLE_RATE_HZ,
    MAX_BATCH_SIZE,
    PROTOCOL_VERSION,
    DeviceSimulator,
    MeasurementSession,
    SimulatorConfig,
    parse_args,
)


class FakeWebSocket:
    def __init__(self) -> None:
        self.sent: list[str] = []
        self.closed: list[tuple[int, str]] = []

    async def send(self, payload: str) -> None:
        self.sent.append(payload)

    async def close(self, code: int = 1000, reason: str = "") -> None:
        self.closed.append((code, reason))


def _sample_messages(websocket: FakeWebSocket) -> list[dict]:
    messages = []
    for raw in websocket.sent:
        try:
            messages.append(json.loads(raw))
        except json.JSONDecodeError:
            continue
    return [message for message in messages if message.get("type") == "samples"]


def _message(websocket: FakeWebSocket, message_type: str) -> dict:
    return next(
        json.loads(raw)
        for raw in websocket.sent
        if raw.startswith("{") and raw.endswith("}") and json.loads(raw).get("type") == message_type
    )


def _session(simulator: DeviceSimulator, measurement_id: str, duration_s: float) -> MeasurementSession:
    return MeasurementSession(measurement_id, duration_s, simulator._new_profile())


def test_seed_reproduces_profiles_and_sample_data() -> None:
    config = SimulatorConfig(seed=17, noise=2.0, extra_noise=1.5)
    first = DeviceSimulator(config)
    second = DeviceSimulator(config)

    first_profile = first._new_profile()
    second_profile = second._new_profile()

    assert first_profile == second_profile
    assert first._sample(12, first_profile) == second._sample(12, second_profile)


def test_defaults_match_firmware_rate_and_batch_ceiling() -> None:
    config = parse_args([])

    assert config.fs == DEFAULT_SAMPLE_RATE_HZ == 100.0
    assert config.batch_size == MAX_BATCH_SIZE == 64


def test_wss_url_and_hello_token_are_configurable_without_changing_device_identity() -> None:
    config = parse_args(
        [
            "--host",
            "sim.example.test",
            "--port",
            "9443",
            "--secure",
            "--device-id",
            "alpha",
            "--device-token",
            "not-logged-token",
        ]
    )
    simulator = DeviceSimulator(config)

    assert config.url == "wss://sim.example.test:9443/ws/devices/dev_alpha"
    assert simulator._hello_payload() == {
        "type": "hello",
        "protocol_version": PROTOCOL_VERSION,
        "device_id": "dev_alpha",
        "is_simulated": True,
        "credential": "not-logged-token",
    }
    assert parse_args(
        ["--url", "wss://gateway.test/ws/devices/dev_beta", "--device-id", "beta"]
    ).url == "wss://gateway.test/ws/devices/dev_beta"


def test_multiple_instances_use_distinct_normalized_device_ids() -> None:
    first = DeviceSimulator(SimulatorConfig(device_id="one"))
    second = DeviceSimulator(SimulatorConfig(device_id="dev_two"))

    assert first._hello_payload()["device_id"] == "dev_one"
    assert second._hello_payload()["device_id"] == "dev_two"
    assert first._hello_payload()["device_id"] != second._hello_payload()["device_id"]


def test_url_cannot_hide_credentials_or_target_another_device() -> None:
    with pytest.raises(SystemExit):
        parse_args(
            [
                "--url",
                "wss://user:secret@gateway.test/ws/devices/dev_alpha?token=secret",
                "--device-id",
                "alpha",
            ]
        )
    with pytest.raises(SystemExit):
        parse_args(
            ["--url", "wss://gateway.test/ws/devices/dev_beta", "--device-id", "alpha"]
        )


def test_failure_sequence_duplicate_missing_and_malformed_payloads() -> None:
    async def scenario() -> FakeWebSocket:
        simulator = DeviceSimulator(
            SimulatorConfig(
                fs=10.0,
                batch_size=2,
                seed=4,
                duplicate_every_batches=2,
                missing_every_batches=3,
                malformed_every_batches=4,
            )
        )
        session = _session(simulator, "mes_measure-1", 1.0)
        simulator._session = session
        websocket = FakeWebSocket()
        await simulator._stream_measurement(websocket, session)
        return websocket

    websocket = asyncio.run(scenario())
    samples = _sample_messages(websocket)

    assert [message["batch_id"] for message in samples] == [
        "dev_sim-device-001:mes_measure-1:0",
        "dev_sim-device-001:mes_measure-1:1",
        "dev_sim-device-001:mes_measure-1:1",
        "dev_sim-device-001:mes_measure-1:3",
        "dev_sim-device-001:mes_measure-1:3",
        "dev_sim-device-001:mes_measure-1:4",
    ]
    assert samples[3]["dropped_samples"] == 2
    finished = _message(websocket, "finished")
    assert finished["samples_acquired"] == 10
    assert finished["dropped_samples"] == 2
    assert any(raw == '{"type":"samples","malformed":' for raw in websocket.sent)
    assert all(message["protocol_version"] == PROTOCOL_VERSION for message in samples)


def test_reconnect_keeps_batch_ids_and_sample_indices_monotonic() -> None:
    async def scenario() -> tuple[FakeWebSocket, FakeWebSocket]:
        simulator = DeviceSimulator(
            SimulatorConfig(fs=10.0, batch_size=2, seed=9, disconnect_after_batches=1)
        )
        session = _session(simulator, "mes_measure-2", 0.6)
        simulator._session = session
        first_socket = FakeWebSocket()
        await simulator._stream_measurement(first_socket, session)
        second_socket = FakeWebSocket()
        await simulator._stream_measurement(second_socket, session)
        return first_socket, second_socket

    first_socket, second_socket = asyncio.run(scenario())
    first = _sample_messages(first_socket)
    resumed = _sample_messages(second_socket)

    assert first[0]["batch_id"] == "dev_sim-device-001:mes_measure-2:0"
    assert resumed[0]["batch_id"] == "dev_sim-device-001:mes_measure-2:1"
    assert [sample["index"] for sample in first[0]["samples"]] == [0, 1]
    assert [sample["index"] for sample in resumed[0]["samples"]] == [2, 3]
    assert first_socket.closed == [(1012, "simulated transient disconnect")]


def test_stale_stop_does_not_stop_newer_measurement_and_echoes_command_id() -> None:
    async def scenario() -> tuple[DeviceSimulator, FakeWebSocket]:
        simulator = DeviceSimulator(SimulatorConfig(seed=3))
        simulator._session = _session(simulator, "mes_new-measurement", 1.0)
        websocket = FakeWebSocket()
        await simulator._stop_stream(
            websocket,
            requested_measurement_id="mes_old-measurement",
            command_id="cmd-stop-old",
        )
        return simulator, websocket

    simulator, websocket = asyncio.run(scenario())
    acknowledgement = json.loads(websocket.sent[-1])

    assert simulator._session is not None
    assert simulator._session.measurement_id == "mes_new-measurement"
    assert acknowledgement["type"] == "stop_ack"
    assert acknowledgement["measurement_id"] == "mes_old-measurement"
    assert acknowledgement["command_id"] == "cmd-stop-old"


def test_stale_start_does_not_replace_active_measurement() -> None:
    async def scenario() -> tuple[DeviceSimulator, FakeWebSocket]:
        simulator = DeviceSimulator(SimulatorConfig(seed=3))
        simulator._session = _session(simulator, "mes_new-measurement", 1.0)
        websocket = FakeWebSocket()
        await simulator._start_stream(
            websocket,
            "mes_old-measurement",
            1.0,
            "cmd-start-old",
        )
        return simulator, websocket

    simulator, websocket = asyncio.run(scenario())
    message = json.loads(websocket.sent[-1])

    assert simulator._session is not None
    assert simulator._session.measurement_id == "mes_new-measurement"
    assert message["type"] == "log"


def test_start_ack_echoes_supplied_command_id() -> None:
    async def scenario() -> FakeWebSocket:
        simulator = DeviceSimulator(SimulatorConfig(fs=10.0, batch_size=2, seed=3))
        websocket = FakeWebSocket()
        await simulator._start_stream(websocket, "mes_new-measurement", 0.1, "cmd-start-new")
        await simulator._cancel_active_task()
        return websocket

    acknowledgement = json.loads(asyncio.run(scenario()).sent[0])

    assert acknowledgement["type"] == "start_ack"
    assert acknowledgement["measurement_id"] == "mes_new-measurement"
    assert acknowledgement["command_id"] == "cmd-start-new"
