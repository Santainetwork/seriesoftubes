// Dump the final drawn cable geometry for a region, for the tidiness metric and the PNG renderers.
// Usage: node tests/cable-dump.js <region> <out.json>
//   -> node tests/cable-tidiness.js <out.json> [list]
//   -> python3 tests/cable-render.py <out.json> <out.png> [scale]
//   -> python3 tests/cable-zoom.py <out.json> <out.png> x0,y0,x1,y1 [zoom] [labels]
const { load } = require('./harness.js');
const fs = require('fs');
const reg = process.argv[2] || 'sea';
const out = process.argv[3] || '/tmp/cable-dump.json';
const h = load();
h.ev(`applyRegion('${reg}')`);
const r = h.ev(`(()=>{
  const cables=CABLE_PAIRS.map(cp=>({cid:cp.cid,a:cp.a,b:cp.b,km:cp.km,pts:cp.pts.map(p=>[+p[0].toFixed(2),+p[1].toFixed(2)])}));
  const cities=CITIES.map(c=>({id:c.id,x:+c.x.toFixed(1),y:+c.y.toFixed(1),name:c.name||c.id}));
  const land=LANDS.filter(l=>!l.hide).map(l=>l.pts.map(p=>[+p[0].toFixed(1),+p[1].toFixed(1)]));
  return {W,H,wrapX:WRAPX,cables,cities,land};
})()`);
fs.writeFileSync(out, JSON.stringify(r));
console.log(reg, 'cables', r.cables.length, 'cities', r.cities.length, 'W,H', r.W, r.H);
