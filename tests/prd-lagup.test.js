// PRD gate for brief 19 item 5: LAG bundling, SD-WAN chains and dark-fiber-pair leases.
// Ported from upstream fbe2dab (LAGs for transit/IX/PNI) and d0e2e4d (event networks,
// SD-WAN chains, wholesale waves, dark fiber pair leases). This file only covers the three
// features adopted here; it does not test events or wholesale waves.
// Run: node --test tests/prd-lagup.test.js
const test = require('node:test');
const assert = require('node:assert/strict');
const { load, seed } = require('./harness');

// A small but real network: three POPs with big routers, transit, and a ring of waves.
function network(ev) {
  ev("ACT.start({});S.cash=1e8;S.lvl=4;for(const g of GOALS)S.done[g.id]=0");
  ev("for(const c of ['ams','par','lon'])ACT.buildPop({city:c});for(const c in S.pops){S.pops[c].rgen=3;S.pops[c].routers=2}");
  ev("ACT.launchBB({city:'fra'});ACT.buyTransit({city:'fra',net:'lvl',tier:2})");
  ev("const L=(a,b,t)=>{UI.via=null;openLinkModal(a,b);ACT.buildLink({tier:t});};L('fra','ams',3);L('fra','par',3);L('ams','lon',2);closeModal()");
}

test('LAG: bundling identical ports adds ~95% of their capacity and costs each member', () => {
  const { ev, errors } = load();
  network(ev);
  // One 100G transit port in Frankfurt and one 100G IX port in Amsterdam
  // (Frankfurt's exchange sells through a quote flow, so use the plain one).
  ev("ACT.buyTransit({city:'fra',net:'cog',tier:1});ACT.buyIx({city:'ams',tier:1})");
  assert.equal(ev("lagCap(100,1)"), 100, 'a single member carries the full port');
  assert.equal(ev("lagCap(100,2)"), 190, 'two members carry 95% of the sum');
  assert.equal(ev("lagCap(100,8)"), 760, 'eight members carry 95% of the sum');

  // Add two transit members and one IX member; each costs a full port.
  ev("const t=S.transit.find(x=>x.net==='cog');window.__c0=S.cash;ACT.lagT({id:t.id,d:1});ACT.lagT({id:t.id,d:1});ACT.lagIx({city:'ams',d:1});compute()");
  assert.equal(ev("S.transit.find(x=>x.net==='cog').n"), 3);
  assert.equal(ev("S.ixn.ams"), 2);
  const spent = ev("__c0-S.cash");
  const ixMo = ev("ixPortMo('ams',1)");
  assert.equal(spent, ev("PORT[1].setup*2") + ixMo, 'each new member costs a full port');
  assert.equal(ev("ixCap('ams')"), 190, 'the IX bundle carries 2 × 100G × 0.95');

  // The bundle's capacity is what compute() hands the traffic solver.
  ev("compute()");
  assert.equal(ev("R.cost.ix"), ixMo * 2, 'the IX bill counts both members');

  // A PNI bundle behaves the same way and charges a cross-connect per member.
  // 'drz' is an open Tier 2 that will take a PNI at this size.
  ev("ACT.pni({city:'fra',net:'drz',tier:1});const p=S.pni[0];window.__p0=S.cash;ACT.lagP({id:p.id,d:1});compute()");
  assert.equal(ev("S.pni[0].n"), 2);
  assert.ok(ev("__p0-S.cash") > 0, 'the extra PNI member was charged');
  assert.equal(ev("lagCap(PORT[S.pni[0].tier].g,S.pni[0].n)"), 190);

  // Members are capped, and never drop below one.
  ev("for(let i=0;i<20;i++)ACT.lagT({id:S.transit.find(x=>x.net==='cog').id,d:1})");
  assert.equal(ev("S.transit.find(x=>x.net==='cog').n"), 8, 'capped at 8 members');
  ev("for(let i=0;i<20;i++)ACT.lagT({id:S.transit.find(x=>x.net==='cog').id,d:-1})");
  assert.equal(ev("S.transit.find(x=>x.net==='cog').n"), 1, 'never drops below one member');

  // Upgrading the port upgrades every member.
  ev("ACT.buyTransit({city:'fra',net:'cog',tier:2})");
  assert.equal(ev("S.transit.find(x=>x.net==='cog').tier"), 2);

  // The panels show the bundle: transit under Transit, the IX port under Peering.
  ev("selectCity('fra');ACT.tab({t:'up'})");
  assert.match(ev("document.getElementById('panelBody').textContent"), /1×100G LAG|LAG member/);
  ev("selectCity('ams');ACT.tab({t:'peer'})");
  assert.match(ev("document.getElementById('panelBody').textContent"), /2×100G LAG/);
  assert.deepEqual(errors, []);
});

