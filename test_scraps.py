
import argparse
from pathlib import Path

from vision.detect import detect_scraps

parser = argparse.ArgumentParser(
    description="Detect and measure fabric scraps in a photo."
)
parser.add_argument(
    "image",
    nargs="?",
    type=Path,
    default=Path("photo.jpg"),
    help="Photo to process (default: photo.jpg).",
)
image_path = parser.parse_args().image
image_bytes = image_path.read_bytes()

Path("scraps_annotated.png").unlink(missing_ok=True)
for old_crop in Path(".").glob("scrap_*.png"):
    if old_crop.stem[6:].isdigit():
        old_crop.unlink()

result = detect_scraps(image_bytes)

print("Success:", result["success"])
print("Error:", result["error"])

if result["success"]:
    print("Scale:", result["px_per_cm"], "pixels/cm")
    print("Scraps found:", len(result["scraps"]))

    Path("scraps_annotated.png").write_bytes(
        result["annotated_image_png"]
    )

    for scrap in result["scraps"]:
        print(
            scrap["temp_id"],
            scrap["width_cm"],
            "x",
            scrap["height_cm"],
            "cm | area:",
            scrap["area_cm2"],
            "cm² | color:",
            scrap["color_hex"],
        )

        Path(f"{scrap['temp_id']}.png").write_bytes(
            scrap["crop_png"]
        )
