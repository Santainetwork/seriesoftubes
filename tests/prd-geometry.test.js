// Map geometry — the coastline and the cables.
//
// Players reported two separate things about the map: the Indonesian islands did not look like
// Indonesia, and the subsea cables were a bundle of straight lines crossing land. Both had the
// same root cause: the geometry was hand-drawn. These tests pin the fix so it cannot regress.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { load } from './harness.js';

// Ray casting against one ring. Kept in the test rather than the game so the assertion does not
// depend on a helper the game might rename.
function inside(x, y, ring) {
  let c = false;
  for (let i = 0; i < ring.length - 1; i++) {
    const [x1, y1] = ring[i], [x2, y2] = ring[i + 1];
    if ((y1 > y) !== (y2 > y)) {
      const xin = ((x2 - x1) * (y - y1)) / (y2 - y1) + x1;
      if (x < xin) c = !c;
    }
  }
  return c;
}

test('geometry: the coastline is real, not hand-drawn', () => {
  const { ev } = load();
  ev("applyRegion('idn')");
  // The old polygons had 25 rings and 168 points for all of Indonesia. Natural Earth 1:50m
  // simplified at 0.05 degrees gives well over 100 rings and 2,000 points.
  assert.ok(ev('SEA_LANDS.length') >= 100, 'expected a real coastline, got ' + ev('SEA_LANDS.length'));
  const pts = ev('SEA_LANDS.reduce((a,l)=>a+l.ll.length,0)');
  assert.ok(pts >= 2000, 'expected >=2000 points, got ' + pts);
});

test('geometry: every city sits on land, not in the sea', () => {
  const { ev } = load();
  ev("applyRegion('idn')");
  const lands = JSON.parse(ev('JSON.stringify(SEA_LANDS.map(l=>l.ll))'));
  const cities = JSON.parse(ev('JSON.stringify(IDN_CITIES.map(c=>[c.id,IDN_CITY_LL[c.id]]))'));
  const offshore = [];
  for (const [id, ll] of cities) {
    if (!ll) continue;
    if (!lands.some((ring) => inside(ll[0], ll[1], ring))) offshore.push(id);
  }
  assert.deepEqual(offshore, [], 'cities in the water: ' + offshore.join(','));
});

test('geometry: cables follow water instead of cutting through islands', () => {
  const { ev } = load();
  ev("applyRegion('idn')");
  const paths = JSON.parse(ev('JSON.stringify(CABLE_PTS)'));
  const lands = JSON.parse(ev('JSON.stringify(SEA_LANDS.map(l=>l.ll))'));
  let inLand = 0, total = 0;
  for (const key of Object.keys(paths)) {
    const pts = paths[key];
    // Endpoints are cities, which are on land by definition; only the middle matters.
    for (let i = 1; i < pts.length - 1; i++) {
      total++;
      if (lands.some((ring) => inside(pts[i][0], pts[i][1], ring))) inLand++;
    }
  }
  assert.ok(total > 500, 'expected real waypoint data, got ' + total + ' points');
  const pct = (inLand / total) * 100;
  assert.ok(pct < 8, pct.toFixed(1) + '% of cable waypoints are on land');
});

test('geometry: every cable pair has routed waypoints', () => {
  const { ev } = load();
  ev("applyRegion('idn')");
  const missing = JSON.parse(ev(
    'JSON.stringify(CABLE_PAIRS.filter(c=>!cablePts(c.cid,c.a,c.b)).map(c=>c.cid+":"+c.a+"-"+c.b))'
  ));
  assert.deepEqual(missing, [], 'pairs with no sea route: ' + missing.join(','));
});

test('geometry: a cable bends, it is not a straight line', () => {
  const { ev } = load();
  ev("applyRegion('idn')");
  // The old build gave 86 of 99 pairs exactly three points. A sea route needs more.
  const lens = JSON.parse(ev('JSON.stringify(CABLE_PAIRS.map(c=>c.pts.length))'));
  const short = lens.filter((n) => n < 5).length;
  assert.equal(short, 0, short + ' cables still have fewer than 5 points');
});

test('geometry: rebinding the region keeps the sea routes', () => {
  const { ev } = load();
  // applyRegion() rebuilds CABLE_PAIRS. If that copy forgets cablePts(), every route silently
  // reverts to a ruler line the moment the player switches map.
  ev("applyRegion('idn')");
  const before = ev('CABLE_PAIRS.reduce((a,c)=>a+c.pts.length,0)');
  ev("applyRegion('idn')");
  const after = ev('CABLE_PAIRS.reduce((a,c)=>a+c.pts.length,0)');
  assert.equal(after, before);
});
