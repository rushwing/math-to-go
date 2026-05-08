---
phase_id: phase-3
title: 知识图谱构建
status: draft
priority: P1
---

## Goal

从 KB 文档中自动提取实体和关系，填充 Neo4j 知识图谱；实现 `GraphRetriever` 节点，使 Agent 可通过 Cypher 查询获取概念先决条件链和错误关联路径，增强向量检索的上下文深度。

## In Scope

- `scripts/build_kg.py`：遍历 KB 文档 frontmatter + 内容 → Claude LLM 抽取实体（Topic/Concept/Skill）和关系 → 写入 Neo4j
- `backend/app/kg/neo4j_client.py`：Neo4j 异步连接池管理
- `backend/app/kg/graph_schema.py`：节点/关系类型定义 + Cypher 建索引语句
- `backend/app/kg/graph_queries.py`：预审查的 Cypher 查询库（先决条件链、错误关联、相关概念）
- `backend/app/agents/graph_retriever.py`：LangGraph 节点，调用 `GraphCypherQAChain` 或直接 Cypher
- 知识图谱可视化：Neo4j Browser 验证节点/关系正确性

## Out of Scope

- 图谱自动更新（新增 KB 文档后需手动重运行 `build_kg.py`，v1 接受此限制）
- Neo4j 向量索引（v1 向量检索仍由 ChromaDB 负责）

## Exit Criteria

- `build_kg.py` 对方程单元文档执行后，Neo4j 中存在 ≥5 个 Concept 节点、≥3 条 `PREREQUISITE_OF` 关系
- `graph_retriever.py` 的 `get_prerequisites(concept_id)` 返回正确的先决条件链（人工验证）
- `GraphCypherQAChain` 对测试查询"学习去括号方程需要哪些前置知识？"返回合理答案
- `mypy` 对 `kg/` 模块无报错

## Dependencies

phase-1（KB 文档和 Neo4j schema 就绪）

## Notes

LLM 生成的 Cypher 需通过 `validate_cypher=True` 校验并使用只读 Neo4j 用户执行，防止意外写操作。`graph_queries.py` 中的固定 Cypher 模板优先于动态生成，仅在无法覆盖的查询场景才启用 GraphCypherQAChain。
