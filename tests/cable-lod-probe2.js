// How many pairs the km>=1000 LOD keeps, idn and global.
const { load } = require('./harness.js');
const h = load();
const out = {};
for (const [tag, setup] of [['idn', "beginGame('N','jkt',{region:'idn'})"], ['global', "beginGame('N','sin',{})"]]) {
  h.ev(setup);
  out[tag] = h.ev(`JSON.stringify({
    n: CABLE_PAIRS.length,
    majors: CABLE_PAIRS.filter(p=>p.km>=1000).length,
    pairsUnder1000: CABLE_PAIRS.filter(p=>p.km<1000).map(p=>p.cid+':'+p.a+'-'+p.b).slice(0,40)
  })`);
}
console.log(out.idn);
console.log(out.global);
