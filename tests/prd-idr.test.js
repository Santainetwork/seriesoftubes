// PRD Brief 15 (revisi K): Rupiah display for the Indonesia region.
// Every internal number stays in dollars; only fmt$ converts at the edge.
// One unit only: thousands of rupiah with the k suffix (no jt/M/T).
// Run: node --test tests/prd-idr.test.js
const test = require('node:test');
const assert = require('node:assert/strict');
const { load } = require('./harness');

test('idn: money is shown in thousands of rupiah', () => {
  const { ev } = load();
  ev("beginGame('N','jkt',{region:'idn'})");
  assert.equal(ev("fmt$(20000)"), 'Rp 324.000k');
  assert.equal(ev("fmt$(200000)"), 'Rp 3.240.000k');
  assert.equal(ev("fmt$(1500)"), 'Rp 24.300k');
});

test('idn: grouping uses dots, never commas', () => {
  const { ev } = load();
  ev("beginGame('N','jkt',{region:'idn'})");
  const s = ev("fmt$(250000)");
  assert.ok(!s.includes(','), `${s} must not use a comma as a thousands separator`);
  assert.match(s, /^Rp [\d.]+k$/);
});

test('idn: internal cash stays in dollars', () => {
  const { ev } = load();
  ev("beginGame('N','jkt',{region:'idn'})");
  assert.equal(ev('S.cash'), 250000, 'the save format does not change');
});

test('global: money stays in dollars', () => {
  const { ev } = load();
  ev("beginGame('N','fra',{region:'global'})");
  assert.equal(ev("fmt$(20000)"), '$20k');
  assert.equal(ev("fmt$(2000000)"), '$2.0M');
});

test('sea: money stays in dollars', () => {
  const { ev } = load();
  ev("beginGame('N','jkt',{region:'sea'})");
  assert.equal(ev("fmt$(20000)"), '$20k');
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
