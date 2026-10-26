// Brief 20 — Komdigi licence for the NAP role in Indonesia.
//
// A NAP does not get its licence on day one. It gets one year to build what it promised, then
// Komdigi audits four cumulative commitments. Failing the audit ends the run, because a NAP
// without a licence cannot legally sell to anyone. These tests pin that contract, plus the fact
// that none of it leaks into another region or another role.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { load } from './harness.js';

function napGame(ev) {
  ev("ensureRegion('idn');ACT.pickRegion({id:'idn'});UI.role='nap';ACT.start({})");
  assert.equal(ev('S.role'), 'nap');
  assert.equal(ev('S.region'), 'idn');
}

function buildNetwork(ev) {
  ev("S.links.push({a:'jkt',b:'sby',km:700,kind:'wave'})");
  ev("S.links.push({a:'jkt',b:'bdg',km:150,kind:'df',own:false})");
  ev("S.transit.push({net:'drz',tier:3,n:1})");
  ev("S.transit.push({net:'sgt',tier:3,n:1})");
}

test('komdigi: a NAP in Indonesia starts with Rp 100 juta and one year of grace', () => {
  const { ev, errors } = load();
  napGame(ev);
  assert.equal(ev('S.cash'), 100000);
  assert.equal(ev('S.komdigi.audit'), 360);
  assert.equal(ev('S.komdigi.licensed'), false);
  assert.deepEqual(errors, []);
});

test('komdigi: other regions and other roles are untouched', () => {
  const { ev } = load();
  ev("ensureRegion('sea');ACT.pickRegion({id:'sea'});UI.role='nap';ACT.start({})");
  assert.equal(ev('S.komdigi'), undefined);
  assert.notEqual(ev('S.cash'), 100000);
});

test('komdigi: the four commitments are cumulative across every POP', () => {
  const { ev } = load();
  napGame(ev);
  const checks = JSON.parse(ev('JSON.stringify(komdigiChecks().map(c=>c.id))'));
  assert.deepEqual(checks, ['km', 't2', 'iru', 'up']);
  // An empty network fails all four.
  assert.equal(ev('komdigiAllOk()'), false);
});

test('komdigi: digging your own trench is not an IRU', () => {
  const { ev } = load();
  napGame(ev);
  ev("S.links.push({a:'jkt',b:'sby',km:700,kind:'df',own:true})");
  assert.equal(ev("komdigiChecks().find(c=>c.id==='iru').ok"), false);
  ev("S.links.push({a:'jkt',b:'bdg',km:150,kind:'df',own:false})");
  assert.equal(ev("komdigiChecks().find(c=>c.id==='iru').ok"), true);
});

test('komdigi: a compliant NAP is licensed on audit day', () => {
  const { ev } = load();
  napGame(ev);
  buildNetwork(ev);
  assert.equal(ev('komdigiAllOk()'), true);
  ev('S.day=360;komdigiTick()');
  assert.equal(ev('S.komdigi.licensed'), true);
  assert.equal(ev('!!S.lost'), false);
});

test('komdigi: an unbuilt network loses the licence on audit day and the run ends', () => {
  const { ev } = load();
  napGame(ev);
  ev('S.day=359;komdigiTick()');
  assert.equal(ev('!!S.lost'), false, 'the audit has not happened yet');
  ev('S.day=360;komdigiTick()');
  assert.equal(ev('S.komdigi.licensed'), false);
  assert.equal(ev('!!S.lost'), true);
  assert.match(ev('S.lostWhy'), /Izin NAP dicabut/);
});

test('komdigi: dropping below a commitment after licensing revokes the licence', () => {
  const { ev } = load();
  napGame(ev);
  buildNetwork(ev);
  ev('S.day=360;komdigiTick()');
  assert.equal(ev('S.komdigi.licensed'), true);
  // Sell off the IRU link: the licence does not survive non-compliance.
  ev("S.links=S.links.filter(l=>l.kind!=='df')");
  ev('komdigiTick()');
  assert.equal(ev('!!S.lost'), true);
});

test('komdigi: PPN 11% + BHP 0,5% + USO 1,25% of gross revenue, billed yearly', () => {
  const { ev } = load();
  napGame(ev);
  ev('S.cash=1000000;S.day=720;S.komdigi.yearRev=1000000');
  ev('komdigiTax()');
  // 11 + 0.5 + 1.25 = 12.75%
  assert.equal(ev('S.komdigi.lastBill'), 127500);
  assert.equal(ev('S.cash'), 1000000 - 127500);
  assert.equal(ev('S.komdigi.yearRev'), 0, 'the year resets after billing');
});

test('komdigi: an unpaid bill becomes arrears instead of ending the run', () => {
  const { ev } = load();
  napGame(ev);
  ev('S.cash=1000;S.day=720;S.komdigi.yearRev=1000000');
  ev('komdigiTax()');
  assert.equal(ev('S.cash'), 0);
  assert.equal(ev('S.komdigi.arrears'), 126500);
  assert.equal(ev('!!S.lost'), false, 'tax debt is not bankruptcy');
});

test('komdigi: a save from before the licence existed is not reset or failed on load', () => {
  const { ev } = load();
  napGame(ev);
  const raw = ev('JSON.stringify(S)');
  ev('S=null');
  ev(`S=migrate(${raw})`);
  assert.ok(ev('S.komdigi && typeof S.komdigi==="object"'));
  assert.equal(ev('S.komdigi.licensed'), false);
});
