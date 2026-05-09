#!/usr/bin/env bash
# Production build: frontend bundle + backend wheel.
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$REPO_ROOT"

echo "==> Building frontend..."
cd frontend
npm run build
cd "$REPO_ROOT"

echo "==> Building backend wheel..."
cd backend
uv build
cd "$REPO_ROOT"

echo "Build complete."
