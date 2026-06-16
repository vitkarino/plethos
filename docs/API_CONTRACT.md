# Backend — API Contract

**Версія:** 0.4.2 (API v4.2)  
**Базовий URL:** `http://localhost:8080` (порт з `WS_PORT` / uvicorn)

Усі HTTP-відповіді використовують v4 envelope. Публічні ідентифікатори мають префікси:


| Префікс | Сутність      |
| ------- | ------------- |
| `dev_`  | пристрій      |
| `mes_`  | вимірювання   |
| `rec_`  | запис         |
| `par_`  | учасник       |
| `std_`  | дослідження   |
| `qlt_`  | аналіз якості |


---

## Загальний формат відповіді

### Успіх

```json
{
  "data": {},
  "$meta": {
    "status": "success",
    "timestamp": "2026-04-28T11:51:20.778832Z"
  }
}
```

### Помилка

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


| Поле              | Тип                   | Опис                                               |
| ----------------- | --------------------- | -------------------------------------------------- |
| `data`            | `object | null`       | Корисне навантаження; при помилці — `null`         |
| `$meta.status`    | `"success" | "error"` | Статус обробки                                     |
| `$meta.timestamp` | `string`              | ISO 8601 UTC (`Z`)                                 |
| `$meta.error`     | `object`              | Лише при помилці: `{ http_status, code, message }` |


---

## HTTP Endpoints

### Сервіс


| Метод | Шлях          | Query / Body | `data` (успіх)                                                  | HTTP | Коди помилок |
| ----- | ------------- | ------------ | --------------------------------------------------------------- | ---- | ------------ |
| GET   | `/api/health` | —            | `{ status, timestamp, services: { api, database, websocket } }` | 200  | —            |


`status`: `ok` (БД підключена) або `degraded` (БД відсутня).

---

### Пристрої


| Метод  | Шлях                               | Query / Body                                                                                     | `data` (успіх)                                                                    | HTTP | Коди помилок           |
| ------ | ---------------------------------- | ------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------- | ---- | ---------------------- |
| GET    | `/api/devices`                     | `connection_status?`: `connected` | `disconnected`; `limit` (1–1000, default 100); `offset` (≥0) | `{ devices[], limit, offset }`                                                    | 200  | —                      |
| GET    | `/api/devices/{device_id}/metrics` | —                                                                                                | `{ metrics }`                                                                     | 200  | `404 device_not_found` |
| DELETE | `/api/devices/{device_id}`         | —                                                                                                | `{ deleted, device_id, stopped_measurement_id, stop_command_sent, disconnected }` | 200  | `404 device_not_found` |


#### Device


| Поле                    | Тип                                | Опис                  |
| ----------------------- | ---------------------------------- | --------------------- |
| `id`                    | `string`                           | `dev_*`               |
| `is_simulated`          | `boolean`                          | Симульований пристрій |
| `connection_status`     | `connected` | `disconnected`       | WebSocket-стан        |
| `status`                | `idle` | `measuring` | `recording` | Поточна активність    |
| `active_measurement_id` | `string?`                          | `mes_*`               |
| `active_recording_id`   | `string?`                          | `rec_*`               |


#### Metrics


| Поле                                  | Тип                                                                                      |
| ------------------------------------- | ---------------------------------------------------------------------------------------- |
| `device_id`                           | `string`                                                                                 |
| `timestamp`                           | `string`                                                                                 |
| `sample_rate_hz`                      | `number`                                                                                 |
| `sensor_temp_c`                       | `number?`                                                                                |
| `bpm`, `spo2`, `ratio`                | `number?`                                                                                |
| `signal_readiness.level`              | `high` | `medium` | `low`                                                                |
| `signal_readiness.score`              | `number` (0–1)                                                                           |
| `signal_readiness.is_recording_ready` | `boolean`                                                                                |
| `signal_readiness.reason`             | `saturation` | `flatline` | `low_perfusion` | `irregular_rhythm` | `high_noise` | `null` |


---

### Вимірювання


