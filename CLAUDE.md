# math-to-go — Agent Workspace

## Project

Agentic RAG + Knowledge Graph math tutoring system for Chinese elementary students. Currently scoped to Grade 4 Term 2 — Equations Unit.

## HARD STOP — Before Writing Any Code or Content

Before producing any deliverable (code, document, script, task file) for a requirement:

```bash
bash scripts/claim-req.sh REQ-NNN claude
```

**If the script exits non-zero: stop. Do not write anything. Report the status to Daniel.**

The script verifies:
1. The REQ file exists
2. `owner: claude` in the frontmatter
3. `status` is one of `req_review | tc_review | tc_impl | req_impl`

You may only write deliverables when all three pass. If you receive a task without a REQ ID, ask Daniel for it before starting. The only exception is PHASE-000 (which creates the harness itself — no REQs exist yet).

Full protocol: `harness/requirement-standard.md §0`

## Quick Links

| Resource | Path |
|----------|------|
| **Docs index (start here)** | `docs/README.md` |
| **Ontology Glossary** | `harness/GLOSSARY.md` |
| Project Scope | `docs/project-scope.md` |
| Architecture Overview | `docs/architecture-overview.md` |
| Tech Stack ADRs | `docs/adr/` |
| Phase Plan | `tasks/phases/` |
| KB Structure | `knowledge_base/docs/` |
| Curriculum Tree | `knowledge_base/curriculum/bnu_curriculum.yaml` |
| Harness Standards | `harness/` |
| **Frontend Design Handoff** | `frontend/design/README.md` |

## Phase Status

| Phase | Title | Status |
|-------|-------|--------|
| PHASE-000 | 平台工程与 Harness | **active** |
| PHASE-001 | KB 基础建设（Schema + Ingest + Neo4j）| draft |
| PHASE-002 | BGE-M3 混合检索管道 | draft |
| PHASE-003 | 知识图谱构建 | draft |
| PHASE-004 | Agent 核心 + UC-1 复习 | draft |
| PHASE-005 | UC-2 练习题生成 | draft |
| PHASE-006 | UC-3 作业批改 + Vision | draft |
| PHASE-007 | UC-4 错题 + 艾宾浩斯 | draft |
| PHASE-008 | 前端 UI — 学生界面 + 登录页 | draft |
| PHASE-009 | 管理后台 | draft |

## PHASE-000 Deliverables (current work)

The following are NOT yet created — this is what PHASE-000 must produce:

**Harness standards** (write to `harness/`):
- `requirement-standard.md` — REQ file format for features/bugs
- `testing-standard.md` — pytest + tsc + ruff coverage expectations
- `review-standard.md` — code review criteria
- `ci-standard.md` — CI pipeline rules

**Scripts** (write to `scripts/`):
- `scripts/local/env-setup.sh` — first-time setup (uv, npm, Docker pull)
- `scripts/local/dev.sh` — start FastAPI(:8000) + Frontend(:5173) + Neo4j(:7474) + ChromaDB
- `scripts/local/build.sh` — production build
- `scripts/local/test.sh` — pytest + `tsc --noEmit` + ruff lint
- `scripts/local/ingest.sh` — wrapper for ingest_kb.py
- `scripts/validate_kb.py` — validate KB frontmatter (all required fields, doc_id format, subtopic matches YAML)
- `scripts/ingest_kb.py` — KB markdown → BGE-M3 vectors → ChromaDB
- `scripts/build_kg.py` — KB docs → Neo4j nodes/relationships
- `scripts/convert_images.py` — `knowledge_base/raw/` images → KB markdown (Claude Vision)

**Docker Compose**:
- `docker-compose.dev.yml` — ChromaDB + Neo4j Community 5.x (fixed tags)
- `docker-compose.prod.yml` — Qdrant + Neo4j Community 5.x

