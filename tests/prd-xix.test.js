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

// The 11 Indonesian cities already on the map (brief 14 §6, 16-city build).
const EXISTING = ['jkt', 'sby', 'bdg', 'smg', 'mdn', 'jog', 'plm', 'upg', 'dps', 'btm', 'pku'];
// Brief 14 §1.1 picks per existing city, and the total.
const EXPECTED = {
  jkt: 6, sby: 4, jog: 2, dps: 2, bdg: 1, smg: 2,
  mdn: 1, plm: 1, upg: 1, btm: 1, pku: 2,
};

test('idn: existing-city exchanges are wired, one entry per IX', () => {
  const ev = idn();
  assert.equal(ev('XIX.length'), 23, '23 existing-city entries in the §3.1 table');
  assert.equal(ev('new Set(XIX.map(x=>x.c)).size'), 11, 'only the 11 existing cities');
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

test('idn: no IX is wired for a city this map does not have', () => {
  const ev = idn();
  for (const c of ['tkg', 'pdg', 'djb', 'soc', 'mlg', 'tnj', 'koe', 'ami', 'kdi', 'plw', 'amb', 'ttn', 'soq']) {
    assert.equal(ev(`XIX.some(x=>x.c==='${c}')`), false, `${c} is future-only`);
    assert.equal(ev(`ixStatic('${c}').length`), 0, `${c} has no IX yet`);
  }
  assert.equal(ev("typeof XIX_IDN_FUTURE"), 'undefined', 'future block stays commented out');
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
  // Word-boundary bans: IIIX is the sanctioned parody of IIX and must pass.
  const banned = ['JKT-IX', 'IIX', 'CXC', 'DE-CIX', 'BIX', 'OpenIXP', 'APJII'];
  for (const n of names) {
    for (const b of banned) {
      const re = new RegExp(`(^|[^A-Za-z0-9])${b.replace(/[-]/g, '\\-')}([^A-Za-z0-9]|$)`, 'i');
      assert.ok(!re.test(n), `${n} contains the real name ${b}`);
    }
  }
  // And the parodies the brief names are actually present.
  for (const n of ['JKT-IKS', 'IIIX', 'AIKS', 'SisiX', 'BIKS', 'DU-CIKS', 'ODIKS', 'PANDA-IKS', 'BatamIKS']) {
    assert.ok(names.includes(n), `missing parody ${n}`);
  }
});

test('idn: Makassar keeps its single tiny exchange with a tiny take', () => {
  const ev = idn();
  assert.equal(ev("ixStatic('upg').length"), 1);
  assert.equal(ev("XIX.find(x=>x.c==='upg').take"), 0.10, 'two members, almost nothing to peer with');
});

test('global XIX is still the untouched 25-entry baseline', () => {
  const { ev, errors } = load();
  assert.equal(ev('XIX.length'), 25);
  ev("applyRegion('idn')");
  assert.equal(ev('XIX.length'), 23);
  ev("applyRegion('global')");
  assert.equal(ev('XIX.length'), 25, 'region swap restores the global array');
  assert.deepEqual(errors, []);
});
