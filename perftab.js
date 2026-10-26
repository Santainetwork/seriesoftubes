const path=process.argv[2]||'.';
const {load}=require(path+'/tests/harness');
const {ev}=load();
// reuse the perf fixture
const fx=require(path+'/scripts/perf-fixture.js');
fx.seed(ev);
for(const k of ['overview','conn','traffic','infra','cust','lease']){
  ev("$('dash').hidden=false");
  ev(`UI.dtab='${k}'`);
  ev("renderDash()"); // warm
  const t=process.hrtime.bigint();
  for(let i=0;i<5;i++)ev(`UI.dtab='${k}';UI._dh=null;renderDash()`);
  const ms=Number(process.hrtime.bigint()-t)/1e6/5;
  console.log(k.padEnd(10), ms.toFixed(1));
}
