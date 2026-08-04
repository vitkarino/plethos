from __future__ import annotations

import json
import unittest
from pathlib import Path

from pydantic import ValidationError

from app.schemas.device_protocol import (
    MAX_PAYLOAD_BYTES,
    MAX_SAMPLES_PER_BATCH,
    HelloMessage,
    check_payload_size,
    parse_inbound_message,
    parse_outbound_command,
)


def _repo_root_fixtures() -> Path:
    """Locate `contracts/websocket/v1/fixtures` by walking up from this file.

    Deliberately does not hardcode an absolute path or assume the CWD, since
    pytest may be invoked from `server/` or the repo root.
    """
    here = Path(__file__).resolve()
    for candidate in [here, *here.parents]:
        fixtures = candidate / "contracts" / "websocket" / "v1" / "fixtures"
        if fixtures.is_dir():
            return fixtures
    raise FileNotFoundError("could not locate contracts/websocket/v1/fixtures above test file")


FIXTURES = _repo_root_fixtures()
COMMAND_TYPES = {"start", "stop"}


def _load(name: str) -> dict:
    return json.loads((FIXTURES / name).read_text())


def _sample(index: int, *, ir: float = 91820, red: float = 53111) -> dict:
    """A minimal valid sample. `ir` and `red` are required — they are the signal."""
    return {"index": index, "ir": ir, "red": red}


class FixtureParsingTests(unittest.TestCase):
    def test_every_committed_fixture_parses_successfully(self) -> None:
        fixture_paths = sorted(FIXTURES.glob("*.json"))
        self.assertTrue(fixture_paths, "expected at least one fixture file")
        for path in fixture_paths:
            with self.subTest(name=path.name):
                payload = json.loads(path.read_text())
                if payload["type"] in COMMAND_TYPES:
                    parse_outbound_command(payload)
                else:
                    parse_inbound_message(payload)


class ProtocolVersionTests(unittest.TestCase):
    def test_wrong_protocol_version_is_rejected(self) -> None:
        payload = dict(_load("hello.json"), protocol_version=2)
        with self.assertRaises(ValidationError):
            parse_inbound_message(payload)

    def test_missing_protocol_version_is_rejected(self) -> None:
        payload = _load("hello.json")
        del payload["protocol_version"]
        with self.assertRaises(ValidationError):
            parse_inbound_message(payload)


class SampleBatchLimitTests(unittest.TestCase):
    def test_over_limit_sample_batch_is_rejected(self) -> None:
        payload = _load("samples.json")
        payload["samples"] = [_sample(i) for i in range(MAX_SAMPLES_PER_BATCH + 1)]
        with self.assertRaises(ValidationError):
            parse_inbound_message(payload)

    def test_at_limit_sample_batch_is_accepted(self) -> None:
        payload = _load("samples.json")
        payload["samples"] = [_sample(i) for i in range(MAX_SAMPLES_PER_BATCH)]
        parse_inbound_message(payload)  # should not raise

    def test_empty_sample_batch_is_rejected(self) -> None:
        payload = dict(_load("samples.json"), samples=[])
        with self.assertRaises(ValidationError):
            parse_inbound_message(payload)

    def test_index_gaps_are_preserved_rather_than_renumbered(self) -> None:
        payload = _load("samples.json")
        payload["samples"] = [_sample(0), _sample(5), _sample(6)]
        message = parse_inbound_message(payload)
        self.assertEqual([sample.index for sample in message.samples], [0, 5, 6])

    def test_non_increasing_index_is_rejected(self) -> None:
        payload = _load("samples.json")
        payload["samples"] = [_sample(5), _sample(5)]
        with self.assertRaises(ValidationError):
            parse_inbound_message(payload)

        payload["samples"] = [_sample(5), _sample(3)]
        with self.assertRaises(ValidationError):
            parse_inbound_message(payload)


