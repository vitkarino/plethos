# Plethos ESP32 firmware

Firmware for an ESP32 with a MAX30102/MAX30105-compatible sensor. The external
runtime interface is deliberately small: `configure()`, `connect()`,
`start_measurement()`, `stop_measurement()`, and `loop()`. Sensor acquisition,
averaging, batching, JSON serialization, and WSS connection lifecycle remain
inside that module. The transport adapter never owns signal-sampling rules.

## Sampling behavior

The sensor runs at 400 Hz with hardware FIFO averaging of 4 and software
averaging of 1, yielding an effective 100 Hz sample stream. Red and IR LEDs are
enabled, LED brightness is `0x30`, pulse width is 411 microseconds, ADC range is
4096, and batches contain at most 64 samples. A full batch represents 640 ms.
The bounded JSON payload ceiling is 8,192 bytes.

The firmware reads die temperature once before each stream and then clears the
FIFO, preserving the previous behavior that avoids a periodic PPG baseline step.
Sample indices are monotonic within a measurement. A transient disconnect does
not reset them; a retained batch keeps its stable ID for retry. If the buffer is
full while transport is unavailable, later samples are counted in
`dropped_samples` and their indices are not reused.

## Provisioning

1. Copy `include/device_config.example.h` to `include/device_config.h`.
2. Replace every example value locally. The destination is ignored by Git.
3. Provision a stable `dev_`-prefixed device ID no longer than 63 bytes.
4. Set Wi-Fi SSID and password.
5. Set a DNS hostname, port, and `/ws/devices/{device_id}` path. Public devices
   should use port 443 and `tls_enabled = true`.
6. Paste the issuing root/intermediate CA certificate in PEM form. The hostname
   is verified against the server certificate by the ESP32 TLS stack.
7. Generate a unique high-entropy device token in the server provisioning
   workflow and paste it locally. It is sent only in the encrypted hello message,
   never written to serial logs. Sprint 2 owns server enforcement.

The committed example values are compile-only and deliberately unusable. Never
put real configuration in `device_config.example.h`, `platformio.ini`, build
flags, shell history, or a ticket. Rotate the Wi-Fi password that was present in
the pre-monorepo sketch before flashing any device.

For local development only, `tls_enabled = false` permits plain `ws://`. Never
use that setting across a public or untrusted network.

## Compile and test

The reproducible container path requires Docker Desktop on Windows or Docker
Engine on Linux:

```bash
infra/docker/embedded/check.sh
```

With PlatformIO Core 6.1.19 installed on the host:

```bash
cd embedded/pulso_esp32
pio test -e native
pio run -e ci
pio run -e esp32dev
```

`ci` uses the inert example configuration. `esp32dev` requires the ignored real
configuration.

## Flashing and serial monitoring

Connect one board at a time and identify its serial port. Review the ignored
configuration before every upload:

```bash
pio run -e esp32dev -t upload --upload-port /dev/ttyUSB0
pio device monitor --port /dev/ttyUSB0 --baud 115200
```

On Windows the port resembles `COM5`; on macOS it commonly resembles
`/dev/cu.usbserial-*`. Linux users may need membership in `dialout` and a new
login session. Do not run the monitor and uploader concurrently.

If upload synchronization fails, hold BOOT, tap RESET/EN, start upload, and
release BOOT when writing begins. If firmware cannot connect, verify DNS and
system time before replacing the CA certificate; TLS validation depends on both.
Reflash the last known-good build with a newly provisioned token if recovery is
required. Physical flashing is never part of automated checks.
