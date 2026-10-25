// PRD save gate: tests/prd-save.test.js (brief 11 §1-2).
// A save belongs to the region it was played in. loadSave() must look at every region key,
// boot must restore UI.region, save() must stamp savedAt, and a reset must only remove the
// current region's keys (never localStorage.clear()).
// Run: node --test tests/prd-save.test.js
const test = require('node:test');
const assert = require('node:assert/strict');
const { load } = require('./harness');

test('save: an IDN run survives a reload', () => {
  const a = load();
  a.ev("beginGame('Nusantara','jkt',{region:'idn',role:'isp'})");
  a.ev('S.cash=900000;S.day=200;save()');
  const raw = a.ev("localStorage.getItem('sot-save-v1:idn')");
  assert.ok(raw, 'written under the idn key');

  const b = load({ storage: { 'sot-save-v1:idn': raw } });
  assert.equal(b.ev("loadSave()?'yes':'no'"), 'yes', 'loadSave finds it');
  assert.equal(b.ev('loadSave().region'), 'idn');
});

test('save: three regions do not clobber each other', () => {
  const a = load();
  for (const [r, city] of [['global', 'fra'], ['sea', 'jkt'], ['idn', 'jkt']]) {
    a.ev(`beginGame('Net ${r}','${city}',{region:'${r}'})`);
    a.ev('save()');
  }
  assert.ok(a.ev("localStorage.getItem('sot-save-v1:global')"));
  assert.ok(a.ev("localStorage.getItem('sot-save-v1:sea')"));
  assert.ok(a.ev("localStorage.getItem('sot-save-v1:idn')"));
});

test('save: boot restores UI.region from the save', () => {
  const a = load();
  a.ev("beginGame('N','jkt',{region:'idn'})");
  a.ev('save()');
  const raw = a.ev("localStorage.getItem('sot-save-v1:idn')");
  const b = load({ storage: { 'sot-save-v1:idn': raw } });
  b.ev('ACT.cont({})');
  assert.equal(b.ev('curRegion'), 'idn');
  assert.equal(b.ev('UI.region'), 'idn');
});

test('save: reset does not clear other regions', () => {
  const a = load();
  a.ev("beginGame('A','fra',{region:'global'})"); a.ev('save()');
  a.ev("beginGame('B','jkt',{region:'idn'})");   a.ev('save()');
  a.ev('ACT.resetAsk({})');
  assert.ok(a.ev("localStorage.getItem('sot-save-v1:global')"), 'global survives');
});

test('save: newgame deletes only the current region', () => {
  const a = load();
  a.ev("beginGame('A','fra',{region:'global'})"); a.ev('save()');
  a.ev("beginGame('B','jkt',{region:'idn'})");   a.ev('save()');
  a.ev('ACT.newgame({})');
  assert.equal(a.ev("localStorage.getItem('sot-save-v1:idn')"), null, 'idn key removed');
  assert.ok(a.ev("localStorage.getItem('sot-save-v1:global')"), 'global survives');
});

test('save: newest savedAt wins over an older higher-day save', () => {
  const a = load();
  a.ev("beginGame('Old','fra',{region:'global'})");
  a.ev('S.day=500;S.savedAt=1000;localStorage.setItem("sot-save-v1:global",JSON.stringify(S))');
  a.ev("beginGame('New','jkt',{region:'idn'})");
  a.ev('S.day=10;S.savedAt=9000;save()');
  assert.equal(a.ev('loadSave().name'), 'New');
  assert.equal(a.ev('loadSave().region'), 'idn');
});

test('save: saveMode none still returns null', () => {
  const a = load();
  a.ev("beginGame('N','jkt',{region:'idn'})"); a.ev('save()');
  a.ev("UI.saveMode='none'");
  assert.equal(a.ev('loadSave()'), null);
});

test('save: save() stamps savedAt', () => {
  const a = load();
  a.ev("beginGame('N','jkt',{region:'idn'})");
  a.ev('save()');
  assert.ok(a.ev('S.savedAt') > 0);
  assert.ok(a.ev("JSON.parse(localStorage.getItem('sot-save-v1:idn')).savedAt") > 0);
});