test('LAG: the bill grows with every member and the commit scales with the bundle', () => {
  const { ev, errors } = load();
  network(ev);
  ev("ACT.buyTransit({city:'fra',net:'cog',tier:1});compute()");
  const one = ev("R.cost.transit");
  ev("ACT.lagT({id:S.transit.find(x=>x.net==='cog').id,d:1});compute()");
  const two = ev("R.cost.transit");
  ev("ACT.lagT({id:S.transit.find(x=>x.net==='cog').id,d:1});compute()");
  const three = ev("R.cost.transit");
  assert.ok(one > 0 && two > one && three > two, `the bill grows ${one} → ${two} → ${three}`);
  // The port fee is charged per member, so three members pay three times the port fee.
  const tmo = ev("PORT[1].tmo");
  assert.ok(three - one >= tmo * 2 * 0.99, 'each extra member adds a port fee');
  // The commit is 20% of the bundle, so it rises with the member count too.
  assert.equal(ev("lagCap(PORT[1].g,3)"), 285, 'the bundle capacity is 3 × 100G × 0.95');
  assert.deepEqual(errors, []);
});

test('SD-WAN: a hub-and-spoke chain is carried and pays while every spoke is up', () => {
  const { ev, errors } = load();
  seed(ev, 7);
  network(ev);
  ev("S.offers=[{id:'s1',city:'fra',city2:null,sites:['fra','ams','par','lon'],name:'Kebab Kingdom',type:'sdwan',bw:5,rate:2800,reqs:[],exp:S.day+30}];ACT.accept({id:'s1'});compute()");
  assert.equal(ev("S.biz.length"), 1);
  assert.equal(ev("S.biz[0].sites.length"), 4, 'the chain keeps all four sites');
  assert.equal(ev("bizSf(S.biz[0])"), 1, 'every spoke has a path');
  assert.ok(ev("R.rev.business") >= 5 * 2800 * 0.99, 'the chain pays for its bandwidth');
  assert.ok(ev("R.l2[S.biz[0].id]") > 0, 'the chain carries traffic');

  // One broken spoke takes the whole contract down, not just that site.
  ev("S.links.filter(l=>l.a==='ams'&&l.b==='lon').forEach(l=>l.cut=S.day+5);compute()");
  assert.equal(ev("bizSf(S.biz[0])"), 0, 'a dead spoke fails the whole chain');
  assert.equal(ev("R.rev.business"), 0);

  // Repair it and the chain comes back.
  ev("S.links.filter(l=>l.a==='ams'&&l.b==='lon').forEach(l=>l.cut=0);compute()");
  assert.equal(ev("bizSf(S.biz[0])"), 1);
  assert.ok(ev("R.rev.business") > 0);

  // The panel names every site.
  ev("selectCity('par')");
  assert.match(ev("document.getElementById('panelBody').textContent"), /4 sites/);
  assert.deepEqual(errors, []);
});

test('dfpair: a dark-fiber-pair lease pays while the pair is up and stops when it is cut', () => {
  const { ev, errors } = load();
  seed(ev, 11);
  network(ev);
  // Build our own fiber between two POPs and hand it over today.
  ev("UI.pending={a:'fra',b:'par'};UI.lmode='df';UI.dfSrc='build';UI.dfSys='lite';ACT.orderDf();UI.lmode='wave'");
  ev("S.links.filter(l=>l.kind==='df').forEach(l=>{l.ready=S.day;l.own=true})");
  ev("spawnSpecial('dfpair')");
  assert.equal(ev("S.offers.filter(o=>o.type==='dfpair').length"), 1, 'a pair lease is offered');
  assert.ok(ev("S.offers.find(o=>o.type==='dfpair').link"), 'the offer is tied to our fiber');
  ev("const o=S.offers.find(o=>o.type==='dfpair');o.rate=1200;ACT.accept({id:o.id});compute()");

  const b = "S.biz.find(x=>x.type==='dfpair')";
  assert.ok(ev(b), 'the lease was signed');
  assert.equal(ev(`bizSf(${b})`), 1, 'the pair is lit, so the lease is served');
  assert.ok(ev("R.rev.business") >= 1200 * 0.99, 'the lease pays monthly');
  assert.equal(ev(`fiberOk(${b})`), true);

  // A cut pair takes the lease to zero revenue.
  ev("S.links.filter(l=>l.kind==='df').forEach(l=>l.cut=S.day+5);compute()");
  assert.equal(ev(`bizSf(${b})`), 0, 'a cut pair serves nothing');
  assert.equal(ev("R.rev.business"), 0);

  // Repairing it restores the revenue.
  ev("S.links.filter(l=>l.kind==='df').forEach(l=>l.cut=0);compute()");
  assert.equal(ev(`bizSf(${b})`), 1);
  assert.ok(ev("R.rev.business") >= 1200 * 0.99);

  // The city panel flags a down fiber, and the link panel counts sold pairs.
  ev("selectCity('fra');ACT.tab({t:'cust'})");
  assert.match(ev("document.getElementById('panelBody').textContent"), /Dark fiber pair lease/);
  assert.deepEqual(errors, []);
});
