#!/usr/bin/env bash
# First-time environment setup: uv, npm, Docker images.
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$REPO_ROOT"

echo "==> Checking uv..."
if ! command -v uv &>/dev/null; then
  echo "Installing uv..."
  curl -LsSf https://astral.sh/uv/install.sh | sh
  export PATH="$HOME/.cargo/bin:$PATH"
fi
echo "    uv $(uv --version)"

echo "==> Installing Python dependencies..."
cd backend
uv sync --all-groups
cd "$REPO_ROOT"

echo "==> Checking Node..."
if ! command -v node &>/dev/null; then
  echo "ERROR: Node.js not found. Install via https://nodejs.org or nvm." >&2
  exit 1
fi
echo "    node $(node --version), npm $(npm --version)"

echo "==> Installing frontend dependencies..."
cd frontend
npm install
cd "$REPO_ROOT"

echo "==> Checking Docker..."
if ! command -v docker &>/dev/null; then
  echo "ERROR: Docker not found. Install Docker Desktop." >&2
  exit 1
fi

echo "==> Pulling Docker images..."
docker compose -f docker-compose.dev.yml pull

echo "==> Copying .env.example -> .env (if not present)..."
if [[ ! -f .env ]]; then
  cp .env.example .env
  echo "    Created .env — set ANTHROPIC_API_KEY before running dev.sh"
fi

echo "==> Checking agent identity (AGENT_UID)..."
current_uid=$(grep "^AGENT_UID=" .env 2>/dev/null | cut -d= -f2 || true)
if [[ -n "$current_uid" && "$current_uid" != "optimizer-001" ]]; then
  echo "    AGENT_UID=$current_uid  ✓"
else
  echo "    AGENT_UID=${current_uid:-"(not set)"} — default is optimizer-001 (Claude/optimizer)"
  echo "    Edit .env to match your role (see harness/agent-registry.yml for all UIDs):"
  echo "      evaluator-001  — Codex  (primary evaluator)"
  echo "      evaluator-002  — DeepSeek (backup evaluator)"
  echo "      human-001      — Daniel"
fi

echo ""
echo "Setup complete. Run ./scripts/local/dev.sh to start all services."
