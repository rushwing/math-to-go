---
harness_id: REQ-STD-001
component: requirement-management
owner: daniel
version: "0.1"
status: active
---

# Requirement Standard

## §0 Mandatory Pre-Work Protocol — HARD STOP

**Before writing any code, document, or task artifact for a requirement, an agent MUST verify all three conditions below. If any condition fails, stop immediately and report to Daniel. Do not write anything.**

### Check table

| # | Condition | How to check | Failure action |
|---|-----------|-------------|----------------|
| C1 | REQ file exists | `ls tasks/req/REQ-NNN.md` | Stop. Ask Daniel for the correct REQ ID. |
| C2 | `owner` field matches you | `grep "^owner:" tasks/req/REQ-NNN.md` | Stop. The REQ belongs to another agent. Do not proceed. |
| C3 | `status` is a valid work state for your role | See table below | Stop. The REQ is not ready for your action. Report the status. |

### Valid work states per agent

| Agent | Valid `status` values | Action at each state |
|-------|-----------------------|----------------------|
| **Claude** | `req_review` | Design or revise the requirement text |
| **Claude** | `tc_review` | Review TC text written by Codex |
| **Claude** | `tc_impl` | Implement test cases (code) |
| **Claude** | `req_impl` | Implement the requirement (code) |
| **Codex** | `req_review` | Review the requirement; approve or request changes |
| **Codex** | `tc_design` | Write TC text files in `tasks/test-cases/` |
| **Codex** | `tc_impl_review` | Review TC code written by Claude |
| **Codex** | `req_impl_review` | Review implementation; draft PR on approval |
| **Codex** | `pr_draft` | Open PR via `gh pr create` |

Any other status (`draft`, `blocked`, `done`, `tc_review` with `owner=codex` etc.) means **you are not the current actor — stop**.

### Mechanical check (run before starting)

```bash
AGENT_UID=optimizer-001 bash scripts/claim-req.sh REQ-NNN
# or: bash scripts/claim-req.sh REQ-NNN optimizer-001  (explicit arg)
# exits 0 = OK to proceed and claim
# exits 1 = HARD STOP with reason
```

The script reads the REQ frontmatter, validates C1–C3, and prints the result. It does not modify any files.

### Exception: PHASE-000 scaffolding

PHASE-000 creates the harness itself — no REQ files exist yet. Work in PHASE-000 is exempt from this protocol. All subsequent phases are subject to it.

---

## §1 Scope

Applies to every feature or change delivered in math-to-go. Governs REQ file format, the two-LLM state machine, agent handoff protocol, and blocking rules.

---

## §2 File Location and Naming

```
tasks/
  req/          REQ-NNN.md   (active)
  bugs/         BUG-NNN.md   (active)
  test-cases/   TC-NNN-SS.md (NNN = REQ digits, SS = sequence)
  archive/done/ REQ-NNN.md   (archived after done)
```

REQ IDs are sequential integers, zero-padded to 3 digits: `REQ-001`, `REQ-042`.

---

## §3 Frontmatter Schema

> **Canonical enum values** (status, owner, tc_policy, priority, bug status) are machine-readable in `harness/req-constants.sh` and human-readable in `harness/GLOSSARY.md §13`. The validator (`scripts/check-req-coverage.sh`) sources `req-constants.sh` directly. When adding a new enum value, update `req-constants.sh` first, then this document and GLOSSARY.md §13.

```yaml
---
req_id: REQ-001
title: "BGE-M3 hybrid retrieval pipeline"
status: draft                  # see §4 state machine
owner: unassigned              # optimizer-001 | evaluator-001 | human-001 | unassigned
priority: P1                   # P0 (critical) | P1 | P2 | P3
phase: PHASE-002
scope: backend                 # backend | frontend | harness | docs | scripts | fullstack
tc_policy: required            # required | optional | exempt
tc_exempt_reason: ""           # required if tc_policy=exempt
depends_on: []                 # [REQ-NNN] or [PHASE-NNN]
test_case_ref: []              # [TC-NNN-SS] populated during tc_design
acceptance: "hybrid_retrieve() returns RRF-ranked docs within 500ms P95"
review_round: 0                # increments on each rejection within a review state
pending_bugs: []               # [BUG-NNN] — blocks done transition
blocked_reason: ""             # human-readable; required if status=blocked
blocked_from_status: ""        # status to restore on unblock
blocked_from_owner: ""         # owner to restore on unblock
pr_number: ""                  # GitHub PR number, set at pr_draft
---
```

**Validation rules** (enforced by `scripts/check-req-coverage.sh`):

