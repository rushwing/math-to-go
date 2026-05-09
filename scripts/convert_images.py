#!/usr/bin/env python3
"""Convert raw images in knowledge_base/raw/ to KB markdown using Claude Vision.

Usage:
    python scripts/convert_images.py [--dry-run] [--dir SUBDIR]
"""

from __future__ import annotations

import argparse
import base64
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(REPO_ROOT / "backend"))

from app.config import settings  # noqa: E402

RAW_DIR = REPO_ROOT / "knowledge_base" / "raw"
DOCS_DIR = REPO_ROOT / "knowledge_base" / "docs"

IMAGE_SUFFIXES = {".png", ".jpg", ".jpeg", ".webp", ".gif"}

CONVERSION_PROMPT = """\
You are converting a Chinese elementary school math worksheet image into a structured markdown document.

Extract all content from the image. Output ONLY the markdown document, starting with the YAML frontmatter block.

Required frontmatter fields:
- doc_id: (leave as PLACEHOLDER — human will fill)
- type: CONCEPT | EX | MISTAKE | HEUR
- grade: 4
- term: 2
- unit: EQ
- subtopic: (best match subtopic_id from context)
- title: (concise Chinese title)

After the frontmatter, format the content clearly using LaTeX for math expressions ($ ... $).
"""


def image_to_base64(path: Path) -> tuple[str, str]:
    suffix = path.suffix.lower()
    media_type_map = {
        ".png": "image/png",
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
        ".webp": "image/webp",
        ".gif": "image/gif",
    }
    media_type = media_type_map.get(suffix, "image/jpeg")
    data = base64.standard_b64encode(path.read_bytes()).decode()
    return data, media_type


def convert_image(path: Path, client: object, dry_run: bool) -> str | None:
    stem = path.stem
    out_dir = DOCS_DIR / "converted"
    out_file = out_dir / f"{stem}.md"
    if out_file.exists():
        print(f"  skip (already converted): {path.name}")
        return None

    print(f"  converting: {path.name}")
    if dry_run:
        return str(out_file)

    img_data, media_type = image_to_base64(path)

    import anthropic  # lazy import so dry-run works without API key

    response = anthropic.Anthropic(api_key=settings.anthropic_api_key).messages.create(
        model=settings.llm_model,
        max_tokens=4096,
        messages=[
            {
                "role": "user",
                "content": [
                    {
                        "type": "image",
                        "source": {"type": "base64", "media_type": media_type, "data": img_data},
                    },
                    {"type": "text", "text": CONVERSION_PROMPT},
                ],
            }
        ],
    )

    content = response.content[0].text  # type: ignore[index,union-attr]
    out_dir.mkdir(parents=True, exist_ok=True)
    out_file.write_text(content, encoding="utf-8")
    return str(out_file)


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--dry-run", action="store_true", help="List images without converting")
    parser.add_argument("--dir", default=None, help="Restrict to a subdirectory of raw/")
    args = parser.parse_args()

    search_root = RAW_DIR / args.dir if args.dir else RAW_DIR
    images = [p for p in sorted(search_root.rglob("*")) if p.suffix.lower() in IMAGE_SUFFIXES]

    if not images:
        print("No images found.")
        sys.exit(0)

    print(f"Found {len(images)} image(s) in {search_root.relative_to(REPO_ROOT)}")

    converted = 0
    for img in images:
        result = convert_image(img, client=None, dry_run=args.dry_run)
        if result:
            converted += 1

    if args.dry_run:
        print(f"Dry-run: {converted} image(s) would be converted.")
    else:
        print(f"Converted {converted} image(s).")


if __name__ == "__main__":
    main()
