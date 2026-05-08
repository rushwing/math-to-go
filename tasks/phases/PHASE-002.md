---
phase_id: phase-2
title: BGE-M3 混合检索管道
status: draft
priority: P1
---

## Goal

实现基于 BGE-M3 的混合检索管道：dense（语义）+ sparse（词法）双路并行，RRF 融合排序，BGE-reranker-v2-m3 精排。封装为可被 Agent 节点调用的 `HybridRetriever` 接口，支持 corpus 过滤和 frontmatter 元数据过滤。

## In Scope

- `backend/app/rag/bge_m3_encoder.py`：`BGEM3FlagModel` 包装器，统一 `encode_dense / encode_sparse / encode_colbert` 接口
- `backend/app/rag/hybrid_retriever.py`：dense + sparse 双路检索 + RRF 融合 + reranker 精排
- `backend/app/rag/vectorstore.py`：ChromaDB / Qdrant 抽象（`VECTOR_STORE_TYPE` 环境变量切换）
- `backend/app/rag/chunker.py`：MarkdownHeaderTextSplitter + 表格感知切片（适配 KB 文档结构）
- Corpus 过滤：`knowledge`（concept + heuristic）/ `practice`（exercise + mistake）
- Metadata 过滤：grade / term / unit / subtopic / difficulty 组合过滤
- 20 条评测查询集（覆盖四用例），recall@5 基准测试脚本

## Out of Scope

- Agent 图结构（属 PHASE-004）
- 知识图谱检索（属 PHASE-003）
- ColBERT 模式（仅 UC-3 需要，属 PHASE-006）

## Exit Criteria

- `HybridRetriever.aretrieve(query, corpus, filters)` 异步接口通过单元测试
- 20 条评测查询在 `knowledge` corpus 的 recall@5 ≥ 0.80
- ChromaDB 和 Qdrant 后端均通过集成测试（各 ≥5 条查询）
- `ruff` + `mypy` 对 `rag/` 模块无报错

## Dependencies

phase-1（KB 文档已入库，BGE-M3 向量已生成）

## Notes

BGE-M3 sparse 向量在 ingest 时预计算并持久化，避免查询时重复推理。如 recall@5 低于 0.80，优先调整 RRF 权重比例，其次考虑降回 bge-large-zh-v1.5 并新增 jieba BM25。
