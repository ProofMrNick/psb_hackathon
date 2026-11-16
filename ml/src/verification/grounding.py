import re

HEDGES = ('рекомендуется', 'может касаться', 'не предусмотрено', 'например,', 'возможно',
          'вероятно', 'предполож', 'необходимы дополнительные источники', 'можно сделать вывод')
CJK_RE = re.compile(r'[\u4e00-\u9fff\u3040-\u30ff]')
LATIN_RE = re.compile(r'\b[A-Za-z]{4,}\b')
ALLOWED_LATIN = {'context', 'http', 'https', 'garant', 'base', 'html'}


def check_grounding(answer):
    problems = []
    foreign = [word for word in LATIN_RE.findall(answer) if word.lower() not in ALLOWED_LATIN]
    if CJK_RE.search(answer) or len(foreign) > 2:
        problems.append('ответ должен быть полностью на русском языке')
    low = answer.lower()
    for word in HEDGES:
        if word in low:
            problems.append(f'убери предположение «{word}»: отвечай только по прямому тексту документа')
            break
    return problems