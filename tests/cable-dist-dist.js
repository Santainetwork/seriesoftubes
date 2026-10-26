// Distribution of min-distances across close pairs, and how the metrics move if the close-pair
// metric is measured at 2px instead of 3px.
const { load } = require('./harness.js');
const h = load();
h.ev("beginGame('N','jkt',{region:'idn'})");
const r = h.ev(`(() => {
  function segDist(p,a,b){const dx=b[0]-a[0],dy=b[1]-a[1];const t=Math.max(0,Math.min(1,((p[0]-a[0])*dx+(p[1]-a[1])*dy)/(dx*dx+dy*dy||1)));return Math.hypot(p[0]-a[0]-t*dx,p[1]-a[1]-t*dy);}
  function polyDist(P,Q){let m=Infinity;for(const p of P)for(let i=0;i<Q.length-1;i++)m=Math.min(m,segDist(p,Q[i],Q[i+1]));return m;}
  const ds=[];
  for(let i=0;i<CABLE_PAIRS.length;i++)for(let j=i+1;j<CABLE_PAIRS.length;j++){
    const A=CABLE_PAIRS[i],B=CABLE_PAIRS[j];
    if(![A.a,A.b].some(x=>[B.a,B.b].includes(x)))continue;
    const Ap=A.pts.slice(1,-1),Bp=B.pts.slice(1,-1);
    if(Ap.length<2||Bp.length<2)continue;
    ds.push(polyDist(Ap,Bp));
  }
  ds.sort((a,b)=>a-b);
  const q=qq=>ds[Math.floor(qq*(ds.length-1))];
  return {n:ds.length, min:+ds[0].toFixed(2), p10:+q(.1).toFixed(2), p25:+q(.25).toFixed(2),
    p50:+q(.5).toFixed(2), under3:ds.filter(d=>d<3).length, under2:ds.filter(d=>d<2).length,
    under1:ds.filter(d=>d<1).length};
})()`);
console.log(JSON.stringify(r));
