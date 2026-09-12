#!/usr/bin/env python3
"""
Generate the social preview image and favicons.

Run by hand, output committed: the CI and CDN build images have no fonts and no
Pillow, so generating these at build time would fail there while working here —
the same trap that produced three production-only bugs already.

    python3 scripts/make-social-assets.py
"""
import math
import pathlib

from PIL import Image, ImageDraw, ImageFont

OUT = pathlib.Path("page/assets")
OUT.mkdir(parents=True, exist_ok=True)

# Page palette, dark variant
INK = (231, 236, 243)
MUTED = (141, 153, 171)
GROUND = (15, 19, 25)
SURFACE = (22, 28, 36)
HAIR = (30, 37, 49)

# gauge spectrum, matching the Fear & Greed dial on the page
SPECTRUM = [(47, 143, 87), (134, 162, 60), (201, 162, 39), (212, 128, 42), (192, 69, 63)]

FONTS = [
    "/System/Library/Fonts/Supplemental/Arial Bold.ttf",
    "/System/Library/Fonts/Supplemental/Arial.ttf",
    "/Library/Fonts/Arial.ttf",
]


def font(size, bold=True):
    for path in FONTS if bold else FONTS[1:] + FONTS[:1]:
        try:
            return ImageFont.truetype(path, size)
        except OSError:
            continue
    return ImageFont.load_default()


def gauge(draw, cx, cy, r_out, r_in):
    """The same five-segment dial the sentiment block uses, as a brand mark."""
    span = 180 / len(SPECTRUM)
    for i, colour in enumerate(SPECTRUM):
        start = 180 + i * span
        draw.pieslice(
            [cx - r_out, cy - r_out, cx + r_out, cy + r_out],
            start=start, end=start + span, fill=colour,
        )
    draw.ellipse([cx - r_in, cy - r_in, cx + r_in, cy + r_in], fill=GROUND)


def social_card():
    W, H = 1200, 630
    img = Image.new("RGB", (W, H), GROUND)
    d = ImageDraw.Draw(img)

    # a panel edge, echoing the page's hairline borders
    d.rectangle([40, 40, W - 40, H - 40], outline=HAIR, width=2)

    gauge(d, 940, 400, 190, 132)
    # needle sitting around the mid-point, so the mark reads as a dial
    ang = math.radians(180 + 118)
    d.line([940, 400, 940 + 176 * math.cos(ang), 400 + 176 * math.sin(ang)], fill=INK, width=7)
    d.ellipse([940 - 13, 400 - 13, 940 + 13, 400 + 13], fill=INK)

    d.text((90, 128), "BTC METRICS", font=font(84), fill=INK)
    d.text((94, 232), "Where Bitcoin sits in its own cycle", font=font(38, bold=False), fill=MUTED)

    lines = [
        "MVRV · realised price · moving averages",
        "sentiment · funding · miner commitment",
        "Five signals, ranked against 15 years of history.",
    ]
    y = 330
    for i, line in enumerate(lines):
        d.text((94, y), line, font=font(30, bold=False), fill=MUTED if i < 2 else INK)
        y += 46

    d.text((94, H - 112), "btcmetrics.online", font=font(34), fill=(224, 160, 58))
    img.save(OUT / "og-image.png", optimize=True)
    print("wrote", OUT / "og-image.png", img.size)


def favicons():
    for size in (32, 180, 512):
        img = Image.new("RGB", (size, size), GROUND)
        d = ImageDraw.Draw(img)
        pad = size * 0.14
        gauge(d, size / 2, size * 0.70, size / 2 - pad, (size / 2 - pad) * 0.52)
        ang = math.radians(180 + 118)
        r = (size / 2 - pad) * 0.9
        d.line([size / 2, size * 0.70,
                size / 2 + r * math.cos(ang), size * 0.70 + r * math.sin(ang)],
               fill=INK, width=max(2, size // 24))
        name = {32: "favicon-32.png", 180: "apple-touch-icon.png", 512: "icon-512.png"}[size]
        img.save(OUT / name, optimize=True)
        print("wrote", OUT / name, img.size)


if __name__ == "__main__":
    social_card()
    favicons()
