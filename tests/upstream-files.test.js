const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');

// Files that came from upstream and vanished once during a merge, then had to be
// recovered with `git checkout origin/main -- ...`. They are pinned here so the
// next merge that drops them fails the suite instead of shipping quietly.
//
// If upstream intentionally deletes one of these, delete its line in the same
// commit. Never delete a line just to make this test green.
const REQUIRED = [
  // agent instructions and skills
  'CLAUDE.md',
  '.claude/skills/add-strings/SKILL.md',
  '.claude/skills/performance/SKILL.md',
  '.claude/skills/release/SKILL.md',
  '.claude/skills/write-tests/SKILL.md',
  // repository housekeeping
  'LICENSE',
  'CONTRIBUTING.md',
  'docs/ARCHITECTURE.md',
  // CI and issue templates
  '.github/pull_request_template.md',
  '.github/ISSUE_TEMPLATE/1-bug.yml',
  '.github/ISSUE_TEMPLATE/2-feature.yml',
  '.github/ISSUE_TEMPLATE/3-balance.yml',
  '.github/ISSUE_TEMPLATE/4-translation.yml',
  '.github/ISSUE_TEMPLATE/config.yml',
  '.github/workflows/auto-release.yml',
  '.github/workflows/perf.yml',
  '.github/workflows/perf-comment.yml',
  // performance tooling
  'scripts/perf-bench.js',
  'scripts/perf-fixture.js',
  // translations
  'site/i18n/pt.js',
  // tests and their fixtures
  'tests/fixtures/big-network.json',
  'tests/helpers/reference-allocation.js',
  'tests/routing-reference.test.js',
  'tests/speed.test.js',
];

test('upstream files that once vanished in a merge are still here', () => {
  const missing = REQUIRED.filter((rel) => !fs.existsSync(path.join(root, rel)));
  assert.deepEqual(missing, [], `missing upstream files:\n  ${missing.join('\n  ')}`);
});

test('every pinned upstream file is a regular file, not an empty stub', () => {
  const bad = [];
  for (const rel of REQUIRED) {
    const abs = path.join(root, rel);
    if (!fs.existsSync(abs)) continue; // reported by the test above
    const st = fs.statSync(abs);
    if (!st.isFile()) bad.push(`${rel}: not a regular file`);
    else if (st.size === 0) bad.push(`${rel}: empty`);
  }
  assert.deepEqual(bad, [], `unusable upstream files:\n  ${bad.join('\n  ')}`);
});

test('the CI workflow and the issue template config are pinned, not just the directories', () => {
  // The whole .github/ tree disappeared at once, so checking only that the
  // directory exists would still pass with the workflows deleted and a stray
  // file left behind. Pin the entry points that actually matter.
  for (const rel of ['.github/workflows/ci.yml', '.github/workflows/release.yml', '.github/ISSUE_TEMPLATE/config.yml']) {
    assert.ok(fs.existsSync(path.join(root, rel)), `${rel} is present`);
  }
  const ci = fs.readFileSync(path.join(root, '.github/workflows/ci.yml'), 'utf8');
  assert.match(ci, /npm test|node --test/, 'the CI workflow still runs the test suite');
});
