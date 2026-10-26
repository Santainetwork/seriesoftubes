// A continent gate must never ask for more continents than the map contains.
//
// The bug: SEA declared t1Continents:2, but every one of its 49 cities is reg:'AS'. regionsCount()
// is a set over the player's POPs, so it tops out at 1 on that map: the gate was unreachable by
// construction, no matter how much traffic or peering the player had. A sweep of SEA Tier 1
// candidates (8-10 POPs, big transit, up to 10 IX ports) reported "other gates FAIL: POPs on
// 2+ continents" on every single row.
//
// This is the same class as t_9ac93f36, which capped lvReg() at what the map offers. t1Club() had
// the identical hole and was not covered by that fix. IDN was safe only by luck: its rule already
// said 1.
//
// The test that would have caught it is the one below: on each region, a player who satisfies
// every OTHER gate must not be refused for a continent the map does not contain. Run against the
// unfixed code it fails on SEA with exactly ["POPs on 2+ continents"].
//
// Run: node --test tests/prd-t1regions.test.js
const test = require('node:test');
const assert = require('node:assert/strict');
const { load } = require('./harness');

const MAPS = [['global', 'fra'], ['sea', 'jkt'], ['idn', 'jkt']];

/* Build the biggest network the map allows: a POP with broadband in every city, an IX port and the
   route server at every exchange, and transit in the home city. Then report what t1Club() says.
   This is deliberately the ceiling, not a plausible run — the point is that a player who has done
   everything the map permits must not be blocked by the map itself. */
const MAXED = (region, city) => `(() => {
  S.cash=1e15;S.lvl=9;
  for(const c of CITIES) S.pops[c.id]={day:0,bb:{d:900},boost:0,down:0,routers:5,gen:false,rgen:3};
  for(const ix of [...new Set(CITIES.filter(c=>c.ix).map(c=>c.id))]){
    if(!CITY[ix])continue;
    ACT.buyIx({city:ix,tier:2,signed:true});
    ACT.rs({city:ix});
  }
  const t1=NETS.filter(n=>n.type==='t1'&&sellsTransit(n))[0];
  if(t1) ACT.buyTransit({city:${JSON.stringify(city)},net:t1.id,tier:1});
  compute();
  const club=t1Club();
  return JSON.stringify({
    cities: CITIES.length,
    mapRegions: new Set(CITIES.map(c=>c.reg)).size,
    regs: regionsCount(),
    needCont: Math.min((REGION[curRegion].rules||{}).t1Continents!=null?(REGION[curRegion].rules||{}).t1Continents:3,
                       new Set(CITIES.map(c=>c.reg)).size),
    served: Math.round(R.served),
    sessions: R.sessions,
    ok: club.ok,
    missing: club.missing
  });
})()`;

test('t1Club: no region refuses a player for a continent its map does not have', () => {
  for (const [region, city] of MAPS) {
    const { ev, errors } = load();
    ev(`beginGame('X',${JSON.stringify(city)},{region:${JSON.stringify(region)}})`);
    const m = JSON.parse(ev(MAXED(region, city)));
    /* The player is already at the map's maximum, so the continent gate must be open. Asserting
       on `missing` rather than on `needCont` is the point: this reads what the player is told. */
    assert.equal(m.regs, m.mapRegions, `${region}: the sweep must hold a POP in every region`);
    assert.equal(m.missing.some(s => /continent/i.test(s)), false,
      `${region} refused a maxed-out player for a continent: ${JSON.stringify(m.missing)} ` +
      `(map has ${m.mapRegions}, gate asked ${m.needCont})`);
    assert.equal(m.ok, true,
      `${region}: every other gate is met, so the club must be open: ${JSON.stringify(m.missing)}`);
    assert.deepEqual(errors, []);
  }
});

test('t1Club: the continent gate is capped at the map, not at the rule', () => {
  /* The rule may say 2 (or 3) on a one-continent map — a stale save, a future map, a region whose
     geography changed. t1Club() must cap it, so no data mistake can resurrect a dead gate. Prove
     it by forcing an impossible rule value at runtime and reading the refusal back. */
  for (const [region, city] of MAPS) {
    const { ev, errors } = load();
    ev(`beginGame('X',${JSON.stringify(city)},{region:${JSON.stringify(region)}})`);
    const map = ev('new Set(CITIES.map(c=>c.reg)).size');
    ev(`REGION[${JSON.stringify(region)}].rules.t1Continents=99`);
    ev(`for(const c of CITIES) S.pops[c.id]={day:0,bb:null,boost:0,down:0,routers:1,gen:false,rgen:0}`);
    const m = JSON.parse(ev('JSON.stringify(t1Club().missing)'));
    const line = m.find(s => /continent/i.test(s));
    if (map >= 99) {
      assert.ok(line, `${region}: a real 99-continent requirement must still be reported`);
    } else {
      assert.equal(line, undefined,
        `${region}: a 99-continent rule on a ${map}-continent map must be capped away, got ${line}`);
    }
    assert.deepEqual(errors, []);
  }
});

test('t1Club: the pinned continent rule never exceeds its map', () => {
  /* The rule and the map have to agree where a reader can see it. prd-m3 pins the SEA numbers;
     this pins the invariant behind them, for every region, including ones added later. Global
     deliberately states no t1Continents and takes the 3 fallback, so read the effective value. */
  const { ev, errors } = load();
  for (const [region] of MAPS) {
    ev(`ensureRegion(${JSON.stringify(region)})`);
    const r = JSON.parse(ev(`(() => {
      const reg=REGION[${JSON.stringify(region)}];
      const rule=reg.rules.t1Continents!=null?reg.rules.t1Continents:3;
      return JSON.stringify({
        cities: reg.cities.length,
        mapRegions: new Set(reg.cities.map(c=>c.reg)).size,
        stated: reg.rules.t1Continents,
        rule
      });
    })()`));
    assert.equal(typeof r.rule, 'number', `${region} must resolve a numeric continent gate`);
    assert.ok(r.rule <= r.mapRegions,
      `${region} asks for ${r.rule} continents but its ${r.cities} cities span only ${r.mapRegions}`);
  }
  assert.deepEqual(errors, []);
});

test('t1Club: SEA is one continent, and its gate now says so', () => {
  /* The specific case from the ticket, kept explicit so a future map change has to face it. */
  const { ev, errors } = load();
  ev("applyRegion('sea')");
  const regs = JSON.parse(ev("JSON.stringify([...new Set(CITIES.map(c=>c.reg))])"));
  assert.deepEqual(regs, ['AS'], 'all 49 SEA cities are in one projection region');
  assert.equal(ev("REGION.sea.rules.t1Continents"), 1, 'so the rule asks for one');
  assert.deepEqual(errors, []);
});
