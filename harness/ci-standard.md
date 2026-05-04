---
harness_id: CI-STD-001
component: ci-cd
owner: daniel
version: "0.1"
status: active
---

# CI Standard

## §1 Scope

Defines the five quality gates that must pass before any PR is merged. All gates run locally via `./scripts/local/test.sh` before opening a PR.

---

## §2 Gate Overview

| # | Gate | Script | Fails on | Blocks merge |
|---|------|--------|----------|-------------|
| G1 | Release audit | `scripts/release-audit.sh` | Hardcoded paths/secrets, banned git-tracked dirs | ✅ |
| G2 | REQ coverage | `scripts/check-req-coverage.sh` | Invalid frontmatter, state machine violations | ✅ |
| G3 | Prompt snapshot | `scripts/extract-prompts.py` | Stale `eval/prompts-snapshot.md` | ✅ |
| G4 | Tests | `scripts/local/test.sh` | Failing tests, coverage < 80% | ✅ |
| G5 | Type check + lint | (part of G4) | `mypy --strict` errors, `ruff check` violations | ✅ |

All gates are **required**. No auto-merge. All PRs require Daniel's approval.

---

## §3 Gate Details

### G1 — Release Audit (`scripts/release-audit.sh`)

Scans the entire working tree for:

| Check | Pattern / rule |
|-------|---------------|
| Absolute macOS paths | `/Users/` anywhere in tracked files |
| Absolute Linux paths | `/home/` anywhere in tracked files |
| Hardcoded API keys | `sk-`, `Bearer `, `Authorization: ` in source files |
| Local auth tokens | `LOCAL_API_TOKEN=` with a non-placeholder value |
| Banned git-tracked dirs | `plans/`, `dist/`, `node_modules/`, `.venv/`, `coverage/`, `__pycache__/` |
| Required files present | `README.md`, `.env.example`, `docker-compose.dev.yml` |

**Remediation:** Remove or replace offending content. Never use `--no-verify` to bypass.

---

### G2 — REQ Coverage (`scripts/check-req-coverage.sh`)

Validates every file in `tasks/req/REQ-NNN.md` and `tasks/bugs/BUG-NNN.md`:

**REQ checks:**
- All required frontmatter fields are present (see REQ-STD §3)
- `status` is a valid enum value
- `owner` is a valid enum value
- `depends_on` references exist (as REQ or PHASE files)
- `test_case_ref` files exist in `tasks/test-cases/`
- State machine rules: `blocked` → `blocked_reason` non-empty; `done` → `pending_bugs` empty
- No orphaned TC files (TCs whose `req_id` has no corresponding REQ)

**BUG checks:**
- Required fields present
- `linked_req` references an existing REQ
- `regression_tc` references existing TC files (if any)

**Failure output:** Prints the REQ/BUG ID and the violated rule; exits non-zero.

---

### G3 — Prompt Snapshot (`scripts/extract-prompts.py`)

Extracts all system prompts and node prompts from `backend/app/` into `eval/prompts-snapshot.md`.

Fails if the snapshot is stale — i.e., any prompt source file was modified more recently than the snapshot.

**To update the snapshot:**

```bash
python scripts/extract-prompts.py --update
git add eval/prompts-snapshot.md
```

This gate makes every LLM prompt change visible in the PR diff, preventing silent tutoring quality drift.

---

### G4 — Tests (`scripts/local/test.sh`)

```bash
# Backend
uv run pytest backend/ \
  --cov=backend/app \
  --cov-fail-under=80 \
  --cov-branch \
  -x           # stop on first failure

# Frontend unit
cd frontend && npm run test -- --run

# Type check
uv run mypy backend/app --strict
cd frontend && npx tsc --noEmit
```

**Failure:** Fix failing tests before opening a PR. Coverage dips below 80% require either adding tests or documenting why coverage is explicitly excluded.

---

### G5 — Lint (part of G4)

```bash
uv run ruff check backend/
cd frontend && npx eslint src/
```

`ruff` replaces flake8 + isort + pyupgrade for Python. ESLint with `@typescript-eslint` for TypeScript.

Auto-fix available:

```bash
uv run ruff check --fix backend/
```

---

## §4 Running All Gates Locally

```bash
./scripts/local/test.sh
```

This script runs G1 through G5 in sequence and exits non-zero on first failure.

Individual gates:

```bash
bash scripts/release-audit.sh
bash scripts/check-req-coverage.sh
python scripts/extract-prompts.py          # check only; exits non-zero if stale
python scripts/extract-prompts.py --update # regenerate snapshot
./scripts/local/test.sh                    # G4 + G5
```

---

## §5 CI Pipeline (GitHub Actions)

> Note: GitHub Actions configuration is deferred until after PHASE-000 exit criteria are met locally. The five gates above are the spec; the workflow file will implement them as parallel jobs.

Planned job structure (`.github/workflows/ci.yml`):

```yaml
jobs:
  release-audit:   # G1
  req-coverage:    # G2
  prompt-snapshot: # G3
  test:            # G4 backend pytest
  type-lint:       # G5 mypy + ruff
  playwright:      # L3 E2E (separate job, triggered on non-draft PRs only)
```

All jobs except `playwright` run on every push. `playwright` runs on PR-ready (non-draft) only, as it requires a live backend.

---

## §6 Branch and Merge Rules

- Branch naming: `feat/REQ-NNN` (shared between Codex TC commits and Claude impl commits)
- Squash merge is not used — preserve commit history for audit
- Force push to `main` is forbidden
- PRs require: all CI jobs green + Daniel approval
