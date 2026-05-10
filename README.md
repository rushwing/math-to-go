# math-to-go

Agentic RAG + Knowledge Graph math tutoring system for Chinese elementary students.
Currently scoped to Grade 4 Term 2 — Equations Unit.

## Architecture

- **LLM**: Claude claude-sonnet-4-6 (vision-capable, 200K context)
- **Embedding**: BAAI/bge-m3 (dense + sparse + ColBERT)
- **Vector DB**: ChromaDB (dev) / Qdrant (prod)
- **Knowledge Graph**: Neo4j Community Edition 5.x
- **Agent Framework**: LangGraph StateGraph
- **Backend**: FastAPI + uvicorn (Python 3.12+, managed by uv)
- **Frontend**: React 18 + Vite + TypeScript + Tailwind CSS

## Quick Start

```bash
# First-time setup
./scripts/local/env-setup.sh

# Edit .env — set ANTHROPIC_API_KEY at minimum

# Start all services
./scripts/local/dev.sh
```

Services:
- FastAPI → http://localhost:8000/docs
- Frontend → http://localhost:5173
- Neo4j → http://localhost:7474
- ChromaDB → http://localhost:8001

## Development

```bash
./scripts/local/test.sh     # Run all CI gates (G1–G5)
./scripts/local/ingest.sh   # Ingest KB into ChromaDB
uv run python scripts/build_kg.py   # Build Neo4j knowledge graph
```

See `CLAUDE.md` for agent workspace guide and `docs/README.md` for full documentation index.
