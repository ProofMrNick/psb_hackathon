
from config.settings import Settings

from src.ingestion.loader import load_chunks
from src.retrieval.embeddings import Embedder
from src.retrieval.dense import DenseIndex
from src.retrieval.sparse import SparseRetriever

from src.retrieval.hybrid import (
    search,
    search_with_scores,
)

from src.generation.client import make_client
from src.generation.generator import generate_answer


class RAGPipeline:

    def __init__(
        self,
        settings=None,
        enable_generation=True,
    ):
        self.settings = settings or Settings()

        self.chunks = load_chunks(
            self.settings.data_dir
        )

        if not self.chunks:
            raise ValueError("Knowledge base is empty")

        # Dense index: BGE-M3
        self.embedder = Embedder(self.settings)

        self.index = DenseIndex(
            self.embedder,
            self.settings.data_dir / "indexes",
        ).build(self.chunks)

        # Sparse index: BM25
        self.sparse_retriever = SparseRetriever(
            self.chunks
        )

        self.client = (
            make_client(self.settings)
            if enable_generation
            else None
        )

    def retrieve(
        self,
        question,
        top_k=None,
    ):
        return search(
            query=question,
            chunks=self.chunks,
            matrix=self.index.matrix,
            embedder=self.embedder,
            sparse_retriever=self.sparse_retriever,
            top_k=top_k or self.settings.top_k,
        )

    def retrieve_with_scores(
        self,
        question,
        top_k=None,
    ):
        return search_with_scores(
            query=question,
            chunks=self.chunks,
            matrix=self.index.matrix,
            embedder=self.embedder,
            sparse_retriever=self.sparse_retriever,
            top_k=top_k or self.settings.top_k,
        )

    def answer(self, question):
        if self.client is None:
            raise RuntimeError(
                "Generation is disabled"
            )

        evidence = self.retrieve(question)

        return generate_answer(
            question,
            evidence,
            self.client,
            self.settings,
        )
