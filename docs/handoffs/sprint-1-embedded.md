# Sprint 1 embedded handoff

**Branch:** `codex/sprint-1-embedded`

**Base:** `8727b4c` (`main` production-plan baseline)

## Delivered

- Imported the client `feature/layout` and server `llm` histories as root
  subtrees. Their original commits remain parents of the integration commits.
- Added the root repository baseline, navigation, cross-platform line endings,
  safe environment example, and generated/local-artifact ignores.
- Replaced the credential-bearing one-file sketch with a deep `DeviceRuntime`
  module and a WSS transport adapter. Sensor acquisition and batching have no
  dependency on WebSocket implementation details.
- Added ignored header-based provisioning for Wi-Fi, stable device identity,
  DNS hostname/path/port, TLS CA certificate, and per-device credential.
- Added protocol v1 fixtures for hello, samples, start/stop commands and
  acknowledgements, logs, and finished events.
- Added bounded exponential reconnect backoff with jitter, stable retry batch
  IDs, monotonic measurement indices, explicit dropped-sample reporting, and
  stale measurement command protection.
- Added a deterministic multi-device simulator with WSS and credential support,
  disconnect/reconnect, duplicate, missing, malformed, and noise scenarios.
- Pinned PlatformIO, the ESP32 platform, the board, framework provider, and all
  libraries. Added host-native sampling tests and a digest-pinned, non-root
  container build that runs tests and compiles firmware while building.

MQTT was intentionally not introduced.

## Commits

| Commit | Purpose |
| --- | --- |
| `f569ba8` | Import client history under `client/` |
| `2b79413` | Import server history under `server/` |
| `c2101da` | Establish root monorepo baseline |
| `ac0144c` | Add secure versioned device runtime and contract |
| `246fe07` | Add simulator parity and deterministic failure modes |
| `e1fedbb` | Add reproducible container checks |

The final report commit follows this table in branch history.

## Validation

- `python3 -m unittest discover contracts/websocket/tests` — 5 passed.
- `python3 -m pytest -q embedded/simulator/tests` — 10 passed.
- `python3 -m py_compile embedded/simulator/simulator.py` — passed.
- `pio test -e native` with PlatformIO Core 6.1.19 — 3 passed.
- `pio run -e ci` with the pinned ESP32 toolchain — passed.
- `PLETHOS_EMBEDDED_PLATFORM=linux/arm64 infra/docker/embedded/check.sh` —
  non-root image built; 3 native tests and firmware compile passed.
- Container identity — `uid=10001(platformio) gid=10001(platformio)`.
- Firmware size — 57,028 bytes RAM (17.4%) and 937,001 bytes flash (71.5%)
  in the Linux ARM64 container. Host results differed by less than 0.01%.
- Tracked-output and known-credential scans — no `.pio`, cache, dataset,
  artifact, old SSID/password, or old LAN address found in tracked files.

## Server lead contract obligations

Sprint 2 must implement the receiving side of
`contracts/websocket/v1/README.md`:

1. Require `protocol_version: 1` for the final device path and reject unknown
   versions or payloads above 8,192 bytes. A short legacy transition is possible
   because Sprint 1 devices still accept unversioned server commands.
2. Authenticate the hello `credential` against a hashed/revocable per-device
   token. Never persist, echo, or log the presented credential.
3. Include a unique `command_id`, target `measurement_id`, and
   `protocol_version: 1` in every start/stop command. Correlate acknowledgements
   by command and measurement, not by connection alone.
4. Deduplicate sample batches by `(device_id, measurement_id, batch_id)` before
   storage or metrics processing. Treat a retry with the same ID as idempotent.
5. Enforce the 64-sample batch ceiling, preserve monotonic source indices, and
   store/report `dropped_samples` rather than closing index gaps.
6. Use the payload-provided `sample_rate_hz`. Current firmware and simulator
   emit 100 Hz (400 Hz sensor / hardware average 4); downstream processing may
   deliberately resample to 25 Hz, but server docs that still claim a 133.33 Hz
   device source rate must be corrected.
7. Put device ingestion behind the planned public WSS proxy with hostname-valid
   certificates. Do not expose the internal FastAPI port directly.

## Remaining operator/hardware validation

- Rotate the pre-monorepo Wi-Fi password before any device is reconnected. The
  sprint removed it from source/history but cannot change the access point.
- Provision a real CA, hostname, and unique device token, then verify WSS on a
  physical ESP32/MAX3010x. No physical board was flashed during this sprint.
- Verify serial recovery and sensor acquisition on the target board revision.
- The clean `linux/amd64` build reached final linking under Apple-silicon QEMU,
  where the cross-linker crashed with an internal segmentation fault. The same
  build passed natively on host and in Linux ARM64. Run the default AMD64 image
  once on native Windows Docker Desktop or Linux x86_64 before release; the
  failure is recorded as an emulation-only risk, not a source compile failure.
- The pinned SparkFun 1.1.2 library emits known `I2C_BUFFER_LENGTH` and unused
  code warnings. They do not fail or alter the validated build.
