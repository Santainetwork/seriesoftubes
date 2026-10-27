// A POP keyed "undefined" (from a stale panel button or a damaged save) must never be minted,
// and an old save that already carries one must heal: compute() reads CITY[c] for every pop and
// used to crash on the phantom key, which froze the HUD money readouts at NaN.
const { test } = require('node:test');
const assert = require('node:assert');
const { load } = require('./harness.js');

function idnGame(seed=1){
  const { ev, errors } = load({seed});
  ev(`ensureRegion('idn');UI.region='idn';applyRegion('idn');UI.startCity='jkt';UI.role='nap';
     beginGame('NanNet',UI.startCity,{mode:'normal',region:'idn',role:'nap'});`);
  return { ev, errors };
}

test('#NaN buildPop with a missing city mints nothing and compute survives 400 days', () => {
  const { ev, errors } = idnGame();
  ev("ACT.buildPop({city:undefined});ACT.buildPop({city:'undefined'});ACT.buildPop({});");
  const pops = ev("Object.keys(S.pops).join(',')");
  assert.equal(pops, 'jkt', 'no phantom pop is minted');
  ev("for(let d=0;d<400;d++)dayTick();");
  assert.equal(ev("isFinite(S.cash)"), true, 'cash stays finite');
  assert.equal(ev("isFinite(R.revMo)&&isFinite(R.costMo)"), true, 'revenue and cost stay finite');
  assert.deepEqual(errors, []);
});

test('#NaN a save that already carries a phantom "undefined" pop heals on load', () => {
  const { ev, errors } = idnGame();
  ev("S.pops['undefined']={day:0,bb:null,boost:0,down:0,routers:1,gen:false};S=migrate(JSON.parse(JSON.stringify(S)));compute();");
  assert.equal(ev("Object.keys(S.pops).includes('undefined')"), false, 'sanitize drops the phantom pop');
  assert.equal(ev("isFinite(S.cash)"), true);
  ev("for(let d=0;d<200;d++)dayTick();");
  assert.equal(ev("isFinite(R.revMo)&&isFinite(R.costMo)"), true);
  assert.deepEqual(errors, []);
});
