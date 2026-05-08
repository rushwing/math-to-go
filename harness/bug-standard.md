---
harness_id: BUG-STD-001
component: bug-management
owner: daniel
version: "0.1"
status: active
---

# Bug Standard

## §1 Scope

Governs how bugs are recorded, classified, linked to REQs, and resolved. All tracked issues — whether discovered by an agent, CI, or a human — must have a `BUG-NNN.md` file.

---

## §2 Bug Types

| bug_type | When triggered | Triggered by | Blocks which REQ state |
|----------|---------------|-------------|----------------------|
| `req_bug` | Codex finds requirement defect in `req_review` | Codex | `req_review` |
| `tc_bug` | Claude finds TC text defect in `tc_review` | Claude | `tc_review` / `tc_design` |
| `impl_bug` | Codex finds code defect in `req_impl_review` | Codex | `req_impl_review` |
| `ci_bug` | CI gate fails on a PR | CI / Codex | `pr_draft` |
| `user_bug` | User reports defect post-merge | Human / user | Does not block (post-`done`) |

---

## §3 Frontmatter Schema

```yaml
---
bug_id: BUG-007
title: "hybrid_retrieve returns unsorted results when ChromaDB returns ties"
bug_type: impl_bug             # req_bug | tc_bug | impl_bug | ci_bug | user_bug
status: open                   # open | confirmed | in_progress | fixed | closed | wont_fix
severity: high                 # critical | high | medium | low
owner: claude                  # claude | codex | daniel | unassigned
linked_req: REQ-002            # REQ that is blocked by this bug
regression_tc: []              # [TC-NNN-SS] — TCs that would catch a recurrence
blocked_reason: ""             # filled if bug itself is blocked
---
```

---

## §4 Bug State Machine

| State | Meaning | Owner |
|-------|---------|-------|
| `open` | Filed; not yet confirmed | unassigned |
| `confirmed` | Root cause identified | claude or codex |
| `in_progress` | Being fixed | claude |
| `fixed` | Fix committed; awaiting review | codex |
| `closed` | Fix reviewed and merged | — |
| `wont_fix` | Intentional non-fix with documented reason | daniel |

### Transition Table

| From | Event | To | Owner after |
|------|-------|-----|-------------|
| `open` | Agent or human identifies root cause | `confirmed` | claude |
| `confirmed` | Claude begins fix | `in_progress` | claude |
| `in_progress` | Fix committed | `fixed` | codex |
| `fixed` | Codex approves fix | `closed` | — |
| `fixed` | Codex rejects fix | `in_progress` | claude |
| `open` / `confirmed` | Daniel decides not to fix | `wont_fix` | daniel |

---

## §5 Blocking a REQ

When a bug blocks a REQ from advancing, update both the BUG file and the REQ file atomically.

**REQ fields to set:**

```yaml
status: blocked
owner: unassigned
blocked_reason: "BUG-007: hybrid_retrieve returns unsorted results"
blocked_from_status: req_impl_review      # the state we were in
blocked_from_owner: codex                  # who was working on it
pending_bugs: [BUG-007]
```

Commit message: `bug-block: REQ-NNN blocked by BUG-NNN`

---

## §6 Unblocking a REQ

When all `pending_bugs` are `closed` or `wont_fix`:

1. Remove the BUG ID from `pending_bugs`
2. If `pending_bugs` is now empty:
   - Restore `status` ← `blocked_from_status`
   - Restore `owner` ← `blocked_from_owner`
   - Clear `blocked_reason`, `blocked_from_status`, `blocked_from_owner`
3. Add a `## Bug History` section to the REQ body noting the bug type, ID, and close date

Commit message: `bug-unblock: REQ-NNN unblocked, BUG-NNN closed`

---

## §7 Regression TCs

For every `severity: high` or `severity: critical` bug, a regression TC must be added before the bug is closed:

1. Create `TC-NNN-SS.md` in `tasks/test-cases/` where NNN = the linked REQ's digits
2. Add the TC ID to `regression_tc` in the BUG file
3. Implement the TC in the test suite (Claude)
4. Add the TC ID to `test_case_ref` in the linked REQ file

---

## §8 Severity Guidelines

| Severity | Criteria |
|----------|---------|
| `critical` | Data loss, security vulnerability, system cannot start |
| `high` | A use case (UC-1 through UC-4) is broken or returns wrong answers to students |
| `medium` | Degraded performance, cosmetic error in grading report, non-golden-path failure |
| `low` | Typo, minor UX inconsistency, log noise |