| Метод | Шлях                                      | Query / Body                                                                                                                                           | `data` (успіх)                      | HTTP | Коди помилок                                                                                                                             |
| ----- | ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------- | ---- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| POST  | `/api/devices/{device_id}/measurements`   | Body: `{ participant_id, study_id }`                                                                                                                   | `{ measurement }`                   | 201  | `404 participant_not_found`, `404 study_not_found`, `409 measurement_already_running`, `409 device_disconnected`, `400 validation_error` |
| POST  | `/api/measurements/{measurement_id}/stop` | —                                                                                                                                                      | `{ measurement }`                   | 200  | `404 measurement_not_found`, `409 invalid_status_transition`                                                                             |
| GET   | `/api/measurements`                       | `device_id?`, `date_from?`, `date_to?`, `participant_id?`, `study_id?`, `status?`: `running` | `completed` | `failed` | `cancelled`, `limit`, `offset` | `{ measurements[], limit, offset }` | 200  | `503 database_unavailable`                                                                                                               |
| GET   | `/api/measurements/{measurement_id}`      | Ті самі фільтри (без пагінації)                                                                                                                        | `{ measurement }`                   | 200  | `404 measurement_not_found`, `503 database_unavailable`                                                                                  |


**Body старту вимірювання:**

```json
{
  "participant_id": "par_1",
  "study_id": "std_1"
}
```

`date_from` / `date_to`: `YYYY-MM-DD` або ISO datetime.

#### Measurement


| Поле                                                      | Тип                                              |
| --------------------------------------------------------- | ------------------------------------------------ |
| `id`                                                      | `mes_*`                                          |
| `is_simulated`                                            | `boolean`                                        |
| `participant_id`, `study_id`                              | `string`                                         |
| `active_recording_id`                                     | `string?`                                        |
| `device_id`                                               | `string`                                         |
| `time.started_at`, `time.finished_at`                     | `string?`                                        |
| `time.duration_ms`                                        | `number?`                                        |
| `status`                                                  | `running` | `completed` | `failed` | `cancelled` |
| `channels`                                                | `["ir", "red"]`                                  |
| `sample_rate_hz`, `sensor_temp_c`, `bpm`, `spo2`, `ratio` | `number?`                                        |


---

### Записи


| Метод  | Шлях                                                | Query / Body                                                                                         | `data` (успіх)                                 | HTTP | Коди помилок                                                                                                              |
| ------ | --------------------------------------------------- | ---------------------------------------------------------------------------------------------------- | ---------------------------------------------- | ---- | ------------------------------------------------------------------------------------------------------------------------- |
| POST   | `/api/measurements/{measurement_id}/recording`      | Body: `{ duration_s, name?, use_for_ml_training? }`                                                  | `{ recording }`                                | 201  | `404 measurement_not_found`, `409 recording_already_running`, `409 invalid_status_transition`, `503 database_unavailable` |
| POST   | `/api/measurements/{measurement_id}/recording/stop` | —                                                                                                    | `{ recording }`                                | 200  | `404 measurement_not_found`, `409 invalid_status_transition`, `503 database_unavailable`                                  |
| GET    | `/api/recordings`                                   | `device_id?`, `date_from?`, `date_to?`, `participant_id?`, `study_id?`, `status?`, `limit`, `offset` | `{ recordings[], limit, offset }`              | 200  | `503 database_unavailable`                                                                                                |
| GET    | `/api/recordings/export`                            | Ті самі фільтри; `format=csv`                                                                        | CSV-файл `recordings.csv` (без envelope)       | 200  | `503 database_unavailable`                                                                                                |
| GET    | `/api/recordings/{recording_id}`                    | —                                                                                                    | `{ recording }`                                | 200  | `404 recording_not_found`, `503 database_unavailable`                                                                     |
| DELETE | `/api/recordings/{recording_id}`                    | —                                                                                                    | `{ deleted, recording_id, stop_command_sent }` | 200  | `404 recording_not_found`, `503 database_unavailable`                                                                     |
| GET    | `/api/recordings/{recording_id}/samples`            | `limit` (1–10000, default 1000), `offset`                                                            | `{ recording_id, samples[], limit, offset }`   | 200  | `404 recording_not_found`, `503 database_unavailable`                                                                     |
| GET    | `/api/recordings/{recording_id}/export`             | `format`: `json` (default) | `csv`                                                                   | JSON: `{ recording, samples[] }`; CSV: файл    | 200  | `404 recording_not_found`, `503 database_unavailable`                                                                     |


**Body старту запису:**

```json
{
  "duration_s": 15,
  "name": "optional-name",
  "use_for_ml_training": false
}
```