| Field | Rule |
|-------|------|
| `status=blocked` | `blocked_reason` must be non-empty |
| `status=blocked` | `blocked_from_status` and `blocked_from_owner` must be set |
| `status=done` | `pending_bugs` must be empty |
| `status=tc_impl` or later | `test_case_ref` must be non-empty (unless `tc_policy=exempt`) |
| `tc_policy=exempt` | `tc_exempt_reason` must be non-empty |
| `owner!=unassigned` | required for all states except `draft` and `blocked` |
| `review_round >= 3` | auto-transition to `blocked`, owner → human (escalation) |

---

## §4 State Machine

### State Overview

| State | Phase | Owner (frontmatter) | Meaning |
|-------|-------|---------------------|---------|
| `draft` | Scoping | `human-001` | Requirement idea being sketched; not ready for agent work |
| `req_review` | Req Design | `optimizer-001` or `evaluator-001` | Optimizer designs spec ↔ Evaluator reviews; iterate until approved |
| `tc_design` | TC Design | `evaluator-001` | Evaluator writes test cases as structured text (`TC-NNN-SS.md`) |
| `tc_review` | TC Review | `optimizer-001` or `evaluator-001` | Optimizer reviews TC text ↔ Evaluator revises; iterate until approved |
| `tc_impl` | TC Implementation | `optimizer-001` | Optimizer codes the test cases |
| `tc_impl_review` | TC Code Review | `evaluator-001` | Evaluator reviews test code quality and coverage |
| `req_impl` | Implementation | `optimizer-001` | Optimizer codes the requirement; opens draft PR on completion |
| `req_impl_review` | Code Review | `evaluator-001` | Evaluator reviews the open draft PR; approves or requests changes |
| `pr_draft` | PR Ready | `human-001` | Draft PR converted to ready-for-review; awaiting human merge |
| `done` | Complete | — | PR merged, all bugs closed |
| `blocked` | Blocked | `unassigned` | External dependency or escalation; see §5 |

> **Design-review vs implementation-review distinction:**
> `req_review` and `tc_review` are _design loops_: on failure the state **stays**, only the owner changes (evaluator-001 → optimizer-001 or optimizer-001 → evaluator-001). The "review" state encompasses both authoring and reviewing.
> `tc_impl_review` and `req_impl_review` are _code review gates_: on failure the state **goes back** to the implementation state (the artifact is not complete).
>
> **UID → agent mapping:** see `harness/agent-registry.yml`. Current defaults: `optimizer-001` = Claude claude-sonnet-4-6; `evaluator-001` = Codex; `human-001` = Daniel.

### Transition Table

| # | From | Actor | Event | To | Owner after | review_round |
|---|------|-------|-------|-----|-------------|-------------|
| T01 | `draft` | human-001 | Approves scope; req is ready for design | `req_review` | `optimizer-001` | reset 0 |
| T02 | `req_review` | optimizer-001 | Completes requirement design | `req_review` | `evaluator-001` | — |
| T03 | `req_review` | evaluator-001 | **Approves** requirement | `tc_design` | `evaluator-001` | reset 0 |
| T04 | `req_review` | evaluator-001 | **Requests changes** | `req_review` | `optimizer-001` | +1 |
| T05 | `req_review` | evaluator-001 | Approves + `tc_policy=exempt` | `req_impl` | `optimizer-001` | reset 0 |
| T06 | `tc_design` | evaluator-001 | Completes TC text; all ACs covered | `tc_review` | `optimizer-001` | reset 0 |
| T07 | `tc_review` | optimizer-001 | **Approves** TC design | `tc_impl` | `optimizer-001` | reset 0 |
| T08 | `tc_review` | optimizer-001 | **Requests changes** | `tc_review` | `evaluator-001` | +1 |
| T09 | `tc_impl` | optimizer-001 | Completes TC code; tests runnable | `tc_impl_review` | `evaluator-001` | reset 0 |
| T10 | `tc_impl_review` | evaluator-001 | **Approves** TC code | `req_impl` | `optimizer-001` | reset 0 |
| T11 | `tc_impl_review` | evaluator-001 | **Requests changes** | `tc_impl` | `optimizer-001` | +1 |
| T12 | `req_impl` | optimizer-001 | Completes implementation; tests pass; **opens draft PR** (`gh pr create --draft`) | `req_impl_review` | `evaluator-001` | reset 0 |
| T13 | `req_impl_review` | evaluator-001 | **Approves** implementation; converts draft PR to ready (`gh pr ready`) | `pr_draft` | `human-001` | reset 0 |
| T14 | `req_impl_review` | evaluator-001 | **Requests changes** (via PR review comments) | `req_impl` | `optimizer-001` | +1 |
| T15 | `pr_draft` | human-001 | Merges PR; sets `status=done` | `done` | — | — |
| T16 | any | any | External blocker arises | `blocked` | `unassigned` | — |
| T17 | `blocked` | human-001 | Blocker resolved | `blocked_from_status` | `blocked_from_owner` | — |
| T18 | any review state | — | `review_round ≥ 3` | `blocked` | `human-001` | — |

