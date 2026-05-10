#!/usr/bin/env bash
# Run all CI gates locally: G1 release-audit, G2 req-coverage, G3 prompt-snapshot, G4 tests, G5 lint.
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$REPO_ROOT"

FAILED=()

run_gate() {
  local label="$1"; shift
  echo ""
  echo "==> [${label}] $*"
  if ! "$@"; then
    FAILED+=("$label")
  fi
}

# G1 — Release audit
run_gate "G1:release-audit" bash scripts/release-audit.sh

# G2 — REQ coverage
run_gate "G2:req-coverage" bash scripts/check-req-coverage.sh

# G3 — Prompt snapshot
run_gate "G3:prompt-snapshot" uv run --directory backend python "$REPO_ROOT/scripts/extract-prompts.py"

# G4 — Backend tests
echo ""
echo "==> [G4:pytest] Running backend tests..."
if ! uv run --directory backend pytest backend/tests \
    --cov=app \
    --cov-fail-under=80 \
    --cov-branch \
    -x \
    --tb=short; then
  FAILED+=("G4:pytest")
fi

# G4 — Frontend tests (skip if no test script defined)
if [[ -f frontend/package.json ]] && grep -q '"test"' frontend/package.json; then
  echo ""
  echo "==> [G4:vitest] Running frontend tests..."
  if ! (cd frontend && npm run test -- --run); then
    FAILED+=("G4:vitest")
  fi
fi

# G5 — mypy
echo ""
echo "==> [G5:mypy] Type checking backend..."
if ! uv run --directory backend mypy app --strict; then
  FAILED+=("G5:mypy")
fi

# G5 — ruff
echo ""
echo "==> [G5:ruff] Linting backend..."
if ! uv run --directory backend ruff check app; then
  FAILED+=("G5:ruff")
fi

# G5 — tsc
if [[ -f frontend/tsconfig.json ]]; then
  echo ""
  echo "==> [G5:tsc] Type checking frontend..."
  if ! (cd frontend && npx tsc --noEmit); then
    FAILED+=("G5:tsc")
  fi
fi

echo ""
if [[ ${#FAILED[@]} -eq 0 ]]; then
  echo "All gates passed."
  exit 0
else
  echo "FAILED gates: ${FAILED[*]}"
  exit 1
fi
