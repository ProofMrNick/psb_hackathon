Один запрос = один ответ; ML-сервис **не хранит чаты**. Backend хранит историю, отправляет её в каждом запросе и пересылает источники frontend для подсветки.

```text
frontend  →  backend  →  POST http://127.0.0.1:8001/api/v1/answer
                           BGE-M3 + BM25 → RRF → DeepSeek → ответ + источники
```

## Запуск на Windows (PowerShell)

Из корня репозитория:

```powershell
cd ml
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements-api.txt
Copy-Item .env.example .env
# Отредактируйте .env: LLM_BASE_URL, LLM_API_KEY, LLM_MODEL, EMB_MODEL
python run_api.py
```

Для Linux/macOS: `python3 -m venv .venv; source .venv/bin/activate; pip install -r requirements-api.txt; cp .env.example .env; python run_api.py`.

- `http://127.0.0.1:8001/docs` — Swagger/OpenAPI.
- `GET /health` — процесс жив, **не запускает** инициализацию моделей.
- `GET /ready` — загружает базу и индекс, возвращает счётчики `documents`, `chunks`.
- `POST /api/v1/answer` — ответ + источники.
- `POST /api/v1/search` — найденные фрагменты без генерации.
- `GET /api/v1/documents` — список документов.
- `GET /api/v1/document?document_id=...` — полный оригинальный текст по ID.

При первом обращении к `/api/v1/answer`, `/api/v1/search` или `/ready` индекс BGE-M3 строится (дальше кэшируется). Без доступного LLM/proxy или локального BGE-M3 запрос не заработает; `/health` останется доступен.

## Запрос на генерацию

```http
POST /api/v1/answer
Content-Type: application/json
```

```json
{
  "question": "Каков максимальный срок испытания для главного бухгалтера?",
  "history": [],
  "top_k": 6
}
```

Диалог: `history` содержит `[{"role":"user","content":"..."}, {"role":"assistant","content":"..."}]` в хронологическом порядке; `question` — последняя реплика.

### Ответ (пример формата, не результат запуска DeepSeek)

```json
{
  "answer": "Шесть месяцев (ст. 70 ТК РФ).",
  "sources": [
    {
      "document_id": "законы__ТК_ст70_действующая.txt",
      "filename": "законы__ТК_ст70_действующая.txt",
      "chunk_id": "chunk_000201",
      "title": "Трудовой кодекс РФ | Статья 70",
      "text": "Статья 70. Испытание при приеме на работу ...",
      "excerpt": "Статья 70. Испытание при приеме на работу ...",
      "start_char": 0,
      "end_char": 50,
      "rank": 1,
      "rrf_score": 0.0327,
      "dense_score": 0.72,
      "bm25_score": 9.2,
      "cited_in_answer": true
    }
  ],
  "evidence": [
    {
      "document_id": "законы__ТК_ст70_действующая.txt",
      "filename": "законы__ТК_ст70_действующая.txt",
      "chunk_id": "chunk_000201",
      "title": "Трудовой кодекс РФ | Статья 70",
      "text": "Статья 70. Испытание при приеме на работу ...",
      "excerpt": "Статья 70. Испытание при приеме на работу ...",
      "start_char": 0,
      "end_char": 50,
      "rank": 1,
      "rrf_score": 0.0327,
      "dense_score": 0.72,
      "bm25_score": 9.2,
      "cited_in_answer": true
    }
  ]
}
```

`text` — **точный фрагмент из документа** (не генерируется моделью). `filename` — оригинальное имя файла внутри архива базы знаний. Поля `start_char`/`end_char` — смещения в `GET /api/v1/document` (`end_char` не включительно); для подсветки используйте `document.text[start_char:end_char]`. Если позицию восстановить нельзя, оба поля `null`.

**Разница `sources` и `evidence`:** `sources` — весь контекст, который отправлялся LLM. `evidence` — только фрагменты, которые сопоставлены с **явными ссылками** на статью/пункт в ответе. Сопоставление не является проверкой, что весь ответ логически следует из источника.

`excerpt` — дублирует `text` для совместимости со старым API; для новых интеграций используйте `text`.

## Пример вызова из backend (Python)

```python
import httpx

async def ask_ml(question: str, history: list[dict]):
    async with httpx.AsyncClient(timeout=180.0) as client:
        response = await client.post(
            "http://127.0.0.1:8001/api/v1/answer",
            json={"question": question, "history": history, "top_k": 6},
        )
        response.raise_for_status()
        payload = response.json()
        return {
            "answer": payload["answer"],
            "sources": payload["sources"],
            "evidence": payload["evidence"],
        }
```

Если backend и ML запущены на **разных** машинах/контейнерах, замените `127.0.0.1` на адрес ML-сервиса. Не публикуйте ML API с ключами в открытый интернет без сетевой защиты/аутентификации.

## Проверка

```bash
cd ml
python -m unittest discover -s tests -v
```

Тесты API используют поддельный RAG (без LLM-запросов). Тесты чанкинга используют тестовую базу `data/knowledge-base.zip` из проекта. Для запуска с настоящим proxy необходимо заполнить `.env`.
