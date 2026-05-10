#!/usr/bin/env bash
# G2: REQ coverage — validate frontmatter and state machine for all REQ + BUG files.
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

ERRORS=()

# Source canonical enum values from harness — single source of truth
source "$REPO_ROOT/harness/req-constants.sh"

# Build regex alternatives from arrays for grep -E
join_pipe() { local IFS='|'; echo "$*"; }
VALID_REQ_STATUSES=$(join_pipe "${REQ_VALID_STATUSES[@]}")
VALID_OWNERS=$(join_pipe "${REQ_VALID_OWNERS[@]}")
VALID_BUG_STATUSES=$(join_pipe "${BUG_VALID_STATUSES[@]}")

extract_field() {
  local file="$1" field="$2"
  # Extract value from YAML frontmatter (between --- delimiters); strip leading/trailing whitespace and quotes
  awk "/^---/{p++} p==1 && /^${field}:/{sub(/^${field}:[[:space:]]*/,\"\"); gsub(/^[\"']|[\"']$/,\"\"); print; exit}" "$file"
}

check_req_file() {
  local f="$1"
  local id; id=$(basename "$f" .md)

  for field in req_id title status owner; do
    local val; val=$(extract_field "$f" "$field")
    if [[ -z "$val" ]]; then
      ERRORS+=("$id: missing required field '$field'")
    fi
  done

  local status; status=$(extract_field "$f" "status")
  if [[ -n "$status" ]] && ! echo "$status" | grep -qE "^(${VALID_REQ_STATUSES})$"; then
    ERRORS+=("$id: invalid status '$status'")
  fi

  local owner; owner=$(extract_field "$f" "owner")
  if [[ -n "$owner" ]] && ! echo "$owner" | grep -qE "^(${VALID_OWNERS})$"; then
    ERRORS+=("$id: invalid owner '$owner'")
  fi

  # blocked → blocked_reason must be non-empty
  if [[ "$status" == "blocked" ]]; then
    local reason; reason=$(extract_field "$f" "blocked_reason")
    if [[ -z "$reason" ]]; then
      ERRORS+=("$id: status=blocked but blocked_reason is empty")
    fi
  fi

  # done → pending_bugs must be empty / absent
  if [[ "$status" == "done" ]]; then
    local pending; pending=$(extract_field "$f" "pending_bugs")
    if [[ -n "$pending" && "$pending" != "[]" && "$pending" != '""' ]]; then
      ERRORS+=("$id: status=done but pending_bugs is non-empty: $pending")
    fi
  fi

  # test_case_ref files must exist
  local tc_ref; tc_ref=$(extract_field "$f" "test_case_ref")
  if [[ -n "$tc_ref" && "$tc_ref" != "[]" && "$tc_ref" != '""' ]]; then
    # Simple: extract TC-NNN references
    while IFS= read -r tc; do
      tc=$(echo "$tc" | tr -d '[],"'"'"' ')
      [[ -z "$tc" ]] && continue
      if [[ ! -f "tasks/test-cases/${tc}.md" ]]; then
        ERRORS+=("$id: test_case_ref '$tc' not found in tasks/test-cases/")
      fi
    done <<< "$(echo "$tc_ref" | tr ',' '\n')"
  fi
}

check_bug_file() {
  local f="$1"
  local id; id=$(basename "$f" .md)

  for field in bug_id title status linked_req; do
    local val; val=$(extract_field "$f" "$field")
    if [[ -z "$val" ]]; then
      ERRORS+=("$id: missing required field '$field'")
    fi
  done

  local status; status=$(extract_field "$f" "status")
  if [[ -n "$status" ]] && ! echo "$status" | grep -qE "^(${VALID_BUG_STATUSES})$"; then
    ERRORS+=("$id: invalid bug status '$status'")
  fi

  local linked; linked=$(extract_field "$f" "linked_req")
  if [[ -n "$linked" ]]; then
    if [[ ! -f "tasks/req/${linked}.md" ]]; then
      ERRORS+=("$id: linked_req '$linked' not found in tasks/req/")
    fi
  fi
}

echo "==> G2: REQ coverage check"

# Check REQ files
shopt -s nullglob
for f in tasks/req/REQ-*.md; do
  check_req_file "$f"
done

# Check BUG files (skip templates — only match BUG-NNN.md with digit IDs)
for f in tasks/bugs/BUG-[0-9]*.md; do
  check_bug_file "$f"
done

# Orphan TC check: each TC must reference a valid REQ (skip templates)
for f in tasks/test-cases/TC-[0-9]*.md; do
  local_id=$(basename "$f" .md)
  req_id=$(extract_field "$f" "req_id")
  if [[ -n "$req_id" && ! -f "tasks/req/${req_id}.md" ]]; then
    ERRORS+=("$local_id: req_id '$req_id' not found in tasks/req/")
  fi
done
shopt -u nullglob

if [[ ${#ERRORS[@]} -eq 0 ]]; then
  echo "    REQ coverage check passed."
  exit 0
else
  echo "    FAILED — ${#ERRORS[@]} issue(s):"
  for e in "${ERRORS[@]}"; do
    echo "      ✗ $e"
  done
  exit 1
fi
