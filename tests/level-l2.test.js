// Level ladder: a private circuit is traffic too.
//
// Three defects, all of them visible only to a hosting outfit (whose products are mostly L2):
//  1. S.stats.peak was fed from R.served only, and R.served only ever receives IP traffic. An
//     on-ramp or AI interconnect moved hundreds of gigabits, paid for them, and never raised the
//     customer level — so a hosting player stayed at level 1 forever.
//  2. The L2 block in compute() ran before the IP flows, so a 400G circuit ate the whole chassis
//     and the IP customers in the same POP got nothing. Peak traffic then *fell* when a big
//     circuit was signed.
//  3. A restricted role drew straight from its own type list and ignored the level each customer
//     type asks for: a level-1 hosting outfit could sign an AI interconnect that unlocks at 4.
// Run: node --test tests/level-l2.test.js
const test = require('node:test');
const assert = require('node:assert/strict');
const { load } = require('./harness');

// A hosting outfit with three POPs and two 400G waves between them, no transit yet.
function hosting(ev) {
  ev("beginGame('H','fra',{region:'global',role:'hosting'});S.cash=1e9;S.lvl=1;S.stats.peak=0;S.stats.peakL2=0");
  ev("ACT.buildPop({city:'ams'});ACT.buildPop({city:'lon'})");
  ev("S.links.push({id:'w1',a:'fra',b:'ams',kind:'wave',tier:2,km:500,mo:0,cut:0,day:0})");
  ev("S.links.push({id:'w2',a:'fra',b:'lon',kind:'wave',tier:2,km:700,mo:0,cut:0,day:0})");
  ev('compute()');
}

const onramp = (id, bw) =>
  `{id:'${id}',city:'fra',city2:'ams',name:'Cloud Nine on-ramp',type:'onramp',bw:${bw},rate:900,reqs:[],mood:100,since:0,route:'normal'}`;

test('an L2 circuit raises peak traffic, and with it the customer level', () => {
  const { ev, errors } = load();
  hosting(ev);
  assert.equal(ev('Object.keys(S.pops).length'), 3);
  assert.equal(ev('custLevel()'), 1, 'three POPs and no traffic is still level 1');

  ev(`S.biz.push(${onramp('o1', 400)});compute()`);
  assert.equal(ev('R.egT.l2'), 400, 'the circuit is delivered end to end');
  assert.equal(ev('R.served'), 0, 'and it is not IP traffic, so R.served stays empty');

  ev('dayTick()');
  assert.equal(ev('S.stats.peak'), 0, 'IP peak is untouched');
  assert.equal(ev('S.stats.peakL2'), 400, 'the L2 peak is recorded separately');
  assert.equal(ev('peakTraffic()'), 400);
  assert.equal(ev('custLevel()'), 2, '200 Gbps of anything is level 2');
  assert.equal(ev('S.lvl'), 2, 'and the level-up fired');
  assert.deepEqual(errors, []);
});

test('a big circuit no longer starves the IP customers in the same chassis', () => {
  const { ev, errors } = load();
  // One 400G chassis in Frankfurt: router 0 forwards 400G and takes 100G ports.
  ev("beginGame('H','fra',{region:'global',role:'hosting'});S.cash=1e9;S.lvl=3");
  ev("ACT.buildPop({city:'ams'})");
  ev("S.pops.fra.rgen=0;S.pops.ams.rgen=0");
  ev("S.links.push({id:'w1',a:'fra',b:'ams',kind:'wave',tier:2,km:500,mo:0,cut:0,day:0})");
  ev("ACT.buyTransit({city:'fra',net:'cog',tier:1})");
  // 40G of ordinary IP hosting in Frankfurt, plus a 400G private circuit over the same box.
  ev("S.biz.push({id:'h1',city:'fra',city2:null,name:'Rack Renters',type:'host',bw:40,rate:60,reqs:[],mood:100,since:0,route:'normal'})");
  ev(`S.biz.push(${onramp('o1', 400)});compute()`);

  assert.equal(ev('R.cityDem.fra'), 40);
  assert.ok(ev('R.served') > 39, `IP traffic survived the circuit (${ev('R.served')})`);
  assert.ok(ev('R.citySrv.fra') > 39, 'the Frankfurt customers are served');
  assert.ok(ev('R.egT.l2') > 300 && ev('R.egT.l2') < 400, `the circuit takes the leftovers (${ev('R.egT.l2')})`);
  assert.ok(ev('R.egT.l2') + ev('R.served') <= 400 + 1e-6, 'and together they fit the chassis');
  assert.deepEqual(errors, []);
});

