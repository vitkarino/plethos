# Pulso Backend v1 (Nuxt/Nitro + PostgreSQL)

Документ описывает текущее состояние серверной части (`server/`) и правила для будущей интеграции фронта и Python/FastAPI.

## 1. Что уже реализовано

### Технологии

- Nuxt 4 + Nitro server routes (`server/api`, `server/routes/ws`)
- PostgreSQL + Drizzle ORM (`server/db/schema.ts`, `server/repositories/*`)
- Валидация входных данных: Zod (`server/validation/*`)
- Интеграционные тесты: Vitest (`tests/integration/*`)

### Реализованные домены

- `users`
- `projects`
- `project_users`
- `recordings`

### Реализованные каналы

- REST API `v1` под `/api/*`
- WebSocket поток под `/ws/recordings/:id/stream`

### Реализованный provider-слой для Python

- `mock` режим: `MockPythonSignalProvider`
- `http` режим: `HttpPythonSignalProvider`
- Переключение через `PYTHON_PROVIDER_MODE=mock|http`

## 2. Архитектура серверной части

Структура слоев:

- `transport`
  - REST endpoints: `server/api/**`
  - WS endpoint: `server/routes/ws/**`
- `service`
  - Оркестрация бизнес-логики: `server/services/**`
- `repository`
  - SQL/CRUD через Drizzle: `server/repositories/**`
- `provider`
  - Интеграция с Python: `server/providers/**`
- `validation`
  - Схемы Zod: `server/validation/**`
- `utils`
  - Envelope, errors, params, pagination

Поток записи сигнала:

1. Фронт вызывает `POST /api/recordings/start`.
2. Nuxt service создает `recording` и дергает SignalProvider `startRecording(...)`.
3. Фронт подписывается на `WS /ws/recordings/:id/stream`.
4. При `stop` Nuxt получает samples от provider и сохраняет в `recordings.raw_data.samples`.
5. При `extract` Nuxt сохраняет расчет в `recordings.raw_data.extracted`.

## 3. Формат API ответов

### Успех

```json
{
  "data": {},
  "meta": {
    "requestId": "0fa8f2df-a6d7-4ef0-a7c9-b84f6f5f9ce3",
    "timestamp": "2026-04-13T17:42:03.615Z",
    "pagination": {
      "limit": 20,
      "offset": 0,
      "total": 120
    }
  }
}
```

- `meta.pagination` присутствует только у list-endpoints.
- `requestId` берется из входящего `x-request-id` или генерируется middleware.

