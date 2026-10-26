const fs=require('fs');
for(const l of ['it','pt']){
  const d=JSON.parse(fs.readFileSync(`/tmp/m-${l}.json`,'utf8'));
  console.log('==',l,'keep',Object.keys(d.keep).length,'missing',d.missing.length);
  for(const m of d.missing)console.log('   ',JSON.stringify(m));
}
