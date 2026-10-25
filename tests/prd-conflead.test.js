// PRD Brief 16 (koreksi) gate: attending a conference always produces one lead.
// Run: node --test tests/prd-conflead.test.js
const test = require('node:test');
const assert = require('node:assert/strict');
const { load } = require('./harness');

test('confs: attending always yields a lead, POP or not', () => {
  for (const city of ['fra', 'ams']) {           // fra = punya POP, ams = tidak
    const { ev } = load();
    ev("beginGame('N','fra',{region:'global',role:'nap'})");
    ev('S.cash=1e9;S.offers=[]');
    ev(`eventDeals({n:'TestNOG',c:'${city}'})`);
    assert.ok(ev('S.offers.length') > 0, `${city}: a lead must appear`);
    assert.equal(ev('S.offers[0].city'), city);
  }
});

test('confs: the lead has the same fuse in both cases', () => {
  const { ev } = load();
  ev("beginGame('N','fra',{region:'global',role:'nap'})");
  ev('S.cash=1e9');
  ev("S.offers=[];eventDeals({n:'A',c:'fra'})");
  const a = ev('S.offers[0].exp - S.day');
  ev("S.offers=[];eventDeals({n:'B',c:'ams'})");
  const b = ev('S.offers[0].exp - S.day');
  assert.equal(a, b, 'no different expiry — a lead is a lead');
});

test('confs: an ISP also gets a venue lead', () => {
  const { ev } = load();
  ev("beginGame('I','fra',{region:'global',role:'isp'})");
  ev('S.cash=1e9;S.offers=[]');
  ev("eventDeals({n:'TestNOG',c:'fra'})");
  assert.ok(ev('S.offers.length') > 0);
});

test('confs: registering produces the lead, not the conference day', () => {
  const { ev } = load();
  ev("beginGame('N','fra',{region:'global',role:'nap'})");
  ev('S.cash=1e9');
  /* The lead now arrives when the player registers — that is the moment they meet people, and
     waiting for the event day meant a registered player who forgot got nothing. */
  ev('S.offers=[]');
  ev('ACT.confGo({key:upcomingConfs(75)[0].key})');
  assert.ok(ev('S.offers.length') > 0, 'registering turned into a lead');
  /* And the day itself must not hand out a second one. */
  const n = ev('S.offers.length');
  ev('const cf=upcomingConfs(75)[0];S.day=cf.day;confTick(S.day)');
  assert.equal(ev('S.offers.length'), n, 'the event day does not double the pipeline');
});
