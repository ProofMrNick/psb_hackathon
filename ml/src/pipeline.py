"""Shared RAG pipeline for the web prototype and the CLI/judge runner.

The response includes verbatim source spans; never ask an LLM to invent evidence.
"""
from pathlib import PurePosixPath

from config.settings import Settings
from src.generation.client import make_client
from src.generation.generator import generate_answer
from src.ingestion.loader import load_documents, build_chunks, locate_chunk_spans
from src.retrieval.dense import DenseIndex
from src.retrieval.embeddings import Embedder
from src.retrieval.hybrid import search, search_with_scores
from src.retrieval.sparse import SparseRetriever
from src.verification.citations import citations, owns, groups_of


class RAGPipeline:
    def __init__(self, settings=None, enable_generation=True, stemming=True):
        self.settings = settings or Settings()
        self.documents = load_documents(self.settings.data_dir)
        self.chunks = build_chunks(self.documents)
        self.chunk_spans = locate_chunk_spans(self.documents, self.chunks)
        if not self.chunks:
            raise ValueError(f'База знаний пуста в {self.settings.data_dir}')
        self.embedder = Embedder(self.settings)
        self.index = DenseIndex(self.embedder, self.settings.data_dir / 'indexes').build(self.chunks)
        self.sparse_retriever = SparseRetriever(self.chunks, stemming=stemming)
        self.client = make_client(self.settings) if enable_generation else None

    def retrieve(self, question, top_k=None):
        return search(
            query=question, chunks=self.chunks, matrix=self.index.matrix,
            embedder=self.embedder, sparse_retriever=self.sparse_retriever,
            top_k=top_k or self.settings.top_k,
            candidate_k=self.settings.candidate_k,
        )

    def retrieve_with_scores(self, question, top_k=None):
        return search_with_scores(
            query=question, chunks=self.chunks, matrix=self.index.matrix,
            embedder=self.embedder, sparse_retriever=self.sparse_retriever,
            top_k=top_k or self.settings.top_k,
            candidate_k=self.settings.candidate_k,
        )

    def _source(self, item):
        chunk = item['chunk']
        document_id = chunk['document_id']
        span = self.chunk_spans.get(chunk['chunk_id'])
        full_text = self.documents[document_id]
        # Exact quote from the source document, not an LLM-generated paraphrase.
        quote = full_text[span[0]:span[1]] if span is not None else chunk['text']
        return {
            'document_id': document_id,
            'filename': PurePosixPath(document_id).name,
            'chunk_id': chunk['chunk_id'],
            'title': chunk['title'],
            'text': quote,
            'excerpt': quote,  # Backwards-compatible alias for clients using v1.
            'start_char': span[0] if span is not None else None,
            'end_char': span[1] if span is not None else None,
            'rank': item['rank'],
            'rrf_score': item['rrf_score'],
            'dense_score': item['dense_score'],
            'bm25_score': item['bm25_score'],
            'cited_in_answer': False,
        }

    def sources_from_results(self, results):
        return [self._source(item) for item in results]

    @staticmethod
    def _cited_chunk_ids(answer, results):
        """Find explicit point/article references in the answer, not semantic entailment.

        This deliberately does not mark every retrieved fragment as a proven
        justification. If the model does not cite a recognizable point/article,
        `evidence` will be empty while `sources` still contains the search hits.
        """
        cited = set()
        for match, is_article in citations(answer):
            number = match.group(1)
            # Reference is usually alongside the document name, e.g. 'ст. 70 ТК РФ'.
            near = groups_of(answer[max(0, match.start() - 100):match.end() + 100])
            eligible = [item for item in results if owns(item['chunk'], number, is_article)]
            if near:
                eligible = [item for item in eligible
                            if near & groups_of(item['chunk']['document_id'] + ' ' + item['chunk']['title'])]
            if eligible:
                # Only the best matching source per explicitly referenced provision.
                cited.add(eligible[0]['chunk']['chunk_id'])
        return cited

    def answer_with_sources(self, question, deadline=None, top_k=None):
        """Use exactly the same retrieved passages for generation and UI evidence."""
        if self.client is None:
            raise RuntimeError('Generation is disabled')
        results = self.retrieve_with_scores(question, top_k=top_k)
        evidence_chunks = [{**item['chunk'],
                            'dense_score': item['dense_score'],
                            'bm25_score': item['bm25_score']} for item in results]
        answer = generate_answer(question, evidence_chunks, self.client, self.settings, deadline)
        sources = self.sources_from_results(results)
        cited = self._cited_chunk_ids(answer, results)
        for source in sources:
            source['cited_in_answer'] = source['chunk_id'] in cited
        return {
            'answer': answer,
            'sources': sources,  # All fragments passed to DeepSeek; possible evidence.
            'evidence': [source for source in sources if source['cited_in_answer']],
        }

    def answer(self, question, deadline=None):
        if self.client is None:
            raise RuntimeError('Generation is disabled')
        results = self.retrieve_with_scores(question)
        evidence = [{**item['chunk'],
                     'dense_score': item['dense_score'],
                     'bm25_score': item['bm25_score']} for item in results]
        return generate_answer(question, evidence, self.client, self.settings, deadline)
