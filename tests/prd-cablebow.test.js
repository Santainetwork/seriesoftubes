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

test('cables: mid-route pairs do not pile up in the same channel', () => {
  // The fan fixed the departure from a hub, but routes that share a strait still converged onto
  // the same waypoints mid-sea — 131 pairs of different cables sat within 3px of each other away
  // from any city, which is the "noodles" a player saw. Endpoints are excluded because every cable
  // from Jakarta legitimately starts at Jakarta's pixel.
  const { ev } = idn();
  const close = ev(`(() => {
    function segDist(p, a, b) {
      const dx = b[0] - a[0], dy = b[1] - a[1];
      const t = Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / (dx * dx + dy * dy || 1)));
      return Math.hypot(p[0] - a[0] - t * dx, p[1] - a[1] - t * dy);
    }
    function polyDist(P, Q) {
      let m = Infinity;
      for (const p of P) for (let i = 0; i < Q.length - 1; i++) m = Math.min(m, segDist(p, Q[i], Q[i + 1]));
      return m;
    }
    let n = 0;
    for (let i = 0; i < CABLE_PAIRS.length; i++) {
      for (let j = i + 1; j < CABLE_PAIRS.length; j++) {
        const A = CABLE_PAIRS[i], B = CABLE_PAIRS[j];
        if (![A.a, A.b].some(x => [B.a, B.b].includes(x))) continue;
        const Ap = A.pts.slice(1, -1), Bp = B.pts.slice(1, -1);
        if (Ap.length < 2 || Bp.length < 2) continue;
        if (polyDist(Ap, Bp) < 3) n++;
      }
    }
    return n;
  })()`);
  assert.ok(close < 80, close + ' cable pairs still overlap mid-route');
});
