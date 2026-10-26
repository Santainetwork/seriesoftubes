// Does the fake ctx record stroke? (proxy swallows functions; the #49 test counts strokes fine)
const { load } = require('./harness.js');
const h = load();
h.ev("beginGame('N','jkt',{region:'idn'})");
console.log(h.ev(`JSON.stringify((()=>{
  cam.z=1.2;WL.zAt=0;WL.key=null;worldLayer(1.2);
  UI.sel={type:'city',id:'jkt'};
  const calls = [];
  const s=ctx.stroke;ctx.stroke=function(){calls.push('stroke');return s.apply(this,arguments);};
  drawCables(visibleKs());
  ctx.stroke=s;
  // also check UI.drag isn't interfering and selC resolves
  const selC=UI.drag&&UI.drag.mode==='link'?UI.drag.from:(UI.sel&&UI.sel.type==='city'?UI.sel.id:null);
  return {n:calls.length, selC, uiSel:JSON.stringify(UI.sel)};
})())`));
