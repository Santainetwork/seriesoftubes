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

test('M3: every region is registered at load, no lazy registration', () => {
  const { ev, errors } = load();
  assert.deepEqual(JSON.parse(ev('JSON.stringify(Object.keys(REGION))')), ['global', 'sea', 'idn']);
  assert.equal(ev('REGION.sea.id'), 'sea');
  assert.equal(ev('REGION.idn.id'), 'idn');
  assert.equal(ev('typeof ensureRegion'), 'undefined', 'no lazy materialiser');
  assert.deepEqual(errors, []);
});

test('M3: picking SEA or Indonesia rebinds the map and the card is enabled', () => {
  const { ev, errors } = load();
  ev('showTitle()');
  assert.equal(ev("document.querySelector('[data-act=pickRegion][data-args*=\"sea\"]').disabled"), false);
  assert.equal(ev("document.querySelector('[data-act=pickRegion][data-args*=\"idn\"]').disabled"), false);
  ev("ACT.pickRegion({id:'sea'})");
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
  // proj0(lon,lat) = [(lon-92)/50*W, (26-lat)/35*H] — 40 px/degree on both axes.
  assert.equal(JSON.stringify(ev('proj0(92,26)')), '[0,0]');
  assert.equal(JSON.stringify(ev('proj0(142,-9)')), '[2000,1200]');
  assert.equal(ev('proj0(93,26)[0] - proj0(92,26)[0]'), 40);
  assert.equal(ev('proj0(92,25)[1] - proj0(92,26)[1]'), 1200 / 35);
  assert.equal(ev('LENSES.length'), 3);
  assert.equal(JSON.stringify(ev('LENSES.map(l=>[l.lon,l.lat])')),
    '[[106.8,-6.2],[103.8,1.3],[121,14.6]]');
});

test('M3: SEA has 20 land polygons and 32 cities', () => {
  const ev = sea();
  assert.equal(ev('LANDS_LL.length'), 20);
  assert.equal(ev('CITIES.length'), 32);
  assert.equal(ev('Object.keys(CITY).length'), 32);
  assert.equal(ev("Object.keys(CITY).filter(c=>!isFinite(CITY[c].lon)||!isFinite(CITY[c].lat)).length"), 0);
  assert.equal(ev("Object.keys(CITY).filter(c=>!CITY[c].land).length"), 0);
});

test('M3: every SEA city sits on land (32/32)', () => {
  const ev = sea();
  const atSea = JSON.parse(ev(
    'JSON.stringify(Object.keys(CITY).filter(c=>!onLand(CITY[c].x,CITY[c].y)))'));
  assert.deepEqual(atSea, [], `cities in the sea: ${atSea.join(', ')}`);
  assert.equal(ev('Object.keys(CITY).filter(c=>onLand(CITY[c].x,CITY[c].y)).length'), 32);
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

test('M3: SEA P total matches calibrated data (7845)', () => {
  const ev = sea();
  assert.equal(ev('CITIES.reduce((a,c)=>a+c.P,0)'), 7845);
});

test('M3: SEA eyeball capacity matches (~340 Gbps)', () => {
  const ev = sea();
  const eye = ev('CITIES.reduce((a,c)=>a+Math.max(8,c.P*0.03),0)');
  assert.ok(Math.abs(eye - 340) < 2, `eyeball ${eye}`);
});

test('M3: IDN has exactly 16 cities and P total 3170', () => {
  const ev = idn();
  assert.equal(ev('CITIES.length'), 16);
  assert.equal(ev('CITIES.reduce((a,c)=>a+c.P,0)'), 3170);
  const eye = ev('CITIES.reduce((a,c)=>a+Math.max(8,c.P*0.03),0)');
  assert.ok(Math.abs(eye - 156) < 2, `eyeball ${eye}`);
  const lands = [...new Set(JSON.parse(ev('JSON.stringify(CITIES.map(c=>c.land))')))].sort();
  assert.deepEqual(lands, ['bal', 'btm', 'jav', 'kal', 'pap', 'sul', 'sum']);
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
  assert.equal(JSON.stringify(ev('REGION.sea.startCities')), '["jkt","mnl","bkk","sin"]');
  assert.equal(JSON.stringify(ev('REGION.idn.startCities')), '["jkt","sby","upg"]');
  // The SEA four are the biggest POPs in the region (Hong Kong ties Manila and
  // Bangkok at 600 but is deliberately left out: the brief names these four).
  for (const c of ['jkt', 'mnl', 'bkk', 'sin']) {
    assert.ok(ev(`CITY['${c}'].P >= 450`), `${c} is a big POP`);
  }
});

test('M3: region rules and start cash match brief 3 §3–§4', () => {
  const ev = sea();
  assert.equal(JSON.stringify(ev('REGION.sea.rules')),
    '{"t1Served":400,"t1Pops":8,"t1Continents":2,"cacheCities":null,"cacheMinMul":1.2,"startCash":300000}');
  assert.equal(ev('REGION.sea.startCash'), 300000);
  assert.equal(JSON.stringify(ev('REGION.idn.rules')),
    '{"indonesianRules":true,"t1Served":250,"t1Pops":6,"t1Continents":1,"cacheCities":["jkt","sby","sin"],"cacheMinMul":1.6}');
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
  ev("applyRegion('global')");
  assert.equal(ev('W'), 2000);
  assert.equal(ev('H'), 1000);
  assert.equal(ev('CITIES.length'), 94);
  assert.equal(ev('LANDS_LL.length'), 14);
  assert.equal(ev('LENSES.length'), 7);
  assert.equal(ev('CABLE_PAIRS.length'), 134);
  assert.equal(ev('NETS.filter(n=>!n.tail).length'), 65);
  assert.equal(ev('XIX.length'), 25);
  assert.equal(ev('TAIL.length'), 60);
  assert.equal(JSON.stringify(ev('proj0(0,0)')), '[1000,537.6]');
  assert.equal(ev('wrapDx(100,1900)'), -200, 'global still wraps the short way');
  assert.equal(ev("regionMult('sin')"), 2.5);
  assert.equal(ev("kmBetween('fra','ams')"), 364);
  assert.equal(ev('Object.values(NSH).reduce((a,b)=>a+b,0)'), 1);
  const atSea = JSON.parse(ev(
    'JSON.stringify(Object.keys(CITY).filter(c=>!onLand(CITY[c].x,CITY[c].y)))'));
  assert.deepEqual(atSea, []);
});
