// PRD Brief 13 gate: per-POP B2B promotion for NAP/hosting.
// Run: node --test tests/prd-promo.test.js
const test = require('node:test');
const assert = require('node:assert/strict');
const { load } = require('./harness');

test('nap: ad does nothing without broadband', () => {
  const { ev } = load();
  ev("beginGame('N','fra',{region:'global',role:'nap'})");
  ev('S.cash=1e9');
  ev("ACT.ad({city:'fra'})");
  assert.equal(ev('S.pops.fra.boost'), 0, 'the broadband campaign is a no-op for a NAP');
});

test('nap: promo books the sales team, the first meeting takes a few days', () => {
  const { ev } = load();
  ev("beginGame('N','fra',{region:'global',role:'nap'})");
  ev('S.cash=1e9;S.offers=[]');
  ev("ACT.promo({city:'fra'})");
  /* Paying for a campaign does not produce a contract on the spot: it books the team. The first
     meeting is guaranteed but lands three to seven days later, which is what makes the 45-day
     lead rate the thing you actually bought. */
  assert.equal(ev('S.offers.length'), 0, 'no prospect on the day you pay');
  assert.ok(ev('S.promo.fra') > ev('S.day'), 'campaign is running');
  const first = ev('S.promoFirst.fra');
  assert.ok(first > ev('S.day'), 'the first meeting is in the future');
  assert.ok(first - ev('S.day') >= 3 && first - ev('S.day') <= 7,
    'first meeting within 3-7 days, got ' + (first - ev('S.day')));
  ev('S.day=' + first + ';dayTick()');
  const deals = JSON.parse(ev("JSON.stringify(S.offers.filter(o=>o.fromPromo))"));
  assert.ok(deals.length > 0, 'the first meeting produces a prospect');
  assert.equal(deals[0].city, 'fra');
});

test('nap: campaigns are not capped — every POP can run one', () => {
  const { ev } = load();
  ev("beginGame('N','fra',{region:'global',role:'nap'})");
  ev('S.cash=1e9');
  const cities = ['ams','lon','par','nyc','mil'];
  for (const c of cities) ev(`ACT.buildPop({city:'${c}'})`);
  for (const c of ['fra',...cities]) ev(`ACT.promo({city:'${c}'})`);
  assert.equal(ev('Object.keys(S.promo).length'), 6, 'six campaigns, one per POP');
  for (const c of ['fra',...cities]) assert.ok(ev(`S.promo['${c}'] > S.day`), `${c} is running`);
});

test('nap: promo raises the spawn rate in that city', () => {
  const { ev } = load();
  ev("beginGame('N','fra',{region:'global',role:'nap'})");
  ev('S.cash=1e9;S.offers=[]');
  ev("ACT.promo({city:'fra'})");
  let inFra=0;
  for (let i=0;i<200;i++) { ev('S.offers=[]'); ev('spawnOffer()'); if (ev("S.offers.length&&S.offers[0].city==='fra'")) inFra++; }
  assert.ok(inFra > 100, `only ${inFra}/200 landed in the promoted city`);
});

test('promo: a hosting outfit can run campaigns too', () => {
  const { ev } = load();
  ev("beginGame('H','fra',{region:'global',role:'hosting'})");
  ev('S.cash=1e9;S.offers=[]');
  ev("ACT.promo({city:'fra'})");
  /* Same rule as a NAP: the campaign is booked, the first meeting follows in a few days. */
  assert.ok(ev('S.promo.fra') > ev('S.day'), 'the campaign is running');
  assert.ok(ev('S.promoFirst.fra') > ev('S.day'), 'the first meeting is scheduled');
});

test('promo: an ISP is turned away', () => {
  const { ev } = load();
  ev("beginGame('I','fra',{region:'global',role:'isp'})");
  ev('S.cash=1e9;S.offers=[]');
  ev("ACT.promo({city:'fra'})");
  assert.equal(ev('S.offers.length'), 0, 'ISPs use the broadband campaign instead');
});

test('promo: survives a save and reload', () => {
  const a = load();
  a.ev("beginGame('N','fra',{region:'global',role:'nap'})");
  a.ev('S.cash=1e9');
  a.ev("ACT.promo({city:'fra'})");
  a.ev('save()');
  const raw = a.ev("localStorage.getItem('sot-save-v1:global')");
  const b = load({ storage: { 'sot-save-v1:global': raw } });
  assert.ok(b.ev('S.promo.fra') > 0, 'the campaign is still running');
});
