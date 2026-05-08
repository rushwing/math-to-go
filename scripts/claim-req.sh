#!/usr/bin/env bash
# claim-req.sh — Validate that a REQ is in the correct state for an agent to begin work.
#
# Usage: bash scripts/claim-req.sh <REQ-NNN> <agent>
#   agent: claude | codex
#
# Exit 0 = all conditions pass; safe to proceed and claim the task.
# Exit 1 = HARD STOP; prints reason; do not write any code or content.
#
# This script is READ-ONLY. It does not modify any files.
# After a successful check, commit the claim:
#   git commit -m "claim: REQ-NNN by <agent>"

set -euo pipefail

REQ_ID="${1:-}"
AGENT="${2:-}"

# ── Argument validation ──────────────────────────────────────────────────────���─

if [[ -z "$REQ_ID" || -z "$AGENT" ]]; then
    echo "Usage: bash scripts/claim-req.sh <REQ-NNN> <agent>" >&2
    echo "  agent: claude | codex" >&2
    exit 1
fi

if [[ "$AGENT" != "claude" && "$AGENT" != "codex" ]]; then
    echo "ERROR: Unknown agent '$AGENT'. Valid values: claude, codex" >&2
    exit 1
fi

REQ_FILE="tasks/req/${REQ_ID}.md"

# ── C1: REQ file exists ────────────────────────────────────────────────────────

if [[ ! -f "$REQ_FILE" ]]; then
    echo "HARD STOP: $REQ_FILE not found." >&2
    echo "  Ask Daniel for the correct REQ ID before writing anything." >&2
    exit 1
fi

# ── Extract frontmatter fields ─────────────────────────────────────────────────

STATUS=$(awk '/^status:/{print $2; exit}' "$REQ_FILE" | tr -d '"')
OWNER=$(awk  '/^owner:/{print $2; exit}' "$REQ_FILE" | tr -d '"')

if [[ -z "$STATUS" ]]; then
    echo "HARD STOP: Could not read 'status' from $REQ_FILE." >&2
    echo "  The frontmatter may be malformed. Fix it before claiming." >&2
    exit 1
fi

if [[ -z "$OWNER" ]]; then
    echo "HARD STOP: Could not read 'owner' from $REQ_FILE." >&2
    echo "  The frontmatter may be malformed. Fix it before claiming." >&2
    exit 1
fi

# ── C2: owner matches agent ────────────────────────────────────────────────────

if [[ "$OWNER" != "$AGENT" ]]; then
    echo "HARD STOP: $REQ_ID owner is '$OWNER', not '$AGENT'." >&2
    echo "  status : $STATUS" >&2
    echo "  owner  : $OWNER" >&2
    echo "  Do not write any code or content." >&2
    echo "  If you believe this is an error, ask Daniel to update the owner field." >&2
    exit 1
fi

# ── C3: status is a valid work state for this agent ───────────────────────────

VALID=false
case "$AGENT" in
    claude)
        VALID_LIST="req_review tc_review tc_impl req_impl"
        case "$STATUS" in req_review|tc_review|tc_impl|req_impl) VALID=true ;; esac ;;
    codex)
        VALID_LIST="req_review tc_design tc_impl_review req_impl_review pr_draft"
        case "$STATUS" in req_review|tc_design|tc_impl_review|req_impl_review|pr_draft) VALID=true ;; esac ;;
esac

if [[ "$VALID" == "false" ]]; then
    echo "HARD STOP: $REQ_ID status is '$STATUS'." >&2
    echo "  That is not a valid work state for $AGENT." >&2
    echo "  Valid states for $AGENT: $VALID_LIST" >&2
    echo "  Do not write any code or content." >&2
    case "$STATUS" in
        draft)    echo "  Reason: REQ is still being scoped by Daniel." >&2 ;;
        blocked)  echo "  Reason: REQ is blocked. Check pending_bugs and blocked_reason." >&2 ;;
        done)     echo "  Reason: REQ is already done." >&2 ;;
        *)        echo "  Reason: REQ is in another agent's work state." >&2 ;;
    esac
    exit 1
fi

# ── All checks passed ──────────────────────────────────────────────────────────

echo "OK: $REQ_ID is claimable by $AGENT."
echo "  status : $STATUS"
echo "  owner  : $OWNER"
echo ""
echo "Next step: commit the claim before starting work:"
echo "  git add $REQ_FILE"
echo "  git commit -m \"claim: $REQ_ID by $AGENT\""
