import hashlib
from pathlib import Path

import numpy as np

from .embeddings import normalize

CHUNKER_VERSION = 'v2'


class DenseIndex:
    def __init__(self, embedder, cache_dir=Path('data/indexes')):
        self.embedder = embedder
        self.cache_dir = Path(cache_dir)
        self.matrix = None
        self.cache_path = None

    def fingerprint(self, texts):
        payload = '\0'.join([self.embedder.model_tag, CHUNKER_VERSION, *texts])
        return hashlib.sha256(payload.encode()).hexdigest()[:16]

    def _candidates(self, name):
        return [self.cache_dir / name, Path.cwd() / name,
                Path(__file__).resolve().parent / name]

    def build(self, chunks):
        texts = [chunk['search'] for chunk in chunks]
        name = f'embeddings_{self.fingerprint(texts)}.npy'
        existing = next((path for path in self._candidates(name) if path.exists()), None)
        if existing is not None:
            self.matrix = np.load(existing)
            self.cache_path = existing
        else:
            self.matrix = normalize(self.embedder.encode(texts))
            self.cache_dir.mkdir(parents=True, exist_ok=True)
            self.cache_path = self.cache_dir / name
            np.save(self.cache_path, self.matrix)
        if len(self.matrix) != len(chunks):
            raise ValueError('Embedding index and chunks do not match')
        return self

    def scores(self, query):
        if self.matrix is None:
            raise RuntimeError('Call build() before searching')
        return self.matrix @ normalize(self.embedder.encode([query]))[0]