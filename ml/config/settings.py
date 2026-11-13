import os
from dataclasses import dataclass
from pathlib import Path


def env(names, default):
    return next((os.environ.get(n, '').strip() for n in names if os.environ.get(n)), default)


@dataclass(frozen=True)
class Settings:
    base_url: str = env(['LLM_BASE_URL', 'OPENAI_BASE_URL'], 'http://localhost:11434/v1')
    api_key: str = env(['LLM_API_KEY', 'OPENAI_API_KEY'], 'ollama')
    model: str = env(['LLM_MODEL', 'GEN_MODEL'], 'qwen2.5:7b')
    embedding_model: str = env(['EMB_MODEL'], '')
    data_dir: Path = Path(env(['DATA_DIR'], 'data'))
    top_k: int = int(env(['TOP_K'], '6'))
    max_tokens: int = int(env(['MAX_TOKENS'], '400'))
    temperature: float = float(env(['TEMPERATURE'], '0.1'))
    budget_seconds: int = int(env(['TIME_BUDGET_SEC'], '1020'))
    workers: int = int(env(['MAX_WORKERS'], '4'))

    @property
    def is_ollama(self):
        return '11434' in self.base_url
