"""Метрики поиска: Hit@k, Recall@k, MRR@k. Не зависят от способа нарезки."""
import re


def chunk_satisfies(chunk, need):
    if need['document'].lower() not in chunk.get('document_id', '').lower():
        return False
    clauses = need.get('clauses') or []
    if not clauses:
        return True
    text = chunk.get('text', '')
    for number in clauses:
        if re.search(r'статья\s+' + re.escape(number) + r'\b', text, re.I):
            return True
        if re.search(r'(?:^|\n)\s*' + re.escape(number) + r'(?:\.|\s|\))', text):
            return True
    return False


def evaluate_ranking(ranked_chunks, needs, hit_k=5, recall_k=5, mrr_k=10):
    if not needs:
        return None
    top_hit = ranked_chunks[:hit_k]
    top_recall = ranked_chunks[:recall_k]
    hit = float(any(chunk_satisfies(chunk, need) for chunk in top_hit for need in needs))
    covered = sum(any(chunk_satisfies(chunk, need) for chunk in top_recall) for need in needs)
    reciprocal_rank = 0.0
    for rank, chunk in enumerate(ranked_chunks[:mrr_k], start=1):
        if any(chunk_satisfies(chunk, need) for need in needs):
            reciprocal_rank = 1.0 / rank
            break
    return {'hit': hit, 'recall': covered / len(needs), 'rr': reciprocal_rank}


def aggregate(rows):
    scored = [row for row in rows if row is not None]
    if not scored:
        return {'hit': 0.0, 'recall': 0.0, 'mrr': 0.0, 'n': 0}
    total = len(scored)
    return {
        'hit': sum(row['hit'] for row in scored) / total,
        'recall': sum(row['recall'] for row in scored) / total,
        'mrr': sum(row['rr'] for row in scored) / total,
        'n': total,
    }