#!/usr/bin/env bash
# Start all dev services: Neo4j + ChromaDB (Docker) + FastAPI(:8000) + Frontend(:5173).
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$REPO_ROOT"

# Load env
if [[ -f .env ]]; then
  set -a; source .env; set +a
fi

cleanup() {
  echo ""
  echo "==> Shutting down..."
  kill "$BACKEND_PID" "$FRONTEND_PID" 2>/dev/null || true
  docker compose -f docker-compose.dev.yml down
}
trap cleanup EXIT INT TERM

echo "==> Starting Docker services (Neo4j + ChromaDB)..."
docker compose -f docker-compose.dev.yml up -d

echo "==> Waiting for Neo4j to be ready..."
for i in $(seq 1 30); do
  if docker exec math-to-go-neo4j-dev wget -qO- http://localhost:7474 &>/dev/null; then
    echo "    Neo4j ready."
    break
  fi
  sleep 2
  if [[ $i -eq 30 ]]; then
    echo "ERROR: Neo4j did not become ready." >&2
    exit 1
  fi
done

echo "==> Waiting for ChromaDB to be ready..."
for i in $(seq 1 20); do
  if curl -sf http://localhost:8001/api/v1/heartbeat &>/dev/null; then
    echo "    ChromaDB ready."
    break
  fi
  sleep 2
  if [[ $i -eq 20 ]]; then
    echo "ERROR: ChromaDB did not become ready." >&2
    exit 1
  fi
done

echo "==> Starting FastAPI backend (port 8000)..."
cd "$REPO_ROOT/backend"
uv run python -m app.main &
BACKEND_PID=$!
cd "$REPO_ROOT"

echo "==> Starting frontend dev server (port 5173)..."
cd "$REPO_ROOT/frontend"
npm run dev &
FRONTEND_PID=$!
cd "$REPO_ROOT"

echo ""
echo "All services running:"
echo "  FastAPI  → http://localhost:8000/docs"
echo "  Frontend → http://localhost:5173"
echo "  Neo4j    → http://localhost:7474"
echo "  ChromaDB → http://localhost:8001"
echo ""
echo "Press Ctrl+C to stop."

wait "$BACKEND_PID" "$FRONTEND_PID"
