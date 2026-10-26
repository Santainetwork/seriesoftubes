// Which pairs are still <3px apart mid-route?
const { load } = require('./harness.js');
const h = load();
h.ev("beginGame('N','jkt',{region:'idn'})");
const r = h.ev(`(() => {
  function segDist(p,a,b){const dx=b[0]-a[0],dy=b[1]-a[1];const t=Math.max(0,Math.min(1,((p[0]-a[0])*dx+(p[1]-a[1])*dy)/(dx*dx+dy*dy||1)));return Math.hypot(p[0]-a[0]-t*dx,p[1]-a[1]-t*dy);}
  function polyDist(P,Q){let m=Infinity;for(const p of P)for(let i=0;i<Q.length-1;i++)m=Math.min(m,segDist(p,Q[i],Q[i+1]));return m;}
  const out=[];
  for(let i=0;i<CABLE_PAIRS.length;i++)for(let j=i+1;j<CABLE_PAIRS.length;j++){
    const A=CABLE_PAIRS[i],B=CABLE_PAIRS[j];
    if(![A.a,A.b].some(x=>[B.a,B.b].includes(x)))continue;
    const Ap=A.pts.slice(1,-1),Bp=B.pts.slice(1,-1);
    if(Ap.length<2||Bp.length<2)continue;
    const d=polyDist(Ap,Bp);
    if(d<3)out.push({pair:A.cid+':'+A.a+'-'+A.b+' / '+B.cid+':'+B.a+'-'+B.b,d:+d.toFixed(2),na:A.pts.length,nb:B.pts.length});
  }
  out.sort((a,b)=>a.d-b.d);
  return {count:out.length, worst:out.slice(0,25)};
})()`);
console.log(JSON.stringify(r, null, 1));
