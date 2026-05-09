"""
TC-008: Agent UID registration and role decoupling — L1 shell tests via subprocess.

Tests target the NEW behaviour of claim-req.sh / req-constants.sh after REQ-008
implementation.  They intentionally fail against the current (legacy) scripts and
pass once the UID system is in place.

Covered TCs:  TC-008-01 through TC-008-12.
Covered ACs:  AC1–AC12 (AC9 transitively via TC-008-06).
"""

import os
import re
import subprocess
import textwrap
from pathlib import Path

import pytest

# ── Paths ─────────────────────────────────────────────────────────────────────

REPO_ROOT = Path(__file__).parent.parent.parent  # backend/tests/ → backend/ → repo root
CLAIM_SCRIPT = REPO_ROOT / "scripts" / "claim-req.sh"
COVERAGE_SCRIPT = REPO_ROOT / "scripts" / "check-req-coverage.sh"
REQ_CONSTANTS = REPO_ROOT / "harness" / "req-constants.sh"
REGISTRY = REPO_ROOT / "harness" / "agent-registry.yml"
ENV_EXAMPLE = REPO_ROOT / ".env.example"

# Temporary REQ file written into the real repo's tasks/req/ during tests that
# need to exercise the live scripts.  Always cleaned up in finally blocks.
TEMP_REQ_PATH = REPO_ROOT / "tasks" / "req" / "REQ-998.md"

# ── Fixture content ────────────────────────────────────────────────────────────

_FRONTMATTER = textwrap.dedent("""\
    ---
    req_id: {req_id}
    title: "Temporary test REQ"
    status: {status}
    owner: {owner}
    priority: P1
    phase: PHASE-000
    scope: harness
    tc_policy: optional
    tc_exempt_reason: ""
    depends_on: []
    test_case_ref: []
    acceptance: "placeholder"
    review_round: 0
    pending_bugs: []
    blocked_reason: ""
    blocked_from_status: ""
    blocked_from_owner: ""
    pr_number: ""
    ---
    """)

# Fixture registry with only test-agent-999 — not present in the main registry.
_FIXTURE_REGISTRY = textwrap.dedent("""\
    agents:
      - uid: test-agent-999
        role: test-role
        model: test-model
        description: "Fixture agent for dynamic-read verification"
        handles: [req_impl, req_review]
    """)

# Standard registry used as the default path in isolated fixture dirs.
_STANDARD_REGISTRY = textwrap.dedent("""\
    agents:
      - uid: optimizer-001
        role: optimizer
        model: claude-sonnet-4-6
        description: "Primary optimizer"
        handles: [req_review, tc_review, tc_impl, req_impl]
      - uid: evaluator-001
        role: evaluator
        model: codex
        description: "Primary evaluator"
        handles: [req_review, tc_design, tc_impl_review, req_impl_review]
      - uid: human-001
        role: human
        model: human
        description: "Human orchestrator"
        handles: [pr_draft]
    """)

# ── Helpers ────────────────────────────────────────────────────────────────────


