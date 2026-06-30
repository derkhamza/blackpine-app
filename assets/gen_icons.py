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

def _disc(draw, cx, cy, r, fill):
    draw.ellipse([cx - r, cy - r, cx + r, cy + r], fill=fill)

def draw_stethoscope(draw, cx, cy, r, tube_w, tube_color, accent):
    """
    Stethoscope rendered as the ring around the pine tree:
      • the binaural tubing forms the circle (a gap at the top),
      • two angled ear-tubes splay up-and-out to rounded ear tips,
      • a round chest-piece (diaphragm) sits at the bottom of the ring.
    PIL angles: 0 deg = 3 o'clock, increasing clockwise; 270=top, 90=bottom.
    """
    bbox = [cx - r, cy - r, cx + r, cy + r]
    gap  = 22  # half-width (deg) of the open gap at the very top

    # main tube — full ring minus the top gap
    draw.arc(bbox, start=270 + gap, end=270 - gap + 360, fill=tube_color, width=tube_w)

    # gap end-points on the circle (where the ear-tubes leave the ring)
    aR = math.radians(270 + gap)
    aL = math.radians(270 - gap)
    rxR, ryR = cx + r * math.cos(aR), cy + r * math.sin(aR)
    rxL, ryL = cx + r * math.cos(aL), cy + r * math.sin(aL)
    # round caps so the tube ends are smooth
    _disc(draw, rxR, ryR, tube_w / 2, tube_color)
    _disc(draw, rxL, ryL, tube_w / 2, tube_color)

    # ear-tubes splay up and outward to the ear tips
    tipR = (cx + r * 0.66, cy - r * 1.20)
    tipL = (cx - r * 0.66, cy - r * 1.20)
    draw.line([(rxR, ryR), tipR], fill=tube_color, width=tube_w)
    draw.line([(rxL, ryL), tipL], fill=tube_color, width=tube_w)
    # ear tips (small rounded knobs, accent-coloured)
    ear = tube_w * 0.95
    _disc(draw, tipR[0], tipR[1], ear, accent)
    _disc(draw, tipL[0], tipL[1], ear, accent)

    # chest-piece at the bottom of the ring — a stem then a diaphragm disc
    stem_top = (cx, cy + r)
    cp_cy    = cy + r + r * 0.30
    cp_r     = r * 0.20
    draw.line([stem_top, (cx, cp_cy - cp_r * 0.4)], fill=tube_color, width=tube_w)
    _disc(draw, cx, cp_cy, cp_r, tube_color)             # outer ring of the bell
    _disc(draw, cx, cp_cy, cp_r - tube_w * 0.9, accent)  # diaphragm face

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

    # white stethoscope ring (tube + ear tips + chest-piece) around the tree
    tube_w = max(8, int(size * 0.026))
    draw_stethoscope(draw, cx, cy_circle, r_circle, tube_w, WHITE, GOLD)

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

    # white stethoscope ring inside the disc (kept in the safe zone so the
    # ear tips / chest-piece are never clipped by Android's adaptive mask)
    r_steth = int(size * 0.185)
    tube_w  = max(6, int(size * 0.022))
    draw_stethoscope(draw, cx, cy_circle, r_steth, tube_w,
                     WHITE + (255,), GOLD + (255,))

    # tree fills ~66 % of the ring, vertically centred inside it
    tree_scale = (r_steth / 230.0) * 0.66
    tree_cy = cy_circle - int(18 * scale)
    tiers, trunk = pine_tree_points(cx, tree_cy, tree_scale)
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
    stroke_w  = max(4, int(size * 0.018))
    # tree scale fitted to the circle (keeps trunk slightly inside)
    tree_scale = r_circle / 290.0

    # dark stethoscope ring around the tree
    draw_stethoscope(draw, cx, cy_circle, r_circle, stroke_w, DARK, GOLD)

    # dark pine tree inside
    tree_cy = cy_circle + int(6 * tree_scale * 4)
    tiers, trunk = pine_tree_points(cx, tree_cy, tree_scale)
    for tier in tiers:
        draw.polygon(tier, fill=DARK)
    draw.rectangle(trunk, fill=DARK)

    # wordmark — below the circle and its chest-piece
    y_text = cy_circle + r_circle + int(size * 0.13)
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
