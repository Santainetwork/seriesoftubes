const fs=require('fs'),{execSync}=require('child_process');
const {sourceKeys,loadDict,brokenEntries}=require('./scripts/i18n-check');
const html=fs.readFileSync('site/index.html','utf8');
const K=new Set([...sourceKeys(html)]);
const vm=require('vm');
function dictOf(src){const w={};vm.runInNewContext(src,{window:w});const l=Object.keys(w.I18N)[0];return w.I18N[l];}
const upSrc=execSync('git show 92b24fd:site/index.html',{maxBuffer:1e8}).toString();
const upKeys=sourceKeys(upSrc);
const upDicts={};
for(const f of fs.readdirSync('site/i18n').filter(f=>f.endsWith('.js'))){
  const l=f.replace(/\.js$/,'');
  try{upDicts[l]=dictOf(execSync(`git show 92b24fd:site/i18n/${f}`,{maxBuffer:1e8}).toString());}catch(e){}
}
// upstream strings that this fork does not use, and upstream really translates
const translatedUpstream=new Set();
for(const l in upDicts)for(const k of Object.keys(upDicts[l]))if(upKeys.has(k))translatedUpstream.add(k);
const unported=[...translatedUpstream].filter(k=>!K.has(k)).sort();
console.log('unported size',unported.length);
fs.writeFileSync('/tmp/unported-new.json',JSON.stringify({unported},null,1));
for(const l of ['it','pt']){
  const fork=dictOf(execSync(`git show main:site/i18n/${l}.js`,{maxBuffer:1e8}).toString());
  const up=upDicts[l];
  const merged={...fork,...up};   // upstream wins on shared keys (its translation is newer)
  const U=new Set(unported);
  const keep={},drop=[];
  for(const k of Object.keys(merged)){
    if(K.has(k)||U.has(k))keep[k]=merged[k];else drop.push(k);
  }
  const missing=[...K].filter(k=>!(k in keep));
  console.log(l,'merged',Object.keys(merged).length,'keep',Object.keys(keep).length,'drop',drop.length,'missing',missing.length);
  for(const m of missing)console.log('   MISSING',JSON.stringify(m));
  for(const d of drop)console.log('   DROP',JSON.stringify(d));
  fs.writeFileSync(`/tmp/keep-${l}.json`,JSON.stringify({keep,missing,drop},null,1));
}
