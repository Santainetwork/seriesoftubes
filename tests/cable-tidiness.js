// Scale-invariant tidiness metrics: resample each route at a fixed arc-length step, then measure
// direction change over a fixed ±WINDOW px of arc. This matches what the eye judges and does not
// reward or punish a route merely for having more vertices.
//
// Usage: node tests/cable-dump.js <region> /tmp/d.json && node tests/cable-tidiness.js /tmp/d.json [list]
//   dumps the drawn geometry with tests/cable-dump.js (also a JSON of the final polylines), then
//   scores it. `list` prints the worst cables. tests/cable-render.py and tests/cable-zoom.py turn
//   the same JSON into a PNG so the result can be looked at rather than only counted.
const fs = require('fs');
const WINDOW = 6;      // px of arc on each side
const STEP = 1;

function resample(P) {
  const out = [P[0]];
  let acc = 0;          // arc length consumed up to P[i-1]
  let next = STEP;      // arc length of the next emission
  for (let i = 1; i < P.length; i++) {
    const a = P[i - 1], b = P[i];
    const d = Math.hypot(b[0] - a[0], b[1] - a[1]);
    if (d < 1e-9) continue;
    while (next <= acc + d) {
      const t = (next - acc) / d;
      out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]);
      next += STEP;
    }
    acc += d;
  }
  const last = P[P.length - 1];
  const prev = out[out.length - 1];
  if (Math.hypot(last[0] - prev[0], last[1] - prev[1]) > 0.01) out.push(last);
  return out;
}

function dirAt(Q, i, w) {
  const a = Q[Math.max(0, i - w)], b = Q[Math.min(Q.length - 1, i + w)];
  const dx = b[0] - a[0], dy = b[1] - a[1];
  const l = Math.hypot(dx, dy) || 1;
  return [dx / l, dy / l];
}

const d = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
let spikes = 0, kinks = 0, flips = 0, samples = 0, worst = 0, worstWho = '';
const perCable = [];
for (const c of d.cables) {
  if (c.pts.length < 4) continue;
  const Q = resample(c.pts);
  if (Q.length < 3 * WINDOW) continue;
  let sp = 0, kn = 0, fl = 0, prevSign = 0, mx = 0;
  for (let i = WINDOW; i < Q.length - WINDOW; i++) {
    const d1 = dirAt(Q, i - WINDOW / 2, WINDOW / 2);
    const d2 = dirAt(Q, i + WINDOW / 2, WINDOW / 2);
    let cs = d1[0] * d2[0] + d1[1] * d2[1];
    cs = Math.max(-1, Math.min(1, cs));
    const deg = Math.acos(cs) * 180 / Math.PI;
    samples++;
    if (deg > mx) mx = deg;
    if (deg > 100) sp++;
    else if (deg > 55) kn++;
    const cr = d1[0] * d2[1] - d1[1] * d2[0];
    if (Math.abs(cr) > 0.02) {
      const s = Math.sign(cr);
      if (prevSign && s !== prevSign) fl++;
      prevSign = s;
    }
  }
  spikes += sp; kinks += kn; flips += fl;
  if (mx > worst) { worst = mx; worstWho = c.cid + ' ' + c.a + '>' + c.b; }
  if (sp || fl > 8) perCable.push({ cid: c.cid, r: c.a + '>' + c.b, spikes: sp, kinks: kn, flips: fl, maxDeg: Math.round(mx), len: Q.length });
}
perCable.sort((a, b) => b.spikes * 5 + b.flips - (a.spikes * 5 + a.flips));
console.log(JSON.stringify({
  spikes, kinks, flips, samples,
  spikesPer1k: +(spikes / samples * 1000).toFixed(2),
  kinksPer1k: +(kinks / samples * 1000).toFixed(2),
  flipsPer1k: +(flips / samples * 1000).toFixed(2),
  worst: Math.round(worst), worstWho, dirty: perCable.length,
}));
if (process.argv[3] === 'list') for (const r of perCable.slice(0, 12)) console.log('  ' + JSON.stringify(r));
