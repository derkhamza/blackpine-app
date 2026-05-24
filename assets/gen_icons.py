"""
Regenerate all Blackpine Cabinet icon assets using the app's brand palette.

  brand    #1890C5  – medical teal-blue
  dark     #0A4E7E  – deep marine blue (hero / backgrounds)
  gold     #D4962A  – accent
  light bg #EFF6FB  – app background
  white    #FFFFFF
  navy     #122B42  – primary text

Run: python assets/gen_icons.py
"""

from PIL import Image, ImageDraw, ImageFont
import math, os, struct, zlib

# ── palette ──────────────────────────────────────────────────────────────────

BRAND      = (24,  144, 197)   # #1890C5
DARK       = (10,  78,  126)   # #0A4E7E
GOLD       = (212, 150, 42)    # #D4962A
WHITE      = (255, 255, 255)
BG_LIGHT   = (239, 246, 251)   # #EFF6FB
NAVY       = (18,  43,  66)    # #122B42

ASSETS = os.path.dirname(__file__)

# ── helpers ───────────────────────────────────────────────────────────────────

def lerp_color(a, b, t):
    return tuple(int(a[i] + (b[i] - a[i]) * t) for i in range(3))

def vertical_gradient(draw, w, h, top_color, bot_color):
    for y in range(h):
        t = y / (h - 1)
        r, g, b = lerp_color(top_color, bot_color, t)
        draw.line([(0, y), (w, y)], fill=(r, g, b, 255))

def rounded_rect_mask(size, radius):
    """Return an RGBA image used as mask for rounded background."""
    img = Image.new("L", (size, size), 0)
    d = ImageDraw.Draw(img)
    d.rounded_rectangle([0, 0, size - 1, size - 1], radius=radius, fill=255)
    return img

def pine_tree_points(cx, cy, scale=1.0):
    """
    Three-tier pine tree centered at (cx, cy).
    Returns a list of (tier_polygon, trunk_rect).
    """
    s = scale
    # tier 1 (top) – tip to base
    t1 = [(cx,             cy - 230*s),
          (cx - 115*s,     cy -  45*s),
          (cx + 115*s,     cy -  45*s)]
    # tier 2 (mid)
    t2 = [(cx,             cy - 140*s),
          (cx - 165*s,     cy +  80*s),
          (cx + 165*s,     cy +  80*s)]
    # tier 3 (bottom)
    t3 = [(cx,             cy -  40*s),
          (cx - 210*s,     cy + 200*s),
          (cx + 210*s,     cy + 200*s)]
    # trunk
    trunk = [cx - 28*s, cy + 200*s, cx + 28*s, cy + 270*s]
    return [t1, t2, t3], trunk

def draw_tree(draw, cx, cy, scale, color):
    tiers, trunk = pine_tree_points(cx, cy, scale)
    for tier in tiers:
        draw.polygon(tier, fill=color)
    draw.rectangle(trunk, fill=color)

def draw_circle_outline(draw, cx, cy, radius, color, width):
    draw.ellipse(
        [cx - radius, cy - radius, cx + radius, cy + radius],
        outline=color, width=width
    )

def try_font(size, bold=False):
    candidates = [
        "C:/Windows/Fonts/arialbd.ttf" if bold else "C:/Windows/Fonts/arial.ttf",
        "C:/Windows/Fonts/Arial Bold.ttf" if bold else "C:/Windows/Fonts/Arial.ttf",
        "/System/Library/Fonts/Helvetica.ttc",
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
    ]
    for path in candidates:
        try:
            return ImageFont.truetype(path, size)
        except Exception:
            continue
    return ImageFont.load_default()

# ── icon.png  1024×1024 ───────────────────────────────────────────────────────
# Solid dark-blue background, white tree inside white circle.
# (No text – app name appears beneath the icon on device.)

def make_icon(out_path, size=1024):
    """
    Main app icon — must be RGB (no alpha).
    iOS / Android apply their own shape masks; we fill the full square.
    """
    img = Image.new("RGB", (size, size), DARK)
    draw = ImageDraw.Draw(img)

    # full-bleed gradient background
    vertical_gradient(draw, size, size, BRAND, DARK)

    cx = size // 2
    cy_circle = int(size * 0.44)
    r_circle  = int(size * 0.30)
    stroke_w  = max(6, int(size * 0.018))
    scale     = size / 1024.0

    # white circle
    draw.ellipse(
        [cx - r_circle, cy_circle - r_circle,
         cx + r_circle, cy_circle + r_circle],
        outline=WHITE, width=stroke_w
    )

    # white pine tree
    tree_cy = cy_circle + int(10 * scale)
    tiers, trunk = pine_tree_points(cx, tree_cy, scale * 0.88)
    for tier in tiers:
        draw.polygon(tier, fill=WHITE)
    draw.rectangle(trunk, fill=WHITE)

    img.save(out_path)
    print(f"  OK  {out_path}  ({size}x{size})")

