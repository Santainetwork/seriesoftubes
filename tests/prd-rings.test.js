// The coastline is drawn from 158 rings, but a city's island comes from its own `land` field, and
// those two can disagree. When they do, a POP appears to sit on the wrong island: karhutla skips
// it (it looks for sum/kal/btm/jav), and the subsea-versus-overland test picks the wrong answer.
// This suite locks the invariant that matters: every city lies inside a ring of its own landmass.
const test = require('node:test');
const assert = require('node:assert');
const { load } = require('./harness.js');

function inPoly(x, y, poly) {
  let c = false;
  for (let i = 0, n = poly.length; i < n; i++) {
    const x1 = poly[i][0], y1 = poly[i][1], x2 = poly[(i + 1) % n][0], y2 = poly[(i + 1) % n][1];
    if ((y1 > y) !== (y2 > y) && x < (x2 - x1) * (y - y1) / (y2 - y1 || 1e-18) + x1) c = !c;
  }
  return c;
}

test('rings: every SEA city sits inside a ring of its own landmass', () => {
  const { ev } = load();
  const lands = ev('JSON.stringify(SEA_LANDS)');
  const lls = ev('JSON.stringify(SEA_CITY_LL)');
  const cities = ev('JSON.stringify(SEA_CITIES.map(c=>({id:c.id,name:c.name,land:c.land})))');
  const rings = JSON.parse(lands), ll = JSON.parse(lls), cs = JSON.parse(cities);
  assert.ok(rings.length >= 150, 'expected the full Natural Earth coastline, got ' + rings.length);

  const bad = [];
  for (const c of cs) {
    const q = ll[c.id];
    if (!q) { bad.push(c.name + ' has no coordinate'); continue; }
    const hits = rings.filter(r => inPoly(q[0], q[1], r.ll));
    if (!hits.length) { bad.push(c.name + ' is in the sea'); continue; }
    // the largest ring containing the city is the island it is standing on
    const area = r => Math.abs(r.ll.reduce((s, p, i) => {
      const n = r.ll[(i + 1) % r.ll.length];
      return s + p[0] * n[1] - n[0] * p[1];
    }, 0)) / 2;
    const biggest = hits.sort((a, b) => area(b) - area(a))[0];
    // Two cities sit on a ring whose id is coarser than their own, and both are correct: Sorong is
    // in Papua Barat, which the map draws as part of the single Papua ring (`papw` is a region
    // marker, not a landmass), and Dili is in Timor-Leste, drawn on the same ring as West Timor
    // (`ntt`). Everything else must match exactly.
    const ok = { papw: ['pap'], tls: ['ntt'] };
    const allowed = [c.land].concat(ok[c.land] || []);
    if (!allowed.includes(biggest.id)) bad.push(c.name + ': land=' + c.land + ' but ring=' + biggest.id);
  }
  assert.deepEqual(bad, [], 'cities whose island disagrees with the coastline');
});

test('rings: no Indonesian ring swallows another island whole', () => {
  const { ev } = load();
  const rings = JSON.parse(ev('JSON.stringify(SEA_LANDS)'));
  const IDN = new Set(['jav', 'sum', 'kal', 'sul', 'pap', 'bal', 'ntb', 'ntt', 'mlk', 'btm']);
  // A ring spanning more than 12 degrees in both directions inside the archipelago is not an
  // island, it is a continent-sized mistake — the shape of the Sumatra double-draw bug.
  const huge = rings
    .filter(r => IDN.has(r.id))
    .map(r => {
      const xs = r.ll.map(p => p[0]), ys = r.ll.map(p => p[1]);
      return { id: r.id, w: Math.max(...xs) - Math.min(...xs), h: Math.max(...ys) - Math.min(...ys) };
    })
    .filter(r => r.w > 12 && r.h > 12);
  assert.deepEqual(huge, [], 'rings too large to be a single island');
});

test('rings: the two islands that sit in open water are still drawn', () => {
  const { ev } = load();
  const rings = JSON.parse(ev('JSON.stringify(SEA_LANDS)'));
  // Kangean (Java Sea) and Kai Besar (Maluku) are the two smallest populated-looking islands in
  // the archipelago. They were once dropped by the 0.02 sq-deg threshold; keep them drawn.
  const has = (lon, lat) => rings.some(r => inPoly(lon, lat, r.ll));
  assert.ok(has(115.38, -6.91), 'Kangean is missing from the coastline');
  assert.ok(has(132.72, -5.78), 'Kai Besar is missing from the coastline');
});
