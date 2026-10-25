// PRD resilience gate: an outage costs service, not the whole internet.
// Regression: a power cut at a single POP left no exits to evaluate, reach scored 0,
// customer satisfaction followed it down and the contract was cancelled within three days.
// Run: node --test tests/prd-resilience.test.js
const test = require('node:test');
const assert = require('node:assert/strict');
const { load } = require('./harness');

test('reach: a dead POP does not erase the internet', () => {
  const { ev } = load();
  ev("beginGame('T','fra',{region:'global',role:'isp'})");
  ev('S.cash=1e9');
  ev("ACT.launchBB({city:'fra'})");
  ev("ACT.buyTransit({city:'fra',net:'ntt',tier:1})");
  for (let i = 0; i < 20; i++) ev('dayTick()');
  assert.ok(ev('R.reach') > 0.99, 'healthy before the incident');

  // Take the only POP down for three days.
  ev('S.pops.fra.down = S.day + 3');
  ev('compute()');
  assert.ok(ev('R.reach') > 0.99, `reach collapsed to ${ev('R.reach')}`);
});

test('reach: service in the dead city still drops to zero', () => {
  const { ev } = load();
  ev("beginGame('T','fra',{region:'global',role:'isp'})");
  ev('S.cash=1e9');
  ev("ACT.launchBB({city:'fra'})");
  ev("ACT.buyTransit({city:'fra',net:'ntt',tier:1})");
  for (let i = 0; i < 20; i++) ev('dayTick()');
  ev('S.pops.fra.down = S.day + 3');
  ev('compute()');
  // The outage must still be felt where it happened.
  assert.equal(ev('R.citySrv.fra'), 0, 'no service in the dead city');
});

test('mood: a three-day outage does not cancel the contract', () => {
  const { ev } = load();
  ev("beginGame('T','fra',{region:'global',role:'isp'})");
  ev('S.cash=1e9');
  ev("ACT.launchBB({city:'fra'})");
  ev("ACT.buyTransit({city:'fra',net:'ntt',tier:1})");
  for (let i = 0; i < 20; i++) ev('dayTick()');
  ev("S.offers=[{id:'x',city:'fra',city2:null,name:'Test Co',type:'dia',bw:10,rate:150,reqs:[],exp:S.day+30}]");
  ev("ACT.accept({id:'x'})");
  assert.equal(ev('S.biz.length'), 1);

  // Cut the city for three days, then restore it.
  ev('S.pops.fra.down = S.day + 3');
  for (let i = 0; i < 3; i++) ev('dayTick()');
  ev('S.pops.fra.down = 0');
  for (let i = 0; i < 2; i++) ev('dayTick()');
  assert.equal(ev('S.biz.length'), 1, 'the customer survived a three-day outage');
  assert.ok(ev('S.biz[0].mood') > 30, `mood fell to ${ev('S.biz[0].mood')}`);
});

test('mood: the daily bleed is capped', () => {
  const { ev } = load();
  ev("beginGame('T','fra',{region:'global',role:'isp'})");
  ev('S.cash=1e9');
  ev("ACT.launchBB({city:'fra'})");
  for (let i = 0; i < 20; i++) ev('dayTick()');
  ev("S.offers=[{id:'x',city:'fra',city2:null,name:'Test Co',type:'dia',bw:10,rate:150,reqs:[],exp:S.day+30}]");
  ev("ACT.accept({id:'x'})");
  ev("S.biz[0].since = S.day - 20");          // past the grace window
  ev('S.pops.fra.down = S.day + 30');         // worst case: city dark
  const before = ev('S.biz[0].mood');
  ev('dayTick()');
  const after = ev('S.biz[0].mood');
  assert.ok(before - after <= 15.001, `lost ${(before - after).toFixed(1)} points in one day`);
});
