#!/usr/bin/env python3
"""Validate KB markdown frontmatter: required fields, doc_id format, subtopic in curriculum YAML."""

from __future__ import annotations

import re
import sys
from pathlib import Path

import frontmatter
import yaml

REPO_ROOT = Path(__file__).resolve().parent.parent
KB_DOCS_DIR = REPO_ROOT / "knowledge_base" / "docs"
CURRICULUM_YAML = REPO_ROOT / "knowledge_base" / "curriculum" / "bnu_curriculum.yaml"

DOC_ID_RE = re.compile(
    r"^(CONCEPT|EX|MISTAKE|HEUR)\.G\d+T\d+\.[A-Z]+\.\d{3}$"
)

REQUIRED_FIELDS = ["doc_id", "type", "grade", "term", "unit", "subtopic", "title"]


def load_curriculum_subtopics() -> set[str]:
    """Return all subtopic keys from the curriculum YAML."""
    if not CURRICULUM_YAML.exists():
        return set()
    data = yaml.safe_load(CURRICULUM_YAML.read_text(encoding="utf-8"))
    subtopics: set[str] = set()

    def walk(node: object) -> None:
        if isinstance(node, dict):
            if "subtopic_id" in node:
                subtopics.add(node["subtopic_id"])
            for v in node.values():
                walk(v)
        elif isinstance(node, list):
            for item in node:
                walk(item)

    walk(data)
    return subtopics


def validate_file(path: Path, valid_subtopics: set[str]) -> list[str]:
    errors: list[str] = []
    try:
        post = frontmatter.load(str(path))
    except Exception as e:
        return [f"{path.name}: cannot parse frontmatter — {e}"]

    for field in REQUIRED_FIELDS:
        if field not in post.metadata:
            errors.append(f"{path.name}: missing required field '{field}'")

    doc_id = post.metadata.get("doc_id", "")
    if doc_id and not DOC_ID_RE.match(str(doc_id)):
        errors.append(
            f"{path.name}: doc_id '{doc_id}' does not match pattern "
            r"TYPE.GxTx.UNIT.NNN"
        )

    subtopic = post.metadata.get("subtopic", "")
    if subtopic and valid_subtopics and str(subtopic) not in valid_subtopics:
        errors.append(
            f"{path.name}: subtopic '{subtopic}' not found in bnu_curriculum.yaml"
        )

    return errors


def main() -> None:
    valid_subtopics = load_curriculum_subtopics()
    all_errors: list[str] = []

    md_files = list(KB_DOCS_DIR.rglob("*.md"))
    if not md_files:
        print("No KB docs found — nothing to validate.")
        sys.exit(0)

    for path in sorted(md_files):
        all_errors.extend(validate_file(path, valid_subtopics))

    if all_errors:
        print(f"KB validation FAILED — {len(all_errors)} error(s):")
        for e in all_errors:
            print(f"  ✗ {e}")
        sys.exit(1)
    else:
        print(f"KB validation passed ({len(md_files)} docs).")
        sys.exit(0)


if __name__ == "__main__":
    main()
