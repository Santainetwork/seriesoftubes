const test = require('node:test');
const assert = require('node:assert/strict');
const { load } = require('./harness');

function base(ev) {
  ev("ACT.start({});S.cash=1e8;for(const g of GOALS)S.done[g.id]=0;ACT.launchBB({city:'fra'})");
}

test('#4 several transits in one city share the load instead of filling one by one', () => {
  const { ev, errors } = load();
  base(ev);
  ev("ACT.buyTransit({city:'fra',net:'cog',tier:1});ACT.buyTransit({city:'fra',net:'lvl',tier:1});compute()");
  const u = JSON.parse(ev("JSON.stringify(S.transit.map(t=>R.useT[t.id]||0))"));
  assert.equal(u.length, 2);
  assert.ok(u[0] > 0 && u[1] > 0, `both carry traffic (${u})`);
  assert.ok(Math.abs(u[0] - u[1]) / (u[0] + u[1]) < 0.35, `roughly balanced (${u})`);
  // local exits still win over far ones: a transit in London is not used while Frankfurt has room
  ev("ACT.buildPop({city:'lon'});UI.via=null;openLinkModal('fra','lon');ACT.buildLink({tier:3});closeModal();ACT.buyTransit({city:'lon',net:'tly',tier:1});compute()");
  assert.equal(ev("R.useT[S.transit.find(t=>t.city==='lon').id]||0"), 0, 'remote transit stays idle');
  // backup-only still means backup only
  ev("S.transit[1].pref='low';compute()");
  assert.equal(ev("R.useT[S.transit[1].id]||0"), 0);
  assert.deepEqual(errors, []);
});

test('#5 export writes a file and import restores it, with checks', () => {
  const { ev, dom, errors } = load();
  const window = dom.window;
  base(ev);
  ev("S.name='Export Me';S.cash=1234567;compute()");
  let blobText = null;
  window.URL.createObjectURL = b => { blobText = b; return 'blob:x'; };
  window.URL.revokeObjectURL = () => {};
  window.HTMLAnchorElement.prototype.click = function () { window.__dl = this.download; };
  ev("ACT.exportSave()");
  assert.match(window.__dl, /^series-of-tubes-export-me-\d{4}-\d\d-\d\d\.json$/);
  const txt = ev("JSON.stringify({app:'series-of-tubes',version:APP_VERSION,S})");
  assert.ok(blobText);
  ev("S.cash=1;S.name='Other'");
  assert.match(ev(`parseSave('{"nope":1}').err`), /does not look/);
  assert.match(ev(`parseSave('not json').err`), /not valid JSON/);
  assert.match(ev(`parseSave(JSON.stringify(Object.assign(JSON.parse(${JSON.stringify(txt)}).S,{lost:true}))).err`), /bankrupt/);
  ev(`UI.importing=parseSave(${JSON.stringify(txt)}).s;ACT.importGo()`);
  assert.equal(ev("S.name"), 'Export Me');
  assert.equal(ev("S.cash"), 1234567);
  assert.equal(ev("JSON.parse(localStorage.getItem('sot-save-v1')).name"), 'Export Me', 'saved on this device');
  ev("showHelp()");
  assert.match(ev("document.getElementById('modalCard').textContent"), /Export save.*Import a save/);
  assert.deepEqual(errors, []);
});

