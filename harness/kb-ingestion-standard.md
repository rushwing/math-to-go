# KB Ingestion Standard

## Adding a New KB Document

1. Choose the correct type directory: `knowledge_base/docs/{concept|heuristic|exercise|mistake}/`
2. Name the file: `{TYPE}.G{grade}T{term}.{UNIT}.{SEQ:03d}.md`
3. Fill in all required frontmatter fields (see schema below)
4. Set `verified: true` only after human review confirms accuracy
5. Run `uv run python scripts/validate_kb.py` — must pass with zero errors
6. Run `uv run python scripts/ingest_kb.py` to update ChromaDB

## Required Frontmatter Fields (all docs)

```yaml
---
doc_id: CONCEPT.G4T2.EQ.001        # unique, follows naming scheme
knowledge_type: concept             # concept | heuristic | exercise | mistake
grade: 4
term: 2
subject: math
unit: equations
subtopic: equation_definition
difficulty: easy                    # easy | medium | hard
source: textbook                    # textbook | social_media | homework | exam
tags: []
verified: false
---
```

## Additional Fields for Mistake Docs

```yaml
review_count: 0
last_review_date: null
next_review_date: 2026-05-03        # set to today on creation
ebbinghaus_interval: 1
mastered: false
```

## Rebuilding the Vector Store

If you change the embedding model or chunk settings:

```bash
uv run python scripts/ingest_kb.py --rebuild
```

This drops and recreates all ChromaDB collections. Qdrant collections must be dropped manually via the Qdrant UI before re-ingesting.

## Image-to-KB Conversion

Place raw images in `knowledge_base/raw/` then run:

```bash
uv run python scripts/convert_images.py
```

The script uses Claude Vision to extract content and generate draft `.md` files in the appropriate type directory. Review generated files, set `verified: true`, then ingest.
