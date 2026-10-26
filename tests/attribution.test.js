const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

// The upstream project credits Thomas Kjær Aabo's "How the Internet Works" as the guide the
// game is modelled on: in README.md, in site/llms.txt, and on the title, help and victory
// screens. The 1.27.0 upstream merge silently dropped all three from this fork, which is the
// exact failure these tests exist to prevent: a fork that keeps the code and the MIT licence
// but stops telling players whose work it is built on. If you are here because a test failed,
// do not delete the test — put the credit back.
const root = path.join(__dirname, '..');
const read = (...p) => fs.readFileSync(path.join(root, ...p), 'utf8');

const AUTHOR = 'Thomas Kjær Aabo';
const GUIDE = 'https://tkjaer.github.io/how-the-internet-works/';

test('README.md credits the guide and its author', () => {
  const md = read('README.md');
  assert.ok(md.includes('## Learn how it really works'), 'the "Learn how it really works" section is gone');
  assert.ok(md.includes(AUTHOR), `README.md no longer names ${AUTHOR}`);
  assert.ok(md.includes(GUIDE), 'README.md no longer links the guide');
  assert.ok(md.includes('https://github.com/tkjaer/how-the-internet-works'), 'the guide source link is gone');
});

test('site/llms.txt credits the guide and its author', () => {
  const txt = read('site', 'llms.txt');
  assert.ok(txt.includes('## Learn how the internet really works'), 'the llms.txt credit section is gone');
  assert.ok(txt.includes(AUTHOR), `site/llms.txt no longer names ${AUTHOR}`);
  assert.ok(txt.includes(GUIDE), 'site/llms.txt no longer links the guide');
});

test('the game itself links the guide from the title, help and victory screens', () => {
  const html = read('site', 'index.html');
  assert.ok(html.includes(`const HTIW='${GUIDE}'`), 'the HTIW constant is gone from index.html');
  assert.ok(html.includes(AUTHOR), `index.html no longer names ${AUTHOR}`);
  assert.ok(html.includes('How the Internet Works'), 'the in-game plug no longer names the guide');
  const uses = (html.match(/\$\{plugHtml\(/g) || []).length;
  assert.ok(uses >= 3, `the plug is only rendered ${uses} time(s); title, help and victory all need it`);
  // The stylesheet for the plug survived the merge on its own; if it is dropped the credit
  // renders as unstyled text and the next reader deletes it as cruft.
  assert.ok(html.includes('.plug{display:flex'), 'the .plug stylesheet is gone');
});

test('every language dictionary translates the in-game credit, so no screen shows English', () => {
  const dir = path.join(root, 'site', 'i18n');
  const keys = [
    'Want to know how it really works?',
    `The real thing, by ${AUTHOR}: a zoomable, interactive map of how your packets actually travel, from Wi-Fi to undersea fiber, today, in 2010 and in 1995. This game makes it up as it goes. That one gets it right.`,
    'The real thing: follow a packet from Wi-Fi to undersea fiber.',
    'Explore →',
  ];
  for (const file of fs.readdirSync(dir).filter((f) => f.endsWith('.js'))) {
    const src = fs.readFileSync(path.join(dir, file), 'utf8');
    for (const key of keys) {
      assert.ok(src.includes(JSON.stringify(key)), `${file} is missing a translation for ${JSON.stringify(key.slice(0, 60))}`);
    }
  }
});

test('the upstream MIT licence and its copyright holder ship with the fork', () => {
  const licence = read('LICENSE');
  assert.match(licence, /MIT License/);
  assert.match(licence, /Copyright \(c\) 2026 Frederic Jung/, 'the upstream copyright line is gone');
  const pkg = JSON.parse(read('package.json'));
  assert.equal(pkg.license, 'MIT');
  assert.match(pkg.repository.url, /fjaeckel\/seriesoftubes/, 'package.json no longer points at upstream');
});

test('the credit survives the build, in the files a player and a crawler actually get', () => {
  const os = require('node:os');
  const { execFileSync } = require('node:child_process');
  const OUT = fs.mkdtempSync(path.join(os.tmpdir(), 'tubes-attr-'));
  execFileSync('bash', ['scripts/build.sh'], { cwd: root, env: { ...process.env, OUT, VERSION: '9.9.9', BUILD_DATE: '2030-01-01' } });
  assert.ok(fs.readFileSync(path.join(OUT, 'llms.txt'), 'utf8').includes(AUTHOR), 'the built llms.txt lost the credit');
  assert.ok(fs.readFileSync(path.join(OUT, 'index.html'), 'utf8').includes(AUTHOR), 'the built index.html lost the credit');
});
