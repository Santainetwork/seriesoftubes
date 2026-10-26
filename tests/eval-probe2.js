// Probe: does a function named runVariant / map inside a bigger IIFE break? Try the exact
// experiment body with a tiny variants array and catch where it goes wrong.
const { load } = require('./harness.js');
const h = load();
h.ev("beginGame('N','jkt',{region:'idn'})");
h.ev("window.__ORIG=new Map();for(const cp of CABLE_PAIRS)window.__ORIG.set(cp,cp.pts.map(q=>q.slice()));");
h.ev("const ORIG=window.__ORIG;");
const src = `
  const ORIG=window.__ORIG;
  function runVariant(o){
    for(const cp of CABLE_PAIRS)cp.pts=ORIG.get(cp).map(q=>q.slice());
    return {got:o.name, n:CABLE_PAIRS.length};
  }
  const VARIANTS=` + JSON.stringify([{name:'a'},{name:'b'}]) + `;
  return {t:typeof VARIANTS, arr:Array.isArray(VARIANTS), out:VARIANTS.map(v=>runVariant(v))};
`;
const r = h.ev(`(() => { ${src} })()`);
console.log(JSON.stringify(r));
