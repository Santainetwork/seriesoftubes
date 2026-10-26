// The eyeball ceiling is the number every ISP balance decision hangs off: broadband grows toward
// it, revenue is demand x EYE_RATE, and a city that cannot justify the traffic should not pay for
// it. Two structural bugs lived here.
//
// (A) eyeCap was max(cal, hw), so the chassis *created* demand. One Chonk 800 gave all 34
//     Indonesian cities the same 12,800 Gbps ceiling (distinct=1), and Manado — P=50, calibrated
//     ceiling 144 — sold 1,768 Gbps off two Absolute Units, 12.3x what the city justifies.
//     Trimming eyeMul alone would not fix it: 30 of the 34 cities stayed pinned at the Rusty's
//     400 Gbps, because the chassis floor, not the multiplier, was setting the ceiling.
// (B) eyeBoost was not monotone in P and had a dead key. `mks` matched no city (Makassar is
//     `upg`), and `sin`/`upg` had no entry at all, so Singapore defaulted to 1.0 and reported a
//     lower ceiling than Surabaya despite the same P=450.
// Run: node --test tests/prd-eyecap.test.js
const test = require('node:test');
const assert = require('node:assert/strict');
const { load } = require('./harness');

function region(id) {
  const h = load();
  h.ev(`beginGame('N','jkt',{region:'${id}'})`);
  return h;
}
// Every city gets a POP on the given chassis so eyeCap has hardware to read.
const allPops = (ev, g, routers = 1) =>
  ev(`S.pops={};for(const c of ALLC)S.pops[c]={day:0,bb:null,boost:0,down:0,routers:${routers},gen:false,rgen:${g}}`);

test('eyeCap: a big chassis lifts the calibrated ceiling, it does not replace it', () => {
  for (const id of ['sea', 'idn']) {
    const { ev, errors } = region(id);
    // One Chonk 800 per POP used to flatten every city onto 12,800 Gbps.
    allPops(ev, 2);
    const caps = JSON.parse(ev('JSON.stringify(ALLC.map(c=>eyeCap(c)))'));
    const distinct = new Set(caps).size;
    assert.ok(distinct > 10, `${id}: the ceiling must still differ per city, got ${distinct} distinct values`);
    // And a P=50 town must not reach a data-centre ceiling.
    const mdc = ev("eyeCap('mdc')"), mdcCal = ev("Math.round(eyeP('mdc')*eyeMul('mdc'))");
    assert.ok(mdc <= mdcCal * 3, `${id}: Manado ceiling ${mdc} is more than 3x its calibrated ${mdcCal}`);
    assert.deepEqual(errors, []);
  }
});

test('eyeCap: the chassis still lifts a small city past its own calibrated P', () => {
  const { ev, errors } = region('idn');
  allPops(ev, 1); // Edge Lord 400, 3.2 Tbps
  const cal = ev("Math.round(eyeP('smg')*eyeMul('smg'))");
  const cap = ev("eyeCap('smg')");
  assert.ok(cap > cal, `Semarang should be able to fill a 3.2T chassis: ${cap} vs calibrated ${cal}`);
  assert.ok(cap <= cal * 3, `but not without limit: ${cap} vs ${cal * 3}`);
  assert.deepEqual(errors, []);
});

test('eyeCap: never below the calibrated ceiling, never below 1', () => {
  const { ev, errors } = region('idn');
  // A Rusty (400) in Jakarta: the calibrated ceiling is 6,912, so hardware must not cap it.
  ev("S.pops={jkt:{day:0,bb:null,boost:0,down:0,routers:1,gen:false,rgen:0}}");
  assert.ok(ev("eyeCap('jkt')") >= ev("Math.round(eyeP('jkt')*eyeMul('jkt'))"));
  // No POP at all: still a usable number, so the panel and capDays do not divide by zero.
  assert.ok(ev("eyeCap('sby')") >= 1);
  assert.deepEqual(errors, []);
});

