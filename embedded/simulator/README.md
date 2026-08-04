# Embedded Simulator

Python simulator for the version 1 device WebSocket protocol. It produces synthetic PPG samples
at the firmware-parity default of 100 Hz (configurable with `--fs`) and can inject repeatable
transport and payload faults without using a physical ESP32. Batches default to and may not exceed
64 samples; serialized protocol payloads are capped at 8,192 bytes.

Install its isolated dependencies:

```bash
python3 -m pip install -r embedded/simulator/requirements.txt
```

Run against the backwards-compatible local WebSocket endpoint:

```bash
python3 embedded/simulator/simulator.py --port 8080 --device-id sim-device-001
```

For a provisioned public endpoint, select WSS and pass the device credential. The token is sent
only as `credential` in `hello`; it is never printed by the simulator.

```bash
python3 embedded/simulator/simulator.py \
  --host devices.example.test --port 443 --secure \
  --device-id clinic-room-1 --device-token "$PLETHOS_DEVICE_TOKEN"
```

`--url wss://devices.example.test/ws/devices/dev_clinic-room-1` can replace the host, port, and
scheme options when paired with `--device-id clinic-room-1`. URLs must use `ws://` or `wss://`,
must match the configured device ID, and cannot contain user-info, query strings, or fragments.

Each outbound message has `protocol_version: 1` and the normalized `device_id`. `hello` includes
`is_simulated` and (when supplied) `credential`. Sample messages include a stable `batch_id`
and `dropped_samples`. Start and stop acknowledgements echo an inbound `command_id` when present.
Stop commands that name a different measurement are acknowledged but cannot stop the active one.

For a deterministic local recording:

```bash
python3 embedded/simulator/simulator.py \
  --auto-start --auto-duration-s 15 --seed 42 --bpm 80 --fs 133.333333
```

## Failure scenarios

All batch frequency switches are one-based: `--duplicate-every-batches 2` affects batches 2, 4,
and so on. They are deterministic when `--seed` is supplied.

```bash
python3 embedded/simulator/simulator.py --auto-start --auto-duration-s 15 --seed 42 \
  --disconnect-after-batches 3 --reconnect-delay-s 0.2 \
  --duplicate-every-batches 5 --missing-every-batches 7 \
  --malformed-every-batches 11 --extra-noise 40
```

- `--disconnect-after-batches N` closes one active connection after batch `N`, then reconnects.
  The active measurement, batch numbering, and sample indices continue from where they stopped.
- `--duplicate-every-batches N` sends an identical additional sample message with the same
  `batch_id`.
- `--missing-every-batches N` omits a batch. The next delivered batch reports the gap through
  `dropped_samples`.
- `--malformed-every-batches N` sends one intentionally invalid JSON frame before the normal
  sample batch.
- `--extra-noise N` adds Gaussian noise to generated sensor values.

Run multiple instances by choosing distinct `--device-id` values. The simulator does not allocate
device IDs itself, so orchestration is responsible for avoiding a duplicate identity.

Run focused verification with:

```bash
python3 -m pytest -q embedded/simulator/tests
python3 -m py_compile embedded/simulator/simulator.py
```
