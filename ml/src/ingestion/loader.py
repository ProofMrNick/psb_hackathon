import zipfile
from pathlib import Path
from .parser import CLAUSE_RE, ARTICLE_RE


def load_chunks(data_path: Path):
    """Existing character-based chunking, with article-heading boundary fix."""
    folder = data_path / 'kb_extracted'
    archive = data_path / 'knowledge-base.zip'
    if archive.exists() and not folder.exists():
        with zipfile.ZipFile(archive) as zf:
            # The archive must be trusted; do not extract arbitrary untrusted ZIPs.
            zf.extractall(folder)
    elif not folder.exists():
        folder = data_path

    chunks = []
    for path in sorted(folder.rglob('*.txt')):
        lines = [line.strip() for line in path.read_text(encoding='utf-8', errors='ignore').splitlines() if line.strip()]
        if not lines:
            continue
        name = path.stem.split('__')[-1].replace('_', ' ').strip()
        title = next((line for line in lines[:6] if '№' in line and len(line) < 180), name)
        is_law = path.stem.lower().startswith('законы')
        limit, min_size = (1600, 700) if is_law else (1200, 450)
        buf, size, article = [], 0, ''

        def flush():
            nonlocal buf, size
            if not buf:
                return
            header = f'{title} | {article}' if article else title
            text = '\n'.join(buf)
            chunks.append({
                'chunk_id': f'chunk_{len(chunks):06d}',
                'document_id': str(path.relative_to(folder)),
                'title': header,
                'text': text,
                'search': f'{name}\n{header}\n{text}',
            })
            buf, size = [], 0

        for line in lines:
            match = ARTICLE_RE.match(line)
            # Flush BEFORE switching the current article metadata.
            if match and buf:
                flush()
            if match:
                article = match.group(1).strip()
            if buf and (size >= limit or (CLAUSE_RE.match(line) and size >= min_size)):
                flush()
            buf.append(line)
            size += len(line) + 1
        flush()
    return chunks
