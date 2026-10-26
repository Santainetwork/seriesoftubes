// PRD M3 gate: tests/prd-m3.test.js (owned by lane geo).
// Calibrated SEA/IDN geography (brief 3 §2, §9), GGC scarcity (brief 2 §1.2),
// eager REGION registration, and the untouched Global map.
// Run: node --test tests/prd-m3.test.js
const test = require('node:test');
const assert = require('node:assert/strict');
const { load } = require('./harness');

const sea = () => {
  const { ev, errors } = load();
  ev("applyRegion('sea')");
  assert.deepEqual(errors, []);
  return ev;
};
const idn = () => {
  const { ev, errors } = load();
  ev("applyRegion('idn')");
  assert.deepEqual(errors, []);
  return ev;
};

test('M3: REGION materialises SEA and Indonesia on demand', () => {
  // The committed M2 gate requires a region card to stay disabled until its map ships, so the
  // registry starts Global-only and ensureRegion() builds the other two from the data above.
  const { ev, errors } = load();
  assert.deepEqual(JSON.parse(ev('JSON.stringify(Object.keys(REGION))')), ['global']);
  assert.equal(ev('REGION.sea'), undefined);
  assert.equal(ev('typeof ensureRegion'), 'function');
  ev("applyRegion('sea')");
  assert.equal(ev('REGION.sea.id'), 'sea');
  ev("applyRegion('idn')");
  assert.equal(ev('REGION.idn.id'), 'idn');
  assert.deepEqual(JSON.parse(ev('JSON.stringify(Object.keys(REGION))')), ['global', 'sea', 'idn']);
  assert.deepEqual(errors, []);
});

test('M3: picking SEA or Indonesia rebinds the map and enables the card', () => {
  const { ev, errors } = load();
  ev('showTitle()');
  assert.equal(ev("document.querySelector('[data-act=pickRegion][data-args*=\"sea\"]').disabled"), false,
    'SEA is selectable now that its map ships');
  ev("ACT.pickRegion({id:'sea'})");
  assert.equal(ev("document.querySelector('[data-act=pickRegion][data-args*=\"sea\"]').disabled"), false);
  assert.equal(ev('curRegion'), 'sea');
  assert.equal(ev('H'), 1200);
  assert.equal(ev("JSON.stringify([...document.querySelectorAll('.start')].map(b=>b.dataset.city))"),
    '["jkt","mnl","bkk","sin"]');
  ev("ACT.pickRegion({id:'idn'})");
  assert.equal(ev('curRegion'), 'idn');
  assert.equal(ev("JSON.stringify([...document.querySelectorAll('.start')].map(b=>b.dataset.city))"),
    '["jkt","sby","upg"]');
  assert.deepEqual(errors, []);
});

test('M3: SEA canvas is 2000×1200 with the documented projection', () => {
  const ev = sea();
  assert.equal(ev('W'), 2000);
  assert.equal(ev('H'), 1200);
  /* proj0(lon,lat) = [(lon-90)/66*W, (28-lat)/40*H]. The span widened twice: to 66 degrees of
     longitude so Papua's eastern islands stop spilling past the canvas (they reached x=2558 on a
     2000px map and, with wrapX off, drew a second Papua in the corner), and to 40 degrees of
     latitude so Timor and Kupang are not sliced by the bottom edge. */
  assert.equal(JSON.stringify(ev('proj0(90,28)')), '[0,0]');
  assert.equal(JSON.stringify(ev('proj0(156,-12)')), '[2000,1200]');
  // 2000px over 66 degrees of longitude, 1200px over 40 of latitude.
  assert.ok(Math.abs(ev('proj0(93,26)[0] - proj0(92,26)[0]') - 2000 / 66) < 1e-9);
  assert.ok(Math.abs(ev('proj0(92,25)[1] - proj0(92,26)[1]') - 1200 / 40) < 1e-9);
  assert.equal(ev('LENSES.length'), 3);
  assert.equal(JSON.stringify(ev('LENSES.map(l=>[l.lon,l.lat])')),
    '[[106.8,-6.2],[103.8,1.3],[121,14.6]]');
});

test('M3: SEA has a real coastline and 49 cities', () => {
  const ev = sea();
  /* The coastline used to be 25 hand-drawn rings. It is now Natural Earth 1:50m, which gives 158
     rings and 3,600+ points for this map, so the count is a floor rather than a literal: what
     matters is that the table is real and the cities are all on it. */
  assert.ok(ev('LANDS_LL.length') >= 100, 'a real coastline, got ' + ev('LANDS_LL.length'));
  assert.ok(ev('LANDS_LL.reduce((a,l)=>a+l.ll.length,0)') >= 2000, 'enough detail to read');
  assert.equal(ev('CITIES.length'), 49);
  assert.equal(ev('Object.keys(CITY).length'), 49);
  assert.equal(ev("Object.keys(CITY).filter(c=>!isFinite(CITY[c].lon)||!isFinite(CITY[c].lat)).length"), 0);
  assert.equal(ev("Object.keys(CITY).filter(c=>!CITY[c].land).length"), 0);
});

