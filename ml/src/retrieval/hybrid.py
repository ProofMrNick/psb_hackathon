
import re
import numpy as np

from src.processing.dialogue import parse_dialogue
from src.retrieval.embeddings import normalize


STOP_WORDS = set(
    "какой какая какие какое сколько можно нужно "
    "должен должны если чтобы этот этого нашего нашей "
    "пользователь ассистент подскажите пожалуйста "
    "договор договору договора согласно очень когда "
    "какого какому более менее после перед только "
    "вообще".split()
)


def search_with_scores(
    query,
    chunks,
    matrix,
    embedder,
    top_k=6,
):
    """
    Retrieve chunks with detailed scoring information.

    Returns:
        list[dict] with:
            chunk
            dense_score
            keyword_bonus
            entity_bonus
            total_score
            rank
    """
    if not chunks:
        return []

    history, last, all_text = parse_dialogue(query)

    entities = [
        entity.lower()
        for entity in (
            re.findall(r"«([^»]{3,60})»", query)
            + re.findall(
                r"[А-ЯA-Z]{1,3}-\d{2}/\d{4}",
                query
            )
        )
    ]

    # 1. Dense retrieval
    search_query = f"{last} {' '.join(entities)}"

    query_vec = normalize(
        embedder.encode([search_query])
    )[0]

    dense_scores = matrix @ query_vec

    # 2. Keyword matching
    stems = {
        word[:6]
        for word in re.findall(
            r"[а-яёa-z]{4,}",
            all_text.lower()
        )
        if word not in STOP_WORDS
    }

    keyword_bonuses = np.zeros(
        len(chunks),
        dtype=np.float32
    )

    entity_bonuses = np.zeros(
        len(chunks),
        dtype=np.float32
    )

    for i, chunk in enumerate(chunks):
        hay = chunk["search"].lower()

        if stems:
            matches = sum(
                stem in hay
                for stem in stems
            )

            keyword_bonuses[i] = (
                0.2 * matches / len(stems)
            )

        entity_bonuses[i] = 0.15 * sum(
            bool(
                re.search(
                    re.escape(entity) + r"(?![а-яё])",
                    hay
                )
            )
            for entity in entities
        )

    # 3. Final scores
    total_scores = (
        dense_scores
        + keyword_bonuses
        + entity_bonuses
    )

    # 4. Sort and return detailed results
    top_indices = np.argsort(
        -total_scores
    )[:top_k]

    results = []

    for rank, idx in enumerate(top_indices, start=1):
        idx = int(idx)

        results.append({
            "rank": rank,
            "chunk": chunks[idx],
            "dense_score": float(
                dense_scores[idx]
            ),
            "keyword_bonus": float(
                keyword_bonuses[idx]
            ),
            "entity_bonus": float(
                entity_bonuses[idx]
            ),
            "total_score": float(
                total_scores[idx]
            ),
        })

    return results


def search(
    query,
    chunks,
    matrix,
    embedder,
    top_k=6,
):
    """
    Backward-compatible search.

    Returns only chunks, as before.
    """
    results = search_with_scores(
        query=query,
        chunks=chunks,
        matrix=matrix,
        embedder=embedder,
        top_k=top_k,
    )

    return [
        result["chunk"]
        for result in results
    ]
