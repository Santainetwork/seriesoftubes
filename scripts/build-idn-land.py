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

# One reference point per Indonesian island group. Every Indonesian ring is assigned to the
# nearest of these. A bounding box is always wrong somewhere: wide enough for Bangka-Belitung
# it also catches Batam, wide enough for Timor-Leste it also catches Flores. Nearest-centre has
# no such seams, which is why 7 rings used to end up on the wrong island.
IDN_CENTRES = [
    (110.0, -7.30, 'jav'),   # Java
    (101.5, -0.50, 'sum'),   # Sumatra
    (114.0,  0.00, 'kal'),   # Kalimantan
    (121.0, -2.00, 'sul'),   # Sulawesi
    (138.0, -4.50, 'pap'),   # Papua
    (115.2, -8.40, 'bal'),   # Bali
    (117.8, -8.60, 'ntb'),   # Lombok, Sumbawa
    (121.5, -9.00, 'ntt'),   # Flores, Sumba, west Timor
    (128.0, -3.00, 'mlk'),   # Maluku
    (104.2,  1.00, 'btm'),   # Batam, Bintan
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
    """Indonesia is one country and many islands, so its rings are split by island.
    Every other country keeps its own landmass id and is never reclassified: a box that spans
    two countries always steals one of them, which is how Thailand ended up inside Laos."""
    if default != 'idn':
        return default
    best, lid = 1e9, 'jav'
    for cx, cy, cand in IDN_CENTRES:
        d = math.hypot(lon - cx, lat - cy)
        if d < best:
            best, lid = d, cand
    return lid


def assign_islands(rings):
    """Assign each Indonesian ring to an island group.

    Neither a bounding box nor a centroid works. A box for Bangka-Belitung also catches Batam;
    Bali's centroid is closer to Lombok's reference point than to its own, so Bali's main ring
    gets filed under Nusa Tenggara. What does work: compare each reference point against the
    ring's *nearest vertex*, not its centre. A satellite island physically touches the group it
    belongs to, so its closest vertex is always the right one."""
    assigned = []
    for ring in rings:
        best, lid = 1e18, 'jav'
        for cx, cy, cand in IDN_CENTRES:
            # Squared distance from the reference point to the nearest vertex of this ring.
            d = min((p[0] - cx) ** 2 + (p[1] - cy) ** 2 for p in ring)
            if d < best:
                best, lid = d, cand
        assigned.append((ring_area(ring), ring, lid))
    return assigned


def main():
    data = json.load(open(SRC))
    idn_rings = []
    other = {}
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
            if default == 'idn':
                idn_rings.append(ring)
            else:
                simp = simplify([(round(p[0], 2), round(p[1], 2)) for p in ring], TOL)
                if len(simp) >= 3:
                    other.setdefault(default, []).append((ring_area(ring), simp))

    # Indonesia is split by island; every other country keeps its own id.
    out = dict(other)
    for area, ring, lid in assign_islands(idn_rings):
        simp = simplify([(round(p[0], 2), round(p[1], 2)) for p in ring], TOL)
        if len(simp) >= 3:
            out.setdefault(lid, []).append((area, simp))

    lines = []
    total = 0
    for lid in sorted(out):
        rings = sorted(out[lid], key=lambda r: -r[0])
        for area, ring in rings:
            lines.append('  {id:%r, ll:%s},' % (lid, json.dumps(ring, separators=(',', ':'))))
            total += len(ring)
    sys.stdout.write('const SEA_LANDS_REAL=[\n' + '\n'.join(lines) + '\n];\n')
    sys.stderr.write('%d rings, %d points, %d landmasses\n' % (len(lines), total, len(out)))


if __name__ == '__main__':
    main()