test('M3: every SEA city sits on land (49/49)', () => {
  const ev = sea();
  const atSea = JSON.parse(ev(
    'JSON.stringify(Object.keys(CITY).filter(c=>!onLand(CITY[c].x,CITY[c].y)))'));
  assert.deepEqual(atSea, [], `cities in the sea: ${atSea.join(', ')}`);
  assert.equal(ev('Object.keys(CITY).filter(c=>onLand(CITY[c].x,CITY[c].y)).length'), 49);
});

test('M3: every SEA city projects inside the canvas', () => {
  const ev = sea();
  const bad = JSON.parse(ev(
    'JSON.stringify(Object.keys(CITY).filter(c=>CITY[c].x<0||CITY[c].x>W||CITY[c].y<0||CITY[c].y>H))'));
  assert.deepEqual(bad, [], `cities outside the canvas: ${bad.join(', ')}`);
});

test('M3: no antimeridian wrap in SEA', () => {
  const ev = sea();
  assert.equal(ev('wrapDx(100,1900)'), 1800, 'wrapDx is a plain difference');
  assert.deepEqual(JSON.parse(ev('JSON.stringify(visibleKs())')), [0], 'one map copy only');
  assert.equal(ev('REGION.sea.wrapX'), false);
  ev('cam.x=2500;wrapCam()');
  assert.equal(ev('cam.x'), 2000);
  ev('cam.x=-50;wrapCam()');
  assert.equal(ev('cam.x'), 0);
});

test('M3: SEA P total matches calibrated data (8252 = 7845 + 407)', () => {
  const ev = sea();
  assert.equal(ev('CITIES.reduce((a,c)=>a+c.P,0)'), 8252);
});

test('M3: SEA eyeball capacity matches (~476 Gbps = 340 + 136)', () => {
  const ev = sea();
  const eye = ev('CITIES.reduce((a,c)=>a+Math.max(8,c.P*0.03),0)');
  assert.ok(Math.abs(eye - 476) < 2, `eyeball ${eye}`);
});

test('M3: IDN has 34 cities (33 Indonesian plus Singapore) and P total 4027', () => {
  const ev = idn();
  assert.equal(ev('CITIES.length'), 34);
  assert.equal(ev('CITIES.reduce((a,c)=>a+c.P,0)'), 4027);
  const eye = ev('CITIES.reduce((a,c)=>a+Math.max(8,c.P*0.03),0)');
  /* 33 Indonesian cities start at 292 Gbps; Singapore adds its own 8 Gbps of starting broadband. */
  assert.ok(Math.abs(eye - 305) < 3, `eyeball ${eye}`);
  const lands = [...new Set(JSON.parse(ev('JSON.stringify(CITIES.map(c=>c.land))')))].sort();
  assert.deepEqual(lands, ['bal', 'btm', 'jav', 'kal', 'mlk', 'ntb', 'ntt', 'pap', 'papw', 'sg', 'sul', 'sum']);
});

test('M3: bwn is Brunei, not Kalimantan', () => {
  const ev = sea();
  assert.equal(ev("CITY['bwn'].land"), 'brn');
  assert.equal(ev("isSub('bpn','bwn')"), true, 'Balikpapan–Brunei is subsea');
});

test('M3: dil is Timor-Leste', () => {
  const ev = sea();
  assert.equal(ev("CITY['dil'].land"), 'tls');
  assert.equal(ev("isSub('dil','upg')"), true, 'Dili–Makassar is subsea');
});

test('M3: Penang and KL are the same landmass', () => {
  const ev = sea();
  assert.equal(ev("CITY['pen'].land"), 'mla');
  assert.equal(ev("isSub('pen','kul')"), false, 'Penang–KL is overland');
});

test('M3: Singapore is its own landmass', () => {
  const ev = sea();
  assert.equal(ev("CITY['sin'].land"), 'sg');
  assert.equal(ev("isSub('sin','kul')"), true, 'SG–KL is subsea');
});

test('M3: SEA land masses are not glued together', () => {
  const ev = sea();
  assert.equal(ev("isSub('sin','bkk')"), true, 'Singapore–Bangkok is subsea');
  assert.equal(ev("isSub('jkt','sby')"), false, 'Jakarta–Surabaya is overland');
  assert.equal(ev("isSub('sby','dps')"), true, 'Surabaya–Denpasar is subsea');
  assert.equal(ev("isSub('kul','sin')"), true, 'KL–Singapore is subsea (causeway notwithstanding)');
  assert.equal(ev("isSub('mdn','plm')"), false, 'Medan–Palembang is overland');
  assert.equal(ev("isSub('upg','mdc')"), false, 'Makassar–Manado is overland');
});

