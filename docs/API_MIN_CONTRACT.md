# Backend — API Min Contract

**Версія:** 0.4.2 · **Базовий URL:** `http://localhost:8080`

## Сервіс

| Метод | Шлях | Query / Body | `data` |
|-------|------|--------------|--------|
| GET | `/api/health` | — | `{ status, timestamp, services: { api, database, websocket } }` |

## Пристрої

| Метод | Шлях | Query / Body | `data` |
|-------|------|--------------|--------|
| GET | `/api/devices` | `connection_status?`, `limit`, `offset` | `{ devices[], limit, offset }` |
| GET | `/api/devices/{device_id}/metrics` | — | `{ metrics }` |
| DELETE | `/api/devices/{device_id}` | — | `{ deleted, device_id, stopped_measurement_id, stop_command_sent, disconnected }` |

## Вимірювання

| Метод | Шлях | Query / Body | `data` |
|-------|------|--------------|--------|
| POST | `/api/devices/{device_id}/measurements` | Body: `{ participant_id, study_id }` | `{ measurement }` |
| POST | `/api/measurements/{measurement_id}/stop` | — | `{ measurement }` |
| GET | `/api/measurements` | `device_id?`, `date_from?`, `date_to?`, `participant_id?`, `study_id?`, `status?`, `limit`, `offset` | `{ measurements[], limit, offset }` |
| GET | `/api/measurements/{measurement_id}` | `device_id?`, `date_from?`, `date_to?`, `participant_id?`, `study_id?`, `status?` | `{ measurement }` |

## Записи

| Метод | Шлях | Query / Body | `data` |
|-------|------|--------------|--------|
| POST | `/api/measurements/{measurement_id}/recording` | Body: `{ duration_s, name?, use_for_ml_training? }` | `{ recording }` |
| POST | `/api/measurements/{measurement_id}/recording/stop` | — | `{ recording }` |
| GET | `/api/recordings` | `device_id?`, `date_from?`, `date_to?`, `participant_id?`, `study_id?`, `status?`, `limit`, `offset` | `{ recordings[], limit, offset }` |
| GET | `/api/recordings/export` | `device_id?`, `date_from?`, `date_to?`, `participant_id?`, `study_id?`, `status?`, `format=csv` | CSV-файл (без envelope) |
| GET | `/api/recordings/{recording_id}` | — | `{ recording }` |
| DELETE | `/api/recordings/{recording_id}` | — | `{ deleted, recording_id, stop_command_sent }` |
| GET | `/api/recordings/{recording_id}/samples` | `limit`, `offset` | `{ recording_id, samples[], limit, offset }` |
| GET | `/api/recordings/{recording_id}/export` | `format`: `json` \| `csv` | `{ recording, samples[] }` або CSV-файл |

## Аналіз якості

| Метод | Шлях | Query / Body | `data` |
|-------|------|--------------|--------|
| POST | `/api/recordings/{recording_id}/quality-analysis` | — | `{ quality_analysis }` |
| GET | `/api/recordings/{recording_id}/quality-analysis` | — | `{ quality_analysis }` |

## Асистент

| Метод | Шлях | Query / Body | `data` |
|-------|------|--------------|--------|
| GET | `/api/assistant/status` | — | `{ assistant }` |
| POST | `/api/assistant/chat` | Body: `{ recording_id, message, conversation_history? }` | `{ assistant }` |

## Учасники

| Метод | Шлях | Query / Body | `data` |
|-------|------|--------------|--------|
| POST | `/api/participants` | Body: `{ name, age?, sex? }` | `{ participant }` |
| GET | `/api/participants` | `study_id?`, `limit`, `offset` | `{ participants[], limit, offset }` |
| GET | `/api/participants/{participant_id}` | — | `{ participant }` |
| PATCH | `/api/participants/{participant_id}` | Body: `{ name?, age?, sex? }` | `{ participant }` |
| DELETE | `/api/participants/{participant_id}` | — | `{ deleted, participant_id }` |

## Дослідження

| Метод | Шлях | Query / Body | `data` |
|-------|------|--------------|--------|
| POST | `/api/studies` | Body: `{ title, description? }` | `{ study }` |
| GET | `/api/studies` | `limit`, `offset` | `{ studies[], limit, offset }` |
| GET | `/api/studies/{study_id}` | — | `{ study }` |
| PATCH | `/api/studies/{study_id}` | Body: `{ title?, description? }` | `{ study }` |
| DELETE | `/api/studies/{study_id}` | — | `{ deleted, study_id }` |
| POST | `/api/studies/{study_id}/participants` | Body: `{ participant_id }` | `{ assignment }` |
| DELETE | `/api/studies/{study_id}/participants/{participant_id}` | — | `{ deleted, study_id, participant_id }` |

## WebSocket

| Метод | Шлях | Query / Body | `data` |
|-------|------|--------------|--------|
| WS | `/ws/devices/{device_id}` | In: `hello`, `samples`, `start_ack`, `stop_ack`, `finished` | Out: `hello_ack`, `start`, `stop`, `{ ok, metrics?, error? }` |
| WS | `/ws/measurements/{measurement_id}/stream` | — | Out: `measurement_update`, `recording_started`, `recording_stopped`, `measurement_finished` |
