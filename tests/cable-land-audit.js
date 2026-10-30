// Land violations measured along the SEGMENTS, not just at the vertices. A long segment between
// two water vertices can cross an island without either endpoint being on land, which the
// vertex-only check in the test suite misses.
const { load } = require('./harness.js');
const h = load(process.argv[3] ? { file: process.argv[3] } : {});
h.ev(`applyRegion('${process.argv[2] || 'sea'}')`);
const r = h.ev(`(()=>{
  const bad=[];
  let totPts=0,landPts=0,totSegs=0,landSegs=0;
  for(const cp of CABLE_PAIRS){
    if(LAND_LINKS.has(cp.cid)||(CAB[cp.cid]&&CAB[cp.cid].rail))continue;
    const P=cp.pts;
    let segs=0;
    for(let i=1;i<P.length;i++){
      const a=P[i-1],b=P[i];
      const d=Math.hypot(b[0]-a[0],b[1]-a[1]);
      const n=Math.max(2,Math.ceil(d/2));
      let hit=0;
      for(let k=1;k<n;k++){const t=k/n;if(onLand(a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t))hit++;}
      totSegs++;
      if(hit){landSegs++;segs++;}
      totPts++;
      if(onLand(b[0],b[1]))landPts++;
    }
    if(segs)bad.push({cid:cp.cid,r:cp.a+'>'+cp.b,segs,n:P.length});
  }
  bad.sort((a,b)=>b.segs-a.segs);
  return {cablesWithLandSegs:bad.length,landSegs,totSegs,pct:+(landSegs/totSegs*100).toFixed(2),
          landPts,pctPts:+(landPts/totPts*100).toFixed(2),worst:bad.slice(0,12)};
})()`);
console.log(JSON.stringify(r));
