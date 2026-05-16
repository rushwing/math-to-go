#!/usr/bin/env bash
# claim-req.sh — Validate that a REQ is in the correct state for an agent to begin work.
#
# Usage:
#   AGENT_UID=optimizer-001 bash scripts/claim-req.sh REQ-NNN
#   bash scripts/claim-req.sh REQ-NNN optimizer-001     (explicit UID overrides $AGENT_UID)
#
# Environment:
#   AGENT_UID      — registered UID of the calling agent (e.g. optimizer-001)
#   AGENT_REGISTRY — path to registry YAML (default: harness/agent-registry.yml)
#
# Exit 0 = all conditions pass; safe to proceed and claim the task.
# Exit 1 = HARD STOP; reason printed to stderr.
#
# This script is READ-ONLY. It does not modify any files.
# After a successful check, commit the claim:
#   git add tasks/req/REQ-NNN.md
#   git commit -m "claim: REQ-NNN by <uid>"

set -euo pipefail

REQ_ID="${1:-}"
POSITIONAL_UID="${2:-}"  # explicit positional arg takes precedence over $AGENT_UID

REGISTRY="${AGENT_REGISTRY:-harness/agent-registry.yml}"

# ── Argument validation ────────────────────────────────────────────────────────

if [[ -z "$REQ_ID" ]]; then
    echo "Usage: bash scripts/claim-req.sh <REQ-NNN> [uid]" >&2
    echo "  uid may also be supplied via AGENT_UID env var." >&2
    exit 1
fi

if [[ -n "$POSITIONAL_UID" ]]; then
    UID_TO_USE="$POSITIONAL_UID"
elif [[ -n "${AGENT_UID:-}" ]]; then
    UID_TO_USE="$AGENT_UID"
else
    echo "ERROR: No UID supplied. Set AGENT_UID or pass uid as the second argument." >&2
    exit 1
fi

# Validate UID format before using it in regex — only allow role-NNN (e.g. optimizer-001).
if ! [[ "$UID_TO_USE" =~ ^[a-z]+-[0-9]+$ ]]; then
    echo "ERROR: Invalid UID format '${UID_TO_USE}'. Expected: <role>-<digits> (e.g. optimizer-001)." >&2
    exit 1
fi

# ── Registry lookup ────────────────────────────────────────────────────────────

if [[ ! -f "$REGISTRY" ]]; then
    echo "ERROR: Registry not found: $REGISTRY" >&2
    exit 1
fi

# Verify UID is registered (exact match, end-of-line anchored to avoid prefix collisions).
if ! grep -qE "uid:[[:space:]]*${UID_TO_USE}[[:space:]]*$" "$REGISTRY"; then
    echo "ERROR: Unknown UID '${UID_TO_USE}'. Not found in registry: $REGISTRY" >&2
    exit 1
fi

# Extract the handles list for this UID.
# handles: [state1, state2, ...] → space-separated string
HANDLES=$(awk -v uid="$UID_TO_USE" '
    /^[[:space:]]*- uid:/ {
        in_block = ($0 ~ ("uid:[[:space:]]*" uid "[[:space:]]*$"))
    }
    in_block && /handles:/ {
        gsub(/^[[:space:]]*handles:[[:space:]]*/, "")
        gsub(/[\[\]]/, "")
        gsub(/,/, " ")
        gsub(/[[:space:]]+/, " ")
        sub(/^[[:space:]]+/, "")
        sub(/[[:space:]]+$/, "")
        print
        in_block = 0
    }
' "$REGISTRY")

if [[ -z "$HANDLES" ]]; then
    echo "ERROR: No handles found for UID '${UID_TO_USE}' in registry: $REGISTRY" >&2
    exit 1
fi

# ── REQ file validation ────────────────────────────────────────────────────────

REQ_FILE="tasks/req/${REQ_ID}.md"
if [[ ! -f "$REQ_FILE" ]]; then
    echo "HARD STOP: $REQ_FILE not found." >&2
    echo "  Ask Daniel for the correct REQ ID before writing anything." >&2
    exit 1
fi

STATUS=$(awk '/^status:/{print $2; exit}' "$REQ_FILE" | tr -d '"')
OWNER=$(awk '/^owner:/{print $2; exit}' "$REQ_FILE" | tr -d '"')

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

# ── C2: owner matches UID ──────────────────────────────────────────────────────

if [[ "$OWNER" != "$UID_TO_USE" ]]; then
    echo "HARD STOP: $REQ_ID owner is '${OWNER}', not '${UID_TO_USE}'." >&2
    echo "  status : $STATUS" >&2
    echo "  owner  : $OWNER" >&2
    echo "  Do not write any code or content." >&2
    exit 1
fi

# ── C3: status is within this UID's handles ────────────────────────────────────

STATUS_OK=false
for h in $HANDLES; do
    [[ "$h" == "$STATUS" ]] && STATUS_OK=true && break
done

if [[ "$STATUS_OK" == "false" ]]; then
    echo "HARD STOP: $REQ_ID status '$STATUS' is not in '${UID_TO_USE}' handles." >&2
    echo "  handles: $HANDLES" >&2
    echo "  Do not write any code or content." >&2
    exit 1
fi

# ── All checks passed ──────────────────────────────────────────────────────────

echo "OK: $REQ_ID is claimable by ${UID_TO_USE}."
echo "  status : $STATUS"
echo "  owner  : $OWNER"
echo ""
echo "Next step: commit the claim before starting work:"
echo "  git add $REQ_FILE"
echo "  git commit -m \"claim: $REQ_ID by ${UID_TO_USE}\""
