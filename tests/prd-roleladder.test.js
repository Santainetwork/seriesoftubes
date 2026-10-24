// PRD Brief 6 §6 gate: role ladder (rtnet → isp → nap → isp) and per-region role overrides.
// Run: node --test tests/prd-roleladder.test.js
const test = require('node:test');
const assert = require('node:assert/strict');
const { load } = require('./harness');

/* ---------- §1 t1Club reads region rules (Lane A already landed the fix; these keep it honest) ---------- */
test('t1Club: global keeps 3 continents / 10 POPs / 1.5 Tbps', () => {
  const { ev } = load();
  ev("beginGame('X','fra',{region:'global'})");
  const m = JSON.parse(ev('JSON.stringify(t1Club().missing)'));
  assert.ok(m.some(s=>s.includes('3+ continents')));
  assert.ok(m.some(s=>s.includes('10+ POPs')));
  assert.ok(m.some(s=>s.includes('1.5 Tbps')));
});

test('t1Club: idn asks for 1 continent / 6 POPs / 250 Gbps', () => {
  const { ev } = load();
  ev("beginGame('X','jkt',{region:'idn'})");
  const m = JSON.parse(ev('JSON.stringify(t1Club().missing)'));
  assert.equal(m.some(s=>s.includes('continent')), false, 'one continent is satisfied');
  assert.ok(m.some(s=>s.includes('6+ POPs')));
  assert.ok(m.some(s=>s.includes('250 Gbps')));
});

/* ---------- §2 ladder ---------- */
test('role up: rtnet can become isp and keeps the network', () => {
  const { ev } = load();
  ev("beginGame('X','fra',{region:'global',role:'rtnet'})");
  ev("S.cash=1e6;S.day=200;S.transit=[{id:'t',city:'fra',net:'cog',tier:0,n:1,down:0}]");
  ev("ACT.buildPop({city:'ams'})");
  ev("R.served=60");
  const off = JSON.parse(ev("JSON.stringify(roleUpOffer()[0])"));
  assert.equal(off.ok, true, JSON.stringify(off.missing));
  const popsBefore = ev('Object.keys(S.pops).length');
  const cashBefore = ev('S.cash');
  ev("ACT.roleUp({to:'isp',sure:1})");
  assert.equal(ev('S.role'), 'isp');
  assert.equal(ev('Object.keys(S.pops).length'), popsBefore, 'network is kept');
  assert.equal(ev('S.transit.length'), 1, 'transit is kept');
  assert.equal(ev('ROLES.isp.bb'), true, 'now sells broadband');
  assert.equal(ev('S.cash'), cashBefore - 60000, 'the licence was paid for');
});

test('role up: blocked until every requirement is met', () => {
  const { ev } = load();
  ev("beginGame('X','fra',{region:'global',role:'rtnet'})");
  ev("S.cash=1e6;R.served=60");
  const off = JSON.parse(ev("JSON.stringify(roleUpOffer()[0])"));
  assert.equal(off.ok, false, 'still needs POPs, transit and days');
  ev("ACT.roleUp({to:'isp',sure:1})");
  assert.equal(ev('S.role'), 'rtnet', 'nothing happened');
});

test('role up: each role has at least one exit', () => {
  const { ev } = load();
  const ups = JSON.parse(ev('JSON.stringify(ROLE_UP)'));
  for (const r of ['rtnet', 'isp', 'hosting', 'nap']) {
    assert.ok(ups.some(u => u.from === r), `${r} has a way up`);
  }
});

test('role up: the licence requirement is pending, not blocking, before M5', () => {
  const { ev } = load();
  ev("beginGame('X','fra',{region:'global',role:'rtnet'})");
  ev("S.cash=1e6;S.day=200;S.transit=[{id:'t',city:'fra',net:'cog',tier:0,n:1,down:0}]");
  ev("ACT.buildPop({city:'ams'})");
  ev("R.served=60");
  const off = JSON.parse(ev("JSON.stringify(roleUpOffer()[0])"));
  assert.equal(ev('typeof S.idLic'), 'undefined', 'M5 has not shipped S.idLic');
  assert.ok(off.pending.some(p => /pending M5/.test(p)), JSON.stringify(off.pending));
  assert.equal(off.ok, true, 'no licence check is enforced yet');
});

