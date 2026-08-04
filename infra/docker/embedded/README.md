# Containerized embedded checks

The image pins Python 3.12.11 by multi-architecture manifest digest and
PlatformIO Core 6.1.19. `platformio.ini` separately pins the ESP32 platform,
board, Arduino framework supplied by that platform release, and every firmware
library.

From Linux, macOS, WSL 2, or Git Bash:

```bash
infra/docker/embedded/check.sh
```

From PowerShell:

```powershell
docker build -f infra/docker/embedded/Dockerfile -t plethos-embedded-check:local .
```

The image build itself runs the native tests and compiles the `ci` environment,
so a stale or failing firmware tree cannot produce the check image. The script
defaults to `linux/amd64`, the common Windows/Linux deployment architecture;
set `PLETHOS_EMBEDDED_PLATFORM` when intentionally validating another target.
The `ci` environment uses the inert example configuration. It cannot connect to
Wi-Fi or authenticate and must never be flashed. Real configuration is
deliberately excluded from the Docker context.

Firmware upload stays on the host because serial-device passthrough differs
between Docker Desktop and Linux. Linux users may experiment with
`--device=/dev/ttyUSB0`, but host-side PlatformIO remains the supported path.
