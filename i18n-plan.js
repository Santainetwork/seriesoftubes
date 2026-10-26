const fs=require('fs');
const {sourceKeys,loadDict,brokenEntries}=require('./scripts/i18n-check');
const html=fs.readFileSync('site/index.html','utf8');
const keys=[...sourceKeys(html)];
const K=new Set(keys);
const norm=s=>s.replace(/[^a-z0-9]+/gi,' ').toLowerCase().trim();
function sim(a,b){const A=new Set(norm(a).split(' ')),B=new Set(norm(b).split(' '));let i=0;for(const x of A)if(B.has(x))i++;return i/Math.max(A.size,B.size);}
for(const lang of ['it','pt']){
  const dict=loadDict(`site/i18n/${lang}.js`);
  const unused=Object.keys(dict).filter(k=>!K.has(k));
  const missing=keys.filter(k=>!(k in dict));
  const del=[],ren=[];
  for(const u of unused){
    let best=null,bs=0;
    for(const k of missing){const s=sim(u,k);if(s>bs){bs=s;best=k;}}
    if(best&&bs>=0.8&&!brokenEntries({[best]:dict[u]}).length)ren.push([u,best,bs]);
    else del.push(u);
  }
  console.log('=====',lang,'unused',unused.length,'-> rename',ren.length,'delete',del.length,'missing',missing.length);
  console.log('RENAMES:');
  for(const [u,b,s] of ren)console.log('  ',JSON.stringify(u),'\n    ->',JSON.stringify(b),s.toFixed(2));
  const usedTargets=new Set(ren.map(r=>r[1]));
  console.log('STILL MISSING:');
  for(const m of missing)if(!usedTargets.has(m))console.log('  ',JSON.stringify(m));
  fs.writeFileSync(`/tmp/i18n-${lang}.json`,JSON.stringify({ren,del,missing},null,1));
}
