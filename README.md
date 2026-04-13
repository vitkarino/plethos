# Pulso (Nuxt + PostgreSQL)

This project now includes a Nuxt server backend in `server/` with:

- PostgreSQL CRUD for `users`, `projects`, `project_users`, `recordings`
- API v1 envelope responses (`data` + `meta`)
- WebSocket stream endpoint: `/ws/recordings/:id/stream`
- Mock Python signal provider (default) + HTTP provider scaffold for future FastAPI integration

## Backend documentation

- [Full backend guide](docs/backend-v1.md)

## Requirements

- Node.js 20+
- PostgreSQL 16+ (local or external)

## Local database

Start local PostgreSQL with Docker:

```bash
docker compose up -d
```

Copy env example and adjust if needed:

```bash
cp .env.example .env
```

Default local Postgres mapping is `127.0.0.1:55432 -> container:5432` to avoid conflicts with host Postgres on `5432`.

## Database workflow

Generate migrations:

```bash
npm run db:generate
```

Apply migrations:

```bash
npm run db:migrate
```

Seed test/mock data:

```bash
npm run db:seed
```

## Run app

```bash
npm install
npm run dev
```

Nuxt app: `http://localhost:3000`

## Tests

Integration tests (API + WS smoke):

```bash
npm run test:integration
```

By default tests use `TEST_DATABASE_URL` (fallback to `DATABASE_URL`).

## Environment variables

- `DATABASE_URL` - main database URL
- `TEST_DATABASE_URL` - database URL for integration tests
- `PYTHON_PROVIDER_MODE` - `mock` (default) or `http`
- `PYTHON_BASE_URL` - base URL for Python/FastAPI provider
- `PYTHON_TIMEOUT_MS` - timeout for Python HTTP calls
- `AUTH_ENABLED` - auth scaffold flag (currently does not enforce auth)
- `AUTH_BEARER_TOKEN` - reserved for future auth checks
