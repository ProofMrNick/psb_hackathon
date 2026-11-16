"""Start the ML API without Docker: `python run_api.py` (from ml/)."""
import os
from pathlib import Path


def load_env_file(path: Path):
    """Minimal .env reader so developers do not need python-dotenv."""
    if not path.is_file():
        return
    for line in path.read_text(encoding='utf-8-sig').splitlines():
        stripped = line.strip()
        if not stripped or stripped.startswith('#') or '=' not in stripped:
            continue
        name, value = stripped.split('=', 1)
        name = name.strip()
        if not name or not name.replace('_', '').isalnum():
            continue
        value = value.strip().strip('"\'')
        os.environ.setdefault(name, value)


if __name__ == '__main__':
    load_env_file(Path(__file__).resolve().parent / '.env')
    import uvicorn
    uvicorn.run('api:app', host=os.environ.get('ML_HOST', '127.0.0.1'),
                port=int(os.environ.get('ML_PORT', '8001')), reload=False)
