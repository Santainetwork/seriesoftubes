// Print the generated body around the VARIANTS line to see what breaks it.
const { execSync } = require('child_process');
// Reuse buildBody by requiring the experiments file is not possible (it runs). Instead:
// extract buildBody via a regex-free trick: read the file, eval only the function definition.
const fs = require('fs');
const src = fs.readFileSync(__dirname + '/cable-experiments.js', 'utf8');
const start = src.indexOf('function buildBody');
const end = src.indexOf('function run(');
const mod = src.slice(start, end) + `
const variants = [{ name: 'x', mode: 'lane', CLANE: 16, env: 'sine' }];
const body = buildBody(JSON.stringify(variants));
const lines = body.split('\\n');
const idx = lines.findIndex(l => l.includes('VARIANTS='));
console.log('CONTEXT:');
for (let i = Math.max(0, idx - 3); i < Math.min(lines.length, idx + 3); i++) console.log(i, JSON.stringify(lines[i]));
`;
eval(mod);
