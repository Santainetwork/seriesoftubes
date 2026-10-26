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

test('confs: registering buys a badge, the leads arrive during the event', () => {
  const { ev } = load();
  ev("beginGame('N','fra',{region:'global',role:'nap'})");
  ev('S.cash=1e9');
  /* Registering is not the moment you meet people: you are still at home booking flights. The
     lead lands while you are actually at the event, across the days between arrival and the
     closing keynote, so a conference is a week of work rather than a vending machine. */
  ev('S.offers=[]');
  ev('ACT.confGo({key:upcomingConfs(75)[0].key})');
  assert.equal(ev('S.offers.length'), 0, 'nothing lands before you walk in');
  const lead = JSON.parse(ev('JSON.stringify(S.confReg[upcomingConfs(75)[0].key].leadDays)'));
  assert.ok(lead[0] > ev('S.day'), 'the first lead is after today');
  assert.ok(lead[1] - lead[0] >= 2 && lead[1] - lead[0] <= 7, 'the window is 3-7 days');
  /* Walk the window day by day: leads appear, and they never all appear at once. */
  ev('S.day=' + lead[0] + ';confTick(S.day)');
  const first = ev('S.offers.length');
  assert.ok(first > 0, 'a lead lands on the first day of the event');
  assert.ok(first < 3, 'but not the whole pipeline at once');
  ev('S.day=' + lead[1] + ';confTick(S.day)');
  assert.ok(ev('S.offers.length') > first, 'another lead lands by the closing day');
});
