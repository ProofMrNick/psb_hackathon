
import argparse
import json
import sys

from datetime import datetime
from pathlib import Path


# Allow running the script directly from project root
ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from src.pipeline import RAGPipeline


def print_results(question, results, full_text=False):
    """Print retrieval results in a readable format."""

    print("\n" + "=" * 80)
    print(f"QUESTION: {question}")
    print(f"FOUND: {len(results)} chunks")
    print("=" * 80)

    for result in results:
        chunk = result["chunk"]

        print(f"\n{'-' * 80}")
        print(f"RANK: {result['rank']}")
        print(f"CHUNK ID: {chunk.get('chunk_id', 'N/A')}")
        print(f"DOCUMENT: {chunk.get('document_id', 'N/A')}")
        print(f"TITLE: {chunk.get('title', 'N/A')}")

        print("\nSCORES:")
        print(
            f"  Dense similarity: "
            f"{result['dense_score']:.4f}"
        )
        print(
            f"  Keyword bonus:    "
            f"{result['keyword_bonus']:.4f}"
        )
        print(
            f"  Entity bonus:     "
            f"{result['entity_bonus']:.4f}"
        )
        print(
            f"  TOTAL:            "
            f"{result['total_score']:.4f}"
        )

        text = chunk.get("text", "")

        if not full_text and len(text) > 700:
            text = text[:700] + "\n... [truncated]"

        print("\nTEXT:")
        print(text)

    print("\n" + "=" * 80)


def save_results(question, results, output_dir):
    """Save results to JSON."""

    output_dir = Path(output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)

    timestamp = datetime.now().strftime(
        "%Y%m%d_%H%M%S_%f"
    )

    output_path = (
        output_dir / f"retrieval_{timestamp}.json"
    )

    data = {
        "question": question,
        "results": results,
    }

    with open(
        output_path,
        "w",
        encoding="utf-8",
    ) as file:
        json.dump(
            data,
            file,
            ensure_ascii=False,
            indent=2,
        )

    print(f"\nSaved to: {output_path}")


def main():
    parser = argparse.ArgumentParser(
        description="Inspect RAG retrieval results"
    )

    parser.add_argument(
        "--question",
        "-q",
        type=str,
        default=None,
        help="Question to search for",
    )

    parser.add_argument(
        "--top-k",
        "-k",
        type=int,
        default=10,
        help="Number of retrieved chunks",
    )

    parser.add_argument(
        "--full-text",
        action="store_true",
        help="Show complete chunk text",
    )

    parser.add_argument(
        "--save",
        action="store_true",
        help="Save results as JSON",
    )

    parser.add_argument(
        "--output-dir",
        type=str,
        default="evaluation/results",
    )

    args = parser.parse_args()

    if args.top_k < 1:
        parser.error("--top-k must be >= 1")

    print("Initializing RAG pipeline...")

    pipeline = RAGPipeline(
        enable_generation=False
    )

    print(f"Loaded {len(pipeline.chunks)} chunks")

    def run_query(question):
        results = pipeline.retrieve_with_scores(
            question,
            top_k=args.top_k,
        )

        print_results(
            question,
            results,
            full_text=args.full_text,
        )

        if args.save:
            save_results(
                question,
                results,
                args.output_dir,
            )

    if args.question:
        run_query(args.question)
        return

    print("\nInteractive retrieval inspection")
    print("Type 'exit' to quit.\n")

    while True:
        try:
            question = input("Question: ").strip()

            if question.lower() in {"exit", "quit", "q"}:
                break

            if not question:
                continue

            run_query(question)

        except (KeyboardInterrupt, EOFError):
            print("\nExiting...")
            break


if __name__ == "__main__":
    main()