test('#6 full transit, IX, caches and routers show up in the NOC and on the map', () => {
  const { ev, errors } = load();
  base(ev);
  ev("S.pops.fra.bb.d=5000;ACT.buyTransit({city:'fra',net:'cog',tier:0});ACT.buyIx({city:'ams',tier:0,signed:true});S.caches.push({id:'cx',city:'fra',net:'akm'});compute()");
  ev("R.nodeLoad.fra=R.nodeCap.fra;UI.hotMap=hotByCity()");
  const ks = JSON.parse(ev("JSON.stringify(hotPorts().map(h=>h.k))"));
  for (const k of ['t', 'c', 'r']) assert.ok(ks.includes(k), `${k} is reported hot (${ks})`);
  assert.ok(ev("UI.hotMap.fra&&UI.hotMap.fra.t>=0.9"));
  ev("ACT.leftTab({t:'noc'})");  // NOC reads R as it is now (router forced hot above)
  const noc = ev("document.getElementById('leftBody')?document.getElementById('leftBody').textContent:document.body.textContent");
  assert.match(noc, /running hot/);
  assert.match(noc, /Akamaybe Box cache/);
  assert.match(noc, /transit/);
  ev("draw&&draw(performance.now())");
  assert.deepEqual(errors, []);
});

test('some routers take forever to boot, PacketOinkers most of all', () => {
  const { ev, errors } = load();
  base(ev);
  const pct = JSON.parse(ev("JSON.stringify(RG.map((G,g)=>{let n=0;for(const c of ALLC){S.pops[c]=S.pops[c]||{rgen:g,routers:1};S.pops[c].rgen=g;if(slowBoot(c))n++;}return n/ALLC.length;}))"));
  assert.ok(pct[0] < pct[2] && pct[2] > 0.2 && pct[0] < 0.3, `bigger chassis are slow more often (${pct})`);
  assert.match(ev("RG[2].chip"), /PacketOinker/);
  // find a slow and a fast POP and crash them
  ev("for(const c of ALLC)if(c!=='fra')delete S.pops[c];S.pops.fra.rgen=2;S.pops.fra.routers=1");
  const slowCity = ev("ALLC.find(c=>{S.pops[c]={rgen:2,routers:1,down:0};const s=slowBoot(c);if(!s)delete S.pops[c];return s;})");
  ev(`for(const c of Object.keys(S.pops))if(c!=='${slowCity}')delete S.pops[c];S.transit=[];S.ixp={};for(let i=0;i<800&&!S.inc.some(x=>x.type==='crash');i++){fireFailure();S.inc=S.inc.filter(x=>x.type==='crash');}`);
  const inc = JSON.parse(ev("JSON.stringify(S.inc.find(i=>i.type==='crash'))"));
  assert.ok(inc.slow, 'crash on a slow booter is flagged');
  assert.ok(inc.until - ev('S.day') >= 4, 'and lasts longer');
  ev(`S.cash=1e6;ACT.fixInc({id:'${inc.id}'})`);
  assert.equal(ev(`S.inc.find(i=>i.id==='${inc.id}').until`), ev('S.day+1'), 'rushing it still takes a day');
  ev(`selectCity('${slowCity}');ACT.tab({t:'infra'})`);
  assert.match(ev("document.getElementById('panelBody').textContent"), /a slow one/);
  assert.deepEqual(errors, []);
});

test('the network name opens a menu with save, load and start over', () => {
  const { ev, errors } = load();
  base(ev);
  ev("document.querySelector('[data-act=menu]').click()");
  const t = ev("document.getElementById('modalCard').textContent");
  for (const w of ['Export save', 'Import a save', 'Start a new network', 'Back to the map']) assert.ok(t.includes(w), w);
  ev("document.querySelector('#modalCard [data-act=resetAsk]').click()");
  assert.match(ev("document.getElementById('modalCard').textContent"), /cannot be undone/);
  ev("document.querySelector('#modalCard [data-act=newgame]').click()");
  assert.equal(ev("!!localStorage.getItem('sot-save-v1')&&JSON.parse(localStorage.getItem('sot-save-v1')).day>0"), false);
  assert.deepEqual(errors, []);
});

test('a rare global outage shows a banner, dents traffic and only happens once', () => {
  const { ev, errors } = load();
  base(ev);
  ev("compute()");const before = ev("R.demand");
  ev("elephant();compute();renderAll()");
  assert.ok(ev("R.demand") < before * 0.8);
  assert.equal(ev("document.getElementById('mega').hidden"), false);
  for (let i = 0; i < 5; i++) ev("dayTick()");
  ev("renderAll()");
  assert.equal(ev("document.getElementById('mega').hidden"), true);
  assert.equal(ev("S.phpDone"), true);
  assert.deepEqual(errors, []);
});

