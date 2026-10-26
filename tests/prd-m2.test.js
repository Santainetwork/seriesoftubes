// PRD M2 gate: tests/prd-m2.test.js (NEW, owned by lane m2).
// Region selector, three save modes, legacy migration. PRD §4, §5, §11.3, §16.2.
// Run: node --test tests/prd-m2.test.js
const test = require('node:test');
const assert = require('node:assert/strict');
const { load } = require('./harness');

const storage = (ev) => JSON.parse(ev(
  'JSON.stringify(Object.keys(localStorage).reduce((o,k)=>(o[k]=localStorage.getItem(k),o),{}))'
));

test('M2: title screen renders both selectors (§4.2)', () => {
  const { ev, errors } = load();
  const text = ev("document.getElementById('modalCard').textContent");
  // Region cards: Global / SEA / Indonesia, Global active by default.
  assert.equal(ev("document.querySelectorAll('[data-act=pickRegion]').length"), 3);
  for (const label of ['Global', 'SEA', 'Indonesia']) assert.ok(text.includes(label), label);
  assert.equal(ev("document.querySelector('[data-act=pickRegion].on').dataset.args.includes('global')"), true);
  // Save-mode cards: device / session / none, device active by default.
  assert.equal(ev("document.querySelectorAll('[data-act=pickSaveMode]').length"), 3);
  for (const label of ['On device', 'This only', 'No save']) assert.ok(text.includes(label), label);
  assert.equal(ev("document.querySelector('[data-act=pickSaveMode].on').dataset.args.includes('device')"), true);
  /* The description line counts what the selected region actually holds, so it has to be derived
     from the live tables rather than a literal that goes stale whenever the map grows. */
  const nCities = ev('CITIES.length'), nCables = ev('CABLES.length');
  assert.match(text, new RegExp(nCities + ' cities · ' + nCables + ' cables'),
    `expected "${nCities} cities · ${nCables} cables" in the title screen`);
  assert.deepEqual(errors, []);
});

test('M2: defaults are global + device (§4.3, §5.1)', () => {
  const { ev, errors } = load();
  assert.equal(ev('UI.region'), 'global');
  assert.equal(ev('UI.saveMode'), 'device');
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

  // Prove the selector is data-driven, exactly the shape M3 will plug into: give REGION a sea entry
  // and the card must become live, the start list must swap to its startCities, and the choice
  // must persist.
  ev(`REGION.sea={...REGION.global,id:'sea',name:'SEA',startCities:['jkt']};showTitle()`);
  assert.equal(ev("document.querySelector('[data-act=pickRegion][data-args*=\"sea\"]').disabled"), false);
  ev("ACT.pickRegion({id:'sea'})");
  assert.equal(ev('UI.region'), 'sea', 'choice is applied');
  assert.equal(ev("localStorage.getItem('sot-region')"), 'sea', 'choice is remembered');
  assert.equal(ev("JSON.stringify([...document.querySelectorAll('.start')].map(b=>b.dataset.city))"), '["jkt"]',
    'home-city list comes from REGION[sea].startCities');
  assert.equal(ev("document.querySelector('[data-act=pickRegion].on').dataset.args.includes('sea')"), true,
    'the active card follows the choice');

  // A stored region this build has no map for falls back to global instead of booting a broken world.
  const b = load({ storage: { 'sot-region': 'sea' } });
  assert.equal(b.ev('UI.region'), 'global');
  assert.equal(b.ev('curRegion'), 'global');
  assert.deepEqual(b.errors, []);
  assert.deepEqual(errors, []);
});

test('M2: region switch never deletes a save (§4.3, §16.2)', () => {
  const { ev, errors } = load();
  ev("UI.region='global';UI.saveMode='device';beginGame('A','fra',{});save()");
  assert.ok(ev("!!localStorage.getItem('sot-save-v1:global')"), 'global save exists');

  ev("ACT.pickRegion({id:'sea'})");
  assert.ok(ev("!!localStorage.getItem('sot-save-v1:global')"), 'switching away keeps the global save');

  ev("UI.region='sea';UI.saveMode='device';beginGame('B','jkt',{});save()");
  assert.ok(ev("!!localStorage.getItem('sot-save-v1:sea')"), 'sea save is written to its own key');
  assert.equal(ev("JSON.parse(localStorage.getItem('sot-save-v1:global')).name"), 'A', 'global save untouched');

  ev("UI.region='global'");
  assert.equal(ev('loadSave().name'), 'A', 'switching back finds the old network');
  assert.deepEqual(errors, []);
});

