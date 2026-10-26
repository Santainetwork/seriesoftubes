"""Route land cables along land, not through the sea.

A rail duct (Waeve) runs beside railway track. Routing it through the ocean is nonsense: the
water router happily sent jog->sby out into the Indian Ocean and back, 16 waypoints of coastline
for two cities 160 km apart on the same island.

Land cables therefore need the opposite constraint from subsea cables: every waypoint must be
on land, and the path should be the shortest one that stays on land. That is A* over a *land*
grid, with the water as the obstacle.

Input : /tmp/cable_pairs.json  (or a land subset)
Output: JSON {"<cid>|<a>|<b>": [[lon,lat],...]}
"""
import heapq
import json
import math
import sys

SRC = '/tmp/ne50.geojson'

# Finer than the sea grid: a rail corridor is narrow, and Java is only ~1 degree tall.
STEP = 0.1
LON0, LON1 = 94.0, 142.0
LAT0, LAT1 = -12.0, 8.0

LAND_ADMINS = {'Indonesia', 'Malaysia', 'Singapore', 'Brunei', 'Timor-Leste', 'Papua New Guinea'}


def load_rings():
    data = json.load(open(SRC))
    rings = []
    for feat in data['features']:
        if feat['properties'].get('ADMIN') not in LAND_ADMINS:
            continue
        geom = feat['geometry']
        polys = geom['coordinates'] if geom['type'] == 'MultiPolygon' else [geom['coordinates']]
        for poly in polys:
            rings.append([(p[0], p[1]) for p in poly[0]])
    return rings


def inside(x, y, ring):
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


def rasterise(rings):
    nx = int((LON1 - LON0) / STEP) + 1
    ny = int((LAT1 - LAT0) / STEP) + 1
    land = bytearray(nx * ny)
    for ring in rings:
        xs = [p[0] for p in ring]
        ys = [p[1] for p in ring]
        i0 = max(0, int((min(xs) - LON0) / STEP))
        i1 = min(nx - 1, int((max(xs) - LON0) / STEP) + 1)
        j0 = max(0, int((min(ys) - LAT0) / STEP))
        j1 = min(ny - 1, int((max(ys) - LAT0) / STEP) + 1)
        for j in range(j0, j1 + 1):
            y = LAT0 + j * STEP
            for i in range(i0, i1 + 1):
                if land[j * nx + i]:
                    continue
                if inside(LON0 + i * STEP, y, ring):
                    land[j * nx + i] = 1
    return land, nx, ny


def astar_land(land, nx, ny, a, b):
    """Shortest path that never leaves land. Water cells are walls."""
    def cell(p):
        i = int(round((p[0] - LON0) / STEP))
        j = int(round((p[1] - LAT0) / STEP))
        return min(max(i, 0), nx - 1), min(max(j, 0), ny - 1)

    def is_land(i, j):
        return bool(land[j * nx + i])

    si, sj = cell(a)
    gi, gj = cell(b)

    def nearest_land(i, j):
        if is_land(i, j):
            return i, j
        for r in range(1, 10):
            for di in range(-r, r + 1):
                for dj in range(-r, r + 1):
                    if abs(di) != r and abs(dj) != r:
                        continue
                    ni, nj = i + di, j + dj
                    if 0 <= ni < nx and 0 <= nj < ny and is_land(ni, nj):
                        return ni, nj
        return i, j

    si, sj = nearest_land(si, sj)
    gi, gj = nearest_land(gi, gj)

    def h(i, j):
        return math.hypot(i - gi, j - gj)

    openq = [(h(si, sj), 0.0, si, sj)]
    came = {}
    cost = {(si, sj): 0.0}
    while openq:
        f, g, i, j = heapq.heappop(openq)
        if (i, j) == (gi, gj):
            path = [(i, j)]
            while (i, j) in came:
                i, j = came[(i, j)]
                path.append((i, j))
            path.reverse()
            return [(LON0 + p[0] * STEP, LAT0 + p[1] * STEP) for p in path]
        if g > cost.get((i, j), 1e18):
            continue
        for di, dj in ((1, 0), (-1, 0), (0, 1), (0, -1), (1, 1), (1, -1), (-1, 1), (-1, -1)):
            ni, nj = i + di, j + dj
            if not (0 <= ni < nx and 0 <= nj < ny) or not is_land(ni, nj):
                continue
            ng = g + (1.4142 if di and dj else 1.0)
            if ng < cost.get((ni, nj), 1e18):
                cost[(ni, nj)] = ng
                came[(ni, nj)] = (i, j)
                heapq.heappush(openq, (ng + h(ni, nj), ng, ni, nj))
    return None


