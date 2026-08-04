from __future__ import annotations

import json
import re
import unittest
from pathlib import Path


FIXTURES = Path(__file__).parents[1] / "v1" / "fixtures"
ID_PATTERN = re.compile(r"^(?:dev|mes)_[A-Za-z0-9:._-]{1,59}$")
DEVICE_MESSAGES = {"hello", "samples", "start_ack", "stop_ack", "log", "finished"}
COMMANDS = {"start", "stop"}


class ProtocolFixtureTests(unittest.TestCase):
    def fixtures(self) -> list[tuple[str, dict[str, object], bytes]]:
        result = []
        for path in sorted(FIXTURES.glob("*.json")):
            raw = path.read_bytes()
            result.append((path.name, json.loads(raw), raw))
        return result

    def test_all_fixtures_are_v1_objects_with_known_types(self) -> None:
        for name, payload, _ in self.fixtures():
            with self.subTest(name=name):
                self.assertEqual(payload["protocol_version"], 1)
                self.assertIn(payload["type"], DEVICE_MESSAGES | COMMANDS)

    def test_device_and_measurement_ids_follow_server_prefixes(self) -> None:
        for name, payload, _ in self.fixtures():
            with self.subTest(name=name):
                for field in ("device_id", "measurement_id"):
                    if field in payload:
                        self.assertRegex(str(payload[field]), ID_PATTERN)

    def test_commands_and_acknowledgements_are_correlated(self) -> None:
        by_type = {str(payload["type"]): payload for _, payload, _ in self.fixtures()}
        for operation in COMMANDS:
            command = by_type[operation]
            acknowledgement = by_type[f"{operation}_ack"]
            self.assertEqual(command["command_id"], acknowledgement["command_id"])
            self.assertEqual(command["measurement_id"], acknowledgement["measurement_id"])

    def test_sample_batches_respect_wire_limits(self) -> None:
        for name, payload, raw in self.fixtures():
            if payload["type"] != "samples":
                continue
            with self.subTest(name=name):
                self.assertLessEqual(len(raw), 8192)
                samples = payload["samples"]
                self.assertIsInstance(samples, list)
                self.assertLessEqual(len(samples), 64)
                indices = [sample["index"] for sample in samples]
                self.assertEqual(indices, sorted(set(indices)))
                self.assertTrue(payload["batch_id"])
                self.assertGreaterEqual(payload["dropped_samples"], 0)

    def test_example_credential_is_obviously_non_production(self) -> None:
        hello = json.loads((FIXTURES / "hello.json").read_text())
        self.assertIn("not-a-secret", hello["credential"])


if __name__ == "__main__":
    unittest.main()
