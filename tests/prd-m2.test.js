// PRD M2 gate: title screen region selector, role picker, slot-based saves, legacy migration.
// Forked build, merged from upstream 2.7: saves live in slots (sot-save-v1:<slot id>) rather than
// per-region keys, and the title screen describes the selected region instead of counting cities.
// PRD §4, §5, §11.3, §16.2.
// Run: node --test tests/prd-m2.test.js
const test = require('node:test');
const assert = require('node:assert/strict');
const { load } = require('./harness');

test('M2: title screen renders the region selector and role picker (§4.2)', () => {
  const { ev, errors } = load();
  const text = ev("document.getElementById('modalCard').textContent");
  // Region cards: Global / SEA / Indonesia, Global active by default.
  assert.equal(ev("document.querySelectorAll('[data-act=pickRegion]').length"), 3);
  for (const label of ['Global', 'SEA', 'Indonesia']) assert.ok(text.includes(label), label);
  assert.equal(ev("document.querySelector('[data-act=pickRegion].on').dataset.args.includes('global')"), true);
  // Fork role picker: the four roles, ISP active by default.
  assert.equal(ev("document.querySelectorAll('[data-act=pickRole]').length"), 4);
  assert.equal(ev("document.querySelector('[data-act=pickRole].on').dataset.args.includes('isp')"), true);
  assert.deepEqual(errors, []);
});

test('M2: defaults are global + device (§4.3, §5.1)', () => {
  const { ev, errors } = load();
  assert.equal(ev('UI.region'), 'global');
  assert.equal(ev('UI.saveMode'), 'device');
  assert.equal(ev('UI.role'), 'isp');
  assert.deepEqual(errors, []);
});

test('M2: picking a region persists it and refills the home-city list (§4.3)', () => {
  const { ev, errors } = load();
  // M2 ships the selector; the SEA and Indonesia maps now ship with the build, so every
  // region card is live rather than disabled.
  assert.equal(ev("document.querySelector('[data-act=pickRegion][data-args*=\"sea\"]').disabled"), false,
    'SEA map ships, so the card is enabled');
  assert.equal(ev("document.querySelector('[data-act=pickRegion][data-args*=\"idn\"]').disabled"), false,
    'Indonesia map ships, so the card is enabled');

  // Prove the selector is data-driven: give REGION a sea entry and the card must become live,
  // the start list must swap to its startCities, and the choice must persist.
  ev(`REGION.sea={...REGION.global,id:'sea',name:'SEA',startCities:['jkt']};showTitle()`);
  assert.equal(ev("document.querySelector('[data-act=pickRegion][data-args*=\"sea\"]').disabled"), false);
  ev("ACT.pickRegion({id:'sea'})");
  assert.equal(ev('UI.region'), 'sea', 'choice is applied');
  assert.equal(ev("localStorage.getItem('sot-region')"), 'sea', 'choice is remembered');
  assert.equal(ev("document.querySelector('#homeSel').value"), 'jkt',
    'home-city defaults to REGION[sea].startCities[0]');
  assert.equal(ev("document.querySelector('[data-act=pickRegion].on').dataset.args.includes('sea')"), true,
    'the active card follows the choice');

  // A stored region this build has no map for falls back to global instead of booting a broken world.
  const b = load({ storage: { 'sot-region': 'sea' } });
  assert.equal(b.ev('UI.region'), 'global');
  assert.equal(b.ev('curRegion'), 'global');
  assert.deepEqual(b.errors, []);
  assert.deepEqual(errors, []);
});

test('M2: picking a role applies it to the new network (§4.3, fork)', () => {
  const { ev, errors } = load();
  ev("ACT.pickRole({id:'hosting'})");
  assert.equal(ev('UI.role'), 'hosting', 'choice is applied');
  assert.equal(ev("document.querySelector('[data-act=pickRole].on').dataset.args.includes('hosting')"), true);
  // A new network carries the role.
  ev("ACT.start({})");
  assert.equal(ev('S.role'), 'hosting');
  assert.deepEqual(errors, []);
});

