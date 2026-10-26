// Brief 14 gate: Indonesian exchanges from PeeringDB, parodied names, existing cities only.
// Run: node --test tests/prd-xix.test.js
const test = require('node:test');
const assert = require('node:assert/strict');
const { load } = require('./harness');

const idn = () => {
  const { ev, errors } = load();
  ev("applyRegion('idn')");
  assert.deepEqual(errors, []);
  return ev;
};

// The 14 Indonesian cities with PeeringDB IX (brief 14 §1.1: 11 existing + tkg/djb/soc/mlg now that brief 7 §3 landed).
const EXISTING = ['jkt', 'sby', 'bdg', 'smg', 'mdn', 'jog', 'plm', 'upg', 'dps', 'btm', 'pku', 'tkg', 'djb', 'soc', 'mlg'];
// Brief 14 §1.1 picks per city, and the total (23 + 5 wired new = 28).
const EXPECTED = {
  jkt: 6, sby: 4, jog: 2, dps: 2, bdg: 1, smg: 2,
  mdn: 1, plm: 1, upg: 1, btm: 1, pku: 2,
  tkg: 2, djb: 1, soc: 1, mlg: 1,
};

test('idn: existing-city exchanges are wired, one entry per IX', () => {
  const ev = idn();
  assert.equal(ev('XIX.length'), 28, '23 old + 5 wired new-city entries');
  assert.equal(ev('new Set(XIX.map(x=>x.c)).size'), 15, 'only cities with a PeeringDB IX');
  for (const c of EXISTING) {
    assert.equal(ev(`ixStatic('${c}').length`), EXPECTED[c], `${c} exchange count`);
  }
  assert.equal(ev('XIX.every(x=>!x.id.includes("~")||x.id.split("~")[0]===x.c)'), true,
    'challenger ids stay in their own city');
});

test('idn: Jakarta has six exchanges and Surabaya four', () => {
  const ev = idn();
  assert.equal(ev("ixStatic('jkt').length"), 6);
  assert.equal(ev("ixStatic('sby').length"), 4);
  assert.equal(ev("XIX.filter(x=>x.c==='jkt').length"), 6);
  assert.equal(ev("XIX.filter(x=>x.c==='sby').length"), 4);
});

test('idn: no IX is wired for a city without a PeeringDB IX', () => {
  const ev = idn();
  for (const c of ['pdg', 'tnj', 'koe', 'ami', 'kdi', 'plw', 'amb', 'ttn', 'soq']) {
    assert.equal(ev(`XIX.some(x=>x.c==='${c}')`), false, `${c} is future-only`);
    assert.equal(ev(`ixStatic('${c}').length`), 0, `${c} has no IX yet`);
  }
  for (const c of ['tkg', 'djb', 'soc', 'mlg']) {
    assert.equal(ev(`XIX.some(x=>x.c==='${c}')`), true, `${c} is wired now`);
  }
});

test('idn: bjm, bpn, mdc, pnk and jay keep zero exchanges', () => {
  const ev = idn();
  for (const c of ['bjm', 'bpn', 'mdc', 'pnk', 'jay']) {
    assert.equal(ev(`ixStatic('${c}').length`), 0, `${c} has no IX in PeeringDB`);
  }
});

test('idn: every exchange name is a parody, not a real one', () => {
  const ev = idn();
  const names = JSON.parse(ev('JSON.stringify(XIX.map(x=>x.name))'));
  // Word-boundary bans: IXI is the sanctioned parody of IIX and must pass.
  const banned = ['JKT-IX', 'IIX', 'CXC', 'DE-CIX', 'BIX', 'OpenIXP', 'APJII'];
  for (const n of names) {
    for (const b of banned) {
      const re = new RegExp(`(^|[^A-Za-z0-9])${b.replace(/[-]/g, '\\-')}([^A-Za-z0-9]|$)`, 'i');
      assert.ok(!re.test(n), `${n} contains the real name ${b}`);
    }
  }
  // And the parodies the brief names are actually present.
  for (const n of ['JKT-IKS', 'IXI', 'AIKS', 'SisiX', 'BIKS', 'DU-CIKS', 'ODIKS', 'PANDA-IKS', 'BatamIKS', 'BJN-IKS', 'CitraIKS Solo', 'BIKS Malang', 'GPMIKS']) {
    assert.ok(names.includes(n), `missing parody ${n}`);
  }
});

test('idn: Makassar keeps its single tiny exchange with a tiny take', () => {
  const ev = idn();
  assert.equal(ev("ixStatic('upg').length"), 1);
  assert.equal(ev("XIX.find(x=>x.c==='upg').take"), 0.10, 'two members, almost nothing to peer with');
});

test('global XIX is still the untouched baseline', () => {
  const { ev, errors } = load();
  /* Upstream adds exchanges, so the count is captured rather than pinned: what must hold is that
     swapping to IDN replaces the array and swapping back restores it exactly. */
  const gN = ev('XIX.length');
  assert.ok(gN >= 25, 'the global exchange list is present');
  ev("applyRegion('idn')");
  assert.equal(ev('XIX.length'), 28, 'region swap uses the wired IDN array');
  ev("applyRegion('global')");
  assert.equal(ev('XIX.length'), gN, 'region swap restores the global array');
  assert.deepEqual(errors, []);
});
