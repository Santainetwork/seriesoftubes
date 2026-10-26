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

test('paint: paintWorld runs without throwing in every region', () => {
  // The first attempt at the regional-coastline fix declared `const LANDP` while referencing LANDP
  // one line above it — a temporal dead zone. The harness stayed green because paintWorld only runs
  // inside requestAnimationFrame; the browser threw on every frame and the player saw a red console.
  for (const [id, city] of [['sea', 'mnl'], ['idn', 'jkt'], ['global', 'fra']]) {
    const { ev } = region(id, city);
    const r = ev(`(() => {
      try { const c = document.createElement('canvas').getContext('2d'); paintWorld(c, 1, true); return 'OK'; }
      catch (e) { return 'ERR ' + e.message; }
    })()`);
    assert.equal(r, 'OK', id + ' threw: ' + r);
  }
});

test('paint: switching to SEA or IDN drops the Global decorative polygons', () => {
  // DECOR_LL was never copied off the region, so the 23 Global decorations (Greenland, Arctic
  // shapes) stayed loaded after switching maps. Projected with the regional lens they landed
  // thousands of pixels away and drew a coarse second outline over the detailed coastline — the
  // "old polygon still overlaps the new one" a player reported.
  const g = load();
  g.ev("beginGame('N','fra',{region:'global'})");
  assert.ok(g.ev('DECOR.length') > 0, 'Global keeps its decorations');

  for (const [id, city] of [['sea', 'mnl'], ['idn', 'jkt']]) {
    const { ev } = region(id, city);
    assert.equal(ev('DECOR.length'), 0, id + ' must not paint Global decorations');
    assert.equal(ev('DECOR_LL.length'), 0, id + ' must clear the decoration source too');
  }
});

test('paint: no painted polygon reaches thousands of pixels off-map', () => {
  // The symptom was coordinates like x=-8400: a Global ring projected with a regional lens.
  for (const [id, city] of [['sea', 'mnl'], ['idn', 'jkt']]) {
    const { ev } = region(id, city);
    const far = ev(`(() => {
      const out = [];
      const all = LANDS.filter(l => !l.hide).map(l => l.pts).concat(DECOR);
      for (const poly of all) for (const p of poly) {
        if (p[0] < -3000 || p[0] > 5000 || p[1] < -3000 || p[1] > 4000) { out.push([Math.round(p[0]), Math.round(p[1])]); break; }
      }
      return out.length;
    })()`);
    assert.equal(far, 0, id + ' has ' + far + ' polygons projected far off-map');
  }
});

test('paint: no land polygon spills past the map edge', () => {
  // Papua's easternmost islands reached x=2558 on a 2000px canvas. With wrapX off for SEA and IDN,
  // the overflow was not wrapped away — it was drawn where it landed, and a player saw a second
  // Papua in the bottom-left corner. Every point must stay inside the canvas.
  for (const [id, city] of [['sea', 'mnl'], ['idn', 'jkt']]) {
    const { ev } = region(id, city);
    const spill = ev(`(() => {
      const out = [];
      const w = W;
      for (const l of LANDS) {
        if (l.hide) continue;
        for (const p of l.pts) {
          if (p[0] < -20 || p[0] > w + 20) { out.push(l.id + '@' + Math.round(p[0])); break; }
        }
      }
      return out;
    })()`);
    assert.deepEqual(spill, [], id + ' draws land outside the canvas: ' + spill.join(', '));
  }
});

test('paint: Timor and its neighbours are not clipped at the bottom edge', () => {
  // The projection mapped 26N..-9S onto 1200px, so Dili landed at y=1176 and Kupang at 1184 —
  // inside the canvas but with their coastlines cut off, which at zoom-out read as Timor Leste
  // being sliced in half. There must be margin below the southernmost city.
  const { ev } = region('sea', 'mnl');
  const H = ev('H');
  for (const id of ['dil', 'koe']) {
    const y = ev(`CITY.${id}.y`);
    assert.ok(y < H - 40, id + ' sits at y=' + Math.round(y) + ' of ' + H + ' — too close to the edge');
  }
  const deepest = ev(`(() => {
    let m = -Infinity;
    for (const l of LANDS) { if (l.hide) continue; for (const p of l.pts) if (p[1] > m) m = p[1]; }
    return m;
  })()`);
  assert.ok(deepest <= H, 'a land polygon is drawn below the canvas: y=' + Math.round(deepest));
});
