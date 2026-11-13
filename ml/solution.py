import csv
import time
import threading
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor, as_completed, TimeoutError
from ml.config import Settings
from ml.src import RAGPipeline


def load_questions(data_path):
    """Загружаем вопросы из CSV."""
    qfile = data_path / "questions.csv"
    if not qfile.exists():
        raise FileNotFoundError(f"Файл {qfile} не найден")

    raw = qfile.read_text(encoding="utf-8-sig")
    delim = ";" if raw.split("\n")[0].count(";") > raw.split("\n")[0].count(",") else ","

    rows = []
    for row in csv.DictReader(raw.splitlines(), delimiter=delim):
        row = {(k or "").strip().lower(): v for k, v in row.items()}
        if row.get("id") and row.get("question"):
            rows.append({"id": row["id"].strip(), "question": row["question"]})

    return rows


def main():
    settings = Settings()
    pipeline = RAGPipeline(settings)
    start_time = time.time()
    deadline = start_time + settings.budget_seconds

    # Загружаем базу
    chunks = pipeline.chunks
    if not chunks:
        raise SystemExit(f"База знаний пуста в {DATA_PATH.resolve()}")

    print(f"Фрагментов: {len(chunks)}")

    # Загружаем вопросы
    questions = load_questions(settings.data_dir)
    print(f"Вопросов: {len(questions)}, модель: {settings.model}, потоков: {settings.workers}\n")

    answers = {}
    lock = threading.Lock()
    done = 0

    def save_results():
        with open("submission.csv", "w", encoding="utf-8", newline="") as f:
            writer = csv.DictWriter(f, fieldnames=["id", "answer"])
            writer.writeheader()
            for q in questions:
                writer.writerow({"id": q["id"], "answer": answers.get(q["id"],
                                                                      "В базе знаний нет сведений, достаточных для ответа на этот вопрос.")})

    def process(row):
        nonlocal done
        t0 = time.time()
        try:
            answer = pipeline.answer(row["question"])
        except Exception as e:
            print(f"Ошибка в вопросе {row['id']}: {e}")
            answer = "Ошибка при обработке вопроса."

        with lock:
            answers[row["id"]] = answer
            done += 1
            save_results()
            elapsed = time.time() - t0
            print(f"[{done}/{len(questions)}] {elapsed:.1f} сек — {row['question'][:50]}")

    # Параллельная обработка
    with ThreadPoolExecutor(max_workers=settings.workers) as executor:
        futures = [executor.submit(process, q) for q in questions]
        try:
            for future in as_completed(futures, timeout=max(10, deadline - time.time())):
                future.result()
        except TimeoutError:
            print("Время на исходе, завершаю...")
            for f in futures:
                f.cancel()

    save_results()
    total = time.time() - start_time
    print(f"\n✅ Готово за {total:.0f} сек")
    print(f"Файл: {Path('submission.csv').resolve()}")


if __name__ == "__main__":
    main()
