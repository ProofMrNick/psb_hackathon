import re

NO_DATA = 'В базе знаний нет сведений, достаточных для достоверного ответа на этот вопрос.'
REFUSAL_RE = re.compile(r'нет сведений|недостаточно информации|не указаны|не указано', re.I)


def is_refusal(answer):
    return bool(REFUSAL_RE.search(answer or ''))


def unjustified_refusal(answer, chunks, threshold=0.45):
    if not is_refusal(answer) or not chunks:
        return False
    return any(float(chunk.get('dense_score') or 0.0) >= threshold for chunk in chunks)