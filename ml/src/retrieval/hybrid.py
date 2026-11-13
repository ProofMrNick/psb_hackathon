
import numpy as np

from src.processing.dialogue import parse_dialogue
from src.retrieval.embeddings import normalize


def prepare_query(question: str) -> str:
    """Use the last user question for retrieval."""
    _, last_question, _ = parse_dialogue(question)
    return last_question.strip() or question.strip()


def dense_search(
    query,
    matrix,
    embedder,
    top_k=30,
):
    """Return (chunk_index, cosine_similarity)."""
    if top_k <= 0 or len(matrix) == 0:
        return []

    vector = normalize(embedder.encode([query]))[0]
    scores = matrix @ vector

    indices = np.argsort(-scores, kind="stable")[:top_k]

    return [
        (int(idx), float(scores[idx]))
        for idx in indices
    ]


def bm25_search(
    query,
    sparse_retriever,
    top_k=30,
):
    """Return (chunk_index, BM25_score)."""
    results = sparse_retriever.search(
        query,
        top_k=top_k,
    )

    return [
        (result.index, result.score)
        for result in results
    ]


def reciprocal_rank_fusion(
    dense_results,
    sparse_results,
    rrf_k=60,
):
    """
    Fuse ranked lists using Reciprocal Rank Fusion.

    Rank numbering starts at 1.
    """
    if rrf_k <= 0:
        raise ValueError("rrf_k must be positive")

    fused = {}

    for source, results in (
        ("dense", dense_results),
        ("bm25", sparse_results),
    ):
        for rank, (idx, score) in enumerate(
            results, start=1
        ):
            if idx not in fused:
                fused[idx] = {
                    "index": idx,
                    "dense_rank": None,
                    "bm25_rank": None,
                    "dense_score": None,
                    "bm25_score": None,
                    "rrf_score": 0.0,
                }

            fused[idx][f"{source}_rank"] = rank
            fused[idx][f"{source}_score"] = score
            fused[idx]["rrf_score"] += (
                1.0 / (rrf_k + rank)
            )

    return sorted(
        fused.values(),
        key=lambda item: (
            -item["rrf_score"],
            item["dense_rank"]
            if item["dense_rank"] is not None
            else float("inf"),
            item["index"],
        ),
    )


def search_with_scores(
    query,
    chunks,
    matrix,
    embedder,
    sparse_retriever,
    top_k=6,
    candidate_k=30,
    rrf_k=60,
):
    """Return hybrid results with detailed diagnostics."""
    if not chunks or top_k <= 0:
        return []

    if len(matrix) != len(chunks):
        raise ValueError(
            "Dense index and chunks have different sizes"
        )

    if len(sparse_retriever.chunks) != len(chunks):
        raise ValueError(
            "Sparse index and chunks have different sizes"
        )

    query_text = prepare_query(query)

    candidate_k = min(
        len(chunks),
        max(candidate_k, top_k),
    )

    dense_results = dense_search(
        query_text,
        matrix,
        embedder,
        top_k=candidate_k,
    )

    sparse_results = bm25_search(
        query_text,
        sparse_retriever,
        top_k=candidate_k,
    )

    fused = reciprocal_rank_fusion(
        dense_results,
        sparse_results,
        rrf_k=rrf_k,
    )

    output = []

    for rank, item in enumerate(
        fused[:top_k], start=1
    ):
        output.append({
            "rank": rank,
            "chunk": chunks[item["index"]],
            **item,
        })

    return output


def search(
    query,
    chunks,
    matrix,
    embedder,
    sparse_retriever,
    top_k=6,
    candidate_k=30,
    rrf_k=60,
):
    """Return chunks only, for answer generation."""
    results = search_with_scores(
        query=query,
        chunks=chunks,
        matrix=matrix,
        embedder=embedder,
        sparse_retriever=sparse_retriever,
        top_k=top_k,
        candidate_k=candidate_k,
        rrf_k=rrf_k,
    )

    return [item["chunk"] for item in results]
