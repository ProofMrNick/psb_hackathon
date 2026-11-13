from config.settings import Settings
from src.ingestion.loader import load_chunks
from src.retrieval.embeddings import Embedder
from src.retrieval.dense import DenseIndex
from src.retrieval.hybrid import search
from src.generation.client import make_client
from src.generation.generator import generate_answer


class RAGPipeline:
    def __init__(self, settings=None):
        self.settings = settings or Settings()
        self.chunks = load_chunks(self.settings.data_dir)
        if not self.chunks:
            raise ValueError(f'Knowledge base is empty: {self.settings.data_dir}')
        self.embedder = Embedder(self.settings)
        self.index = DenseIndex(self.embedder, self.settings.data_dir / 'indexes').build(self.chunks)
        self.client = make_client(self.settings)

    def retrieve(self, question):
        return search(question, self.chunks, self.index.matrix,
                      self.embedder, top_k=self.settings.top_k)

    def answer(self, question):
        evidence = self.retrieve(question)
        return generate_answer(question, evidence, self.client, self.settings)
