"""Read the supplied knowledge base without relying on writable DATA_DIR.

The ZIP is the source of truth for both benchmark and HTTP API. The latter can
retrieve original documents by the same document_id used in RAG evidence.
"""
from io import BytesIO
from pathlib import Path, PurePosixPath
from xml.etree import ElementTree
import zipfile
import re

from .parser import CLAUSE_RE, ARTICLE_RE, is_section_heading

SUPPORTED_SUFFIXES = {'.txt', '.md', '.docx'}


def _read_docx(raw):
    with zipfile.ZipFile(BytesIO(raw)) as inner:
        xml = inner.read('word/document.xml')
    root = ElementTree.fromstring(xml)
    ns = '{http://schemas.openxmlformats.org/wordprocessingml/2006/main}'
    return '\n'.join(''.join(t.text or '' for t in para.iter(ns + 't'))
                     for para in root.iter(ns + 'p'))


def _valid_document_name(name):
    path = PurePosixPath(name.replace('\\', '/'))
    return (not path.is_absolute() and '..' not in path.parts
            and '__MACOSX' not in path.parts and path.suffix.lower() in SUPPORTED_SUFFIXES)


def load_documents(data_path: Path):
    """Return {document_id: original text}; support both names in sample/regulation."""
    root = Path(data_path)
    archive = next((root / n for n in ('knowledge-base.zip', 'kb.zip')
                    if (root / n).is_file()), None)
    documents = {}
    if archive is not None:
        with zipfile.ZipFile(archive) as zf:
            for info in sorted(zf.infolist(), key=lambda x: x.filename):
                if info.is_dir() or not _valid_document_name(info.filename):
                    continue
                # Do not open archives with suspiciously huge decompressed entries.
                if info.file_size > 25_000_000:
                    continue
                try:
                    raw = zf.read(info)
                    text = (_read_docx(raw) if info.filename.lower().endswith('.docx')
                            else raw.decode('utf-8-sig', errors='replace'))
                except (ValueError, KeyError, zipfile.BadZipFile, ElementTree.ParseError):
                    continue
                if text.strip():
                    documents[info.filename.replace('\\', '/')] = text.strip()
        return documents

    # Local developer mode: ordinary files, or an already extracted KB.
    folder = root / 'kb_extracted' if (root / 'kb_extracted').is_dir() else root
    if not folder.is_dir():
        return documents
    for path in sorted(p for p in folder.rglob('*') if p.is_file()
                       and p.suffix.lower() in SUPPORTED_SUFFIXES):
        try:
            raw = path.read_bytes()
            text = _read_docx(raw) if path.suffix.lower() == '.docx' else raw.decode('utf-8-sig', errors='replace')
        except (ValueError, KeyError, zipfile.BadZipFile, ElementTree.ParseError):
            continue
        if text.strip():
            documents[path.relative_to(folder).as_posix()] = text.strip()
    return documents


def _split_oversized_paragraph(paragraph, max_chars):
    """Split *only* paragraphs that cannot fit, preferring sentence boundaries.

    This is a lightweight structure-aware splitter: no LLM, third-party model,
    or extra service call is required for ingestion.
    """
    remaining = paragraph.strip()
    while len(remaining) > max_chars:
        # Prefer an end-of-sentence / semicolon near the end of the window.
        # A comma is acceptable when a single legal sentence is very long.
        window = remaining[:max_chars + 1]
        minimum = int(max_chars * 0.6)
        endings = [m.end() for m in re.finditer(r'[.!?;](?=\s)', window)
                   if m.end() >= minimum]
        if not endings:
            endings = [m.end() for m in re.finditer(r',(?=\s)', window)
                       if m.end() >= minimum]
        split_at = endings[-1] if endings else window.rfind(' ', minimum)
        if split_at < 1:
            split_at = max_chars  # pathologically long unbroken token
        part = remaining[:split_at].strip()
        if part:
            yield part
        remaining = remaining[split_at:].strip()
    if remaining:
        yield remaining


def build_chunks(documents):
    """Group complete clauses/paragraphs rather than arbitrary character spans.

    A new article or contract section starts a new chunk. Within an article,
    short consecutive paragraphs stay together; oversized paragraphs are split
    at punctuation or word boundaries. No document text is silently discarded.
    """
    chunks = []
    for document_id, original_text in sorted(documents.items()):
        path = PurePosixPath(document_id)
        paragraphs = [line.strip() for line in original_text.splitlines() if line.strip()]
        if not paragraphs:
            continue
        name = path.stem.split('__')[-1].replace('_', ' ').strip()
        title = _title(paragraphs, name)
        is_law = path.stem.lower().startswith('законы')
        target = 1500 if is_law else 1100
        hard_limit = 1650 if is_law else 1250
        min_size = 650 if is_law else 450
        buf, size, article = [], 0, ''

        def flush():
            nonlocal buf, size
            if not buf:
                return
            header = f'{title} | {article}' if article else title
            text = '\n'.join(buf)
            chunks.append({
                'chunk_id': f'chunk_{len(chunks):06d}',
                'document_id': document_id,
                'title': header,
                'text': text,
                'search': f'{name}\n{header}\n{text}',
            })
            buf, size = [], 0

        for paragraph in paragraphs:
            article_match = ARTICLE_RE.match(paragraph)
            section_start = not is_law and is_section_heading(paragraph)
            if (article_match or section_start) and buf:
                flush()
            if article_match:
                article = article_match.group(1).strip()

            for part in _split_oversized_paragraph(paragraph, target):
                extra_size = len(part) + (1 if buf else 0)
                if buf and (size + extra_size > hard_limit
                            or (size >= min_size and size + extra_size > target)):
                    flush()
                # Clause boundaries are preferable to breaking inside a clause.
                elif buf and size >= min_size and CLAUSE_RE.match(part):
                    flush()
                buf.append(part)
                size += len(part) + (1 if len(buf) > 1 else 0)
        flush()
    return chunks


def load_chunks(data_path: Path):
    return build_chunks(load_documents(data_path))


def _title(lines, fallback):
    for line in lines[:6]:
        if line.lower().startswith('источник:'):
            return line[9:].strip()[:180]
    for line in lines[:6]:
        if '№' in line and len(line) < 180:
            return line
    return fallback


def locate_chunk_spans(documents, chunks):
    """Return exact original-document offsets for the cleaned lines in each chunk.

    Chunking strips indentation and empty lines, so `raw.find(chunk_text)` often
    fails. The first/last lines are preserved; scanning them in document order
    recovers original positions without changing retrieval or generation.
    """
    spans = {}
    cursors = {}
    for chunk in chunks:
        doc_id = chunk['document_id']
        original = documents.get(doc_id, '')
        lines = chunk['text'].splitlines()
        if not lines:
            continue
        cursor = cursors.get(doc_id, 0)
        start = original.find(lines[0], cursor)
        if start < 0:
            continue
        end_line = original.find(lines[-1], start)
        if end_line < 0:
            continue
        end = end_line + len(lines[-1])
        if end > start:
            spans[chunk['chunk_id']] = (start, end)
            cursors[doc_id] = end
    return spans
