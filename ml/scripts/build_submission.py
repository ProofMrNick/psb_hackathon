"""Create a root-only ZIP from the *same* RAG modules used by the ML API.

Run from the project: python ml/scripts/build_submission.py
"""
from pathlib import Path
import ast
import zipfile

ML_ROOT = Path(__file__).resolve().parents[1]
PROJECT_ROOT = ML_ROOT.parent
OUTPUT = PROJECT_ROOT / 'psb_submission_for_judge.zip'

SOURCES = {
    'solution.py': 'solution.py',
    'config/settings.py': 'settings.py',
    'src/pipeline.py': 'pipeline.py',
    'src/ingestion/loader.py': 'ingestion_loader.py',
    'src/ingestion/parser.py': 'ingestion_parser.py',
    'src/processing/dialogue.py': 'processing_dialogue.py',
    'src/retrieval/embeddings.py': 'retrieval_embeddings.py',
    'src/retrieval/dense.py': 'retrieval_dense.py',
    'src/retrieval/sparse.py': 'retrieval_sparse.py',
    'src/retrieval/hybrid.py': 'retrieval_hybrid.py',
    'src/generation/client.py': 'generation_client.py',
    'src/generation/generator.py': 'generation_generator.py',
    'src/generation/prompts.py': 'generation_prompts.py',
    'src/verification/abstention.py': 'verification_abstention.py',
    'src/verification/citations.py': 'verification_citations.py',
    'src/verification/evidence_spans.py': 'verification_evidence_spans.py',
    'src/verification/grounding.py': 'verification_grounding.py',
}

IMPORTS = {
    'config.settings': 'settings',
    'src.pipeline': 'pipeline',
    'src.ingestion.loader': 'ingestion_loader',
    'src.ingestion.parser': 'ingestion_parser',
    'src.processing.dialogue': 'processing_dialogue',
    'src.retrieval.embeddings': 'retrieval_embeddings',
    'src.retrieval.dense': 'retrieval_dense',
    'src.retrieval.sparse': 'retrieval_sparse',
    'src.retrieval.hybrid': 'retrieval_hybrid',
    'src.generation.client': 'generation_client',
    'src.generation.generator': 'generation_generator',
    'src.generation.prompts': 'generation_prompts',
    'src.verification.abstention': 'verification_abstention',
    'src.verification.citations': 'verification_citations',
    'src.verification.evidence_spans': 'verification_evidence_spans',
    'src.verification.grounding': 'verification_grounding',
}
RELATIVE_IMPORTS = {
    'src/ingestion/loader.py': {'.parser': 'ingestion_parser'},
    'src/retrieval/dense.py': {'.embeddings': 'retrieval_embeddings'},
    'src/generation/generator.py': {'.prompts': 'generation_prompts'},
}


def flat_source(path):
    text = (ML_ROOT / path).read_text(encoding='utf-8')
    for old, new in IMPORTS.items():
        text = text.replace('from ' + old + ' import ', 'from ' + new + ' import ')
    for old, new in RELATIVE_IMPORTS.get(path, {}).items():
        text = text.replace('from ' + old + ' import ', 'from ' + new + ' import ')
    if path == 'config/settings.py':
        text = text.replace('Path(__file__).resolve().parents[1]', 'Path(__file__).resolve().parent')
    ast.parse(text, filename=path)
    return text


def build():
    with zipfile.ZipFile(OUTPUT, 'w', compression=zipfile.ZIP_DEFLATED) as archive:
        for source, destination in SOURCES.items():
            archive.writestr(destination, flat_source(source))
        archive.writestr('requirements.txt', (ML_ROOT / 'requirements.txt').read_text())
    with zipfile.ZipFile(OUTPUT) as archive:
        assert all('/' not in name and (name.endswith('.py') or name == 'requirements.txt')
                   for name in archive.namelist())
        assert 'solution.py' in archive.namelist()
        assert len(archive.namelist()) == len(SOURCES) + 1
    print(f'Judge ZIP: {OUTPUT} ({OUTPUT.stat().st_size} bytes)')


if __name__ == '__main__':
    build()
