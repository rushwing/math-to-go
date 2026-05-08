#!/usr/bin/env bash
# Canonical enum values for the requirement state machine (ADR-008 / requirement-standard.md §3-4).
# SOURCE OF TRUTH: check-req-coverage.sh sources this file.
# Keep in sync with requirement-standard.md §3 (frontmatter schema) and §4 (state machine).

# REQ status values — see requirement-standard.md §4 State Machine
REQ_VALID_STATUSES=(
  draft
  req_review
  tc_design
  tc_review
  tc_impl
  tc_impl_review
  req_impl
  req_impl_review
  pr_draft
  done
  blocked
)

# REQ owner values
REQ_VALID_OWNERS=(
  claude
  codex
  daniel
  unassigned
)

# REQ tc_policy values
REQ_VALID_TC_POLICIES=(
  required
  optional
  exempt
)

# REQ priority values
REQ_VALID_PRIORITIES=(
  P0
  P1
  P2
  P3
)

# BUG status values — see bug-standard.md
BUG_VALID_STATUSES=(
  open
  in_progress
  blocked
  resolved
  closed
)

# Helper: check if value is in array
# Usage: in_array "$value" "${MY_ARRAY[@]}"
in_array() {
  local val="$1"; shift
  local item
  for item in "$@"; do
    [[ "$item" == "$val" ]] && return 0
  done
  return 1
}
