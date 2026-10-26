// Rebuild the corridor offsets directly in the harness over the CURRENT (post-bow) geometry,
// with a truncation-aware margin, then measure. This tests whether a pass running on the final
// geometry can separate the approach-corridor pairs.
const { load } = require('./harness.js');
const h = load();
h.ev("beginGame('N','jkt',{region:'idn'})");
const r = h.ev(`(() => {
  function segDist(p,a,b){const dx=b[0]-a[0],dy=b[1]-a[1];const t=Math.max(0,Math.min(1,((p[0]-a[0])*dx+(p[1]-a[1])*dy)/(dx*dx+dy*dy||1)));return Math.hypot(p[0]-a[0]-t*dx,p[1]-a[1]-t*dy);}
  function polyDist(P,Q){let m=Infinity;for(const p of P)for(let i=0;i<Q.length-1;i++)m=Math.min(m,segDist(p,Q[i],Q[i+1]));return m;}
  function measure(tag){
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
    return {tag, close, detour:+(sum/n).toFixed(3)};
  }
  const out=[measure('base')];
  // Build nearest-neighbour map on current geometry (interior only, endpoints excluded — they
  // are all at cities where everything legitimately meets).
  const CP=CABLE_PAIRS;
  for(const CLANE of [12,20]){
    const off=new Map();
    const offOf=cp=>{let v=off.get(cp);if(!v){v=cp.pts.map(()=>0);off.set(cp,v);}return v;};
    for(let i=0;i<CP.length;i++)for(let j=i+1;j<CP.length;j++){
      const p=CP[i],q=CP[j];
      const P=p.pts,Q=q.pts;
      const pi=[],qi=[];
      for(let t=1;t<P.length-1;t++){let best=Infinity,bi=-1;for(let u=1;u<Q.length-1;u++){const d=Math.hypot(P[t][0]-Q[u][0],P[t][1]-Q[u][1]);if(d<best){best=d;bi=u;}}if(best<50)pi.push([t,bi,best]);}
      for(let u=1;u<Q.length-1;u++){let best=Infinity,ti=-1;for(let t=1;t<P.length-1;t++){const d=Math.hypot(P[t][0]-Q[u][0],P[t][1]-Q[u][1]);if(d<best){best=d;ti=t;}}if(best<50)qi.push([u,ti,best]);}
      if(pi.length<3||qi.length<3)continue;
      const vp=offOf(p),vq=offOf(q);
      const s=i%2?1:-1;
      for(const [t] of pi)vp[t]+=s*CLANE/2;
      for(const [u] of qi)vq[u]-=s*CLANE/2;
    }
    // feather (3-wide kernel like the real pass)
    for(const [cp,v] of [...off]){
      const n=v.length,sm=v.map(()=>0);
      for(let t=1;t<n-1;t++){let a=0,w=0;for(let k=-3;k<=3;k++){const u=t+k;if(u<1||u>n-2)continue;const wt=3-Math.abs(k);a+=v[u]*wt;w+=wt;}sm[t]=a/(w||1);}
      off.set(cp,sm);
    }
    // apply along local tangents, endpoints untouched
    for(const [cp,v] of off){
      const P=cp.pts;
      for(let t=1;t<P.length-1;t++){
        if(!v[t])continue;
        const a=P[Math.max(0,t-1)],b=P[Math.min(P.length-1,t+1)];
        const dx=b[0]-a[0],dy=b[1]-a[1],L=Math.hypot(dx,dy)||1;
        P[t][0]+=-dy/L*v[t];P[t][1]+=dx/L*v[t];
      }
    }
    out.push(measure('lane'+CLANE));
  }
  return out;
})()`);
for(const m of r)console.log(JSON.stringify(m));