test('M2: region switch never deletes a save (§4.3, §16.2)', () => {
  const { ev, errors } = load();
  ev("UI.region='global';beginGame('A','fra',{});save(true)");
  const slotA = ev('UI.slot');
  assert.ok(ev(`!!localStorage.getItem('sot-save-v1:${slotA}')`), 'global save exists in its slot');
  assert.equal(ev(`JSON.parse(localStorage.getItem('sot-save-v1:${slotA}')).name`), 'A');

  ev("ACT.pickRegion({id:'sea'})");
  assert.ok(ev(`!!localStorage.getItem('sot-save-v1:${slotA}')`), 'switching away keeps the global save in its slot');
  assert.equal(ev('UI.slot'), slotA, 'the selector rebinds the map, not the running network');

  // A new network starts in its own slot; the old one only moves off-screen with toTitle().
  ev("ACT.toTitle();beginGame('B','jkt',{'region':'sea'});save(true)");
  const slotB = ev('UI.slot');
  assert.ok(ev(`!!localStorage.getItem('sot-save-v1:${slotB}')`), 'sea run is written to its own slot');
  assert.notEqual(slotB, slotA, 'the new network gets a new slot');
  assert.equal(ev(`JSON.parse(localStorage.getItem('sot-save-v1:${slotA}')).name`), 'A', 'global save untouched');

  ev("ACT.toTitle()");
  ev(`ACT.cont({id:'${slotA}'})`);
  assert.equal(ev('S.name'), 'A', 'switching back finds the old network');
  assert.deepEqual(errors, []);
});

test('M2: legacy save migrates to the main slot (§5.4)', () => {
  const { ev, errors } = load({ storage: { 'sot-save-v1': JSON.stringify({ v: 1, name: 'Old' }) } });
  assert.equal(ev("!!localStorage.getItem('sot-save-v1:main')"), true, 'moved to the main slot key');
  assert.equal(ev("JSON.parse(localStorage.getItem('sot-save-v1:main')).name"), 'Old');
  assert.equal(ev("slotIdx().some(e=>e.id==='main')"), true, 'indexed as the main slot');
  assert.deepEqual(errors, []);
});

test('M2: a migrated save loads at boot', () => {
  const { ev, errors } = load({ storage: { 'sot-save-v1': JSON.stringify({ v: 1, name: 'Old Network', day: 3, cash: 1e5, pops: { fra: { routers: 1 } }, links: [] }) } });
  assert.equal(ev('UI.started'), true);
  assert.equal(ev('S.name'), 'Old Network');
  assert.equal(ev('S.region'), 'global');
  assert.deepEqual(errors, []);
});

test('M2: sanitize falls back to global for missing or unknown regions (§5.4, §12)', () => {
  const { ev, errors } = load();
  assert.equal(ev("sanitize({v:1,pops:{},links:[]}).region"), 'global', 'missing region');
  assert.equal(ev("sanitize({v:1,region:'atlantis',pops:{},links:[]}).region"), 'global', 'unknown region');
  assert.equal(ev("sanitize({v:1,region:'global',pops:{},links:[]}).region"), 'global', 'known region kept');
  assert.deepEqual(errors, []);
});

test('M2: a pre-region save never overwrites the main slot', () => {
  const { ev, errors } = load({ storage: {
    'sot-save-v1': JSON.stringify({ v: 1, name: 'Ancient' }),
    'sot-save-v1:main': JSON.stringify({ v: 1, name: 'Current', region: 'global' }),
  } });
  assert.equal(ev("JSON.parse(localStorage.getItem('sot-save-v1:main')).name"), 'Current');
  // loadSave binds the active slot; the old single-key save is not in the active slot.
  assert.equal(ev("loadSave()"), null, 'the legacy single key is not current');
  assert.deepEqual(errors, []);
});

test('M2: the slot index is kept after the title screen', () => {
  const { ev, errors } = load();
  ev("ACT.start({})");
  const slot = ev('UI.slot');
  const idx = ev("JSON.parse(localStorage.getItem('sot-slots')).slots");
  assert.ok(idx.some(e => e.id === slot), 'new network is indexed');
  assert.equal(ev(`JSON.parse(localStorage.getItem('sot-save-v1:${slot}')).name`), ev('S.name'), 'its save is written');
  assert.deepEqual(errors, []);
});
