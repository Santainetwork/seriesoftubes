// Rebuild the bowCables pipeline over the ORIGINAL geometry with several design variants.
// Each variant runs in its OWN ev() call so the template-string mangling of the big body
// cannot interfere with the variants JSON.
const { load } = require('./harness.js');

const HELPERS = `
  function segDist(p,a,b){const dx=b[0]-a[0],dy=b[1]-a[1];const t=Math.max(0,Math.min(1,((p[0]-a[0])*dx+(p[1]-a[1])*dy)/(dx*dx+dy*dy||1)));return Math.hypot(p[0]-a[0]-t*dx,p[1]-a[1]-t*dy);}
  function polyDist(P,Q){let m=Infinity;for(const p of P)for(let i=0;i<Q.length-1;i++)m=Math.min(m,segDist(p,Q[i],Q[i+1]));return m;}
  function segX(P,Q){
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
  function measure(){
    let close=0,closeAll=0;
    for(let i=0;i<CABLE_PAIRS.length;i++)for(let j=i+1;j<CABLE_PAIRS.length;j++){
      const A=CABLE_PAIRS[i],B=CABLE_PAIRS[j];
      const Ap=A.pts.slice(1,-1),Bp=B.pts.slice(1,-1);
      if(Ap.length<2||Bp.length<2)continue;
      const d=polyDist(Ap,Bp);
      if(d<3){closeAll++;if([A.a,A.b].some(x=>[B.a,B.b].includes(x)))close++;}
    }
    let sum=0,n=0;
    for(const p of CABLE_PAIRS){let L=0;for(let i=1;i<p.pts.length;i++)L+=Math.hypot(p.pts[i][0]-p.pts[i-1][0],p.pts[i][1]-p.pts[i-1][1]);const A=CITY[p.a],B=CITY[p.b];if(!A||!B)continue;const d=Math.hypot(A.x-B.x,A.y-B.y)||1;sum+=L/d;n++;}
    let crossings=0;
    for(let i=0;i<CABLE_PAIRS.length;i++)for(let j=i+1;j<CABLE_PAIRS.length;j++)crossings+=segX(CABLE_PAIRS[i].pts,CABLE_PAIRS[j].pts);
    return {close,closeAll,detour:+(sum/n).toFixed(3),crossings};
  }
`;

