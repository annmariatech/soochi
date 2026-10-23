"""Print tags for every supported image in a folder.

Run from the repository root with:
    python -m backend.ai.tag_folder path/to/images
"""

import argparse
import json
from pathlib import Path

from .vlm import tag_scrap

IMAGE_SUFFIXES = {".jpg", ".jpeg", ".png", ".webp", ".bmp", ".gif", ".tif", ".tiff"}


def main() -> None:
    parser = argparse.ArgumentParser(description="Tag every image in a folder using Ollama gemma3:4b")
    parser.add_argument("folder", type=Path, help="Folder containing images")
    args = parser.parse_args()
    if not args.folder.is_dir():
        parser.error(f"not a folder: {args.folder}")

    image_paths = sorted(path for path in args.folder.iterdir() if path.is_file() and path.suffix.lower() in IMAGE_SUFFIXES)
    for path in image_paths:
        print(json.dumps({"image": str(path), "tags": tag_scrap(str(path)).model_dump()}, ensure_ascii=False))


if __name__ == "__main__":
    main()
