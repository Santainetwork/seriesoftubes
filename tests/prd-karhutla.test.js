// Karhutla — the Indonesian dry-season haze event.
//
// Peat fires in Sumatra and Kalimantan are the region's signature seasonal hazard, and they are
// not a typhoon: nothing breaks, everything gets worse. Haze cannot carry a terrestrial microwave
// link, so land capacity drops a third, and everyone stays indoors streaming, so demand rises.
// Subsea cable is on the seabed and does not care.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { load } from './harness.js';

function idnGame(ev) {
  ev("ensureRegion('idn');ACT.pickRegion({id:'idn'});UI.role='isp';ACT.start({})");
  ev('S.cash=1e9');
}

test('karhutla: the event only fires when you have a POP in a province that burns', () => {
  const { ev } = load();
  // Jakarta is on Java, which is in the haze set, so the option is offered there.
  ev("ensureRegion('idn');ACT.pickRegion({id:'idn'});UI.role='isp';ACT.start({})");
  ev("ACT.buildPop({city:'plm'})");
  const lands = JSON.parse(ev(
    'JSON.stringify(Object.keys(S.pops).map(c=>CITY[c].land))'
  ));
  assert.ok(lands.some((l) => ['sum', 'kal', 'btm'].includes(l)),
    'a Sumatran or Kalimantan POP enables the event, got ' + lands.join(','));
});

test('karhutla: land links lose a third of their capacity', () => {
  const { ev } = load();
  idnGame(ev);
  ev("ACT.buildPop({city:'jkt'});ACT.buildPop({city:'bdg'})");
  ev("UI.sel={type:'city',id:'bdg'};openLinkModal('jkt','bdg');ACT.buildLink({tier:0})");
  assert.equal(ev('S.links[0].sub'), false, 'jakarta-bandung is a land link');
  const before = ev('capOf(S.links[0])');
  ev('S.ev.karhutla=S.day+20;compute()');
  const after = ev('capOf(S.links[0])');
  assert.equal(Math.round((after / before) * 100), 66, `capacity should drop to 66%, got ${after}/${before}`);
});

test('karhutla: subsea links are unaffected', () => {
  const { ev } = load();
  idnGame(ev);
  ev("ACT.buildPop({city:'plm'});ACT.buildPop({city:'jkt'})");
  ev("UI.sel={type:'city',id:'jkt'};openLinkModal('plm','jkt');ACT.buildLink({tier:0})");
  assert.equal(ev('S.links[0].sub'), true, 'palembang-jakarta goes by sea');
  const before = ev('capOf(S.links[0])');
  ev('S.ev.karhutla=S.day+20;compute()');
  assert.equal(ev('capOf(S.links[0])'), before, 'the fire does not reach the seabed');
});

test('karhutla: eyeball demand in a burning province rises 30%', () => {
  const { ev } = load();
  idnGame(ev);
  ev("ACT.buildPop({city:'plm'});ACT.buildPop({city:'jkt'})");
  ev("UI.sel={type:'city',id:'jkt'};openLinkModal('plm','jkt');ACT.buildLink({tier:0})");
  ev("ACT.launchBB({city:'jkt'});compute()");
  const before = ev('R.demand');
  assert.ok(before > 0, 'there is demand to raise');
  ev('S.ev.karhutla=S.day+20;compute()');
  const ratio = ev('R.demand') / before;
  assert.ok(Math.abs(ratio - 1.3) < 0.02, `demand should be x1.30, got x${ratio.toFixed(2)}`);
});

test('karhutla: the effect expires', () => {
  const { ev } = load();
  idnGame(ev);
  ev("ACT.buildPop({city:'jkt'});ACT.buildPop({city:'bdg'})");
  ev("UI.sel={type:'city',id:'bdg'};openLinkModal('jkt','bdg');ACT.buildLink({tier:0})");
  const before = ev('capOf(S.links[0])');
  ev('S.ev.karhutla=S.day+20;compute()');
  assert.ok(ev('capOf(S.links[0])') < before);
  ev('S.day=S.ev.karhutla+1;compute()');
  assert.equal(ev('capOf(S.links[0])'), before, 'capacity comes back when the haze clears');
});
