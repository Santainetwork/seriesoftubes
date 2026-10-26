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
CITIES = '/tmp/city_land.json'
# Which Natural Earth admin areas make up the Indonesian map, and the landmass id each one
# keeps in the game. An admin area can be split into several landmasses by island group.
ADMIN_TO_LAND = {
    'Indonesia': 'idn',
    'Malaysia': 'mla',
    'Singapore': 'sg',
    'Brunei': 'brn',
    'East Timor': 'tls',
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
# Islands smaller than MIN_AREA are dropped as specks, but some of them host a real POP. Batam
# (0.0116 sq deg) and Bintan (0.0117) fall under the threshold, which left both cities floating
# in open water and drew Tanjung Pinang and Batam on top of each other on the Sumatran coast.
# Any ring that contains a city is kept regardless of size.
def simplify_for(area):
    """Simplification tolerance, scaled to the island.

    A fixed 0.05 degrees is fine for Borneo and destroys Bintan: the island is only 0.4 degrees
    wide, so Douglas-Peucker collapses its 22 vertices into 5 and the resulting polygon no
    longer contains Tanjung Pinang. Small islands keep more detail because they have less of it
    to spare.

    The floor is 0.002, not smaller: below that the polygons gain vertices faster than they gain
    shape, and Hong Kong's harbour outline is already at the edge of what 1:50m resolves.
    """
    if area >= 1.0:
        return 0.05
    if area >= 0.1:
        return 0.015
    if area >= 0.02:
        return 0.006
    return 0.002
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
        area = ring_area(ring)
        # A big island is decided by its centre. Using the nearest vertex there is what filed all
        # of Sumatra under `btm`: one eastern-coast vertex happens to sit close to the Batam
        # reference point, so an 82-vertex ring covering 95-106E was labelled Batam and Sumatra
        # ended up drawn twice. Small islands keep the nearest-vertex rule, because their centre
        # can fall in open water between scattered islets.
        if area >= 1.0:
            lon = sum(p[0] for p in ring) / len(ring)
            lat = sum(p[1] for p in ring) / len(ring)
            best, lid = 1e18, 'jav'
            for cx, cy, cand in IDN_CENTRES:
                d = (lon - cx) ** 2 + (lat - cy) ** 2
                if d < best:
                    best, lid = d, cand
        else:
            best, lid = 1e18, 'jav'
            for cx, cy, cand in IDN_CENTRES:
                d = min((p[0] - cx) ** 2 + (p[1] - cy) ** 2 for p in ring)
                if d < best:
                    best, lid = d, cand
        assigned.append((area, ring, lid))
    return assigned


def ring_has_city(ring, cities):
    """True if any city falls inside this ring. Used to keep islands too small for MIN_AREA
    that nonetheless host a POP, such as Batam and Bintan."""
    for cid, lon, lat, land in cities:
        if point_in_ring(lon, lat, ring):
            return True
    return False


def point_in_ring(x, y, ring):
    c = False
    n = len(ring)
    for i in range(n - 1):
        x1, y1 = ring[i]
        x2, y2 = ring[i + 1]
        if (y1 > y) != (y2 > y):
            xin = (x2 - x1) * (y - y1) / (y2 - y1 + 1e-12) + x1
            if x < xin:
                c = not c
    return c


def main():
    data = json.load(open(SRC))
    cities = [tuple(c) for c in json.load(open(CITIES))]
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
            if len(ring) < 4:
                continue
            # Keep a ring if it is big enough to read at map scale, if it is a city-state, or if
            # it actually contains one of the game's cities.
            tiny = admin in ('Hong Kong S.A.R.', 'Macao S.A.R', 'Singapore', 'Brunei')
            keep = tiny or ring_area(ring) >= MIN_AREA or ring_has_city(ring, cities)
            if not keep:
                continue
            if default == 'idn':
                idn_rings.append(ring)
            else:
                ar = ring_area(ring)
                simp = simplify([(round(p[0], 3), round(p[1], 3)) for p in ring], simplify_for(ar))
                if len(simp) >= 3:
                    other.setdefault(default, []).append((ar, simp))

    # Indonesia is split by island; every other country keeps its own id.
    out = dict(other)
    for area, ring, lid in assign_islands(idn_rings):
        simp = simplify([(round(p[0], 3), round(p[1], 3)) for p in ring], simplify_for(area))
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
