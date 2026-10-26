// Smoke test for the peering/transit/infra UI pass (kanban t_fae700b8). Not part of the suite.
const { load } = require('./harness');
const { ev, errors } = load();
ev("ACT.start({});S.cash=1e8");
ev("ACT.buildPop({city:'fra'});ACT.buildPop({city:'ams'})");
// Global map: transit sellers in fra. Render each tab and check for output.
ev("selectCity('fra');ACT.tab({t:'up'})");
const up = ev("document.getElementById('panelBody').textContent");
console.log('TRANSIT len', up.length, '| has group headers:', up.includes('Local & regional'), up.includes('Global Tier 1'));
console.log('TRANSIT head:', up.slice(0, 160).replace(/\n/g, ' | '));
// Buy transit so the owned-port branch of transitRow() renders too.
ev("ACT.buyTransit({city:'fra',net:'cog',tier:1})");
ev("ACT.tab({t:'cust'});ACT.tab({t:'up'})");
const up2 = ev("document.getElementById('panelBody').textContent");
console.log('OWNED PORT branch: 95th pct line present:', up2.includes('95th pct'), '| commit present:', up2.includes('commit'));
ev("ACT.tab({t:'peer'})");
const peer = ev("document.getElementById('panelBody').textContent");
console.log('PEER len', peer.length, '| traffic label:', peer.includes('% of traffic'));
ev("ACT.tab({t:'links'})");
const inf = ev("document.getElementById('panelBody').textContent");
console.log('INFRA len', inf.length, '| routers:', inf.includes('Routers'));
// PNI branch: buy one and check the usage kv gets a capacity denominator.
ev("ACT.pni({city:'fra',net:'drz',tier:1})");
ev("ACT.tab({t:'peer'})");
const peer2 = ev("document.getElementById('panelBody').textContent");
console.log('PNI usage with cap:', /PNI\s*\n?\s*[\d.]+[GM]T? ?\/ ?[\d.]+[GM]T?/.test(peer2) || peer2.includes(' / '));
// IX member rows: join an IX so the member list renders, then check the "% of traffic" label.
ev("ACT.buyIx({city:'fra',tier:1,signed:true});ACT.tab({t:'peer'})");
const peer3 = ev("document.getElementById('panelBody').textContent");
console.log('IX member rows with % of traffic label:', peer3.includes('% of traffic'), '| Request buttons:', peer3.includes('Request'));
// Indonesia map: domestic carriers are type t2, so the local group should hold them.
ev("applyRegion('idn');ACT.start({});S.cash=1e8;ACT.buildPop({city:'jkt'})");
ev("selectCity('jkt');ACT.tab({t:'up'})");
const idn = ev("document.getElementById('panelBody').textContent");
const iLoc = idn.indexOf('Local & regional'), iGlo = idn.indexOf('Global Tier 1');
console.log('IDN: local hdr at', iLoc, '> global hdr at', iGlo, '=>', iLoc >= 0 && (iGlo < 0 || iLoc < iGlo));
console.log('runtime errors:', JSON.stringify((errors || []).slice(0, 5)));
