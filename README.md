# Plethos

Plethos is a monorepo for a PPG data-collection system: a Nuxt researcher client,
a FastAPI backend, ESP32 firmware, and a deterministic device simulator.

## Packages

| Path | Purpose |
| --- | --- |
| [`client/`](client/) | Nuxt web client |
| [`server/`](server/) | FastAPI API and signal-processing backend |
| [`embedded/pulso_esp32/`](embedded/pulso_esp32/) | ESP32/MAX3010x firmware |
| [`embedded/simulator/`](embedded/simulator/) | Python device simulator |
| [`contracts/websocket/`](contracts/websocket/) | Versioned device WebSocket contract and fixtures |
| [`infra/docker/embedded/`](infra/docker/embedded/) | Reproducible firmware build image |

The imported client and server histories remain discoverable with
`git log -- client` and `git log -- server`. Their original branch tips are
parents of subtree integration commits in the root history.

## Development prerequisites

- Git 2.39 or newer.
- Docker Desktop on Windows (WSL 2 backend) or Docker Engine with the Compose
  plugin on Linux.
- Node.js and Python are optional for host-side client/server development.
- PlatformIO is optional for host-side firmware compilation and flashing.

Clone with Git configured to preserve LF endings for source files. On Windows,
Docker commands should be run from a WSL 2 shell or PowerShell in a directory
shared with Docker Desktop. Keep the repository on a local filesystem rather
than a network share for predictable bind-mount behavior.

Copy `.env.example` to `.env` for local application defaults. Embedded Wi-Fi,
host, TLS, and device credentials use a separate ignored firmware configuration;
see the embedded documentation before compiling or flashing.

## Production plan

[`PROJECT_PRODUCTION_PLAN.md`](PROJECT_PRODUCTION_PLAN.md) is the approved sprint
and release baseline. MQTT is intentionally deferred until Sprint 4; Sprint 1
uses the existing device WebSocket protocol with secure WSS support.
