import re

import numpy as np

from src.processing.dialogue import parse_dialogue
from src.retrieval.embeddings import normalize

QUOTED_RE = re.compile(r'«([^»]{3,60})»')
CONTRACT_RE = re.compile(r'[А-ЯA-Z]{1,3}-\d{2}/\d{4}')
ENTITY_BONUS = 0.002
OWN_COMPANY = {'меридиан', 'ооо меридиан'}
ABBREVIATIONS = ((re.compile(r'\bюротдел\w*', re.I), 'юридический отдел'),)


def extract_entities(text):
    found = [item.lower() for item in QUOTED_RE.findall(text) + CONTRACT_RE.findall(text)]
    return [item for item in found if item not in OWN_COMPANY]


def expand_abbreviations(text):
    for pattern, replacement in ABBREVIATIONS:
        text = pattern.sub(replacement, text)
    return text


def prepare_query(question):
    """Последняя реплика + сущности, без размывания историей."""
    _, last, _ = parse_dialogue(question)
    query = ' '.join([last or question] + extract_entities(question))
    return expand_abbreviations(query).strip()


def dense_search(query, matrix, embedder, top_k=30):
    if top_k <= 0 or len(matrix) == 0:
        return []
    vector = normalize(embedder.encode([query]))[0]
    scores = matrix @ vector
    indices = np.argsort(-scores, kind='stable')[:top_k]
    return [(int(idx), float(scores[idx])) for idx in indices]


def bm25_search(query, sparse_retriever, top_k=30):
    return [(result.index, result.score) for result in sparse_retriever.search(query, top_k=top_k)]


def reciprocal_rank_fusion(dense_results, sparse_results, rrf_k=60):
    if rrf_k <= 0:
        raise ValueError('rrf_k must be positive')
    fused = {}
    for source, results in (('dense', dense_results), ('bm25', sparse_results)):
        for rank, (idx, score) in enumerate(results, start=1):
            item = fused.setdefault(idx, {
                'index': idx, 'dense_rank': None, 'bm25_rank': None,
                'dense_score': None, 'bm25_score': None, 'rrf_score': 0.0, 'entity_hits': 0,
            })
            item[f'{source}_rank'] = rank
            item[f'{source}_score'] = score
            item['rrf_score'] += 1.0 / (rrf_k + rank)
    return fused


def apply_entity_bonus(fused, chunks, entities, bonus=ENTITY_BONUS):
    if not entities or bonus <= 0:
        return
    patterns = [re.compile(re.escape(entity) + r'(?![а-яёa-z-])') for entity in entities]
    for idx, item in fused.items():
        haystack = chunks[idx]['search'].lower()
        hits = sum(bool(pattern.search(haystack)) for pattern in patterns)
        item['entity_hits'] = hits
        item['rrf_score'] += bonus * hits


def search_with_scores(query, chunks, matrix, embedder, sparse_retriever,
                       top_k=6, candidate_k=30, rrf_k=60, entity_bonus=ENTITY_BONUS):
    if not chunks or top_k <= 0:
        return []
    if len(matrix) != len(chunks):
        raise ValueError('Dense index and chunks have different sizes')
    if len(sparse_retriever.chunks) != len(chunks):
        raise ValueError('Sparse index and chunks have different sizes')

    query_text = prepare_query(query)
    candidate_k = min(len(chunks), max(candidate_k, top_k))
    fused = reciprocal_rank_fusion(
        dense_search(query_text, matrix, embedder, candidate_k),
        bm25_search(query_text, sparse_retriever, candidate_k),
        rrf_k=rrf_k,
    )
    apply_entity_bonus(fused, chunks, extract_entities(query), entity_bonus)
    ranked = sorted(fused.values(), key=lambda item: (
        -item['rrf_score'],
        item['dense_rank'] if item['dense_rank'] is not None else float('inf'),
        item['index'],
    ))
    return [{'rank': rank, 'chunk': chunks[item['index']], **item}
            for rank, item in enumerate(ranked[:top_k], start=1)]


def search(query, chunks, matrix, embedder, sparse_retriever,
           top_k=6, candidate_k=30, rrf_k=60, entity_bonus=ENTITY_BONUS):
    return [item['chunk'] for item in search_with_scores(
        query, chunks, matrix, embedder, sparse_retriever, top_k, candidate_k, rrf_k, entity_bonus)]