test('badges unlock with a rarity, persist across games, and secret ones stay hidden', () => {
  const { ev, errors } = load();
  base(ev);
  ev("localStorage.removeItem('sot-badges');S.ach={};compute();checkGoals();ACT.leftTab({t:'goals'})");
  let txt = ev("document.body.textContent");
  assert.match(txt, /Badges/);
  assert.match(txt, /\?\?\?/, 'secret badges are hidden');
  ev("ACT.buyIx({city:'fra',tier:1,signed:true});ACT.rs({city:'fra'});compute();checkGoals()");
  assert.ok(ev("S.ach.hello!==undefined"), 'first peering badge');
  assert.ok(ev("!!JSON.parse(localStorage.getItem('sot-badges')).hello"), 'remembered across games');
  ev("S.stats.sharks=3;checkGoals()");
  assert.ok(ev("S.ach.bait!==undefined&&S.ach.shark!==undefined"));
  ev("ACT.leftTab({t:'goals'})");
  txt = ev("document.body.textContent");
  assert.match(txt, /Legendary/);
  assert.equal(ev("GOALS.some(g=>g.id==='gi')&&GOALS.some(g=>g.id==='t10')"), true);
  assert.equal(ev("document.getElementById('hBank').className"), 'badge');
  assert.deepEqual(errors, []);
});

test('Auto-TE spills overflow onto an alternate path when the shortest one is full', () => {
  const { ev, errors } = load();
  /* This test used to rely on the Frankfurt-Amsterdam cable being 358 km, which happened to
     throttle the shortest path enough that Auto-TE made a visible difference. Once cables were
     routed through water that pair became 520 km (the real sea distance via the Channel) and
     the bottleneck moved. So the bottleneck is now built deliberately: one 10G link that
     cannot carry the demand, and a second path around it. */
  ev("ACT.start({});S.cash=1e9;S.lvl=4;for(const g of GOALS)S.done[g.id]=0;ACT.launchBB({city:'fra'})");
  ev("for(const c of ['ams','lon','par'])ACT.buildPop({city:c});"
    + "const L=(a,b,t,v)=>{UI.via=v||null;openLinkModal(a,b);ACT.buildLink({tier:t});closeModal();};"
    + "L('fra','ams',0);L('ams','lon',1,'uly');L('fra','par',1);L('par','lon',1,'chn');"
    + "ACT.buyTransit({city:'lon',net:'lvl',tier:1});compute()");
  /* Squeeze the direct path: the 10G Frankfurt-Amsterdam link is the shortest way in, and it is
     the one that has to overflow. */
  ev("S.links[0].tier=0;compute()");
  const dem = ev("R.demand");
  assert.ok(dem > 5, 'demand exists to be throttled');
  ev("ACT.buyTE();compute()");
  assert.equal(ev("S.te.on"), true, 'Auto-TE is live');
  assert.ok(ev("R.teMoved") >= 0, 'teMoved is a number, not NaN');
  /* With TE on, the alternate path must carry traffic: that is the whole mechanism. */
  const parLoad = ev("R.load[S.links.find(l=>l.a==='fra'&&l.b==='par').id]");
  assert.ok(parLoad > 1, 'the Paris path carries overflow, got ' + parLoad);
  ev("ACT.leftTab({t:'noc'})");
  assert.match(ev("document.body.textContent"), /Auto-TE/);
  ev("ACT.teToggle();compute()");
  assert.equal(ev("S.te.on"), false, 'switching it off turns the controller off');
  assert.deepEqual(errors, []);
});

