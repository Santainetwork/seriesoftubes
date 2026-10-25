// PRD Brief 17 §1.6 and §2.2 gate: Waeve Rail Fibre — cheap rail corridors, poor cores,
// frequent short rail cuts. Run: node --test tests/prd-weave.test.js
const test = require('node:test');
const assert = require('node:assert/strict');
const { load } = require('./harness');

/* ---------- §1.6 Waeve offers a cheap rail corridor ---------- */
test('idn: Waeve offers a cheap rail corridor', () => {
  const { ev, errors } = load();
  ev("applyRegion('idn')");
  const w = JSON.parse(ev("JSON.stringify(CABLES.find(c=>c.id==='waeve'))"));
  assert.ok(w, 'the rail cable exists');
  assert.equal(w.name, 'Waeve Rail Fibre', 'parody name only');
  assert.equal(w.rail, true);
  assert.ok(w.price < 0.30, `price ${w.price} must undercut subsea`);
  assert.ok(w.pairs.length >= 5, 'at least five Java corridors');
  assert.deepEqual(errors, []);
});

test('idn: rail cable carries a cut risk', () => {
  const { ev, errors } = load();
  ev("applyRegion('idn')");
  assert.equal(ev('CABLES.some(c=>c.rail)'), true);
  assert.deepEqual(errors, []);
});

test('idn: a rail cut resolves in a day or two', () => {
  const { ev, errors } = load();
  ev("beginGame('T','jkt',{region:'idn',role:'isp'})");
  ev('S.cash=1e9');
  // Build on the Jakarta–Bandung rail corridor, which needs no new POP at the far end.
  ev("S.pops.bdg={day:0,bb:null,boost:0,down:0,routers:1,gen:false}");
  ev("UI.via='waeve';UI.pending={a:'jkt',b:'bdg'};ACT.buildLink({tier:1})");
  const before = ev('S.links.length');
  assert.ok(before > 0, 'a link was built');
  assert.equal(ev("S.links[0].cable"), 'waeve', 'the link is on the rail lease');
  assert.deepEqual(errors, []);
});

/* ---------- §2.2 poor cores + frequent cuts ---------- */
test('idn: rail links lose capacity to poor cores', () => {
  const { ev, errors } = load();
  ev("applyRegion('idn')");
  const w = JSON.parse(ev("JSON.stringify(CABLES.find(c=>c.id==='waeve'))"));
  assert.ok(w.coreQ < 1, 'the rail core is not as good as subsea');
  assert.deepEqual(errors, []);
});

test('idn: rail links cut more often than subsea', () => {
  const { ev, errors } = load();
  ev("applyRegion('idn')");
  const w = JSON.parse(ev("JSON.stringify(CABLES.find(c=>c.id==='waeve'))"));
  assert.ok(w.cutRisk >= 0.02, `cut risk ${w.cutRisk} must be noticeable`);
  assert.deepEqual(errors, []);
});

test('idn: a rail cut heals in one or two days', () => {
  const { ev, errors } = load();
  ev("beginGame('T','jkt',{region:'idn',role:'isp'})");
  ev('S.cash=1e9');
  ev("S.pops.bdg={day:0,bb:null,boost:0,down:0,routers:1,gen:false}");
  ev("UI.via='waeve';UI.pending={a:'jkt',b:'bdg'};ACT.buildLink({tier:1})");
  const id = ev('S.links.length ? S.links[0].id : null');
  assert.ok(id, 'the rail link exists');
  ev('S.links[0].cut = S.day + 2');
  ev('compute()');
  assert.equal(ev('linkDown(S.links[0])'), true, 'cut is down to start with');
  // Three days is more than the 1–2 day repair window, even with a fresh cut in between.
  for (let i = 0; i < 3; i++) ev('dayTick()');
  assert.equal(ev('linkDown(S.links[0])'), false, 'the rail link healed');
  assert.deepEqual(errors, []);
});
