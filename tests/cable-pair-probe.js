// Why didn't the corridor pass separate sub:sby-bjm / jakalad:dps-bjm?
const { load } = require('./harness.js');
const h = load();
h.ev("beginGame('N','jkt',{region:'idn'})");
const r = h.ev(`(() => {
  const A = CABLE_PAIRS.find(p=>p.cid==='sub'&&p.a==='sby'&&p.b==='bjm');
  const B = CABLE_PAIRS.find(p=>p.cid==='jakalad');
  if(!A||!B) return {err:'not found', hasA:!!A, hasB:!!B, jakalad:CABLE_PAIRS.filter(p=>p.cid==='jakalad').map(p=>p.a+'-'+p.b)};
  // for each interior point of A, distance to nearest interior point of B
  const rows=[];
  for(let t=1;t<A.pts.length-1;t++){
    const a=A.pts[t];let best=Infinity,bi=-1;
    for(let u=1;u<B.pts.length-1;u++){const d=Math.hypot(a[0]-B.pts[u][0],a[1]-B.pts[u][1]);if(d<best){best=d;bi=u;}}
    rows.push([t,+best.toFixed(1),bi]);
  }
  return {Apts:A.pts.length,Bpts:B.pts.length,rows};
})()`);
console.log(JSON.stringify(r, null, 1));