// V is the variant object; injected via a const line per call.
function variantBody(V) {
  return HELPERS + `
  function runVariant(o){
    for(const cp of CABLE_PAIRS)cp.pts=window.__ORIG.get(cp).map(q=>q.slice());
    const PITCH=14,FRAC=0.35,LANE=12;
    const key=new Map(),byRoute=new Map();
    for(const cp of CABLE_PAIRS){
      const k=cp.a<cp.b?cp.a+'>'+cp.b:cp.b+'>'+cp.a;
      key.set(cp,k);if(!byRoute.has(k))byRoute.set(k,[]);byRoute.get(k).push(cp);
    }
    const lane=new Map();
    for(const list of byRoute.values()){
      if(list.length<2)continue;
      list.forEach((cp,i)=>lane.set(cp,i-(list.length-1)/2));
    }
    const corr=new Map();
    if(o.mode==='radial'){
      const NEAR=55,MINRUN=4,SAMPLE=3,CORRIDOR=o.CORRIDOR;
      const vecOf=cp=>{let v=corr.get(cp);if(!v){v=cp.pts.map(()=>[0,0]);corr.set(cp,v);}return v;};
      for(let i=0;i<CABLE_PAIRS.length;i++)for(let j=i+1;j<CABLE_PAIRS.length;j++){
        const p=CABLE_PAIRS[i],q=CABLE_PAIRS[j];
        if(key.get(p)===key.get(q))continue;
        const P=p.pts,Q=q.pts;
        if(Math.min(P.length,Q.length)<MINRUN+2)continue;
        for(let s=1;s<P.length-1;s+=SAMPLE){
          let run=0;
          for(let t=s;t<P.length-1;t++){
            const a=P[t];let best=Infinity,bi=-1;
            for(let u=1;u<Q.length-1;u++){const d=Math.hypot(a[0]-Q[u][0],a[1]-Q[u][1]);if(d<best){best=d;bi=u;}}
            if(best>=NEAR)break;run++;
          }
          if(run<MINRUN)continue;
          for(let t=s;t<s+run;t++){
            const a=P[t];let best=Infinity,bi=-1;
            for(let u=1;u<Q.length-1;u++){const d=Math.hypot(a[0]-Q[u][0],a[1]-Q[u][1]);if(d<best){best=d;bi=u;}}
            let vx=a[0]-Q[bi][0],vy=a[1]-Q[bi][1];const vl=Math.hypot(vx,vy)||1;
            const vp=vecOf(p),vq=vecOf(q);
            vp[t][0]+=vx/vl*CORRIDOR;vp[t][1]+=vy/vl*CORRIDOR;
            vq[bi][0]-=vx/vl*CORRIDOR;vq[bi][1]-=vy/vl*CORRIDOR;
          }
        }
      }
    }else if(o.mode==='lane'){
      const NEAR=55,MINRUN=4,CLANE=o.CLANE;
      const offOf=cp=>{let v=corr.get(cp);if(!v){v=cp.pts.map(()=>0);corr.set(cp,v);}return v;};
      const nearest=(pt,Q)=>{let best=Infinity,bi=-1;for(let u=1;u<Q.length-1;u++){const d=Math.hypot(pt[0]-Q[u][0],pt[1]-Q[u][1]);if(d<best){best=d;bi=u;}}return [best,bi];};
      for(let i=0;i<CABLE_PAIRS.length;i++)for(let j=i+1;j<CABLE_PAIRS.length;j++){
        const p=CABLE_PAIRS[i],q=CABLE_PAIRS[j];
        if(key.get(p)===key.get(q))continue;
        const P=p.pts,Q=q.pts;
        if(Math.min(P.length,Q.length)<MINRUN+2)continue;
        let t=1;
        while(t<P.length-1){
          const [d0]=nearest(P[t],Q);
          if(d0>=NEAR){t++;continue;}
          let e=t;const bis=[];
          while(e<P.length-1){const [de,be]=nearest(P[e],Q);if(de>=NEAR)break;bis.push(be);e++;}
          if(e-t>=MINRUN){
            const mid=t+((e-t)>>1);
            const pa=P[Math.max(0,mid-1)],pb=P[Math.min(P.length-1,mid+1)];
            const qi=bis[mid-t],qa=Q[Math.max(0,qi-1)],qb=Q[Math.min(Q.length-1,qi+1)];
            const anti=(qb[0]-qa[0])*(pb[0]-pa[0])+(qb[1]-qa[1])*(pb[1]-pa[1])<0;
            const vp=offOf(p),vq=offOf(q);
            const sp=(i%2?-1:1)*CLANE/2;
            for(let k=t;k<e;k++)vp[k]+=sp;
            const got=new Set();
            for(let k=t;k<e;k++){const u=bis[k-t];if(!got.has(u)){got.add(u);vq[u]+=(anti?1:-1)*sp;}}
          }
          t=e;
        }
      }
    }
    for(const [cp,v] of [...corr]){
      const n=v.length;
      if(o.mode==='radial'){
        const sm=v.map(()=>[0,0]);
        for(let t=1;t<n-1;t++){let ax=0,ay=0,w=0;for(let k=-3;k<=3;k++){const u=t+k;if(u<1||u>n-2)continue;const wt=3-Math.abs(k);ax+=v[u][0]*wt;ay+=v[u][1]*wt;w+=wt;}sm[t][0]=ax/(w||1);sm[t][1]=ay/(w||1);}
        corr.set(cp,sm);
      }else{
        const sm=v.map(()=>0);
        for(let t=1;t<n-1;t++){let a=0,w=0;for(let k=-3;k<=3;k++){const u=t+k;if(u<1||u>n-2)continue;const wt=3-Math.abs(k);a+=v[u]*wt;w+=wt;}sm[t]=a/(w||1);}
        corr.set(cp,sm);
      }
    }
    const atCity=new Map();
    for(const cp of CABLE_PAIRS){
      const k=key.get(cp);
      for(const [c,o2] of [[cp.a,cp.b],[cp.b,cp.a]]){
        if(!CITY[c]||!CITY[o2])continue;
        if(!atCity.has(c))atCity.set(c,new Map());
        const m=atCity.get(c);if(!m.has(k))m.set(k,{other:o2,k});
      }
    }
    const fanAt=new Map();
    for(const [c,m] of atCity){
      const C=CITY[c],list=[...m.values()];
      if(list.length<2)continue;
      for(const x of list){const O=CITY[x.other];x.brg=Math.atan2(O.y-C.y,O.x-C.x);}
      list.sort((p,q)=>p.brg-q.brg||(p.other<q.other?-1:p.other>q.other?1:0)||(p.k<q.k?-1:p.k>q.k?1:0));
      const half=(list.length-1)/2,fan=new Map();
      list.forEach((x,i)=>fan.set(x.k,{s:i-half,half,n:list.length}));
      fanAt.set(c,fan);
    }
    for(const cp of CABLE_PAIRS){
      const A=CITY[cp.a],B=CITY[cp.b];
      if(!A||!B||!cp.pts||cp.pts.length<3)continue;
      const k=key.get(cp);
      const fa=(fanAt.get(cp.a)||new Map()).get(k),fb=(fanAt.get(cp.b)||new Map()).get(k);
      const f=!fa?fb:!fb?fa:(fa.n>=fb.n?fa:fb);
      const l=lane.get(cp)||0;
      if((!f||!f.s)&&!l)continue;
      const dx=A.x-B.x,dy=B.y-A.y,len=Math.hypot(dx,dy)||1;
      const nx=-dy/len,ny=dx/len;
      const cv=corr.get(cp);
      if((!f||!f.s)&&!l&&!cv)continue;
      const unit=f?Math.max(6,Math.min(PITCH,FRAC*len/f.half)):0;
      const mid=cp.pts.slice(1,-1),last=mid.length+1;
      let Lp=0;const cum=[0];
      for(let i=1;i<cp.pts.length;i++){Lp+=Math.hypot(cp.pts[i][0]-cp.pts[i-1][0],cp.pts[i][1]-cp.pts[i-1][1]);cum.push(Lp);}
      const envFan=o.env==='linear'?(t=>Math.max(0,Math.min(1,Math.min(cum[t],Lp-cum[t])/o.MERGEFAN)))
                                    :(t=>Math.sin(Math.PI*t/last));
      const envLane=o.env==='linear'?(t=>Math.max(0,Math.min(1,Math.min(cum[t],Lp-cum[t])/o.MERGELANE)))
                                    :(t=>Math.sin(Math.PI*t/last));
      cp.pts=[cp.pts[0]].concat(mid.map((q,j)=>{
        const t=j+1;
        const ef=envFan(t),el=envLane(t);
        const d=(f?f.s*unit:0)*ef+l*LANE*el;
        if(o.mode==='radial'){
          const w=cv?cv[t]:null;
          return [q[0]+nx*d+(w?w[0]:0),q[1]+ny*d+(w?w[1]:0)];
        }
        const w=cv?cv[t]:0;
        if(!w)return [q[0]+nx*d,q[1]+ny*d];
        const pr=cp.pts[t-1],ax=q[0]-pr[0],ay=q[1]-pr[1],al=Math.hypot(ax,ay)||1;
        return [q[0]+nx*d-ay/al*w*el,q[1]+ny*d+ax/al*w*el];
      }),[cp.pts[cp.pts.length-1]]);
    }
    return measure();
  }
  return Object.assign({name:V.name}, runVariant(V));
  `;
}

