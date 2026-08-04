# Sprint 2 server handoff — PARTIAL (in progress)

**Status:** incomplete. Six of sixteen tickets are done, reviewed, validated and
pushed. This is a checkpoint handoff, not a sprint completion report. Sprint 3
must not begin against this branch yet.

```text
Sprint:          2 — Server and ML
Provider:        Claude (Opus 5 lead, Sonnet 5 junior)
Branch:          codex/sprint-2-server
Lead worktree:   /private/tmp/plethos-worktrees/s2-server-lead
Base commit:     a6414c3 (tip of codex/sprint-1-embedded)
Final commit:    0eb4e3c
Remote branch:   plethos/codex/sprint-2-server
```

## Deviation from the plan: branch base

The plan (§9.2) requires each sprint to branch from `main` after the previous
sprint is merged. Sprint 1 was pushed but **not merged**, and the project owner
chose to base Sprint 2 directly on `codex/sprint-1-embedded` (`a6414c3`) rather
than merge first. `main` is therefore still at `8727b4c` and does not contain
Sprint 1 or Sprint 2 work.

Consequence for whoever merges: `codex/sprint-2-server` contains all of Sprint 1.
Merging it into `main` merges both sprints together. If Sprint 1 needs to land as
a reviewable unit of its own, merge `codex/sprint-1-embedded` into `main` first —
it fast-forwards cleanly — and only then merge this branch.

## Completed tickets

| Ticket | Commit | Outcome |
|---|---|---|
| S-001 | `2e2511f` | Python 3.13 pinned; layered `.in` inputs compiled to universal, hash-verified lockfiles |
| S-003 | `dd23a77` | Alembic owns the schema; startup DDL removed |
| S-007 (part) | `49228d7` | v1 device protocol validation layer |
| — | `48f9744` | Sprint 1 obligation: corrected the stale 133.33 Hz doc claim |
| S-005 | `682b2a0` | Liveness/readiness split with real dependency checks; one-worker rule enforced |
| S-004 | `0eb4e3c` | Core Compose stack: Caddy, API, migrate, PostgreSQL |

## Deferred tickets

Not started: **S-002** (modularize `main.py`), **S-006** (operator and device
authentication), **S-007** remainder (device-transport seam /
`WebSocketDeviceAdapter`), **S-008** (idempotent sample persistence),
**S-009**–**S-011** (generic analysis domain, async worker, Quality adapter),
**S-012**–**S-013** (ML CLI, dataset/artifact adapters), **S-014** (assistant
context), **S-015** (contract publishing), **S-016** (full verification).

## Architecture decisions

1. **Alembic converges two starting points.** `0001_baseline_schema` inspects the
   target database and either creates everything (empty) or renames legacy tables
   and adds missing columns (a pre-monorepo database). So `alembic upgrade head`
   is correct for a fresh clone *and* the existing development database, with no
   manual `alembic stamp`. Cost: these two revisions cannot run in offline
   `--sql` mode, and say so explicitly rather than failing obscurely.
2. **Revisions never import application models.** Each carries its own immutable
   copy of the schema and ID-prefix rules, so editing a model cannot retroactively
   change recorded history.
3. **The application never migrates.** Startup verifies the database is at head
   and logs loudly if not. Applying migrations is a separate, deliberate step
   (the `migrate` service).
4. **Unreachable database means live-but-not-ready, not a crash.** The process
   boots, `/api/health/live` returns 200, and `/api/health/ready` returns 503
   naming the failing dependency. Interrupted-session recovery is skipped while
   not ready.
5. **Crash recovery is runtime behaviour, not a migration.** Cancelling rows left
   `running` moved to `RecordingRepository.cancel_interrupted_sessions()`.
6. **The protocol module is pure.** `app/schemas/device_protocol.py` has no
   FastAPI, database, or app-state dependency, so the Sprint 4 MQTT adapter can
   reuse it unchanged for the same payload shapes.
7. **One origin.** Caddy terminates HTTPS/WSS and proxies `/api/*` and `/ws/*`,
   so the browser is same-origin: no CORS, no mixed content. `CORS_ORIGINS`
   defaults to empty in Compose.

## Public contract changes

- **Added** `GET /api/health/live` — liveness, checks nothing external.
- **Added** `GET /api/health/ready` — readiness, `200` or `503 not_ready` with a
  per-dependency breakdown.
- **Changed** `GET /api/health` — same v4 shape, but `services.database` now
  reflects a real query. A configured-but-unreachable database previously
  reported `connected`; it now reports `disconnected` and `status: degraded`.
- No change to any existing envelope, error code, or ID prefix.
- OpenAPI is still disabled (`openapi_url=None`). S-015 owns publishing it.

