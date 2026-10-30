// The cables were reported three times as "beberapa kabel masih ada yang kurang rapih" (some cables
// are still not tidy). The cause was not the sea routes — those are long ruled strokes — but the
// offset passes drawn on top of them: a per-point lane shove (applyLanes) and clearLand()'s
// nearest-water snap both folded the line back on itself, leaving thorns and staircases.
//
// These tests measure the SHAPE the player sees, resampled by arc length so a route is not judged
// better merely for having more vertices. Before the fix, SEA carried 20.4 direction spikes per
// 1000 sampled points against 2.4 for the raw sea routes; after, 2.3.
const test = require('node:test');
const assert = require('node:assert');
const { load } = require('./harness.js');

// Resample to a uniform arc-length step and measure direction change over ±WINDOW px of arc.
// Counting per-vertex turns rewards dense polylines, which is exactly what the old geometry was:
// two Chaikin rounds' worth of 1px segments made a wobbly line score well on vertex counts.
const TIDY = `(() => {
  const STEP = 1, WINDOW = 6;
  function resample(P) {
    const out = [P[0]];
    let acc = 0, next = STEP;
    for (let i = 1; i < P.length; i++) {
      const a = P[i-1], b = P[i];
      const d = Math.hypot(b[0]-a[0], b[1]-a[1]);
      if (d < 1e-9) continue;
      while (next <= acc + d) {
        const t = (next - acc) / d;
        out.push([a[0] + (b[0]-a[0]) * t, a[1] + (b[1]-a[1]) * t]);
        next += STEP;
      }
      acc += d;
    }
    const last = P[P.length-1], prev = out[out.length-1];
    if (Math.hypot(last[0]-prev[0], last[1]-prev[1]) > 0.01) out.push(last);
    return out;
  }
  function dirAt(Q, i, w) {
    const a = Q[Math.max(0, i-w)], b = Q[Math.min(Q.length-1, i+w)];
    const dx = b[0]-a[0], dy = b[1]-a[1], l = Math.hypot(dx, dy) || 1;
    return [dx/l, dy/l];
  }
  let spikes = 0, flips = 0, samples = 0, shortest = Infinity, shortId = '';
  const perCable = [];
  for (const cp of CABLE_PAIRS) {
    if (cp.pts.length < shortest) { shortest = cp.pts.length; shortId = cp.cid + ' ' + cp.a + '>' + cp.b; }
    const Q = resample(cp.pts);
    if (Q.length < 3 * WINDOW) continue;
    let sp = 0, fl = 0, prevSign = 0;
    for (let i = WINDOW; i < Q.length - WINDOW; i++) {
      const d1 = dirAt(Q, i - WINDOW/2, WINDOW/2), d2 = dirAt(Q, i + WINDOW/2, WINDOW/2);
      let cs = d1[0]*d2[0] + d1[1]*d2[1];
      cs = Math.max(-1, Math.min(1, cs));
      samples++;
      if (Math.acos(cs) * 180 / Math.PI > 100) sp++;
      const cr = d1[0]*d2[1] - d1[1]*d2[0];
      if (Math.abs(cr) > 0.02) { const s = Math.sign(cr); if (prevSign && s !== prevSign) fl++; prevSign = s; }
    }
    spikes += sp; flips += fl;
    if (sp) perCable.push(cp.cid + ' ' + cp.a + '>' + cp.b + ':' + sp);
  }
  return { spikes, flips, samples, per1k: spikes / samples * 1000, flipsPer1k: flips / samples * 1000,
           shortest, shortId, dirty: perCable };
})()`;

for (const region of ['sea', 'idn', 'global']) {
  test(`cables: ${region} routes are tidy (no thorns, no scribble)`, () => {
    const h = load();
    h.ev(`applyRegion('${region}')`);
    const r = h.ev(TIDY);
    /* The raw sea routes themselves measure ~2.4 spikes per 1000 on SEA, and that is the floor:
       the atlas waypoints are hand-drawn and a few genuinely double back at a strait. The drawing
       passes must not add to it. Before the fix this was 20.4 on SEA, 11.1 on IDN and 9.9 on
       Global. 6 is comfortably below "one barb every 200px of cable" and far above the floor, so
       a regression that reintroduces a folding offset fails while normal wiggle passes. */
    assert.ok(r.per1k < 6,
      region + ': ' + r.per1k.toFixed(2) + ' spikes per 1000 sampled points (' + r.spikes + '/' + r.samples + ')');
    /* A clean cable changes direction once or twice; a scribbled one reverses constantly. The raw
       routes measure 28.3 per 1000 on SEA. */
    assert.ok(r.flipsPer1k < 22,
      region + ': ' + r.flipsPer1k.toFixed(2) + ' direction reversals per 1000 sampled points');
    /* A route needs enough vertices to bend at all; the old build drew 86 of 99 as 3-point rulers. */
    assert.ok(r.shortest >= 3, region + ': shortest route is ' + r.shortest + ' points (' + r.shortId + ')');
  });
}

