
import re
from dataclasses import dataclass

import numpy as np
from rank_bm25 import BM25Okapi


# Basic Russian + English tokenizer.
# Numbers are preserved for article and contract references.
TOKEN_PATTERN = re.compile(r"[а-яёa-z0-9]+", re.IGNORECASE)


def tokenize(text: str) -> list[str]:
    """
    Normalize and tokenize text for BM25.

    Examples:
        "Статья 70 ТК РФ" -> ["статья", "70", "тк", "рф"]
    """
    return TOKEN_PATTERN.findall(text.lower().replace("ё", "е"))


@dataclass
class SparseSearchResult:
    index: int
    score: float


class SparseRetriever:
    """
    BM25 lexical retriever over document chunks.

    Uses the same chunk order as the dense index.
    """

    def __init__(
        self,
        chunks: list[dict],
        k1: float = 1.5,
        b: float = 0.75,
    ):
        self.chunks = chunks

        # Include title and document name in searchable text.
        self.corpus = [
            tokenize(
                " ".join(
                    [
                        chunk.get("document_id", ""),
                        chunk.get("title", ""),
                        chunk.get("search", chunk.get("text", "")),
                    ]
                )
            )
            for chunk in chunks
        ]

        if not self.corpus:
            raise ValueError("Cannot build BM25 index from empty chunks")

        self.bm25 = BM25Okapi(
            self.corpus,
            k1=k1,
            b=b,
        )

    def get_scores(self, query: str) -> np.ndarray:
        """Return BM25 scores for every chunk."""

        tokens = tokenize(query)

        if not tokens:
            return np.zeros(
                len(self.chunks),
                dtype=np.float32,
            )

        scores = self.bm25.get_scores(tokens)

        return np.asarray(scores, dtype=np.float32)

    def search(
        self,
        query: str,
        top_k: int = 10,
    ) -> list[SparseSearchResult]:
        """Return top-k chunk indices and BM25 scores."""

        if top_k < 1:
            return []

        scores = self.get_scores(query)

        # Ignore documents with zero or negative scores.
        valid_indices = np.flatnonzero(scores > 0)

        ranked_indices = sorted(
            valid_indices,
            key=lambda idx: (-scores[idx], idx),
        )[:top_k]

        return [
            SparseSearchResult(
                index=int(idx),
                score=float(scores[idx]),
            )
            for idx in ranked_indices
        ]
