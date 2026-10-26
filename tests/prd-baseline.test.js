// Baseline assertions for PRD.md §16.1 — "Global must not change".
// These pin the numbers after the upstream merge so a region refactor cannot silently shrink the
// world. Bumped again for v1.28/v1.29: upstream added 79 cities (Africa, Brazil and twenty-one
// more), 8 cables, 64 cable pairs and 23 networks on top of the v1.27 figures (99/83/145/134).
// Run: node --test tests/prd-baseline.test.js
const test = require('node:test');
const assert = require('node:assert/strict');
const { load } = require('./harness');

test('PRD §16.1: global region baseline is unchanged', () => {
  const { ev, errors } = load();
  assert.equal(ev('CITIES.length'), 178, 'cities');
  assert.equal(ev('CABLES.length'), 91, 'cables');
  assert.equal(ev('CABLE_PAIRS.length'), 209, 'cable pairs');
  assert.equal(ev('XIX.length'), 26, 'rival exchanges');
  assert.equal(ev('TAIL.length'), 60, 'long tail');
  /* Upstream v1.29 carries 154 networks; the fork's three Korean sender-pays carriers (Kay-Tea,
     SK Broadbandit, LG You-Pay-Plus) make 157. Taking either side of that hunk alone loses one. */
  assert.equal(ev('NETS.filter(n=>!n.tail).length'), 94, 'non-tail networks');
  assert.equal(ev('NETS.length'), 157, 'all networks');
  assert.equal(ev('LENSES.length'), 7, 'lenses');
  assert.equal(ev('LANDS_LL.length'), 14, 'land polygons');
  assert.equal(ev('Object.keys(CITY_LL).length'), 178, 'city coordinates');
  assert.equal(ev('regionMult("sin")'), 2.5, 'Asia multiplier');
  assert.equal(ev('kmBetween("fra","ams")'), 364, 'reference distance');
  // Cross-realm arrays: compare via JSON, not deepEqual.
  assert.equal(JSON.stringify(ev('proj0(0,0)')), '[1000,537.6]', 'projection origin');
  assert.deepEqual(errors, [], 'no runtime errors');
});

test('PRD §16.1: every city sits on land in the global map', () => {
  const { ev } = load();
  // Cross-realm array: compare as JSON, not deepEqual.
  const atSea = ev(`JSON.stringify(Object.keys(CITY).filter(c=>!onLand(CITY[c].x,CITY[c].y)))`);
  assert.equal(atSea, '[]', `cities in the sea: ${atSea}`);
});

test('PRD §6.5b: at least one Tier 1 already covers all 8 SEA core cities', () => {
  // Verified fact: ntt covers 8/8. If this ever fails, M4c needs a new Tier 1.
  const { ev } = load();
  const core = ['jkt', 'sin', 'kul', 'bkk', 'sgn', 'mnl', 'hkg', 'tpe'];
  const coverage = JSON.parse(ev(
    `JSON.stringify(NETS.filter(n=>n.type==='t1').map(n=>({id:n.id,hit:${JSON.stringify(core)}.filter(c=>n.pops.includes(c)).length})))`
  ));
  assert.ok(coverage.length > 0, 'at least one Tier 1 exists');
  // Today only ntt reaches all 8; lvl reaches 0. After filtering for SEA,
  // exactly one T1 must cover all core cities.
  const deep = coverage.filter(c => c.hit === core.length);
  assert.ok(deep.length >= 1, `no T1 covers all 8 core cities: ${JSON.stringify(coverage)}`);
});
