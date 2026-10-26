// Why 0 strokes when jkt selected at z=1.2? toS may map points off-canvas, or ks is wrong.
const { load } = require('./harness.js');
const h = load();
h.ev("beginGame('N','jkt',{region:'idn'})");
console.log(h.ev(`JSON.stringify((()=>{
  cam.z=1.2;WL.zAt=0;WL.key=null;worldLayer(1.2);
  UI.sel={type:'city',id:'jkt'};
  const ks=visibleKs();
  // manual replication of the loop for one hot cable
  const cp=CABLE_PAIRS.find(p=>(p.a==='jkt'||p.b==='jkt'));
  const sp=cp.pts.map(p=>toS(p[0],p[1],ks[0]));
  let mn=Infinity,mx=-Infinity;for(const q of sp){if(q[0]<mn)mn=q[0];if(q[0]>mx)mx=q[0];}
  return {ks, CW, sampleX:[mn,mx], first:sp[0], zoomOK:mx>-20&&mn<CW+20};
})())`));
