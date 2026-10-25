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

test('nap: promo produces a guaranteed offer', () => {
  const { ev } = load();
  ev("beginGame('N','fra',{region:'global',role:'nap'})");
  ev('S.cash=1e9;S.offers=[]');
  ev("ACT.promo({city:'fra'})");
  assert.ok(ev('S.offers.length') > 0, 'a prospect appeared');
  assert.equal(ev("S.offers[0].city"), 'fra');
  assert.equal(ev("S.offers[0].fromPromo"), true);
  assert.ok(ev('S.promo.fra') > ev('S.day'), 'campaign is running');
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
  assert.ok(ev('S.offers.length') > 0);
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
