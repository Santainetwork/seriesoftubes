// PRD Brief 6 §1 gate: Tier 1 thresholds come from REGION.*.rules, not hardcoded globals.
// Run: node --test tests/prd-t1club.test.js
const test = require('node:test');
const assert = require('node:assert/strict');
const { load } = require('./harness');

test('t1Club: global keeps 3 continents / 10 POPs / 1.8 Tbps for six Tier 1s', () => {
  const { ev } = load();
  ev("beginGame('X','fra',{region:'global'})");
  const m = JSON.parse(ev('JSON.stringify(t1Club().missing)'));
  assert.ok(m.some(s => s.includes('3+ continents')));
  assert.ok(m.some(s => s.includes('10+ POPs')));
  assert.ok(m.some(s => s.includes('1.8 Tbps')));
});

test('t1Club: idn asks for 1 continent / 6 POPs / 250 Gbps', () => {
  const { ev } = load();
  ev("beginGame('X','jkt',{region:'idn'})");
  const m = JSON.parse(ev('JSON.stringify(t1Club().missing)'));
  assert.equal(m.some(s => s.includes('continent')), false, 'one continent is satisfied');
  assert.ok(m.some(s => s.includes('6+ POPs')));
  assert.ok(m.some(s => s.includes('250 Gbps')));
});