**Backend scaffold**:
- `backend/pyproject.toml` — uv project, all deps pinned
- `backend/app/config.py` — pydantic-settings, reads from `.env`
- `backend/app/main.py` — FastAPI app factory
- Stub `__init__.py` files in all `backend/app/` subdirectories

**Frontend scaffold**:
- `frontend/package.json`, `vite.config.ts`, `tsconfig.json`, `tailwind.config.ts`
- `frontend/src/main.tsx`, `frontend/src/App.tsx` (skeleton only)

**Task templates** (write to `tasks/`):
- `tasks/features/FEATURE-template.md`
- `tasks/bugs/BUG-template.md`
- `tasks/test-cases/TC-template.md`

Exit criteria for PHASE-000: `scripts/local/dev.sh` starts all 4 services without error; `scripts/local/test.sh` runs and passes on an empty test suite.

## Development Commands

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

- **LLM**: Claude claude-sonnet-4-6 (vision-capable, 200K context)
- **Embedding**: BAAI/bge-m3 (8192 tok, dense + sparse + ColBERT)
- **Vector DB**: ChromaDB (dev) / Qdrant (prod)
- **Knowledge Graph**: Neo4j Community Edition 5.x
- **Agent Framework**: LangGraph StateGraph
- **Package managers**: `uv` (backend), `npm` (frontend)
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

## UI Interaction Model

**No free-text chat box.** Login → role-based redirect → structured dropdowns + checkboxes:

```
[ Login: 学生 | 管理员 ]   ← role-based routing

TopNav: [ UserAvatar ] [ 数学助手 ] [ 年级 ▼ ] [ 册 ▼ ] [ 单元 ▼ ] [ 开始 ]
Sidebar: ☑ 📚 复习   ☑ 📝 练习   ☑ 📷 批改   ☑ 💪 夯实
```

Backend receives structured JSON params, not NLP text:
```json
{ "action": "review|generate|grade|mistake_practice",
  "grade": 4, "term": 2, "unit": "equations",
  "subtopic": "remove_brackets", "count": 10, "strict": false }
```

UC-3 grading uses a two-step API: `POST /tutor/grade/ocr` (OCR + confirm) → `POST /tutor/grade/mark` (SSE grading).

Curriculum tree source: `knowledge_base/curriculum/bnu_curriculum.yaml` → served via `GET /curriculum`.

Frontend store uses `activeAction: 'drill'` for UC-4; maps to API `action: 'mistake_practice'` on submit.

## 4 Use Cases

| UC | 触发方式 | 输出 |
|----|---------|------|
| UC-1 复习 | 勾选「复习」→ 点击开始 | Three-Color Notes HTML（可打印）|
| UC-2 生成 | 勾选「练习」→ 选题目数+主题+模式 | 题目列表 + 折叠答案 |
| UC-3 批改 | 勾选「批改」→ 上传作业图片 | 逐题批改报告（kb_match / inferred）|
| UC-4 错题 | 勾选「夯实」→ 点击开始 | 艾宾浩斯逐题练习 + 会话汇总 |

## Harness Standards

Already written:
- `harness/design-change-protocol.md` — **which docs to check/update for each type of design change**
- `harness/requirement-standard.md` — REQ file format and 11-state machine (Claude ↔ Codex ↔ Human)
- `harness/review-standard.md` — review checklists per type (req / TC text / TC code / impl / PR)
- `harness/testing-standard.md` — pytest + Playwright pyramid; TDD mandate; TC file format
- `harness/bug-standard.md` — bug types, lifecycle, blocking/unblocking protocol
- `harness/ci-standard.md` — 5 CI gates (release-audit / req-coverage / prompt-snapshot / tests / lint)
- `harness/CAPABILITIES.md` — tool inventory per agent (Claude, Codex, Human)
- `harness/CONNECTORS.md` — task state, handoff protocol, service endpoints, script interfaces
- `harness/GLOSSARY.md` — shared ontology (canonical names for all concepts, components, API fields)
- `harness/kb-ingestion-standard.md` — KB contribution guidelines
