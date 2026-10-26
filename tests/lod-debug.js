// Debug the LOD check on the idn region (the scene the player complained about).
const { load } = require('./harness.js');
const h = load();
h.ev("beginGame('N','jkt',{region:'idn'})");
console.log(h.ev(`JSON.stringify((()=>{
  cam.z=1.2;WL.zAt=0;WL.key=null;
  const wl=worldLayer(1.2);
  let n=0;const s=ctx.stroke;ctx.stroke=function(){n++;return s.apply(this,arguments);};
  drawCables([0]);
  ctx.stroke=s;
  const majors=CABLE_PAIRS.filter(p=>p.km>=1000).length;
  return {wl:!!wl, cab:!!(WL.cv&&WL.key&&WL.cab), strokes:n, majors, visibleKs:visibleKs(), n:CABLE_PAIRS.length};
})())`));
