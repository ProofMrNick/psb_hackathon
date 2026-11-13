import re
import numpy as np
from src.processing.dialogue import parse_dialogue
from src.retrieval.embeddings import normalize

STOP_WORDS = set("какой какая какие какое сколько можно нужно должен должны если чтобы "
                 "этот этого нашего нашей пользователь ассистент подскажите пожалуйста "
                 "договор договору договора согласно очень когда какого какому более "
                 "менее после перед только вообще".split())

def search(query, chunks, matrix, embedder, top_k=6):
    """Ищем релевантные фрагменты."""
    history, last, all_text = parse_dialogue(query)
    
    # Извлекаем сущности: названия компаний в «» и номера договоров
    entities = [e.lower() for e in re.findall(r"«([^»]{3,60})»", query)
                + re.findall(r"[А-ЯA-Z]{1,3}-\d{2}/\d{4}", query)]
    
    # Векторный поиск
    query_vec = normalize(embedder.encode([f"{last} {' '.join(entities)}"]))[0]
    scores = matrix @ query_vec
    
    # Бонус за совпадение ключевых слов
    stems = {w[:6] for w in re.findall(r"[а-яёa-z]{4,}", all_text.lower()) if w not in STOP_WORDS}
    for i, chunk in enumerate(chunks):
        hay = chunk["search"].lower()
        if stems:
            scores[i] += 0.2 * sum(s in hay for s in stems) / len(stems)
        # Бонус за точное совпадение сущностей
        scores[i] += 0.15 * sum(bool(re.search(re.escape(e) + r"(?![а-яё])", hay)) for e in entities)
    
    # Берем топ-K
    top_idx = np.argsort(-scores)[:top_k]
    return [chunks[i] for i in top_idx]

# Future extension: BM25 + RRF fusion. Not implemented in this baseline.
