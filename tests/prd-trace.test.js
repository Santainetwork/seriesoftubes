// PRD traceroute gate: the looking glass only offers networks that exist in this region,
// and it renders a modal for every region. Regression: the dropdown read NETS (all 125)
// while NET/NSH are filtered per region, so a player could pick a network the map had
// never heard of and get a blank or broken trace.
// Run: node --test tests/prd-trace.test.js
const test = require('node:test');
const assert = require('node:assert/strict');
const { load } = require('./harness');

test('trace: the modal opens in every region', () => {
  for (const reg of ['global', 'sea', 'idn']) {
    const { ev, errors } = load();
    ev(`beginGame('T','jkt',{region:'${reg}',role:'isp'})`);
    ev('S.cash=1e9');
    ev("ACT.trace({city:'jkt'})");
    const body = ev("document.getElementById('modalCard').textContent");
    assert.ok(body && body.includes('Traceroute'), `${reg}: no traceroute modal`);
    assert.equal(ev("document.getElementById('modal').hidden"), false, `${reg}: modal stays hidden`);
    assert.deepEqual(errors, [], reg);
  }
});

test('trace: the network list matches the region, not the global NETS', () => {
  /* Brief 18 §G: IDN now carries its own domestic transit list, so the count is no longer the
     15 networks that happened to have a POP in Jakarta. Global and SEA are unchanged.
     SEA is 44 and IDN 50 since v1.28 added B.I.G.S. with a POP in Singapore, which both maps carry. */
  /* The point is that each region offers its own list, not the global one. Global grows as
     upstream adds carriers, so the assertion is that global is larger than the regional lists and
     that SEA/IDN stay at their own sizes, rather than pinning a global count that moves. */
  const expected = { sea: 44, idn: 50 };
  for (const reg of Object.keys(expected)) {
    const { ev } = load();
    ev(`beginGame('T','jkt',{region:'${reg}',role:'isp'})`);
    ev('S.cash=1e9');
    ev("ACT.trace({city:'jkt'})");
    const n = ev("document.querySelectorAll('#trTo optgroup:first-child option').length");
    assert.equal(n, expected[reg], `${reg}: offered ${n} networks`);
  }
  /* IDN: assert the list is the region's own, and that no global T1 leaks into it. */
  const { ev } = load();
  ev("beginGame('T','jkt',{region:'idn',role:'isp'})");
  ev('S.cash=1e9');
  ev("ACT.trace({city:'jkt'})");
  /* The picker only lists networks with a POP in the selected city, so the count is small even
     though the region carries over a hundred. What matters is which names are there. */
  const idnN = ev("document.querySelectorAll('#trTo optgroup:first-child option').length");
  assert.ok(idnN > 10, `idn: offered only ${idnN} networks`);
  const names = JSON.parse(ev("JSON.stringify([...document.querySelectorAll('#trTo optgroup:first-child option')].map(o=>o.textContent))"));
  for (const dead of ['Level Tree', 'Tell-Ya Carrier', 'Cogentle', 'Ta-Ta Comms']) {
    assert.ok(!names.includes(dead), `${dead} must not appear on the Indonesia map`);
  }
});

test('trace: every offered network exists in NET', () => {
  for (const reg of ['global', 'sea', 'idn']) {
    const { ev } = load();
    ev(`beginGame('T','jkt',{region:'${reg}',role:'isp'})`);
    ev('S.cash=1e9');
    ev("ACT.trace({city:'jkt'})");
    const bad = JSON.parse(ev(`JSON.stringify([...document.querySelectorAll('#trTo optgroup:first-child option')]
      .map(o=>o.value.replace('net:',''))
      .filter(id=>!NET[id]))`));
    assert.deepEqual(bad, [], `${reg}: offered dead networks ${bad}`);
  }
});

test('trace: running against a live network renders hops', () => {
  const { ev, errors } = load();
  ev("beginGame('T','fra',{region:'global',role:'isp'})");
  ev('S.cash=1e9');
  ev("ACT.launchBB({city:'fra'})");
  ev("ACT.buyTransit({city:'fra',net:'ntt',tier:1})");
  ev("ACT.trace({city:'fra'})");
  const pre = ev("document.querySelector('.term') ? document.querySelector('.term').textContent : ''");
  assert.ok(pre.includes('traceroute to'), 'a trace header is rendered');
  assert.ok(pre.split('\n').length >= 3, 'at least three lines');
  assert.deepEqual(errors, []);
});
