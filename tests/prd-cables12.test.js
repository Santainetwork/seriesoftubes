// PRD Brief 12 Tahap D gate: all 66 V2 routes live on the 33-city map.
// Run: node --test tests/prd-cables12.test.js
const test = require('node:test');
const assert = require('node:assert/strict');
const { load } = require('./harness');
const fs = require('node:fs');
const V2 = JSON.parse(fs.readFileSync(__dirname + '/../SOT_IDN_CABLES_V2.json', 'utf8'));

const idn = () => {
  const { ev, errors } = load();
  ev("applyRegion('idn')");
  assert.deepEqual(errors, []);
  return ev;
};

test('idn: every V2 route is live, none dangling', () => {
  const ev = idn();
  const live = new Set(JSON.parse(ev(
    "JSON.stringify(CABLE_PAIRS.map(function(x){return [x.a,x.b].sort().join('>');}))")));
  const missing = [];
  for (const r of V2) {
    const k = [r.a, r.b].sort().join('>');
    if (!live.has(k)) missing.push(k);
  }
  assert.deepEqual(missing, [], `${missing.length} V2 routes missing`);
  assert.equal(ev("CABLE_PAIRS.filter(function(p){return !CITY[p.a]||!CITY[p.b];}).length"), 0,
    'no dangling city ids');
});

test('idn: Surabaya to Makassar has a direct cable', () => {
  const ev = idn();
  assert.equal(ev(`CABLE_PAIRS.some(function(p){
    return (p.a==='sby'&&p.b==='upg')||(p.a==='upg'&&p.b==='sby'); })`), true,
    'S-U-B Cable System lands in both (the Noctis complaint)');
});

test('idn: no duplicate pair inside one cable entry', () => {
  const ev = idn();
  const dupes = JSON.parse(ev(`JSON.stringify(CABLES.filter(function(c){
    const seen={};
    for (const p of c.pairs){const k=[p[0],p[1]].sort().join('>');
      if(seen[k])return true;seen[k]=1;}
    return false;}).map(function(c){return c.id;}))`));
  assert.deepEqual(dupes, [], `cables with internal dupes: ${dupes}`);
});

test('idn: at least 90 pairs, every city reachable', () => {
  const ev = idn();
  assert.ok(ev('CABLE_PAIRS.length') >= 90, `only ${ev('CABLE_PAIRS.length')}`);
  const iso = JSON.parse(ev(`JSON.stringify(CITIES.filter(function(c){
    var id=c.id;
    return !CABLE_PAIRS.some(function(p){return p.a===id||p.b===id;});
  }).map(function(c){return c.id;}))`));
  assert.deepEqual(iso, [], `isolated: ${iso}`);
});
