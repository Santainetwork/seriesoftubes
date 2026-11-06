// PRD F7 gate: tests/prd-roles.test.js (NEW, owned by lane roles).
// Role picker, role-limited offers, POP caps and broadband gating. PRD §8.
// Run: node --test tests/prd-roles.test.js
const test = require('node:test');
const assert = require('node:assert/strict');
const { load } = require('./harness');

test('ROLES: title screen offers four roles and defaults to ISP', () => {
  const { ev, errors } = load();
  const text = ev("document.getElementById('modalCard').textContent");
  assert.equal(ev("document.querySelectorAll('[data-act=pickRole]').length"), 4);
  for (const label of ['Hosting', 'NAP', 'ISP', 'RT/RW net']) assert.ok(text.includes(label), label);
  assert.equal(ev("document.querySelector('[data-act=pickRole].on').dataset.args.includes('isp')"), true);
  // The blurb spells out the limits of the selected role (English UI, decision 7A).
  assert.match(text, /classic all-rounder/);
  ev("ACT.pickRole({id:'hosting'})");
  assert.equal(ev('UI.role'), 'hosting');
  assert.match(ev("document.getElementById('modalCard').textContent"), /Max 3 POPs, no home broadband/);
  assert.equal(ev("document.querySelector('[data-act=pickRole].on').dataset.args.includes('hosting')"), true);
  assert.deepEqual(errors, []);
});

test('ROLES: role is stored in the save and restored on reload', () => {
  const a = load();
  assert.equal(a.ev("sanitize({v:1,pops:{},links:[]}).role"), 'isp', 'legacy saves default to isp');
  assert.equal(a.ev("sanitize({v:1,role:'atlantis',pops:{},links:[]}).role"), 'isp', 'unknown roles fall back');
  a.ev("ACT.start({})");
  assert.equal(a.ev('S.role'), 'isp');
  assert.equal(a.ev('S.cash'), 200000, 'ISP keeps the classic starting cash');
  a.ev("save(true)");
  // Slot system (2.x): the save lives under sot-save-v1:<slot id>, plain JSON.
  assert.equal(a.ev("JSON.parse(localStorage.getItem('sot-save-v1:'+UI.slot)).role"), 'isp');

  a.ev("UI.role='hosting';ACT.start({});save(true)");
  assert.equal(a.ev('S.role'), 'hosting');
  // Brief 5 §1: hosting needs $90k so its own 3-POP footprint is affordable ($60k of POPs).
  assert.equal(a.ev('S.cash'), 90000, 'hosting starts with $90k');
  assert.equal(a.ev("JSON.parse(localStorage.getItem('sot-save-v1:'+UI.slot)).role"), 'hosting');

  const b = load({ storage: { ['sot-save-v1:'+a.ev('UI.slot')]: a.ev("localStorage.getItem('sot-save-v1:'+UI.slot)") } });
  assert.equal(b.ev('S.role'), 'hosting', 'the role survives a reload');
  assert.deepEqual(a.errors, []);
  assert.deepEqual(b.errors, []);
});

test('ROLES: hosting cannot sell broadband and keeps its 3-POP footprint', () => {
  const { ev, errors } = load();
  ev("UI.role='hosting';ACT.start({});S.cash=1e6");
  assert.equal(ev("bbCost('fra')"), Infinity, 'no broadband price for hosting');
  ev("ACT.launchBB({city:'fra'})");
  assert.equal(ev("S.pops.fra.bb"), null, 'launchBB is a no-op');
  assert.match(ev("document.getElementById('toasts').textContent"), /colocation, GPU and AI hosting/);
  ev("renderPanel()");
  assert.equal(ev("document.getElementById('panelBody').textContent.includes('Launch broadband')"), false,
    'the button is not offered');

  ev("for(const c of ['ams','lon'])ACT.buildPop({city:c})");
  assert.equal(ev('Object.keys(S.pops).length'), 3, 'three POPs allowed');
  // Brief 5 §2: the cap is a price signal, not a wall — the fourth POP is allowed but costs more.
  const before = ev('S.cash');
  ev("ACT.buildPop({city:'par'})");
  assert.equal(ev('Object.keys(S.pops).length'), 4, 'the fourth POP is allowed');
  assert.ok(ev('popOverMul()') > 1, 'and it is priced over list');
  assert.ok(ev('S.cash') < before - ev('POP_COST'), 'the fourth POP costs more than list price');
  ev("ACT.buildPop({city:'nyc'})");
  assert.equal(ev('Object.keys(S.pops).length'), 5, 'the fifth POP is allowed too');

  // A link into a new city prices the POP the same way instead of smuggling it in free.
  const cash = ev('S.cash');
  ev("UI.pending={a:'fra',b:'mad'};ACT.buildLink({tier:1})");
  assert.equal(ev('Object.keys(S.pops).length'), 6, 'link path also opens the POP');
  assert.ok(ev('S.cash') < cash, 'and charges for it');
  assert.deepEqual(errors, []);
});

