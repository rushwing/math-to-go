---
harness_id: REV-STD-001
component: code-review
owner: daniel
version: "0.1"
status: active
---

# Review Standard

## §1 Scope

Defines how reviews are planned, what each review type checks, who performs it, and what constitutes BLOCK vs SUGGEST findings. Applies to all review states in the REQ state machine.

The review goal is breadth first, then depth: find the full actionable risk surface in one pass whenever practical, rather than stopping after the first obvious defect.

---

## §2 Review Types and Ownership

| Review type | REQ state | Reviewer | Author | Artifact |
|------------|-----------|----------|--------|----------|
| Requirement review | `req_review` | Codex | Claude | REQ frontmatter + body |
| TC text review | `tc_review` | Claude | Codex | `tasks/test-cases/TC-NNN-SS.md` |
| TC code review | `tc_impl_review` | Codex | Claude | test files in `backend/tests/` + `frontend/tests/` |
| Implementation review | `req_impl_review` | Codex | Claude | GitHub draft PR diff (`gh pr review`) |
| PR review | `pr_draft` | Human (Daniel) | Claude | GitHub PR (converted from draft to ready by Codex at T13) |

---

## §3 Finding Levels

| Level | Symbol | Meaning | Blocks transition? |
|-------|--------|---------|-------------------|
| BLOCK | 🔴 | Must be resolved before state can advance | Yes |
| SUGGEST | 🟡 | Improvement recommended; author decides | No |
| NOTE | ⚪ | Observation for awareness only | No |

A review is **approved** when zero BLOCK findings remain. SUGGEST and NOTE items may remain open.

---

## §4 Review Methodology

Community baseline: this project follows the spirit of Google's code review guidance (design, functionality, complexity, tests, naming, comments, style, documentation, every line/context) and GitLab's MR acceptance checklist model (quality, performance, reliability, security, observability, maintainability). The local rules below adapt those practices to the math-to-go harness.

References:
- Google Engineering Practices, code review guide: https://google.github.io/eng-practices/review/
- Google Engineering Practices, what reviewers look for: https://google.github.io/eng-practices/review/reviewer/looking-for.html
- GitLab Code Review Guidelines: https://docs.gitlab.com/development/code_review/

### Step 0 - Classify the PR Before Judging It

Every review starts by identifying two things:

1. **PR type** - one or more of:
   - `bootstrap/scaffold`: creates project shape, conventions, placeholders, initial docs.
   - `harness`: changes REQ state machine, CI gates, scripts, agent protocols.
   - `docs/design`: ADRs, phase plans, architecture docs, design handoff.
   - `backend`: FastAPI, LangGraph, retrieval, KG, grading, persistence.
   - `frontend`: Vite/React UI, state, API integration, accessibility.
   - `kb/data`: curriculum, KB markdown, metadata, ingestion artifacts.
   - `release/ops`: Docker, env, local scripts, CI/CD, deployment.
2. **Maturity mode**:
   - `proposal`: intent/design only; executable artifacts may be intentionally absent.
   - `scaffold`: creates runnable or navigable starting points, but not full phase exit criteria.
   - `delivery`: claims a REQ/phase acceptance criterion or merge gate is satisfied.

Blocking severity depends on maturity. A missing script is BLOCK for `delivery`; for `proposal` or early `scaffold`, it is BLOCK only if the PR claims the script already runs, creates a fail-closed policy depending on it, or routes users to it as required work. "Routes users" means the missing artifact appears as a required step in `CLAUDE.md` Quick Start / Development Commands, `AGENTS.md` Development Commands, `docs/README.md`, a phase exit criterion, or a CI gate definition. TODO-labelled future work and "will be created" scope lists do not count as routing unless they are also presented as required now.

### Step 1 - Build the Review Map

Before writing findings, collect enough context to avoid tunnel vision:

- PR metadata: title, description, base/head branch, changed files, linked REQs/issues.
- File inventory: new/modified/deleted files, generated files, large lockfiles, binary/assets.
- Declared contract: acceptance criteria, phase exit criteria, ADR decisions, CI gates, public commands, API schemas.
- Local state: current branch, dirty worktree, and whether local files are from the PR or unrelated user work.
- Review scope note: if any area is intentionally not reviewed, state it explicitly.

### Step 2 - Use a Multi-Pass Scan

Run these passes in order. Do not stop at the first finding unless the PR cannot be inspected.

