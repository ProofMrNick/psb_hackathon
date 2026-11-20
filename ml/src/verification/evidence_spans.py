import re
from src.verification.citations import citations, owns, groups_of

SENTENCE_END_RE = re.compile(r'[.!?]\s+|\n')
SENTENCE_START_RE = re.compile(r'(?:^|\n)\s*')


def _find_sentence_bounds(text, anchor):

    if not text:
        return 0, 0

    start = 0
    pos = anchor
    while pos > 0:
        prev = text[max(0, pos - 3):pos]
        if re.search(r'[.!?]\s$', prev):
            start = pos
            while start < len(text) and text[start] in ' \t\n':
                start += 1
            break
        pos -= 1

    end = len(text)
    pos = anchor
    while pos < len(text):
        if re.match(r'[.!?]\s', text[pos:pos + 2]) or text[pos] == '\n':
            end = pos + 1
            break
        pos += 1

    return start, end


def _find_claim_bounds(text, anchor):
    sent_start, sent_end = _find_sentence_bounds(text, anchor)
    after_anchor = text[anchor:sent_end].strip()
    if after_anchor and re.match(r'^[)\s.!?]*$', after_anchor):
        return sent_start, sent_end

    return sent_start, sent_end


def citation_evidence(answer, results, sources):
   
    if not answer or not results:
        return []

    source_by_chunk = {s['chunk_id']: s for s in sources}

    evidence = []
    seen = set() 

    for match, is_article in citations(answer):
        number = match.group(1)
        label = ('ст. ' if is_article else 'п. ') + number

        eligible = [item for item in results if owns(item['chunk'], number, is_article)]

        near = groups_of(answer[max(0, match.start() - 100):match.end() + 100])
        if near:
            eligible = [item for item in eligible
                       if near & groups_of(item['chunk']['document_id'] + ' ' + item['chunk']['title'])]

        if not eligible:
            continue

        best = eligible[0]
        chunk_id = best['chunk']['chunk_id']
        source = source_by_chunk.get(chunk_id)
        if source is None:
            continue

        anchor = match.start()
        claim_start, claim_end = _find_claim_bounds(answer, anchor)

        key = (chunk_id, claim_start, claim_end)
        if key in seen:
            continue
        seen.add(key)

        answer_text = answer[claim_start:claim_end]
        if not answer_text.strip():
            continue

        evidence.append({
            'chunk_id': chunk_id,
            'document_id': source['document_id'],
            'filename': source['filename'],
            'title': source['title'],
            'text': source['text'],
            'start_char': source['start_char'],
            'end_char': source['end_char'],
            'rank': best['rank'],
            'rrf_score': best['rrf_score'],
            'dense_score': best['dense_score'],
            'bm25_score': best['bm25_score'],
            'answer_start_char': claim_start,
            'answer_end_char': claim_end,
            'answer_text': answer_text,
        })

    return evidence