test('M3: Manila has a real IX (GetaFIX)', () => {
  const ev = sea();
  assert.equal(ev("CITY.mnl.ix"), 'GetaFIX');
  assert.ok(ev("CITY.mnl.ix.length") > 0, 'Manila has a peering point');
  assert.equal(ev("ixStatic('mnl').includes('mnl')"), true);
});

test('M3: SEA startCities are the four biggest POPs', () => {
  const ev = sea();
  ev("applyRegion('idn')"); // materialise idn too, then read both entries
  assert.equal(JSON.stringify(ev('REGION.sea.startCities')), '["jkt","mnl","bkk","sin"]');
  assert.equal(JSON.stringify(ev('REGION.idn.startCities')), '["jkt","sby","upg"]');
  // The SEA four are the biggest POPs in the region (Hong Kong ties Manila and
  // Bangkok at 600 but is deliberately left out: the brief names these four).
  // Read REGION.sea.cities: the live CITY map now holds IDN's 16 cities.
  for (const c of ['jkt', 'mnl', 'bkk', 'sin']) {
    assert.ok(ev(`REGION.sea.cities.find(x=>x.id==='${c}').P >= 450`), `${c} is a big POP`);
  }
});

test('M3: region rules and start cash match brief 3 §3–§4', () => {
  const ev = sea();
  ev("applyRegion('idn')");
  /* Brief 18 §F added eyeMul/eyeBoost to the rules, so the pinned shape is asserted field by
     field instead of byte for byte — the contract is the values, not the key order. */
  const seaRules = JSON.parse(ev('JSON.stringify(REGION.sea.rules)'));
  /* Brief 19: a sixth Tier 1 lifts SEA's bar from 400 to 480 Gbps (400 × 6/5). */
  assert.equal(seaRules.t1Served, 480);
  assert.equal(seaRules.t1Pops, 8);
  /* Brief 3 §6.9 recommended 2, on the assumption the map kept Perth, Sydney and Darwin
     (reg:'OC'). The shipped SEA map never carried them — all 49 cities are reg:'AS' — and the
     brief said the number must become 1 if they were left out. It was pinned at 2 anyway, so
     t1Club() asked for a second continent no player could reach. */
  assert.equal(seaRules.t1Continents, 1);
  assert.equal(ev("new Set(REGION.sea.cities.map(c=>c.reg)).size"), 1,
    'SEA is one continent, so its Tier 1 continent gate must be one');
  assert.equal(seaRules.cacheCities, null);
  assert.equal(seaRules.cacheMinMul, 1.2);
  assert.equal(seaRules.startCash, 300000);
  assert.ok(seaRules.eyeMul > 1, 'the eyeball ceiling is lifted above P');
  assert.equal(ev('REGION.sea.startCash'), 300000);
  const idnRules = JSON.parse(ev('JSON.stringify(REGION.idn.rules)'));
  assert.equal(idnRules.indonesianRules, true);
  assert.equal(idnRules.t1Served, 250);
  assert.equal(idnRules.t1Pops, 6);
  assert.equal(idnRules.t1Continents, 1);
  assert.deepEqual(idnRules.cacheCities, ['jkt', 'sby', 'btm']);
  assert.equal(idnRules.cacheMinMul, 1.6);
  assert.ok(idnRules.eyeMul > seaRules.eyeMul, 'Indonesia carries more eyeballs than SEA');
  assert.ok(idnRules.eyeBoost.jkt > idnRules.eyeBoost.sby, 'Jakarta outweighs Surabaya');
  /* Brief 8 §2.1: Singapore unlock lives on the IDN rules (pops/served/apjii/days + USD cost). */
  assert.equal(idnRules.unlock.sin.req.pops, 8);
  assert.equal(idnRules.unlock.sin.req.served, 120);
  assert.equal(idnRules.unlock.sin.req.apjii, true);
  assert.equal(idnRules.unlock.sin.req.days, 365);
  assert.equal(idnRules.unlock.sin.cost, 250000);
  assert.equal(ev('REGION.idn.startCash'), 250000);
});

test('M3: region start cash reaches a new game', () => {
  const { ev, errors } = load();
  ev("beginGame('Sea Net','jkt',{region:'sea'})");
  assert.equal(ev('curRegion'), 'sea');
  assert.equal(ev('S.cash'), 300000);
  ev("beginGame('Idn Net','jkt',{region:'idn'})");
  assert.equal(ev('curRegion'), 'idn');
  assert.equal(ev('S.cash'), 250000);
  assert.deepEqual(errors, []);
});