function runVariant(setup, V) {
  const h = load();
  h.ev(setup);
  h.ev(`window.__ORIG=new Map();for(const cp of CABLE_PAIRS)window.__ORIG.set(cp,cp.pts.map(q=>q.slice()));`);
  return h.ev(`(() => { const V=${JSON.stringify(V)}; ${variantBody(V)} })()`);
}

const setup = "beginGame('N','jkt',{region:'idn'})";
const variants = [
  { name: 'committed C24 radial', mode: 'radial', CORRIDOR: 24, env: 'sine' },
  { name: 'lane16 sine', mode: 'lane', CLANE: 16, env: 'sine' },
  { name: 'lane16 merge60/60', mode: 'lane', CLANE: 16, env: 'linear', MERGEFAN: 60, MERGELANE: 60 },
  { name: 'lane16 merge fan25/lane60', mode: 'lane', CLANE: 16, env: 'linear', MERGEFAN: 25, MERGELANE: 60 },
  { name: 'lane16 merge fan25/lane120', mode: 'lane', CLANE: 16, env: 'linear', MERGEFAN: 25, MERGELANE: 120 },
  { name: 'lane12 merge fan30/lane60', mode: 'lane', CLANE: 12, env: 'linear', MERGEFAN: 30, MERGELANE: 60 },
];
for (const v of variants) console.log(JSON.stringify(runVariant(setup, v)));