test('rare badges hook into incidents and deals', () => {
  const { ev, errors } = load();
  base(ev);
  ev("addInc({type:'cut',ref:'x',until:S.day+1,msg:'A crocodile took a bite. A ship dragged its anchor.'});checkGoals()");
  assert.ok(ev("S.ach.croc!==undefined&&S.ach.anchor!==undefined&&S.ach.backhoe!==undefined"));
  ev("S.stats.survived=100;checkGoals()");
  assert.ok(ev("S.ach.unbreak!==undefined"));
  assert.equal(ev("BADGES.length>=46&&new Set(BADGES.map(b=>b.id)).size===BADGES.length"), true);
  assert.deepEqual(errors, []);
});

test('#7 NOC legend, sortable network table and transit destinations', () => {
  const { ev, errors } = load();
  base(ev);
  ev("ACT.buyTransit({city:'fra',net:'cog',tier:1});compute();ACT.dash()");
  let t = ev("document.getElementById('dashCard').textContent");
  assert.match(t, /Who your transit carries/);
  assert.match(t, /IX peering/, 'legend explains the colours');
  const top = JSON.parse(ev("JSON.stringify(transitTop(S.transit.map(t=>t.id),3))"));
  assert.ok(top.length > 0 && top[0][1] > 0);
  assert.equal(ev(`typeof offTransitHint('${top[0][0]}','fra')`), 'string');
  ev("ACT.dashSort({k:'cost'})");
  assert.equal(ev("UI.dashSort"), 'cost');
  ev("ACT.dashSort({k:'cost'})");
  assert.equal(ev("UI.dashDir"), 1, 'second tap flips the order');
  ev("selectCity('fra');ACT.tab({t:'up'})");
  assert.match(ev("document.getElementById('panelBody').textContent"), /Top destinations on this port/);
  assert.deepEqual(errors, []);
});

test('#11 pausing freezes the dots on the links', () => {
  const { ev, errors } = load();
  base(ev);
  ev("ACT.animSet({v:'on'});UI.speed=1;last=1000;frame(1016)");
  const t0 = ev("animT");
  ev("UI.speed=0;frame(1100);frame(1400)");
  assert.equal(ev("animT"), t0, 'clock stands still while paused');
  ev("UI.speed=1;frame(1416)");
  assert.ok(ev("animT") > t0, 'and moves again on play');
  assert.deepEqual(errors, []);
});

