# Python Backend

FastAPI backend for live PPG measurements, persisted recordings, and PPG quality-analysis feature extraction.

## Requirements

The production Python version is pinned to **3.13** (`.python-version`).

Dependencies are declared in layered `.in` files and resolved into pinned,
hash-verified lockfiles:

| Layer | Input | Lockfile | Contents |
|---|---|---|---|
| Runtime | `requirements/base.in` | `requirements/base.txt` | API and analysis runtime |
| Development | `requirements/dev.in` | `requirements/dev.txt` | Runtime plus test tooling |

Install the layer you need:

```bash
python3 -m pip install -r requirements/base.txt
```

`requirements.txt` remains as a thin pointer to the runtime lockfile.

To change a dependency, edit the `.in` file and recompile — never hand-edit a
lockfile:

```bash
uv pip compile requirements/base.in -o requirements/base.txt --universal --generate-hashes --python-version 3.13
```

Lockfiles are resolved `--universal`, so the same pins install on Linux and
Windows, and they carry hashes so `pip` verifies every downloaded artifact.

## Run

```bash
python3 -m uvicorn app.main:app --host 0.0.0.0 --port 8080
```

The backend loads `.env` automatically. `DATABASE_URL` or `POSTGRES_DSN` enables persistence.
If a full DSN is not set, the app can build one from `POSTGRES_HOST`, `POSTGRES_PORT`,
`POSTGRES_PASSWORD`, `POSTGRES_USER`, and `POSTGRES_DB`.
`CORS_ORIGINS` can override the comma-separated frontend origins allowed by the API;
by default `http://localhost:3000`, `http://127.0.0.1:3000`, `http://localhost:3080`, and
`http://127.0.0.1:3080` are allowed.

## Database migrations

The application does **not** create or alter tables. Schema evolution belongs to
Alembic and runs as a deliberate step before the API starts:

```bash
python3 -m alembic upgrade head
```

Startup only verifies that the database is already at head, logs an error if it
is not, and cancels measurements or recordings left `running` by a previous
crash. Serving a database that is behind the migrations is treated as an
operator error, not something the app silently repairs.

The URL is resolved in this order: `-x url=...`, `ALEMBIC_DATABASE_URL`, then the
application's own `DATABASE_URL` / `POSTGRES_*` settings — so migrations and the
API always target the same database.

| Command | Effect |
|---|---|
| `alembic upgrade head` | Apply every pending migration |
| `alembic current` | Show the applied revision |
| `alembic history` | List revisions |
| `alembic downgrade -1` | Step back one revision |

### Upgrade and downgrade policy

`0001_baseline_schema` captures the schema the pre-Alembic application used to
build on every boot. It converges two starting points onto one schema:

- an **empty** database — every table is created;
- a **legacy** database carrying the pre-Alembic schema — `users`, `projects`,
  and `project_users` are renamed to `participants`, `studies`, and
  `study_participants`, missing columns are added, and removed columns dropped.

So `alembic upgrade head` is correct for a fresh clone *and* for the existing
development database, with no manual `alembic stamp`. Every statement is guarded
by an inspection, so re-running is a no-op.

`0002_backfill_legacy_data` performs the one-time data repairs that startup used
to redo on every boot: prefixed public IDs, names for unnamed recordings, an
owning measurement for pre-measurement recordings, and recomputed
recordings-per-owner counters.

Downgrade policy:

- `0002` has an intentionally empty downgrade — the repairs are one-way, and the
  pre-repair state (NULL public IDs, orphaned recordings) is not worth restoring.
- `0001` downgrades by dropping the entire schema. It is **destructive**; back up
  before running it against a database holding recordings.

Because the baseline inspects the live schema to decide what to create, these two
revisions cannot run in offline `--sql` mode and say so explicitly. Revisions
authored after the baseline are offline-capable as usual.

## Health, readiness, and the one-worker rule

Three endpoints, answering different questions:

| Endpoint | Question | Checks | Failure |
|---|---|---|---|
| `GET /api/health/live` | Is the process running? | nothing external | never fails while serving |
| `GET /api/health/ready` | Can it serve correctly now? | real `SELECT 1`, schema at head | `503 not_ready` |
| `GET /api/health` | Aggregate, v4 shape | same as readiness | `200` with `status: degraded` |

Liveness deliberately checks nothing: a database outage must not cause an
orchestrator to kill an otherwise healthy process. Readiness is the probe that
gates traffic.