### Ошибка

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request body",
    "details": {
      "fieldErrors": {
        "name": ["Too small: expected string to have >=1 characters"]
      }
    }
  },
  "meta": {
    "requestId": "8d7218af-6a9a-4c43-b3ce-8f3ca067f730",
    "timestamp": "2026-04-13T17:42:03.615Z"
  }
}
```

Основные коды:

- `NOT_FOUND` (`404`)
- `CONFLICT` (`409`)
- `VALIDATION_ERROR` (`422`)
- `BAD_REQUEST` (`400`)
- `UPSTREAM_ERROR` (`502`)
- `INTERNAL_ERROR` (`500`)

## 4. Модель данных (PostgreSQL)

Таблицы:

- `users`: `id, name, age, sex, created_at, updated_at`
- `projects`: `id, title, description, created_at, updated_at`
- `project_users`: `project_id, user_id, assigned_at` (PK: `project_id + user_id`)
- `recordings`: `id, user_id, project_id, started_at, finished_at, duration_ms, raw_data, status, signal_type, sample_rate, created_at, updated_at`

Ключевые правила:

- UUID хранится в `varchar(36)`.
- `recordings.status`:
  - `recording`
  - `stopped`
  - `extracted`
  - `failed`
- `recordings.raw_data` — `jsonb`, содержит как минимум:

```json
{
  "provider": {},
  "samples": [],
  "extracted": {}
}
```

## 5. REST API v1

Ниже фактический контракт текущей реализации.

## 5.1 Users

### `GET /api/users?limit=20&offset=0`

- Query:
  - `limit` (1..100, default `20`)
  - `offset` (>=0, default `0`)
- Response `data`: `User[]`

### `GET /api/users/:id`

- `id` должен быть UUID
- Response `data`: `User`

### `POST /api/users`

- Body:

```json
{
  "name": "Olena Koval",
  "age": 24,
  "sex": "female"
}
```

- Response `201`, `data`: `User`

### `PATCH /api/users/:id`

- Body (partial): `name | age | sex` (минимум 1 поле)
- Response `data`: `User`

### `DELETE /api/users/:id`

- Response `data`:

```json
{
  "id": "<uuid>",
  "deleted": true
}
```

## 5.2 Projects

### `GET /api/projects?limit=20&offset=0`

- Query: `limit`, `offset`
- Response `data`: `Project[]`

### `GET /api/projects/:id`

- Response `data`: `Project`

### `POST /api/projects`

- Body:

```json
{
  "title": "Cardio Baseline",
  "description": "Baseline signal collection"
}
```

- Response `201`, `data`: `Project`

### `PATCH /api/projects/:id`

- Body (partial): `title | description`
- Response `data`: `Project`

### `DELETE /api/projects/:id`

- Response `data`:

```json
{
  "id": "<uuid>",
  "deleted": true
}
```

### `GET /api/projects/:id/users`

- Response `data`: `ProjectMember[]`
- `ProjectMember`:

```json
{
  "id": "<userId>",
  "name": "Maksym Petrenko",
  "age": 29,
  "sex": "male",
  "createdAt": "2026-04-13T17:00:00.000Z",
  "updatedAt": "2026-04-13T17:00:00.000Z",
  "assignedAt": "2026-04-13T17:05:00.000Z"
}
```

### `POST /api/projects/:id/users/:userId`

- Добавляет пользователя в проект.
- Response `201`, `data`: `ProjectMember`
- Если уже привязан: `409 CONFLICT`

### `DELETE /api/projects/:id/users/:userId`

- Response `data`:

```json
{
  "projectId": "<projectId>",
  "userId": "<userId>",
  "deleted": true
}
```

## 5.3 Recordings

### `GET /api/recordings?projectId=&userId=&status=&limit=20&offset=0`

- Query filters:
  - `projectId` UUID (optional)
  - `userId` UUID (optional)
  - `status`: `recording|stopped|extracted|failed` (optional)
  - `limit`, `offset`
- Response `data`: `Recording[]`

### `GET /api/recordings/:id`

- Response `data`: `Recording`

### `POST /api/recordings/start`

- Body:

```json
{
  "userId": "11111111-1111-4111-8111-111111111111",
  "projectId": "aaaaaaa1-aaaa-4aaa-8aaa-aaaaaaaaaaa1",
  "signalType": "ecg",
  "sampleRate": 128
}
```

- Response `201`, `data`: `Recording` со статусом `recording`

### `POST /api/recordings/:id/stop`

- Доступно только для статуса `recording`.
- Response `data`: `Recording` со статусом `stopped`, заполненными `finishedAt`, `durationMs`, `rawData.samples`.
- Если уже остановлен/извлечен: `409 CONFLICT`

### `POST /api/recordings/:id/extract`

- Нельзя вызывать пока запись в статусе `recording`.
- Response `data`: `Recording` со статусом `extracted`, заполненным `rawData.extracted`.

## 6. WebSocket API

### Endpoint

- `WS /ws/recordings/:id/stream`

### События от сервера

#### `recording.state`

```json
{
  "type": "recording.state",
  "data": {
    "status": "recording",
    "message": "Mock stream started"
  }
}
```

#### `recording.frame`

```json
{
  "type": "recording.frame",
  "data": {
    "sequence": 3,
    "timestamp": "2026-04-13T17:50:00.000Z",
    "values": [0.11, 0.08, 0.15, 0.14],
    "sampleRate": 64
  }
}
```

#### `recording.done`

```json
{
  "type": "recording.done",
  "data": {
    "recordingId": "<uuid>",
    "reason": "stopped"
  }
}
```

#### `error`

```json
{
  "type": "error",
  "error": "Recording ... was not found"
}
```

### Поведение

- При `stop` записи поток завершится `recording.done` + закрытие сокета `1000`.
- При ошибке поток отправляет `error` и закрывает сокет `1011`.

## 7. Как использовать сервер с фронта (Nuxt UI)

## 7.1 Рекомендуемый client-wrapper

Создай единый API-клиент, который понимает envelope `data/meta`:

```ts
// пример: composables/useApi.ts
interface ApiMeta {
  requestId: string
  timestamp: string
  pagination?: { limit: number; offset: number; total: number }
}

