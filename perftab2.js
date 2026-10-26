const path=process.argv[2]||'.';
const fs=require('fs');
const {load}=require(path+'/tests/harness');
const RAW=JSON.parse(fs.readFileSync(path+'/tests/fixtures/big-network.json','utf8'));
const SAVE=JSON.stringify(RAW&&RAW.app==='series-of-tubes'&&RAW.S?RAW.S:RAW);
const {ev,errors}=load({file:path+'/site/index.html',seed:777});
ev(`window.__flip=false;S=migrate(JSON.parse(${JSON.stringify(SAVE)}));UI.started=true;UI.pitched=true;UI.speed=0;closeModal();compute();renderAll();`);
ev("$('dash').hidden=false");
const time=body=>ev(`(()=>{const t=performance.now();${body};return performance.now()-t;})()`);
for(const k of ['overview','conn','traffic','infra','cust']){
  ev(`UI.dtab='${k}'`);ev('renderDash()');
  const r=[];for(let i=0;i<5;i++){r.push(time(`UI.dtab='${k}';UI._dh=null;renderDash()`));}
  r.sort((a,b)=>a-b);
  console.log(k.padEnd(10), r[2].toFixed(0));
}
console.log('errors',errors.length);
