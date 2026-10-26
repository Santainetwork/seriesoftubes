// Why doesn't selecting btm add strokes at z=1.2?
const { load } = require('./harness.js');
const h = load();
h.ev("beginGame('N','jkt',{region:'idn'})");
console.log(h.ev(`JSON.stringify((()=>{
  cam.z=1.2;WL.zAt=0;WL.key=null;worldLayer(1.2);
  UI.sel={type:'city',id:'btm'};
  let n=0;const s=ctx.stroke;ctx.stroke=function(){n++;return s.apply(this,arguments);};
  drawCables(visibleKs());
  ctx.stroke=s;
  const hot=CABLE_PAIRS.filter(p=>p.a==='btm'||p.b==='btm');
  return {strokes:n, hot:hot.length, hotKm:hot.map(p=>p.km), cached:!!(WL.cv&&WL.key&&WL.cab)};
})())`));
