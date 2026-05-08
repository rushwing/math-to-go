---
phase_id: phase-0
title: 平台工程与 Harness
status: draft
priority: P0
---

## Goal

建立多模式开发基础设施，使 Agent 和人工开发者能在统一规范下认领、实现、测试和交付需求。包含项目脚手架、CI/CD 框架、Docker 编排以及 Agent 工作空间。

## In Scope

- 项目目录结构与 `.gitkeep` 占位文件
- Harness 治理文档（requirement-standard / testing-standard / review-standard / ci-standard / kb-ingestion-standard）
- 本地开发脚本（env-setup / dev / build / test / ingest）
- Docker Compose（dev：ChromaDB + Neo4j，prod：Qdrant + Neo4j）
- `.env.example` 含所有配置项注释
- `CLAUDE.md` Agent 工作空间入口
- **需求状态机目录结构**（ADR-008）：`tasks/req/`、`tasks/bugs/`、`tasks/test-cases/`、`tasks/archive/done/`
- **CI 质量门禁脚本**（ADR-008）：
  - `scripts/release-audit.sh` — 密钥/路径扫描
  - `scripts/check-req-coverage.sh` — REQ frontmatter + 状态机校验
  - `scripts/extract-prompts.py` — LLM 提示词快照（防止静默漂移）
- `eval/prompts-snapshot.md` — 由 `extract-prompts.py` 生成的提示词快照初始版本
- `tasks/` 目录规范与 REQ / Bug / TC 文档模板（含 ADR-008 规定的 frontmatter schema）

## Out of Scope

- 业务功能实现（属于 PHASE-001 及以上）
- Kubernetes 部署（v1 不需要）
- GitHub Actions CI workflow（本地 5 个质量门禁通过后再配置）

## Exit Criteria

- `scripts/local/dev.sh` 启动 FastAPI（:8000）+ 前端（:5173）+ Neo4j（:7474）+ ChromaDB 无报错
- `scripts/local/test.sh` 执行 pytest + mypy --strict + ruff lint 全部通过（空测试套件视为通过）
- `scripts/release-audit.sh` 在当前仓库执行无报错
- `scripts/check-req-coverage.sh` 对空 `tasks/req/` 执行无报错
- `scripts/extract-prompts.py` 生成 `eval/prompts-snapshot.md` 无报错
- `.env.example` 包含所有 `config.py` 中引用的环境变量
- `CLAUDE.md` 可被 Agent 解析并定位到 `docs/README.md` harness 入口

## Dependencies

无（横切基础设施，无前置业务 phase）

## Notes

此 phase 横跨整个项目生命周期持续维护。Neo4j 使用 Community Edition 5.x；Docker image 固定 tag 以保证可复现。
