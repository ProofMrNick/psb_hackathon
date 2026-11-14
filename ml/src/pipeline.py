from config.settings import Settings
from src.generation.client import make_client
from src.generation.generator import generate_answer
from src.ingestion.loader import load_chunks
from src.retrieval.dense import DenseIndex
from src.retrieval.embeddings import Embedder
from src.retrieval.hybrid import search, search_with_scores
from src.retrieval.sparse import SparseRetriever


class RAGPipeline:
    def __init__(self, settings=None, enable_generation=True, stemming=True):
        self.settings = settings or Settings()
        self.chunks = load_chunks(self.settings.data_dir)
        if not self.chunks:
            raise ValueError(f'База знаний пуста в {self.settings.data_dir}')

        self.embedder = Embedder(self.settings)
        self.index = DenseIndex(self.embedder, self.settings.data_dir / 'indexes').build(self.chunks)
        self.sparse_retriever = SparseRetriever(self.chunks, stemming=stemming)
        self.client = make_client(self.settings) if enable_generation else None

    def retrieve(self, question, top_k=None):
        return search(
            query=question,
            chunks=self.chunks,
            matrix=self.index.matrix,
            embedder=self.embedder,
            sparse_retriever=self.sparse_retriever,
            top_k=top_k or self.settings.top_k,
            candidate_k=self.settings.candidate_k,
        )

    def retrieve_with_scores(self, question, top_k=None):
        return search_with_scores(
            query=question,
            chunks=self.chunks,
            matrix=self.index.matrix,
            embedder=self.embedder,
            sparse_retriever=self.sparse_retriever,
            top_k=top_k or self.settings.top_k,
            candidate_k=self.settings.candidate_k,
        )
    def answer(self, question, deadline=None):
        if self.client is None:
            raise RuntimeError('Generation is disabled')
        results = self.retrieve_with_scores(question)
        evidence = [{**item['chunk'],
                     'dense_score': item['dense_score'],
                     'bm25_score': item['bm25_score']} for item in results]
        return generate_answer(question, evidence, self.client, self.settings, deadline) 