## Database migrations

| Revision | Purpose |
|---|---|
| `0001_baseline_schema` | Creates the 7 tables and 11 indexes, or adopts a legacy database |
| `0002_backfill_legacy_data` | One-time repairs: public IDs, recording names, orphan measurements, counters |

Downgrade policy: `0002` is intentionally a no-op (one-way data repair). `0001`
drops the whole schema and is **destructive** — back up first.

## Configuration changes

New in `.env.example`: `PLETHOS_SITE_ADDRESS`, `PLETHOS_ACME_EMAIL`,
`PLETHOS_HTTPS_PORT`, `PLETHOS_HTTP_PORT`, `POSTGRES_HOST_PORT`,
`API_HOST_PORT`, `QUALITY_MODEL_PATH`.

- `POSTGRES_PASSWORD` is now **required**; the stack refuses to start without it.
- `ALEMBIC_DATABASE_URL` overrides the migration target.
- `WEB_CONCURRENCY` / `UVICORN_WORKERS` / `GUNICORN_WORKERS` must be `1` or unset,
  or startup raises `WorkerCountError`.
- If you change `PLETHOS_HTTPS_PORT`, add the port to `PLETHOS_SITE_ADDRESS`
  (e.g. `localhost:8443`) so redirects and certificate names match.

## Security considerations

Closed:

- The device credential is held in a `SecretStr`; verified absent from `repr()`,
  `str()`, `model_dump()`, and `model_dump_json()`.
- Payloads over 8,192 bytes and batches over 64 samples are rejected, checkable
  before decoding untrusted input.
- PostgreSQL, the API, and Caddy's admin API publish no host port in production.
- Images run as non-root (uid 10001) with read-only source.
- Dependencies install with `--require-hashes`.
- No secret is committed; `.env` is ignored and excluded from build context.

**Open — the significant one:** `POST`/`GET` endpoints and both WebSocket
routes are still completely unauthenticated. During verification a device
connected over WSS and received a `hello_ack` while presenting no credential.
The v1 schema can *parse* a credential but nothing *checks* it, because storage
and comparison are S-006. Do not expose this stack to an untrusted network yet.

## Commits

```text
2e2511f build(server): pin python runtime and lock dependencies
dd23a77 feat(server): own schema evolution with alembic migrations
49228d7 feat(server): validate the versioned v1 device protocol
48f9744 docs(server): correct the stale 133.33 Hz device sample rate
682b2a0 feat(server): separate liveness from readiness with real checks
0eb4e3c feat(infra): add the core docker compose stack
```

## Junior task worktrees and patches

| Ticket | Worktree | Integration commit |
|---|---|---|
| S2-D001 (read-only discovery of Quality/LLM coupling) | `s2-d001-junior` (removed) | none — informed S-009/S-011/S-013 planning |
| S2-S007a (v1 protocol schema + tests) | `s2-s007a-junior` | `49228d7` |

Lead changes made during review of S2-S007a, worth knowing about:

- The junior's `Sample` model modelled only `index` and dropped `ir`/`red` as
  "unknown fields", which would have discarded the entire signal. Both are now
  required, and `sensor_temp_c` is retained.
- `measurement_id` was required on `log`; made optional, because a device also
  logs while connecting or idle and that diagnostic is the one that matters most.
- Added the reading-retention, short-`r`-alias, and empty-batch tests.

## Validation

```text
python3 -m pytest (server)                        -> 67 passed, 19 subtests
clean venv install of requirements/dev.txt
  with --require-hashes                           -> succeeded, 31 passed
alembic upgrade head, empty PostgreSQL 16         -> JSONB + BigInteger variants,
                                                     identity column, rerun a no-op
alembic upgrade head, legacy PostgreSQL 16        -> users/projects/project_users
                                                     renamed, quality_analyses added,
                                                     public IDs backfilled, owning
                                                     measurement synthesised, samples
                                                     preserved, sensor_confidence
                                                     dropped, counters recomputed
alembic upgrade/current/history/downgrade (CLI)   -> all worked
alembic upgrade head --sql (offline)              -> clear RuntimeError, as designed
docker build -f infra/docker/server/Dockerfile    -> built, uid=10001, source read-only
docker compose -f compose.yaml up -d              -> postgres healthy -> migrate
                                                     applied 0001+0002, exit 0 -> api
                                                     healthy via /api/health/ready
HTTPS via Caddy                                   -> ready 200, health 200 ok/connected,
                                                     root 503, HTTP 308, TLS 1.3
WSS via Caddy                                     -> browser stream OPEN; device hello
                                                     round-tripped to hello_ack
production port audit                             -> only caddy publishes
docker compose restart api                        -> returns to healthy, 8 tables intact
docker compose config (dev and production)        -> both validate
```

