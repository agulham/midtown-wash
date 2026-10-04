#!/usr/bin/env python3
"""
Composite a water-hose + soap-bubble wash effect onto the VEYRA car asset.
Pure local image editing (Pillow) — no AI generation, no external credits.
Source car PNG is the real downloaded VEYRA v1.0.0 asset (exterior-polished.png).
"""
import random
from PIL import Image, ImageDraw, ImageFilter, ImageChops, ImageEnhance

random.seed(42)

SRC = "/opt/data/midtown-wash/assets/images/veyra_src/exterior-polished.png"
OUT = "/opt/data/midtown-wash/assets/images/veyra-hero-wash.png"

base = Image.open(SRC).convert("RGBA")
W, H = base.size

# ---------- Layer 1: water spray / jet from upper-left (hose) ----------
spray = Image.new("RGBA", (W, H), (0, 0, 0, 0))
sd = ImageDraw.Draw(spray)

# Hose jet origin (off-frame upper left), aimed at the car body
jet_origin = (int(W * -0.02), int(H * 0.30))
jet_target = (int(W * 0.42), int(H * 0.55))

# Main water stream — layered translucent white/blue lines with jitter for a spray cone
for i in range(220):
    t = i / 220
    ox = jet_origin[0] + (jet_target[0] - jet_origin[0]) * t + random.uniform(-14, 14) * (1 - t * 0.3)
    oy = jet_origin[1] + (jet_target[1] - jet_origin[1]) * t + random.uniform(-10, 10) * (1 - t * 0.3)
    length = random.uniform(10, 26)
    angle_jit = random.uniform(-0.15, 0.15)
    dx = (jet_target[0] - jet_origin[0]) / 400
    dy = (jet_target[1] - jet_origin[1]) / 400
    x2 = ox + dx * length * 10 + angle_jit * 20
    y2 = oy + dy * length * 10 + angle_jit * 10
    alpha = int(90 + 90 * (1 - t))
    w = max(1, int(3 * (1 - t) + 1))
    col = (235, 245, 255, alpha) if random.random() > 0.3 else (210, 230, 245, alpha)
    sd.line([(ox, oy), (x2, y2)], fill=col, width=w)

spray = spray.filter(ImageFilter.GaussianBlur(0.6))

# Droplet scatter around impact zone
droplets = Image.new("RGBA", (W, H), (0, 0, 0, 0))
dd = ImageDraw.Draw(droplets)
impact_cx, impact_cy = jet_target
for _ in range(260):
    ang = random.uniform(0, 6.283)
    dist = random.uniform(0, 230) * random.random()
    x = impact_cx + dist * 0.9 + random.uniform(-40, 220)
    y = impact_cy + dist * 0.5 + random.uniform(-120, 90)
    if not (0 <= x < W and 0 <= y < H):
        continue
    r = random.uniform(0.8, 3.2)
    alpha = int(random.uniform(90, 200))
    dd.ellipse([x - r, y - r, x + r, y + r], fill=(255, 255, 255, alpha))
droplets = droplets.filter(ImageFilter.GaussianBlur(0.4))

# ---------- Layer 2: soap bubbles / suds clinging to lower body & hood ----------
bubbles = Image.new("RGBA", (W, H), (0, 0, 0, 0))
bd = ImageDraw.Draw(bubbles)

# Suds patch zones (roughly over hood, front fender, lower door = where foam collects)
suds_zones = [
    (int(W*0.12), int(H*0.55), int(W*0.42), int(H*0.82)),   # front/hood/fender
    (int(W*0.38), int(H*0.62), int(W*0.70), int(H*0.88)),   # lower door/sill
    (int(W*0.60), int(H*0.58), int(W*0.90), int(H*0.86)),   # rear quarter
]

def draw_bubble_cluster(draw, zone, count, rmin, rmax):
    x0, y0, x1, y1 = zone
    for _ in range(count):
        cx = random.uniform(x0, x1)
        cy = random.uniform(y0, y1)
        r = random.uniform(rmin, rmax)
        base_alpha = int(random.uniform(130, 215))
        # foam body
        draw.ellipse([cx - r, cy - r, cx + r, cy + r], fill=(255, 255, 255, base_alpha))
        # subtle highlight
        hr = r * 0.35
        draw.ellipse([cx - r*0.35 - hr/2, cy - r*0.4 - hr/2, cx - r*0.35 + hr/2, cy - r*0.4 + hr/2],
                     fill=(255, 255, 255, min(255, base_alpha + 40)))

for zone in suds_zones:
    draw_bubble_cluster(bd, zone, count=120, rmin=3, rmax=11)
    draw_bubble_cluster(bd, zone, count=60, rmin=10, rmax=22)

bubbles = bubbles.filter(ImageFilter.GaussianBlur(0.3))

# Thin foam streaks dripping down panel (soap running off)
drip = Image.new("RGBA", (W, H), (0, 0, 0, 0))
drd = ImageDraw.Draw(drip)
for _ in range(30):
    zone = random.choice(suds_zones)
    x = random.uniform(zone[0], zone[2])
    y0 = random.uniform(zone[1], zone[3] - 20)
    length = random.uniform(20, 70)
    w = random.uniform(1.5, 4)
    alpha = int(random.uniform(90, 170))
    drd.line([(x, y0), (x + random.uniform(-4, 4), y0 + length)], fill=(255, 255, 255, alpha), width=int(w))
drip = drip.filter(ImageFilter.GaussianBlur(0.8))

# ---------- Composite stack ----------
out = base.copy()
out = Image.alpha_composite(out, spray)
out = Image.alpha_composite(out, droplets)
out = Image.alpha_composite(out, drip)
out = Image.alpha_composite(out, bubbles)

# Wet-gloss boost: slightly increase contrast/saturation on the car to sell "wet" look
enh = ImageEnhance.Contrast(out.convert("RGB")).enhance(1.05)
enh = ImageEnhance.Color(enh).enhance(1.08)
out = Image.merge("RGBA", (*enh.split(), out.split()[3]))

out.convert("RGB").save(OUT, "PNG", optimize=True)
print("Saved:", OUT, out.size)
