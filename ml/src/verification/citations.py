import re

POINT_RE = re.compile(r'(?:п\.|пункт[а-я]*)\s*(\d+(?:\.\d+)*)', re.I)
ARTICLE_RE = re.compile(r'(?:ст\.|стать[яие])\s*(\d+(?:\.\d+)*)', re.I)
DOC_WORD_RE = re.compile(r'договор|регламент|записк|письмо|ТК РФ|НК РФ|КоАП|ФЗ', re.I)

GROUPS = {
    'labor': ('тк рф', 'трудовой кодекс', 'тк ст'),
    'tax': ('нк рф', 'налоговый кодекс', 'нк ст'),
    'privacy': ('152-фз', '152фз', 'персональных данных'),
    'admin': ('коап',),
    'lease': ('договор аренды', 'а-08'),
    'supply': ('договор поставки', 'п-17', 'пт-05'),
    'regulation': ('регламент',),
    'memo': ('служебная записка', 'записка'),
    'compliance': ('письмо комплаенс', 'комплаенс'),
}

AMENDMENT_RE = re.compile(
    r'(?:изменен[аы]|дополнен[аы]|утратил[аи]\s+силу|в\s+редакции)[^\n]*?[№N]\s*(\d+)-ФЗ', re.I)
LAW_CITE_RE = re.compile(r'[№N]\s*(\d+)-ФЗ', re.I)


def amending_law_numbers(chunks):
    numbers = set()
    for chunk in chunks:
        numbers.update(AMENDMENT_RE.findall(chunk['text']))
    return numbers

def groups_of(text):
    low = text.lower()
    return {group for group, marks in GROUPS.items() if any(mark in low for mark in marks)}


def citations(text):
    return [(m, False) for m in POINT_RE.finditer(text)] + [(m, True) for m in ARTICLE_RE.finditer(text)]


def owns(chunk, number, is_article):
    if is_article:
        return bool(re.search(r'статья\s+' + re.escape(number) + r'\b', chunk['text'], re.I)) \
            or 'ст' + number in chunk['document_id'].lower().replace(' ', '')
    return bool(re.search(r'(?:^|\n)\s*' + re.escape(number) + r'(?:\.|\s|\))', chunk['text']))


def check_citations(answer, chunks):
    problems = []
    amendments = amending_law_numbers(chunks)
    for number in LAW_CITE_RE.findall(answer):
        if number in amendments:
            problems.append(f'закон № {number}-ФЗ вносит изменения; сошлись на базовый закон '
                            'из заголовка документа и на нужный пункт этой статьи')
    found = citations(answer)
    if found and not DOC_WORD_RE.search(answer):
        problems.append('в ссылке нет названия документа: добавь название')
    for match, is_article in found:
        number = match.group(1)
        label = ('ст. ' if is_article else 'п. ') + number
        owners = [chunk for chunk in chunks if owns(chunk, number, is_article)]
        if not owners:
            problems.append(f'{label} отсутствует в переданных фрагментах: убери или замени подтверждённой ссылкой')
            continue
        near = groups_of(answer[max(0, match.start() - 120):match.end() + 120])
        owner_groups = set().union(*(groups_of(c['document_id'] + ' ' + c['title']) for c in owners))
        if near and owner_groups and not near & owner_groups:
            problems.append(f'{label} принадлежит другому документу: исправь название рядом со ссылкой')
    return problems


def strip_unverified(answer, chunks):
    def keep(match):
        inner = match.group(0)
        return '' if any(not any(owns(c, m.group(1), art) for c in chunks)
                         for m, art in citations(inner)) else inner
    return re.sub(r'\([^()]*\)', keep, answer)