1. **Intent and scope pass** - does the diff match the PR title, description, REQ, phase, and declared maturity?
2. **Contract pass** - are public commands, documented paths, API schemas, env vars, state machine transitions, and templates internally consistent?
3. **Runtime pass** - do claimed commands run, imports resolve, services start, and examples work in a clean checkout?
4. **Test pass** - do tests exist at the right level; do they fail for the right reason; do CI gates actually execute the promised checks?
5. **Security and privacy pass** - secrets, tokens, uploads, shell/SQL execution, auth boundaries, PII, unsafe defaults.
6. **Data and migration pass** - schema compatibility, idempotence, backfills, generated artifacts, lockfiles, vector/KG rebuild implications.
7. **Maintainability pass** - complexity, naming, comments explaining why, duplication, dependency footprint, local conventions.
8. **Documentation drift pass** - every changed user/developer workflow has matching docs; every doc link points to a committed artifact.

### Step 3 - Apply Type-Specific Risk Prompts

| PR type | Extra prompts |
|---------|---------------|
| `bootstrap/scaffold` | Are placeholders clearly labeled? Are "not yet implemented" items distinguishable from working commands? Can a new agent orient without broken links? |
| `harness` | Does the state machine remain deterministic? Are scripts fail-closed? Are role/owner/status tables consistent across `CLAUDE.md`, ADR-008, and harness docs? |
| `docs/design` | Does `design-change-protocol.md` require companion updates? Are examples executable or clearly illustrative? Do phase dependencies still make sense? |
| `backend` | Are async boundaries safe? Are LangGraph state fields owned by one node? Are external calls mocked in tests? Are errors surfaced without leaking internals? If any system prompt in `backend/app/` changed, was `eval/prompts-snapshot.md` updated via `scripts/extract-prompts.py --update`? |
| `frontend` | Are loading/error/empty states covered? Does text fit at mobile widths? Are controls accessible by keyboard and labels? Does API state survive refresh/session boundaries as intended? |
| `kb/data` | Do doc IDs follow the scheme? Is frontmatter complete? Are Chinese curriculum terms canonical per `GLOSSARY.md`? Is ingestion deterministic? |
| `release/ops` | Are ports/envs documented? Are Docker images pinned? Can scripts run from repo root? Are local-only paths and generated directories excluded? |

### Step 4 - Calibrate Findings

Use BLOCK for defects that break the declared contract, make future work unsafe, hide failing verification, leak secrets, corrupt data, or contradict an ADR/harness standard. Use SUGGEST for improvements that reduce future friction but do not block the declared maturity mode. Use NOTE for context the author should know but does not need to act on.

For early `proposal` or `scaffold` PRs, prefer wording like "this becomes blocking once the PR claims delivery" unless the PR text currently promises the behavior.

### Step 5 - Report Completely and Precisely

Findings should be:

- Batched: include all material findings discovered in the pass, ordered by severity.
- Localized: cite the narrowest file/line or TC/REQ ID.
- Causal: explain why the issue matters to the state transition or user/developer workflow.
- Actionable: give a concrete fix or decision needed.
- Verified: mention commands run, commands skipped, and why.

---

## §5 Requirement Review Checklist (`req_review`, Codex reviews)

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

## §6 TC Text Review Checklist (`tc_review`, Claude reviews)

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

## §7 TC Code Review Checklist (`tc_impl_review`, Codex reviews)

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

## §8 Implementation Review Checklist (`req_impl_review`, Codex reviews)

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

## §9 PR Review Checklist (human, Daniel)

Start with §4. Then apply this checklist according to maturity mode.

**Proposal / scaffold readiness:**
- [ ] PR description states what is intentionally working now vs deferred
- [ ] Broken or future commands are not presented as required next steps
- [ ] Placeholders are labeled and have an owning phase or follow-up REQ
- [ ] Navigation links only point to committed files, or are clearly marked future

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

## §10 Review Record Placement

| Content | Where |
|---------|-------|
| Review findings (BLOCK / SUGGEST / NOTE), inline diff comments, discussion threads | **PR comment** — use GitHub's native review interface; supports diff context and threading |
| Optimizer's responses to findings | **PR comment** — reply in the same thread or a new comment |
| REQ file (`tasks/req/REQ-NNN.md`) | Spec changes only (updated ACs, TCs, scope text) + frontmatter state fields (`status`, `owner`, `review_round`) + a **one-row addition** to the Review History table at the bottom |

**Review History table** (append one row per round at the bottom of the REQ file):

```markdown
# Review History
| Round | Verdict | 主要变更 |
|-------|---------|---------|
| 1 | Changes requested | 新增 AC10/TC-009（显式参数路径）；AC6 补 daniel |
| 2 | Approved | — |
```

Rationale: REQ files are specification + state-machine documents. Embedding full review dialogue bloats them and obscures the spec. GitHub PR comments are designed for review conversation and persist in the PR thread for audit.

---

## §11 Review Comment Format

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
