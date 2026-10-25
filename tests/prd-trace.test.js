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
  const expected = { global: 125, sea: 37, idn: 15 };
  for (const reg of Object.keys(expected)) {
    const { ev } = load();
    ev(`beginGame('T','jkt',{region:'${reg}',role:'isp'})`);
    ev('S.cash=1e9');
    ev("ACT.trace({city:'jkt'})");
    const n = ev("document.querySelectorAll('#trTo optgroup:first-child option').length");
    assert.equal(n, expected[reg], `${reg}: offered ${n} networks`);
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
