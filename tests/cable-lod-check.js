// Verify the LOD: at low zoom only major (>=1000km) cables draw; short ones draw when zoomed in
// or when their city is selected.
const { load } = require('./harness.js');
const assert = require('node:assert');
const h = load();
h.ev("beginGame('N','jkt',{region:'idn'})");
const strokes = z => h.ev(`(()=>{cam.z=${z};WL.zAt=0;WL.key=null;const wl=worldLayer(${z});let n=0;const s=ctx.stroke;ctx.stroke=function(){n++;return s.apply(this,arguments);};drawCables(visibleKs());ctx.stroke=s;return [!!wl,!!WL.cab,n];})()`);
const far = strokes(1.2), near = strokes(4);
const majors = h.ev("CABLE_PAIRS.filter(p=>p.km>=1000).length");
assert.ok(far[2] > 0, 'majors draw at low zoom');
assert.ok(far[2] < majors * 3, `low zoom strokes (${far[2]}) bounded by majors (${majors}) x copies`);
// selected city: its cables must draw even at low zoom — pick a city whose cables are ALL short
const selCity = h.ev("(function(){const deg={};for(const p of CABLE_PAIRS)if(p.km<1000){deg[p.a]=(deg[p.a]||0)+1;deg[p.b]=(deg[p.b]||0)+1;}let best='',n=0;for(const k in deg)if(deg[k]>n){n=deg[k];best=k;}return best;})()");
assert.ok(selCity, 'found a city whose cables are all short: ' + selCity);
h.ev("UI.sel={type:'city',id:'" + selCity + "'};");
const sel = strokes(1.2);
assert.ok(sel[2] >= far[2], `selecting ${selCity} still draws majors plus its own: ${sel[2]} vs ${far[2]}`);
// and at high zoom everything draws
const all = h.ev("CABLE_PAIRS.length");
assert.ok(near[2] > far[2], `zoomed in, more cables draw (${near[2]} strokes) than at low zoom (${far[2]})`);
console.log(`LOD ok: low zoom ${far[2]} strokes / ${majors} majors, selected ${selCity} -> ${sel[2]}, high zoom -> ${near[2]} of ${all} pairs`);
