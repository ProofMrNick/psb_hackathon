# psb_hackathon
# Юридический ассистент ПСБ

ИИ-ассистент для юристов банка на основе RAG (Retrieval-Augmented Generation).

## Описание

Ассистент отвечает на вопросы по нормативным документам, договорам и внутренним регламентам компании. Использует векторный поиск по базе знаний и генерацию ответов через LLM.

## Архитектура

1. **Парсинг документов** — загрузка и разбиение текстов на смысловые фрагменты
2. **Векторизация** — создание эмбеддингов через BAAI/bge-m3
3. **Поиск** — гибридный поиск (векторный + бонус за сущности)
4. **Генерация** — формирование ответа через LLM с контролем достоверности

## Запуск

### Локально

```bash
# Установить зависимости
uv sync

# Или через pip
pip install -r requirements.txt

# Запустить
python solution.py
```

## Design
- `config/settings.py`: environment-based settings
- `src/ingestion`: document loading and chunking
- `src/retrieval`: embeddings, cache and current retrieval
- `src/processing`: dialogue parsing
- `src/generation`: prompt and LLM client
- `src/pipeline.py`: orchestration
- `solution.py`: batch submission