test('ROLES: hosting sees hosting/GPU/on-ramp/AI offers only', () => {
  const { ev, errors } = load();
  ev("UI.role='hosting';ACT.start({});S.lvl=4;S.cash=1e6");
  ev("for(let i=0;i<300;i++){S.offers=[];spawnOffer();if(S.offers.length)break}");
  const seen = JSON.parse(ev("JSON.stringify((()=>{const s=new Set();for(let i=0;i<400;i++){S.offers=[];spawnOffer();for(const o of S.offers)s.add(o.type)}return [...s]})())"));
  assert.ok(seen.length > 0, 'offers still spawn');
  for (const t of seen) assert.ok(['host', 'gpu', 'onramp', 'ai'].includes(t), `unexpected type ${t}`);
  // offersHere() hides a contract the role cannot take, and shows one it can.
  ev("S.offers=[{id:'a',city:'fra',city2:null,name:'Enterprise DIA Co',type:'dia',bw:1,rate:1,reqs:[],exp:999},{id:'b',city:'fra',city2:null,name:'Rack Renters',type:'host',bw:10,rate:1,reqs:[],exp:999}]");
  const html = ev("offersHere('fra')");
  assert.equal(html.includes('Enterprise DIA Co'), false, 'dia is filtered out');
  assert.ok(html.includes('Rack Renters'), 'hosting is shown');
  assert.deepEqual(errors, []);
});

test('ROLES: RT/RW net takes small DIA only, keeps a 2-POP footprint, needs transit first', () => {
  const { ev, errors } = load();
  ev("UI.role='rtnet';ACT.start({});S.cash=1e6");
  assert.equal(ev('S.cash'), 1000000, 'test topped the budget up');
  ev("ACT.launchBB({city:'fra'})");
  assert.match(ev("document.getElementById('toasts').textContent"), /RT\/RW networks sell DIA/);
  // Brief 5 §1: $45k so the role can actually buy its own POPs ($20k each).
  assert.equal(ev("ROLES.rtnet.cash"), 45000, 'starting cash covers a two-POP footprint');

  // No transit bought yet: nothing is offered at all.
  ev("S.transit=[];for(let i=0;i<200;i++){S.offers=[];spawnOffer()}");
  assert.equal(ev('S.offers.length'), 0, 'no offers before transit');

  // With a transit port, only small DIA appears.
  ev("S.transit=[{id:'t1',city:'fra',net:'cog',tier:0,n:1,down:0}]");
  const seen = JSON.parse(ev("JSON.stringify((()=>{const a=[];for(let i=0;i<400;i++){S.offers=[];spawnOffer();for(const o of S.offers)a.push([o.type,o.bw])}return a})())"));
  assert.ok(seen.length > 0, 'DIA offers appear');
  for (const [t, bw] of seen) {
    assert.equal(t, 'dia', 'only DIA is allowed');
    assert.ok(bw <= 2, `small scale only, got ${bw}G`);
  }

  // Two POPs is the role's footprint; a third is allowed but priced over list (brief 5 §2).
  ev("ACT.buildPop({city:'ams'})");
  assert.equal(ev('Object.keys(S.pops).length'), 2);
  ev("ACT.buildPop({city:'lon'})");
  assert.equal(ev('Object.keys(S.pops).length'), 3, 'the third POP is allowed');
  assert.ok(ev('popOverMul()') > 1, 'and it costs over list');
  assert.deepEqual(errors, []);
});

test('ROLES: NAP gets small ISP jobs below 3 POPs, then ISP, hyperscale, AI, metro and remote peering', () => {
  const { ev, errors } = load();
  ev("UI.role='nap';ACT.start({});S.cash=1e7");
  assert.equal(ev('S.cash'), 10000000);
  assert.equal(ev("ROLES.nap.cash"), 2000000, 'PRD starting cash for NAP is $2M');

  // Brief 7 §4.1c: below minPops a NAP is not blocked outright — it gets small ISP jobs.
  const small = JSON.parse(ev("JSON.stringify((()=>{const a=[];for(let i=0;i<300;i++){S.offers=[];spawnOffer();for(const o of S.offers)a.push([o.type,o.bw])}return a})())"));
  assert.ok(small.length > 0, 'a NAP below its threshold still gets small jobs');
  for (const [t, bw] of small) {
    assert.equal(t, 'isp', 'only downstream ISP work below minPops');
    assert.equal(bw, 100, 'and only the smallest scale');
  }
  assert.equal(ev('roleBlockOffers()'), false, 'NAP is never blocked outright');

  ev("for(const c of ['ams','lon'])ACT.buildPop({city:c})");
  assert.equal(ev('Object.keys(S.pops).length'), 3);
  assert.equal(ev('roleBlockOffers()'), false);

  const seen = JSON.parse(ev("JSON.stringify((()=>{const s=new Set();for(let i=0;i<400;i++){S.offers=[];spawnOffer();for(const o of S.offers)s.add(o.type)}return [...s]})())"));
  assert.ok(seen.length > 0, 'offers start once the NAP is big enough');
  /* Brief 18 §C: a NAP also sells metro L2VPN and remote peering — that is what a carrier
     hotel actually does. Anything outside this list means the role gate leaked. */
  for (const t of seen) assert.ok(['isp', 'hyper', 'ai', 'l2vpn', 'remote'].includes(t), `unexpected type ${t}`);
  assert.deepEqual(errors, []);
});
