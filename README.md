
# ПСБ Ассистент

Юридический LLM-ассистент, который помогает юристам банка работать с нормативными документами и законами: отвечает на вопросы специалистов по имеющимся в базе документам, выдавая результат с удобной для навигации цветовой подсветкой ключевых фраз.

## Как запускать Frontend

### 1. Установка зависимостей

```bash
npm install
```

### 2. Настройка .env

**Все необходимые секреты см. в `frontend/.env.example`**. Установка `VITE_TEST_API=true` позволяет включить тестовый мок-API; установка `VITE_TEST_API=false` подключает **настоящий** API приложения. **Скопируйте шаблон переменных окружения и при необходимости отредактируйте:**

```bash
cp .env.example .env  # Linux / macOS
```
```powershell
# Copy-Item .env.example .env  # Windows PowerShell
```

### 3. Запуск для тестирвоания

Для тестирования можно использовать 
```bash
npm run dev 
```

### 4. Запуск в продакшне
Для запускать в проде:
```bash
npm run build
```
Это создаст папку /dist. И далее можно использовать любой статический сервер, например:
```bash
npx serve dist
```


## Как запускать Backend

## Как запускать ML

ML-сервис (FastAPI, Python) поднимается на `http://127.0.0.1:8001`. Он **не хранит чаты**: backend передает историю диалога в каждом запросе, а ML возвращает ответ, источники и `evidence` — координаты фрагментов для цветовой подсветки в ответе и в первоисточнике.

### 1. Установка зависимостей

Windows (PowerShell), из корня репозитория:

```powershell
cd ml
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements-api.txt
```

Linux / macOS:

```bash
cd ml
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements-api.txt
```

`requirements-api.txt` достаточно, если эмбеддинги BGE-M3 доступны через API-прокси. Для полностью локальных эмбеддингов без прокси нужно ставить вместо него `requirements-local.txt` (sentence-transformers/torch).

### 2. Настройка .env

```powershell
Copy-Item .env.example .env  # Windows
```
```bash
cp .env.example .env  # Linux / macOS
```

В `.env` задайте доступ к OpenAI-совместимому API: `LLM_BASE_URL`, `LLM_API_KEY`, `LLM_MODEL` (например, ollama). Поле `EMB_MODEL`: нужно оставить пустым, чтобы BGE-M3 грузился локально, или указать id модели на прокси. **Реальные ключи не коммитятся.**

### 3. Запуск и проверка

```bash
python run_api.py
```

- `GET /health` — процесс жив (модели не загружает);
- `GET /ready` — загружает базу знаний и индекс. **При первом обращении строится индекс BGE-M3** (может занять несколько минут, далее кэшируется);
- Swagger/OpenAPI: `http://127.0.0.1:8001/docs`.

Без доступного LLM-эндпоинта и эмбеддингов `POST /api/v1/answer` не заработает, но `/health` останется доступен для проверки жизнеспособности сервиса.