## Known risks

1. **No authentication anywhere.** See above. Highest-priority remaining work.
2. **`main.py` is still a 1192-line monolith** holding routes, serializers,
   envelope helpers, and module-level service singletons. Tests monkeypatch those
   singletons (`main_module.recording_repository`, `processing_service`,
   `ws_controller`, …) and import private helpers directly, so S-002 must also
   move the test harness onto `app.dependency_overrides`. Deferring S-002 means
   later tickets add code to the monolith that S-002 will have to move again.
3. **Server image is 721 MB**, dominated by numpy/scipy/scikit-learn. Acceptable
   but worth slimming before release.
4. **Sample ingestion is not idempotent** (S-008). `insert_samples` does a plain
   insert; `recordings_samples` has a unique constraint on
   `(recording_id, sample_index)`, so a duplicated batch raises rather than being
   absorbed. The v1 contract requires deduplication by
   `(device_id, measurement_id, batch_id)`, and nothing stores `batch_id` yet.
   This matters more under MQTT QoS 1 in Sprint 4.
5. **Quality is still hardcoded end to end** (S-009–S-011). The junior's
   discovery found `FEATURE_NAMES` order is an *implicit* contract between
   `quality.py` and the training script with no runtime check — reordering it
   silently invalidates every trained artifact. Record a feature schema in the
   model manifest when S-013 lands.
6. **Two independent morphology implementations** exist: `quality.py`'s private
   `extract_morphology` (recording ML path) and the shared `morphology.py`
   (live path). Worth consolidating during S-011.
7. **`_normalize_label` maps three classes** (`{0: low, 1: high, 2: high}`) while
   the training script is binary-only (`LABELS = ["low", "high"]`), and the model
   loader falls back to `classes_ = ["low","medium","high"]`. Probably vestigial;
   confirm before relying on it.
8. **Untested at 100 Hz.** The suite exercises 25 Hz and 50 Hz; devices emit
   100 Hz. No code hardcodes a rate — every function takes `fs` — but the
   `AppConfig` defaults (bandpass cutoffs, window seconds) were never validated
   at 100 Hz. Worth a targeted check.
9. **Local environment caveat, not a project defect.** This machine has no Docker
   Desktop; `colima` provides the daemon, `docker compose` (plugin) is broken by a
   dangling symlink so `docker-compose` standalone was used, and colima mounts
   only `$HOME` — so Caddy's bind mount fails from a `/private/tmp` worktree. The
   full-stack verification was run from a copy under `$HOME`. On a normal Docker
   install the documented commands work as written.

## Required next-sprint actions

Before Sprint 3 (client) can start, this branch still needs S-006, S-009–S-011,
S-014 and S-015 — the client consumes authentication, the generic analysis
contract, and the generated OpenAPI artifact, none of which exist yet.

Recommended order for the next server session:

1. **S-002** before anything that adds routes, so new work does not land in the
   monolith and need moving twice.
2. **S-006**, needing one project-owner decision first (below).
3. **S-008**, then **S-007** remainder.
4. **S-009**–**S-011**, then **S-012**–**S-013**, **S-014**, **S-015**.

### Decision needed from the project owner (blocks S-006)

Enforcing device authentication rejects any device that cannot present a
provisioned token. Sprint 1 firmware and the simulator both *send* a
`credential`, but no tokens are provisioned anywhere yet, and the existing
device tests connect without one. Choose:

- **(a) Enforce by default** — most secure; requires provisioning a token for the
  simulator and every test device before they can connect, and updating the
  device tests.
- **(b) Enforce behind `DEVICE_AUTH_REQUIRED`, default on, documented escape
  hatch for local development** — the Sprint 1 handoff explicitly contemplates a
  short legacy transition.
- **(c) Enforce only for non-simulated devices** — keeps `sim-` devices open;
  convenient, but the simulator is exactly what Sprint 4 uses to validate the
  MQTT cutover, so it would leave that path unauthenticated.

## Rollback notes

Every commit is independent and leaves the repository buildable; any can be
reverted on its own.

- Reverting `0eb4e3c` removes the Compose stack only; the application is
  unaffected.
- Reverting `682b2a0` restores the old, less truthful `/api/health` and removes
  the worker guard.
- Reverting `dd23a77` is the only consequential one: it restores startup DDL. A
  database already migrated by Alembic keeps its `alembic_version` table, which
  the restored startup path ignores harmlessly. Drop that table only if you
  intend to abandon Alembic.
- No commit rewrites history; nothing was force-pushed.
