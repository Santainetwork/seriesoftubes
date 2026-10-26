const fs=require('fs'),{execSync}=require('child_process');
const {sourceKeys,loadDict}=require('./scripts/i18n-check');
const K=new Set([...sourceKeys(fs.readFileSync('site/index.html','utf8'))]);
const vm=require('vm');
const dictOf=s=>{const w={};vm.runInNewContext(s,{window:w});return w.I18N[Object.keys(w.I18N)[0]];};
const upKeys=sourceKeys(execSync('git show 92b24fd:site/index.html',{maxBuffer:1e8}).toString());
const translatedUpstream=new Set();
for(const f of fs.readdirSync('site/i18n').filter(f=>f.endsWith('.js'))){
  try{const d=dictOf(execSync(`git show 92b24fd:site/i18n/${f}`,{maxBuffer:1e8}).toString());
    for(const k of Object.keys(d))if(upKeys.has(k))translatedUpstream.add(k);}catch(e){}
}
const U=new Set([...translatedUpstream].filter(k=>!K.has(k)));
for(const l of ['it','pt']){
  const mainD=dictOf(execSync(`git show main:site/i18n/${l}.js`,{maxBuffer:1e8}).toString());
  const cur=loadDict(`site/i18n/${l}.js`);
  const merged={...mainD,...cur};
  const keep={},drop=[];
  for(const k of Object.keys(merged)){ if(K.has(k)||U.has(k))keep[k]=merged[k]; else drop.push(k); }
  const missing=[...K].filter(k=>!(k in keep)).sort();
  console.log('=====',l,'merged',Object.keys(merged).length,'keep',Object.keys(keep).length,'drop',drop.length,'missing',missing.length);
  for(const d of drop)console.log('   DROP',JSON.stringify(d));
  for(const m of missing)console.log('   MISSING',JSON.stringify(m));
  fs.writeFileSync(`/tmp/m-${l}.json`,JSON.stringify({keep,missing},null,1));
}