test('IP is allocated first when a wave, not a chassis, is the bottleneck', () => {
  const { ev, errors } = load();
  ev("beginGame('H','fra',{region:'global',role:'hosting'});S.cash=1e9;S.lvl=3");
  ev("ACT.buildPop({city:'ams'});for(const c in S.pops)S.pops[c].rgen=3");
  // One 400G wave fra–ams. The IP customer sits in Amsterdam, the transit port in Frankfurt,
  // so its traffic has to cross that wave; so does the private circuit.
  ev("S.links.push({id:'w1',a:'fra',b:'ams',kind:'wave',tier:2,km:500,mo:0,cut:0,day:0})");
  ev("ACT.buyTransit({city:'fra',net:'cog',tier:2})");
  ev("S.biz.push({id:'h1',city:'ams',city2:null,name:'Rack Renters',type:'host',bw:100,rate:60,reqs:[],mood:100,since:0,route:'normal'})");
  ev(`S.biz.push(${onramp('o1', 400)});compute()`);
  assert.ok(ev('R.citySrv.ams') > 90, `the 100G of IP got through (${ev('R.citySrv.ams')})`);
  assert.ok(ev('R.egT.l2') > 290 && ev('R.egT.l2') < 301, `the circuit gets 300G of the 400G wave (${ev('R.egT.l2')})`);
  assert.ok(ev('R.load.w1') <= 400 + 1e-6, 'and the wave is not oversubscribed');
  assert.deepEqual(errors, []);
});

test('a restricted role still obeys the customer level of each type', () => {
  const { ev, errors } = load();
  ev("beginGame('H','fra',{region:'global',role:'hosting'});S.cash=1e9");
  ev("ACT.buildPop({city:'ams'});ACT.buildPop({city:'lon'})");
  const seen = (lv) => JSON.parse(ev(`JSON.stringify((()=>{S.lvl=${lv};const s=new Set();
    for(let i=0;i<1200;i++){S.offers=[];spawnOffer();for(const o of S.offers)s.add(o.type);}
    return [...s].sort();})())`));
  assert.deepEqual(seen(1), ['host'], 'a level-1 hosting outfit sells racks, not AI');
  const at3 = seen(3);
  assert.ok(at3.includes('gpu') && at3.includes('onramp'), `GPU and on-ramp arrive at level 3 (${at3})`);
  assert.equal(at3.includes('ai'), false, 'AI interconnects still wait for level 4');
  const at4 = seen(4);
  for (const t of ['host', 'gpu', 'onramp', 'ai']) assert.ok(at4.includes(t), `${t} at level 4`);

  // The gate is enforced on signing too, not just on spawning.
  ev("S.offers=[{id:'a',city:'fra',city2:'ams',name:'Big Model Co.',type:'ai',bw:400,rate:900,reqs:[],exp:999}]");
  ev('S.lvl=1');
  assert.equal(ev("roleOfferOk(S.offers[0])"), false, 'level 1 cannot sign it');
  assert.equal(ev("typeAtLevel('ai')"), false);
  ev('S.lvl=4');
  assert.equal(ev("roleOfferOk(S.offers[0])"), true, 'level 4 can');
  assert.deepEqual(errors, []);
});

