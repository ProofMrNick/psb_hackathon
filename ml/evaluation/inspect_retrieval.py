import argparse
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from src.pipeline import RAGPipeline
from src.retrieval.hybrid import (
    prepare_query,
    dense_search,
    bm25_search,
    search_with_scores
)


def print_ranking(name, results, chunks):
    print(f"\n{'=' * 70}")
    print(name)
    print("=" * 70)

    for rank, (idx, score) in enumerate(
        results, start=1
    ):
        chunk = chunks[idx]

        print(
            f"{rank:2}. score={score:9.4f} | "
            f"{chunk.get('document_id', 'N/A')} | "
            f"{chunk.get('chunk_id', idx)}"
        )


def print_hybrid(results, full_text=False):
    print(f"\n{'=' * 70}")
    print("HYBRID RETRIEVAL (RRF)")
    print("=" * 70)

    for item in results:
        chunk = item["chunk"]

        print(f"\n{'-' * 70}")
        print(f"HYBRID RANK: {item['rank']}")
        print(f"CHUNK: {chunk.get('chunk_id', 'N/A')}")
        print(f"DOCUMENT: {chunk.get('document_id', 'N/A')}")
        print(f"TITLE: {chunk.get('title', 'N/A')}")

        print(f"\nRRF score: {item['rrf_score']:.6f}")

        dense_rank = item["dense_rank"]
        bm25_rank = item["bm25_rank"]

        print(
            "Dense rank:",
            dense_rank if dense_rank is not None
            else "not in candidates",
        )
        print(
            "BM25 rank:",
            bm25_rank if bm25_rank is not None
            else "not in candidates",
        )

        if item["dense_score"] is not None:
            print(
                f"Dense similarity: "
                f"{item['dense_score']:.4f}"
            )

        if item["bm25_score"] is not None:
            print(
                f"BM25 score: "
                f"{item['bm25_score']:.4f}"
            )

        text = chunk.get("text", "")

        if not full_text and len(text) > 700:
            text = text[:700] + "\n... [truncated]"

        print("\nTEXT:")
        print(text)


def main():
    parser = argparse.ArgumentParser(
        description="Inspect dense, BM25 and hybrid retrieval"
    )

    parser.add_argument(
        "-q", "--question",
        type=str,
        default=None,
    )

    parser.add_argument(
        "-k", "--top-k",
        type=int,
        default=10,
    )

    parser.add_argument(
        "--candidate-k",
        type=int,
        default=30,
    )

    parser.add_argument(
        "--full-text",
        action="store_true",
    )

    args = parser.parse_args()

    if args.top_k < 1 or args.candidate_k < 1:
        parser.error("top-k and candidate-k must be positive")

    print("Initializing RAG pipeline...")

    pipeline = RAGPipeline(
        enable_generation=False
    )

    print(f"Loaded {len(pipeline.chunks)} chunks")

    def run_query(question):
        query_text = prepare_query(question)

        candidate_k = min(
            len(pipeline.chunks),
            max(args.candidate_k, args.top_k),
        )

        dense_results = dense_search(
            query_text,
            pipeline.index.matrix,
            pipeline.embedder,
            top_k=candidate_k,
        )

        sparse_results = bm25_search(
            query_text,
            pipeline.sparse_retriever,
            top_k=candidate_k,
        )

        hybrid_results = search_with_scores(
            query=question,
            chunks=pipeline.chunks,
            matrix=pipeline.index.matrix,
            embedder=pipeline.embedder,
            sparse_retriever=pipeline.sparse_retriever,
            top_k=args.top_k,
            candidate_k=candidate_k,
        )

        print(f"\nQUESTION: {question}")

        print_ranking(
            "DENSE (BGE-M3)",
            dense_results[:args.top_k],
            pipeline.chunks,
        )

        print_ranking(
            "SPARSE (BM25)",
            sparse_results[:args.top_k],
            pipeline.chunks,
        )

        print_hybrid(
            hybrid_results,
            full_text=args.full_text,
        )

    if args.question:
        run_query(args.question)
        return

    print("\nInteractive mode. Type 'exit' to quit.")

    while True:
        try:
            question = input("\nQuestion: ").strip()

            if question.lower() in {"exit", "quit", "q"}:
                break

            if question:
                run_query(question)

        except (KeyboardInterrupt, EOFError):
            break


if __name__ == "__main__":
    main()