interface ApiSuccess<T> {
  data: T
  meta: ApiMeta
}

interface ApiFailure {
  error: { code: string; message: string; details?: unknown }
  meta: ApiMeta
}

export async function apiRequest<T>(url: string, options?: Parameters<typeof $fetch>[1]) {
  try {
    return await $fetch<ApiSuccess<T>>(url, {
      ...options,
      headers: {
        'x-request-id': crypto.randomUUID(),
        ...(options?.headers ?? {}),
      },
    })
  } catch (error: any) {
    const payload = error?.data as ApiFailure | undefined
    throw {
      status: error?.statusCode ?? 500,
      code: payload?.error?.code ?? 'UNKNOWN',
      message: payload?.error?.message ?? 'Request failed',
      details: payload?.error?.details,
      requestId: payload?.meta?.requestId,
    }
  }
}
```

## 7.2 Базовые сценарии UI

- Список пользователей:
  - `GET /api/users?limit=20&offset=0`
  - Читать `meta.pagination.total` для пагинации.
- Карточка проекта:
  - `GET /api/projects/:id`
  - `GET /api/projects/:id/users`
- Жизненный цикл записи:
  1. `POST /api/recordings/start`
  2. открыть `WS /ws/recordings/:id/stream`
  3. визуализировать `recording.frame`
  4. `POST /api/recordings/:id/stop`
  5. `POST /api/recordings/:id/extract`
  6. показать `rawData.extracted`

## 7.3 Пример WS-подписки во фронте

```ts
const ws = new WebSocket(`ws://localhost:3000/ws/recordings/${recordingId}/stream`)

