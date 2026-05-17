"""Recolor sitewise_logo_1.png: strip white background, render strokes in target color.

Uses each source pixel's darkness as the output alpha, then paints the foreground
in TARGET_COLOR. White becomes fully transparent; anti-aliased grays become
semi-transparent target-coloured pixels, preserving smooth edges on dark chrome.
"""

from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "docs" / "trust-logos" / "sitewise_logo_1.png"
DST = ROOT / "public" / "images" / "sitewise-logo-light.png"

TARGET_COLOR = (255, 255, 255)  # var(--sw-paper) — matches existing wordmark on dark chrome

def main() -> None:
    img = Image.open(SRC).convert("RGBA")
    pixels = img.load()
    w, h = img.size

    r_t, g_t, b_t = TARGET_COLOR
    for y in range(h):
        for x in range(w):
            r, g, b, a = pixels[x, y]
            # luminance (Rec. 601) — darker source pixels become more opaque foreground
            lum = (299 * r + 587 * g + 114 * b) / 1000
            new_alpha = int(round((255 - lum) * (a / 255)))
            pixels[x, y] = (r_t, g_t, b_t, new_alpha)

    DST.parent.mkdir(parents=True, exist_ok=True)
    img.save(DST, "PNG", optimize=True)
    print(f"wrote {DST} ({DST.stat().st_size} bytes, {w}x{h})")

if __name__ == "__main__":
    main()