test('M2: save modes are isolated per region (§11.3)', () => {
  const { ev, errors } = load();
  ev("UI.region='global';UI.saveMode='device';ACT.start({});save()");
  ev("UI.region='sea';UI.saveMode='device';beginGame('Sea Net','jkt',{});save()");
  assert.ok(ev("localStorage.getItem('sot-save-v1:global')"));
  assert.ok(ev("localStorage.getItem('sot-save-v1:sea')"));
  // The gate's reload assertion: global still resolves to the global network.
  ev("UI.region='global'");
  assert.equal(ev('loadSave().name'), 'Packet Pals');
  assert.deepEqual(errors, []);
});

test('M2: reload per region restores that region only', () => {
  const a = load();
  // Same data-driven stub as above: the save-key isolation is what is under test, not SEA geometry.
  a.ev("REGION.sea={...REGION.global,id:'sea',name:'SEA',startCities:['jkt']}");
  a.ev("ACT.start({});S.name='A';save();UI.region='sea';beginGame('B','jkt',{});save()");
  const store = storage(a.ev);

  const g = load({ storage: store });
  assert.equal(g.ev('UI.region'), 'global');
  assert.equal(g.ev('S.name'), 'A');

  // A build that knows this region accepts the stored preference and loads that region's save.
  const s = load({ storage: { ...store, 'sot-region': 'sea' } });
  s.ev("REGION.sea={...REGION.global,id:'sea',name:'SEA',startCities:['jkt']}");
  assert.equal(s.ev('UI.saveMode'), 'device');
  s.ev("UI.region='sea'");
  assert.equal(s.ev('loadSave().name'), 'B', 'the sea save resolves under the sea key');
  assert.deepEqual(g.errors, []);
  assert.deepEqual(s.errors, []);
});

test('M2: saveKey builds the two documented keys (§5.3)', () => {
  const { ev, errors } = load();
  assert.equal(ev("saveKey('device','global')"), 'sot-save-v1:global');
  assert.equal(ev("saveKey('session','sea')"), 'sot-save-session:sea');
  assert.deepEqual(errors, []);
});

test('M2: saveMode none writes nothing (§11.3)', () => {
  const { ev, errors } = load();
  ev("UI.saveMode='none';ACT.start({});save()");
  assert.equal(ev("localStorage.getItem(saveKey('device','global'))"), null);
  assert.equal(ev("localStorage.getItem(saveKey('session','global'))"), null);
  assert.equal(ev("localStorage.getItem('sot-save-v1')"), null);
  assert.equal(ev("loadSave()"), null, 'nothing to continue either');
  // HUD says so (PRD §5.5).
  ev('renderHUD()');
  assert.equal(ev("document.getElementById('hSave').hidden"), false);
  assert.match(ev("document.getElementById('hSaveVal').textContent"), /No save/);
  assert.deepEqual(errors, []);
});

test('M2: session saves use their own key, stay out of Continue, die on pagehide (§5.1)', () => {
  const { ev, errors } = load();
  ev("UI.saveMode='session';ACT.start({});save()");
  assert.ok(ev("localStorage.getItem(saveKey('session','global'))"), 'session save is written');
  assert.equal(ev("localStorage.getItem(saveKey('device','global'))"), null, 'device key untouched');
  assert.equal(ev("loadSave()"), null, 'session saves are not offered as Continue');
  ev('renderHUD()');
  assert.match(ev("document.getElementById('hSaveVal').textContent"), /Session only/);

  // A device run in the same region is a different run and must survive pagehide.
  ev("UI.saveMode='device';ACT.start({});save()");
  ev("UI.saveMode='session';ACT.start({});save();dispatchEvent(new Event('pagehide'))");
  assert.equal(ev("localStorage.getItem(saveKey('session','global'))"), null, 'session key removed');
  assert.ok(ev("localStorage.getItem(saveKey('device','global'))"), 'device save remains');
  assert.deepEqual(errors, []);
});

test('M2: legacy save migrates to global (§5.4)', () => {
  const { ev, errors } = load({ storage: { 'sot-save-v1': JSON.stringify({ v: 1, name: 'Old' }) } });
  assert.equal(ev("!!localStorage.getItem('sot-save-v1:global')"), true, 'moved to the regional key');
  assert.equal(ev("localStorage.getItem('sot-save-v1')"), null, 'old key removed after the copy');
  assert.equal(ev('loadSave().region'), 'global', 'migrated save is a global one');
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

test('M2: a pre-region save never overwrites a newer global one', () => {
  const { ev, errors } = load({ storage: {
    'sot-save-v1': JSON.stringify({ v: 1, name: 'Ancient' }),
    'sot-save-v1:global': JSON.stringify({ v: 1, name: 'Current', region: 'global' }),
  } });
  assert.equal(ev("JSON.parse(localStorage.getItem('sot-save-v1:global')).name"), 'Current');
  assert.equal(ev('loadSave().name'), 'Current');
  assert.deepEqual(errors, []);
});
