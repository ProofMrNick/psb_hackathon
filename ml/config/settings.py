import os
from dataclasses import dataclass, field
from pathlib import Path

PACKAGE_ROOT = Path(__file__).resolve().parents[1]


def env(names, default=''):
    for name in names:
        value = os.environ.get(name)
        if value and value.strip():
            return value.strip()
    return default


def resolve_data_dir(value):
    path = Path(value)
    if path.is_absolute():
        return path
    if path.exists():
        return path.resolve()
    fallback = PACKAGE_ROOT / path
    return fallback if fallback.exists() else path.resolve()


@dataclass(frozen=True)
class Settings:
    base_url: str = field(default_factory=lambda: env(['LLM_BASE_URL', 'OPENAI_BASE_URL'], 'http://localhost:11434/v1'))
    api_key: str = field(default_factory=lambda: env(['LLM_API_KEY', 'OPENAI_API_KEY'], 'ollama'))
    model: str = field(default_factory=lambda: env(['LLM_MODEL', 'OPENAI_MODEL', 'GEN_MODEL'], 'qwen2.5:7b'))
    embedding_model: str = field(default_factory=lambda: env(['EMB_MODEL']))
    reranker_model: str = field(default_factory=lambda: env(['RERANKER_MODEL']))
    reranker_top_n: int = field(default_factory=lambda: int(env(['RERANKER_TOP_N'], '20')))
    data_dir: Path = field(default_factory=lambda: resolve_data_dir(env(['DATA_DIR'], 'data')))
    top_k: int = field(default_factory=lambda: int(env(['TOP_K'], '6')))
    candidate_k: int = field(default_factory=lambda: int(env(['CANDIDATE_K'], '30')))
    max_tokens: int = field(default_factory=lambda: int(env(['MAX_TOKENS'], '400')))
    temperature: float = field(default_factory=lambda: float(env(['TEMPERATURE'], '0.1')))
    budget_seconds: int = field(default_factory=lambda: int(env(['TIME_BUDGET_SEC'], '1020')))
    workers: int = field(default_factory=lambda: int(env(['MAX_WORKERS'], '4')))
    context_chars: int = field(default_factory=lambda: int(env(['CONTEXT_CHARS'], '1600')))
    num_ctx: int = field(default_factory=lambda: int(env(['NUM_CTX'], '8192')))

    @property
    def is_ollama(self):
        return '11434' in self.base_url