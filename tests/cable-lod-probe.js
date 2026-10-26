// Distribution of cable route lengths (for the low-zoom LOD threshold).
const { load } = require('./harness.js');
const h = load();
h.ev("beginGame('N','jkt',{region:'idn'})");
const r = h.ev(`(() => {
  const kms = CABLE_PAIRS.map(p => p.km).sort((a,b)=>a-b);
  const total = CABLE_PAIRS.length;
  const pick = q => kms[Math.floor(q*(kms.length-1))];
  return {total, min:kms[0], p25:pick(.25), median:pick(.5), p75:pick(.75), max:kms[kms.length-1],
    over1000: kms.filter(k=>k>=1000).length, over2000: kms.filter(k=>k>=2000).length,
    over3000: kms.filter(k=>k>=3000).length, over1500: kms.filter(k=>k>=1500).length};
})()`);
console.log(JSON.stringify(r, null, 1));
