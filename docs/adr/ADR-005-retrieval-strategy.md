# ADR-005: Retrieval Strategy

## Decision

Use **BGE-M3 hybrid retrieval (dense + sparse) with RRF fusion**, without a separate Elasticsearch or BM25 server.

---

## Finalists Compared

| Criteria | BGE-M3 Hybrid (selected) | ES + Dense (hybrid) | rank-bm25 + Dense | SQLite FTS5 + Dense |
|----------|--------------------------|--------------------|--------------------|---------------------|
| **Semantic understanding** | ✅ Dense mode | ✅ Dense component | ✅ Dense component | ✅ Dense component |
| **Lexical exact match** | ✅ Sparse mode (semantically aware) | ✅ ES BM25 | ✅ rank-bm25 | ✅ FTS5 |
| **Chinese tokenization** | ✅ Learned — no jieba needed for sparse | ⚠️ ES requires jieba plugin | ✅ jieba required | ✅ jieba required |
| **External server required** | ❌ None | ✅ ES process (~500MB RAM) | ❌ None | ❌ None |
| **ColBERT (fine-grained match)** | ✅ Third mode for exact problem lookup | ❌ | ❌ | ❌ |
| **Metadata filtering** | ✅ ChromaDB `where` clause | ✅ ES filter | ✅ Python post-filter | ✅ SQLite WHERE |
| **Operational complexity** | Low | High | Low | Low |
| **Performance at KB scale (<10K docs)** | ✅ Sufficient | ✅ Overkill | ✅ | ✅ |
| **Benchmarks (MIRACL ZH)** | ✅ BGE-M3 sparse > BM25 | ✅ ES BM25 competitive | ⚠️ Lower recall | ⚠️ Lower recall |

---

## Why BGE-M3 Hybrid is Best Fit

### BGE-M3 sparse outperforms traditional BM25 on Chinese

BGE-M3's sparse retrieval is not bag-of-words — it produces token-level weighted lexical scores via learned projection + ReLU activation. On MIRACL Chinese benchmarks, BGE-M3 sparse achieves higher nDCG@10 than traditional BM25. It handles semantic synonyms (e.g., "求解" vs "算出") that BM25 misses, while still matching exact numerical expressions and formula tokens.

### Three retrieval modes cover all access patterns

- **Dense**: Best for UC-1 (review) where the user asks conceptually ("方程相关知识点")
- **Sparse**: Best for UC-2/UC-3 where the user references a specific subtopic ("去括号")
- **ColBERT (multi-vector)**: Best for UC-3 (homework grading) where we need to match a specific problem extracted from an image to an existing KB problem

A single BGE-M3 encoder handles all three modes — no additional models needed.

### Eliminating ES removes a major operational dependency

Elasticsearch requires a separate JVM process (~500MB RAM), cluster configuration, and a Chinese analyzer plugin (jieba) configured correctly. For a local math tutoring app targeting a single student, this overhead is not justified.

---

## Retrieval Pipeline

```
User query
    │
    ├── BGE-M3 dense embedding   → ChromaDB asimilarity_search(k=10)
    ├── BGE-M3 sparse encoding   → sparse dot-product scores over all docs (k=10)
    │
    ├── Metadata pre-filter      → grade=4, term=2, unit=equations (from intent)
    │
    └── RRF fusion               → rank(dense) + rank(sparse) → top-k candidates
            │
            └── BGE-reranker-v2-m3 cross-encoder → final top-5

Optional for UC-3 (problem lookup):
    └── BGE-M3 ColBERT          → max-sim score vs extracted problem text
```

---

## Trade-offs

| Trade-off | Mitigation |
|-----------|-----------|
| Sparse vector precomputation is slower than BM25 index build | Precompute and cache sparse vectors at ingest time in `ingest_kb.py`; stored alongside dense vectors |
| BGE-M3 sparse has higher inference cost than rank-bm25 at query time | At KB scale (<10K chunks), latency is imperceptible; revisit if KB exceeds 100K chunks |
| If KB grows to millions of docs, ES would be necessary | Architecture is modular — `hybrid_retriever.py` can swap to ES backend behind the `HybridRetriever` interface; see ADR-003 |
| ColBERT scoring requires token-level interaction (slower than dense/sparse) | ColBERT mode only activated for UC-3 homework grading, not the common review/generate paths |
