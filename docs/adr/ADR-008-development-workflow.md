# ADR-008: Development Workflow — Requirements State Machine + CI/CD

## Status

Proposed

---

## Context

math-to-go is built by a human (Daniel) working with AI agents (Claude Code). Without a structured workflow, task state is ambiguous, quality gates are inconsistent, and LLM prompt changes can drift silently.

Three reference implementations were studied:

| Repo | Key pattern | What we adopt |
|------|-------------|---------------|
| `hydro-om-copilot` | 7-state machine, frontmatter YAML, `check_req_coverage.py` | State machine shape, frontmatter schema |
| `open-workhorse` | 9-state machine, bug-clean gate, prompt snapshot auditing, keep-alive watchdog | Simplified state machine, 5 CI gates, prompt snapshot |
| `everything_openclaw` | File-based FSM, per-agent SOUL.md, activity-based team | SOUL.md pattern for agent persona |

---

## Decision

### Requirements state machine (7 states)

```
draft → review_ready → ready → test_designed → in_progress → review → done
                                      ↓               ↓            ↓
                                   blocked ←───────────────────────┘
```

| State | Meaning | Who sets it |
|-------|---------|-------------|
| `draft` | Being written; not ready for agent work | Daniel |
| `review_ready` | Daniel has reviewed scope; ready for TC design | Daniel |
| `ready` | TC design done; ready for implementation | Agent |
| `test_designed` | Test cases written and linked | Agent |
| `in_progress` | Implementation underway | Agent |
| `review` | PR open; awaiting Daniel's review | Agent |
| `done` | PR merged + all linked bugs closed | Daniel |
| `blocked` | Waiting on external dependency | Either |

### REQ file frontmatter schema

All requirement files live in `tasks/req/REQ-NNN.md` with this frontmatter:

```yaml
---
req_id: REQ-001
title: "BGE-M3 hybrid retrieval pipeline"
status: draft           # draft|review_ready|ready|test_designed|in_progress|review|done|blocked
priority: high          # high|medium|low
phase: PHASE-002
owner: unassigned       # daniel|claude|unassigned
depends_on: []          # list of req_ids or phase names
test_case_ref: []       # list of TC-NNN ids
tc_policy: required     # required|optional|exempt
scope: backend          # backend|frontend|harness|docs|fullstack
acceptance: "hybrid_retrieve() returns ranked docs with RRF scores within 500ms P95"
blocked_reason: ""      # required if status == blocked
pending_bugs: []        # list of BUG-NNN ids blocking done transition
---
```

State machine rules enforced by `scripts/check-req-coverage.sh`:
- `in_progress` → `owner` must not be `unassigned`
- `blocked` → `blocked_reason` must be non-empty
- `done` → `pending_bugs` must be empty
- `test_designed` or later → `test_case_ref` must be non-empty (unless `tc_policy: exempt`)

### Bug file frontmatter schema

Bug files live in `tasks/bugs/BUG-NNN.md`:

```yaml
---
bug_id: BUG-001
title: "BGE-M3 sparse weights not normalized"
status: open            # open|in_progress|resolved|closed
severity: high          # critical|high|medium|low
owner: unassigned
linked_req: REQ-002
regression_tc: []       # TC-NNN ids that would catch a recurrence
---
```

### CI/CD quality gates (5 gates, all must pass)

#### Gate 1 — Release audit (`scripts/release-audit.sh`)

Scans for:
- Hardcoded absolute paths (`/Users/danielwong/...`, `/home/...`)
- Hardcoded secrets (API keys, bearer tokens, local auth headers)
- Banned git-tracked directories: `plans/`, `dist/`, `node_modules/`, `coverage/`, `.venv/`
- Missing required files: `README.md`, `.env.example`, `docker-compose.dev.yml`

#### Gate 2 — REQ coverage check (`scripts/check-req-coverage.sh`)

Validates all `tasks/req/REQ-NNN.md` files:
- Required fields present
- Enum values valid (status, priority, scope, tc_policy)
- Dependency references exist (depends_on, test_case_ref, pending_bugs)
- State machine rules (see above)

#### Gate 3 — Prompt snapshot freshness (`scripts/extract-prompts.py`)

**The novel gate.** Extracts all LLM system prompts from `backend/app/` into `eval/prompts-snapshot.md`. CI fails if the snapshot is stale (i.e., any prompt source file changed since last snapshot update).

This makes LLM prompt changes explicit in the PR diff — reviewable alongside code changes. Prevents silent tutoring quality drift.

To update the snapshot:
```bash
python scripts/extract-prompts.py --update
```

#### Gate 4 — Tests (`scripts/local/test.sh`)

```bash
uv run pytest backend/ --cov=backend/app --cov-fail-under=80
uv run mypy backend/app --strict
uv run ruff check backend/
```

#### Gate 5 — Type check + lint

Covered by Gate 4 (`mypy --strict` + `ruff`). Separate CI step for fast fail on type errors before running full test suite.

### Definition of done

A REQ is `done` only when:
1. PR merged to main
2. All `pending_bugs` are `status: closed`
3. All `test_case_ref` tests pass in CI
4. Daniel sets `status: done` and archives to `tasks/archive/done/REQ-NNN.md`

### Directory structure

```
tasks/
  req/          # REQ-NNN.md files (active)
  bugs/         # BUG-NNN.md files (active)
  test-cases/   # TC-NNN.md files
  features/     # FEATURE-template.md
  phases/       # PHASE-000 through PHASE-009 (delivery plans)
  archive/
    done/       # archived REQ + BUG files
scripts/
  check-req-coverage.sh   # Gate 2
  release-audit.sh        # Gate 1
  extract-prompts.py      # Gate 3
  local/
    dev.sh                # start all services
    test.sh               # run all tests (Gates 4+5)
eval/
  prompts-snapshot.md     # auto-generated by Gate 3
```

---

## Consequences

**Scripts to create in PHASE-000:**
- `scripts/release-audit.sh`
- `scripts/check-req-coverage.sh`
- `scripts/extract-prompts.py`

**Ongoing maintenance:**
- Run `python scripts/extract-prompts.py --update` whenever any system prompt is changed
- Archive done REQs so `tasks/req/` stays scannable
- Bug files must be created for all tracked issues (no sticky notes)

**What this does NOT cover (deferred):**
- GitHub Actions CI workflow (deferred until PHASE-000 exit criteria met locally)
- Keep-alive watchdog for long-running agent sessions (from open-workhorse — deferred to PHASE-004+)
- GEPA prompt evolution (deferred to memory/TDD/Eval session)

---

## Alternatives Considered

| Alternative | Why ruled out |
|-------------|---------------|
| Everything-openclaw's file-based FSM (3 states: pending/claimed/done) | Too coarse for multi-phase development work; loses test-designed gate that prevents premature coding |
| Open-workhorse's full 9-state machine | Review-round escalation and Pandas-state-as-lock are multi-agent patterns; math-to-go is single primary agent (Claude Code) + Daniel |
| No formal state machine (ad-hoc CLAUDE.md notes) | Ambiguous task status causes duplicate work and missed quality gates |
| Jira / Linear | External dependency; overkill for a 1-person + 1-AI project; file-based is git-native and agent-readable |
