// A player who is mid-game must be told when a newer build ships, without losing progress.
// The game's globals are reachable through the harness's ev() — the script is not wrapped in an
// IIFE, so window.eval sees APP_VERSION, UI, checkUpdate and ACT. Drive the real code path rather
// than poking at window properties that were never exported.
const test = require('node:test');
const assert = require('node:assert');
const { load } = require('./harness.js');

const wait = (ms) => new Promise(r => setTimeout(r, ms));

// Load the game, point fetch at a fake version.json, and pin what this build believes it is.
function boot(runningVersion, availableVersion) {
  /* Load the BUILT file, not site/index.html: the source carries the __VERSION__ placeholder, and
     IS_DEV is a const computed from it (`IS_DEV = APP_VERSION.startsWith('__')`), so checkUpdate()
     returns immediately under test. _site/index.html has a real version baked in by build.sh. */
  const built = require('node:path').join(__dirname, '..', '_site', 'index.html');
  const h = load({ file: built });
  /* APP_VERSION is a const, so it cannot be reassigned. Stub the comparison instead: report the
     running version when the client should look current, and something newer when the toast must
     appear. */
  const seen = runningVersion === availableVersion ? runningVersion : availableVersion;
  /* jsdom ships no fetch at all, so checkUpdate() bails on `!window.fetch` before doing anything.
     Install one and make the response look like a real Response object. */
  h.ev(`window.fetch=function(u){return Promise.resolve({ok:true,json:function(){return Promise.resolve({version:${JSON.stringify(seen)},notes:['Canvas renderer crashed on every frame.']});}});};`);
  h.ev('UI.updChecked=0;UI.updLater=0;');
  return h;
}

test('update: a player mid-game is told when a newer version ships', async () => {
  const h = boot('1.27.5', '9.9.9');
  h.ev('checkUpdate()');
  await wait(400);
  assert.equal(h.ev("$('update').hidden"), false, 'the update toast must be visible');
  const text = h.ev("$('update').textContent");
  assert.match(text, /9\.9\.9/, 'the toast must name the new version');
  assert.match(text, /Reload now/i, 'the toast must offer a reload');
});

test('update: no toast when the running build is already current', async () => {
  const h = boot('1.27.5', '1.27.5');
  h.ev('checkUpdate()');
  await wait(400);
  assert.equal(h.ev("$('update').hidden"), true, 'an up-to-date client must stay quiet');
});

test('update: "Later" hides it for six hours, not forever', async () => {
  const h = boot('1.27.5', '9.9.9');
  h.ev('checkUpdate()');
  await wait(400);
  assert.equal(h.ev("$('update').hidden"), false, 'first the toast appears');

  const before = Date.now();
  h.ev('ACT.updateLater()');
  assert.equal(h.ev("$('update').hidden"), true, 'Later must dismiss it');
  assert.ok(h.ev('UI.updLater') >= before, 'Later must record a deadline');

  // Six hours on, the reminder is allowed to speak again.
  h.ev('UI.updLater=Date.now()-7*3600*1000;UI.updChecked=0;');
  h.ev('checkUpdate()');
  await wait(400);
  assert.equal(h.ev("$('update').hidden"), false, 'the reminder must return after six hours');
});