An unreachable or unmigrated database does **not** prevent startup. The process
comes up live but not ready, and `/api/health/ready` names the failing
dependency, so an operator fixes the dependency instead of also fighting a crash
loop. Interrupted-session recovery is skipped while not ready.

`GET /api/health` previously reported the database as `connected` whenever
`DATABASE_URL` was merely set, so it stayed green against a stopped database. It
now runs the same real check as readiness.

### Exactly one API worker

The API must run with **one** worker. Device connections, measurement sessions,
sample buffers, and browser subscribers are process-local, so a second worker
would own a different half of that state — a device could be connected to one
worker while the request starting its measurement lands on another.

This is enforced, not just documented: startup raises `WorkerCountError` if
`WEB_CONCURRENCY`, `UVICORN_WORKERS`, or `GUNICORN_WORKERS` is set to anything
other than `1`. The limit lifts only once live state moves out of the process.

### Recovery of interrupted measurements

Because live state is process-local, a measurement or recording row still marked
`running` after a restart has no owning process and can never complete. On
startup — once the schema is confirmed at head — such rows are marked
`cancelled` with the elapsed duration they reached. That frees the device for a
new measurement and stops the row from being reported as active forever.

## API v4.2

Public IDs are prefixed:

```text
dev_ for devices
mes_ for measurements
rec_ for recordings
par_ for participants
std_ for studies
qlt_ for quality analyses
```

All HTTP responses use the v4 envelope:

```json
{
  "data": {},
  "$meta": {
    "status": "success",
    "timestamp": "2026-04-28T11:51:20.778832Z"
  }
}
```

Errors use explicit codes:

```json
{
  "data": null,
  "$meta": {
    "status": "error",
    "timestamp": "2026-04-28T11:51:20.778832Z",
    "error": {
      "http_status": 404,
      "code": "recording_not_found",
      "message": "Recording not found"
    }
  }
}
```

Study-participant assignment errors include `assignment_not_found` and `study_participant_already_exists`.

## HTTP Endpoints

```text
GET    /api/health

GET    /api/devices?connection_status=connected|disconnected&limit=100&offset=0
GET    /api/devices/{device_id}/metrics
DELETE /api/devices/{device_id}

POST   /api/devices/{device_id}/measurements
POST   /api/measurements/{measurement_id}/stop
POST   /api/measurements/{measurement_id}/recording
POST   /api/measurements/{measurement_id}/recording/stop

GET    /api/recordings?device_id=&date_from=&date_to=&participant_id=&study_id=&status=&limit=100&offset=0
GET    /api/recordings/{recording_id}
DELETE /api/recordings/{recording_id}
GET    /api/recordings/{recording_id}/samples?limit=1000&offset=0
GET    /api/recordings/{recording_id}/export?format=json|csv
POST   /api/recordings/{recording_id}/quality-analysis
GET    /api/recordings/{recording_id}/quality-analysis

GET    /api/assistant/status
POST   /api/assistant/chat

POST   /api/participants
GET    /api/participants?study_id=&limit=100&offset=0
GET    /api/participants/{participant_id}
PATCH  /api/participants/{participant_id}
DELETE /api/participants/{participant_id}

POST   /api/studies
GET    /api/studies?limit=100&offset=0
GET    /api/studies/{study_id}
PATCH  /api/studies/{study_id}
DELETE /api/studies/{study_id}
POST   /api/studies/{study_id}/participants
DELETE /api/studies/{study_id}/participants/{participant_id}
```

Measurement start body:

```json
{
  "participant_id": "par_1",
  "study_id": "std_1"
}
```

Recording start body:

```json
{
  "duration_s": 15
}
```

Study participant assignment body:

```json
{
  "participant_id": "par_1"
}
```

## WebSocket Protocol

Device channel:

```text
ws://localhost:8080/ws/devices/{device_id}
```

Client live stream:

```text
ws://localhost:8080/ws/measurements/{measurement_id}/stream
```

Device hello:

```json
{
  "type": "hello",
  "device_id": "dev_sim-device-001",
  "is_simulated": true
}
```

Device samples:

```json
{
  "type": "samples",
  "device_id": "dev_sim-device-001",
  "measurement_id": "mes_6883cd24-dc32-404a-9081-60d49e376a0b",
  "recording_id": "rec_23424545665345",
  "sample_rate_hz": 25.0,
  "sensor_temp_c": 30.9,
  "samples": [
    {
      "index": 100,
      "ir": 84231,
      "red": 53211
    }
  ]
}
```

