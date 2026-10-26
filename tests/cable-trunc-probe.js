// Mid-route overlap and detour under a truncated-lane pass, without touching the file:
// copy bowCables source, truncate the corridor offset map by dropping each route's smallest
// index (which sits nearest a city), and re-measure.
const { load } = require('./harness.js');
const h = load();
h.ev("beginGame('N','jkt',{region:'idn'})");
const r = h.ev(`(() => {
  function segDist(p,a,b){const dx=b[0]-a[0],dy=b[1]-a[1];const t=Math.max(0,Math.min(1,((p[0]-a[0])*dx+(p[1]-a[1])*dy)/(dx*dx+dy*dy||1)));return Math.hypot(p[0]-a[0]-t*dx,p[1]-a[1]-t*dy);}
  function polyDist(P,Q){let m=Infinity;for(const p of P)for(let i=0;i<Q.length-1;i++)m=Math.min(m,segDist(p,Q[i],Q[i+1]));return m;}
  function measure(){
    let close=0;
    for(let i=0;i<CABLE_PAIRS.length;i++)for(let j=i+1;j<CABLE_PAIRS.length;j++){
      const A=CABLE_PAIRS[i],B=CABLE_PAIRS[j];
      if(![A.a,A.b].some(x=>[B.a,B.b].includes(x)))continue;
      const Ap=A.pts.slice(1,-1),Bp=B.pts.slice(1,-1);
      if(Ap.length<2||Bp.length<2)continue;
      if(polyDist(Ap,Bp)<3)close++;
    }
    let sum=0,n=0;
    for(const p of CABLE_PAIRS){let L=0;for(let i=1;i<p.pts.length;i++)L+=Math.hypot(p.pts[i][0]-p.pts[i-1][0],p.pts[i][1]-p.pts[i-1][1]);const A=CITY[p.a],B=CITY[p.b];if(!A||!B)continue;const d=Math.hypot(A.x-B.x,A.y-B.y)||1;sum+=L/d;n++;}
    return {close, detour:+(sum/n).toFixed(3)};
  }
  const before = measure();
  // Truncate: for each cable, drop the interior point whose arc distance to the nearest endpoint
  // is smallest (that is the point nearest a city, where the approach corridor pairs live).
  for(const cp of CABLE_PAIRS){
    if(cp.pts.length<4)continue;
    // find interior index minimizing distance to either endpoint
    let bi=1,bd=Infinity;
    for(let t=1;t<cp.pts.length-1;t++){
      const d=Math.min(Math.hypot(cp.pts[t][0]-cp.pts[0][0],cp.pts[t][1]-cp.pts[0][1]),
                       Math.hypot(cp.pts[t][0]-cp.pts[cp.pts.length-1][0],cp.pts[t][1]-cp.pts[cp.pts.length-1][1]));
      if(d<bd){bd=d;bi=t;}
    }
    cp.pts.splice(bi,1);
  }
  const after = measure();
  return {before, after};
})()`);
console.log(JSON.stringify(r));
