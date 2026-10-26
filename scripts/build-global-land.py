"""Generator garis pantai untuk Region Global — tooling saja, tidak masuk build runtime.

Kenapa tidak dipakai sekarang: game ini satu berkas HTML yang harus bisa dibuka lewat file://
tanpa server. Garis pantai Global yang presisi butuh ~420 KB data (Natural Earth 1:50m sedunia:
1.026 ring, 28.784 titik), dan menaruhnya inline akan menggandakan ukuran berkas sementara
presisi pantai hanya relevan di SEA/IDN — di sana kota dan kabel benar-benar duduk di pulau.
Global adalah latar, bukan medan bermain.

Skrip ini disimpan supaya kalau suatu hari ada aset terpisah (fetch atau <script src>), cara
membuatnya sudah ada dan tidak perlu diturunkan ulang.

Pakai:
    python3 scripts/build-global-land.py /tmp/ne50.geojson > /tmp/global_lands.js

Unduh Natural Earth 1:50m lebih dulu:
    https://naciscdn.org/naturalearth/50m/physical/ne_50m_admin_0_countries.zip
"""
import json
import math
import sys

SRC = sys.argv[1] if len(sys.argv) > 1 else '/tmp/ne50.geojson'

# Negara yang punya kota di Region Global, dipetakan ke id landmass dua huruf yang sudah dipakai
# LANDS_LL. Yang tidak ada di sini dibuang: peta Global hanya butuh bentuk benua yang dikenali.
COUNTRY_TO_LAND = {
    'United States of America': 'us', 'Canada': 'ca', 'Mexico': 'mx', 'Brazil': 'br',
    'Argentina': 'ar', 'Chile': 'cl', 'Peru': 'pe', 'Colombia': 'co', 'Venezuela': 've',
    'United Kingdom': 'gb', 'Ireland': 'ie', 'France': 'fr', 'Germany': 'de', 'Spain': 'es',
    'Portugal': 'pt', 'Italy': 'it', 'Netherlands': 'nl', 'Belgium': 'be', 'Switzerland': 'ch',
    'Austria': 'at', 'Poland': 'pl', 'Czechia': 'cz', 'Sweden': 'se', 'Norway': 'no',
    'Finland': 'fi', 'Denmark': 'dk', 'Russia': 'ru', 'Ukraine': 'ua', 'Turkey': 'tr',
    'Greece': 'gr', 'Romania': 'ro', 'Hungary': 'hu', 'Bulgaria': 'bg', 'Serbia': 'rs',
    'China': 'cn', 'Japan': 'jp', 'South Korea': 'kr', 'North Korea': 'kp', 'India': 'in',
    'Pakistan': 'pk', 'Bangladesh': 'bd', 'Sri Lanka': 'lk', 'Nepal': 'np', 'Bhutan': 'bt',
    'Myanmar': 'mmr', 'Thailand': 'tha', 'Vietnam': 'vn', 'Cambodia': 'kh', 'Laos': 'la',
    'Malaysia': 'mys', 'Singapore': 'sg', 'Indonesia': 'idn', 'Philippines': 'ph',
    'Brunei': 'brn', 'Australia': 'au', 'New Zealand': 'nz', 'Papua New Guinea': 'pg',
    'Egypt': 'eg', 'South Africa': 'za', 'Nigeria': 'ng', 'Kenya': 'ke', 'Morocco': 'ma',
    'Algeria': 'dz', 'Ethiopia': 'et', 'Ghana': 'gh', 'Tanzania': 'tz', 'Angola': 'ao',
    'Saudi Arabia': 'sa', 'United Arab Emirates': 'ae', 'Israel': 'il', 'Iran': 'ir',
    'Iraq': 'iq', 'Qatar': 'qa', 'Kuwait': 'kw', 'Oman': 'om', 'Jordan': 'jo', 'Lebanon': 'lb',
    'Kazakhstan': 'kz', 'Uzbekistan': 'uz', 'Mongolia': 'mn', 'Taiwan': 'tw',
    'Hong Kong S.A.R.': 'hkg', 'Macao S.A.R': 'mac',
}

MIN_AREA = 0.35          # sq deg — benua butuh detail, pulau kecil dibuang


def ring_area(ring):
    a = 0.0
    for i in range(len(ring) - 1):
        a += ring[i][0] * ring[i + 1][1] - ring[i + 1][0] * ring[i][1]
    return abs(a) / 2.0


def perp(p, a, b):
    if a == b:
        return math.hypot(p[0] - a[0], p[1] - a[1])
    dx, dy = b[0] - a[0], b[1] - a[1]
    t = ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / (dx * dx + dy * dy)
    t = max(0.0, min(1.0, t))
    return math.hypot(p[0] - (a[0] + t * dx), p[1] - (a[1] + t * dy))


def simplify(pts, tol):
    """Douglas-Peucker iteratif; rekursi akan meledak di ring 4.000 titik."""
    if len(pts) < 3:
        return pts
    keep = [False] * len(pts)
    keep[0] = keep[-1] = True
    stack = [(0, len(pts) - 1)]
    while stack:
        lo, hi = stack.pop()
        if hi <= lo + 1:
            continue
        dmax, idx = -1.0, lo
        for i in range(lo + 1, hi):
            d = perp(pts[i], pts[lo], pts[hi])
            if d > dmax:
                dmax, idx = d, i
        if dmax > tol:
            keep[idx] = True
            stack.append((lo, idx))
            stack.append((idx, hi))
    return [p for p, k in zip(pts, keep) if k]


def main():
    data = json.load(open(SRC))
    out = {}
    for feat in data['features']:
        admin = feat['properties'].get('ADMIN')
        lid = COUNTRY_TO_LAND.get(admin)
        if not lid:
            continue
        geom = feat['geometry']
        polys = geom['coordinates'] if geom['type'] == 'MultiPolygon' else [geom['coordinates']]
        for poly in polys:
            ring = poly[0]
            if len(ring) < 4:
                continue
            area = ring_area(ring)
            if area < MIN_AREA:
                continue
            tol = 0.08 if area > 40 else (0.03 if area > 5 else 0.012)
            simp = simplify([(round(p[0], 2), round(p[1], 2)) for p in ring], tol)
            if len(simp) >= 3:
                out.setdefault(lid, []).append((area, simp))

    lines, total = [], 0
    for lid in sorted(out):
        for area, ring in sorted(out[lid], key=lambda r: -r[0]):
            lines.append('  {id:%r, ll:%s},' % (lid, json.dumps(ring, separators=(',', ':'))))
            total += len(ring)
    sys.stdout.write('const LANDS_GLOBAL=[\n' + '\n'.join(lines) + '\n];\n')
    sys.stderr.write('%d rings, %d points, %d landmasses\n' % (len(lines), total, len(out)))


if __name__ == '__main__':
    main()