def smooth(path, tol=0.04):
    if len(path) < 3:
        return path

    def perp(p, a, b):
        dx, dy = b[0] - a[0], b[1] - a[1]
        if dx == 0 and dy == 0:
            return math.hypot(p[0] - a[0], p[1] - a[1])
        t = ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / (dx * dx + dy * dy)
        t = max(0.0, min(1.0, t))
        return math.hypot(p[0] - (a[0] + t * dx), p[1] - (a[1] + t * dy))

    keep = [False] * len(path)
    keep[0] = keep[-1] = True
    stack = [(0, len(path) - 1)]
    while stack:
        lo, hi = stack.pop()
        if hi <= lo + 1:
            continue
        worst, idx = 0.0, lo
        for i in range(lo + 1, hi):
            d = perp(path[i], path[lo], path[hi])
            if d > worst:
                worst, idx = d, i
        if worst > tol:
            keep[idx] = True
            stack.append((lo, idx))
            stack.append((idx, hi))
    return [p for p, k in zip(path, keep) if k]


def straight_km(a, b):
    R = 6371.0
    p1, p2 = math.radians(a[1]), math.radians(b[1])
    dp = p2 - p1
    dl = math.radians(b[0] - a[0])
    x = math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return 2 * R * math.asin(math.sqrt(x))


def path_km(path):
    return sum(straight_km(path[i - 1], path[i]) for i in range(1, len(path)))


def main():
    pairs = json.load(open('/tmp/cable_pairs_land.json'))
    land, nx, ny = rasterise(load_rings())
    sys.stderr.write('land grid %dx%d, land cells %d\n' % (nx, ny, sum(land)))

    out = {}
    ok = fallback = 0
    for rec in pairs:
        key = rec['cid'] + '|' + rec['a'] + '|' + rec['b']
        a = (rec['alon'], rec['alat'])
        b = (rec['blon'], rec['blat'])
        path = astar_land(land, nx, ny, a, b)
        if path and len(path) >= 3:
            pts = smooth(path)
            # A land route must not be a wild detour; if it is, the grid disagrees with reality
            # and a straight line is the honest answer.
            ratio = path_km(pts) / max(straight_km(a, b), 1.0)
            if ratio <= 2.2:
                pts[0] = (round(a[0], 2), round(a[1], 2))
                pts[-1] = (round(b[0], 2), round(b[1], 2))
                out[key] = [[round(x, 2), round(y, 2)] for x, y in pts]
                ok += 1
                continue
            sys.stderr.write('%s: land detour %.1fx, using direct line\n' % (key, ratio))
        else:
            sys.stderr.write('%s: no land path\n' % key)
        # Direct line with a slight bend, so it reads as a duct and not a ruler.
        mx, my = (a[0] + b[0]) / 2, (a[1] + b[1]) / 2
        dx, dy = b[0] - a[0], b[1] - a[1]
        cx, cy = mx - dy * 0.06, my + dx * 0.06
        pts = []
        for k in range(9):
            t = k / 8
            u = 1 - t
            pts.append((round(u * u * a[0] + 2 * u * t * cx + t * t * b[0], 2),
                        round(u * u * a[1] + 2 * u * t * cy + t * t * b[1], 2)))
        out[key] = pts
        fallback += 1

    sys.stderr.write('routed on land %d, direct fallback %d\n' % (ok, fallback))
    json.dump(out, sys.stdout, separators=(',', ':'))


if __name__ == '__main__':
    main()
