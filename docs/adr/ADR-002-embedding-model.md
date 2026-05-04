# ADR-002: Embedding Model

## Decision

Use **BAAI/bge-m3** instead of BAAI/bge-large-zh-v1.5 or OpenAI embeddings.

---

## Finalists Compared

| Criteria | BGE-M3 | bge-large-zh-v1.5 | OpenAI text-embedding-3-large | bge-large-en-v1.5 |
|----------|--------|-------------------|-------------------------------|-------------------|
| **Max token length** | 8,192 | 512 | 8,191 | 512 |
| **Retrieval modes** | Dense + Sparse + ColBERT | Dense only | Dense only | Dense only |
| **Chinese proficiency** | ✅ Multilingual, strong ZH | ✅ ZH-specialized | ⚠️ General multilingual | ❌ EN-only |
| **Self-hosted** | ✅ Yes (FlagEmbedding) | ✅ Yes | ❌ API-only (cost + latency) | ✅ Yes |
| **Model size** | ~1.06 GB (fp16) | ~1.3 GB (fp16) | N/A | ~1.3 GB |
| **GPU VRAM** | ~1.5 GB | ~1.5 GB | N/A | ~1.5 GB |
| **BM25 replacement** | ✅ Sparse mode replaces rank-bm25 | ❌ Needs separate BM25 | ❌ Needs separate BM25 | ❌ |
| **FlagEmbedding support** | ✅ `BGEM3FlagModel` since Jan 2024 | ✅ | ❌ | ✅ |
| **Cost** | Free (local) | Free (local) | $0.13/M tokens | Free (local) |

---

## Why BGE-M3 is Best Fit

### The 512-token limit is a hard blocker for this domain

A typical Grade 4 applied math problem (word problem with multiple steps, diagram description, solution walkthrough, and teacher annotation) routinely exceeds 512 tokens. With bge-large-zh-v1.5, the KB chunker would be forced to split problem+solution pairs across chunks, breaking semantic coherence and degrading retrieval recall.

BGE-M3's 8,192-token window fits even complex multi-step problems as a single chunk.

### Three retrieval modes eliminate a dependency

BGE-M3's built-in sparse retrieval (token-level weighted lexical matching) is semantically aware — it outperforms traditional BM25 on Chinese benchmarks (MIRACL, MKQA). This removes `rank-bm25` and reduces the dependency footprint while improving retrieval quality.

The ColBERT (multi-vector) mode provides fine-grained late-interaction scoring, which is useful for the homework grading step where exact problem matching matters.

### Self-hosted avoids per-query cost and data privacy concerns

Student homework data should not leave the local environment. An API-based embedding (OpenAI) would require sending all KB content and student queries to a third party.

---

## Trade-offs

| Trade-off | Mitigation |
|-----------|-----------|
| BGE-M3 sparse inference is slower than classic BM25 | Precompute sparse vectors at ingest time; store as sparse matrix alongside dense vectors |
| ~11 GB RAM for full CPU deployment | Use `fp16` precision; batch encode at ingest; inference-time model stays loaded in process memory |
| Multilingual model may underperform ZH-only bge-large-zh-v1.5 on purely Chinese corpora | Benchmark at PHASE-002 with a 20-query eval set; fall back to bge-large-zh-v1.5 if recall@5 drops >5% |
| FlagEmbedding `BGEM3FlagModel` API differs from sentence-transformers | Wrap in `bge_m3_encoder.py` with a standard `encode(texts) → embeddings` interface so the rest of the stack is model-agnostic |
