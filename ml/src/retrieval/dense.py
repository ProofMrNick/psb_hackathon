import hashlib
from pathlib import Path
import numpy as np
from .embeddings import normalize


class DenseIndex:
    def __init__(self, embedder, cache_dir=Path('data/indexes')):
        self.embedder = embedder
        self.cache_dir = Path(cache_dir)
        self.matrix = None

    def build(self, chunks):
        texts = [chunk['search'] for chunk in chunks]
        model_id = self.embedder.settings.embedding_model or 'local-bge-m3-max512'
        fingerprint = hashlib.sha256((model_id + '\0' + '\0'.join(texts)).encode()).hexdigest()[:16]
        self.cache_dir.mkdir(parents=True, exist_ok=True)
        cache = self.cache_dir / f'embeddings_{fingerprint}.npy'
        self.matrix = np.load(cache) if cache.exists() else normalize(self.embedder.encode(texts))
        if not cache.exists():
            np.save(cache, self.matrix)
        if len(self.matrix) != len(chunks):
            raise ValueError('Embedding index and chunks do not match')
        return self

    def scores(self, query):
        if self.matrix is None:
            raise RuntimeError('Call build() before searching')
        vector = normalize(self.embedder.encode([query]))[0]
        return self.matrix @ vector
