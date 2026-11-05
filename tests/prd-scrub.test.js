// A player reported "gak bisa bikin anti dedos" — the build button in a POP's Infra tab did
// nothing. The button was wired to an action called 'scrub', but ACT has buildScrub and rmScrub;
// no ACT.scrub ever existed, so the click was silently dropped by the dispatcher.
const test = require('node:test');
const assert = require('node:assert');
const { load } = require('./harness.js');

function idn() {
  const h = load();
  h.ev("beginGame('N','upg',{region:'idn'})");
  return h;
}

test('ddos: the scrubbing center button calls an action that exists', () => {
  const { ev } = idn();
  ev('S.cash=3.4e9;S.lvl=2;ACT.focusCity({city:"upg"});UI.tab="infra";renderPanel();');
  const html = ev('document.body.innerHTML');
  const acts = [...html.matchAll(/data-act="([a-zA-Z]+)"/g)].map(m => m[1]);
  const scrubActs = acts.filter(a => /scrub/i.test(a));
  assert.ok(scrubActs.length > 0, 'no scrubbing button rendered at all');
  for (const a of scrubActs) {
    assert.ok(ev(`typeof ACT[${JSON.stringify(a)}]`) === 'function',
      'the button calls ACT.' + a + ', which does not exist');
  }
});

test('ddos: building one actually stands it up', () => {
  const { ev } = idn();
  ev('S.cash=3.4e9;S.lvl=2;');
  /* Upstream 2.7 (#117) replaced the single S.scrubAt slot with a per-city S.scrubs list, so a
     player can run scrubbing centers in several POPs at once. These assertions follow that API. */
  assert.equal(ev('S.scrubs.length'), 0);
  ev("ACT.buildScrub({city:'upg',tier:0})");
  assert.ok(ev("S.scrubs.some(x=>x.city==='upg')"), 'the scrubbing center was not recorded');
  assert.ok(ev('S.cash') < 3.4e9, 'nothing was paid');
});

test('ddos: shutting it down asks first, then clears it', () => {
  const { ev } = idn();
  ev('S.cash=3.4e9;S.lvl=2;');
  ev("ACT.buildScrub({city:'upg',tier:0})");
  ev("ACT.rmScrub({city:'upg'})");
  assert.ok(ev("S.scrubs.some(x=>x.city==='upg')"), 'the first click must only ask');
  ev("ACT.rmScrub({city:'upg'})");
  assert.equal(ev("S.scrubs.some(x=>x.city==='upg')"), false, 'the second click must shut it down');
});
