# Design Change Protocol

When a design decision is introduced or changed, use this protocol to find every artifact that needs updating. Missing an update here is the most common source of doc drift and agent confusion.

**How to use:** Identify the change type(s) below. For each, run the grep commands to find affected files, then apply the update checklist. A change can trigger multiple types.

---

## Change Types

### 1. New ADR (or ADR superseded / amended)

**Always update:**
- `docs/README.md` — add or update the row in the ADR table (Layer 3)
- The ADR itself — if superseding, add `Supersedes: ADR-NNN` to the new ADR and add `Status: Superseded by ADR-NNN` to the old one

**Check if affected:**
```bash
# Find phase docs that reference the component or technology the ADR governs
grep -rl "<component_name>" tasks/phases/
# Find any harness standard that references the same area
grep -rl "<component_name>" harness/
```
- `docs/architecture-overview.md` — if the ADR introduces a new component or changes the system diagram
- `CLAUDE.md` — Key Architecture Decisions section (one-line summary per major tech choice)
- `tasks/phases/PHASE-NNN.md` — any phase that implements the ADR's subject

---

### 2. API Contract Changed

Applies when: endpoint path, HTTP method, request params, response schema, or SSE event shape changes.

**Always update:**
- `docs/project-scope.md` — pipeline description for the affected use case
- `CLAUDE.md` — UI Interaction Model JSON example (if request params changed)

**Check if affected:**
```bash
# Find all docs that mention the endpoint path
grep -rl "<endpoint_path>" docs/ tasks/ harness/ CLAUDE.md
# Find phase docs for the implementing phase
grep -rl "<endpoint_path>\|<param_name>" tasks/phases/
```
- `docs/architecture-overview.md` — request lifecycle section (UC-2 or UC-3 examples)
- `tasks/phases/PHASE-NNN.md` — In Scope section lists the endpoint; Exit Criteria may reference it
- `frontend/design/README.md` — if the frontend calls this endpoint

---

### 3. New Tech Component Added or Renamed

Applies when: a new library, service, or architectural layer is introduced (e.g., adding Redis, renaming a graph node, adding a new LangGraph extension).

**Always update:**
- `docs/architecture-overview.md` — ASCII diagram + component table (add row or rename)
- `CLAUDE.md` — Key Architecture Decisions section if it's a tech stack–level choice

**Check if affected:**
```bash
# Find all uses of the old name
grep -rl "<old_component_name>" docs/ tasks/ harness/ CLAUDE.md frontend/
```
- `docs/README.md` — only if a new harness doc was created
- `harness/GLOSSARY.md` — add canonical name and definition for new components
- New ADR if the component represents a tech stack decision (see Change Type 1)
- `tasks/phases/PHASE-NNN.md` — any phase that builds or uses the component

---

### 4. Phase Scope Changed

Applies when: a phase's In Scope, Out of Scope, Exit Criteria, or Dependencies change.

**Always update:**
- The phase file itself (`tasks/phases/PHASE-NNN.md`)
- `CLAUDE.md` — Phase Status table if the phase title or status changed

**Check if affected:**
```bash
# Find phases that depend on the changed phase
grep -rl "phase-N" tasks/phases/   # replace N with the changed phase number
```
- Downstream phase docs — if their `Dependencies` section references the changed phase, verify the dependency assumption still holds
- ADRs that the phase implements — if scope changed because an ADR was updated (see Change Type 1)

---

### 5. KB Schema Changed

Applies when: frontmatter fields are added/removed/renamed in KB docs, doc types change, or the doc_id scheme changes.

**Always update:**
- `docs/project-scope.md` — YAML Frontmatter Schema section
- `harness/kb-ingestion-standard.md` — contribution guidelines
- `harness/GLOSSARY.md` — if new knowledge types or field names introduced
- `scripts/validate_kb.py` — validation logic must reflect new schema (implementation task)

**Check if affected:**
```bash
grep -rl "frontmatter\|doc_id\|knowledge_type\|review_count\|mastered" docs/ harness/ tasks/
```
- `tasks/phases/PHASE-001.md` — KB ingestion phase
- `tasks/phases/PHASE-007.md` — Ebbinghaus fields live in mistake doc frontmatter

---

### 6. LLM Prompt Changed

Applies when: any system prompt, node prompt, or few-shot example in `backend/app/` is modified.

**Always update:**
```bash
# Regenerate the prompt snapshot — CI Gate 3 will fail if this is skipped
python scripts/extract-prompts.py --update
git add eval/prompts-snapshot.md
```

**Check if affected:**
- `harness/skills/` — if the prompt change was motivated by a recurring tutoring pattern, consider capturing it as a skill doc
- `docs/adr/ADR-007-harness-design.md` — if the prompt change reflects a new harness design decision

> CI Gate 3 (`scripts/extract-prompts.py`) will block merge if the snapshot is stale. Running the command above is the fix.

---

### 7. Frontend Component Added, Renamed, or Removed

Applies when: a React component is created, renamed, split, or deleted.

**Always update:**
- `frontend/design/README.md` — component spec and handoff notes

**Check if affected:**
```bash
grep -rl "<ComponentName>" CLAUDE.md tasks/phases/ docs/
```
- `CLAUDE.md` — UI Interaction Model section references some component names
- `tasks/phases/PHASE-008.md` or `PHASE-009.md` — In Scope lists components by name

---

### 8. Harness Standard Changed

Applies when: `harness/requirement-standard.md`, `harness/testing-standard.md`, `harness/review-standard.md`, or `harness/ci-standard.md` changes.

**Always update:**
- `docs/README.md` — Layer 4 doc map description for the changed standard

**Check if affected:**
- `docs/adr/ADR-008-development-workflow.md` — if the change contradicts the workflow ADR, update the ADR or document the deviation
- `scripts/check-req-coverage.sh` — if requirement frontmatter schema changed (implementation task)
- Any REQ files in `tasks/req/` that violate the new schema

---

## Quick Reference Matrix

| Change type | docs/README | architecture-overview | CLAUDE.md | Phase docs | ADR | harness/ | prompts-snapshot |
|-------------|:-----------:|:---------------------:|:---------:|:----------:|:---:|:--------:|:----------------:|
| New ADR | ✅ always | check | check | check | ✅ always | check | — |
| API contract | — | check | ✅ always | check | — | — | — |
| New component | check | ✅ always | ✅ always | check | maybe | GLOSSARY | — |
| Phase scope | — | — | title/status | ✅ always | — | — | — |
| KB schema | — | — | — | check | — | ✅ always | — |
| LLM prompt | — | — | — | — | check | maybe | ✅ always |
| Frontend component | — | — | check | ✅ always | — | — | — |
| Harness standard | ✅ always | — | — | — | check | ✅ always | — |

---

## Integration with Review Standard

Before opening a PR that contains a design change, an agent or developer must:

1. Identify all triggered change types from the table above
2. Run the grep commands for each type to find affected files
3. Update every "always update" artifact
4. Make a judgement call on each "check if affected" artifact — update or leave a note in the PR description explaining why it was skipped

A PR reviewer should reject a design-change PR if any "always update" artifact was not touched.