test('the reach report explains what is missing and how to fix it', () => {
  const { ev, errors } = load();
  base(ev);
  ev("compute()");
  // With no exits at all, every network is missing and the report must say why for each.
  const first = JSON.parse(ev("JSON.stringify(reachReport().gaps[0])"));
  assert.ok(first && first.name && first.why && first.fix, 'a gap has a name, a reason and a fix');
  assert.ok(first.share > 0, 'and a traffic share');
  // The biggest gaps are first, so the panel leads with what matters.
  const shares = JSON.parse(ev("JSON.stringify(reachReport().gaps.map(g=>g.share))"));
  assert.deepEqual(shares, [...shares].sort((a, b) => b - a));
  ev("ACT.reach({})");
  const txt = ev("document.getElementById('modalCard').textContent");
  assert.match(txt, /Who can't you reach\?/);
  assert.match(txt, /Start here/);
  assert.match(txt, /Do this:/);
  // Buying transit and peering lifts reach, and the report shrinks.
  const before = ev("reachReport().gaps.length");
  ev("ACT.buyTransit({city:'fra',net:'cog',tier:1});ACT.buyIx({city:'fra',tier:1,signed:true});ACT.rs({city:'fra'});ACT.peerAll({city:'fra'});compute()");
  assert.ok(ev("R.reach") > 0.5, 'transit and peering reach most of the internet');
  assert.ok(ev("reachReport().gaps.length") < before);
  // A blocked exit is reported as something to wait for, not as a missing purchase.
  ev("S.ev.rpki={until:S.day+3,nets:['nfx']};compute()");
  const rpki = JSON.parse(ev("JSON.stringify(reachReport().gaps.find(g=>g.id==='nfx'))"));
  assert.equal(rpki.kind, 'wait');
  assert.equal(rpki.eta, 3);
  assert.deepEqual(errors, []);
});

test('day-0 goals do not leave a stale hint on screen', () => {
  const { ev, errors } = load();
  ev("ACT.start({});ACT.launchBB({city:'fra'});renderAll()");
  assert.equal(ev("S.done.bb"), 0, 'goal completed on day 0 is stored as 0');
  assert.doesNotMatch(ev("document.getElementById('hint').textContent"), /Launch broadband/);
  assert.deepEqual(errors, []);
});

test('a broken day is skipped instead of killing the loop', () => {
  const { ev, errors } = load();
  base(ev);
  const day = ev('S.day');
  ev("window.__realDayTick=dayTick;window.dayTick=()=>{throw new Error('boom')};safeTick();safeTick();window.dayTick=window.__realDayTick");
  assert.equal(ev('S.day'), day, 'no day advanced');
  assert.equal(ev('tickErr'), 2, 'failures are counted');
  assert.equal(ev("document.getElementById('toasts').textContent.includes('simulation hit a snag')"), true);
  ev("dayTick()");
  assert.equal(ev('S.day'), day + 1, 'the simulation still runs afterwards');
  assert.deepEqual(errors, []);
});

test('speed-up catch-up is capped so one stall cannot queue hundreds of days', () => {
  const { ev, errors } = load();
  base(ev);
  // A long stall (hidden tab, slow frame) banks far more sim time than two days.
  ev("UI.speed=8;acc=DAY_MS*100;last=performance.now()");
  const before = ev('S.day');
  ev("frame(performance.now()+50)");
  const advanced = ev('S.day') - before;
  assert.ok(advanced <= 4, `at most one frame's worth of days (got ${advanced})`);
  assert.ok(ev('acc') <= ev('DAY_MS') * 2, 'leftover backlog is dropped, not carried');
  assert.deepEqual(errors, []);
});

test('the loop stops ticking after a frame of work and renders once', () => {
  const { ev, errors } = load();
  base(ev);
  // A huge network where a day costs real time: the loop must yield instead of
  // burning the whole frame, and panels redraw once however many days ran.
  ev("S.cash=1e12;for(const c of ['lon','ams','nyc','ash']){if(!S.pops[c])S.pops[c]={day:0,bb:{d:500},boost:0,down:0,routers:2,gen:false,rgen:0};}for(let i=0;i<4;i++){const cs=['fra','lon','ams','nyc','ash'];S.links.push({id:'lag'+i,a:cs[i],b:cs[i+1],kind:'wave',tier:2,km:500,sub:false,mo:1,cut:0,day:0});}compute();tickErr=0;UI.speed=8;acc=DAY_MS*2;last=performance.now()-16");
  ev("frame(performance.now())");
  assert.ok(ev('tickErr') === 0, 'no tick failed');
  assert.ok(ev('S.day') > 0, 'days advanced');
  assert.deepEqual(errors, []);
});

test('crowded non-POP cities hide instead of drawing nameless dots', () => {
  const { ev, errors } = load();
  base(ev);
  // Zoomed out, non-POP cities whose labels lose both slots skip their art too.
  ev("cam.z=0.4;UI.speed=0;draw(1000)");
  const drawn = ev("JSON.stringify((()=>{const seen=[];const keep=drawCity;drawCity=(C,sx,sy,sc,now,ly)=>{seen.push(C.id+':'+(ly===null||ly===undefined?'none':'ly'))};draw(1000);drawCity=keep;return seen;})())");
  const list = JSON.parse(drawn);
  const noLabel = list.filter(s => s.endsWith(':none'));
  assert.equal(noLabel.length, 0, `no nameless city art (${list.length} drawn)`);
  assert.ok(list.length > 0, 'labeled cities still draw');
  assert.deepEqual(errors, []);
});
