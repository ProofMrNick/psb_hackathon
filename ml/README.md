# ML-сервис юридического ассистента ПСБ

Подробные инструкции: [`../README.md`](../README.md) и [`../docs/ml_api.md`](../docs/ml_api.md).

## Запуск без Docker

```bash
python -m pip install -r requirements-api.txt
# Скопируйте .env.example → .env и задайте доступ к OpenAI-совместимому API
python run_api.py
```

FastAPI Swagger: http://127.0.0.1:8001/docs.

### Компоненты

- `src/ingestion/` — сохранение границ статей, пунктов и абзацев, разбиение длинных абзацев по предложениям.
- `src/retrieval/` — гибридный поиск BGE-M3 + BM25 + RRF.
- `src/generation/` и `src/verification/` — генерация ответа и проверка ссылок.
- `api.py` — POST `/api/v1/answer` и `/api/v1/search`, GET `/api/v1/documents`, `/api/v1/document`, `/health`, `/ready`.
- `run_api.py` — запуск FastAPI без Docker с чтением `.env`.

Backend получает `answer`, `sources` и `evidence`. В `evidence` есть `filename`, исходный `text`, `start_char`/`end_char` (позиции в документе) и **`answer_start_char`/`answer_end_char`** (позиции в ответе LLM) вместе с `answer_text`. Это позволяет подсветить соответствующий ответу фрагмент и по клику открыть его первоисточник.

Для локальных эмбеддингов BGE-M3 без API требуется `requirements-local.txt` (sentence-transformers/torch); с API-прокси достаточно `requirements-api.txt`.

`solution.py` остаётся отдельной CLI-точкой входа для автоматической проверки, но HTTP-сервер при его запуске не используется.
