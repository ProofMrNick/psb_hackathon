import threading
import numpy as np
from openai import OpenAI


def normalize(vecs):
    vecs = np.asarray(vecs, dtype='float32')
    norms = np.linalg.norm(vecs, axis=1, keepdims=True)
    norms[norms == 0] = 1
    return vecs / norms


class Embedder:
    def __init__(self, settings):
        self.settings = settings
        self._model = None
        self._lock = threading.Lock()
        self._client = OpenAI(base_url=settings.base_url, api_key=settings.api_key, timeout=180, max_retries=2)

    def encode(self, texts):
        if not texts:
            return np.zeros((0, 1024), dtype='float32')
        if self.settings.embedding_model:
            vectors = []
            for i in range(0, len(texts), 16):
                response = self._client.embeddings.create(model=self.settings.embedding_model, input=texts[i:i+16])
                vectors.extend(item.embedding for item in response.data)
            return np.asarray(vectors, dtype='float32')
        with self._lock:
            if self._model is None:
                import torch
                from sentence_transformers import SentenceTransformer
                device = 'cuda' if torch.cuda.is_available() else 'cpu'
                self._model = SentenceTransformer('BAAI/bge-m3', device=device)
                self._model.max_seq_length = 512
                if device == 'cuda':
                    self._model = self._model.half()
            return self._model.encode(texts, batch_size=16, convert_to_numpy=True,
                                      show_progress_bar=len(texts) > 32).astype('float32')