class SampleReadingTests(unittest.TestCase):
    """The readings are the payload of a measurement; they must survive parsing."""

    def test_ir_and_red_readings_are_retained(self) -> None:
        message = parse_inbound_message(_load("samples.json"))
        self.assertEqual(
            [(sample.ir, sample.red) for sample in message.samples],
            [(91820.0, 53111.0), (91914.0, 53165.0)],
        )

    def test_sensor_temperature_is_retained(self) -> None:
        message = parse_inbound_message(_load("samples.json"))
        self.assertEqual(message.sensor_temp_c, 32.1)

    def test_short_red_key_is_accepted(self) -> None:
        payload = dict(_load("samples.json"), samples=[{"index": 0, "ir": 5, "r": 7}])
        message = parse_inbound_message(payload)
        self.assertEqual(message.samples[0].red, 7.0)

    def test_missing_readings_are_rejected(self) -> None:
        for broken in ({"index": 0}, {"index": 0, "ir": 5}, {"index": 0, "red": 7}):
            with self.subTest(sample=broken):
                payload = dict(_load("samples.json"), samples=[broken])
                with self.assertRaises(ValidationError):
                    parse_inbound_message(payload)

    def test_non_positive_readings_are_rejected(self) -> None:
        for broken in (_sample(0, ir=0), _sample(0, red=-1)):
            with self.subTest(sample=broken):
                payload = dict(_load("samples.json"), samples=[broken])
                with self.assertRaises(ValidationError):
                    parse_inbound_message(payload)


class DiagnosticLogTests(unittest.TestCase):
    def test_log_without_a_measurement_is_accepted(self) -> None:
        payload = _load("log.json")
        payload.pop("measurement_id")
        message = parse_inbound_message(payload)
        self.assertIsNone(message.measurement_id)
        self.assertEqual(message.code, "buffer_overflow")


class PayloadSizeTests(unittest.TestCase):
    def test_oversized_encoded_payload_is_rejected(self) -> None:
        raw = "x" * (MAX_PAYLOAD_BYTES + 1)
        with self.assertRaises(Exception):
            check_payload_size(raw)

    def test_at_limit_payload_is_accepted(self) -> None:
        raw = "x" * MAX_PAYLOAD_BYTES
        check_payload_size(raw)  # should not raise

    def test_bytes_input_measured_directly(self) -> None:
        raw = b"x" * (MAX_PAYLOAD_BYTES + 1)
        with self.assertRaises(Exception):
            check_payload_size(raw)


class ForwardCompatibilityTests(unittest.TestCase):
    def test_unknown_top_level_fields_are_accepted_and_ignored(self) -> None:
        payload = dict(_load("hello.json"), some_future_field="from a newer device")
        message = parse_inbound_message(payload)
        self.assertFalse(hasattr(message, "some_future_field"))

    def test_unknown_sample_fields_are_accepted_and_ignored(self) -> None:
        payload = _load("samples.json")
        payload["samples"] = [{"index": 0, "ir": 123, "red": 456, "future_sensor": 1}]
        message = parse_inbound_message(payload)
        self.assertEqual(message.samples[0].index, 0)
        self.assertFalse(hasattr(message.samples[0], "future_sensor"))
        # The known readings survive; only the unknown field is dropped.
        self.assertEqual((message.samples[0].ir, message.samples[0].red), (123.0, 456.0))


class CredentialSecrecyTests(unittest.TestCase):
    def test_credential_does_not_appear_in_repr_str_or_model_dump(self) -> None:
        secret = "super-secret-device-token-should-not-leak"
        hello = HelloMessage(
            protocol_version=1,
            type="hello",
            device_id="dev_example-device-001",
            is_simulated=False,
            credential=secret,
        )

        self.assertNotIn(secret, repr(hello))
        self.assertNotIn(secret, str(hello))

        dumped = hello.model_dump()
        self.assertNotIn(secret, json.dumps(dumped, default=str))
        self.assertNotIn(secret, str(dumped))

        # The real value is only reachable via the explicit escape hatch.
        self.assertEqual(hello.credential.get_secret_value(), secret)


class CommandAcknowledgementTests(unittest.TestCase):
    def test_commands_and_acknowledgements_round_trip(self) -> None:
        start = parse_outbound_command(_load("start-command.json"))
        start_ack = parse_inbound_message(_load("start-ack.json"))
        self.assertEqual(start.command_id, start_ack.command_id)
        self.assertEqual(start.measurement_id, start_ack.measurement_id)


class DeviceAndMeasurementIdTests(unittest.TestCase):
    def test_device_id_without_prefix_is_rejected(self) -> None:
        payload = dict(_load("hello.json"), device_id="example-device-001")
        with self.assertRaises(ValidationError):
            parse_inbound_message(payload)

    def test_measurement_id_without_prefix_is_rejected(self) -> None:
        payload = dict(_load("log.json"), measurement_id="018f2b70-example")
        with self.assertRaises(ValidationError):
            parse_inbound_message(payload)


if __name__ == "__main__":
    unittest.main()
