# Architecture Overview

Single-page map of the math-to-go system. Each component links to the ADR that governs it.

---

## System Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        Browser (学生 / 管理员)                    │
│  React 18 + Vite + TypeScript + Tailwind v3 + Zustand           │
│                                                                  │
│  TopNav: [ 年级 ▼ ][ 册 ▼ ][ 单元 ▼ ]  Sidebar: ☑UC-1 ☑UC-2 ☑UC-3 ☑UC-4 │
└─────────────────┬───────────────────────────────────────────────┘
                  │  POST /tutor/run (JSON params)
                  │  GET  /curriculum
                  │  POST /tutor/grade/ocr   (UC-3 step 1)
                  │  POST /tutor/grade/mark  (UC-3 step 2, SSE)
                  ▼
┌─────────────────────────────────────────────────────────────────┐
│                    FastAPI + Uvicorn + sse-starlette             │
│                         backend/app/main.py                     │
│                                                                  │
│  Routes:  /tutor/run  /tutor/grade/ocr  /tutor/grade/mark       │
│           /curriculum                                            │
│  Config:  pydantic-settings (.env)                               │
│  Logging: loguru (per-session)                                   │
└─────────────────┬───────────────────────────────────────────────┘
                  │  invoke / astream_events
                  ▼
┌─────────────────────────────────────────────────────────────────┐
│                   LangGraph StateGraph Layer                     │
│                         (ADR-001, ADR-007)                       │
│                                                                  │
│  review_graph    ──────────────────────────────► SSE stream     │
│  exercise_graph  ──[ generator → evaluator loop ]──► SSE stream │
│  ocr_graph       ──────────────────────────────► OCR artifact   │
│  mark_graph      ──[ load artifact → grade ]───► SSE stream     │
│  practice_graph  ──[ SqliteSaver checkpoint ]──► SSE stream     │
│                                                                  │
│  Shared AgentState: session_id, student_profile, skills_context │
└──────┬──────────────────────────────┬───────────────────────────┘
       │  hybrid retrieve             │  graph traverse
       ▼                              ▼
┌──────────────┐             ┌────────────────────┐
│  ChromaDB    │             │  Neo4j Community   │
│  (dev)       │             │  Edition 5.x       │
│  Qdrant      │             │  (ADR-004)         │
│  (prod)      │             │                    │
│  (ADR-003)   │             │  Nodes: Topic,     │
│              │             │  Concept, Skill,   │
│  BGE-M3      │             │  Problem, Mistake  │
│  dense+sparse│             │                    │
│  +ColBERT    │             │  Cypher via        │
│  RRF fusion  │             │  langchain-neo4j   │
│  (ADR-002,   │             │  (ADR-005)         │
│   ADR-005)   │             └────────────────────┘
└──────────────┘
       │  image_base64 (UC-3 only)
       ▼
┌──────────────────────────────┐
│  Claude claude-sonnet-4-6    │
│  200K ctx, native vision     │
│  (ADR-006)                   │
│                              │
│  UC-1: generate HTML notes   │
│  UC-2: generate + verify     │
│  UC-3: OCR + grade           │
│  UC-4: interactive Q&A       │
└──────────────────────────────┘
```

---

## Component Table

| Component | Role | ADR | Key file(s) |
|-----------|------|-----|-------------|
| React frontend | Structured UI (no free-text chat) | — | `frontend/src/App.tsx` |
| FastAPI | HTTP layer, SSE streaming | — | `backend/app/main.py` |
| LangGraph StateGraph | Agent orchestration, conditional routing, loops | ADR-001, ADR-007 | `backend/app/agents/graph.py` |
| AgentState | Shared TypedDict flowing through all nodes | ADR-007 | `backend/app/agents/state.py` |
| BGE-M3 | 8192-tok embedding (dense + sparse + ColBERT) | ADR-002 | `backend/app/retrieval/embedder.py` |
| ChromaDB (dev) | Zero-config vector store, SQLite-backed | ADR-003 | `backend/app/retrieval/vector_store.py` |
| Qdrant (prod) | Distributed vector store, hybrid retrieval | ADR-003 | `backend/app/retrieval/vector_store.py` |
| RRF fusion | Combines dense + sparse retrieval scores | ADR-005 | `backend/app/retrieval/fusion.py` |
| Neo4j | Knowledge graph (prerequisites, skill links) | ADR-004 | `backend/app/graph/neo4j_client.py` |
| Claude Vision | OCR + homework grading (UC-3) | ADR-006 | `backend/app/agents/nodes/ocr_node.py` |
| SqliteSaver | Cross-session checkpointer (UC-4 Ebbinghaus) | ADR-007 | `backend/app/agents/checkpointer.py` |
| Student profile snapshots | Frozen session memory injected at start | ADR-007 | `backend/app/memory/student_profile.py` |
| Skills library | Teaching pattern docs retrieved per misconception | ADR-007 | `harness/skills/` |

---

## Request Lifecycle — UC-2 Exercise Generation

Concrete end-to-end trace showing how a typical request flows through all layers.

```
1. Student selects: [ 四年级 ][ 下册 ][ 认识方程 ] → subtopic: "remove_brackets", count: 10
   Frontend state: activeAction = 'drill' is UC-4 only; this is 'generate'

2. POST /tutor/run
   Body: { "action": "generate", "grade": 4, "term": 2,
           "unit": "equations", "subtopic": "remove_brackets",
           "count": 10, "strict": false }

3. FastAPI route handler
   - Loads student profile snapshot (STUDENT_PROFILE.md for this student)
   - Calls get_compiled_graph("exercise_graph")
   - Invokes graph.astream_events(initial_state, version="v2")

4. exercise_graph execution
   Node: query_parse
     - Builds retrieval filter: { knowledge_type: "exercise", subtopic: "remove_brackets" }

   Node: hybrid_retrieve (BGE-M3 + ChromaDB + RRF)
     - dense query → top-K embeddings
     - sparse query → BGE-M3 sparse weights
     - RRF merge → ranked exercise docs
     - SSE event: { "event": "status", "node": "hybrid_retrieve", "phase": "end" }

   Node: exercise_generator (Claude claude-sonnet-4-6)
     - Generates 10 problems following KB examples
     - SSE events: { "event": "token", "text": "..." } (streaming)

   Node: exercise_evaluator (Claude claude-sonnet-4-6, separate context)
     - Rubric: difficulty appropriate? age-appropriate language? unique solution?
     - If score < threshold AND retries < 2: inject critique → back to generator
     - SSE event: { "event": "status", "node": "exercise_evaluator", "phase": "end" }

5. SSE result event
   { "event": "result", "problems": [...], "difficulty_tags": [...] }

6. Frontend renders: numbered problem list + collapsible answer key
```

---

## UC-3 Two-Graph Handoff (Homework Grading)

UC-3 is the one use case with two separate HTTP calls. The OCR result is stored as a structured artifact between calls, not re-derived from LLM context.

```
Step 1:  POST /tutor/grade/ocr
         → ocr_graph: image_ingestion → ocr_extract → confidence_check
         ← SSE: ocr_artifact { problems: [...], confidence: [...] }
         Frontend: GradeConfirmPreview (student confirms OCR is correct)

Step 2:  POST /tutor/grade/mark   (with session_id referencing stored artifact)
         → mark_graph: load_artifact → grade_problems → generate_report
         ← SSE: grading_report { per_problem: [...], summary: "..." }
         Frontend: GradingProgress → GradingReport
```

See [ADR-007](adr/ADR-007-harness-design.md) for why this is a structured artifact handoff rather than a single graph.
