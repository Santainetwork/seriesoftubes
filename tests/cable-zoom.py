#!/usr/bin/env python3
"""Crop + zoom a cable-dump render for close inspection."""
import json, sys
from PIL import Image, ImageDraw

src = sys.argv[1]
dst = sys.argv[2]
x0, y0, x1, y1 = [float(v) for v in sys.argv[3].split(',')]
zoom = float(sys.argv[4]) if len(sys.argv) > 4 else 3.0
labels = (len(sys.argv) > 5 and sys.argv[5] == 'labels')

d = json.load(open(src))
W, H = d['W'], d['H']
iw, ih = int((x1 - x0) * zoom), int((y1 - y0) * zoom)
img = Image.new('RGB', (iw, ih), (12, 22, 34))
dr = ImageDraw.Draw(img)

def sc(p):
    return ((p[0] - x0) * zoom, (p[1] - y0) * zoom)

for poly in d['land']:
    if len(poly) > 2:
        dr.polygon([sc(p) for p in poly], fill=(26, 44, 40), outline=(60, 92, 84))

palette = [(255, 120, 120), (120, 200, 255), (255, 210, 100), (150, 255, 160), (220, 150, 255),
           (255, 160, 60), (100, 240, 240), (255, 120, 200), (180, 220, 120), (140, 170, 255)]
for i, c in enumerate(d['cables']):
    pts = [sc(p) for p in c['pts']]
    if len(pts) > 1:
        dr.line(pts, fill=palette[i % len(palette)], width=max(1, int(round(zoom * 0.6))))

for c in d['cities']:
    x, y = sc((c['x'], c['y']))
    if not (0 <= x <= iw and 0 <= y <= ih):
        continue
    r = 2.5 * zoom
    dr.ellipse([x - r, y - r, x + r, y + r], fill=(255, 255, 255))
    if labels:
        dr.text((x + r + 1, y - r - 1), c['id'], fill=(230, 230, 230))

img.save(dst)
print(dst, iw, ih)
