// isTier1() requires a PNI with every Tier 1 network, and a PNI can only be built in a city where
// that network has a POP. Level Tree had POPs in Europe and the Americas only, so on the SEA and
// Indonesia maps — which cover Asia — no PNI with it was possible, and the win condition was
// unreachable no matter how well the player played. t1Club() still reported the 250 Gbps gate as
// open, which sent players chasing a door that did not exist.
const test = require('node:test');
const assert = require('node:assert');
const { load } = require('./harness.js');

function region(id, city) {
  const h = load();
  h.ev(`beginGame('N',${JSON.stringify(city)},{region:${JSON.stringify(id)}})`);
  return h;
}

const DEAD = `(() => {
  const need = NETS.filter(n => n.type === 't1' && (n.id !== 'skl' || (S && S.t1v >= 2)));
  return need.filter(n => !n.pops || !n.pops.some(p => CITY[p])).map(n => n.id);
})()`;

test('t1: every Tier 1 has a POP on the map, so a PNI is buildable', () => {
  for (const [id, city] of [['global', 'fra'], ['sea', 'mnl'], ['idn', 'jkt']]) {
    const { ev } = region(id, city);
    assert.deepEqual(ev(DEAD), [], id + ' has a Tier 1 with no POP on the map');
  }
});

test('t1: Level Tree is reachable from Asia, not only Europe and the Americas', () => {
  const { ev } = region('idn', 'jkt');
  const pops = JSON.parse(ev("JSON.stringify(NETS.find(n => n.id === 'lvl').pops)"));
  assert.ok(pops.includes('jkt'), 'Level Tree must have a POP in Jakarta');
  assert.ok(pops.includes('sin'), 'Level Tree must have a POP in Singapore');
});

test('t1: Level Tree now judges the player on size, not on reachability', () => {
  const { ev } = region('idn', 'jkt');
  /* A restrictive Tier 1 refuses a small player — that is the intended gate, not a bug. What must
     not happen is a refusal that names a city the network does not serve, which is what the map
     produced before the POP fix. So assert the refusal is about size. */
  ev("S.cash=50000000;S.pops.jkt.rgen=1;");
  const r = ev("JSON.stringify(peerOk('lvl','pni','jkt'))");
  const verdict = JSON.parse(r);
  assert.equal(verdict.ok, false, 'a one-POP player should still be refused');
  assert.match(verdict.why, /POPs|Gbps|sessions/i, 'the refusal must be about size: ' + verdict.why);
  assert.doesNotMatch(verdict.why, /not (present|there|served)/i, 'the refusal must not be about reach');
});
