"""Build real Indonesia/SEA land polygons for the Series of Tubes map.

The hand-drawn polygons in the game are far too coarse: Java has 22 points, Sumatra 25.
Natural Earth 1:50m gives Indonesia 3,717 points, which is the right shape but too heavy to
inline. This script keeps every island above a size threshold, simplifies each ring with
Douglas-Peucker, and emits the same `{id, ll:[[lon,lat],...]}` shape the game already reads.

Run: python3 scripts/build-idn-land.py > /tmp/idn_land.js
"""
import json
import math
import sys

SRC = '/tmp/ne50.geojson'
# Which Natural Earth admin areas make up the Indonesian map, and the landmass id each one
# keeps in the game. An admin area can be split into several landmasses by island group.
ADMIN_TO_LAND = {
    'Indonesia': 'idn',
    'Malaysia': 'mla',
    'Singapore': 'sg',
    'Brunei': 'brn',
    'Timor-Leste': 'tls',
    'Papua New Guinea': 'pap',
    'Philippines': 'ph',
    'Thailand': 'tha',
    'Vietnam': 'vnm',
    'Cambodia': 'khm',
    'Laos': 'lao',
    'Myanmar': 'mmr',
    'Taiwan': 'tw',
    'Hong Kong S.A.R.': 'hkg',
    'Macao S.A.R': 'hkg',
}

# Islands smaller than this (in square degrees) are dropped: at map scale they are a dot.
MIN_AREA = 0.02
# Douglas-Peucker tolerance in degrees. 0.05 keeps the shape readable without the noise.
TOL = 0.05

# Rough island boxes: lon0, lat0, lon1, lat1 -> landmass id. First match wins, so the big
# islands come first. Anything unmatched falls back to the admin area's default.
BOXES = [
    # Small or enclave areas first: a later, bigger box must not swallow them.
    (103.5, 1.0, 104.5, 1.6, 'sg'),
    (113.5, 22.0, 114.6, 22.6, 'hkg'),
    (114.5, -9.5, 116.0, -8.0, 'bal'),
    (105.5, -3.5, 109.0, 0.5, 'btm'),
    (114.0, 4.0, 115.5, 5.5, 'brn'),
    (124.0, -10.0, 128.0, -8.0, 'tls'),
    (119.5, 21.5, 122.5, 25.5, 'tw'),
    (102.0, 9.5, 108.0, 14.8, 'khm'),
    # Maluku: Halmahera, Seram, Buru, Ambon and the Aru group, west of the Papua line.
    (124.0, -8.5, 131.5, 3.0, 'mlk'),
    (115.0, -9.5, 119.5, -8.0, 'ntb'),
    (118.5, -11.0, 125.5, -8.0, 'ntt'),
    (118.5, -6.0, 125.5, 2.0, 'sul'),
    (105.0, -9.5, 115.0, -5.5, 'jav'),
    (102.0, 8.0, 110.0, 23.5, 'vnm'),
    (99.3, 0.8, 105.0, 7.5, 'mla'),
    (100.0, 13.5, 107.8, 22.6, 'lao'),
    (97.0, 5.5, 106.0, 20.5, 'tha'),
    (92.0, 9.5, 101.5, 28.5, 'mmr'),
    # Papua: the Indonesian half plus PNG, up to but not including the Solomon Sea.
    (130.0, -10.5, 156.5, 0.5, 'pap'),
    (94.5, -6.5, 106.5, 6.5, 'sum'),
    (108.5, -4.5, 119.5, 7.5, 'kal'),
    (116.0, 4.5, 127.5, 21.5, 'ph'),
]


def ring_area(ring):
    """Shoelace area in square degrees; sign ignored."""
    a = 0.0
    for i in range(len(ring) - 1):
        x1, y1 = ring[i]
        x2, y2 = ring[i + 1]
        a += x1 * y2 - x2 * y1
    return abs(a) / 2.0


def perp(p, a, b):
    if a == b:
        return math.hypot(p[0] - a[0], p[1] - a[1])
    dx, dy = b[0] - a[0], b[1] - a[1]
    t = ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / (dx * dx + dy * dy)
    t = max(0.0, min(1.0, t))
    px, py = a[0] + t * dx, a[1] + t * dy
    return math.hypot(p[0] - px, p[1] - py)


