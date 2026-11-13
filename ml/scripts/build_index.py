from config.settings import Settings
from src.ingestion.loader import load_chunks
from src.retrieval.embeddings import Embedder
from src.retrieval.dense import DenseIndex


def main():
    settings = Settings()
    chunks = load_chunks(settings.data_dir)
    DenseIndex(Embedder(settings), settings.data_dir / 'indexes').build(chunks)
    print(f'Indexed {len(chunks)} chunks')


if __name__ == '__main__':
    main()
