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
  assert.equal(ev('NETS.length'), 125, 'NETS must not be spliced in place');
  assert.equal(ev('REGION.global.nets===NETS'), true, 'global nets still aliases NETS');
  ev("applyRegion('global')");
  assert.equal(ev('NETS.length'), 125);
  assert.equal(ev('Object.keys(NSH).length'), 125);
  assert.equal(ev('CABLE_PAIRS.length'), 134);
});

test('live network counts match the brief (37 SEA, 15 IDN)', () => {
  const ev = region('sea');
  assert.equal(ev('Object.keys(NET).length'), 37);
  assert.equal(ev("Object.keys(NET).filter(k=>NET[k].type==='t1').length"), 4);
  ev("applyRegion('idn')");
  assert.equal(ev('Object.keys(NET).length'), 15);
  assert.equal(ev("Object.keys(NET).filter(k=>NET[k].type==='t1').length"), 2);
});

test('exchange member lists only include live networks', () => {
  const ev = region('sea');
  assert.equal(ev('Object.keys(NET).length'), 37);
  assert.equal(ev(`XIX.every(x=>x.members.every(id=>!!NET[id]))`), true);
  ev("applyRegion('idn')");
  assert.equal(ev(`XIX.every(x=>x.members.every(id=>!!NET[id]))`), true);
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
  assert.equal(ev('NETS.length'), 125);
  assert.equal(ev('NETS.filter(n=>!n.tail).length'), 65);
});
