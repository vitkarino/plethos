# Plethos device protocol v1

Devices connect to `/ws/devices/{device_id}`. Public device IDs begin with
`dev_`; public measurement IDs begin with `mes_`. Both are UTF-8 strings of at
most 63 bytes and may contain letters, digits, `.`, `:`, `_`, and `-` after the
prefix.

Every message contains `protocol_version: 1` and a `type`. Every outbound device
message contains its stable `device_id`. A device authenticates by placing its
provisioned opaque token in the hello `credential` field over WSS. Servers must
never echo or log that value. Sprint 2 owns server-side rejection and token
storage.

Server commands use a unique `command_id`. Version 1 start and stop commands
also carry the target `measurement_id`; acknowledgements echo both values. This
prevents a delayed stop or acknowledgement from mutating a newer measurement.

Sample batches have these limits:

- at most 64 samples;
- at most 8,192 UTF-8 encoded JSON bytes;
- stable `batch_id` for retry/deduplication;
- monotonic sample `index` within a measurement, including gaps caused by drops;
- `dropped_samples` reports acquisition samples omitted since the prior batch.

Receivers must deduplicate by `(device_id, measurement_id, batch_id)`. Unknown
fields must be ignored for forward compatibility. Unknown protocol versions and
oversized payloads must be rejected explicitly.
