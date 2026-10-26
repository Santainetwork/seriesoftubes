// PRD Brief 5 gate: roles rework (starting cash, soft POP cap, per-role goals, win screen).
// Run: node --test tests/prd-roles5.test.js
const test = require('node:test');
const assert = require('node:assert/strict');
const { load } = require('./harness');

test('role: soft cap never blocks a POP', () => {
  for (const role of ['hosting', 'rtnet', 'nap', 'isp']) {
    const { ev } = load();
    ev(`beginGame('X','fra',{region:'global',role:'${role}'})`);
    ev('S.cash=1e7');
    for (const c of ['fra', 'ams', 'lon', 'par', 'mil', 'mad']) ev(`ACT.buildPop({city:'${c}'})`);
    assert.equal(ev('Object.keys(S.pops).length'), 6, `${role} can reach 6 POPs`);
  }
});

test('role: over-cap POPs cost more', () => {
  const { ev } = load();
  ev("beginGame('X','fra',{region:'global',role:'hosting'})"); // cap 3
  ev('S.cash=1e7');
  assert.equal(ev('popOverMul()'), 1);
  for (const c of ['ams', 'lon']) ev(`ACT.buildPop({city:'${c}'})`);
  assert.ok(ev('popOverMul()') > 1, 'fourth POP costs more');
});

test('role: soft cap also prices the POP a link would create', () => {
  const { ev } = load();
  ev("beginGame('X','fra',{region:'global',role:'hosting'})");
  ev('S.cash=1e7');
  for (const c of ['ams', 'lon']) ev(`ACT.buildPop({city:'${c}'})`);
  const before = ev('S.cash');
  ev("UI.pending={a:'fra',b:'par'};ACT.buildLink({tier:0})");
  assert.equal(ev('Object.keys(S.pops).length'), 4, 'the link is allowed to add the POP');
  assert.ok(ev('S.cash') < before - 20000, 'the new POP was charged over list price');
});

test('role: starting cash funds the role footprint', () => {
  const { ev } = load();
  assert.equal(ev('ROLES.hosting.cash'), 90000);
  assert.equal(ev('ROLES.rtnet.cash'), 45000);
  assert.equal(ev('ROLES.nap.cash'), 2000000);
  assert.equal(ev('POP_COST'), 20000, 'POP_COST is untouched');
  ev("beginGame('X','fra',{region:'global',role:'rtnet'})");
  assert.equal(ev('S.cash'), 45000);
  ev("ACT.buildPop({city:'ams'})");
  assert.equal(ev('Object.keys(S.pops).length'), 2, 'rtnet can afford its second POP');
});

test('goals: every role has a reachable first goal', () => {
  for (const role of ['hosting', 'nap', 'isp', 'rtnet']) {
    const { ev } = load();
    ev(`beginGame('X','fra',{region:'global',role:'${role}'})`);
    const ids = JSON.parse(ev('JSON.stringify(goalsFor().map(function(g){return g.id;}))'));
    assert.ok(ids.length >= 5, `${role} has at least 5 goals`);
  }
});

test('goals: isp keeps every general goal plus its ladder', () => {
  const { ev } = load();
  ev("beginGame('X','fra',{region:'global',role:'isp'})");
  /* Nineteen, not eighteen: upstream added the Tier-1 goal (`t1`) to the general set. The number
     is derived from GOALS rather than hard-coded so the next upstream addition does not break
     this test for no reason. */
  const general = ev("GOALS.filter(g=>!g.by||g.by.includes('isp')).length");
  assert.equal(ev('goalsFor().length'), general);
  assert.ok(ev('GOALS.length') > 19, 'the other roles keep their own goals in the master list');
  assert.equal(ev("GOALS.filter(g=>g.win).length"), 4, 'one win goal per role');
});

test('goals: hosting never sees the broadband goal', () => {
  const { ev } = load();
  ev("beginGame('X','fra',{region:'global',role:'hosting'})");
  assert.equal(ev("goalsFor().some(function(g){return g.id==='bb';})"), false);
});

test('goals: each non-ISP role gets its own ladder and one winning goal', () => {
  const { ev } = load();
  for (const [role, prefix] of [['hosting', 'h'], ['nap', 'n'], ['rtnet', 'r']]) {
    ev(`beginGame('X','fra',{region:'global',role:'${role}'})`);
    const ids = JSON.parse(ev('JSON.stringify(goalsFor().map(function(g){return g.id;}))'));
    for (let i = 1; i <= 4; i++) assert.ok(ids.includes(prefix + i), `${role} has ${prefix}${i}`);
    const wins = JSON.parse(ev('JSON.stringify(goalsFor().filter(function(g){return g.win;}).map(function(g){return g.id;}))'));
    assert.deepEqual(wins, [prefix + '4'], `${role} has exactly one win goal`);
  }
  // No role may see another role's exclusive goals.
  ev("beginGame('X','fra',{region:'global',role:'isp'})");
  assert.equal(ev("goalsFor().some(function(g){return ['h1','h4','n1','n4','r1','r4'].includes(g.id);})"), false);
});

test('goals: checkGoals only completes goals the role can see', () => {
  const { ev } = load();
  ev("beginGame('X','fra',{region:'global',role:'hosting'})");
  // bb would be satisfied by broadband, which hosting cannot even buy; force the state anyway.
  ev("S.pops.fra.bb={d:10};S.cash=0");
  ev('checkGoals()');
  assert.equal(ev("S.done.bb"), undefined, 'bb is not completed for hosting');
  // The same pass does complete a hosting goal once its conditions hold.
  ev("S.pops.ams={day:0,bb:null,boost:0,down:0,routers:1,gen:false};S.pops.lon={day:0,bb:null,boost:0,down:0,routers:1,gen:false,site2:'b'}");
  ev('checkGoals()');
  assert.ok(ev('S.done.h1') !== undefined, 'h1 completes for hosting');
});

test('goals: renderLeft shows the role goal count, not 18', () => {
  const { ev } = load();
  ev("beginGame('X','fra',{region:'global',role:'hosting'})");
  ev('renderLeft()');
  const txt = ev("document.getElementById('leftTabs').textContent");
  assert.ok(txt.includes('/16'), `hosting shows its own 16 goals, got: ${txt}`);
  ev("beginGame('X','fra',{region:'global',role:'isp'})");
  ev('renderLeft()');
  assert.ok(ev("document.getElementById('leftTabs').textContent").includes('/19'));
});

test('win: the win screen names the role, not Tier 1', () => {
  const { ev } = load();
  for (const [role, label] of [['isp', 'ISP'], ['hosting', 'Hosting'], ['nap', 'NAP'], ['rtnet', 'RT/RW net']]) {
    ev(`beginGame('X','fra',{region:'global',role:'${role}'})`);
    ev('showWin()');
    const txt = ev("document.getElementById('modalCard').textContent");
    assert.ok(txt.includes(label), `${role} heading says ${label}`);
    if (role !== 'isp') assert.equal(txt.includes('Tier 1'), false, `${role} does not claim Tier 1`);
  }
});
