# ADR-007: Harness Design — LangGraph Extensions

## Status

Proposed

---

## Context

ADR-001 established LangGraph StateGraph as the agent orchestration framework. This ADR extends that decision with the specific harness patterns needed for math-to-go's 4 use cases.

math-to-go has requirements that hydro-om-copilot (the reference implementation) does not have:

| Requirement | Source UC | hydro-om-copilot? |
|-------------|-----------|-------------------|
| Cross-session student memory | UC-4 (Ebbinghaus) | No |
| Reusable teaching patterns | All | No |
| Two-phase grading with artifact handoff | UC-3 | No |
| Generated exercise quality loop | UC-2 | No |
| Fail-closed answer verification | UC-1, UC-2 | No |

Three sources informed this decision:
- **hydro-om-copilot** (`~/Dev/hydro-om-copilot`): reference LangGraph+SSE implementation
- **Anthropic harness blog** (https://www.anthropic.com/engineering/harness-design-long-running-apps): structured handoff, generator-evaluator, context anxiety mitigation
- **NousResearch/hermes-agent**: frozen session snapshots, procedural skills library, fail-closed verification, GEPA prompt evolution

---

## Decision

### Base pattern (from hydro-om-copilot)

All four use-case graphs share the same foundation:

- `StateGraph` compiled to a singleton at FastAPI `lifespan`
- `AgentState` TypedDict with explicit per-node field ownership
- `astream_events(version="v2")` → SSE event types: `status / token / result / error`
- Each node returns only the fields it modifies; LangGraph merges via `operator.add` for list fields

### Extension 1 — Frozen session snapshots (from Hermes Agent)

Hermes Agent injects memory as a frozen snapshot at session start and only updates it at session end. This bounds context size regardless of session history depth.

For math-to-go, maintain two markdown files per student:

```
backend/data/students/{student_id}/
  STUDENT_PROFILE.md   (~500 tokens)  # math level, recurring misconceptions, learning style
  SESSION_NOTES.md     (~800 tokens)  # notes from previous sessions only (not current)
```

Both files are injected into the system prompt once at session start. SESSION_NOTES.md is updated at session end via a `session_close` node.

The profile files are human-readable so a teacher or parent can edit them directly.

### Extension 2 — Teaching skills library (from Hermes Agent)

Hermes stores reusable workflows as structured skill documents. For math-to-go, maintain a `harness/skills/` directory of teaching pattern docs retrieved per detected misconception type:

```
harness/skills/
  socratic-algebra.md          # when student is stuck on equation setup
  worked-example-with-error.md # when student makes a sign error
  negative-number-intro.md     # scaffolded approach for negative subtraction
  bracket-removal-scaffold.md  # step-by-step for distributive property
```

Each skill doc schema:
```markdown
---
skill_id: SKILL-001
trigger: sign_error_bracket_removal
subtopic: remove_brackets
difficulty: medium
---
## When to Use
## Procedure (step by step)
## Pitfalls
## Verification (how to confirm student understood)
```

Skills are retrieved by the `skills_retrieve` node using BGE-M3 hybrid search on the misconception context, then injected into the LLM's prompt alongside KB content. Successful tutoring sequences should be captured as new skill docs via the KB ingestion pipeline.

### Extension 3 — `SqliteSaver` checkpointer for UC-4

UC-4 (Ebbinghaus spaced repetition) requires persistent state between HTTP requests within and across sessions. The LangGraph `SqliteSaver` (or `AsyncSqliteSaver`) checkpointer persists the `practice_graph` thread between calls.

Thread ID: `{student_id}:{unit_id}` (e.g. `u42:G4T2.EQ`)

```python
from langgraph.checkpoint.sqlite.aio import AsyncSqliteSaver

async with AsyncSqliteSaver.from_conn_string("backend/data/checkpoints.db") as checkpointer:
    practice_graph = build_practice_graph().compile(checkpointer=checkpointer)
```

API contract:
```
GET  /tutor/practice          → load Ebbinghaus schedule from checkpoint
POST /tutor/practice/submit   → grade responses → update schedule → persist checkpoint
```

The Ebbinghaus schedule fields (`review_count`, `next_review_date`, `ebbinghaus_interval`, `mastered`) live in the KB mistake doc frontmatter and are updated in-place after each practice session.

### Extension 4 — Generator-evaluator loop for UC-2

A single LLM call cannot reliably produce Grade-4-appropriate problems. Add a self-evaluating loop capped at 2 retries (from Anthropic's harness blog generator-evaluator pattern):

```
exercise_generator
      │
      ▼
exercise_evaluator  ──(score ≥ threshold or retries ≥ 2)──► SSE result
      │
      └─(score < threshold, retries < 2)──► inject critique as structured context
                                                 │
                                                 ▼
                                          exercise_generator (retry)
```

The evaluator checks: (1) difficulty matches requested level, (2) language is age-appropriate for Grade 4, (3) problem has a unique deterministic solution. The critique is injected as structured context (not conversation history) to avoid context bloat. This mirrors UC-2's existing "verifier step" from project-scope.md — the generator-evaluator pattern is how that verifier is implemented.

### Extension 5 — Two-graph structured artifact handoff for UC-3

Per Anthropic's principle of "structured handoffs over lossy context compression": the OCR result from step 1 must not be re-derived from context in step 2. Store it as a structured JSON artifact.

- **`ocr_graph`** (`POST /tutor/grade/ocr`): `image_ingestion → ocr_extract → confidence_check` → stores OCR artifact in a session-scoped dict keyed by `session_id` → SSE `ocr_artifact` event
- **`mark_graph`** (`POST /tutor/grade/mark`): `load_ocr_artifact → grade_problems → generate_report` → SSE grading stream

The artifact store is a simple `dict[str, OcrArtifact]` in FastAPI app state (scoped to the process lifetime). Sessions expire after 30 minutes. No Redis dependency in v1.

### Extension 6 — Fail-closed answer verification (from Hermes Agent)

"No agent verifies its own work." For UC-1 (knowledge review) and UC-2 (exercise generation), a separate LLM context verifies correctness before the response is returned.

If verification fails: the agent returns a worked example instead of committing the answer.

Quality gate checks:
1. Algebraic correctness via `sympy` (symbolic math library)
2. Pedagogical clarity rubric (no unexplained leaps)
3. Factual consistency with KB source docs

For UC-1 HTML notes: verification checks that all rules/definitions in the output match the retrieved KB docs (no hallucinated constraints).

---

## Graph Topology Summary

| Use case | Graph | Persistence | Special pattern |
|----------|-------|-------------|-----------------|
| UC-1 Knowledge Review | `review_graph` | frozen session snapshot | fail-closed verification |
| UC-2 Exercise Generation | `exercise_graph` | frozen session snapshot | generator-evaluator loop |
| UC-3 Homework Grading | `ocr_graph` + `mark_graph` | session artifact store (dict) | structured two-graph handoff |
| UC-4 Mistake Practice | `practice_graph` | `AsyncSqliteSaver` checkpointer | Ebbinghaus cross-session |
| All | shared | `STUDENT_PROFILE.md` + `SESSION_NOTES.md` | frozen snapshot injection |

---

## Consequences

**Added dependencies:**
- `aiosqlite` (for `AsyncSqliteSaver`)
- `sympy` (for algebraic verification in Extensions 4 + 6)

**Latency impact:**
- Extension 4 (generator-evaluator): +2-4s P99 on UC-2 (evaluator call + optional retry)
- Extension 6 (fail-closed verification): +1-2s on UC-1 and UC-2

**Operational complexity:**
- `checkpoints.db` is a local SQLite file — must be backed up or persisted to a volume in production
- Skills library (`harness/skills/`) requires curation; it starts empty and grows as tutoring sessions accumulate

---

## Alternatives Considered

| Alternative | Why ruled out |
|-------------|---------------|
| Hermes Agent full adoption | No LangGraph integration; adds 5-7 weeks of harness re-implementation; overkill for a single-subject tutoring system |
| GEPA evolutionary prompt optimization | Deferred to memory/TDD/Eval session — requires trajectory collection infrastructure not yet built |
| Pure async task queues (Celery/ARQ) | No graph-native SSE streaming; loses conditional routing and loop support from ADR-001 |
| Single graph for all 4 UCs | UC-3's two-step flow and UC-4's checkpointer semantics are incompatible in a single graph |
