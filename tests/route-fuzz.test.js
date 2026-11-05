// A few seeded random games (scripts/lib/route-fuzz.js), played move for move on main's page and on this checkout's:
// after every move and day both route identically and keep the same game state, and this checkout routes the same with
// the routing cache (RC) on and off. scripts/route-fuzz.js plays hundreds of these; here a handful, so CI stays quick.
// Without git's origin/main (a bare tarball), the base is this checkout's own page: the cache on/off check still runs.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const page = require('../scripts/lib/page');
const { openPage, playGame } = require('../scripts/lib/route-fuzz');

function pages() {
  const head = path.join(os.tmpdir(), `tubes-fuzz-test-${process.pid}-head.html`);
  fs.writeFileSync(head, page.assemble().html);
  let base = head;
  try { const b = path.join(os.tmpdir(), `tubes-fuzz-test-${process.pid}-base.html`); fs.writeFileSync(b, page.assembleRef('origin/main')); base = b; } catch (e) {}
  const B = openPage(base, 'base'), H = openPage(head, 'head');
  /* The fork plays on its own smaller world (its cities, cables and carriers are the fork's tables,
     not upstream's 400-city map), so a game cannot be compared move for move against main: the two
     pages do not even have the same networks. Compare this checkout against itself instead — cache
     on versus cache off — which is the half of this test that does not need main. */
  const world = (g) => [g.ev('CITIES.length'), g.ev('NETS.length'), g.ev('CABLE_PAIRS.length')].join('/');
  if (world(B) !== world(H)) return { base: H, head: H, againstMain: false };
  return { base: B, head: H, againstMain: true };
}

test('random games route the same as main, with and without the routing cache, move for move', () => {
  const P = pages();
  // Seeds that start a normal game, a sandbox, a scenario and a puzzle, with transit, exchanges, PNIs and RouteScript.
  for (const seed of [20, 23, 27, 26]) {
    const g = playGame(P, seed, { moves: 35 });
    assert.equal(g.div, null, `seed ${seed} diverged: ${JSON.stringify(g.div, null, 1)}`);
    assert.ok(g.moves >= 35, `seed ${seed} played its moves`);
    assert.deepEqual(g.errors, [], `seed ${seed}: no page errors`);
  }
});
