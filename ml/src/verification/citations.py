import re

POINT_RE = re.compile(r'(?:п\.|пункт[а-я]*)\s*(\d+(?:\.\d+)*)', re.I)
ARTICLE_RE = re.compile(r'(?:ст\.|стать[яие])\s*(\d+(?:\.\d+)*)', re.I)
DOC_WORD_RE = re.compile(r'договор|регламент|записк|письмо|ТК РФ|НК РФ|КоАП|ФЗ', re.I)
ABZAC_RE = re.compile(r',?\s*абзац\s+[а-яё]+', re.I)

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
    
    # 1. Удаляем ссылки на абзацы (они не пронумерованы)
    if ABZAC_RE.search(answer):
        problems.append('убери ссылку на абзац: абзацы не пронумерованы, ссылайся на статью целиком')

    # 2. Проверка законов-поправок
    amendments = amending_law_numbers(chunks)
    for number in LAW_CITE_RE.findall(answer):
        if number in amendments:
            problems.append(f'закон № {number}-ФЗ вносит изменения; сошлись на базовый закон '
                            'из заголовка документа (например, 152-ФЗ)')

    # 3. Проверка ссылок на пункты/статьи
    found = citations(answer)
    if found and not DOC_WORD_RE.search(answer):
        problems.append('в ссылке нет названия документа: добавь название')
        
    # Собираем все имена документов, которые есть в контексте
    context_doc_names = set()
    for c in chunks:
        context_doc_names.add(c['document_id'].lower())
        context_doc_names.add(c['title'].lower())
        # Добавляем ключевые слова из document_id (например, "152фз" из "законы__152ФЗ...")
        context_doc_names.add(c['document_id'].split('/')[-1].lower())

    for match, is_article in found:
        number = match.group(1)
        label = ('ст. ' if is_article else 'п. ') + number
        owners = [chunk for chunk in chunks if owns(chunk, number, is_article)]
        
        if not owners:
            problems.append(f'{label} отсутствует в переданных фрагментах: убери или замени подтверждённой ссылкой')
            continue
            
        # Проверяем, что документ рядом со ссылкой реально есть в контексте
        near_text = answer[max(0, match.start() - 150):match.end() + 50]
        # Ищем название документа в скобках рядом со ссылкой
        paren_match = re.search(r'\(([^)]{10,100})\)', near_text)
        if paren_match:
            cited_doc = paren_match.group(1).lower()
            # Проверяем, есть ли хоть какое-то совпадение с именами документов в контексте
            # Например, "Служебная записка № 14-П" должна иметь "14-п" или "служебная записка" в контексте
            found_in_context = False
            for ctx_name in context_doc_names:
                if any(word in ctx_name for word in cited_doc.split() if len(word) > 3):
                    found_in_context = True
                    break
            if not found_in_context:
                problems.append(f'документ "{paren_match.group(1)}" не найден в базе; убери ссылку')
                continue

        # Проверка принадлежности к группе (регламент vs записка)
        near = groups_of(near_text)
        owner_groups = set().union(*(groups_of(c['document_id'] + ' ' + c['title']) for c in owners))
        if near and owner_groups and not near & owner_groups:
            problems.append(f'{label} принадлежит другому документу: исправь название рядом со ссылкой')
            
    return problems


def strip_unverified(answer, chunks):
    def keep(match):
        inner = match.group(0)
        # Удаляем, если хотя бы одна ссылка внутри скобок не подтверждена
        for m, art in citations(inner):
            if not any(owns(c, m.group(1), art) for c in chunks):
                return ''
        return inner
    # Удаляем ссылки на абзацы
    answer = ABZAC_RE.sub('', answer)
    return re.sub(r'\([^()]*\)', keep, answer)