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
  /* 5px was measured when routes had 3-21 waypoints and the fan was the only separation. Routes are
     now resampled to ~23 points and the sea router no longer takes long detours, so the drawing is
     smooth (sharp turns 123 -> 94 of 5414) and the average detour is 2.24x instead of 3.08x. The
     cost is that hub fans sit slightly closer: 4.0px at Jakarta, 2.5px at Batam. Smooth beats wide
     here — a cable that loops 25x its own length reads as a scribble no matter how far apart it is.
     The bound is 2px so a genuine regression (everything on one pixel) still fails. */
  assert.ok(min > 2, 'closest two cable midpoints are ' + min.toFixed(1) + 'px apart — still a pile');
});

test('cables: Batam fans out too', () => {
  const { ev } = idn();
  const { n, min } = midSpread(ev, 'btm');
  assert.ok(n >= 8, 'expected a busy hub, got ' + n + ' cables');
  /* 5px was measured when routes had 3-21 waypoints and the fan was the only separation. Routes are
     now resampled to ~23 points and the sea router no longer takes long detours, so the drawing is
     smooth (sharp turns 123 -> 94 of 5414) and the average detour is 2.24x instead of 3.08x. The
     cost is that hub fans sit slightly closer: 4.0px at Jakarta, 2.5px at Batam. Smooth beats wide
     here — a cable that loops 25x its own length reads as a scribble no matter how far apart it is.
     The bound is 2px so a genuine regression (everything on one pixel) still fails. */
  assert.ok(min > 2, 'closest two cable midpoints are ' + min.toFixed(1) + 'px apart — still a pile');
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

test('cables: routes are smooth, not scribbled', () => {
  // The overlap count turned out to be the wrong target. Cables carry as few as 3 waypoints, and
  // pushing a lateral offset onto a 3-point polyline kinks it at the middle vertex: 123 of 743
  // vertices turned more than 120 degrees, which is what a player described as "tambah berantakan".
  // Resampling each route to ~24 points before offsetting drops that to 47 of 1804. This asserts
  // smoothness, which is what the eye actually judges, instead of how close two lines pass.
  const { ev } = idn();
  const sharp = ev(`(() => {
    let sharp = 0, total = 0;
    for (const p of CABLE_PAIRS) {
      for (let i = 1; i < p.pts.length - 1; i++) {
        const a = [p.pts[i][0] - p.pts[i-1][0], p.pts[i][1] - p.pts[i-1][1]];
        const b = [p.pts[i+1][0] - p.pts[i][0], p.pts[i+1][1] - p.pts[i][1]];
        const la = Math.hypot(a[0], a[1]) || 1, lb = Math.hypot(b[0], b[1]) || 1;
        const cos = (a[0]*b[0] + a[1]*b[1]) / (la*lb);
        if (cos < -0.5) sharp++;
        total++;
      }
    }
    return { sharp, total };
  })()`);
  const pct = sharp.sharp / sharp.total;
  assert.ok(pct < 0.04, (pct * 100).toFixed(1) + '% of vertices turn more than 120 degrees');
});

test('cables: routes do not wander far from the direct line', () => {
  // The separation pass has a cost: every pixel it pushes a route sideways lengthens it and can
  // make it cross a neighbour. At CORRIDOR=80 the average route was 15.8x its straight-line
  // length and 1546 pairs of cables crossed — far worse than the pile it was meant to fix.
  const { ev } = idn();
  const detour = ev(`(() => {
    let sum = 0, n = 0;
    for (const p of CABLE_PAIRS) {
      let L = 0;
      for (let i = 1; i < p.pts.length; i++) L += Math.hypot(p.pts[i][0] - p.pts[i-1][0], p.pts[i][1] - p.pts[i-1][1]);
      const A = CITY[p.a], B = CITY[p.b];
      if (!A || !B) continue;
      const d = Math.hypot(A.x - B.x, A.y - B.y) || 1;
      sum += L / d; n++;
    }
    return sum / n;
  })()`);
  assert.ok(detour < 4, 'average cable is ' + detour.toFixed(2) + 'x its direct distance');
});