# ── adaptive-icon.png  1024×1024 ─────────────────────────────────────────────
# Android adaptive icon – foreground only, no background color (set in app.json).
# Safe zone = centre 66 % → tree fits comfortably.

def make_adaptive_icon(out_path, size=1024):
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    cx = size // 2
    cy_circle = size // 2
    r_circle  = int(size * 0.32)
    stroke_w  = max(6, int(size * 0.018))
    scale     = size / 1024.0

    # brand-blue filled circle (visible against any adaptive bg)
    draw.ellipse(
        [cx - r_circle, cy_circle - r_circle,
         cx + r_circle, cy_circle + r_circle],
        fill=DARK + (255,)
    )
    # white circle ring
    draw.ellipse(
        [cx - r_circle, cy_circle - r_circle,
         cx + r_circle, cy_circle + r_circle],
        outline=WHITE + (255,), width=stroke_w
    )

    tree_cy = cy_circle + int(10 * scale)
    tiers, trunk = pine_tree_points(cx, tree_cy, scale * 0.88)
    for tier in tiers:
        draw.polygon(tier, fill=WHITE + (255,))
    draw.rectangle(trunk, fill=WHITE + (255,))

    img.save(out_path)
    print(f"  OK  {out_path}  ({size}x{size})")

# ── splash-icon.png  512×512 on light bg ─────────────────────────────────────
# Full logo lockup: circle + tree + wordmark, on the app light background.

def make_splash(out_path, size=512):
    img = Image.new("RGB", (size, size), BG_LIGHT)
    draw = ImageDraw.Draw(img)

    cx = size // 2
    # place circle in the upper-middle third so the wordmark fits below
    cy_circle = int(size * 0.33)
    r_circle  = int(size * 0.25)
    stroke_w  = max(3, int(size * 0.015))
    # tree scale fitted to the circle (keeps trunk slightly inside)
    tree_scale = r_circle / 290.0

    # brand blue circle outline
    draw.ellipse(
        [cx - r_circle, cy_circle - r_circle,
         cx + r_circle, cy_circle + r_circle],
        outline=DARK, width=stroke_w
    )

    # dark pine tree inside
    tree_cy = cy_circle + int(6 * tree_scale * 4)
    tiers, trunk = pine_tree_points(cx, tree_cy, tree_scale)
    for tier in tiers:
        draw.polygon(tier, fill=DARK)
    draw.rectangle(trunk, fill=DARK)

    # wordmark — well below the circle
    y_text = cy_circle + r_circle + int(size * 0.07)
    font_b = try_font(int(size * 0.13), bold=True)
    font_s = try_font(int(size * 0.07))
    draw.text((cx, y_text),                  "BLACKPINE", font=font_b,
              fill=NAVY, anchor="mt")
    draw.text((cx, y_text + int(size * 0.15)), "CABINET",  font=font_s,
              fill=GOLD, anchor="mt")

    img.save(out_path)
    print(f"  OK  {out_path}  ({size}x{size})")

# ── favicon.png  64×64 ───────────────────────────────────────────────────────

def make_favicon(out_path, size=64):
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    # solid brand-blue square (rounded)
    mask = rounded_rect_mask(size, int(size * 0.22))
    bg   = Image.new("RGBA", (size, size), DARK + (255,))
    img.paste(bg, mask=mask)
    draw = ImageDraw.Draw(img)

    cx = size // 2
    cy = size // 2 - 2
    r  = int(size * 0.36)
    sw = max(1, int(size * 0.04))
    scale = size / 64.0

    draw.ellipse([cx-r, cy-r, cx+r, cy+r], outline=WHITE+(255,), width=sw)
    tiers, trunk = pine_tree_points(cx, cy + int(2*scale), scale * 0.56)
    for tier in tiers:
        draw.polygon(tier, fill=WHITE+(255,))
    draw.rectangle(trunk, fill=WHITE+(255,))

    img.save(out_path)
    print(f"  OK  {out_path}  ({size}x{size})")

# ── run ───────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    print("Generating Blackpine Cabinet icons…")
    make_icon         (os.path.join(ASSETS, "icon.png"),          size=1024)
    make_adaptive_icon(os.path.join(ASSETS, "adaptive-icon.png"), size=1024)
    make_splash       (os.path.join(ASSETS, "splash-icon.png"),   size=512)
    make_favicon      (os.path.join(ASSETS, "favicon.png"),       size=64)
    print("Done.")