test('M3: idn: GGC only deploys in cacheCities', () => {
  const { ev, errors } = load();
  ev("applyRegion('idn');beginGame('X','jkt',{region:'idn'})");
  ev("S.pops['dps']={day:0,bb:null,boost:0,down:0,routers:1,gen:false};S.cash=1e9");
  ev("ACT.cache({city:'dps',net:'ggl'})");
  assert.equal(ev('S.caches.length'), 0);
  assert.match(ev("document.getElementById('toasts').textContent"), /not built in Denpasar/);
  assert.deepEqual(errors, []);
});

test('M3: idn: cache threshold is multiplied (Goggle 15 → 24)', () => {
  const { ev, errors } = load();
  ev("applyRegion('idn');beginGame('X','jkt',{region:'idn'});S.cash=1e9");
  ev("R.demTo.ggl=23;ACT.cache({city:'jkt',net:'ggl'})");
  assert.equal(ev('S.caches.length'), 0, '23 Gbps is not enough at 1.6×');
  assert.match(ev("document.getElementById('toasts').textContent"), /24\+ Gbps/);
  ev("R.demTo.ggl=24;ACT.cache({city:'jkt',net:'ggl'})");
  assert.equal(ev('S.caches.length'), 1, '24 Gbps clears the multiplied threshold');
  assert.deepEqual(errors, []);
});

test('M3: sea keeps the global cache behaviour (all cities, 1.2×)', () => {
  const { ev, errors } = load();
  ev("applyRegion('sea');beginGame('X','jkt',{region:'sea'});S.cash=1e9");
  ev("S.pops['dps']={day:0,bb:null,boost:0,down:0,routers:1,gen:false};R.demTo.ggl=18;ACT.cache({city:'dps',net:'ggl'})");
  assert.equal(ev('S.caches.length'), 1, 'SEA allows a cache in any POP');
  assert.deepEqual(errors, []);
});

test('M3: NSH sums to 1 after a SEA and an IDN rebind', () => {
  const ev = sea();
  const sum = ev('Object.values(NSH).reduce((a,b)=>a+b,0)');
  assert.ok(Math.abs(sum - 1) < 1e-9, `SEA NSH sum ${sum}`);
  ev("applyRegion('idn')");
  const sum2 = ev('Object.values(NSH).reduce((a,b)=>a+b,0)');
  assert.ok(Math.abs(sum2 - 1) < 1e-9, `IDN NSH sum ${sum2}`);
});

test('M3: switching back to global restores the untouched world', () => {
  const ev = sea();
  /* Capture the global tables before visiting SEA, then assert they come back intact. The counts
     themselves grow with upstream, so pinning literals here means every map addition breaks a
     test that has nothing to do with map additions. */
  ev("applyRegion('global')");
  const gCities = ev('CITIES.length'), gCables = ev('CABLE_PAIRS.length');
  ev("applyRegion('sea')");
  ev("applyRegion('global')");
  assert.equal(ev('W'), 2000);
  assert.equal(ev('H'), 1000);
  /* Counts move as upstream grows the map; the invariant is that switching back restores the
     global tables rather than leaving the SEA ones in place. So the check is against the values
     captured before the switch, not against numbers baked in when this test was written. */
  assert.equal(ev('CITIES.length'), gCities);
  assert.equal(ev('LANDS_LL.length'), 14);
  assert.equal(ev('LENSES.length'), 7);
  assert.equal(ev('CABLE_PAIRS.length'), gCables);
  assert.ok(ev('NETS.filter(n=>!n.tail).length') >= 68, 'the global network list is back');
  assert.ok(ev('XIX.length') >= 25, 'the global exchange list is back');
  assert.equal(ev('TAIL.length'), 60);
  assert.equal(ev('CITIES.length') > 49, true, 'not the SEA city table');
  assert.equal(JSON.stringify(ev('proj0(0,0)')), '[1000,537.6]');
  assert.equal(ev('wrapDx(100,1900)'), -200, 'global still wraps the short way');
  assert.equal(ev("regionMult('sin')"), 2.5);
  assert.equal(ev("kmBetween('fra','ams')"), 364);
  /* NSH is normalised to 1; floating point leaves it a hair under. */
  assert.ok(Math.abs(ev('Object.values(NSH).reduce((a,b)=>a+b,0)') - 1) < 1e-9, 'NSH sums to 1');
  const atSea = JSON.parse(ev(
    'JSON.stringify(Object.keys(CITY).filter(c=>!onLand(CITY[c].x,CITY[c].y)))'));
  assert.deepEqual(atSea, []);
});
