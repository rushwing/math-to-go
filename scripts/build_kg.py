#!/usr/bin/env python3
"""Build Neo4j knowledge graph from KB markdown docs.

Usage:
    python scripts/build_kg.py [--reset]
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
    parser.add_argument("--reset", action="store_true", help="Delete all graph nodes before rebuild")
    args = parser.parse_args()

    try:
        from neo4j import GraphDatabase
    except ImportError as e:
        print(f"Missing dependency: {e}. Run: uv sync --all-groups")
        sys.exit(1)

    driver = GraphDatabase.driver(
        settings.neo4j_uri,
        auth=(settings.neo4j_user, settings.neo4j_password),
    )

    kb_docs_dir = Path(settings.kb_docs_dir)
    md_files = sorted(kb_docs_dir.rglob("*.md"))
    if not md_files:
        print("No KB docs found. Nothing to ingest.")
        driver.close()
        sys.exit(0)

    with driver.session(database=settings.neo4j_database) as session:
        if args.reset:
            session.run("MATCH (n:KBDoc) DETACH DELETE n")
            print("Deleted all existing KBDoc nodes.")

        count = 0
        for path in md_files:
            post = frontmatter.load(str(path))
            meta = post.metadata
            doc_id = meta.get("doc_id", path.stem)

            session.run(
                """
                MERGE (d:KBDoc {doc_id: $doc_id})
                SET d += $props
                """,
                doc_id=str(doc_id),
                props={k: str(v) for k, v in meta.items()},
            )

            # Link to subtopic node
            subtopic = meta.get("subtopic")
            if subtopic:
                session.run(
                    """
                    MERGE (s:Subtopic {subtopic_id: $subtopic_id})
                    WITH s
                    MATCH (d:KBDoc {doc_id: $doc_id})
                    MERGE (d)-[:BELONGS_TO]->(s)
                    """,
                    subtopic_id=str(subtopic),
                    doc_id=str(doc_id),
                )
            count += 1

        print(f"Upserted {count} KBDoc nodes in Neo4j.")

    driver.close()


if __name__ == "__main__":
    main()
