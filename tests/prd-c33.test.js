// PRD Brief 7 §3.5 gate: 33 IDN cities, all on land, P 3577, none isolated.
// Run: node --test tests/prd-c33.test.js
const test = require('node:test');
const assert = require('node:assert/strict');
const { load } = require('./harness');

/* ---------- §3.5 33 cities, all on land, none isolated ---------- */
test('idn: 34 cities including Singapore, all on land, none isolated', () => {
  const { ev } = load();
  ev("applyRegion('idn')");
  /* Brief 18 §I: Singapore joined the Indonesia map so a player can build a POP there for
     content cross-connects — that is where the country's traffic actually meets the internet. */
  assert.equal(ev('CITIES.length'), 34);
  const atSea = JSON.parse(ev(`JSON.stringify(CITIES.filter(function(c){
    return !onLand(CITY[c.id].x, CITY[c.id].y); }).map(function(c){return c.id;}))`));
  assert.deepEqual(atSea, [], `in the sea: ${atSea}`);
});
test('idn: P total is 4027 (3577 Indonesian plus Singapore 450)', () => {
  const { ev } = load();
  ev("applyRegion('idn')");
  assert.equal(ev('CITIES.reduce(function(a,c){return a+c.P;},0)'), 4027);
});
test('idn: every city is reachable', () => {
  const { ev } = load();
  ev("applyRegion('idn')");
  const iso = JSON.parse(ev(`JSON.stringify(CITIES.filter(function(c){
    var id=c.id;
    return !CABLE_PAIRS.some(function(p){return p.a===id||p.b===id;});
  }).map(function(c){return c.id;}))`));
  assert.deepEqual(iso, [], `isolated: ${iso}`);
  const bad = ev("CABLE_PAIRS.filter(function(p){return !CITY[p.a]||!CITY[p.b];}).length");
  assert.equal(bad, 0, 'no dangling city ids');
});
