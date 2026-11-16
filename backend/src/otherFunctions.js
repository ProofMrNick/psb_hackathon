function highlightAnswer(mlResponse) {
    const { answer, evidence } = mlResponse;

    if (!answer) return { html: '', evidences: [] };
    if (!evidence || evidence.length === 0) {
        return { html: escapeHtml(answer), evidences: [] };
    }

    // Палитра цветов по приоритету (индекс = приоритет, 0 = самый высокий)
    const palette = [
        { className: 'peach',  color: '#F5CDC0' }, // приоритет 0
        { className: 'yellow', color: '#F6E7AE' }, // приоритет 1
        { className: 'pink',   color: '#F5D4D6' }, // приоритет 2
        { className: 'purple', color: '#ECBEE8' }, // приоритет 3
        { className: 'green',  color: '#C0F3D5' }, // приоритет 4
        { className: 'cyan',   color: '#B5E8E3' }, // приоритет 5
    ];

    // 1. Собираем диапазоны и сортируем по позиции в тексте
    const highlights = evidence
        .filter(e => e.answer_start_char != null && e.answer_end_char != null)
        .map((e, origIdx) => ({
            start: e.answer_start_char,
            end: e.answer_end_char,
            origIdx,
            document_id: e.document_id,
            start_char: e.start_char,
            end_char: e.end_char,
        }))
        .sort((a, b) => a.start - b.start || a.end - b.end);

    // 2. Присваиваем классы по порядку появления в тексте
    highlights.forEach((h, index) => {
        const entry = palette[index % palette.length];
        h.className = entry.className;
        h.color = entry.color;
        h.priority = index % palette.length;
    });

    if (highlights.length === 0) {
        return { html: escapeHtml(answer), evidences: [] };
    }

    // 3. Разбиваем на сегменты с учётом приоритета при overlap
    const segments = buildSegmentsWithPriority(answer, highlights);

    // 4. Строим HTML и карту смещений
    const { html, offsetMap } = buildHtmlWithOffsetMap(segments);

    // 5. Вычисляем новые позиции для каждого evidence
    const evidences = highlights.map(h => ({
        origIdx: h.origIdx,
        answer_start_char: offsetMap.get(h.start),
        answer_end_char: offsetMap.get(h.end),
        color: h.color,
        className: h.className,
        document_id: h.document_id,
        start_char: h.start_char,
        end_char: h.end_char,
    }));

    // Сортируем по origIdx чтобы вернуть в исходном порядке
    evidences.sort((a, b) => a.origIdx - b.origIdx);

    return { html, evidences };
}

/**
 * Разбивает текст на сегменты.
 * При overlap нескольких highlights — выбирается класс с наивысшим приоритетом.
 */
function buildSegmentsWithPriority(text, highlights) {
    const events = [];
    highlights.forEach((h, idx) => {
        events.push({ pos: h.start, type: 'start', index: idx });
        events.push({ pos: h.end, type: 'end', index: idx });
    });

    events.sort((a, b) => {
        if (a.pos !== b.pos) return a.pos - b.pos;
        if (a.type === 'end' && b.type === 'start') return -1;
        if (a.type === 'start' && b.type === 'end') return 1;
        return 0;
    });

    const segments = [];
    let cursor = 0;
    const activeSet = new Set();

    for (const event of events) {
        if (event.pos > cursor) {
            const winner = getHighestPriorityHighlight(highlights, activeSet);
            segments.push({
                text: text.slice(cursor, event.pos),
                className: winner ? winner.className : null,
                startInOriginal: cursor,
                endInOriginal: event.pos,
            });
            cursor = event.pos;
        }

        if (event.type === 'start') {
            activeSet.add(event.index);
        } else if (event.type === 'end') {
            activeSet.delete(event.index);
        }
    }

    if (cursor < text.length) {
        const winner = getHighestPriorityHighlight(highlights, activeSet);
        segments.push({
            text: text.slice(cursor),
            className: winner ? winner.className : null,
            startInOriginal: cursor,
            endInOriginal: text.length,
        });
    }

    return segments;
}

/**
 * Строит HTML из сегментов и возвращает карту смещений.
 */
function buildHtmlWithOffsetMap(segments) {
    const parts = [];
    const offsetMap = new Map();
    let htmlPos = 0;

    for (const seg of segments) {
        const escapedText = escapeHtml(seg.text);

        if (seg.className) {
            const openTag = `<span class="${seg.className}">`;
            const closeTag = `</span>`;

            mapTextPositions(seg.text, seg.startInOriginal, htmlPos + openTag.length, offsetMap);
            offsetMap.set(seg.startInOriginal + seg.text.length, htmlPos + openTag.length + escapedText.length);

            parts.push(openTag + escapedText + closeTag);
            htmlPos += openTag.length + escapedText.length + closeTag.length;
        } else {
            mapTextPositions(seg.text, seg.startInOriginal, htmlPos, offsetMap);
            offsetMap.set(seg.startInOriginal + seg.text.length, htmlPos + escapedText.length);
            parts.push(escapedText);
            htmlPos += escapedText.length;
        }
    }

    return { html: parts.join(''), offsetMap };
}

function mapTextPositions(text, origOffset, htmlStartPos, offsetMap) {
    let htmlPos = htmlStartPos;

    for (let i = 0; i < text.length; i++) {
        const ch = text[i];
        let escapedLen;
        switch (ch) {
            case '&': escapedLen = 5; break;
            case '<': escapedLen = 4; break;
            case '>': escapedLen = 4; break;
            case '"': escapedLen = 6; break;
            default: escapedLen = 1;
        }
        offsetMap.set(origOffset + i, htmlPos);
        htmlPos += escapedLen;
    }
}

function getHighestPriorityHighlight(highlights, activeSet) {
    if (activeSet.size === 0) return null;

    let best = null;
    let bestPriority = Infinity;

    for (const idx of activeSet) {
        if (highlights[idx].priority < bestPriority) {
            bestPriority = highlights[idx].priority;
            best = highlights[idx];
        }
    }

    return best;
}

function escapeHtml(str) {
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

export {highlightAnswer}