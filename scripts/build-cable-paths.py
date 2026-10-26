"""Route subsea cables through water instead of straight through islands.

The game drew 86 of 99 Indonesian cable pairs as three points: A, midpoint, B. At map scale that
looks like a bundle of straight lines crossing Sumatra, Java and Borneo, which is what players
reported. Real cables bend around land.

This does not invent shapes: it runs A* over a coarse water grid built from the same Natural
Earth 1:50m land polygons the map draws, so a route is only possible through actual sea. Where
the grid is too coarse to find a path (narrow straits), the route falls back to a great-circle
arc, which still reads as a curve rather than a ruler line.

Run: python3 scripts/build-cable-paths.py > /tmp/cable_paths.js
"""
import heapq
import json
import math
import sys

SRC = '/tmp/ne50.geojson'

# Grid resolution in degrees. 0.25 is ~27 km at the equator: fine enough to keep the Malacca
# and Sunda straits open, coarse enough that A* over ~1,600 x 800 cells stays instant.
# 0.10 is ~11 km at the equator. At 0.25 the router produced only 3-4 waypoints for 44 of 238
# routes, and a 4-point polyline across the Java Sea has nothing to bend with: the drawn cable was
# two straight runs meeting at one vertex, which read as a kink however the renderer offset it.
STEP = 0.10
LON0, LON1 = 88.0, 162.0
LAT0, LAT1 = -14.0, 28.0

# Land polygons to rasterise. Only the countries the SEA/IDN maps draw; anything else is water.
LAND_ADMINS = {
    'Indonesia', 'Malaysia', 'Singapore', 'Brunei', 'Timor-Leste', 'Papua New Guinea',
    'Philippines', 'Thailand', 'Vietnam', 'Cambodia', 'Laos', 'Myanmar', 'Taiwan',
    'Hong Kong S.A.R.', 'Macao S.A.R', 'India', 'Sri Lanka', 'Bangladesh', 'China',
    'Australia', 'Palau', 'Solomon Islands', 'Vanuatu', 'Fiji', 'New Caledonia',
    'Japan', 'South Korea', 'North Korea', 'Maldives', 'Andaman and Nicobar',
}


def load_rings():
    data = json.load(open(SRC))
    rings = []
    for feat in data['features']:
        admin = feat['properties'].get('ADMIN')
        if admin not in LAND_ADMINS:
            continue
        geom = feat['geometry']
        polys = geom['coordinates'] if geom['type'] == 'MultiPolygon' else [geom['coordinates']]
        for poly in polys:
            rings.append([(p[0], p[1]) for p in poly[0]])
    return rings


def rasterise(rings):
    """Mark every grid cell whose centre is inside a land ring."""
    nx = int((LON1 - LON0) / STEP) + 1
    ny = int((LAT1 - LAT0) / STEP) + 1
    land = bytearray(nx * ny)

    def inside(x, y, ring):
        # Ray casting. Rings here are small enough that O(n) per cell is fine at build time.
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
                x = LON0 + i * STEP
                if inside(x, y, ring):
                    land[j * nx + i] = 1
    return land, nx, ny


def astar(land, nx, ny, a, b):
    """Shortest water path from a to b. Returns list of (lon,lat) or None."""
    def cell(p):
        i = int(round((p[0] - LON0) / STEP))
        j = int(round((p[1] - LAT0) / STEP))
        return min(max(i, 0), nx - 1), min(max(j, 0), ny - 1)

    def is_water(i, j):
        return not land[j * nx + i]

    si, sj = cell(a)
    gi, gj = cell(b)
    # The endpoints are cities, which sit on land. Nudge them to the nearest water cell.
    def nearest_water(i, j):
        if is_water(i, j):
            return i, j
        for r in range(1, 12):
            for di in range(-r, r + 1):
                for dj in range(-r, r + 1):
                    if abs(di) != r and abs(dj) != r:
                        continue
                    ni, nj = i + di, j + dj
                    if 0 <= ni < nx and 0 <= nj < ny and is_water(ni, nj):
                        return ni, nj
        return i, j

    si, sj = nearest_water(si, sj)
    gi, gj = nearest_water(gi, gj)

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
            if not (0 <= ni < nx and 0 <= nj < ny):
                continue
            if not is_water(ni, nj):
                continue
            step = 1.4142 if di and dj else 1.0
            ng = g + step
            if ng < cost.get((ni, nj), 1e18):
                cost[(ni, nj)] = ng
                came[(ni, nj)] = (i, j)
                heapq.heappush(openq, (ng + h(ni, nj), ng, ni, nj))
    return None


def arc(a, b, n=12, bend=0.12):
    """Great-circle-ish fallback: a quadratic bend, so the line still reads as a cable."""
    mx, my = (a[0] + b[0]) / 2, (a[1] + b[1]) / 2
    dx, dy = b[0] - a[0], b[1] - a[1]
    # Perpendicular offset, always to the same side so parallel cables do not cross each other.
    cx, cy = mx - dy * bend, my + dx * bend
    out = []
    for k in range(n + 1):
        t = k / n
        u = 1 - t
        out.append((round(u * u * a[0] + 2 * u * t * cx + t * t * b[0], 2),
                    round(u * u * a[1] + 2 * u * t * cy + t * t * b[1], 2)))
    return out


def smooth(path, tol=0.06):
    """Douglas-Peucker on the grid path: keeps the bends, drops the staircase."""
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


def main():
    pairs = json.load(open('/tmp/cable_pairs.json'))
    rings = load_rings()
    land, nx, ny = rasterise(rings)
    sys.stderr.write('grid %dx%d, land cells %d\n' % (nx, ny, sum(land)))

    out = {}
    routed = fallback = 0
    for rec in pairs:
        key = rec['cid'] + '|' + rec['a'] + '|' + rec['b']
        a = (rec['alon'], rec['alat'])
        b = (rec['blon'], rec['blat'])
        # A short hop over water does not need a router. Batam-Tanjung Pinang is 14px apart on
        # screen, but A* sent its cable via Singapore (103.58E) because that channel was open,
        # turning a 14px link into a 360px loop. Straight-line anything shorter than 0.5 degrees.
        if math.hypot(b[0] - a[0], b[1] - a[1]) < 2.0:
            pts = [a, b]
            routed += 1
            path = pts
        else:
            path = astar(land, nx, ny, a, b)
        if path and len(path) >= 2:
            pts = smooth(path) if len(path) > 2 else path
            # Pin the true endpoints: the grid snapped them to cell centres.
            pts[0] = (round(a[0], 2), round(a[1], 2))
            pts[-1] = (round(b[0], 2), round(b[1], 2))
            routed += 1
        else:
            pts = arc(a, b)
            fallback += 1
        # Densify: A* returns a vertex only where the path turns, so a straight run across open
        # water comes back as 3 points. The renderer offsets each vertex to separate parallel
        # cables, and a 3-point line has nothing to offset with — it just kinks at the middle one.
        # Insert a point every ~0.35 degrees so every route has something to bend.
        dense = [pts[0]]
        for j in range(1, len(pts)):
            ax, ay = pts[j - 1]
            bx, by = pts[j]
            seg = math.hypot(bx - ax, by - ay)
            n = max(1, int(seg / 0.35))
            for m in range(1, n + 1):
                dense.append((ax + (bx - ax) * m / n, ay + (by - ay) * m / n))
        out[key] = [[round(x, 2), round(y, 2)] for x, y in dense]

    sys.stderr.write('routed %d, arc fallback %d\n' % (routed, fallback))
    json.dump(out, sys.stdout, separators=(',', ':'))


if __name__ == '__main__':
    main()
