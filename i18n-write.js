const fs=require('fs'),{execSync}=require('child_process');
const {sourceKeys,loadDict,brokenEntries}=require('./scripts/i18n-check');
const vm=require('vm');
const dictOf=s=>{const w={};vm.runInNewContext(s,{window:w});return w.I18N[Object.keys(w.I18N)[0]];};
const K=new Set([...sourceKeys(fs.readFileSync('site/index.html','utf8'))]);
const upKeys=sourceKeys(execSync('git show 92b24fd:site/index.html',{maxBuffer:1e8}).toString());
const translatedUpstream=new Set();
for(const f of fs.readdirSync('site/i18n').filter(f=>f.endsWith('.js'))){
  try{const d=dictOf(execSync(`git show 92b24fd:site/i18n/${f}`,{maxBuffer:1e8}).toString());
    for(const k of Object.keys(d))if(upKeys.has(k))translatedUpstream.add(k);}catch(e){}
}
const U=new Set([...translatedUpstream].filter(k=>!K.has(k)));

const NEW={
 it:{
  "<b>{cache} is not built in {city}.</b><br>They only deploy in cities where several ISPs already peer.":"<b>{cache} non è presente a {city}.</b><br>Si installano solo nelle città dove più ISP fanno già peering.",
  "Play in":"Gioca in",
  "Recover a saved network ({n})":"Recupera una rete salvata ({n})",
  "Your role":"Il tuo ruolo",
  "cities":"città",
  "cables":"cavi",
  "full rules":"regole complete",
  "local rules":"regole locali",
 },
 pt:{
  "<b>{cache} is not built in {city}.</b><br>They only deploy in cities where several ISPs already peer.":"<b>{cache} não está instalado em {city}.</b><br>Eles só instalam em cidades onde vários ISPs já fazem peering.",
  "At today's growth this city fills its routers in {n} {unit} ({eye} of {cap}). Upgrade in Infra before then.":"No ritmo de crescimento atual, esta cidade enche os roteadores em {n} {unit} ({eye} de {cap}). Faça o upgrade em Infra antes disso.",
  "Play in":"Jogar em",
  "Recover a saved network ({n})":"Recuperar uma rede salva ({n})",
  "Routers are at their limit. Traffic is being dropped now — upgrade the router in Infra.":"Os roteadores estão no limite. O tráfego está sendo descartado agora — faça upgrade do roteador em Infra.",
  "Your role":"Seu papel",
  "cables":"cabos",
  "cities":"cidades",
  "day":"dia",
  "days":"dias",
  "full rules":"regras completas",
  "local rules":"regras locais",
 },
};
const HEAD={
 it:'// Italian. Keys are the English text exactly as passed to tr()/trn()/N_() in index.html (or as it stands\n// in its data-i18n markup, aria-label or title); check with: npm run i18n:check\n(window.I18N=window.I18N||{}).it={',
 pt:'// Portuguese (Brazil). Keys are the English text exactly as passed to tr()/trn()/N_() in index.html (or as it stands\n// in its data-i18n markup, aria-label or title); check with: npm run i18n:check\n(window.I18N=window.I18N||{}).pt={',
};
for(const l of ['it','pt']){
  const mainD=dictOf(execSync(`git show main:site/i18n/${l}.js`,{maxBuffer:1e8}).toString());
  const cur=loadDict(`site/i18n/${l}.js`);
  const merged={...cur,...mainD};   // the fork's own wording wins on shared keys
  const out={};
  for(const k of Object.keys(merged)) if(K.has(k)||U.has(k)) out[k]=merged[k];
  for(const [k,v] of Object.entries(NEW[l])) if(!(k in out)) out[k]=v;
  const broken=brokenEntries(out);
  const missing=[...K].filter(k=>!(k in out));
  const unused=Object.keys(out).filter(k=>!K.has(k)&&!U.has(k));
  console.log(l,'keys',Object.keys(out).length,'missing',missing.length,'unused',unused.length,'broken',broken.length);
  if(missing.length)console.log('  MISSING',missing);
  if(broken.length)console.log('  BROKEN',broken);
  if(unused.length)console.log('  UNUSED',unused);
  const body=Object.keys(out).map(k=>JSON.stringify(k)+':'+JSON.stringify(out[k])).join(',\n');
  fs.writeFileSync(`site/i18n/${l}.js`,HEAD[l]+'\n'+body+',\n};\n');
}
