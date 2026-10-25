// Brief 19 item 3 gate: bank UI + loan offer / monthly cost / payoff mechanics.
// Run: node --test tests/prd-bank.test.js
const test = require('node:test');
const assert = require('node:assert/strict');
const { load, seed } = require('./harness');

/* ---------- offers arrive ---------- */
test('bank: lenders make loan offers, and broke players get emergency ones', () => {
  const { ev, errors } = load();
  seed(ev, 5);
  ev("ACT.start({});ACT.launchBB({city:'fra'});ACT.buyTransit({city:'fra',net:'cog',tier:1})");

  // A regular offer can be produced on demand and lands in S.loanOffers.
  ev('S.loanOffers=[];spawnLoanOffer(false)');
  assert.equal(ev('S.loanOffers.length'), 1, 'an offer arrives');
  assert.equal(ev('typeof S.loanOffers[0].amount'), 'number');
  assert.ok(ev('S.loanOffers[0].amount') > 0, 'the offer has a principal');

  // While in the red, offers keep coming without the player doing anything.
  ev('S.loanOffers=[];S.cash=-20000');
  for (let d = 0; d < 20; d++) ev('loanTick(S.day)');
  assert.ok(ev('S.loanOffers.length') >= 1, 'someone offers money when you are broke');

  assert.deepEqual(errors, []);
});

/* ---------- taking a loan costs money monthly and gets paid off ---------- */
test('bank: a loan pays out, shows up in monthly costs, and is paid off over its term', () => {
  const { ev, errors } = load();
  seed(ev, 7);
  ev("ACT.start({});ACT.launchBB({city:'fra'});ACT.buyTransit({city:'fra',net:'cog',tier:1})");

  // A fixed, deterministic 6-month loan at 12% APR.
  ev("S.loanOffers=[{id:'x1',bank:'db',amount:100000,exp:S.day+20,covs:['fax'],apr:0.12,term:6,pay:Math.round(annuity(100000,0.12,6))}]");
  const c0 = ev('S.cash');
  ev("ACT.takeLoan({id:'x1'})");

  assert.ok(ev('S.cash') - c0 >= 100000 - 1, 'the principal is paid out');
  assert.equal(ev("S.loans.filter(l=>l.id==='x1').length"), 1, 'the loan is on the books');

  // The monthly payment is part of the cost base the game charges you.
  const pay = ev("S.loans[0].pay");
  assert.equal(ev('R.cost.loans'), pay, 'loan repayment shows up in costs');
  assert.ok(ev('R.cost.loans') > 17000, 'a 100k loan over 6 months costs more than 17k/mo');
  assert.ok(ev('R.costMo') >= pay, 'the payment is inside total monthly costs');

  // Daily cash flow draws down the balance: no revenue bump can hide the payment.
  const before = ev('S.cash');
  for (let d = 0; d < 30; d++) ev('dayTick()');
  assert.ok(ev('S.cash') < before, 'paying a loan costs cash');

  // Run out the term; the loan should clear itself.
  for (let d = 0; d < 200; d++) ev('dayTick()');
  assert.equal(ev("S.loans.filter(l=>l.id==='x1').length"), 0, 'the six-month loan is paid off');
  assert.equal(ev('R.cost.loans'), 0, 'no repayment remains in costs');

  assert.deepEqual(errors, []);
});

/* ---------- payoff works ---------- */
test('bank: repaying early clears the loan for the balance plus a 2% fee', () => {
  const { ev, errors } = load();
  seed(ev, 11);
  ev("ACT.start({});ACT.launchBB({city:'fra'});ACT.buyTransit({city:'fra',net:'cog',tier:1})");
  ev("S.loanOffers=[{id:'p1',bank:'db',amount:100000,exp:S.day+20,covs:['fax'],apr:0.12,term:12,pay:Math.round(annuity(100000,0.12,12))}]");
  ev("ACT.takeLoan({id:'p1'})");
  ev('S.cash=1000000');

  const owed = ev('S.loans[0].bal');
  const cash0 = ev('S.cash');

  // First tap arms the confirmation, second tap pays.
  ev("ACT.repayLoan({id:'p1'})");
  assert.equal(ev("S.loans.filter(l=>l.id==='p1').length"), 1, 'first tap only asks to confirm');

  ev("ACT.repayLoan({id:'p1'})");
  assert.equal(ev("S.loans.filter(l=>l.id==='p1').length"), 0, 'the loan is gone after paying');
  const paid = cash0 - ev('S.cash');
  assert.ok(Math.abs(paid - owed * 1.02) <= 2, 'paid the balance plus a 2% fee');
  assert.equal(ev('R.cost.loans'), 0, 'repayment no longer appears in costs');

  assert.deepEqual(errors, []);
});

/* ---------- the bank UI renders ---------- */
test('bank: the cash chip opens a bank panel with credit rating and offers', () => {
  const { ev, errors } = load();
  seed(ev, 13);
  ev("ACT.start({});ACT.launchBB({city:'fra'});ACT.buyTransit({city:'fra',net:'cog',tier:1})");
  ev("S.loanOffers=[{id:'u1',bank:'db',amount:120000,exp:S.day+20,covs:['fax'],apr:0.1,term:24,pay:Math.round(annuity(120000,0.1,24))}]");

  ev('ACT.bank({})');
  assert.equal(ev("document.getElementById('bankBox').hidden"), false, 'the bank opens');
  const text = ev("document.getElementById('bankCard').textContent");
  assert.match(text, /Credit rating/);
  assert.match(text, /Deutsche Bankrupt/, 'the offer is listed');

  ev('ACT.bankClose({})');
  assert.equal(ev("document.getElementById('bankBox').hidden"), true, 'the bank closes');

  assert.deepEqual(errors, []);
});
