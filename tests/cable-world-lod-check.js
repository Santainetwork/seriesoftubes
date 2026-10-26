// Count ONLY the cable strokes in paintWorld: strokes with lineWidth 1.6/z and alpha 0.4 are
// cables; the coastline strokes have lineWidth 2.5/z or 10/z. Count strokes while globalAlpha is 0.4.
const { load } = require('./harness.js');
const h = load();
h.ev("beginGame('N','jkt',{region:'idn'})");
const r = h.ev(`(function(){
  WL.zAt=0;WL.key=null;
  const wl=worldLayer(1.2);
  const c=WL.cv.getContext('2d');
  let n=0;const s=c.stroke;c.stroke=function(){if(c.globalAlpha===0.4)n++;return s.apply(c,arguments);};
  paintWorld(c,1.2,true);
  c.stroke=s;
  return {strokes:n, majors:CABLE_PAIRS.filter(p=>p.km>=1000).length, total:CABLE_PAIRS.length};
})()`);
console.log(JSON.stringify(r));
if(!(r.strokes>0&&r.strokes<=r.majors*4))process.exit(1);
console.log('world-layer LOD ok');
