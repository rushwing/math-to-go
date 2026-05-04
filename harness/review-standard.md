---
harness_id: REV-STD-001
component: code-review
owner: daniel
version: "0.1"
status: active
---

# Review Standard

## §1 Scope

Defines what each review type checks, who performs it, and what constitutes BLOCK vs SUGGEST findings. Applies to all review states in the REQ state machine.

---

## §2 Review Types and Ownership

| Review type | REQ state | Reviewer | Author | Artifact |
|------------|-----------|----------|--------|----------|
| Requirement review | `req_review` | Codex | Claude | REQ frontmatter + body |
| TC text review | `tc_review` | Claude | Codex | `tasks/test-cases/TC-NNN-SS.md` |
| TC code review | `tc_impl_review` | Codex | Claude | test files in `backend/tests/` + `frontend/tests/` |
| Implementation review | `req_impl_review` | Codex | Claude | production code in `backend/app/` + `frontend/src/` |
| PR review | `pr_draft` | Human (Daniel) | Codex | GitHub PR diff |

---

## §3 Finding Levels

| Level | Symbol | Meaning | Blocks transition? |
|-------|--------|---------|-------------------|
| BLOCK | 🔴 | Must be resolved before state can advance | Yes |
| SUGGEST | 🟡 | Improvement recommended; author decides | No |
| NOTE | ⚪ | Observation for awareness only | No |

A review is **approved** when zero BLOCK findings remain. SUGGEST and NOTE items may remain open.

---

## §4 Requirement Review Checklist (`req_review`, Codex reviews)

Codex reviews the REQ file body and frontmatter. Each item below is BLOCK unless marked SUGGEST.

**Scope and clarity:**
- [ ] 🔴 Acceptance criterion is a single, verifiable sentence (see REQ-STD §8)
- [ ] 🔴 In Scope / Out of Scope boundary is unambiguous
- [ ] 🔴 No unstated assumptions about external systems or APIs
- [ ] 🟡 Acceptance criterion references a measurable threshold (time, count, rate)

**Feasibility:**
- [ ] 🔴 All `depends_on` REQs or phases are at status `done` or `req_review` or later
- [ ] 🔴 No circular dependencies
- [ ] 🟡 Estimated complexity matches `priority` and phase placement

**Testability:**
- [ ] 🔴 Acceptance criterion can be verified by an automated test (or `tc_policy=exempt` with reason)
- [ ] 🔴 If `tc_policy=required`, at least one TC can be designed before implementation begins
- [ ] 🟡 Edge cases (empty KB, network failure, invalid input) are mentioned

**Alignment:**
- [ ] 🔴 Does not contradict any existing ADR or harness standard
- [ ] 🟡 Consistent with terminology in `harness/GLOSSARY.md`

---

## §5 TC Text Review Checklist (`tc_review`, Claude reviews)

Claude reviews the TC markdown files written by Codex.

**Coverage:**
- [ ] 🔴 Every sentence in the acceptance criterion is covered by at least one TC
- [ ] 🔴 Happy path (normal inputs) has at least one TC
- [ ] 🔴 At least one failure/edge-case TC (empty input, boundary value, error state)
- [ ] 🟡 TC titles are distinct and searchable

**Correctness:**
- [ ] 🔴 TC preconditions are achievable in the test environment
- [ ] 🔴 TC steps are deterministic (same steps always produce same result)
- [ ] 🔴 Expected results are specific (not "should work" or "no error")
- [ ] 🟡 TC does not depend on time, random seeds, or external network unless explicitly mocked

**Format:**
- [ ] 🔴 Each TC uses the template in `tasks/test-cases/TC-template.md`
- [ ] 🔴 `tc_id` matches naming convention `TC-NNN-SS`
- [ ] 🔴 TC file is committed to `main` before PR is opened

---

## §6 TC Code Review Checklist (`tc_impl_review`, Codex reviews)

Codex reviews the test implementation written by Claude.

**Correctness:**
- [ ] 🔴 Each TC file has a corresponding test function or Playwright spec
- [ ] 🔴 Tests fail for the right reason when the implementation is absent (tests are not vacuously passing)
- [ ] 🔴 Mocks and fixtures match the real interface contract
- [ ] 🔴 No `pytest.skip` or `test.skip` without a linked issue

**Quality:**
- [ ] 🔴 Tests are independent (no shared mutable state between test cases)
- [ ] 🟡 Fixture setup is in `conftest.py` (backend) or a shared `fixtures.ts` (frontend), not duplicated
- [ ] 🟡 Test names follow the pattern `test_<what>_<condition>_<expected_outcome>`

**Coverage:**
- [ ] 🔴 `pytest --cov` report shows ≥ 80% branch coverage for the module under test
- [ ] 🟡 Frontend component tests cover all interactive states (loading, error, success)

---

## §7 Implementation Review Checklist (`req_impl_review`, Codex reviews)

Codex reviews the production code written by Claude.

**Correctness:**
- [ ] 🔴 All tests from `test_case_ref` pass (`./scripts/local/test.sh`)
- [ ] 🔴 No new `mypy --strict` errors in changed files
- [ ] 🔴 `ruff check` passes on changed files
- [ ] 🔴 No hardcoded paths, secrets, or localhost URLs in production code
- [ ] 🔴 API contract matches what `docs/architecture-overview.md` and CLAUDE.md describe

**Design:**
- [ ] 🔴 No new dependency added without a corresponding ADR or explicit approval
- [ ] 🔴 AgentState fields follow per-node ownership rules (ADR-007)
- [ ] 🟡 New functions have clear names; no one-letter variables outside list comprehensions
- [ ] 🟡 No code duplication that could be extracted to an existing utility

**Security:**
- [ ] 🔴 No user input passed directly to shell commands, SQL queries, or `eval()`
- [ ] 🔴 Image uploads validated for MIME type and size before processing

**Prompt changes:**
- [ ] 🔴 If any system prompt changed: `eval/prompts-snapshot.md` was updated (`scripts/extract-prompts.py --update`)

---

## §8 PR Review Checklist (human, Daniel)

**Before approving merge:**
- [ ] All CI gates pass (green)
- [ ] REQ acceptance criterion is demonstrably met (run the acceptance test manually if needed)
- [ ] No `pending_bugs` remain open on the REQ
- [ ] PR description explains the "why", not just the "what"
- [ ] `design-change-protocol.md` was followed if any design artifact changed

**Merge:**
- Set REQ `status: done`, archive to `tasks/archive/done/REQ-NNN.md`
- Commit: `archive: REQ-NNN done`

---

## §9 Review Comment Format

```
[BLOCK] <file>:<line> — <problem statement>
  Why: <why this blocks the transition>
  Fix: <concrete suggestion>

[SUGGEST] <file>:<line> — <suggestion>
```

For TC text reviews (no file:line), use TC ID instead:

```
[BLOCK] TC-NNN-SS — Expected result is ambiguous
  Why: "should return correct answer" is not verifiable
  Fix: "should return { correct: true, answer: '3x=9' }"
```
