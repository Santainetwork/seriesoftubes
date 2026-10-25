// Brief 19 item 2: zoom levels of detail, grouped parallel waves and POP decommissioning.
const test = require('node:test');
const assert = require('node:assert/strict');
const { load } = require('./harness');

function base(ev) {
  ev("ACT.start({});S.cash=1e8;S.lvl=4;for(const g of GOALS)S.done[g.id]=0;ACT.launchBB({city:'fra'})");
}

test('decommissioning POPs, one or several, removes what is there and charges for the customers', () => {
  const { ev, errors } = load();
  base(ev);
  ev("for(const c of ['ams','par','lon'])ACT.buildPop({city:c});const L=(a,b)=>{UI.via=null;openLinkModal(a,b);ACT.buildLink({tier:1});closeModal();};L('fra','ams');L('fra','par');L('ams','lon');ACT.buyTransit({city:'ams',net:'cog',tier:1});ACT.buyIx({city:'ams',tier:1});ACT.peerAll({city:'ams'});compute()");
  ev("S.biz.push({id:'b1',type:'l2vpn',name:'Tulip Bank',city:'ams',city2:'fra',bw:10,rate:300,reqs:[],mood:100,start:S.day},{id:'b2',type:'l2vpn',name:'Croissant Co',city:'par',city2:'fra',bw:5,rate:200,reqs:[],mood:100,start:S.day})");
  ev("selectCity('ams');ACT.tab({t:'infra'})");
  assert.match(ev("document.getElementById('panelBody').textContent"), /Decommission/);
  ev("ACT.decomOpen({city:'ams'})");
  assert.match(ev("document.getElementById('modalCard').textContent"), /Tulip Bank/);
  const cash = ev('S.cash');
  ev("ACT.decomToggle({city:'lon'});ACT.decomGo();compute()");
  assert.equal(ev("!!S.pops.ams||!!S.pops.lon"), false, 'both gone');
  assert.equal(ev("S.links.some(l=>[l.a,l.b].some(c=>c==='ams'||c==='lon'))"), false);
  assert.equal(ev("S.transit.length+Object.keys(S.ixp).length"), 0, 'ports and exchange go with them');
  assert.equal(ev("S.biz.map(b=>b.id).join()"), 'b2', 'only the Amsterdam customer is let go');
  assert.equal(cash - ev('S.cash'), 10 * 300 * 3, 'three months of the contract');
  // never the last one
  ev("ACT.decomOpen({});for(const c of Object.keys(S.pops))ACT.decomToggle({city:c});ACT.decomGo()");
  assert.ok(ev("Object.keys(S.pops).length") >= 1);
  assert.deepEqual(errors, []);
});

test('zoom LOD thresholds switch rendering, and parallel waves group into one line', () => {
  const { ev, errors } = load();
  base(ev);
  ev("ACT.buildPop({city:'nyc'});ACT.buildPop({city:'lon'})");
  ev("for(let i=0;i<4;i++){UI.via='grace';UI.route='same';openLinkModal('nyc','lon');ACT.buildLink({tier:1});closeModal();}compute()");
  assert.equal(ev("S.links.length"), 4);
  assert.equal(ev("linkGroups().length"), 1, 'four waves on one cable are one line');
  assert.match(ev("groupLabel(linkGroups()[0],linkGroups()[0])"), /^4×/);
  // LOD thresholds: far below 0.72, near above it.
  ev("cam.z=0.5");
  assert.equal(ev("lodFar()"), true);
  ev("cam.z=1.4");
  assert.equal(ev("lodFar()"), false);
  // Both detail levels must draw without throwing.
  ev("cam.z=0.4;draw(0);cam.z=2;draw(0)");
  assert.deepEqual(errors, []);
});
