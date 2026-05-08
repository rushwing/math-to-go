# math-to-go — Agent Workspace

## Project

Agentic RAG + Knowledge Graph math tutoring system for Chinese elementary students. Currently scoped to Grade 4 Term 2 — Equations Unit.

## Quick Links

| Resource | Path |
|----------|------|
| Project Scope | `docs/project-scope.md` |
| Tech Stack ADRs | `docs/adr/` |
| Phase Plan | `tasks/phases/` |
| KB Structure | `knowledge_base/docs/` |
| Harness Standards | `harness/` |

## Development Commands _(planned — available after PHASE-000)_

> These scripts are specified in PHASE-000 but not yet committed. Do not attempt to run them on this branch.

```bash
# Start all services (FastAPI + Frontend + Neo4j + ChromaDB)
./scripts/local/dev.sh

# Ingest KB into ChromaDB
./scripts/local/ingest.sh

# Build knowledge graph in Neo4j
uv run python scripts/build_kg.py

# Convert raw images to KB markdown
uv run python scripts/convert_images.py

# Run tests
./scripts/local/test.sh

# Validate KB frontmatter
uv run python scripts/validate_kb.py
```

## Key Architecture Decisions

- **LLM**: Codex Codex-sonnet-4-6 (vision-capable, 200K context)
- **Embedding**: BAAI/bge-m3 (8192 tok, dense + sparse + ColBERT)
- **Vector DB**: ChromaDB (dev) / Qdrant (prod)
- **Knowledge Graph**: Neo4j Community Edition 5.x
- **Agent Framework**: LangGraph StateGraph
- See `docs/adr/` for full decision rationale

## KB Doc ID Scheme

```
{TYPE}.G{grade}T{term}.{UNIT}.{SEQ:03d}
# Examples:
CONCEPT.G4T2.EQ.001    # concept doc, grade 4, term 2, equations, seq 001
EX.G4T2.EQ.015         # exercise
MISTAKE.G4T2.EQ.003    # mistake notebook entry
HEUR.G4T2.EQ.002       # heuristic / jingle
```

## 4 Use Cases

1. **UC-1 复习** — knowledge review → Three-Color Notes HTML
2. **UC-2 生成** — exercise generation (strict KB or inferred)
3. **UC-3 批改** — homework grading via Codex Vision
4. **UC-4 错题** — mistake practice with Ebbinghaus spaced repetition

## Harness Standards

- `harness/requirement-standard.md` — how to write REQ files
- `harness/testing-standard.md` — test coverage expectations
- `harness/kb-ingestion-standard.md` — KB contribution guidelines
- `harness/review-standard.md` — code review criteria
