// Brief 19 item 4: Korea's sender-pays market, Sparkly Seabone as a sixth Tier 1, and the
// per-region Tier 1 club thresholds that a bigger T1 count has to pay for.
// Run: node --test tests/prd-t1six.test.js
const test = require('node:test');
const assert = require('node:assert/strict');
const { load } = require('./harness');

test('Korea: sender pays. Seoul transit is four times the usual price', () => {
  const { ev, errors } = load();
  ev("ACT.start({});S.cash=1e9;S.lvl=4;for(const g of GOALS)S.done[g.id]=0");
  ev("ACT.buildPop({city:'icn'});ACT.buildPop({city:'sin'})");
  assert.equal(ev("regionMult('icn')"), 4, 'Seoul is priced at the Korea multiplier');
  assert.ok(ev("regionMult('icn')>regionMult('sin')"), 'and more than the rest of Asia');
  assert.equal(ev("krCity('icn')"), true);
  assert.equal(ev("krCity('sin')"), false);
  assert.deepEqual(errors, []);
});

test('Korea: all three incumbents are paid-only and quote the sender-pays bill', () => {
  const { ev, errors } = load();
  ev("ACT.start({});S.cash=1e9;S.lvl=4;for(const g of GOALS)S.done[g.id]=0;ACT.buildPop({city:'icn'})");
  for (const n of ['ktt', 'skb', 'lgu']) {
    assert.equal(ev(`NET.${n}.pol`), 'paid', `${n} is paid peering`);
    assert.ok(ev(`NET.${n}.perG > 0`), `${n} bills per gigabit`);
    const why = ev(`peerOk('${n}','ix','icn').why`);
    assert.match(why, /Sender pays/, `${n}: ${why}`);
    assert.match(why, /per Gbps/, 'the per-gigabit rate is quoted');
  }
  assert.deepEqual(errors, []);
});

test('Korea: a sender-pays PNI bills port + fee + per-gigabit, and flows traffic', () => {
  const { ev, errors } = load();
  ev("ACT.start({});S.cash=1e9;S.lvl=4;for(const g of GOALS)S.done[g.id]=0;ACT.buildPop({city:'icn'})");
  ev("S.pops.icn.bb={d:400};ACT.buyTransit({city:'icn',net:'ntt',tier:1});ACT.pni({city:'icn',net:'ktt',tier:1});compute()");
  const used = ev('R.usePni[S.pni[0].id]||0');
  assert.ok(used > 0, 'traffic flows over the Kay-Tea PNI');
  assert.equal(
    ev('R.cost.pni'),
    ev(`PORT[1].pni+NET.ktt.paidFee+Math.round(NET.ktt.perG*${used})`),
    'billed per gigabit sent on top of port and fee'
  );
  assert.deepEqual(errors, []);
});

test('Korea: the Sender Pays badge needs all three paid PNIs', () => {
  const { ev, errors } = load();
  ev("ACT.start({});S.cash=1e9;S.lvl=4;for(const g of GOALS)S.done[g.id]=0;ACT.buildPop({city:'icn'})");
  const badge = `BADGES.find(b=>b.id==='sender')`;
  assert.ok(ev(`!!${badge}`), 'the badge exists');
  assert.equal(ev(`${badge}.ok()`), false, 'nothing earned yet');
  ev("S.pni.push({id:'a',city:'icn',net:'ktt',tier:1},{id:'b',city:'icn',net:'skb',tier:1})");
  assert.equal(ev(`${badge}.ok()`), false, 'two of three is not enough');
  ev("S.pni.push({id:'c',city:'icn',net:'lgu',tier:1})");
  assert.equal(ev(`${badge}.ok()`), true, 'all three Korean incumbents');
  assert.deepEqual(errors, []);
});

test('Sparkly Seabone is a Tier 1, and new games must peer with all six', () => {
  const { ev, errors } = load();
  ev("ACT.start({})");
  assert.equal(ev('NET.skl.type'), 't1');
  assert.equal(ev('NET.skl.pol'), 'restrictive', 'Tier 1s only peer over PNIs');
  assert.ok(ev("NET.skl.pops.includes('nyc')&&NET.skl.pops.includes('sao')&&NET.skl.pops.includes('pmo')"),
    'reaches the Americas and the Mediterranean');
  assert.equal(ev('t1Need().length'), 6, 'new games need all six');
  assert.equal(ev('NETS.filter(n=>n.type===\'t1\').length'), 6);
  ev('delete S.t1v');
  assert.equal(ev('t1Need().length'), 5, 'older saves keep the five they were playing for');
  assert.deepEqual(errors, []);
});

test('t1Club thresholds rise with the sixth Tier 1, per region', () => {
  const { ev, errors } = load();
  /* Global: five T1s at 1.5 Tbps becomes six at 1.8 Tbps (1500 × 6/5). */
  ev("beginGame('X','fra',{region:'global'})");
  assert.equal(ev('REGION.global.rules.t1Served'), 1800);
  let m = JSON.parse(ev('JSON.stringify(t1Club().missing)'));
  assert.ok(m.some(s => s.includes('1.8 Tbps')), `global: ${JSON.stringify(m)}`);
  assert.ok(m.some(s => s.includes('10+ POPs')));
  assert.ok(m.some(s => s.includes('3+ continents')));

  /* SEA: five live T1s, so 400 becomes 480 Gbps. */
  ev("applyRegion('sea')");
  assert.equal(ev('REGION.sea.rules.t1Served'), 480);
  ev("beginGame('X','jkt',{region:'sea'})");
  m = JSON.parse(ev('JSON.stringify(t1Club().missing)'));
  assert.ok(m.some(s => s.includes('480 Gbps')), `sea: ${JSON.stringify(m)}`);
  assert.ok(m.some(s => s.includes('8+ POPs')));
  /* SEA is one continent (all 49 cities reg:'AS'), so a 2-continent gate here is one no player
     could ever clear. The rule now says 1 and t1Club() caps the gate at the map regardless. */
  assert.equal(m.some(s => s.includes('continent')), false,
    `sea has one continent and a fresh player already meets it: ${JSON.stringify(m)}`);

  /* Indonesia sells transit from its own five domestic T1s; Sparkly is not live there. */
  ev("applyRegion('idn')");
  assert.equal(ev('REGION.idn.rules.t1Served'), 250);
  ev("beginGame('X','jkt',{region:'idn'})");
  m = JSON.parse(ev('JSON.stringify(t1Club().missing)'));
  assert.ok(m.some(s => s.includes('250 Gbps')), `idn: ${JSON.stringify(m)}`);
  assert.ok(m.some(s => s.includes('6+ POPs')));
  assert.equal(m.some(s => s.includes('continent')), false, 'one continent is satisfied');
  assert.deepEqual(errors, []);
});

test('the sixth Tier 1 is live where it has POPs and never sells transit', () => {
  const { ev, errors } = load();
  ev("applyRegion('global')");
  assert.ok(ev("!!NET.skl"), 'Sparkly is live on the global map');
  assert.ok(ev("NET.skl.pops.every(c=>!!CITY[c])"), 'every POP id resolves to a city');
  ev("applyRegion('sea')");
  assert.ok(ev("!!NET.skl"), 'Sparkly reaches Southeast Asia');
  assert.equal(ev('t1Need().length'), 5, 'SEA carries five live Tier 1s');
  assert.deepEqual(errors, []);
});
