#!/usr/bin/env python3
"""Ingest KB markdown docs into ChromaDB via BGE-M3 embeddings.

Usage:
    python scripts/ingest_kb.py [--reset]
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(REPO_ROOT / "backend"))

import frontmatter  # noqa: E402

from app.config import settings  # noqa: E402


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--reset", action="store_true", help="Delete and recreate the collection")
    args = parser.parse_args()

    try:
        import chromadb
        from FlagEmbedding import BGEM3FlagModel
    except ImportError as e:
        print(f"Missing dependency: {e}. Run: uv sync --all-groups")
        sys.exit(1)

    kb_docs_dir = Path(settings.kb_docs_dir)
    md_files = sorted(kb_docs_dir.rglob("*.md"))
    if not md_files:
        print("No KB docs found. Nothing to ingest.")
        sys.exit(0)

    print(f"Loading BGE-M3 model ({settings.embedding_model})...")
    model = BGEM3FlagModel(settings.embedding_model, use_fp16=True)

    client = chromadb.PersistentClient(path=settings.chroma_persist_dir)
    collection_name = "math_kb"
    if args.reset and collection_name in [c.name for c in client.list_collections()]:
        client.delete_collection(collection_name)
        print(f"Deleted existing collection '{collection_name}'.")
    collection = client.get_or_create_collection(collection_name)

    docs, metadatas, ids = [], [], []
    for path in md_files:
        post = frontmatter.load(str(path))
        doc_id = post.metadata.get("doc_id", path.stem)
        docs.append(post.content)
        metadatas.append({k: str(v) for k, v in post.metadata.items()})
        ids.append(str(doc_id))

    print(f"Embedding {len(docs)} documents...")
    result = model.encode(docs, return_dense=True, return_sparse=False, return_colbert_vecs=False)
    embeddings = result["dense_vecs"].tolist()

    collection.upsert(documents=docs, embeddings=embeddings, metadatas=metadatas, ids=ids)
    print(f"Ingested {len(docs)} documents into ChromaDB collection '{collection_name}'.")


if __name__ == "__main__":
    main()