test('cables: two cables sold between the same cities are drawn apart', () => {
  // CABLE_PTS is shared between cables on the same city pair (jasukaD and hwn1 both run
  // Jakarta-Tanjung Pinang off one waypoint list). Every route-shaped offset is then identical for
  // both, and the pair drew on top of each other: one line where the player bought two.
  const h = load();
  h.ev("applyRegion('sea')");
  const r = h.ev(`(() => {
    const segDist = (p,a,b) => {
      const vx = b[0]-a[0], vy = b[1]-a[1];
      const t = Math.max(0, Math.min(1, ((p[0]-a[0])*vx + (p[1]-a[1])*vy) / (vx*vx + vy*vy || 1)));
      return Math.hypot(p[0] - (a[0] + t*vx), p[1] - (a[1] + t*vy));
    };
    const by = new Map();
    for (const cp of CABLE_PAIRS) {
      const k = cp.a < cp.b ? cp.a + '>' + cp.b : cp.b + '>' + cp.a;
      if (!by.has(k)) by.set(k, []);
      by.get(k).push(cp);
    }
    const bad = [], pairs = [];
    for (const [k, list] of by) {
      if (list.length < 2) continue;
      /* Compare the middle 60% of each route. The ends are excluded on purpose: both cables must
         converge on the same city dot, and separateDuplicates() ramps its offset to zero over the
         first and last quarter so the approach does not kink.
         Vertices sitting on land are skipped: a route that already crosses a headland (hwn1
         Jakarta-Tanjung Pinang runs over Sumatra in the raw sea route — 8 land vertices before any
         of this code runs) cannot be pushed sideways into water, because both sides are beach. */
      const trim = P => P.slice(Math.floor(P.length*0.2), Math.ceil(P.length*0.8));
      const A = trim(list[0].pts), B = trim(list[1].pts);
      /* A segment counts as usable only if it stays in water end to end. Testing the endpoints
         alone misses a segment whose ends are both on a coast but whose middle crosses the
         headland, and that is exactly where the two routes converge again. */
      const wet = (a,b) => {
        if (onLand(a[0],a[1]) || onLand(b[0],b[1])) return false;
        const n = Math.max(2, Math.ceil(Math.hypot(b[0]-a[0], b[1]-a[1]) / 2));
        for (let k = 1; k < n; k++) {
          const t = k / n;
          if (onLand(a[0]+(b[0]-a[0])*t, a[1]+(b[1]-a[1])*t)) return false;
        }
        return true;
      };
      /* Average, not minimum. Two cables that share a waypoint list are pushed 3px apart, but a
         single vertex where the route is squeezed between a coast and the other cable can stay
         under 1px; the eye reads the AVERAGE separation along the run, and that is what must stay
         clear. Before separateDuplicates() existed the average was 0.0px for the whole route —
         literally one line where the player had bought two. */
      let sum = 0, n = 0;
      for (let i = 0; i < A.length; i++) {
        if (onLand(A[i][0], A[i][1])) continue;
        let m = Infinity;
        for (let j = 0; j < B.length - 1; j++) {
          if (!wet(B[j], B[j+1])) continue;
          m = Math.min(m, segDist(A[i], B[j], B[j+1]));
        }
        if (isFinite(m)) { sum += m; n++; }
      }
      if (n < 5) continue;   // not enough open water to measure
      const avg = sum / n;
      pairs.push(k + ' ' + avg.toFixed(2));
      if (avg < 1.5) bad.push(k + ' avg ' + avg.toFixed(2) + 'px (' + list.map(c => c.cid).join('+') + ')');
    }
    return { bad, pairs };
  })()`);
  assert.ok(r.pairs.length >= 10, 'expected duplicate-route pairs to compare, got ' + r.pairs.length);
  assert.deepEqual(r.bad, [], 'cables drawn on top of each other: ' + r.bad.join(', '));
});
