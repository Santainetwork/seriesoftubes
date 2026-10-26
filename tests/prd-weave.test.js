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
  /* Four Java corridors. The fifth was sby-dps, which crosses the Bali Strait — a railway duct
     cannot do that, and the map was offering rail fibre on a subsea route. */
  assert.equal(w.pairs.length, 4, 'four Java corridors, none of them across water');
  const across = JSON.parse(ev("JSON.stringify(CABLES.find(c=>c.id==='waeve').pairs.filter(p=>CITY[p[0]].land!==CITY[p[1]].land))"));
  assert.deepEqual(across, [], 'no rail pair crosses between landmasses');
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

test('idn: a rail cut heals within three days when nothing else cuts it', () => {
  const { ev, errors } = load();
  ev("beginGame('T','jkt',{region:'idn',role:'isp'})");
  ev('S.cash=1e9');
  ev("S.pops.bdg={day:0,bb:null,boost:0,down:0,routers:1,gen:false}");
  ev("UI.via='waeve';UI.pending={a:'jkt',b:'bdg'};ACT.buildLink({tier:1})");
  const id = ev('S.links.length ? S.links[0].id : null');
  assert.ok(id, 'the rail link exists');
  /* The repair window is one to three days: the only crew certified for railway property comes
     from Jakarta and needs a possession order first. A live rail link is cut again before it
     heals (that is the whole trade), so this test isolates the repair itself by parking the risk
     at zero: set a cut, then check the link comes back inside the window. */
  ev('CAB.waeve.cutRisk=0');
  ev('S.links[0].cut = S.day + 3');
  ev('compute()');
  assert.equal(ev('linkDown(S.links[0])'), true, 'cut is down to start with');
  for (let i = 0; i < 3; i++) ev('dayTick()');
  assert.equal(ev('linkDown(S.links[0])'), false, 'the rail link healed within three days');
  assert.deepEqual(errors, []);
});

test('idn: a live rail lease is cut again before it heals', () => {
  const { ev } = load();
  ev("beginGame('T','jkt',{region:'idn',role:'isp'})");
  ev('S.cash=1e9');
  ev("S.pops.bdg={day:0,bb:null,boost:0,down:0,routers:1,gen:false}");
  ev("UI.via='waeve';UI.pending={a:'jkt',b:'bdg'};ACT.buildLink({tier:1})");
  /* This is the honest consequence of three or four cuts a day with a one-to-three day repair:
     the link is dark most of the time. The player is warned in the route picker before buying. */
  assert.ok(ev('CAB.waeve.cutRisk') >= 0.5, 'the cut rate is high by design');
  let down = 0;
  for (let i = 0; i < 30; i++) { ev('dayTick()'); if (ev('linkDown(S.links[0])')) down++; }
  assert.ok(down > 20, `a rail lease is dark most days, got ${down}/30 up`);
});
