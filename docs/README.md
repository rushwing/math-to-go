# math-to-go — Docs

Progressive disclosure navigation. Start at the layer that matches your role.

---

## Who are you?

| I am... | Start here | Then read |
|---------|-----------|-----------|
| New to the project (any role) | [CLAUDE.md](../CLAUDE.md) | This file → `project-scope.md` |
| PM / product owner | [project-scope.md](project-scope.md) | — |
| Architect / tech lead | [architecture-overview.md](architecture-overview.md) | ADR-001 through ADR-008 |
| Backend engineer | [ADR-001](adr/ADR-001-llm-framework.md) · [ADR-007](adr/ADR-007-harness-design.md) | Active phase in `tasks/phases/` |
| Frontend engineer | [Frontend design handoff](../frontend/design/README.md) | PHASE-008 |
| KB contributor | [harness/kb-ingestion-standard.md](../harness/kb-ingestion-standard.md) | [harness/GLOSSARY.md](../harness/GLOSSARY.md) |
| Agent / AI assistant | [CLAUDE.md](../CLAUDE.md) + [ADR-008](adr/ADR-008-development-workflow.md) | Active phase in `tasks/phases/` |

---

## Document Map

### Layer 1 — Project overview

| Doc | What it covers |
|-----|---------------|
| [project-scope.md](project-scope.md) | All 4 use cases (UC-1 to UC-4), KB structure, tech stack summary, UI interaction model |

### Layer 2 — System design

| Doc | What it covers |
|-----|---------------|
| [architecture-overview.md](architecture-overview.md) | System diagram, component table, UC-2 request lifecycle end-to-end |

### Layer 3 — Architecture decisions (ADRs)

| ADR | Decision |
|-----|---------|
| [ADR-001](adr/ADR-001-llm-framework.md) | LangGraph StateGraph as agent orchestration framework |
| [ADR-002](adr/ADR-002-embedding-model.md) | BGE-M3 (8192 tok, dense+sparse+ColBERT) as embedding model |
| [ADR-003](adr/ADR-003-vector-db.md) | ChromaDB (dev) / Qdrant (prod) as vector store |
| [ADR-004](adr/ADR-004-knowledge-graph.md) | Neo4j Community Edition as knowledge graph |
| [ADR-005](adr/ADR-005-retrieval-strategy.md) | BGE-M3 hybrid fusion with RRF as retrieval strategy |
| [ADR-006](adr/ADR-006-vision-ocr.md) | Claude Vision directly for homework grading OCR |
| [ADR-007](adr/ADR-007-harness-design.md) | LangGraph harness extensions: session snapshots, skills library, checkpointer, generator-evaluator, two-graph handoff, fail-closed verification |
| [ADR-008](adr/ADR-008-development-workflow.md) | 7-state requirements machine + CI/CD quality gates |

### Layer 4 — Build guides

| Doc | What it covers |
|-----|---------------|
| [harness/design-change-protocol.md](../harness/design-change-protocol.md) | **Which docs to check/update for each type of design change** |
| [harness/requirement-standard.md](../harness/requirement-standard.md) | REQ frontmatter schema, 11-state machine, agent handoff protocol |
| [harness/review-standard.md](../harness/review-standard.md) | Review checklists per type: req / TC text / TC code / impl / PR |
| [harness/testing-standard.md](../harness/testing-standard.md) | pytest + Playwright pyramid, TDD mandate, TC file format |
| [harness/bug-standard.md](../harness/bug-standard.md) | Bug types, lifecycle, blocking/unblocking protocol |
| [harness/ci-standard.md](../harness/ci-standard.md) | 5 CI gates and how to run them locally |
| [harness/CAPABILITIES.md](../harness/CAPABILITIES.md) | Tool inventory per agent (Claude, Codex, Human) |
| [harness/CONNECTORS.md](../harness/CONNECTORS.md) | Task state, handoff protocol, service endpoints, script interfaces |
| [harness/GLOSSARY.md](../harness/GLOSSARY.md) | Canonical names for all concepts, components, API fields |
| [harness/kb-ingestion-standard.md](../harness/kb-ingestion-standard.md) | KB contribution: chunking rules, metadata schema, doc_id format |
| [frontend/design/README.md](../frontend/design/README.md) | Hi-fi component specs, pixel-level design handoff for PHASE-008 |
| [tasks/phases/](../tasks/phases/) | PHASE-000 through PHASE-009 delivery plans |
