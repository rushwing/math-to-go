# CONNECTORS

Runtime bindings — how agents read state, hand off work, and talk to external services.

---

## §1 Task State Connector

Task state is the single source of truth: the `status` and `owner` fields in REQ frontmatter.

| Operation | How | Example |
|-----------|-----|---------|
| Read current state | `cat tasks/req/REQ-NNN.md` | — |
| Claim task | Edit frontmatter, `git commit -m "claim: REQ-NNN by optimizer-001"` | — |
| Advance state | Edit frontmatter, `git commit -m "handoff: REQ-NNN → evaluator-001 (T03)"` | T03: req approved |
| Reject in review | Edit `owner` + `review_round`, `git commit -m "review-reject: REQ-NNN round N"` | T04, T08, T11, T14 |
| Block task | Set `status=blocked`, `blocked_from_*`, append to `pending_bugs` | T17 |
| Unblock task | Restore `status` + `owner` from `blocked_from_*` | T18 |

**Atomicity rule:** Frontmatter update and commit happen in one `git commit`. Never leave the file in an intermediate state without a commit.

---

## §2 Agent Handoff Signal

Math-to-go uses a **semi-manual handoff**: agents update frontmatter and commit, then Daniel opens the next agent session and says "pick up REQ-NNN."

For future automation, agents may write to an inbox directory:

```
tasks/inbox/
  for-claude/
    pending/    envelope files waiting for Claude
    claimed/    claimed by Claude (atomic mv)
    done/       completed
  for-codex/
    pending/
    claimed/
    done/
```

Inbox envelope format (`REQ-NNN-T03.json`):

```json
{
  "req_id": "REQ-NNN",
  "transition": "T03",
  "from_agent": "codex",
  "to_agent": "claude",
  "summary": "Requirement approved. Proceed to tc_design.",
  "timestamp": "2026-05-04T10:00:00Z"
}
```

Claiming an envelope: `mv tasks/inbox/for-claude/pending/REQ-NNN-T03.json tasks/inbox/for-claude/claimed/`

> The inbox system is optional in v1. The frontmatter commit alone is sufficient for the current semi-manual workflow.

---

## §3 Git / GitHub Connector

| Operation | Command | Who uses it | When |
|-----------|---------|------------|------|
| Create feature branch | `git checkout -b feat/REQ-NNN` | Claude | Start of `req_impl` |
| Commit TC files | `git add tasks/test-cases/ && git commit -m "tc-design: TC-NNN"` | Codex | `tc_design` |
| Commit implementation | `git add backend/ && git commit -m "feat: REQ-NNN <title>"` | Claude | During `req_impl` |
| **Open draft PR** | `gh pr create --draft --title "feat: REQ-NNN <title>" --body "..."` | **Claude** | End of `req_impl` (T12) |
| View PR status | `gh pr view <PR_NUMBER> --json statusCheckRollup` | Any agent | Any time |
| Add review comment | `gh pr review <PR_NUMBER> --comment -b "[BLOCK] ..."` | Codex | `req_impl_review` |
| **Convert draft → ready** | `gh pr ready <PR_NUMBER>` | **Codex** | T13 (approval) |
| Check CI status | `gh run list --branch feat/REQ-NNN` | Any agent | Any time |
| Merge PR | GitHub UI or `gh pr merge <PR_NUMBER>` | **Human** | `pr_draft` (T15) |

**PR description template** (Claude fills this at T12, opening the draft PR):

```markdown
## REQ
REQ-NNN — <title>

## Changes
- <bullet per logical change>

## Test evidence
- `./scripts/local/test.sh` passed (all G1–G5 gates)
- All TC-NNN-SS pass: `pytest backend/tests/ -v`
- Coverage: X% (≥ 80%)

## Design change protocol
- [ ] No design artifacts changed
- [ ] OR: followed harness/design-change-protocol.md (list updated files)

## Notes for reviewer
<anything Codex should know: tricky edge cases, deferred items, open questions>
```

---

## §4 Script Connectors

| Script | Invocation | Purpose | Who runs it |
|--------|------------|---------|------------|
| `scripts/local/dev.sh` | `./scripts/local/dev.sh` | Start all 4 services | Human / Claude |
| `scripts/local/test.sh` | `./scripts/local/test.sh` | Run all CI gates locally | Claude before handoff |
| `scripts/local/ingest.sh` | `./scripts/local/ingest.sh` | Ingest KB into ChromaDB | Human / Claude |
| `scripts/release-audit.sh` | `bash scripts/release-audit.sh` | G1 gate | Any agent |
| `scripts/check-req-coverage.sh` | `bash scripts/check-req-coverage.sh` | G2 gate | Any agent |
| `scripts/extract-prompts.py` | `python scripts/extract-prompts.py [--update]` | G3 gate | Claude (on prompt change) |
| `scripts/validate_kb.py` | `uv run python scripts/validate_kb.py` | KB frontmatter check | Claude |

---

## §5 Runtime Service Endpoints

Used by `backend/app/` code and integration tests.

| Service | Dev endpoint | Prod endpoint | Started by |
|---------|-------------|--------------|-----------|
| FastAPI backend | `http://localhost:8000` | — | `scripts/local/dev.sh` |
| Frontend dev server | `http://localhost:5173` | — | `scripts/local/dev.sh` |
| ChromaDB | `http://localhost:8001` | Qdrant cluster | `docker-compose.dev.yml` |
| Neo4j HTTP | `http://localhost:7474` | Neo4j AuraDB | `docker-compose.dev.yml` |
| Neo4j Bolt | `bolt://localhost:7687` | — | `docker-compose.dev.yml` |

Environment variables (all in `.env`, documented in `.env.example`):

```bash
ANTHROPIC_API_KEY=...
CHROMA_HOST=localhost
CHROMA_PORT=8001
NEO4J_URI=bolt://localhost:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=...
LANGCHAIN_TRACING_V2=false        # enable only for debugging
```

---

## §6 External Tool Access

| Tool | Access method | Used by | Required for |
|------|--------------|---------|-------------|
| Anthropic API | `ANTHROPIC_API_KEY` in `.env` | Backend (production calls) | All UC pipelines |
| GitHub | `gh auth login` (human pre-authenticated) | Codex, Claude | PR creation, CI status |
| Docker | Docker Desktop running | Claude | Integration tests, dev services |
| MCP: Gmail | `mcp__claude_ai_Gmail` skill | Claude | Optional: escalation notifications |
| MCP: Google Drive | `mcp__claude_ai_Google_Drive` skill | Claude | Optional: design doc sharing |
