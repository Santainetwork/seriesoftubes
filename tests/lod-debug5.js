// Reproduce EXACTLY what cable-lod-check does, step by step, to find the divergence.
const { load } = require('./harness.js');
const h = load();
h.ev("beginGame('N','jkt',{region:'idn'})");
const strokes = z => h.ev(`(()=>{cam.z=${z};WL.zAt=0;WL.key=null;const wl=worldLayer(${z});let n=0;const s=ctx.stroke;ctx.stroke=function(){n++;return s.apply(this,arguments);};drawCables(visibleKs());ctx.stroke=s;return [!!wl,!!WL.cab,n];})()`);
const far = strokes(1.2);
console.log('far', JSON.stringify(far));
const selCity = JSON.parse(h.ev(`JSON.stringify((()=>{
  const deg={};
  for(const p of CABLE_PAIRS)if(p.km<1000){deg[p.a]=(deg[p.a]||0)+1;deg[p.b]=(deg[p.b]||0)+1;}
  return JSON.stringify(Object.entries(deg).sort((a,b)=>b[1]-a[1])[0][0]);
})())`));
console.log('selCity', JSON.stringify(selCity), typeof selCity);
h.ev(`UI.sel={type:'city',id:${JSON.stringify(selCity)}};`);
console.log('ui.sel now', h.ev("JSON.stringify(UI.sel)"));
const sel = strokes(1.2);
console.log('sel', JSON.stringify(sel));
