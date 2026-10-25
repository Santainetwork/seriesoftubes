// PRD Brief 7 §1 and §4 gate: IDN cacheCities bug + NAP job rate/minPops.
// Run: node --test tests/prd-brief7a.test.js
const test = require('node:test');
const assert = require('node:assert/strict');
const { load } = require('./harness');

/* ---------- §1 cacheCities ---------- */
test('idn: every cacheCity exists on the map', () => {
  const { ev, errors } = load();
  ev("applyRegion('idn')");
  const cc = JSON.parse(ev('JSON.stringify(REGION.idn.rules.cacheCities)'));
  assert.deepEqual(cc, ['jkt', 'sby', 'btm'], 'sin is not an IDN city; btm is');
  for (const c of cc) assert.equal(ev(`typeof CITY['${c}']`), 'object', `${c} must exist`);
  assert.deepEqual(errors, []);
});

/* ---------- §4 NAP job rate ---------- */
test('nap: first offer arrives within 20 days at 3 POPs', () => {
  const { ev, errors } = load();
  ev("beginGame('N','fra',{region:'global',role:'nap'})");
  ev('S.cash=1e9');
  ev("for(const c of ['ams','lon'])ACT.buildPop({city:c})");
  assert.equal(ev('Object.keys(S.pops).length'), 3, 'three POPs, NAP minPops is 3');

  let day = 0;
  for (; day < 40; day++) {
    ev('dayTick()');
    if (ev('S.offers.length') > 0) break;
  }
  assert.ok(day < 20, `first offer on day ${day}`);
  assert.deepEqual(errors, []);
});

test('nap: 200 days yields at least 8 offers (offersSeen, not S.offers.length)', () => {
  const { ev, errors } = load();
  ev("beginGame('N','fra',{region:'global',role:'nap'})");
  ev('S.cash=1e9');
  ev("for(const c of ['ams','lon'])ACT.buildPop({city:c})");

  for (let i = 0; i < 200; i++) ev('dayTick()');
  // Offers expire (exp), so the live list is not a count. stats.offersSeen is monotonic.
  const seen = ev('S.stats.offersSeen');
  assert.ok(seen >= 8, `only ${seen} offers seen in 200 days`);
  assert.deepEqual(errors, []);
});

/* ---------- §4.1c small jobs below minPops ---------- */
test('nap: below minPops only small ISP jobs appear, never hyperscaler work', () => {
  const { ev, errors } = load();
  ev("beginGame('N','fra',{region:'global',role:'nap'})");
  ev('S.cash=1e9');
  // Home POP only: 1 < minPops 3.
  const seen = JSON.parse(ev(`JSON.stringify((()=>{
    const a=[];
    for(let i=0;i<300;i++){S.offers=[];spawnOffer();for(const o of S.offers)a.push([o.type,o.bw]);}
    return a;
  })())`));
  assert.ok(seen.length > 0, 'the NAP still gets jobs below its POP threshold');
  for (const [t, bw] of seen) {
    assert.equal(t, 'isp', 'only downstream ISP work before minPops');
    assert.equal(bw, 100, 'and only the smallest ISP scale');
  }
  assert.equal(ev('roleBlockOffers()'), false, 'NAP is not blocked outright');
  assert.deepEqual(errors, []);
});

test('roles: NAP minPops is 3 global / 3 sea / 2 idn', () => {
  const { ev } = load();
  assert.equal(ev('ROLES.nap.minPops'), 3, 'global');
  ev("applyRegion('sea')");
  assert.equal(ev('roleDef("nap").minPops'), 3, 'sea');
  ev("applyRegion('idn')");
  assert.equal(ev('roleDef("nap").minPops'), 2, 'idn');
});
