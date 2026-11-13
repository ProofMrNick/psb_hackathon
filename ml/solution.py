import os

os.environ.setdefault('HF_HUB_DISABLE_SYMLINKS_WARNING', '1')
os.environ.setdefault('TOKENIZERS_PARALLELISM', 'false')

import csv
import threading
import time
from pathlib import Path
import queue
from config.settings import Settings
from src.pipeline import RAGPipeline
from src.verification.abstention import NO_DATA

MAX_ANSWER_CHARS = 9500

def run_parallel(rows, worker, workers, deadline):
    tasks = queue.Queue()
    for row in rows:
        tasks.put(row)

    def loop():
        while time.time() < deadline:
            try:
                row = tasks.get_nowait()
            except queue.Empty:
                return
            worker(row)

    threads = [threading.Thread(target=loop, daemon=True)
               for _ in range(max(1, min(workers, len(rows))))]
    for thread in threads:
        thread.start()
    for thread in threads:
        thread.join(timeout=max(0.0, deadline - time.time()))

def load_questions(data_dir):
    path = Path(data_dir) / 'questions.csv'
    if not path.exists():
        raise FileNotFoundError(f'Файл {path} не найден')
    raw = path.read_text(encoding='utf-8-sig')
    header = raw.split('\n')[0]
    delimiter = ';' if header.count(';') > header.count(',') else ','
    rows = []
    for row in csv.DictReader(raw.splitlines(), delimiter=delimiter):
        row = {(key or '').strip().lower(): value for key, value in row.items()}
        if row.get('id') and row.get('question'):
            rows.append({'id': row['id'].strip(), 'question': row['question']})
    return rows


def main():
    settings = Settings()
    started = time.time()
    deadline = started + settings.budget_seconds

    pipeline = RAGPipeline(settings)
    questions = load_questions(settings.data_dir)
    print(f'Фрагментов: {len(pipeline.chunks)} | вопросов: {len(questions)} | '
          f'модель: {settings.model} | потоков: {settings.workers}')

    answers = {}
    lock = threading.Lock()
    done = 0

    def save_results():
        with open('submission.csv', 'w', encoding='utf-8', newline='') as handle:
            writer = csv.DictWriter(handle, fieldnames=['id', 'answer'])
            writer.writeheader()
            writer.writerows({'id': q['id'], 'answer': answers.get(q['id'], NO_DATA)} for q in questions)

    def process(row):
        nonlocal done
        begin = time.time()
        try:
            answer = pipeline.answer(row['question'], deadline=deadline)
        except Exception as error:
            print(f"Сбой id={row['id']}: {error}")
            answer = NO_DATA
        with lock:
            answers[row['id']] = (answer or NO_DATA)[:MAX_ANSWER_CHARS]
            done += 1
            save_results()
            print(f'[{done}/{len(questions)}] {time.time() - begin:.1f} сек — {row["question"][:50]}')

    save_results()
    try:
        run_parallel(questions, process, settings.workers, deadline)
    except KeyboardInterrupt:
        print('Прервано пользователем')
    finally:
        save_results()

    print(f'Готово за {time.time() - started:.0f} сек: {Path("submission.csv").resolve()}')


if __name__ == '__main__':
    main()