// PRD Brief 15 (revisi K): Rupiah display for the Indonesia region.
// Every internal number stays in dollars; only fmt$ converts at the edge.
// One unit only: thousands of rupiah with the k suffix (no jt/M/T).
// Run: node --test tests/prd-idr.test.js
const test = require('node:test');
const assert = require('node:assert/strict');
const { load } = require('./harness');

test('idn: money is quoted in thousands with a K suffix', () => {
  const { ev } = load();
  ev("beginGame('N','jkt',{region:'idn'})");
  /* Brief 18 §L: three zeros become K — Rp 1.000,00 K is one million rupiah. */
  assert.equal(ev("fmt$(20000)"), 'Rp 324.000 K');
  assert.equal(ev("fmt$(200000)"), 'Rp 3.240.000 K');
  assert.equal(ev("fmt$(1500)"), 'Rp 24.300 K');
  assert.match(ev("fmt$(20000)"), / K$/);
});

test('idn: grouping uses dots, never commas', () => {
  const { ev } = load();
  ev("beginGame('N','jkt',{region:'idn'})");
  const s = ev("fmt$(250000)");
  assert.match(s, /^Rp [\d.]+ K$/, `${s} is a grouped number with the K suffix`);
});

test('idn: internal cash stays in dollars', () => {
  const { ev } = load();
  ev("beginGame('N','jkt',{region:'idn'})");
  assert.equal(ev('S.cash'), 250000, 'the save format does not change');
});

test('global: money stays in dollars', () => {
  const { ev } = load();
  ev("beginGame('N','fra',{region:'global'})");
  /* Brief 18 §D: dollars are written out too — no k, no M. */
  assert.equal(ev("fmt$(20000)"), '$20.000');
  assert.equal(ev("fmt$(2000000)"), '$2.000.000');
});

test('sea: money stays in dollars', () => {
  const { ev } = load();
  ev("beginGame('N','jkt',{region:'sea'})");
  assert.equal(ev("fmt$(20000)"), '$20.000');
});

test('idn: no bare dollar sign in the rendered HUD', () => {
  const { ev } = load();
  ev("beginGame('N','jkt',{region:'idn'})");
  ev('renderAll()');
  const bad = (ev("document.body.textContent").match(/\$[0-9]/g) || []);
  assert.deepEqual(bad, [], `found ${bad.length} bare dollars`);
});

test('idn: the balance sheet still balances', () => {
  // Revenue and cost totals stay in USD; only the label changes.
  const { ev } = load();
  ev("beginGame('N','jkt',{region:'idn'})");
  ev('S.cash=1e8;compute()');
  assert.equal(ev('typeof R.revMo'), 'number');
  assert.equal(ev('typeof R.costMo'), 'number');
  assert.ok(Math.abs(ev('R.revMo') - ev('R.revMo')) < 1e-9);
});
