
import argparse
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from config.settings import Settings
from src.ingestion.loader import load_chunks
from src.retrieval.sparse import SparseRetriever


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "-q", "--question",
        type=str,
        required=True,
    )
    parser.add_argument(
        "-k", "--top-k",
        type=int,
        default=10,
    )
    args = parser.parse_args()

    settings = Settings()
    chunks = load_chunks(settings.data_dir)

    print(f"Loaded {len(chunks)} chunks")

    retriever = SparseRetriever(chunks)

    results = retriever.search(
        args.question,
        top_k=args.top_k,
    )

    for rank, result in enumerate(results, start=1):
        chunk = chunks[result.index]

        print(f"\n{'=' * 70}")
        print(f"RANK: {rank}")
        print(f"BM25 SCORE: {result.score:.4f}")
        print(f"DOCUMENT: {chunk.get('document_id', 'N/A')}")
        print(f"TITLE: {chunk.get('title', 'N/A')}")
        print(f"\n{chunk.get('text', '')[:700]}")


if __name__ == "__main__":
    main()