> **T12 detail:** Claude runs `./scripts/local/test.sh` (all CI gates), then opens a **draft** PR with the standard description template (see `CONNECTORS.md §3`). The draft flag signals the PR is not yet ready for human merge — Codex review must happen first. Opening the draft PR at this point makes the full diff and test evidence visible to Codex in a structured review surface, rather than a flat file diff.
>
> **T13 detail:** Codex approves by running `gh pr ready <PR_NUMBER>` (converts draft → ready for review) and updating the REQ frontmatter. This is the signal to Human that the PR is mergeable.

### State Machine Diagram

```
          human
            │ T01
            ▼
        req_review  ◄──── T04 (evaluator-001 rejects; owner→optimizer-001; +review_round)
   optimizer-001 ↔ evaluator-001
            │ T03 (approved)          T05 (approved + exempt)
            ▼                              │
        tc_design ◄────────────────────────┘  ──► req_impl (see below)
        evaluator-001
            │ T06
            ▼
         tc_review  ◄──── T08 (optimizer-001 rejects; owner→evaluator-001; +review_round)
   optimizer-001 ↔ evaluator-001
            │ T07 (approved)
            ▼
          tc_impl
        optimizer-001
            │ T09
            ▼
      tc_impl_review
        evaluator-001
            │ T10 (approved)     T11 (rejected → back to tc_impl)
            ▼
          req_impl
        optimizer-001
            │ T12: impl done + opens draft PR
            ▼
      req_impl_review
        evaluator-001  (reviews on open draft PR)
            │ T13 (approved + gh pr ready)   T14 (rejected via PR comments → back to req_impl)
            ▼
          pr_draft
         human-001  (draft→ready; awaiting merge)
            │ T15
            ▼
           done

  T16: any state → blocked (external blocker or review_round ≥ 3)
  T17: blocked → blocked_from_status (human-001 resolves)
```

---

## §5 Blocked State Protocol

**Entering blocked:**

```yaml
status: blocked
owner: unassigned
blocked_reason: "Waiting for Neo4j Docker image fix"
blocked_from_status: req_impl          # previous status
blocked_from_owner: optimizer-001      # previous owner
pending_bugs: [BUG-007]               # if bug-triggered
```

Commit message: `block: REQ-NNN blocked — <reason>`

**Exiting blocked (human resolves):**
1. Resolve or close all `pending_bugs`
2. Restore `status` ← `blocked_from_status`, `owner` ← `blocked_from_owner`
3. Clear `blocked_reason`, `blocked_from_status`, `blocked_from_owner`

Commit message: `unblock: REQ-NNN unblocked`

---

## §6 Agent Handoff Protocol

A handoff is complete when the REQ frontmatter is updated AND the receiving agent has been notified.

**Claiming a task (agent → self):**

```bash
# Single commit, atomic claim
git add tasks/req/REQ-NNN.md
git commit -m "claim: REQ-NNN by optimizer-001"
```

**Handing off (agent → agent):**

1. Update `status` and `owner` in REQ frontmatter
2. Commit: `handoff: REQ-NNN → <new_owner> (T<transition_number>)`
3. Signal: for manual workflow, inform Daniel; for automated workflow, write to agent inbox

**Review rejection (agent → same state, new owner):**

```yaml
status: req_review          # unchanged
owner: optimizer-001        # changed back to author
review_round: 1             # incremented
```

Commit message: `review-reject: REQ-NNN round 1 — <summary of changes requested>`

---

## §7 Single-Branch Rule

One shared branch per REQ: `feat/REQ-NNN`. Codex commits TC files; Claude commits implementation and TC code. One PR total.

TC files live on `main` before the PR is open (so CI can load them without being in the PR diff). TC code and implementation are in the PR.

---

## §8 Acceptance Criterion Rules

- One sentence, present tense, verifiable by a test or automated check
- Must reference a specific observable behavior (not "works correctly")
- Good: `hybrid_retrieve() returns ≥ 3 docs ranked by RRF score within 500ms P95`
- Bad: `retrieval works` / `performance is acceptable`
