"""Internal FastAPI service for the PSB legal assistant; no Docker required.

Run inside ml/: python run_api.py    (or uvicorn api:app --port 8001)
Backend manages chat state and sends the conversation history for each question.
"""
from functools import lru_cache
from threading import Lock
from typing import Literal

from fastapi import Depends, FastAPI, HTTPException, Query
from pydantic import BaseModel, Field

from config.settings import Settings
from src.pipeline import RAGPipeline

app = FastAPI(
    title='PSB Legal RAG / ML API',
    description='Hybrid BGE-M3 + BM25 + RRF; paragraph/section-aware chunking.',
    version='1.1.0',
)


class HistoryMessage(BaseModel):
    role: Literal['user', 'assistant']
    content: str = Field(min_length=1, max_length=16000)


class QuestionRequest(BaseModel):
    question: str = Field(min_length=1, max_length=16000)
    history: list[HistoryMessage] = Field(default_factory=list, max_length=30)
    top_k: int | None = Field(default=None, ge=1, le=12)


class Source(BaseModel):
    document_id: str
    filename: str  # Exact name of the file inside knowledge-base.zip
    chunk_id: str
    title: str
    text: str  # Verbatim passage from the original file, not LLM-generated
    excerpt: str  # Deprecated alias of 'text' for older frontend integrations
    start_char: int | None
    end_char: int | None
    rank: int
    rrf_score: float
    dense_score: float | None
    bm25_score: float | None
    cited_in_answer: bool = False


class AnswerResponse(BaseModel):
    answer: str
    sources: list[Source]  # Retrieved passages, NOT necessarily cited by the LLM
    evidence: list[Source]  # Passages with recognizable explicit citations in answer


class SearchResponse(BaseModel):
    sources: list[Source]


class DocumentMeta(BaseModel):
    document_id: str
    filename: str
    title: str
    characters: int


class DocumentResponse(DocumentMeta):
    text: str


_initialization_lock = Lock()


@lru_cache(maxsize=1)
def _initialize_pipeline() -> RAGPipeline:
    return RAGPipeline(Settings())


def get_pipeline() -> RAGPipeline:
    """Initialize the embedding index only once per service process."""
    with _initialization_lock:
        return _initialize_pipeline()


def _question_with_history(request: QuestionRequest) -> str:
    if not request.history:
        return request.question.strip()
    parts = []
    for item in request.history:
        role = 'Пользователь' if item.role == 'user' else 'Ассистент'
        parts.append(f'{role}: {item.content.strip()}')
    parts.append('Пользователь: ' + request.question.strip())
    return '\n'.join(parts)


@app.get('/health')
def health():
    return {'status': 'ok'}


@app.get('/ready')
def ready(pipeline: RAGPipeline = Depends(get_pipeline)):
    return {'status': 'ready', 'documents': len(pipeline.documents), 'chunks': len(pipeline.chunks)}


@app.post('/api/v1/answer', response_model=AnswerResponse)
def answer(request: QuestionRequest, pipeline: RAGPipeline = Depends(get_pipeline)):
    return AnswerResponse(**pipeline.answer_with_sources(
        _question_with_history(request), top_k=request.top_k))


@app.post('/api/v1/search', response_model=SearchResponse)
def search(request: QuestionRequest, pipeline: RAGPipeline = Depends(get_pipeline)):
    results = pipeline.retrieve_with_scores(_question_with_history(request), top_k=request.top_k)
    return SearchResponse(sources=pipeline.sources_from_results(results))


@app.get('/api/v1/documents', response_model=list[DocumentMeta])
def list_documents(pipeline: RAGPipeline = Depends(get_pipeline)):
    return [DocumentMeta(document_id=doc_id, filename=doc_id.rsplit('/', 1)[-1],
                         title=doc_id.rsplit('/', 1)[-1], characters=len(text))
            for doc_id, text in sorted(pipeline.documents.items())]


def _document_by_id(document_id: str, pipeline: RAGPipeline):
    # Exact ID lookup only; no filesystem path construction or traversal.
    original = pipeline.documents.get(document_id)
    if original is None:
        raise HTTPException(status_code=404, detail='Документ не найден')
    filename = document_id.rsplit('/', 1)[-1]
    return DocumentResponse(document_id=document_id, filename=filename,
                            title=filename, characters=len(original), text=original)


@app.get('/api/v1/document', response_model=DocumentResponse)
def get_document(document_id: str = Query(min_length=1),
                 pipeline: RAGPipeline = Depends(get_pipeline)):
    return _document_by_id(document_id, pipeline)


@app.get('/api/v1/documents/{document_id:path}', response_model=DocumentResponse)
def get_document_path(document_id: str, pipeline: RAGPipeline = Depends(get_pipeline)):
    return _document_by_id(document_id, pipeline)
