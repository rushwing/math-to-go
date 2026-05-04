# ADR-003: Vector Database

## Decision

Use **ChromaDB** for development and **Qdrant** for production.

---

## Finalists Compared

| Criteria | ChromaDB 0.5+ | Qdrant | Weaviate | FAISS | Milvus |
|----------|--------------|--------|---------|-------|--------|
| **Local zero-config** | ✅ SQLite-backed, single process | ⚠️ Docker required | ⚠️ Docker required | ✅ In-memory/file | ⚠️ Docker required |
| **Persistent storage** | ✅ Disk-backed | ✅ | ✅ | ⚠️ Manual save | ✅ |
| **Hybrid search (dense+sparse)** | ⚠️ Dense only; sparse via app layer | ✅ Native hybrid | ✅ Native hybrid | ❌ Dense only | ✅ |
| **Metadata filtering** | ✅ `where` clause | ✅ Payload filter | ✅ | ❌ | ✅ |
| **LangChain integration** | ✅ `langchain-chroma` | ✅ `langchain-qdrant` | ✅ | ✅ | ✅ |
| **Async support** | ✅ `AsyncChromaDB` | ✅ | ✅ | ❌ | ⚠️ |
| **Scale (millions of vectors)** | ⚠️ Degrades at >1M | ✅ Horizontal scale | ✅ | ⚠️ RAM-bound | ✅ |
| **Operational complexity** | ✅ Lowest | Medium | Medium-high | ✅ Lowest | High |
| **Open source** | ✅ Apache-2.0 | ✅ Apache-2.0 | ✅ BSD-3 | ✅ MIT | ✅ Apache-2.0 |

---

## Why ChromaDB (dev) + Qdrant (prod) is Best Fit

### ChromaDB for development

Zero-config startup is critical for fast iteration. A new developer can clone the repo, run `uv sync`, and have a working vector store with no Docker dependency. ChromaDB's SQLite backend survives process restarts and is sufficient for a KB of a few thousand math problem chunks.

The `langchain-chroma` integration is the most battle-tested in the LangChain ecosystem — minimal glue code.

### Qdrant for production

When the KB expands beyond one grade/term, Qdrant's native hybrid retrieval (dense + sparse in a single query) becomes valuable. Qdrant also supports named vectors per document, which aligns with BGE-M3's three output types (dense, sparse, colbert). Its payload filter matches the KB's YAML frontmatter fields (grade, term, unit, subtopic, difficulty) directly.

### Abstraction layer

`backend/app/rag/vectorstore.py` wraps both behind a `VectorStore` protocol. The active backend is controlled by `VECTOR_STORE_TYPE=chroma|qdrant` in `.env`. Switching backends requires no agent or retrieval code changes.

---

## Trade-offs

| Trade-off | Mitigation |
|-----------|-----------|
| ChromaDB does not natively support BGE-M3 sparse vectors | Sparse vectors are fused at the RRF layer in `hybrid_retriever.py`, not stored in ChromaDB |
| Running Qdrant in prod requires Docker/K8s | Covered by `scripts/docker/docker-compose.prod.yml` |
| Qdrant is not needed in dev, increasing onboarding complexity | `VECTOR_STORE_TYPE=chroma` default in `.env.example` — zero Docker for local dev |
| ChromaDB collection must be rebuilt if embedding model changes | Documented in `harness/kb-ingestion-standard.md`; `ingest_kb.py --rebuild` flag handles it |