def make_req(path: Path, status: str, owner: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(_FRONTMATTER.format(req_id=path.stem, status=status, owner=owner))


def _base_env() -> dict[str, str]:
    """Copy of os.environ with AGENT_UID and AGENT_REGISTRY stripped."""
    env = dict(os.environ)
    env.pop("AGENT_UID", None)
    env.pop("AGENT_REGISTRY", None)
    return env


def run_claim(
    req_id: str,
    positional_uid: str = "",
    *,
    env_vars: dict[str, str] | None = None,
) -> subprocess.CompletedProcess[str]:
    cmd = ["bash", str(CLAIM_SCRIPT), req_id]
    if positional_uid:
        cmd.append(positional_uid)
    env = _base_env()
    if env_vars:
        env.update(env_vars)
    return subprocess.run(cmd, capture_output=True, text=True, env=env, cwd=str(REPO_ROOT))


def run_coverage(
    *,
    env_vars: dict[str, str] | None = None,
    cwd: Path | None = None,
) -> subprocess.CompletedProcess[str]:
    env = _base_env()
    if env_vars:
        env.update(env_vars)
    return subprocess.run(
        ["bash", str(COVERAGE_SCRIPT)],
        capture_output=True, text=True, env=env,
        cwd=str(cwd or REPO_ROOT),
    )


def build_fixture_dir(tmp_path: Path) -> Path:
    """
    Create a self-contained fixture repo with scripts symlinked to the real
    implementations.  BASH_SOURCE[0] resolves to the symlink path, so the
    script derives REPO_ROOT = tmp_path — scans only the fixture's tasks/req/.
    """
    for subdir in ("tasks/req", "tasks/bugs", "tasks/test-cases", "harness", "scripts"):
        (tmp_path / subdir).mkdir(parents=True, exist_ok=True)
    (tmp_path / "scripts" / "check-req-coverage.sh").symlink_to(COVERAGE_SCRIPT)
    (tmp_path / "harness" / "req-constants.sh").symlink_to(REQ_CONSTANTS)
    return tmp_path


# ── TC-008-01 ─────────────────────────────────────────────────────────────────


def test_tc_008_01_claim_accepts_optimizer_via_env():
    """AC1 — AGENT_UID=optimizer-001 + REQ at req_impl → exit 0."""
    make_req(TEMP_REQ_PATH, status="req_impl", owner="optimizer-001")
    try:
        r = run_claim("REQ-998", env_vars={"AGENT_UID": "optimizer-001"})
        assert r.returncode == 0, f"Expected exit 0.\nstderr: {r.stderr}"
        assert "optimizer-001" in r.stdout
        assert r.stderr == ""
    finally:
        TEMP_REQ_PATH.unlink(missing_ok=True)


# ── TC-008-02 ─────────────────────────────────────────────────────────────────


def test_tc_008_02_claim_accepts_evaluator_via_env():
    """AC2 — AGENT_UID=evaluator-001 + REQ at req_impl_review → exit 0."""
    make_req(TEMP_REQ_PATH, status="req_impl_review", owner="evaluator-001")
    try:
        r = run_claim("REQ-998", env_vars={"AGENT_UID": "evaluator-001"})
        assert r.returncode == 0, f"Expected exit 0.\nstderr: {r.stderr}"
        assert "evaluator-001" in r.stdout
        assert r.stderr == ""
    finally:
        TEMP_REQ_PATH.unlink(missing_ok=True)


# ── TC-008-03 ─────────────────────────────────────────────────────────────────


def test_tc_008_03_claim_rejects_unknown_uid():
    """AC3 — UID absent from registry → exit 1 with 'Unknown UID' in stderr."""
    make_req(TEMP_REQ_PATH, status="req_impl", owner="unknown-uid")
    try:
        r = run_claim("REQ-998", env_vars={"AGENT_UID": "unknown-uid"})
        assert r.returncode == 1
        assert "Unknown UID" in r.stderr, f"stderr: {r.stderr}"
        assert "OK" not in r.stdout
    finally:
        TEMP_REQ_PATH.unlink(missing_ok=True)


# ── TC-008-04 ─────────────────────────────────────────────────────────────────


def test_tc_008_04_claim_rejects_owner_mismatch():
    """AC4 — known UID claims REQ owned by a different UID → exit 1.

    REQ is at req_impl (valid for optimizer-001) so the only failure path is
    the owner mismatch, not a status/handles rejection.
    """
    make_req(TEMP_REQ_PATH, status="req_impl", owner="evaluator-001")
    try:
        r = run_claim("REQ-998", env_vars={"AGENT_UID": "optimizer-001"})
        assert r.returncode == 1
        assert "evaluator-001" in r.stderr, (
            f"Expected actual owner value in stderr.\nstderr: {r.stderr}"
        )
        assert "OK" not in r.stdout
    finally:
        TEMP_REQ_PATH.unlink(missing_ok=True)


# ── TC-008-05 ─────────────────────────────────────────────────────────────────


def test_tc_008_05_claim_rejects_legacy_claude_uid():
    """Legacy 'claude' is not in the registry → same Unknown UID path as AC3."""
    make_req(TEMP_REQ_PATH, status="req_impl", owner="claude")
    try:
        r = run_claim("REQ-998", env_vars={"AGENT_UID": "claude"})
        assert r.returncode == 1
        assert "Unknown UID" in r.stderr, f"stderr: {r.stderr}"
        assert "OK" not in r.stdout
    finally:
        TEMP_REQ_PATH.unlink(missing_ok=True)


# ── TC-008-06 ─────────────────────────────────────────────────────────────────


def test_tc_008_06_coverage_passes_with_uid_owners():
    """AC5 / AC9 — real repo passes check-req-coverage.sh once migration is complete."""
    r = run_coverage()
    assert r.returncode == 0, (
        "check-req-coverage.sh failed — REQ migration may be incomplete.\n"
        f"stdout: {r.stdout}\nstderr: {r.stderr}"
    )
    assert "REQ coverage check passed" in r.stdout


# ── TC-008-07 ─────────────────────────────────────────────────────────────────


def test_tc_008_07_coverage_rejects_legacy_owners(tmp_path: Path):
    """AC6 — legacy owner values produce per-REQ errors including field name."""
    root = build_fixture_dir(tmp_path)
    (root / "harness" / "agent-registry.yml").write_text(_STANDARD_REGISTRY)

    legacy = [("REQ-991", "claude"), ("REQ-992", "codex"), ("REQ-993", "daniel")]
    for req_id, owner in legacy:
        make_req(root / "tasks" / "req" / f"{req_id}.md", status="req_review", owner=owner)

    env = _base_env()
    r = subprocess.run(
        ["bash", str(root / "scripts" / "check-req-coverage.sh")],
        capture_output=True, text=True, env=env, cwd=str(root),
    )
    assert r.returncode == 1
    output = r.stdout + r.stderr
    for req_id, _ in legacy:
        assert req_id in output, f"{req_id} not reported in output:\n{output}"
    assert "owner" in output


# ── TC-008-08 ─────────────────────────────────────────────────────────────────


def test_tc_008_08_registry_has_required_records():
    """AC7 — harness/agent-registry.yml exists with 3 UIDs and all mandatory fields."""
    assert REGISTRY.exists(), "harness/agent-registry.yml not found"
    content = REGISTRY.read_text()

    required_uids = ["optimizer-001", "evaluator-001", "human-001"]
    required_fields = ["uid", "role", "model", "description", "handles"]

    for uid in required_uids:
        assert uid in content, f"Required UID '{uid}' missing from registry"
    for field in required_fields:
        assert field in content, f"Required field '{field}' missing from registry"

    # Each UID block must have a non-empty handles value.
    blocks = re.split(r"(?=- uid:)", content)
    uid_blocks = [b for b in blocks if "uid:" in b]
    for uid in required_uids:
        block = next((b for b in uid_blocks if uid in b), None)
        assert block is not None, f"No registry block found for UID '{uid}'"
        m = re.search(r"handles:\s*(.+)", block)
        assert m, f"No handles line found for '{uid}'"
        handles_val = m.group(1).strip()
        assert handles_val not in ("", "[]", "[ ]"), f"Empty handles list for '{uid}'"


# ── TC-008-09 ─────────────────────────────────────────────────────────────────


def test_tc_008_09_explicit_uid_arg_takes_precedence():
    """AC10 — positional UID argument succeeds both when AGENT_UID is unset and
    when it conflicts; the explicit argument always wins."""
    make_req(TEMP_REQ_PATH, status="req_impl", owner="optimizer-001")
    try:
        # Path 1: AGENT_UID unset — explicit arg is the only source of UID.
        r1 = run_claim("REQ-998", "optimizer-001")
        assert r1.returncode == 0, f"Path 1 failed.\nstderr: {r1.stderr}"
        assert "optimizer-001" in r1.stdout

        # Path 2: AGENT_UID conflicts — explicit positional must override it.
        r2 = run_claim("REQ-998", "optimizer-001", env_vars={"AGENT_UID": "evaluator-001"})
        assert r2.returncode == 0, (
            "Explicit arg should override AGENT_UID=evaluator-001.\n"
            f"stderr: {r2.stderr}"
        )
        assert "optimizer-001" in r2.stdout
    finally:
        TEMP_REQ_PATH.unlink(missing_ok=True)


# ── TC-008-10 ─────────────────────────────────────────────────────────────────


def test_tc_008_10_claim_reads_from_fixture_registry(tmp_path: Path):
    """AC11 — claim-req.sh reads UID + handles from AGENT_REGISTRY, not a hardcoded table.

    Proof: test-agent-999 is absent from the main registry.  The positive run
    succeeds only with the fixture registry; the negative run (no AGENT_REGISTRY)
    fails with Unknown UID, ruling out a hardcoded fallback.
    """
    fixture_reg = tmp_path / "registry.fixture.yml"
    fixture_reg.write_text(_FIXTURE_REGISTRY)

    make_req(TEMP_REQ_PATH, status="req_impl", owner="test-agent-999")
    try:
        # Positive: fixture registry recognises test-agent-999.
        r_pos = run_claim(
            "REQ-998",
            env_vars={
                "AGENT_UID": "test-agent-999",
                "AGENT_REGISTRY": str(fixture_reg),
            },
        )
        assert r_pos.returncode == 0, (
            f"Expected exit 0 with fixture registry.\nstderr: {r_pos.stderr}"
        )
        assert "test-agent-999" in r_pos.stdout

        # Negative control: main registry does not know test-agent-999.
        r_neg = run_claim("REQ-998", env_vars={"AGENT_UID": "test-agent-999"})
        assert r_neg.returncode == 1, "Expected exit 1 without fixture registry"
        assert "Unknown UID" in r_neg.stderr, f"stderr: {r_neg.stderr}"
    finally:
        TEMP_REQ_PATH.unlink(missing_ok=True)


# ── TC-008-11 ─────────────────────────────────────────────────────────────────


def test_tc_008_11_coverage_reads_owners_from_fixture_registry(tmp_path: Path):
    """AC12 — req-constants.sh derives REQ_VALID_OWNERS from AGENT_REGISTRY, not a
    hardcoded list.

    Proof: test-agent-999 is absent from the standard registry.  With the fixture
    registry, REQ-998 (owner: test-agent-999) passes; without it, the same REQ fails
    with an 'invalid owner' error — confirming dynamic derivation.
    """
    root = build_fixture_dir(tmp_path)

    fixture_reg = root / "harness" / "agent-registry.fixture.yml"
    fixture_reg.write_text(_FIXTURE_REGISTRY)

    # Standard registry at the default path — does NOT contain test-agent-999.
    (root / "harness" / "agent-registry.yml").write_text(_STANDARD_REGISTRY)

    make_req(root / "tasks" / "req" / "REQ-998.md", status="req_review", owner="test-agent-999")

    # Positive: fixture registry makes test-agent-999 a valid owner.
    r_pos = subprocess.run(
        ["bash", str(root / "scripts" / "check-req-coverage.sh")],
        capture_output=True, text=True, cwd=str(root),
        env={**_base_env(), "AGENT_REGISTRY": str(fixture_reg)},
    )
    assert r_pos.returncode == 0, (
        f"Expected pass with fixture registry.\n"
        f"stdout: {r_pos.stdout}\nstderr: {r_pos.stderr}"
    )
    assert "REQ coverage check passed" in r_pos.stdout

    # Negative control: default registry rejects test-agent-999.
    r_neg = subprocess.run(
        ["bash", str(root / "scripts" / "check-req-coverage.sh")],
        capture_output=True, text=True, cwd=str(root),
        env=_base_env(),
    )
    assert r_neg.returncode == 1, "Expected fail without fixture registry"
    output = r_neg.stdout + r_neg.stderr
    assert "REQ-998" in output, f"REQ-998 not reported.\noutput: {output}"
    assert "test-agent-999" in output, f"owner value not reported.\noutput: {output}"


# ── TC-008-12 ─────────────────────────────────────────────────────────────────


def test_tc_008_12_env_example_documents_agent_uid():
    """AC8 — .env.example has AGENT_UID=optimizer-001 (non-comment) and comment
    lines naming evaluator-001 and human-001."""
    assert ENV_EXAMPLE.exists(), ".env.example not found"
    lines = ENV_EXAMPLE.read_text().splitlines()

    value_lines = [l for l in lines if l.strip() and not l.strip().startswith("#")]
    assert any(l == "AGENT_UID=optimizer-001" for l in value_lines), (
        "No non-comment line 'AGENT_UID=optimizer-001' found in .env.example"
    )

    comment_text = "\n".join(l for l in lines if l.strip().startswith("#"))
    assert "evaluator-001" in comment_text, (
        "evaluator-001 not mentioned in .env.example comments"
    )
    assert "human-001" in comment_text, (
        "human-001 not mentioned in .env.example comments"
    )