test('eyeCap: Manado with two 1.6T chassis stays within 3x of what the city justifies', () => {
  // The card's measured case: 1,768 Gbps served out of a city whose calibrated ceiling is 144.
  const { ev, errors } = region('idn');
  ev("S.pops={mdc:{day:0,bb:{d:1},boost:0,down:0,routers:2,gen:false,rgen:3}}");
  const cal = ev("Math.round(eyeP('mdc')*eyeMul('mdc'))");
  const cap = ev("eyeCap('mdc')");
  assert.equal(cal, 144, 'Manado is still calibrated at 144 Gbps');
  assert.equal(cap, cal * 3, `two Absolute Units give 3x the calibrated ceiling, got ${cap}`);
  assert.ok(cap < 1768, 'and nowhere near the 1,768 Gbps the old formula allowed');
  assert.deepEqual(errors, []);
});

test('eyeBoost: every key is a city on the map', () => {
  for (const id of ['sea', 'idn']) {
    const { ev, errors } = region(id);
    const ids = JSON.parse(ev('JSON.stringify(ALLC)'));
    const boost = JSON.parse(ev(`JSON.stringify(REGION['${id}'].rules.eyeBoost)`));
    const dead = Object.keys(boost).filter(k => !ids.includes(k));
    assert.deepEqual(dead, [], `${id}: eyeBoost has keys that match no city`);
    assert.deepEqual(errors, []);
  }
});

test('eyeBoost: Indonesia has an entry for Singapore and Makassar, and no `mks`', () => {
  const { ev, errors } = region('idn');
  const boost = JSON.parse(ev("JSON.stringify(REGION.idn.rules.eyeBoost)"));
  assert.equal(boost.sin, 2.0, 'Singapore is a capital-sized market, not a default');
  assert.equal(boost.upg, 1.4, 'Makassar carries the eastern hub traffic');
  assert.equal('mks' in boost, false, 'mks was a typo for upg and matched no city');
  assert.deepEqual(errors, []);
});

test('eyeBoost: the calibrated ceiling is monotone in P', () => {
  // A city with more calibrated eyeballs than another can never end up with a smaller ceiling.
  // Before the fix, Singapore (P=450) reported 1,080 while Bandung (P=375) reported 1,530.
  for (const id of ['sea', 'idn']) {
    const { ev, errors } = region(id);
    const rows = JSON.parse(ev(
      'JSON.stringify(ALLC.map(c=>({c,P:CITY[c].P,cal:Math.round(eyeP(c)*eyeMul(c))})))'
    ));
    const bad = [];
    for (const a of rows) for (const b of rows) {
      if (a.c === b.c) continue;
      if (a.P > b.P && a.cal < b.cal) bad.push(`${a.c}(P${a.P})=${a.cal} < ${b.c}(P${b.P})=${b.cal}`);
      if (a.P === b.P && a.cal !== b.cal) bad.push(`equal P${a.P}: ${a.c}=${a.cal} vs ${b.c}=${b.cal}`);
    }
    assert.deepEqual([...new Set(bad)], [], `${id}: eyeBoost is not monotone in P`);
    assert.deepEqual(errors, []);
  }
});

test('eyeBoost: Singapore and Surabaya report the same ceiling, both P=450', () => {
  for (const id of ['sea', 'idn']) {
    const { ev, errors } = region(id);
    assert.equal(
      ev("Math.round(eyeP('sin')*eyeMul('sin'))"),
      ev("Math.round(eyeP('sby')*eyeMul('sby'))"),
      `${id}: Singapore must not be cheaper than Surabaya`
    );
    assert.deepEqual(errors, []);
  }
});

test('eyeMul is untouched: this card only rebalances the ceiling, not the multiplier', () => {
  // Changing eyeMul rebalances every role at once, which is a separate decision. Pin it so this
  // fix cannot quietly become that one.
  const { ev } = load();
  ev("applyRegion('sea')");
  assert.equal(ev('REGION.sea.rules.eyeMul'), 1.9);
  ev("applyRegion('idn')");
  assert.equal(ev('REGION.idn.rules.eyeMul'), 2.4);
});
