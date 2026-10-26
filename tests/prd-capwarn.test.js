// A player in Semarang reported "the router blows up at level 1". The numbers say the router has
// 400 Gbps and demand starts at 8, growing 2.5% a day — the wall is 156 days away, which at 8x
// speed is three weeks of real play. That is not a bug, but meeting it without warning is. These
// tests lock the countdown so it cannot silently disappear in a merge.
const test = require('node:test');
const assert = require('node:assert');
const { load } = require('./harness.js');

function idn() {
  const h = load();
  h.ev("beginGame('N','smg',{region:'idn'})");
  return h;
}

test('capDays: a fresh ISP in Semarang sees the wall months away, not tomorrow', () => {
  const { ev } = idn();
  ev("S.pops.smg.bb={p:1,churn:0,d:8.1,served:0};");
  ev('compute()');
  const d = ev("capDays('smg')");
  assert.ok(d > 120 && d < 200, 'expected the 400 Gbps wall around day 156, got ' + d);
});

test('capDays: a full router reports zero, not a negative number', () => {
  const { ev } = idn();
  ev("S.pops.smg.bb={p:1,churn:0,d:5000,served:0};");
  ev('compute()');
  assert.equal(ev("capDays('smg')"), 0);
});

test('capDays: no broadband means no countdown', () => {
  const { ev } = idn();
  assert.equal(ev("capDays('smg')"), null);
});

test('capWarn: says nothing when the wall is far away', () => {
  const { ev } = idn();
  ev("S.pops.smg.bb={p:1,churn:0,d:8.1,served:0};");
  ev('compute()');
  const w = ev("capWarn('smg')");
  assert.ok(w.includes('156 days'), w);
  assert.ok(w.includes('Upgrade in Infra'), 'the warning must say what to do');
});

test('capWarn: shouts when the router is already dropping traffic', () => {
  const { ev } = idn();
  ev("S.pops.smg.bb={p:1,churn:0,d:5000,served:0};");
  ev('compute()');
  const w = ev("capWarn('smg')");
  assert.ok(w.includes('at their limit'), w);
  assert.ok(w.includes('being dropped'), w);
});
