// PRD topo gate: tests/prd-topo.test.js (owned by lane topo).
// Brief 4 §10 blocker tests: SEA/IDN cable coverage, per-region NETS filtering and NSH
// renormalisation, and the untouched Global map.
// Run: node --test tests/prd-topo.test.js
const test = require('node:test');
const assert = require('node:assert/strict');
const { load } = require('./harness');

const region = (id) => {
  const { ev, errors } = load();
  ev(`applyRegion('${id}')`);
  assert.deepEqual(errors, []);
  return ev;
};

// Brief 4 §10: the exact isolation predicate from the gate.
const ISOLATED = `JSON.stringify(CITIES.filter(function(c){
    var a=c.id;
    return !CITIES.some(function(d){
      if(d.id===a) return false;
      return CITY[a].land===CITY[d.id].land ||
        CABLE_PAIRS.some(function(p){return (p.a===a&&p.b===d.id)||(p.a===d.id&&p.b===a);});
    });
  }).map(function(c){return c.id;}))`;

test('SEA has at least 12 cables', () => {
  const ev = region('sea');
  assert.ok(ev('CABLE_PAIRS.length') >= 14, `only ${ev('CABLE_PAIRS.length')}`);
});

test('IDN has at least 8 cables', () => {
  const ev = region('idn');
  assert.ok(ev('CABLE_PAIRS.length') >= 8, `only ${ev('CABLE_PAIRS.length')}`);
});

test('every SEA city is connected', () => {
  const ev = region('sea');
  const iso = ev(ISOLATED);
  assert.equal(iso, '[]', `isolated: ${iso}`);
});

test('every IDN city is connected', () => {
  const ev = region('idn');
  const iso = ev(ISOLATED);
  assert.equal(iso, '[]', `isolated: ${iso}`);
});

test('the ten formerly isolated SEA cities now have a wet path', () => {
  const ev = region('sea');
  for (const c of ['bkk', 'tpe', 'rgn', 'dps', 'pnh', 'btm', 'vte', 'jay', 'bwn', 'dil']) {
    assert.ok(ev(`CABLE_PAIRS.some(p=>p.a==='${c}'||p.b==='${c}')`), `${c} has no cable`);
  }
});

test('the three formerly isolated IDN cities now have a wet path', () => {
  const ev = region('idn');
  for (const c of ['dps', 'btm', 'jay']) {
    assert.ok(ev(`CABLE_PAIRS.some(p=>p.a==='${c}'||p.b==='${c}')`), `${c} has no cable`);
  }
});

test('IDN cable set stays inside Indonesian cities', () => {
  const ev = region('idn');
  // Brief 12 stage A: IDN now carries its own SubmarineCableMap pair list, so the count is
  // no longer derived from SEA. What must hold is that every pair lands in Indonesia and that
  // the headline Jawa-Sulawesi route exists (Noctis reported it missing).
  // 32 unique routes; three of them are served by both the legacy pair list and the
  // SubmarineCableMap table, so CABLE_PAIRS legitimately carries 35 entries (parallel cables).
  assert.ok(ev('CABLE_PAIRS.length') >= 35, `only ${ev('CABLE_PAIRS.length')} pairs`);
  assert.ok(ev('new Set(CABLE_PAIRS.map(p=>[p.a,p.b].sort().join("-"))).size') >= 32, 'unique routes');
  assert.equal(ev(`CABLE_PAIRS.filter(p=>!IDN_IDS.has(p.a)||!IDN_IDS.has(p.b)).length`), 0);
  assert.equal(ev(`CABLE_PAIRS.some(p=>(p.a==='sby'&&p.b==='upg')||(p.a==='upg'&&p.b==='sby'))`), true,
    'Surabaya to Makassar must have a wet path');
  // No pair may name a city that is not on the IDN map.
  assert.equal(ev(`CABLE_PAIRS.filter(p=>!CITY[p.a]||!CITY[p.b]).length`), 0, 'no dangling city ids');
  assert.equal(ev("REGION.idn.cables.every(c=>c.pairs.every(([a,b])=>IDN_IDS.has(a)&&IDN_IDS.has(b)))"), true);
});

test('NSH sums to 1 in every region', () => {
  const ev = region('global');
  for (const r of ['global', 'sea', 'idn']) {
    ev(`applyRegion('${r}')`);
    const s = ev('Object.values(NSH).reduce((a,b)=>a+b,0)');
    assert.ok(Math.abs(s - 1) < 1e-9, `${r}: ${s}`);
  }
});

