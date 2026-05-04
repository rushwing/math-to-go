---
harness_id: TEST-STD-001
component: testing
owner: daniel
version: "0.1"
status: active
---

# Testing Standard

## §1 Scope

Defines the test pyramid, toolchain, file conventions, TC lifecycle, and coverage requirements for math-to-go.

---

## §2 Test Pyramid

| Layer | Scope | Backend tool | Frontend tool | Runs in CI |
|-------|-------|-------------|--------------|-----------|
| L1 Unit | Single function/class; all deps mocked | pytest + pytest-mock | vitest + @testing-library/react | ✅ |
| L2 Integration | Real DB/service calls; requires Docker | pytest + docker-compose.test.yml | — | ✅ |
| L3 E2E | Full user flow via browser | — | Playwright (`@playwright/test`) | ✅ |
| L4 Release | Structural checks (paths, secrets, snapshots) | release-audit.sh, check-req-coverage.sh, extract-prompts.py | — | ✅ |

L2 integration tests run against real Neo4j and ChromaDB instances spun up by `docker-compose.test.yml`. They are isolated from the dev environment.

---

## §3 Backend Testing (Python / FastAPI)

### Toolchain

| Tool | Purpose | Config file |
|------|---------|------------|
| `pytest` | Test runner | `backend/pyproject.toml` `[tool.pytest.ini_options]` |
| `pytest-asyncio` | Async FastAPI endpoint tests | `asyncio_mode = "auto"` |
| `pytest-mock` | Mock objects and functions | via `mocker` fixture |
| `pytest-cov` | Coverage reporting | `--cov=backend/app --cov-fail-under=80` |
| `mypy --strict` | Static type checking | `backend/pyproject.toml` `[tool.mypy]` |
| `ruff check` | Linting | `backend/pyproject.toml` `[tool.ruff]` |
| `httpx.AsyncClient` | Test FastAPI routes without running server | via `pytest-asyncio` |

### File conventions

```
backend/
  tests/
    unit/
      agents/         test_*.py — per-node tests (all deps mocked)
      retrieval/      test_*.py
      services/       test_*.py
    integration/
      test_neo4j.py   requires running Neo4j
      test_chroma.py  requires running ChromaDB
    fixtures/
      conftest.py     shared fixtures (fake AgentState, mock KB docs)
      kb_fixtures/    sample KB markdown files for tests
```

Test function naming: `test_<subject>_<condition>_<expected_outcome>`

Example: `test_hybrid_retrieve_empty_kb_returns_empty_list`

### Mock strategy

- **L1 Unit:** mock all external calls (`mocker.patch("backend.app.retrieval.chroma_client.query")`)
- **L2 Integration:** use real Docker services; no mocks
- **LangGraph nodes:** test each node function directly by passing a partial `AgentState` dict, not by running the full graph

### LLM calls in tests

Never call Claude API in tests. Use `mocker.patch` on the Anthropic client to return fixture responses.

```python
# conftest.py
@pytest.fixture
def mock_claude(mocker):
    return mocker.patch(
        "backend.app.utils.anthropic_client.call_claude",
        return_value="mocked response"
    )
```

---

## §4 Frontend Testing (React / TypeScript)

### Toolchain

| Tool | Purpose | Config file |
|------|---------|------------|
| `vitest` | Unit/component test runner | `frontend/vite.config.ts` |
| `@testing-library/react` | Component rendering and interaction | — |
| `@playwright/test` | E2E browser tests | `frontend/playwright.config.ts` |
| `msw` (Mock Service Worker) | Mock backend API calls in unit tests | `frontend/src/mocks/` |

### File conventions

```
frontend/
  src/
    components/
      __tests__/
        ComponentName.test.tsx    vitest unit tests
  tests/
    e2e/
      uc1-review.spec.ts          Playwright E2E per use case
      uc2-generate.spec.ts
      uc3-grade.spec.ts
      uc4-practice.spec.ts
```

### Playwright config

```typescript
// frontend/playwright.config.ts
export default defineConfig({
  testDir: './tests/e2e',
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
  },
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
  },
});
```

E2E tests require both the frontend dev server and backend to be running. In CI, use `docker-compose.test.yml` to start services.

### Mock strategy

- **Component unit tests:** mock API calls with MSW; test component states (loading, error, success, empty)
- **Playwright E2E:** hit the real backend (staging services via docker-compose); no mocks

---

## §5 TC File Format

Test Cases live in `tasks/test-cases/` as structured markdown. Written by Codex in `tc_design` state; reviewed by Claude in `tc_review` state. TC code (actual test implementation) lives in `backend/tests/` and `frontend/tests/`.

```markdown
---
tc_id: TC-001-01
req_id: REQ-001
title: "hybrid_retrieve returns ranked docs for known subtopic"
type: unit            # unit | integration | e2e
scope: backend
status: active        # active | deprecated
---

## Preconditions
- ChromaDB contains at least 3 exercise docs for subtopic `remove_brackets`
- BGE-M3 embedder is initialised

## Steps
1. Call `hybrid_retrieve(query="去括号", filters={"subtopic": "remove_brackets"})`

## Expected Result
- Returns a list of ≥ 3 `RetrievedDoc` objects
- Each doc has `rrf_score > 0`
- List is sorted by `rrf_score` descending
- P95 latency < 500ms (measured via pytest-benchmark)

## Linked Test
`backend/tests/unit/retrieval/test_hybrid_retriever.py::test_hybrid_retrieve_known_subtopic_returns_ranked_docs`
```

TC files are committed to `main` before the PR is opened (so CI can load them without being in the PR diff).

---

## §6 Coverage Requirements

| Layer | Requirement |
|-------|-------------|
| Backend L1 Unit | ≥ 80% branch coverage per module (`--cov-fail-under=80`) |
| Backend L2 Integration | At least 1 integration test per external service (Neo4j, ChromaDB) |
| Frontend Unit | All interactive component states tested (loading, error, empty, success) |
| Frontend E2E | Golden path covered for each of UC-1 through UC-4 |

Coverage is enforced by CI Gate 4. PRs that reduce coverage below the threshold are blocked.

---

## §7 TDD Mandate

Test cases (TC text) must be written and reviewed **before** implementation begins.

State machine enforcement:
- `tc_design` and `tc_review` must complete before `tc_impl`
- `tc_impl` (TC code) must pass `tc_impl_review` before `req_impl`
- Skipping the TC states requires `tc_policy: exempt` with `tc_exempt_reason` in the REQ frontmatter

`tc_policy: exempt` is permitted for: pure documentation REQs, config-only changes, one-line fixes with trivial proof of correctness.

---

## §8 Running Tests Locally

```bash
# All backend tests
./scripts/local/test.sh

# Backend unit only (fast)
uv run pytest backend/tests/unit/ -v

# Backend integration (requires Docker)
docker compose -f docker-compose.test.yml up -d
uv run pytest backend/tests/integration/ -v
docker compose -f docker-compose.test.yml down

# Frontend unit
cd frontend && npm run test

# Frontend E2E (requires dev server + backend)
./scripts/local/dev.sh &
cd frontend && npx playwright test

# Coverage report
uv run pytest backend/ --cov=backend/app --cov-report=html
open backend/htmlcov/index.html
```
