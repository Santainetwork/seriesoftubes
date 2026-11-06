const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

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
  // The page is assembled from src/ at build (docs/adr/0002): the credit lives in src/, not in a
  // checked-in site/index.html. Count plugHtml( uses across the modal sources instead.
  let uses = 0;
  const walk = (dir) => { for (const f of fs.readdirSync(dir, { withFileTypes: true })) { const p = path.join(dir, f.name); if (f.isDirectory()) walk(p); else if (p.endsWith('.js')) uses += (fs.readFileSync(p, 'utf8').match(/\$\{plugHtml\(/g) || []).length; } };
  walk(path.join(root, 'src', 'game'));
  const src = read('src', 'game', '95-modals', '30-modal-and-names.js');
  assert.ok(src.includes(`const HTIW='${GUIDE}'`), 'the HTIW constant is gone');
  assert.ok(src.includes('the_real_thing_by_thomas_kj'), `the plug no longer names ${AUTHOR} (label key gone)`);
  assert.ok(src.includes('how_the_internet_works'), 'the in-game plug no longer names the guide (label key gone)');
  assert.ok(uses >= 3, `the plug is only rendered ${uses} time(s); title, help and victory all need it`);
  // The stylesheet for the plug survived the merge on its own; if it is dropped the credit
  // renders as unstyled text and the next reader deletes it as cruft.
  const css = read('src', 'styles', '40-modal.css');
  assert.ok(css.includes('.plug{display:flex'), 'the .plug stylesheet is gone');
});

test('every language dictionary translates the in-game credit, so no screen shows English', () => {
  // Dictionaries are label-keyed (docs/adr/0003): the English text is the key in src/i18n/en.js,
  // the translation the value in site/i18n/<lang>.js. Every key present in English must have a
  // non-empty translation in every language.
  const keys = [
    'help.want_to_know_how_it_really',
    'modal_and_names.the_real_thing_by_thomas_kj',
    'modal_and_names.the_real_thing_follow_a_packet',
    'modal_and_names.how_the_internet_works',
    'common.explore',
  ];
  for (const file of fs.readdirSync(path.join(root, 'site', 'i18n')).filter((f) => f.endsWith('.js'))) {
    const src = fs.readFileSync(path.join(root, 'site', 'i18n', file), 'utf8');
    for (const key of keys) {
      const m = src.match(new RegExp('"' + key.replace(/\./g, '\\.') + '":"((?:[^"\\\\]|\\\\.)*)"'));
      assert.ok(m && m[1].length > 0, `${file} is missing a translation for ${key}`);
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
  const OUT = fs.mkdtempSync(path.join(os.tmpdir(), 'tubes-attr-'));
  execFileSync(process.execPath, ['scripts/build.js'], { cwd: root, env: { ...process.env, OUT, VERSION: '9.9.9', BUILD_DATE: '2030-01-01' } });
  assert.ok(fs.readFileSync(path.join(OUT, 'llms.txt'), 'utf8').includes(AUTHOR), 'the built llms.txt lost the credit');
  assert.ok(fs.readFileSync(path.join(OUT, 'index.html'), 'utf8').includes(AUTHOR), 'the built index.html lost the credit');
});
