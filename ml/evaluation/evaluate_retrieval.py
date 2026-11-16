import argparse
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from config.settings import Settings
from src.pipeline import RAGPipeline
from src.retrieval.hybrid import bm25_search, dense_search, prepare_query, search_with_scores
from src.retrieval.sparse import SparseRetriever
from evaluation.metrics import aggregate, evaluate_ranking

DEFAULT_LABELS = Path(__file__).resolve().parent / 'labels.json'


def load_labels(path):
    payload = json.loads(Path(path).read_text(encoding='utf-8'))
    return payload['questions'] if isinstance(payload, dict) else payload


def main():
    parser = argparse.ArgumentParser(description='Hit@5 / Recall@5 / MRR@10 для dense, BM25 и hybrid')
    parser.add_argument('--labels', default=str(DEFAULT_LABELS))
    parser.add_argument('--top-k', type=int, default=10)
    parser.add_argument('--candidate-k', type=int, default=30)
    parser.add_argument('--no-stemming', action='store_true')
    parser.add_argument('--compare-stemming', action='store_true')
    parser.add_argument('--json', dest='json_out')
    parser.add_argument('--failures', action='store_true')
    args = parser.parse_args()

    labels = load_labels(args.labels)
    settings = Settings()
    pipeline = RAGPipeline(settings, enable_generation=False, stemming=not args.no_stemming)
    print(f'Чанков: {len(pipeline.chunks)} | вопросов: {len(labels)} | '
          f'стемминг: {not args.no_stemming}')

    methods = ['dense', 'bm25', 'hybrid']
    if args.compare_stemming:
        methods += ['bm25_stem', 'hybrid_stem']
        alt_sparse = SparseRetriever(pipeline.chunks, stemming=True)
    else:
        alt_sparse = None

    rows = {name: [] for name in methods}
    per_question = []
    candidate_k = min(len(pipeline.chunks), max(args.candidate_k, args.top_k))
    abstained = 0

    for item in labels:
        question, needs = item['question'], item.get('needs', [])
        if not needs:
            abstained += 1
            per_question.append({'id': item['id'], 'abstain': True})
            continue

        query = prepare_query(question)
        dense_idx = [idx for idx, _ in dense_search(query, pipeline.index.matrix, pipeline.embedder, candidate_k)]
        bm25_idx = [idx for idx, _ in bm25_search(query, pipeline.sparse_retriever, candidate_k)]
        hybrid_idx = [r['index'] for r in search_with_scores(
            question, pipeline.chunks, pipeline.index.matrix, pipeline.embedder,
            pipeline.sparse_retriever, top_k=candidate_k, candidate_k=candidate_k)]

        rankings = {'dense': dense_idx, 'bm25': bm25_idx, 'hybrid': hybrid_idx}
        if alt_sparse is not None:
            rankings['bm25_stem'] = [idx for idx, _ in bm25_search(query, alt_sparse, candidate_k)]
            rankings['hybrid_stem'] = [r['index'] for r in search_with_scores(
                question, pipeline.chunks, pipeline.index.matrix, pipeline.embedder,
                alt_sparse, top_k=candidate_k, candidate_k=candidate_k)]

        record = {'id': item['id'], 'abstain': False, 'methods': {}}
        for name, indices in rankings.items():
            chunks = [pipeline.chunks[idx] for idx in indices]
            scores = evaluate_ranking(chunks, needs)
            rows[name].append(scores)
            record['methods'][name] = scores
        per_question.append(record)

    summary = {name: aggregate(values) for name, values in rows.items()}

    print(f'\n{"Метод":<14}{"Hit@5":>9}{"Recall@5":>11}{"MRR@10":>10}{"N":>5}')
    print('-' * 49)
    for name, values in summary.items():
        print(f'{name:<14}{values["hit"]:>9.3f}{values["recall"]:>11.3f}{values["mrr"]:>10.3f}{values["n"]:>5}')
    print(f'\nВопросов на отказ (исключены из метрик): {abstained}')

    if args.failures:
        print('\nПровалы hybrid (Hit@5 = 0):')
        for record in per_question:
            if record['abstain']:
                continue
            if record['methods']['hybrid']['hit'] == 0.0:
                print(f"  id={record['id']}  {next(i['question'] for i in labels if i['id'] == record['id'])[:70]}")

    if args.json_out:
        Path(args.json_out).write_text(json.dumps(
            {'summary': summary, 'per_question': per_question}, ensure_ascii=False, indent=2), encoding='utf-8')
        print(f'\nJSON: {Path(args.json_out).resolve()}')


if __name__ == '__main__':
    main()