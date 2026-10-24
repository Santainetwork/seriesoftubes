// PRD M1 gate — tests/prd-m1.test.js (NEW, owned by lane m1).
// REGION + applyRegion + rebuildDerived, Global-only.
// Run: node --test tests/prd-m1.test.js
const test = require('node:test');
const assert = require('node:assert/strict');
const { load } = require('./harness');

test('M1: REGION registry is global-only', () => {
  const { ev, errors } = load();
  assert.equal(JSON.stringify(ev('Object.keys(REGION)')), '["global"]');
  assert.equal(ev("REGION.global.id"), 'global');
  assert.equal(ev('curRegion'), 'global');
  assert.deepEqual(errors, []);
});

test('M1: global region untouched (§16.1)', () => {
  const { ev, errors } = load();
  ev("applyRegion('global')");
  assert.equal(ev('CITIES.length'), 94);
  assert.equal(ev('CABLE_PAIRS.length'), 134);
  assert.equal(ev('XIX.length'), 25);
  assert.equal(ev('TAIL.length'), 60);
  assert.equal(ev('NETS.filter(n=>!n.tail).length'), 65);
  assert.equal(ev("regionMult('sin')"), 2.5);
  assert.equal(ev("kmBetween('fra','ams')"), 364);
  assert.equal(ev('proj0(0,0)[0]'), 1000);
  assert.equal(ev('LENSES.length'), 7);
  assert.equal(ev('LANDS_LL.length'), 14);
  assert.equal(ev('Object.keys(CITY_LL).length'), 94);
  assert.equal(JSON.stringify(ev('proj0(0,0)')), '[1000,537.6]');
  assert.deepEqual(errors, []);
});

test('M1: applyRegion is idempotent (world snapshots byte-identical)', () => {
  const { ev, errors } = load();
  const snap = (label) => ev(`JSON.stringify({w:W,h:H,km:KM,
    lands:LANDS.map(l=>l.pts),decor:DECOR,
    cities:CITIES.map(c=>[c.id,c.x,c.y]),
    pairs:CABLE_PAIRS.map(p=>[p.cid,p.a,p.b,p.km]),
    nets:NETS.map(n=>[n.id,n.ix,n.pops]),
    net:Object.keys(NET).length,
    nsh:Object.keys(NSH).length,
    xix:XIX.map(x=>[x.id,x.members]),
    xixm:Object.keys(XIXM).length,
    landp:LANDP.length,allpoly:ALLPOLY.length,
    waves:WAVES,clouds:CLOUDS,region:'${label}'})`);
  ev("applyRegion('global')");
  const a = snap('a');
  ev("applyRegion('global')");
  const b = snap('b');
  assert.equal(a.replace('"region":"a"', ''), b.replace('"region":"b"', ''),
    'second applyRegion changed world state');
  assert.deepEqual(errors, []);
});

test('M1: boot rebinds through applyRegion with no errors', () => {
  const { ev, errors } = load();
  ev("boot()");
  assert.equal(ev('curRegion'), 'global');
  assert.equal(ev('CITIES.length'), 94);
  assert.equal(ev('NETS.length'), 125);
  assert.deepEqual(errors, []);
});
