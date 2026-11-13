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

## Evaluation

- Вводить любой юридический вопрос в консоли.
- Видеть top-k найденных фрагментов.
- Смотреть similarity score каждого фрагмента.
- Проверять, из какого документа взят фрагмент.
- Сохранять результаты в JSON для дальнейшего анализа.

Запуск из папки ml/
```
python evaluation/inspect_retrieval.py
```
Question: "Какой максимальный срок испытания для главного бухгалтера?"

Примерно такой вывод (оценки условные):
```
RANK: 1
CHUNK ID: chunk_000042
DOCUMENT: Законы/Трудовой кодекс.txt
TITLE: Трудовой кодекс | Статья 70

SCORES:
  Dense similarity: 0.8124
  Keyword bonus:    0.1600
  Entity bonus:     0.0000
  TOTAL:            0.9724

TEXT:
Статья 70. Испытание при приеме на работу...
Однократный поиск
```
Можно передать вопрос сразу в командной строке:
```
python evaluation/inspect_retrieval.py -q "Какой максимальный срок испытания для главного бухгалтера?"
```
Показать полный текст чанков
```
python evaluation/inspect_retrieval.py --full-text
```
Сохранить результаты в JSON
```
python evaluation/inspect_retrieval.py --save
```
Результаты сохранятся в `evaluation/results/`.