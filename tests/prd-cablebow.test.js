// "itu kabel kayak mie anjir ditumpuk semua" — a player looking at Jakarta. Eighteen cable pairs
// leave Jakarta and fifteen leave Batam, and every one was drawn as a straight line from the same
// pixel, so the busiest part of the map was a single bright thread. bowCables() gives each pair a
// bow, so a hub fans out instead of stacking.
const test = require('node:test');
const assert = require('node:assert');
const { load } = require('./harness.js');

function idn() {
  const h = load();
  h.ev("beginGame('N','jkt',{region:'idn'})");
  return h;
}

function midSpread(ev, city) {
  return ev(`(() => {
    const mine = CABLE_PAIRS.filter(p => p.a === ${JSON.stringify(city)} || p.b === ${JSON.stringify(city)});
    const mids = mine.map(p => p.pts[Math.floor(p.pts.length / 2)]);
    let min = Infinity;
    for (let i = 0; i < mids.length; i++)
      for (let j = i + 1; j < mids.length; j++)
        min = Math.min(min, Math.hypot(mids[i][0] - mids[j][0], mids[i][1] - mids[j][1]));
    return { n: mine.length, min };
  })()`);
}

test('cables: Jakarta fans out instead of stacking on one line', () => {
  const { ev } = idn();
  const { n, min } = midSpread(ev, 'jkt');
  assert.ok(n >= 10, 'expected a busy hub, got ' + n + ' cables');
  assert.ok(min > 5, 'closest two cable midpoints are ' + min.toFixed(1) + 'px apart — still a pile');
});

test('cables: Batam fans out too', () => {
  const { ev } = idn();
  const { n, min } = midSpread(ev, 'btm');
  assert.ok(n >= 8, 'expected a busy hub, got ' + n + ' cables');
  assert.ok(min > 5, 'closest two cable midpoints are ' + min.toFixed(1) + 'px apart — still a pile');
});

test('cables: every pair still runs between its two cities', () => {
  const { ev } = idn();
  const bad = ev(`(() => {
    const out = [];
    for (const cp of CABLE_PAIRS) {
      const A = CITY[cp.a], B = CITY[cp.b];
      if (!A || !B) continue;
      const first = cp.pts[0], last = cp.pts[cp.pts.length - 1];
      if (Math.hypot(first[0] - A.x, first[1] - A.y) > 1) out.push(cp.cid + ' ' + cp.a + ' start');
      const bx = B.x + 2000 * Math.round((A.x - B.x) / 2000);
      if (Math.hypot(last[0] - bx, last[1] - B.y) > 1) out.push(cp.cid + ' ' + cp.b + ' end');
    }
    return out;
  })()`);
  assert.deepEqual(bad, [], 'cables whose endpoints drifted off their cities');
});
