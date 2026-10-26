// Why did the harness swallow the variants array? Probe the eval environment.
const { load } = require('./harness.js');
const h = load();
h.ev("beginGame('N','jkt',{region:'idn'})");
const v = [{ name: 'a', x: 1 }, { name: 'b', x: 2 }];
const src = `(() => { const VARIANTS=` + JSON.stringify(v) + `; return {type: typeof VARIANTS, isArr: Array.isArray(VARIANTS), len: (VARIANTS&&VARIANTS.length)||-1, json: JSON.stringify(VARIANTS)}; })()`;
console.log('SRC HEAD:', src.slice(0, 80));
const r = h.ev(src);
console.log(JSON.stringify(r));
