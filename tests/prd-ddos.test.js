// PRD brief 19 item 1: shaped DDoS attacks, a mitigation toolbox, and Flowspec tied to router TCAM.
// Ports the mechanics of upstream 1.17.0 (c3b99df) + 1.17.1 (5036f1a) without the scrubbing tiers of 1.18.
// Run: node --test tests/prd-ddos.test.js
const test = require('node:test');
const assert = require('node:assert/strict');
const { load } = require('./harness');

// A small network with a home broadband POP and one transit, ready to take a flood.
function ready(ev) {
  ev("beginGame('T','fra',{region:'global',role:'isp'})");
  ev('S.cash=1e8');
  ev("ACT.launchBB({city:'fra'})");
  ev("S.pops.fra.bb.d=200");
  ev("ACT.buyTransit({city:'fra',net:'cog',tier:1})");
  ev('compute()');
}

test('attack shapes: vectors, sizes, entry points and durations', () => {
  const { ev, errors } = load();
  // Five vectors, with only the application-layer HTTP flood outside Flowspec's reach.
  assert.deepEqual(
    JSON.parse(ev("JSON.stringify(Object.keys(DDOS_VEC))")),
    ['dns', 'ntp', 'cldap', 'syn', 'http']
  );
  assert.equal(ev("Object.values(DDOS_VEC).filter(v=>v.fs).length"), 4, 'four volumetric vectors are filterable');
  assert.equal(ev("DDOS_VEC.http.fs"), false, 'HTTP floods are application layer');

  ready(ev);
  // DDoS only enters the failure mix after day 40.
  ev('S.day=60');
  // Fire failures until a DDoS lands: the attack must carry a vector, a size, an entry and a duration.
  const atk = JSON.parse(ev(`(()=>{
    for(let i=0;i<400;i++){fireFailure();const a=S.ev.ddos;if(a)return JSON.stringify(a);}
    return 'null';
  })()`));
  assert.ok(atk, 'a DDoS eventually fires');
  assert.ok(Object.prototype.hasOwnProperty.call(atk, 'vec') && Object.prototype.hasOwnProperty.call(ev('DDOS_VEC'), atk.vec), 'the attack has a known vector');
  assert.ok(atk.gbps >= 2, `size is at least a couple of Gbps (got ${atk.gbps})`);
  assert.ok(atk.until > atk.start, 'it has a duration');
  assert.ok(atk.entry && typeof atk.entry.k === 'string', 'it has an entry point');
  assert.equal(atk.bh, false, 'it starts un-blackholed');
  assert.deepEqual(errors, []);
});

test('Flowspec is a router-model capability, and each tool answers a flood', () => {
  const { ev, errors } = load();
  // The capability table: full TCAM leaves least junk, basic more, none lets it all through.
  assert.ok(ev('FS_RES[2] < FS_RES[1] && FS_RES[1] < FS_RES[0] && FS_RES[0] === 1'), 'full trims more than basic, basic more than none');
  assert.ok(ev('RG.some(r=>r.fs===0) && RG.some(r=>r.fs===1) && RG.some(r=>r.fs===2)'), 'models span none/basic/full TCAM');

  // Start on the used Rusty Router (rgen 0), which has no Flowspec TCAM.
  ready(ev);
  assert.equal(ev("fsAt('fra')"), 0, 'the Rusty POP cannot do Flowspec');
  const clean = ev('R.served');
  assert.ok(clean > 20, 'traffic flows before the attack');

  // A 300 Gbps DNS flood: with no TCAM here the junk starves the exit and node.
  ev("S.ev.ddos={city:'fra',vec:'dns',gbps:300,until:S.day+3,entry:{k:'t',lab:'x'},bh:false,start:S.day};compute()");
  const none = ev('R.served');
  assert.ok(none < clean, 'an unfiltered flood displaces real traffic');

  // Give this same router Flowspec TCAM (holding its forwarding capacity fixed): the DNS flood is filtered.
  const full = ev("RG[0].fs=2;compute();R.served"); ev("RG[0].fs=0");
  assert.ok(full > none, 'a Flowspec-capable router recovers a known flood');

  // It cannot touch an application-layer HTTP flood, however big the TCAM.
  const http = ev("RG[0].fs=2;S.ev.ddos.vec='http';compute();const s=R.served;RG[0].fs=0;s");
  assert.ok(Math.abs(http - none) < 1, 'Flowspec is useless against HTTP');

  // Scrubbing cleans any vector, regardless of router.
  ev("S.ev.ddos.vec='dns';S.scrubAt='fra';compute()");
  assert.ok(ev('R.served') > none, 'scrubbing recovers real traffic');
  assert.deepEqual(errors, []);
});

