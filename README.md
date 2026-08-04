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
| [`infra/caddy/`](infra/caddy/) | Public HTTPS/WSS edge configuration |
| [`infra/docker/server/`](infra/docker/server/) | FastAPI application image |
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

## Running the stack

```bash
cp .env.example .env
```

Set `POSTGRES_PASSWORD` in `.env` — the stack refuses to start without it rather
than falling back to a default password. Then:

```bash
docker compose up --build
```

That applies `compose.override.yaml` automatically, which is **development
only**: it publishes PostgreSQL and the API on `127.0.0.1` and mounts the source
read-only for auto-reload.

For a production-shaped run, use the base file alone:

```bash
docker compose -f compose.yaml up -d --build
```

### Services

| Service | Role | Published |
|---|---|---|
| `caddy` | HTTPS/WSS edge, the only public entry point | `443`, `443/udp`, `80` |
| `api` | FastAPI application, exactly one worker | private |
| `migrate` | Runs `alembic upgrade head`, then exits | private |
| `postgres` | PostgreSQL 16, named volume | private |

Start-up order is enforced: `api` waits for `postgres` to pass a real
`pg_isready` check *and* for `migrate` to exit successfully, so the API never
serves against an unmigrated schema. The API container's health check calls
`/api/health/ready`, which performs a real query rather than reporting "process
up".

Only Caddy publishes ports. PostgreSQL, the API, and Caddy's admin API are
unreachable from outside the Compose network.

Everything reaches the system through one origin, so the browser uses same-origin
HTTPS for REST and WSS for the live stream — no CORS and no mixed content. With
the default `PLETHOS_SITE_ADDRESS=localhost`, Caddy issues a certificate from its
internal CA, so a browser warns once; set a real DNS name for an automatic public
certificate.

Both application images run as non-root (uid 10001) and install dependencies from
the hash-verified lockfile, so a build cannot silently resolve a different
version.

### Applying migrations on their own

```bash
docker compose run --rm migrate
```

## Production plan

[`PROJECT_PRODUCTION_PLAN.md`](PROJECT_PRODUCTION_PLAN.md) is the approved sprint
and release baseline. MQTT is intentionally deferred until Sprint 4; Sprint 1
uses the existing device WebSocket protocol with secure WSS support.
