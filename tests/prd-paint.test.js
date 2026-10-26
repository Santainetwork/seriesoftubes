// A player screenshotted the SEA map and got the whole world: Manila sat in the Mediterranean,
// Hanoi in North America, Cebu near East Africa. The cities were projected with the SEA lens but
// the coastline underneath was the frozen Global one, because paintWorld() read LANDP_ALL /
// LANDP_FAR — built once from COAST at module load — instead of LANDP, which applyRegion()
// rebuilds. These tests keep the two in step.
const test = require('node:test');
const assert = require('node:assert');
const { load } = require('./harness.js');

function region(id, city) {
  const h = load();
  h.ev(`beginGame('N',${JSON.stringify(city)},{region:${JSON.stringify(id)}})`);
  return h;
}

test('paint: SEA paints the regional coastline, not the world', () => {
  const { ev } = region('sea', 'mnl');
  const regional = ev('LANDP.length');
  const global = ev('LANDP_ALL.length');
  assert.ok(regional > global, `SEA coastline (${regional}) should be richer than the Global one (${global})`);
  assert.ok(regional > 150, 'expected the 158-ring Natural Earth coastline');
});

test('paint: IDN paints the regional coastline too', () => {
  const { ev } = region('idn', 'jkt');
  assert.ok(ev('LANDP.length') > 150, 'IDN should use the Natural Earth coastline');
});

test('paint: every SEA city falls inside some painted polygon', () => {
  const { ev } = region('sea', 'mnl');
  const bad = ev(`(() => {
    const out = [];
    for (const c of CITIES) {
      const q = CITY_LL[c.id];
      if (!q) continue;
      const pt = proj(q[0], q[1]);
      let hit = false;
      for (const land of LANDS) {
        if (land.hide) continue;
        let inside = false;
        const poly = land.pts;
        for (let i = 0, n = poly.length; i < n; i++) {
          const x1 = poly[i][0], y1 = poly[i][1];
          const x2 = poly[(i + 1) % n][0], y2 = poly[(i + 1) % n][1];
          if ((y1 > pt[1]) !== (y2 > pt[1]) && pt[0] < (x2 - x1) * (pt[1] - y1) / (y2 - y1 || 1e-18) + x1) inside = !inside;
        }
        if (inside) { hit = true; break; }
      }
      if (!hit) out.push(c.name);
    }
    return out;
  })()`);
  assert.deepEqual(bad, [], 'cities painted over open water');
});

test('paint: the global map still paints its own coastline', () => {
  const h = load();
  h.ev("beginGame('N','fra',{region:'global'})");
  // Global has no regional table, so LANDP falls back to the module-load coastline.
  assert.ok(h.ev('LANDP_ALL.length') > 0, 'global coastline must still exist');
  assert.ok(h.ev('LANDP.length') > 0, 'LANDP must never be empty');
});
