#!/usr/bin/env bash
# G1: Release audit — scan for secrets, hardcoded paths, and banned tracked dirs.
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

ERRORS=()

# ── Tracked files only (respects .gitignore) ─────────────────────────────────
TRACKED=$(git ls-files)

check_pattern() {
  local label="$1" pattern="$2"
  local hits
  hits=$(echo "$TRACKED" | xargs grep -lP "$pattern" 2>/dev/null || true)
  if [[ -n "$hits" ]]; then
    while IFS= read -r f; do
      ERRORS+=("$label: $f")
    done <<< "$hits"
  fi
}

echo "==> G1: Release audit"

# Absolute paths
check_pattern "absolute-path:/Users/"    '/Users/'
check_pattern "absolute-path:/home/"     '/home/'

# Hardcoded credentials
check_pattern "hardcoded-key:sk-"        '(?<!#)sk-[A-Za-z0-9]'
check_pattern "hardcoded-bearer"         'Bearer [A-Za-z0-9+/=]{20,}'
check_pattern "hardcoded-auth-header"    'Authorization:\s+[A-Za-z]'
check_pattern "local-api-token"          'LOCAL_API_TOKEN=[^${"'"'"'<\s]'

# Banned tracked directories (should be in .gitignore)
for banned in plans dist node_modules .venv coverage __pycache__; do
  if git ls-files | grep -q "^${banned}/"; then
    ERRORS+=("banned-tracked-dir: $banned/")
  fi
done

# Required files
for required in README.md .env.example docker-compose.dev.yml; do
  if [[ ! -f "$REPO_ROOT/$required" ]]; then
    ERRORS+=("missing-required-file: $required")
  fi
done

# Report
if [[ ${#ERRORS[@]} -eq 0 ]]; then
  echo "    Release audit passed."
  exit 0
else
  echo "    FAILED — ${#ERRORS[@]} issue(s):"
  for e in "${ERRORS[@]}"; do
    echo "      ✗ $e"
  done
  exit 1
fi