ws.onmessage = (event) => {
  const message = JSON.parse(event.data)

  if (message.type === 'recording.frame') {
    // обновление графика
  }

  if (message.type === 'recording.state') {
    // статусная плашка
  }

  if (message.type === 'recording.done') {
    ws.close()
  }

  if (message.type === 'error') {
    // toast + логирование
  }
}
```

## 8. Интеграция Python/FastAPI в будущем

## 8.1 Переключение режима

В `.env`:

```env
PYTHON_PROVIDER_MODE=http
PYTHON_BASE_URL=http://127.0.0.1:8000
PYTHON_TIMEOUT_MS=5000
```

Если `PYTHON_PROVIDER_MODE=mock`, backend не требует Python-сервера.

## 8.2 Контракт, который Nuxt ожидает от Python HTTP API

### Start

- `POST {PYTHON_BASE_URL}/recordings/start`
- Request:

```json
{
  "recordingId": "<uuid>",
  "userId": "<uuid>",
  "projectId": "<uuid>",
  "signalType": "ecg",
  "sampleRate": 128,
  "startedAt": "2026-04-13T17:55:00.000Z"
}
```

- Response:

```json
{
  "providerData": {
    "sessionId": "py-session-123"
  }
}
```

### Stop

- `POST {PYTHON_BASE_URL}/recordings/{id}/stop`
- Request:

```json
{
  "startedAt": "2026-04-13T17:55:00.000Z",
  "sampleRate": 128,
  "signalType": "ecg"
}
```

- Response (обязательно `finishedAt` и `samples`):

```json
{
  "finishedAt": "2026-04-13T17:56:15.000Z",
  "samples": [0.11, 0.14, 0.09],
  "providerData": {
    "source": "fastapi"
  }
}
```

### Extract

- `POST {PYTHON_BASE_URL}/recordings/{id}/extract`
- Request:

```json
{
  "samples": [0.11, 0.14, 0.09],
  "sampleRate": 128,
  "signalType": "ecg"
}
```

- Response:

```json
{
  "extracted": {
    "bpm": 72,
    "quality": 0.91,
    "summary": "Stable sinus rhythm",
    "features": {
      "avg": 0.12,
      "min": -0.33,
      "max": 0.74
    }
  },
  "providerData": {
    "model": "v1"
  }
}
```

## 8.3 Контракт WS, который Nuxt ожидает от Python

Nuxt `HttpPythonSignalProvider` подключается к:

- `WS {PYTHON_BASE_URL/ws_scheme}/ws/recordings/{id}/stream`

Ожидаемые входящие сообщения от Python:

```json
{ "type": "recording.frame", "data": { "sequence": 1, "timestamp": "...", "values": [0.1], "sampleRate": 64 } }
{ "type": "recording.state", "data": { "status": "recording", "message": "..." } }
{ "type": "recording.done", "data": { "recordingId": "<uuid>", "reason": "completed" } }
{ "type": "error", "error": "message" }
```

## 8.4 Пошаговый план перехода на FastAPI

1. Реализовать в FastAPI 3 HTTP endpoint + 1 WS endpoint с контрактом выше.
2. Поднять FastAPI локально на `127.0.0.1:8000`.
3. Переключить `.env`: `PYTHON_PROVIDER_MODE=http`.
4. Прогнать `start -> stop -> extract` через Postman/Swagger + фронт.
5. Добавить интеграционные тесты с mock FastAPI (или testcontainer FastAPI).
6. После стабилизации включить failover/ретраи и полноценное логирование трассировки.

## 9. Запуск, миграции, сиды, тесты

### Локальная БД

```bash
docker-compose up -d
```

По умолчанию порт хоста: `55432`.

### Подготовка

```bash
cp .env.example .env
npm install
npm run db:migrate
npm run db:seed
npm run dev
```

### Тесты

```bash
npm run test:integration
```

Тесты используют `TEST_DATABASE_URL` (или fallback на `DATABASE_URL`), прогоняют миграции, seed и стартуют Nuxt-сервер.

## 10. Auth scaffold (v1)

- Сейчас проверки токена не включены.
- Middleware `server/middleware/10.auth-scaffold.ts` только кладет в `event.context.auth`:
  - `enabled`
  - `token`
  - `userId` (пока `null`)
- Это точка расширения для v2 (JWT/session/roles).

## 11. Типовые проблемы локального окружения

- Ошибка `unknown shorthand flag: 'd' in -d` при `docker compose up -d`:
  - у CLI не подключен compose plugin; используй `docker-compose up -d`.
- Ошибка `Cannot connect to the Docker daemon`:
  - запустить Docker daemon (Docker Desktop/альтернативу).
- Ошибка `docker-credential-desktop executable file not found`:
  - исправить `~/.docker/config.json` (убрать/обновить `credsStore` или установить корректный credential helper).

## 12. Что фронт может получать уже сейчас

Фронт уже может полноценно:

- управлять пользователями и проектами (полный CRUD);
- назначать пользователей в проекты;
- запускать/останавливать/извлекать записи;
- получать live-frames по WebSocket;
- работать в полностью автономном режиме без Python (`mock` provider);
- переключиться на реальный Python backend без изменения публичного REST API фронта (только env на Nuxt backend).
