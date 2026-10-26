// Metrics for the cable-separation work (task t_cd83e083).
// Usage: node tests/cable-metrics.js
const { load } = require('./harness.js');

const SRC = `
  function segDist(p,a,b){const dx=b[0]-a[0],dy=b[1]-a[1];const t=Math.max(0,Math.min(1,((p[0]-a[0])*dx+(p[1]-a[1])*dy)/(dx*dx+dy*dy||1)));return Math.hypot(p[0]-a[0]-t*dx,p[1]-a[1]-t*dy);}
  function polyDist(P,Q){let m=Infinity;for(const p of P)for(let i=0;i<Q.length-1;i++)m=Math.min(m,segDist(p,Q[i],Q[i+1]));return m;}
  let close=0;
  for(let i=0;i<CABLE_PAIRS.length;i++)for(let j=i+1;j<CABLE_PAIRS.length;j++){
    const A=CABLE_PAIRS[i],B=CABLE_PAIRS[j];
    if(![A.a,A.b].some(x=>[B.a,B.b].includes(x)))continue;
    const Ap=A.pts.slice(1,-1),Bp=B.pts.slice(1,-1);
    if(Ap.length<2||Bp.length<2)continue;
    if(polyDist(Ap,Bp)<3)close++;
  }
  let closeAll=0;
  for(let i=0;i<CABLE_PAIRS.length;i++)for(let j=i+1;j<CABLE_PAIRS.length;j++){
    const A=CABLE_PAIRS[i],B=CABLE_PAIRS[j];
    const Ap=A.pts.slice(1,-1),Bp=B.pts.slice(1,-1);
    if(Ap.length<2||Bp.length<2)continue;
    if(polyDist(Ap,Bp)<3)closeAll++;
  }
  let sum=0,n=0;
  for(const p of CABLE_PAIRS){let L=0;for(let i=1;i<p.pts.length;i++)L+=Math.hypot(p.pts[i][0]-p.pts[i-1][0],p.pts[i][1]-p.pts[i-1][1]);const A=CITY[p.a],B=CITY[p.b];if(!A||!B)continue;const d=Math.hypot(A.x-B.x,A.y-B.y)||1;sum+=L/d;n++;}
  function cross(P,Q){
    let c=0;
    for(let i=0;i<P.length-1;i++)for(let j=0;j<Q.length-1;j++){
      const a=P[i],b=P[i+1],cc=Q[j],d=Q[j+1];
      const d1=(b[0]-a[0])*(cc[1]-a[1])-(b[1]-a[1])*(cc[0]-a[0]);
      const d2=(b[0]-a[0])*(d[1]-a[1])-(b[1]-a[1])*(d[0]-a[0]);
      const d3=(d[0]-cc[0])*(a[1]-cc[1])-(d[1]-cc[1])*(a[0]-cc[0]);
      const d4=(d[0]-cc[0])*(b[1]-cc[1])-(d[1]-cc[1])*(b[0]-cc[0]);
      if(((d1>0)!==(d2>0))&&((d3>0)!==(d4>0)))c++;
    }
    return c;
  }
  let crossings=0;
  for(let i=0;i<CABLE_PAIRS.length;i++)for(let j=i+1;j<CABLE_PAIRS.length;j++)crossings+=cross(CABLE_PAIRS[i].pts,CABLE_PAIRS[j].pts);
  return {close, closeAll, detour:+(sum/n).toFixed(3), crossings, nCables:CABLE_PAIRS.length};
`;

const h = load();
h.ev("beginGame('N','jkt',{region:'idn'})");
const r = h.ev(`(() => { ${SRC} })()`);
console.log(JSON.stringify(r, null, 1));