test('a NAP keeps its day-one small ISP work under the level gate', () => {
  const { ev, errors } = load();
  ev("beginGame('N','fra',{region:'global',role:'nap'});S.cash=1e9;S.lvl=1");
  ev("ACT.buildPop({city:'ams'});ACT.buildPop({city:'lon'})");
  assert.equal(ev("typeAtLevel('isp')"), true, 'ISP work is the deliberate exception');
  assert.equal(ev("typeAtLevel('hyper')"), false, 'a hyperscaler DCI is level 4 work');
  assert.equal(ev("typeAtLevel('l2vpn')"), true, 'metro L2VPN is level 1 work');
  const seen = JSON.parse(ev(`JSON.stringify((()=>{const s=new Set();
    for(let i=0;i<800;i++){S.offers=[];spawnOffer();for(const o of S.offers)s.add(o.type);}
    return [...s].sort();})())`));
  assert.ok(seen.includes('isp'), `small ISP jobs still appear (${seen})`);
  for (const t of seen) assert.ok(!['hyper', 'ai'].includes(t), `${t} is level-4 work, not level 1`);
  // Below minPops the NAP still gets the small ISP job, and it still passes the gate.
  ev("delete S.pops.ams;delete S.pops.lon;S.offers=[]");
  assert.equal(ev('roleBlockOffers()'), false);
  const small = JSON.parse(ev("JSON.stringify((()=>{const a=[];for(let i=0;i<200;i++){S.offers=[];spawnOffer();for(const o of S.offers)a.push(o.type)}return a})())"));
  assert.ok(small.length > 0 && small.every((t) => t === 'isp'), 'only small ISP jobs below minPops');
  assert.deepEqual(errors, []);
});

test('signing a big circuit never makes peak traffic fall (the ticket regression)', () => {
  const { ev, errors } = load();
  // Hosting, three POPs, three 40G IP customers: 119 Gbps peak and level 1, exactly as measured.
  ev("beginGame('H','fra',{region:'global',role:'hosting'});S.cash=1e10");
  ev("ACT.buildPop({city:'ams'});ACT.buildPop({city:'lon'});for(const c in S.pops)S.pops[c].rgen=3");
  ev("for(const c of ['fra','ams','lon'])ACT.buyTransit({city:c,net:'cog',tier:2})");
  ev("S.links.push({id:'w1',a:'fra',b:'ams',kind:'wave',tier:2,km:500,mo:0,cut:0,day:0})");
  ev("S.links.push({id:'w2',a:'fra',b:'lon',kind:'wave',tier:2,km:700,mo:0,cut:0,day:0})");
  for (const [id, c] of [['i1', 'fra'], ['i2', 'ams'], ['i3', 'lon']])
    ev(`S.biz.push({id:'${id}',city:'${c}',city2:null,name:'Rack ${id}',type:'host',bw:40,rate:60,reqs:[],mood:100,since:0,route:'normal'})`);
  ev('for(let i=0;i<3;i++)dayTick()');
  const before = ev('peakTraffic()');
  assert.ok(before > 110 && before < 125, `three 40G customers peak at about 119G (${before})`);
  assert.equal(ev('S.lvl||1'), 1, 'still level 1');
  const rev0 = ev('R.revMo');

  ev("S.biz.push({id:'o1',city:'fra',city2:'ams',name:'Awan on-ramp',type:'onramp',bw:400,rate:9000,reqs:[],mood:100,since:0,route:'normal'})");
  ev('for(let i=0;i<3;i++)dayTick()');
  assert.ok(ev('R.revMo') > rev0 * 2, 'the circuit pays properly');
  assert.ok(ev('R.served') > 110, `the IP customers still get their 119G (${ev('R.served')})`);
  assert.ok(ev('peakTraffic()') >= before, `peak did not fall (${before} -> ${ev('peakTraffic()')})`);
  assert.ok(ev('peakTraffic()') >= 400, 'the 400G circuit is what peak traffic now measures');
  assert.equal(ev('S.lvl'), 2, 'and the level followed it');
  assert.deepEqual(errors, []);
});

test('old saves without peakL2 still load, and level 1 is the floor', () => {
  const { ev, errors } = load();
  ev("beginGame('H','fra',{region:'global',role:'hosting'});S.cash=1e9");
  ev("S.stats.peak=500;delete S.stats.peakL2;S=migrate(JSON.parse(JSON.stringify(S)))");
  assert.equal(ev('S.stats.peakL2'), 0, 'the missing field is repaired');
  assert.equal(ev('peakTraffic()'), 500);
  ev("S.stats.peakL2=900;S=migrate(JSON.parse(JSON.stringify(S)))");
  assert.equal(ev('peakTraffic()'), 900, 'the larger of the two wins');
  assert.deepEqual(errors, []);
});
