# Запуск backend

Backend — это Node.js/Express API. По умолчанию он слушает порт `5003`, а запросы за ответами и текстом документов пересылает ML API на `http://localhost:8001`.

## Запуск всего приложения в Docker

Из корня репозитория запустите весь стек — ML API, backend и frontend:

```bash
docker compose up --build
```

После запуска:

- frontend: http://localhost:5173
- backend: http://localhost:5003
- проверка backend: http://localhost:5003/api/health
- ML API: http://localhost:8001

Для остановки нажмите `Ctrl+C`. Если контейнеры были запущены в фоне, остановите их командой:

```bash
docker compose down
```

## Запуск только backend в Docker

Этот вариант запускает только backend-контейнер. ML API должен быть запущен отдельно на компьютере на порту `8001`.

Из папки `backend` выполните:

```bash
docker compose up --build
```

Backend будет доступен по адресу http://localhost:5003. Для остановки используйте `Ctrl+C` или `docker compose down`.

## Локальный запуск без Docker

Нужен Node.js версии 24 или новее. Из корня репозитория создайте `.env`, если его ещё нет:

```powershell
Copy-Item .env.example .env
```

Убедитесь, что ML API запущен и доступен на `http://localhost:8001`. Затем из папки `backend` установите зависимости и запустите сервер:

```powershell
npm ci
$env:ML_API_URL = "http://localhost:8001"
npm run dev
```

Backend запустится на http://localhost:5003. `npm run dev` читает переменные из `.env` в корне репозитория; для подключения к ML API используйте `ML_API_URL`, а не `LLM_BASE_URL` (последняя переменная настраивает LLM для ML-сервиса).

## Основные адреса

- `GET /api/health` — состояние backend.
- `GET /api/openapi.yaml` — OpenAPI-описание.
- `GET /api/v1/chats` — список чатов.
- `POST /api/v1/new_chat` — создать чат.

Детали API смотрите в [`openapi.yaml`](./openapi.yaml).

> Сейчас база чатов создаётся в памяти процесса. После перезапуска backend сохранённые в ней чаты и сообщения сбрасываются.