test('role up: nap to isp is free and unlocks broadband', () => {
  const { ev } = load();
  ev("beginGame('X','fra',{region:'global',role:'nap'})");
  ev("S.cash=2e6;S.day=800");
  for (const c of ['ams', 'lon', 'par', 'mil', 'mad', 'ber', 'waw', 'vie']) ev(`ACT.buildPop({city:'${c}'})`);
  ev("R.served=2500");
  const off = JSON.parse(ev("JSON.stringify(roleUpOffer()[0])"));
  assert.equal(off.ok, true, JSON.stringify(off.missing));
  assert.equal(off.cost, 0);
  const cashBefore = ev('S.cash');
  ev("ACT.roleUp({to:'isp',sure:1})");
  assert.equal(ev('S.role'), 'isp');
  assert.equal(ev('S.cash'), cashBefore, 'the building was already yours');
  assert.equal(ev('roleDef().bb'), true);
});

test('role up: S.roleUp survives a sanitize round-trip', () => {
  const { ev } = load();
  ev("beginGame('X','fra',{region:'global',role:'rtnet'})");
  ev("S.role='isp';S.roleUp={from:'rtnet',to:'isp',day:123}");
  const s = JSON.parse(ev('JSON.stringify(sanitize(S))'));
  assert.deepEqual(s.roleUp, { from: 'rtnet', to: 'isp', day: 123 });
  ev("S.roleUp={from:'nope',to:'isp',day:1}");
  const s2 = JSON.parse(ev('JSON.stringify(sanitize(S))'));
  assert.equal(s2.roleUp, null, 'malformed records are dropped');
});

/* ---------- §3 per-region roles ---------- */
test('roles: every region has its own starting cash', () => {
  for (const [reg, exp] of [['global', { isp: 200000 }], ['sea', { isp: 300000 }], ['idn', { isp: 250000 }]]) {
    const { ev } = load();
    ev(`ensureRegion('${reg}')`);
    ev(`beginGame('X',REGION['${reg}'].startCities[0],{region:'${reg}',role:'isp'})`);
    assert.equal(ev('S.cash'), exp.isp, reg);
  }
});

test('roles: nap is cheaper in SEA and IDN than Global', () => {
  const { ev } = load();
  ev("applyRegion('global')"); const g = ev('roleDef("nap").cash');
  ev("applyRegion('sea')");    const s = ev('roleDef("nap").cash');
  ev("applyRegion('idn')");    const i = ev('roleDef("nap").cash');
  assert.ok(s < g && i < s, `${g} > ${s} > ${i}`);
});

test('roles: rtnet sells bigger DIA in Indonesia', () => {
  const { ev } = load();
  ev("beginGame('X','jkt',{region:'idn',role:'rtnet'})");
  ev("S.transit=[{id:'t',city:'jkt',net:'ntt',tier:0,n:1,down:0}]");
  const seen = JSON.parse(ev("JSON.stringify((()=>{const a=[];for(let i=0;i<400;i++){S.offers=[];spawnOffer();for(const o of S.offers)a.push(o.bw)}return [...new Set(a)]})())"));
  assert.ok(seen.some(b => b > 2), `idn rtnet should see >2G, saw ${seen}`);
});

test('roles: global role table is unchanged', () => {
  const { ev } = load();
  assert.equal(ev('ROLES.hosting.cash'), 90000);
  assert.equal(ev('ROLES.nap.cash'), 2000000);
  assert.equal(ev('ROLES.rtnet.cash'), 45000);
  assert.equal(ev('REGION.global.roles'), null);
});

test('roles: global keeps the brief-5 rtnet bandwidth cap', () => {
  const { ev } = load();
  ev("beginGame('X','fra',{region:'global',role:'rtnet'})");
  ev("S.transit=[{id:'t',city:'fra',net:'cog',tier:0,n:1,down:0}]");
  const seen = JSON.parse(ev("JSON.stringify((()=>{const a=[];for(let i=0;i<300;i++){S.offers=[];spawnOffer();for(const o of S.offers)a.push(o.bw)}return [...new Set(a)]})())"));
  assert.ok(seen.every(b => b <= 2), `global rtnet stays at 1-2G, saw ${seen}`);
});