def simplify(pts, tol):
    """Iterative Douglas-Peucker: recursion would blow the stack on 4,000-point rings."""
    if len(pts) < 3:
        return pts
    keep = [False] * len(pts)
    keep[0] = keep[-1] = True
    stack = [(0, len(pts) - 1)]
    while stack:
        lo, hi = stack.pop()
        if hi <= lo + 1:
            continue
        worst, idx = 0.0, lo
        for i in range(lo + 1, hi):
            d = perp(pts[i], pts[lo], pts[hi])
            if d > worst:
                worst, idx = d, i
        if worst > tol:
            keep[idx] = True
            stack.append((lo, idx))
            stack.append((idx, hi))
    return [p for p, k in zip(pts, keep) if k]


def which_land(lon, lat, default):
    """Indonesia is one country and many islands, so its rings are split by island box.
    Every other country keeps its own landmass id and is never reclassified: a box that spans
    two countries always steals one of them, which is how Thailand ended up inside Laos."""
    if default != 'idn':
        return default
    for x0, y0, x1, y1, lid in BOXES:
        if x0 <= lon <= x1 and y0 <= lat <= y1:
            return lid
    # A few islands fall between the boxes (Natuna, Sangihe, Selayar): give them the nearest
    # big island rather than a landmass id of their own, which no city uses.
    best, lid = 1e9, 'jav'
    for x0, y0, x1, y1, cand in BOXES:
        if cand in ('sg', 'hkg', 'brn', 'tls', 'tw', 'khm', 'lao', 'tha', 'vnm', 'mmr', 'mla', 'ph'):
            continue
        cx, cy = (x0 + x1) / 2, (y0 + y1) / 2
        d = math.hypot(lon - cx, lat - cy)
        if d < best:
            best, lid = d, cand
    return lid


def main():
    data = json.load(open(SRC))
    out = {}
    for feat in data['features']:
        admin = feat['properties'].get('ADMIN')
        if admin not in ADMIN_TO_LAND:
            continue
        default = ADMIN_TO_LAND[admin]
        geom = feat['geometry']
        polys = geom['coordinates'] if geom['type'] == 'MultiPolygon' else [geom['coordinates']]
        for poly in polys:
            ring = poly[0]  # outer ring only; holes are invisible at this scale
            # City-states are tiny; keep them anyway, they host real POPs.
            tiny = admin in ('Hong Kong S.A.R.', 'Macao S.A.R', 'Singapore', 'Brunei')
            if len(ring) < 4 or (ring_area(ring) < MIN_AREA and not tiny):
                continue
            lon = sum(p[0] for p in ring) / len(ring)
            lat = sum(p[1] for p in ring) / len(ring)
            lid = which_land(lon, lat, default)
            # A few islands fall between the boxes (Natuna, Sangihe, Selayar). Give them the
            # nearest big island rather than a landmass id of their own, which no city uses.
            if lid == 'idn':
                if lon < 112: lid = 'sum' if lat > -3 else 'jav'
                elif lon < 120: lid = 'kal' if lat > -3.5 else 'jav'
                elif lon < 126: lid = 'sul'
                else: lid = 'mlk'
            simp = simplify([(round(p[0], 2), round(p[1], 2)) for p in ring], TOL)
            if len(simp) < 3:
                continue
            out.setdefault(lid, []).append((ring_area(ring), simp))

    # One entry per landmass: keep the biggest ring, append the rest as extra rings so small
    # satellite islands still show.
    lines = []
    total = 0
    for lid in sorted(out):
        rings = sorted(out[lid], key=lambda r: -r[0])
        for area, ring in rings:
            lines.append('  {id:%r, ll:%s},' % (lid, json.dumps(ring, separators=(',', ':'))))
            total += len(ring)
    sys.stdout.write('const SEA_LANDS_REAL=[\n' + '\n'.join(lines) + '\n];\n')
    sys.stderr.write('%d rings, %d points\n' % (len(lines), total))


if __name__ == '__main__':
    main()