| Поле                  | Обмеження               |
| --------------------- | ----------------------- |
| `duration_s`          | `> 0` (обов'язкове)     |
| `name`                | опційне, `min_length=1` |
| `use_for_ml_training` | default `false`         |


#### Recording


| Поле                                                      | Тип                                              |
| --------------------------------------------------------- | ------------------------------------------------ |
| `id`, `name`                                              | `rec_*`                                          |
| `measurement_id`                                          | `mes_*`                                          |
| `quality_analysis_id`                                     | `qlt_*?`                                         |
| `use_for_ml_training`                                     | `boolean`                                        |
| `status`                                                  | `running` | `completed` | `failed` | `cancelled` |
| `time.started_at`, `time.finished_at`, `time.duration_ms` | —                                                |
| `sample_range.start_index`, `sample_range.end_index`      | `number?`                                        |
| `samples_count`                                           | `number?`                                        |
| `device_id`, `participant_id`, `study_id`                 | `string`                                         |
| `sample_rate_hz`, `sensor_temp_c`, `bpm`, `spo2`, `ratio` | `number?`                                        |


#### Sample


| Поле                          | Тип                      |
| ----------------------------- | ------------------------ |
| `index`                       | `number`                 |
| `t_ms`                        | `number?`                |
| `ir`, `red`                   | `number?` (сирий сигнал) |
| `ir_filtered`, `red_filtered` | `number?`                |


---

### Аналіз якості


| Метод | Шлях                                              | Query / Body | `data` (успіх)         | HTTP | Коди помилок                                                                                                            |
| ----- | ------------------------------------------------- | ------------ | ---------------------- | ---- | ----------------------------------------------------------------------------------------------------------------------- |
| POST  | `/api/recordings/{recording_id}/quality-analysis` | —            | `{ quality_analysis }` | 201  | `404 recording_not_found`, `409 invalid_status_transition`, `503 quality_model_unavailable`, `503 database_unavailable` |
| GET   | `/api/recordings/{recording_id}/quality-analysis` | —            | `{ quality_analysis }` | 200  | `404 recording_not_found`, `404 quality_analysis_not_found`, `503 database_unavailable`                                 |


Потрібна змінна `QUALITY_MODEL_PATH` (`.pkl`, `.joblib`, `.json`).

#### Quality Analysis


| Поле                    | Тип                       |
| ----------------------- | ------------------------- |
| `id`                    | `qlt_*`                   |
| `recording_id`          | `rec_*`                   |
| `timestamp`             | `string`                  |
| `model`                 | `{ type, name, version }` |
| `quality_result.level`  | `low` | `medium` | `high` |
| `quality_result.score`  | `number`                  |
| `quality_result.reason` | `string?`                 |
| `features`              | див. нижче                |


**Features (порядок для ML-моделі):**

```text
peak_count, valid_peak_count, ibi_cv, perfusion_index, template_corr_mean,
relative_power_hr_band, baseline_drift, flatline_ratio, saturation_ratio, outlier_ratio
```

---

### Асистент (LLM)


| Метод | Шлях                    | Query / Body     | `data` (успіх)  | HTTP | Коди помилок                                                                                                                                                              |
| ----- | ----------------------- | ---------------- | --------------- | ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| GET   | `/api/assistant/status` | —                | `{ assistant }` | 200  | —                                                                                                                                                                         |
| POST  | `/api/assistant/chat`   | Body: див. нижче | `{ assistant }` | 200  | `404 recording_not_found`, `404 quality_analysis_not_found`, `409 invalid_status_transition`, `502 llm_provider_error`, `503 llm_unavailable`, `503 database_unavailable` |


**Умови для chat:**

- БД налаштована
- Запис існує і має `status=completed`
- `POST .../quality-analysis` вже виконано
- LLM увімкнено (`LLM_ENABLED=true`)

**Запит:**

```json
{
  "recording_id": "rec_23424545665345",
  "message": "Why is this recording quality low?",
  "conversation_history": [
    { "role": "user", "message": "..." },
    { "role": "assistant", "message": "..." }
  ]
}
```


| Поле                   | Обмеження                                        |
| ---------------------- | ------------------------------------------------ |
| `recording_id`         | обов'язкове                                      |
| `message`              | 1–2000 символів                                  |
| `conversation_history` | max 20 повідомлень; `role`: `user` | `assistant` |


**Відповідь (`data.assistant`):**


| Поле                  | Тип               |
| --------------------- | ----------------- |
| `recording_id`        | `rec_`*           |
| `quality_analysis_id` | `qlt_*`           |
| `timestamp`           | `string`          |
| `provider`            | `{ type, model }` |
| `message`             | `string`          |


**Status (`data.assistant`):**


| Поле               | Тип       |
| ------------------ | --------- |
| `enabled`          | `boolean` |
| `provider`         | `string`  |
| `base_url`         | `string?` |
| `model`            | `string`  |
| `reasoning_effort` | `string?` |


---

### Учасники


| Метод  | Шлях                                 | Query / Body                   | `data` (успіх)                      | HTTP | Коди помилок                                                                    |
| ------ | ------------------------------------ | ------------------------------ | ----------------------------------- | ---- | ------------------------------------------------------------------------------- |
| POST   | `/api/participants`                  | Body: `{ name, age?, sex? }`   | `{ participant }`                   | 201  | `503 database_unavailable`                                                      |
| GET    | `/api/participants`                  | `study_id?`, `limit`, `offset` | `{ participants[], limit, offset }` | 200  | `404 study_not_found`, `503 database_unavailable`                               |
| GET    | `/api/participants/{participant_id}` | —                              | `{ participant }`                   | 200  | `404 participant_not_found`, `503 database_unavailable`                         |
| PATCH  | `/api/participants/{participant_id}` | Body: `{ name?, age?, sex? }`  | `{ participant }`                   | 200  | `404 participant_not_found`, `422 validation_error`, `503 database_unavailable` |
| DELETE | `/api/participants/{participant_id}` | —                              | `{ deleted, participant_id }`       | 200  | `404 participant_not_found`, `503 database_unavailable`                         |


**Create body:**

```json
{
  "name": "Іван",
  "age": 25,
  "sex": "male"
}
```

`sex`: `male`  `female`  `other`

#### Participant


| Поле               | Тип                                  |
| ------------------ | ------------------------------------ |
| `id`               | `par_*`                              |
| `name`             | `string`                             |
| `age`              | `number?`                            |
| `sex`              | `male` | `female` | `other` | `null` |
| `studies_count`    | `number`                             |
| `recordings_count` | `number`                             |
| `created_at`       | `string`                             |


---

### Дослідження


| Метод  | Шлях                                                    | Query / Body                     | `data` (успіх)                          | HTTP | Коди помилок                                                                                                           |
| ------ | ------------------------------------------------------- | -------------------------------- | --------------------------------------- | ---- | ---------------------------------------------------------------------------------------------------------------------- |
| POST   | `/api/studies`                                          | Body: `{ title, description? }`  | `{ study }`                             | 201  | `503 database_unavailable`                                                                                             |
| GET    | `/api/studies`                                          | `limit`, `offset`                | `{ studies[], limit, offset }`          | 200  | `503 database_unavailable`                                                                                             |
| GET    | `/api/studies/{study_id}`                               | —                                | `{ study }`                             | 200  | `404 study_not_found`, `503 database_unavailable`                                                                      |
| PATCH  | `/api/studies/{study_id}`                               | Body: `{ title?, description? }` | `{ study }`                             | 200  | `404 study_not_found`, `422 validation_error`, `503 database_unavailable`                                              |
| DELETE | `/api/studies/{study_id}`                               | —                                | `{ deleted, study_id }`                 | 200  | `404 study_not_found`, `503 database_unavailable`                                                                      |
| POST   | `/api/studies/{study_id}/participants`                  | Body: `{ participant_id }`       | `{ assignment }`                        | 201  | `404 study_not_found`, `404 participant_not_found`, `409 study_participant_already_exists`, `503 database_unavailable` |
| DELETE | `/api/studies/{study_id}/participants/{participant_id}` | —                                | `{ deleted, study_id, participant_id }` | 200  | `404 study_not_found`, `404 participant_not_found`, `404 assignment_not_found`, `503 database_unavailable`             |


**Assignment body:**

```json
{
  "participant_id": "par_1"
}
```

#### Study


| Поле                 | Тип       |
| -------------------- | --------- |
| `id`                 | `std_*`   |
| `title`              | `string`  |
| `description`        | `string?` |
| `participants_count` | `number`  |
| `recordings_count`   | `number`  |
| `created_at`         | `string`  |


#### Assignment


| Поле             | Тип      |
| ---------------- | -------- |
| `study_id`       | `std_*`  |
| `participant_id` | `par_*`  |
| `assigned_at`    | `string` |


---

## WebSocket


| Канал      | URL                                                 | Роль                              |
| ---------- | --------------------------------------------------- | --------------------------------- |
| Пристрій   | `ws://host/ws/devices/{device_id}`                  | ESP32 / симулятор надсилає семпли |
| Live-стрім | `ws://host/ws/measurements/{measurement_id}/stream` | Клієнт отримує live-оновлення     |


### Пристрій → сервер


| `type`      | Поля                                                                                                               | Опис                          |
| ----------- | ------------------------------------------------------------------------------------------------------------------ | ----------------------------- |
| `hello`     | `device_id`, `is_simulated?`                                                                                       | Реєстрація з'єднання          |
| `samples`   | `device_id`, `measurement_id`, `recording_id?`, `sample_rate_hz`, `sensor_temp_c`, `samples: [{ index, ir, red }]` | Пакет PPG-даних               |
| `start_ack` | `measurement_id`                                                                                                   | Підтвердження команди `start` |
| `stop_ack`  | —                                                                                                                  | Підтвердження `stop`          |
| `finished`  | `measurement_id?`                                                                                                  | Завершення на пристрої        |
| `log`       | —                                                                                                                  | Ігнорується                   |


**Приклад `hello`:**

```json
{
  "type": "hello",
  "device_id": "dev_sim-device-001",
  "is_simulated": true
}
```

**Приклад `samples`:**

```json
{
  "type": "samples",
  "device_id": "dev_sim-device-001",
  "measurement_id": "mes_6883cd24-dc32-404a-9081-60d49e376a0b",
  "recording_id": "rec_23424545665345",
  "sample_rate_hz": 25.0,
  "sensor_temp_c": 30.9,
  "samples": [
    { "index": 100, "ir": 84231, "red": 53211 }
  ]
}
```

### Сервер → пристрій


| `type`      | Поля                                                                       |
| ----------- | -------------------------------------------------------------------------- |
| `hello_ack` | `device_id`, `connection_status`, `timestamp`                              |
| `start`     | `measurement_id`                                                           |
| `stop`      | —                                                                          |
| ACK         | `{ ok, metrics?, error? }` — після обробки семплів (при помилці валідації) |


### Сервер → клієнт (stream)


| `type`                 | Коли                   | Ключові поля                                                                                                                 |
| ---------------------- | ---------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `measurement_update`   | Кожен пакет семплів    | `measurement_id`, `device_id`, `active_recording_id`, `timestamp`, `sample_rate_hz`, `sensor_temp_c`, `samples[]`, `metrics` |
| `recording_started`    | Старт запису           | `recording_id`, `sample_range`, `timestamp`                                                                                  |
| `recording_stopped`    | Стоп запису            | `recording_id`, `sample_range`, `samples_count`, `timestamp`                                                                 |
| `measurement_finished` | Завершення вимірювання | `measurement_id`, `status`, `timestamp`                                                                                      |


**Приклад `measurement_update`:**

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

---

## Коди помилок


| HTTP | `code`                             | Опис                                  |
| ---- | ---------------------------------- | ------------------------------------- |
| 400  | `validation_error`                 | Невалідні дані або формат дат         |
| 404  | `device_not_found`                 | Пристрій або метрики не знайдено      |
| 404  | `measurement_not_found`            | Вимірювання не знайдено               |
| 404  | `recording_not_found`              | Запис не знайдено                     |
| 404  | `participant_not_found`            | Учасник не знайдено                   |
| 404  | `study_not_found`                  | Дослідження не знайдено               |
| 404  | `assignment_not_found`             | Зв'язок study↔participant не знайдено |
| 404  | `quality_analysis_not_found`       | Аналіз якості не знайдено             |
| 409  | `measurement_already_running`      | Вимірювання вже активне               |
| 409  | `device_disconnected`              | Пристрій не підтвердив `start`        |
| 409  | `recording_already_running`        | Запис уже йде                         |
| 409  | `invalid_status_transition`        | Неприпустимий стан сутності           |
| 409  | `study_participant_already_exists` | Учасник уже в дослідженні             |
| 422  | `validation_error`                 | Pydantic-валідація / null у PATCH     |
| 502  | `llm_provider_error`               | Помилка LLM-провайдера                |
| 503  | `database_unavailable`             | `DATABASE_URL` не налаштовано         |
| 503  | `quality_model_unavailable`        | `QUALITY_MODEL_PATH` не налаштовано   |
| 503  | `llm_unavailable`                  | LLM вимкнено або недоступний          |


---

## Залежності від конфігурації


| Група endpoints                                                                                     | Потрібна БД                         |
| --------------------------------------------------------------------------------------------------- | ----------------------------------- |
| `/api/health`, `/api/devices`, WebSocket                                                            | Ні                                  |
| `studies`, `participants`, `measurements` (GET), `recordings`, `quality-analysis`, `assistant/chat` | Так (`DATABASE_URL` / `POSTGRES_*`) |


**CORS** (default): `http://localhost:3000`, `http://127.0.0.1:3000`, `http://localhost:3080`, `http://127.0.0.1:3080` — перевизначається через `CORS_ORIGINS`.

OpenAPI/Swagger вимкнено (`docs_url=None`, `redoc_url=None`, `openapi_url=None`).