test('global NETS untouched after visiting sea', () => {
  const ev = region('global');
  ev("applyRegion('sea')");
  assert.equal(ev('NETS.length'), 131, 'NETS must not be spliced in place');
  assert.equal(ev('REGION.global.nets===NETS'), true, 'global nets still aliases NETS');
  ev("applyRegion('global')");
  assert.equal(ev('NETS.length'), 131);
  assert.equal(ev('Object.keys(NSH).length'), 131);
  assert.equal(ev('CABLE_PAIRS.length'), 134);
});

test('live network counts match the brief (40 SEA, own IDN list)', () => {
  const ev = region('sea');
  assert.equal(ev('Object.keys(NET).length'), 43);
  assert.equal(ev("Object.keys(NET).filter(k=>NET[k].type==='t1').length"), 5);
  ev("applyRegion('idn')");
  /* Brief 18 §G: the Indonesia map no longer inherits the global T1/T2 carriers — a domestic
     NAP buys from Tel-Kom, Indo-Sat and friends. CDNs and eyeball networks stay. */
  const idnNets = JSON.parse(ev('JSON.stringify(Object.keys(NET))'));
  /* Only networks with a POP in an Indonesian city are live there — the 33-city map reaches
     far more of them than the old 16-city one did, but it is still a subset. */
  assert.ok(idnNets.length >= 20, `only ${idnNets.length} networks live in IDN`);
  /* Brief 18 §G (corrected): all eleven domestic carriers are tagged Tier 2 and are the only
     ones that sell transit. No Tier 1 sells a port on the Indonesia map — the global Tier 1s
     are peering partners there, which is what the Tier 1 goal is built on. */
  const idnT1Selling = ev("Object.keys(NET).filter(k=>NET[k].type==='t1'&&sellsTransit(NET[k])).length");
  assert.equal(idnT1Selling, 0, 'no Tier 1 sells transit on the Indonesia map');
  assert.ok(ev("Object.keys(NET).filter(k=>NET[k].type==='t1').length") >= 1,
    'global Tier 1s are still present as peering partners');
  /* The global T1s that reach Jakarta are exchange members, but they are not on the transit
     list: you peer with them, you do not buy a port from them. */
  const idnTransit = JSON.parse(ev('JSON.stringify(Object.keys(NET).filter(k=>sellsTransit(NET[k])))'));
  for (const t1 of ['lvl', 'tly', 'cog', 'tat', 'ntt']) {
    assert.ok(!idnTransit.includes(t1), `${t1} must not sell transit on the Indonesia map`);
  }
  for (const live of ['tlkm', 'inds', 'xlnt', 'ionx', 'mvnx']) {
    assert.ok(idnNets.includes(live), `${live} should be live in IDN`);
  }
});

test('exchange member lists only include live networks', () => {
  const ev = region('sea');
  assert.equal(ev('Object.keys(NET).length'), 43);
  assert.equal(ev(`XIX.every(x=>x.members.every(id=>!!NET[id]))`), true);
  ev("applyRegion('idn')");
  /* Brief 18 §G: on the Indonesia map every global Tier 1 and Tier 2 is an exchange member even
     without an Indonesian POP — you reach them over the fabric. So the invariant is weaker
     here: every member must exist in NETS, not necessarily in the live NET subset. */
  assert.equal(ev(`XIX.every(x=>x.members.every(id=>NETS.some(n=>n.id===id)))`), true);
  assert.ok(ev(`XIX.some(x=>x.members.some(id=>!NET[id]))`),
    'and at least one member has no POP in the region');
});

test('SEA still has a Tier 1 that reaches all eight core cities', () => {
  const ev = region('sea');
  const core = ['jkt', 'sin', 'kul', 'bkk', 'sgn', 'mnl', 'hkg', 'tpe'];
  const deep = ev(`JSON.stringify(NETS.filter(n=>n.type==='t1'&&${JSON.stringify(core)}.every(c=>n.pops.includes(c))).map(n=>n.id))`);
  assert.notEqual(deep, '[]', `no Tier 1 reaches every core city: ${deep}`);
});

test('the 5 cities with zero PeeringDB IX keep none', () => {
  const ev = region('idn');
  for (const c of ['bjm', 'bpn', 'mdc', 'pnk', 'jay']) {
    assert.equal(ev(`ixStatic('${c}').length`), 0, `${c} must have no IX`);
  }
});

test('global baseline unchanged', () => {
  const ev = region('global');
  assert.equal(ev('CITIES.length'), 94);
  assert.equal(ev('CABLES.length'), 73);
  assert.equal(ev('CABLE_PAIRS.length'), 134);
  assert.equal(ev('NETS.length'), 131);
  assert.equal(ev('NETS.filter(n=>!n.tail).length'), 68);
});
