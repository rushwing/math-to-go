---
phase_id: phase-1
title: 知识库基础建设
status: draft
priority: P0
---

## Goal

定义并实施知识库（KB）的完整数据模型，包括目录结构、YAML frontmatter schema、文档命名规范、向量入库流水线，以及 Neo4j 知识图谱的初始 schema。完成四年级下册方程单元的首批 KB 文档录入（来自教材截图）。

## In Scope

- KB doc_id 命名规范：`{TYPE}.G{grade}T{term}.{UNIT}.{SEQ:03d}`
- 四种知识类型目录：`concept/` `heuristic/` `exercise/` `mistake/`
- YAML frontmatter schema（通用字段 + mistake 专属 Ebbinghaus 字段）
- `scripts/validate_kb.py`：frontmatter 必填字段校验 + doc_id 唯一性检查
- `scripts/ingest_kb.py`：Markdown → BGE-M3 编码 → ChromaDB 两个 corpus（knowledge / practice）
- `scripts/convert_images.py`：读取 `knowledge_base/raw/*.{png,jpg}` → Claude Vision → KB Markdown 文件
- Neo4j schema 定义：节点类型（Topic / Concept / Skill / Problem / Mistake）+ 关系类型 + 索引
- 四年级下册方程单元首批文档（由 `convert_images.py` 生成后人工审核）

## Out of Scope

- BGE-M3 混合检索管道（属 PHASE-002）
- `scripts/build_kg.py` 知识图谱自动填充（属 PHASE-003）
- 其他年级/学期的 KB 内容

## Exit Criteria

- `validate_kb.py` 对所有已录入文档通过校验（无缺失字段、无重复 doc_id）
- `ingest_kb.py` 成功写入 ChromaDB，两个 corpus 各有 ≥1 个 collection
- 方程单元至少包含：concept ×3、heuristic ×2、exercise ×5、mistake ×2
- Neo4j schema 脚本（`scripts/neo4j_init.cypher`）可在空实例上无错执行

## Dependencies

phase-0（Docker 环境、脚本框架）

## Notes

图片转换脚本优先于手工录入；人工审核转换结果并补充 verified: true。首批文档作为后续 PHASE-002 检索评测的基准集。
