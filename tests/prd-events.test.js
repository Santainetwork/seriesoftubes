// PRD events gate: tests/prd-events.test.js (brief 10 §2-3).
// Per-region conference calendars, event-sourced NAP/hosting deals, and the role
// registration multiplier. Global CONFS stays the untouched 16-entry invariant.
// Run: node --test tests/prd-events.test.js
const test = require('node:test');
const assert = require('node:assert/strict');
const { load } = require('./harness');

test('confs: idn has events in 720 days', () => {
  const { ev } = load();
  ev("beginGame('X','jkt',{region:'idn'})");
  const n = ev('upcomingConfs(720).length');
  assert.ok(n >= 18, `only ${n} events`);
});

test('confs: sea has events in 720 days', () => {
  const { ev } = load();
  ev("beginGame('X','jkt',{region:'sea'})");
  const n = ev('upcomingConfs(720).length');
  assert.ok(n >= 12, `only ${n} events`);
});

test('confs: every event city exists on its region map', () => {
  for (const r of ['global', 'sea', 'idn']) {
    const { ev } = load();
    ev(`beginGame('X','${r === 'global' ? 'fra' : 'jkt'}',{region:'${r}'})`);
    const bad = JSON.parse(ev(`JSON.stringify(upcomingConfs(720).filter(function(c){
      return typeof CITY[c.c]==='undefined'; }).map(function(c){return c.n;}))`));
    assert.deepEqual(bad, [], `${r}: ${bad}`);
  }
});

test('confs: global CONFS unchanged', () => {
  const { ev } = load();
  assert.equal(ev('CONFS_GLOBAL.length'), 16);
  assert.equal(ev("CONFS_GLOBAL[0].n"), 'NANOG-ish');
});

test('confs: event names are all parodies, never the real organisations', () => {
  const { ev } = load();
  const names = JSON.parse(ev("JSON.stringify(CONFS_GLOBAL.concat(CONFS_SEA,CONFS_IDN).map(c=>c.n))"));
  for (const n of names) {
    // The brief allows "APJII Conneck" and "APRICOT-ish" as parodies; the raw
    // organisation names must not appear on their own.
    assert.ok(!/^(IDNOG|APJII|APRICOT|SANOG|Kopdar)$/.test(n), `raw org name: ${n}`);
    assert.ok(!/\bIDNOG\b/.test(n), `raw IDNOG in ${n}`);
    assert.ok(!/\bKopdar\b/.test(n), `raw Kopdar in ${n}`);
  }
  assert.ok(names.includes('IDNOGG') && names.includes('Kopidarat'));
});

test('nap: an event in your POP city produces a wholesale offer', () => {
  const { ev } = load();
  ev("beginGame('X','jkt',{region:'idn',role:'nap'})");
  ev('S.cash=1e8;S.day=60');
  ev("for(const c of ['sby','bdg'])ACT.buildPop({city:c})");
  // APJII Conneck bulan 3 = hari 99, di jkt (POP awal).
  ev("S.confReg={};const cf=upcomingConfs(75).find(function(c){return c.c==='jkt';});if(cf)S.confReg[cf.key]=true");
  // Stop before the 14-day event offer expires (day 99 + 14 = 113).
  ev("for(let i=0;i<45;i++)dayTick()");
  const ev2 = JSON.parse(ev("JSON.stringify(S.offers.filter(function(o){return o.fromEvent;}))"));
  assert.ok(ev2.length > 0, 'event produced a deal');
  assert.equal(ev2[0].city, 'jkt');
  assert.deepEqual(ev2[0].reqs, ['metro']);
  assert.ok(ev2[0].exp - ev('S.day') <= 14, 'deal expires quickly');
});

test('nap: event deal needs a POP in that city', () => {
  const { ev } = load();
  ev("beginGame('X','jkt',{region:'idn',role:'nap'})");
  ev('S.cash=1e8');
  // tidak punya POP di bdg, event di bdg tidak menghasilkan deal
  ev("S.offers=[];napEventDeals({n:'Kopidarat',c:'bdg'})");
  assert.equal(ev('S.offers.length'), 0);
});

test('nap: event deals carry a 40-100% premium', () => {
  const { ev } = load();
  ev("beginGame('X','jkt',{region:'idn',role:'nap'})");
  ev("S.offers=[];for(let i=0;i<40;i++)napEventDeals({n:'Kopidarat',c:'jkt'})");
  const deals = JSON.parse(ev('JSON.stringify(S.offers)'));
  assert.equal(deals.length, 40);
  // l2 types (hyper/ai) have a zero list rate in BIZ_T and are priced per km,
  // exactly as the brief specifies; only the rate-based types show the premium.
  const rated = deals.filter((o) => ev(`BIZ_T['${o.type}'].rate`) > 0);
  assert.ok(rated.length > 0, 'at least one rate-priced deal');
  for (const o of rated) {
    const base = ev(`BIZ_T['${o.type}'].rate`);
    assert.ok(o.rate >= base * 1.4 && o.rate <= base * 2 + 1, `${o.type} ${o.rate} vs ${base}`);
  }
});

test('hosting: an event in your POP city produces a host or gpu offer at 30%', () => {
  const { ev } = load();
  ev("beginGame('X','jkt',{region:'idn',role:'hosting'})");
  ev("S.offers=[];eventDeals({n:'Kopidarat',c:'jkt'})");
  const deals = JSON.parse(ev('JSON.stringify(S.offers)'));
  assert.equal(deals.length, 1);
  assert.ok(['host', 'gpu'].includes(deals[0].type), deals[0].type);
  const base = ev(`BIZ_T['${deals[0].type}'].rate`);
  assert.equal(deals[0].rate, Math.round(base * 1.3));
  assert.equal(deals[0].fromEvent, 'Kopidarat');
});

test('rtnet: events produce no deals', () => {
  const { ev } = load();
  ev("beginGame('X','jkt',{region:'idn',role:'rtnet'})");
  ev("S.offers=[];eventDeals({n:'Kopidarat',c:'jkt'})");
  assert.equal(ev('S.offers.length'), 0);
});

test('nap: event registration costs more than an ISP badge', () => {
  const { ev } = load();
  ev("beginGame('X','jkt',{region:'idn',role:'nap'})");
  const nap = ev('confCost()');
  ev("beginGame('X','jkt',{region:'idn',role:'isp'})");
  const isp = ev('confCost()');
  assert.ok(nap > isp, `${nap} vs ${isp}`);
  assert.equal(nap, 32000);
  assert.equal(isp, 8000);
  assert.equal(ev('CONF_COST'), 8000);
});
