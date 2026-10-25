// Brief 8 gate: Singapore is locked on the IDN map until the cross-connect is paid.
// Run: node --test tests/prd-unlocksg.test.js
const test = require('node:test');
const assert = require('node:assert/strict');
const { load } = require('./harness');

const newIdn = () => {
  const { ev, errors } = load();
  ev("beginGame('X','jkt',{region:'idn'})");
  assert.deepEqual(errors, []);
  return ev;
};
const meetReqs = (ev) => {
  // 8 POPs, traffic, a year on the books, cash, and the APJII Conneck stamp.
  // R.served is recomputed by compute(), so set it LAST after all buildPop calls.
  ev("S.cash=1e7;S.day=400");
  ev("for(const c of ['sby','bdg','smg','mdn','jog','plm','upg'])ACT.buildPop({city:c})");
  ev("S.confReg=S.confReg||{};S.confReg['APJII Conneck@jkt@Y2']=true");
  ev('R.served=200');
};

test('idn: Singapore is on the map but locked at the start', () => {
  const ev = newIdn();
  assert.equal(ev('typeof CITY.sin'), 'object', '34th city renders');
  assert.equal(ev('CITIES.length'), 34);
  const o = JSON.parse(ev("JSON.stringify(unlockOffer('sin'))"));
  assert.equal(o.ok, false, 'requirements unmet on day 0');
  assert.ok(o.missing.length >= 4, `missing: ${o.missing}`);
  // buildPop refuses the locked city
  ev("ACT.buildPop({city:'sin'})");
  assert.equal(ev("S.pops.sin"), undefined);
});

test('idn: unlocking Singapore opens the build gate', () => {
  const ev = newIdn();
  meetReqs(ev);
  const o = JSON.parse(ev("JSON.stringify(unlockOffer('sin'))"));
  assert.equal(o.ok, true, `still missing: ${o.missing}`);
  ev("ACT.unlockCity({city:'sin',sure:1})");
  assert.equal(ev('CITIES.length'), 34, 'map unchanged — the gate was on the build');
  assert.ok(ev("CABLE_PAIRS.some(function(p){return (p.a==='jkt'&&p.b==='sin')||(p.a==='sin'&&p.b==='jkt');})"), 'jksg exists');
  assert.ok(ev("CABLE_PAIRS.some(function(p){return (p.a==='btm'&&p.b==='sin')||(p.a==='sin'&&p.b==='btm');})"), 'btmx exists');
  ev("ACT.buildPop({city:'sin'})");
  assert.ok(ev("S.pops.sin"), 'a POP can be built after unlock');
});

test('idn: Singapore stays locked until every requirement is met', () => {
  const ev = newIdn();
  ev('S.cash=1e7');
  ev("ACT.unlockCity({city:'sin',sure:1})");
  ev("ACT.buildPop({city:'sin'})");
  assert.equal(ev('S.pops.sin'), undefined, 'still locked');
});

test('idn: Singapore survives a save and reload', () => {
  const { ev, errors } = load();
  ev("beginGame('X','jkt',{region:'idn'})");
  meetReqs(ev);
  ev("ACT.unlockCity({city:'sin',sure:1})");
  assert.equal(ev('CITIES.length'), 34);
  ev('save()');
  ev('sanitize(S)');
  assert.equal(ev("S.unlocked.sin"), 400, 'unlock day kept');
  assert.deepEqual(errors, []);
});
