import re
from dataclasses import dataclass

import numpy as np
from rank_bm25 import BM25Okapi

TOKEN_RE = re.compile(r'[а-яёa-z0-9]+', re.IGNORECASE)
STEM_LENGTH = 6


def tokenize(text, stemming=True):
    tokens = TOKEN_RE.findall(text.lower().replace('ё', 'е'))
    if not stemming:
        return tokens
    return [token if token.isdigit() or len(token) <= STEM_LENGTH else token[:STEM_LENGTH]
            for token in tokens]


@dataclass
class SparseSearchResult:
    index: int
    score: float


class SparseRetriever:
    def __init__(self, chunks, k1=1.5, b=0.75, stemming=True):
        self.chunks = chunks
        self.stemming = stemming
        self.corpus = [
            tokenize(' '.join([chunk.get('document_id', ''), chunk.get('title', ''),
                               chunk.get('search', chunk.get('text', ''))]), stemming)
            for chunk in chunks
        ]
        if not self.corpus:
            raise ValueError('Cannot build BM25 index from empty chunks')
        self.bm25 = BM25Okapi(self.corpus, k1=k1, b=b)

    def get_scores(self, query):
        tokens = tokenize(query, self.stemming)
        if not tokens:
            return np.zeros(len(self.chunks), dtype=np.float32)
        return np.asarray(self.bm25.get_scores(tokens), dtype=np.float32)

    def search(self, query, top_k=10):
        if top_k < 1:
            return []
        scores = self.get_scores(query)
        ranked = sorted(np.flatnonzero(scores > 0), key=lambda idx: (-scores[idx], idx))[:top_k]
        return [SparseSearchResult(int(idx), float(scores[idx])) for idx in ranked]