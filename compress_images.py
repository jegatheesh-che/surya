"""
compress_images.py — Surya Photography
Converts all JPG/JPEG/PNG images to WebP format.
Creates:
  assets/images/web/   — full-size WebP (max 1920px, quality 82) for hero & lightbox
  assets/images/thumb/ — thumbnail WebP (max 700px, quality 72) for gallery grid
"""

import os
import sys
from pathlib import Path

try:
    from PIL import Image
except ImportError:
    print("ERROR: Pillow not found. Run: python -m pip install pillow")
    sys.exit(1)

# ── Config ──────────────────────────────────────────────────────────────────
SRC_DIR   = Path("assets/images")
WEB_DIR   = SRC_DIR / "web"
THUMB_DIR = SRC_DIR / "thumb"

WEB_MAX_PX     = 1920
WEB_QUALITY    = 82

THUMB_MAX_PX   = 700
THUMB_QUALITY  = 72

EXTENSIONS = {".jpg", ".jpeg", ".png", ".JPG", ".JPEG", ".PNG"}
# ────────────────────────────────────────────────────────────────────────────

WEB_DIR.mkdir(exist_ok=True)
THUMB_DIR.mkdir(exist_ok=True)

def convert(src_path: Path, out_path: Path, max_px: int, quality: int):
    """Open image, resize if needed, save as WebP."""
    try:
        with Image.open(src_path) as img:
            # Convert RGBA / palette to RGB for WebP compatibility
            if img.mode in ("RGBA", "P", "LA"):
                img = img.convert("RGB")
            elif img.mode != "RGB":
                img = img.convert("RGB")

            # Resize proportionally if larger than max_px on the longest edge
            w, h = img.size
            if max(w, h) > max_px:
                scale = max_px / max(w, h)
                new_w = int(w * scale)
                new_h = int(h * scale)
                img = img.resize((new_w, new_h), Image.LANCZOS)

            img.save(out_path, "WEBP", quality=quality, method=6)
            size_kb = out_path.stat().st_size / 1024
            print(f"  OK {out_path.name}  ({size_kb:.0f} KB)")
    except Exception as e:
        print(f"  ERR {src_path.name} -- ERROR: {e}")

# Friendly names for the 4 hero images used in slider
HERO_RENAMES = {
    "Copy of DSC05403.jpg": "hero-1.webp",
    "DSC02177.jpg":         "hero-2.webp",
    "DSC09652.jpg":         "hero-3.webp",
    "Copy of DSC00602.jpg": "hero-4.webp",
}
# Friendly names for portfolio preview images used on homepage
PORTFOLIO_RENAMES = {
    "Copy of DSC00343.jpg": "DSC00343.webp",
    "Copy of DSC00602.jpg": "DSC00602.webp",
    "Copy of DSC00823.jpg": "DSC00823.webp",
}

print("\n== Surya Photography -- Image Compression ==")
print(f"Source : {SRC_DIR.resolve()}")
print(f"Web    : {WEB_DIR.resolve()}  (max {WEB_MAX_PX}px, q{WEB_QUALITY})")
print(f"Thumb  : {THUMB_DIR.resolve()}  (max {THUMB_MAX_PX}px, q{THUMB_QUALITY})")
print()

images = [f for f in SRC_DIR.iterdir() if f.is_file() and f.suffix in EXTENSIONS]
images.sort()

print(f"Found {len(images)} images to process...\n")

for src in images:
    name = src.name

    # -- Web version ------------------------------------------------------
    # Use friendly rename for hero images, stem-based name for everything else
    if name in HERO_RENAMES:
        web_name = HERO_RENAMES[name]
    elif name in PORTFOLIO_RENAMES:
        web_name = PORTFOLIO_RENAMES[name]
    else:
        web_name = src.stem + ".webp"

    web_out = WEB_DIR / web_name
    convert(src, web_out, WEB_MAX_PX, WEB_QUALITY)

    # -- Thumb version ----------------------------------------------------
    thumb_out = THUMB_DIR / web_name
    convert(src, thumb_out, THUMB_MAX_PX, THUMB_QUALITY)

print("\n== Done! ==")
print("WebP files written to:")
print(f"  {WEB_DIR.resolve()}")
print(f"  {THUMB_DIR.resolve()}")
