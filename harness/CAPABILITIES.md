# CAPABILITIES

Tool and capability inventory for each agent in the math-to-go development workflow.

---

## Agents

| Agent | Identity | Primary role in workflow |
|-------|----------|--------------------------|
| **Claude** | Claude Code (claude-sonnet-4-6) | Requirement design, TC review, TC implementation, feature implementation |
| **Codex** | OpenAI Codex (code-davinci or equivalent) | Requirement review, TC design, TC code review, implementation review, PR drafting |
| **Human** | Daniel | Scope approval, final merge, escalation resolution |

---

## Claude — Capability Inventory

### File operations
| Capability | Tool | Notes |
|------------|------|-------|
| Read any file | `Read` | Preferred over `cat` |
| Edit file (targeted diff) | `Edit` | Preferred for modifications |
| Write new file | `Write` | Only for new files or full rewrites |
| List / search files | `Bash(find, ls)` | |
| Grep for symbols | `Bash(grep -r)` | |

### Execution
| Capability | Tool | Notes |
|------------|------|-------|
| Run shell commands | `Bash` | All scripts in `scripts/` |
| Run tests | `Bash(./scripts/local/test.sh)` | |
| Run dev server | `Bash(./scripts/local/dev.sh)` | |
| Docker operations | `Bash(docker compose ...)` | |
| Git operations | `Bash(git ...)` | Commit, branch, status, diff |
| GitHub CLI | `Bash(gh ...)` | PR creation, PR view |

### Research
| Capability | Tool | Notes |
|------------|------|-------|
| Fetch web page | `WebFetch` | For official docs and blog posts |
| Search web | `WebSearch` | For community best practices |

### Agent spawning
| Capability | Tool | Notes |
|------------|------|-------|
| Codebase exploration | `Agent(Explore)` | Read-only, parallel; for searching across files |
| Planning | `Agent(Plan)` | Architecture and design decisions |
| General research | `Agent(general-purpose)` | Multi-step research tasks |

### MCP tools (available, use when needed)
| Capability | MCP server | Use case |
|------------|------------|---------|
| Send / read email | `claude_ai_Gmail` | Notify Daniel of escalations (optional) |
| Read calendar | `claude_ai_Google_Calendar` | Check availability for async handoffs (optional) |
| Read / write Drive | `claude_ai_Google_Drive` | Share design docs with Daniel (optional) |

### Skills (invoke via `/skill-name`)
| Skill | When to use |
|-------|------------|
| `claude-api` | Anthropic SDK / prompt caching changes |
| `simplify` | Code review and refactoring pass |
| `update-config` | Claude Code settings changes |
| `fewer-permission-prompts` | Reduce Bash permission prompts |

### Workflow stages where Claude (optimizer-001) is owner
| REQ state | Claude's action |
|-----------|----------------|
| `req_review` (owner=optimizer-001) | Design the requirement; respond to Evaluator review comments |
| `tc_review` (owner=optimizer-001) | Review TC text written by Evaluator; produce BLOCK/SUGGEST findings |
| `tc_impl` (owner=optimizer-001) | Implement TC code; ensure all TC-NNN-SS have corresponding tests |
| `req_impl` (owner=optimizer-001) | Implement the requirement; run `./scripts/local/test.sh`; open draft PR (`gh pr create --draft`) with standard description; then hand off to Evaluator |

---

## Codex — Capability Inventory

### File operations
| Capability | Tool | Notes |
|------------|------|-------|
| Read files | Read / cat | |
| Write / edit files | Write / patch | |
| Run tests | shell execution | |
| Git operations | git CLI | commit, branch, PR |
| GitHub CLI | gh CLI | `gh pr create`, `gh pr review` |

### Workflow stages where Codex (evaluator-001) is owner
| REQ state | Codex's action |
|-----------|---------------|
| `req_review` (owner=evaluator-001) | Review requirement; output BLOCK/SUGGEST list; update REQ owner |
| `tc_design` (owner=evaluator-001) | Write TC markdown files in `tasks/test-cases/`; commit to main |
| `tc_impl_review` (owner=evaluator-001) | Review TC code written by Claude; output BLOCK/SUGGEST |
| `req_impl_review` (owner=evaluator-001) | Review the open draft PR (leave inline comments); output BLOCK/SUGGEST; on approval: run `gh pr ready <PR_NUMBER>`, update REQ `status→pr_draft owner→human-001` |

### What Codex does NOT do
- Does not modify production `backend/app/` code (that is Claude's domain)
- Does not open PRs (Claude opens the draft PR at T12; Codex only converts draft → ready at T13)
- Does not merge PRs (human only)
- Does not approve its own work

---

## Human (Daniel) — Authority Inventory

| Decision | When | Cannot be delegated |
|----------|------|-------------------|
| Approve requirement scope (T01) | `draft` → `req_review` | ✅ |
| Merge PR (T16) | `pr_draft` → `done` | ✅ |
| Resolve escalation (T18/T19) | `blocked` with `review_round ≥ 3` | ✅ |
| `wont_fix` a bug | Any time | ✅ |
| Add `tc_policy: exempt` with reason | REQ design | ✅ |
| Override a BLOCK finding | PR review | ✅ (with documented reason) |

---

## Tool Availability by Workflow Stage

| REQ state | Claude tools active | Codex tools active |
|-----------|--------------------|--------------------|
| `draft` | — | — |
| `req_review` | Read, Edit, Write, WebSearch (for design research) | Read, Write (review output) |
| `tc_design` | — | Read, Write (TC files), Bash(git) |
| `tc_review` | Read (TC files), Write (review output) | Read, Write (TC revisions) |
| `tc_impl` | Read, Edit, Write, Bash(pytest), Bash(git) | — |
| `tc_impl_review` | — | Read, Bash(pytest), Write (review output) |
| `req_impl` | Read, Edit, Write, Bash(test.sh), Bash(git), **Bash(gh pr create --draft)** | — |
| `req_impl_review` | — | Read, Bash(test.sh), Write (PR review comments), **Bash(gh pr ready)** |
| `pr_draft` | — | — |
