"""Vision-language tagging for fabric scrap images using local Ollama."""

import logging
from typing import Literal

import ollama
from pydantic import BaseModel


logger = logging.getLogger(__name__)


class ScrapTags(BaseModel):
    fabric_type: Literal["cotton", "denim", "silk", "linen", "polyester", "wool", "knit", "other"]
    stretch: Literal["none", "low", "high"]
    weight: Literal["light", "medium", "heavy"]
    pattern: Literal["solid", "striped", "floral", "checked", "printed", "other"]
    dominant_color: str
    defects: list[str]


SAFE_DEFAULTS = ScrapTags(
    fabric_type="other",
    stretch="none",
    weight="medium",
    pattern="solid",
    dominant_color="unknown",
    defects=[],
)


def tag_scrap(image_path: str) -> ScrapTags:
    """Tag one fabric image; return safe labels if Ollama or parsing fails."""
    try:
        client = ollama.Client(timeout=20.0)
        response = client.chat(
            model="gemma3:4b",
            messages=[
                {
                    "role": "user",
                    "content": (
                        "Identify the fabric shown. Return only labels supported by the image. "
                        "List visible damage such as stains, holes, fraying, or fading in defects."
                    ),
                    "images": [image_path],
                }
            ],
            format=ScrapTags.model_json_schema(),
            options={"temperature": 0},
        )
        return ScrapTags.model_validate_json(response.message.content)
    except Exception:
        logger.exception("Could not tag scrap image %s; using safe defaults", image_path)
        return SAFE_DEFAULTS.model_copy(deep=True)
