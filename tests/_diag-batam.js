// Diagnostic 2: full midpoint dump for Batam cables + fan unit values.
const { load } = require('./harness.js');
const h = load();
h.ev("beginGame('N','jkt',{region:'idn'})");
const out = h.ev(`(() => {
  const mine = CABLE_PAIRS.filter(p => p.a === 'btm' || p.b === 'btm');
  const rows = mine.map(p => {
    const mid = p.pts[Math.floor(p.pts.length / 2)];
    return { r: p.a + '-' + p.b, npts: p.pts.length, mid: [ +mid[0].toFixed(1), +mid[1].toFixed(1) ] };
  });
  let min = Infinity, pair = null;
  for (let i = 0; i < rows.length; i++)
    for (let j = i + 1; j < rows.length; j++) {
      const a = rows[i].mid, b = rows[j].mid;
      const d = Math.hypot(a[0] - b[0], a[1] - b[1]);
      if (d < min) { min = d; pair = rows[i].r + ' vs ' + rows[j].r; }
    }
  // chord lengths (endpoints) per cable
  const lens = mine.map(p => {
    const A = CITY[p.a], B = CITY[p.b];
    return { r: p.a + '-' + p.b, len: +Math.hypot(B.x - A.x, B.y - A.y).toFixed(1), nmid: p.pts.length - 2 };
  });
  return { n: mine.length, min: +min.toFixed(2), pair, rows, lens };
})()`);
console.log(JSON.stringify(out, null, 1));
