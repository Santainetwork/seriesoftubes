// PRD save gate: tests/prd-save.test.js (brief 11 §1-2).
// Forked build, merged from upstream 2.7: a save belongs to the network that was played, and each
// network lives in its own slot key (sot-save-v1:<slot id>) with a shared index (sot-slots). The
// region a network was started on travels inside the save, so switching maps never deletes a run
// and one network never clobbers another. save() stamps savedAt, saveMode 'none' writes nothing,
// and resetting or starting a new network only ever drops the slot you are in.
// Run: node --test tests/prd-save.test.js
const test = require('node:test');
const assert = require('node:assert/strict');
const { load } = require('./harness');

// Start a fresh network on a region and return its slot id plus the two storage keys it owns.
const startOn = (h, name, city, region) => {
  h.ev(`beginGame(${JSON.stringify(name)},${JSON.stringify(city)},{region:${JSON.stringify(region)}})`);
  return h.ev('UI.slot');
};
const rawSlot = (h, id) => h.ev(`localStorage.getItem('sot-save-v1:${id}')`);

test('save: an IDN run survives a reload', () => {
  const a = load();
  const id = startOn(a, 'Nusantara', 'jkt', 'idn');
  a.ev('S.cash=900000;S.day=200;save()');
  const raw = rawSlot(a, id);
  assert.ok(raw, 'written under its own slot key');

  // A fresh page with just this network's slot and index: the title screen finds it and it loads.
  const b = load({ storage: { ['sot-save-v1:' + id]: raw, 'sot-slots': a.ev("localStorage.getItem('sot-slots')") } });
  b.ev(`ACT.cont({id:'${id}'})`);
  assert.equal(b.ev('S.region'), 'idn');
  assert.equal(b.ev('curRegion'), 'idn');
});

test('save: three regions do not clobber each other', () => {
  const a = load();
  const ids = [];
  for (const [r, city] of [['global', 'fra'], ['sea', 'jkt'], ['idn', 'jkt']]) {
    if (r !== 'global') a.ev('ACT.toTitle()');
    ids.push(startOn(a, 'Net ' + r, city, r));
    a.ev('save()');
  }
  assert.equal(new Set(ids).size, 3, 'each network gets its own slot');
  for (const [i, region] of ['global', 'sea', 'idn'].entries()) {
    assert.ok(rawSlot(a, ids[i]), `${region} save still on disk`);
    assert.equal(a.ev(`JSON.parse(localStorage.getItem('sot-save-v1:${ids[i]}')).region`), region);
  }
});

test('save: boot restores UI.region from the save', () => {
  const a = load();
  const id = startOn(a, 'N', 'jkt', 'idn');
  a.ev('save()');
  const raw = rawSlot(a, id);
  const b = load({ storage: { ['sot-save-v1:' + id]: raw, 'sot-slots': a.ev("localStorage.getItem('sot-slots')") } });
  b.ev(`ACT.cont({id:'${id}'})`);
  assert.equal(b.ev('curRegion'), 'idn');
  assert.equal(b.ev('UI.region'), 'idn');
});

test('save: reset does not clear other regions', () => {
  const a = load();
  const g = startOn(a, 'A', 'fra', 'global');
  a.ev('save()');
  a.ev('ACT.toTitle()');
  const idn = startOn(a, 'B', 'jkt', 'idn');
  a.ev('save()');
  a.ev('ACT.resetAsk({})');
  assert.ok(rawSlot(a, g), 'global slot survives a reset prompt');
  assert.ok(rawSlot(a, idn), 'idn slot survives a reset prompt');
});

test('save: newgame deletes only the current network', () => {
  const a = load();
  const g = startOn(a, 'A', 'fra', 'global');
  a.ev('save()');
  a.ev('ACT.toTitle()');
  const idn = startOn(a, 'B', 'jkt', 'idn');
  a.ev('save()');
  a.ev('ACT.newgame({})');
  assert.equal(rawSlot(a, idn), null, 'the current (idn) slot is removed');
  assert.ok(rawSlot(a, g), 'global slot survives');
});

test('save: newest savedAt wins over an older higher-day save', () => {
  const a = load();
  a.ev("beginGame('Old','fra',{region:'global'})");
  const old = a.ev('UI.slot');
  a.ev("S.day=500;S.savedAt=1000;save()");
  a.ev('ACT.toTitle()');
  a.ev("beginGame('New','jkt',{region:'idn'})");
  const nw = a.ev('UI.slot');
  a.ev("S.day=10;S.savedAt=9000;save()");
  // The title's slot list is newest-first, so the newer network is the obvious continue.
  const top = a.ev("slotIdx(true).slice().sort((x,y)=>(y.at||0)-(x.at||0))[0].id");
  assert.equal(top, nw, 'the newest save is the one offered');
  assert.notEqual(old, nw);
});

test('save: saveMode none still returns null', () => {
  const a = load();
  startOn(a, 'N', 'jkt', 'idn');
  a.ev('save()');
  a.ev("UI.saveMode='none'");
  assert.equal(a.ev('loadSave()'), null);
});

test('save: save() stamps savedAt', () => {
  const a = load();
  const id = startOn(a, 'N', 'jkt', 'idn');
  a.ev('save()');
  assert.ok(a.ev('S.savedAt') > 0);
  assert.ok(a.ev(`JSON.parse(localStorage.getItem('sot-save-v1:${id}')).savedAt`) > 0);
});
