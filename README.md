
# ПСБ Ассистент

Юридический LLM-ассистент, который помогает юристам банка работать с нормативными документами и законами: отвечает на вопросы специалистов по имеющимся в базе документам, выдавая результат с удобной для навигации цветовой подсветкой ключевых фраз.

## Как запускать Frontend

### 1. Установка зависимостей

```bash
npm install
```

**Все необходимые секреты см. в ```frontend/.env.example```**. Установка ```VITE_TEST_API=true``` позволяет включить тестовый мок-API; установка ```VITE_TEST_API=false``` подключает **настоящий** API приложения

### 2. Запуск для тестирвоания

Для тестирования можно использовать 
```bash
npm run dev 
```

### 3. Запуск в продакшне
Для запускать в проде:
```bash
npm run build
```
Это создаст папку /dist. И далее можно использовать любой статический сервер, например:
```bash
npx serve dist
```


## Как запускать Backend
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
### Docker (рекомендуется)

```bash
docker compose up --build
```

Сервисы будут доступны по адресам:
- Frontend: http://localhost:5173
- Backend: http://localhost:5003
- ML API: http://localhost:8001

Для локального запуска backend:

```bash
cd backend
npm install
npm run dev
```

## Как запускать ML