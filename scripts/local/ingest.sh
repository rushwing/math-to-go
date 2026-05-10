#!/usr/bin/env bash
# Ingest KB markdown docs into ChromaDB vector store.
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$REPO_ROOT"

if [[ -f .env ]]; then
  set -a; source .env; set +a
fi

echo "==> Validating KB frontmatter..."
uv run --directory backend python scripts/validate_kb.py

echo "==> Ingesting KB into ChromaDB..."
uv run --directory backend python scripts/ingest_kb.py "$@"

echo "Ingest complete."