Client stream updates:

```json
{
  "type": "measurement_update",
  "measurement_id": "mes_6883cd24-dc32-404a-9081-60d49e376a0b",
  "device_id": "dev_sim-device-001",
  "active_recording_id": "rec_23424545665345",
  "timestamp": "2026-04-28T11:51:20.778832Z",
  "sample_rate_hz": 25.0,
  "sensor_temp_c": 30.9,
  "samples": [
    {
      "index": 100,
      "t_ms": 4000.0,
      "ir": 84231,
      "red": 53211,
      "ir_filtered": 0.031,
      "red_filtered": 0.024
    }
  ],
  "metrics": {
    "bpm": 88.2,
    "spo2": 95.1,
    "ratio": 0.5977,
    "signal_readiness": {
      "level": "high",
      "score": 0.91,
      "is_recording_ready": true,
      "reason": null
    }
  }
}
```

## Quality Analysis

`POST /api/recordings/{recording_id}/quality-analysis` requires `QUALITY_MODEL_PATH`.
Supported model files:

- `.pkl` via `pickle`
- `.joblib` via `joblib`
- `.json` threshold model for local deterministic testing

The model receives features in this order:

```text
peak_count, valid_peak_count, ibi_cv, perfusion_index, template_corr_mean,
relative_power_hr_band, baseline_drift, flatline_ratio, saturation_ratio, outlier_ratio
```

Model metadata defaults to:

```text
QUALITY_MODEL_TYPE=random_forest
QUALITY_MODEL_NAME=ppg_quality_rf
QUALITY_MODEL_VERSION=1.0.0
```

## Assistant Chat

`POST /api/assistant/chat` asks an LLM-backed data assistant a question about a
completed recording. The assistant can only use the recording row and the
stored ML `quality-analysis`; it does not receive raw samples.

Request:

```json
{
  "recording_id": "rec_23424545665345",
  "message": "Why is this recording quality low?"
}
```

Response:

```json
{
  "data": {
    "assistant": {
      "recording_id": "rec_23424545665345",
      "quality_analysis_id": "qlt_6883cd24-dc32-404a-9081-60d49e376a0b",
      "timestamp": "2026-05-03T12:00:00Z",
      "provider": {
        "type": "ollama",
        "model": "llama3.1:8b"
      },
      "message": "The ML quality analysis indicates..."
    }
  }
}
```

Required preconditions:

- the database is configured;
- the recording exists and has `status=completed`;
- `POST /api/recordings/{recording_id}/quality-analysis` has already completed.

Assistant configuration:

```text
LLM_ENABLED=true
LLM_PROVIDER=openai_compatible
LLM_BASE_URL=https://api.openai.com/v1
LLM_API_KEY=...
LLM_MODEL=gpt-4.1-mini
LLM_TIMEOUT_SECONDS=30
LLM_TEMPERATURE=0.2
LLM_MAX_TOKENS=500
```

For local Ollama:

```text
LLM_ENABLED=true
LLM_PROVIDER=ollama
LLM_BASE_URL=http://localhost:11434
LLM_MODEL=llama3.1:8b
```

### Train BUT-PPG Random Forest

The repository can train a reproducible Random Forest quality model from the
local Brno University of Technology Smartphone PPG database:

```bash
python3 scripts/train_but_ppg_quality_rf.py \
  --dataset brno-university-of-technology-smartphone-ppg-database-but-ppg-2.0.0 \
  --output models/ppg_quality_rf.joblib
```

The script maps BUT-PPG `Quality=0` to `low` and `Quality=1` to `high`, extracts
the same features used by the API, evaluates with grouped subject splits, and
writes a metrics report next to the model:

```text
models/ppg_quality_rf.metrics.json
```

Use the generated model at runtime with:

```bash
QUALITY_MODEL_PATH=models/ppg_quality_rf.joblib
```

BUT-PPG is RGB smartphone PPG, while this study records MAX30105 IR/Red PPG.
The generated model is a useful first-pass quality estimator, but production
accuracy should be calibrated with recordings from the target hardware.

## Test

Install the development layer, then run the suite:

```bash
python3 -m pip install -r requirements/dev.txt
```

```bash
python3 -m pytest
```

The suite is plain `unittest`, so `python3 -m unittest discover tests` also
works; `pytest` is only the runner.
