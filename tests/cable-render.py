#!/usr/bin/env python3
"""Render a cable-dump JSON to PNG with PIL so cable tidiness can be judged by eye."""
import json, sys
from PIL import Image, ImageDraw

src = sys.argv[1] if len(sys.argv) > 1 else '/tmp/cable-dump.json'
dst = sys.argv[2] if len(sys.argv) > 2 else '/tmp/cable-dump.png'
scale = float(sys.argv[3]) if len(sys.argv) > 3 else 1.0
crop = None
if len(sys.argv) > 4:
    crop = [float(v) for v in sys.argv[4].split(',')]

d = json.load(open(src))
W, H = d['W'], d['H']
iw, ih = int(W * scale), int(H * scale)
img = Image.new('RGB', (iw, ih), (12, 22, 34))
dr = ImageDraw.Draw(img)

def sc(p):
    return (p[0] * scale, p[1] * scale)

for poly in d['land']:
    if len(poly) > 2:
        dr.polygon([sc(p) for p in poly], fill=(26, 44, 40), outline=(60, 92, 84))

palette = [(255, 120, 120), (120, 200, 255), (255, 210, 100), (150, 255, 160), (220, 150, 255),
           (255, 160, 60), (100, 240, 240), (255, 120, 200), (180, 220, 120), (140, 170, 255)]
for i, c in enumerate(d['cables']):
    pts = [sc(p) for p in c['pts']]
    if len(pts) > 1:
        dr.line(pts, fill=palette[i % len(palette)], width=max(1, int(round(scale))))

for c in d['cities']:
    x, y = sc((c['x'], c['y']))
    r = 2.5 * scale
    dr.ellipse([x - r, y - r, x + r, y + r], fill=(255, 255, 255))

img.save(dst)
print(dst, iw, ih)