test('Flowspec capability follows the chassis in that POP', () => {
  const { ev } = load();
  ready(ev);
  // Swap the POP's model to a full-TCAM chassis and the capability (and filtering) follows it.
  const before = ev("S.ev.ddos={city:'fra',vec:'ntp',gbps:300,until:S.day+3,entry:{k:'edge',lab:''},bh:false,start:S.day};compute();R.served");
  const upgraded = ev("const g=S.pops.fra.rgen;S.pops.fra.rgen=2;const cap=fsAt('fra');compute();const s=R.served;S.pops.fra.rgen=g;JSON.stringify([cap,s])");
  const [cap, served] = JSON.parse(upgraded);
  assert.equal(cap, 2, 'a big chassis has full Flowspec TCAM');
  assert.ok(served > before, 'and it filters the flood at the edge');
  // A basic merchant-silicon box trims some, but less than the big iron.
  const basic = ev("const g=S.pops.fra.rgen;S.pops.fra.rgen=1;compute();const s=R.served;S.pops.fra.rgen=g;s");
  assert.ok(basic >= before && basic <= served, 'basic TCAM sits between none and full');
});

test('RTBH blackholes the victim, and HackBack 3000 is a gamble', () => {
  const { ev } = load();
  ready(ev);
  ev("S.ev.ddos={city:'fra',vec:'syn',gbps:20,until:S.day+3,entry:{k:'edge',lab:''},bh:false,start:S.day};ACT.rtbh();compute()");
  assert.equal(ev('S.ev.ddos.bh'), true);
  assert.equal(ev('S.stats.rtbh'), 1);
  assert.equal(ev('R.citySrv.fra'), 0, 'the blackholed city serves nothing');
  // Withdrawing it brings the city back.
  ev('ACT.unrtbh();compute()');
  assert.equal(ev('S.ev.ddos.bh'), false);
  assert.ok(ev('R.citySrv.fra') > 0, 'the city is reachable again');

  // HackBack: a forced win ends the attack early.
  ev("S.ev.ddos.until=S.day+3;const _r=Math.random;Math.random=()=>0.1;ACT.hackback();Math.random=_r");
  assert.ok(ev('S.ev.ddos.until') <= ev('S.day'), 'a lucky hack-back ends it');

  // A forced miss fines you and marks you a vigilante.
  ev("S.ev.ddos={city:'fra',vec:'dns',gbps:50,until:S.day+3,entry:{k:'edge',lab:''},bh:false,start:S.day};const c=S.cash;const _r=Math.random;Math.random=()=>0.9;ACT.hackback();Math.random=_r;window.__fined=c-S.cash");
  assert.ok(ev('window.__fined') > 20000, 'a bad hack-back costs the fee plus a fine');
  assert.equal(ev('S.stats.vigilante'), 1);
});

test('RouteScript blackhole ddos stops the junk but costs a slice of real traffic', () => {
  const { ev } = load();
  ready(ev);
  ev("S.ev.ddos={city:'fra',vec:'dns',gbps:300,until:S.day+3,entry:{k:'edge',lab:''},bh:false,start:S.day};compute()");
  const none = ev('R.served');
  ev("S.te={on:true,script:'blackhole ddos'};compute()");
  assert.ok(ev('R.teBlack') > 0, 'the junk is blackholed at the edge');
  assert.ok(ev('R.served') > none, 'and real traffic recovers most of its capacity');
  ev('S.te=null;compute()');
});

test('old saves load, and a stale flat DDoS object is repaired away', () => {
  const { ev } = load();
  ev("beginGame('T','fra',{region:'global',role:'isp'})");
  // An old save with a pre-1.17 flat attack (no vector) loads and the attack is dropped.
  const dropped = ev("const s=JSON.parse(JSON.stringify(S));s.ev={ddos:{city:'fra',until:9}};sanitize(s);s.ev.ddos===undefined");
  assert.equal(dropped, true, 'a vectorless attack is dropped');
  // A well-formed attack survives sanitize with its fields coerced.
  const kept = ev("const s=JSON.parse(JSON.stringify(S));s.ev={ddos:{city:'fra',vec:'dns',gbps:'80',until:9}};sanitize(s);JSON.stringify([s.ev.ddos&&s.ev.ddos.vec, s.ev.ddos&&s.ev.ddos.gbps, s.ev.ddos&&s.ev.ddos.bh])");
  assert.deepEqual(JSON.parse(kept), ['dns', 80, false], 'a shaped attack is kept, numbers coerced');
});
