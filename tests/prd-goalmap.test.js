// A goal or badge must never be shown on a map where it can never be completed.
//
// The bug this covers: c3 ("Go global", 3 continents), c5 ("Five continents") and the "Six
// Continents" badge are shown on every map, but regionsCount() is a set over the player's POPs and
// the SEA and IDN maps are one continent each. A SEA player was told to "have POPs on 3 continents"
// and could never claim it, whatever they built. Measured, not guessed: all 49 SEA POPs still
// report regionsCount()===1.
//
// The same sweep found thirteen more of the class (a cable that is not on the map, a badge asking
// for six DE-KICKS exchanges where the map has none, "POPs in 50 cities" on a 34-city map), so this
// test is deliberately general: it does not name the seventeen items, it walks every goal and
// badge and asks whether the map can supply what the check needs.
//
// Three bugs surfaced while writing it, all fixed in the same commit:
//   - renderLeft() rendered GOALS, not goalsFor(), so every role saw all 31 goals while the tab
//     counter said 19. The role filter existed and the list ignored it.
//   - `bingo` was `[].every(...)` on a map with no DE-KICKS exchange: vacuously true, so SEA and
//     IDN players were handed an Epic badge on day one for owning nothing.
//   - spawnMega() returned early when the map had no AI campus, which silently killed the
//     fiber-pairs deal too (it does not use a campus), so `gi`, `landlord` and `gigawatt` were
//     unreachable on IDN. It also kept off-map campuses in its `others` list, so kmBetween() read
//     CITY[undefined] and dayTick threw.
//
// Run: node --test tests/prd-t1regions.test.js
const test = require('node:test');
const assert = require('node:assert/strict');
const { load } = require('./harness');

const MAPS = [['global', 'fra'], ['sea', 'jkt'], ['idn', 'jkt']];

/* What a map can supply, read from the live region rather than from a static table, so a future
   map change is measured rather than assumed. */
const CAP = `(() => {
  const ids=new Set(CITIES.map(c=>c.id));
  return JSON.stringify({
    cities: CITIES.length,
    regions: new Set(CITIES.map(c=>c.reg)).size,
    citySet: CITIES.map(c=>c.id),
    cableSet: CABLES.map(c=>c.id),
    liveNets: Object.keys(NET),
    ixCities: CITIES.filter(c=>c.ix).length,
    campuses: new Set(MEGA.filter(m=>ids.has(m.c)).map(m=>m.c)).size,
    cn: CITIES.some(c=>c.cn),
    uae: CITIES.filter(c=>c.uae).length,
    andes: new Set(CITIES.filter(c=>c.andes).map(c=>c.andes)).size,
    dk: DK_CITIES.every(c=>CITY[c]&&CITY[c].ix)
  });
})()`;

/* Every item the panel would render on this map, with whatever it declares it needs. The badge
   list matches what badgeGrid() draws, hall of fame included, so the count assertion is real. */
const SHOWN = `JSON.stringify({
  goals: goalsFor().map(g=>({id:g.id,needs:g.needs||null,by:g.by||null})),
  badges: badgeList(hof()).map(b=>({id:b.id,needs:b.needs||null})),
  renderedGoals: document.querySelectorAll('#left .goal').length,
  renderedBadges: document.querySelectorAll('#left .badges .bdg').length,
  countText: (document.getElementById('leftTabs')||{}).textContent||''
})`;

test('goals and badges: nothing is shown on a map that cannot supply it', () => {
  /* The invariant. For each map, take everything the panel renders and check every requirement it
     declares against what the map actually has. An item that needs more continents than the map
     spans is the original bug; the others are the same class found by the same sweep. */
  for (const [region, city] of MAPS) {
    const { ev, errors } = load();
    ev(`beginGame('X',${JSON.stringify(city)},{region:${JSON.stringify(region)}})`);
    const cap = JSON.parse(ev(CAP));
    const shown = JSON.parse(ev(SHOWN));
    const check = (kind, x) => {
      const n = x.needs;
      if (!n) return;
      if (n.regions != null) assert.ok(cap.regions >= n.regions,
        `${region}: ${kind} ${x.id} asks for ${n.regions} continents, map has ${cap.regions}`);
      if (n.pops != null) assert.ok(cap.cities >= n.pops,
        `${region}: ${kind} ${x.id} asks for ${n.pops} cities, map has ${cap.cities}`);
      for (const c of n.cities || []) assert.ok(cap.citySet.includes(c),
        `${region}: ${kind} ${x.id} needs city ${c}, which is not on this map`);
      for (const c of n.cables || []) assert.ok(cap.cableSet.includes(c),
        `${region}: ${kind} ${x.id} needs cable ${c}, which is not on this map`);
      for (const net of n.nets || []) assert.ok(cap.liveNets.includes(net),
        `${region}: ${kind} ${x.id} needs network ${net}, which is not on this map`);
      if (n.ix != null) assert.ok(cap.ixCities >= n.ix,
        `${region}: ${kind} ${x.id} asks for ${n.ix} exchanges, map has ${cap.ixCities}`);
      if (n.campuses != null) assert.ok(cap.campuses >= n.campuses,
        `${region}: ${kind} ${x.id} asks for ${n.campuses} AI campuses, map has ${cap.campuses}`);
      if (n.cn) assert.ok(cap.cn, `${region}: ${kind} ${x.id} needs a mainland China city`);
      if (n.uae != null) assert.ok(cap.uae >= n.uae,
        `${region}: ${kind} ${x.id} asks for ${n.uae} UAE cities, map has ${cap.uae}`);
      if (n.andes != null) assert.ok(cap.andes >= n.andes,
        `${region}: ${kind} ${x.id} asks for ${n.andes} Andes groups, map has ${cap.andes}`);
      if (n.dk) assert.ok(cap.dk, `${region}: ${kind} ${x.id} needs all six DE-KICKS exchanges`);
    };
    for (const g of shown.goals) check('goal', g);
    for (const b of shown.badges) check('badge', b);
    /* The panel must render exactly what the filter allows: the count and the list agree. */
    assert.equal(shown.renderedGoals, shown.goals.length,
      `${region}: the goals panel renders ${shown.renderedGoals} but goalsFor() has ${shown.goals.length}`);
    assert.equal(shown.renderedBadges, shown.badges.length,
      `${region}: the badge wall renders ${shown.renderedBadges} but ${shown.badges.length} are allowed`);
    assert.ok(shown.countText.includes(`/${shown.goals.length}`),
      `${region}: the goal counter must use the filtered total, got ${JSON.stringify(shown.countText)}`);
    assert.deepEqual(errors, []);
  }
});

test('goals and badges: the three continent gates are gone from the one-continent maps', () => {
  /* The specific case from the ticket, kept explicit so a future map change has to face it. */
  for (const [region, city, shown] of [['sea', 'jkt', false], ['idn', 'jkt', false], ['global', 'fra', true]]) {
    const { ev, errors } = load();
    ev(`beginGame('X',${JSON.stringify(city)},{region:${JSON.stringify(region)}})`);
    const ids = JSON.parse(ev('JSON.stringify(goalsFor().map(g=>g.id))'));
    const bids = JSON.parse(ev('JSON.stringify(badgeList(hof()).map(b=>b.id))'));
    for (const id of ['c3', 'c5']) {
      assert.equal(ids.includes(id), shown,
        `${region}: goal ${id} ${shown ? 'must' : 'must not'} be shown`);
    }
    assert.equal(bids.includes('six'), shown, `${region}: the six-continent badge ${shown ? 'must' : 'must not'} be shown`);
    assert.deepEqual(errors, []);
  }
});

test('goals and badges: a cap is not the answer, the impossible goal is absent', () => {
  /* The rejected alternative was to cap "3 continents" at what the map offers, the way t1Club()
     caps its continent gate. That would hand a SEA player "POPs on 1 continent" for a $50,000
     reward, which is a no-op wearing a goal's clothes. Assert the requirement is still 3 wherever
     the goal is shown, i.e. it was hidden rather than quietly redefined. */
  const { ev, errors } = load();
  ev("beginGame('X','fra',{region:'global'})");
  assert.equal(ev("GOALS.find(g=>g.id==='c3').ok.toString().includes('>=3')"), true,
    'c3 still asks for three continents; it is hidden elsewhere, not capped');
  assert.equal(ev("BADGES.find(b=>b.id==='six').ok.toString().includes('>=6')"), true,
    'the six-continent badge still asks for six');
  assert.deepEqual(errors, []);
});

test('badges: bingo is not handed out for owning nothing', () => {
  /* `[].every(...)` is true, so on a map with no DE-KICKS exchange the old check was satisfied at
     beginGame. Measured before the fix: BADGES.find(b=>b.id==='bingo').ok() === true on SEA and IDN
     at day 0, an Epic badge for a network with one POP and no ports. */
  for (const [region, city] of MAPS) {
    const { ev, errors } = load();
    ev(`beginGame('X',${JSON.stringify(city)},{region:${JSON.stringify(region)}})`);
    const st = JSON.parse(ev(`JSON.stringify({
      dk: dkCities().length,
      ok: BADGES.find(b=>b.id==='bingo').ok(),
      shown: BADGES.filter(badgeShown).some(b=>b.id==='bingo'),
      earned: (S.ach||{}).bingo
    })`));
    assert.equal(st.ok, false, `${region}: bingo must not be satisfied by an empty exchange list`);
    assert.equal(st.earned, undefined, `${region}: bingo must not be earned at the start`);
    assert.equal(st.shown, st.dk > 0, `${region}: bingo is shown only where its exchanges exist`);
    assert.deepEqual(errors, []);
  }
});

test('goals: the panel shows the goals this role can see, not the whole master list', () => {
  /* renderLeft() used to map over GOALS while the counter used goalsFor(), so an ISP was told it
     had 0 of 19 and shown 31, including three other roles' ladders. */
  for (const role of ['isp', 'hosting', 'nap', 'rtnet']) {
    const { ev, errors } = load();
    ev(`beginGame('X','fra',{region:'global',role:'${role}'})`);
    const r = JSON.parse(ev(`JSON.stringify({
      allowed: goalsFor().length,
      rendered: document.querySelectorAll('#left .goal').length,
      total: GOALS.length
    })`));
    assert.equal(r.rendered, r.allowed, `${role}: rendered ${r.rendered}, allowed ${r.allowed}`);
    assert.ok(r.allowed < r.total, `${role}: the master list is bigger than one role's ladder`);
    assert.deepEqual(errors, []);
  }
});

test('mega deals: a fiber-pairs deal does not need an AI campus, and no campus off the map', () => {
  /* Two bugs in spawnMega(), both measured on the real spawner:
       - `if(!megaMine.length)return;` sat above the `pairs` branch, which never reads megaMine.
         IDN has no campus at all, so `pairs` could never spawn there: 0 offers in 300 calls, and
         `gi`, `landlord` and `gigawatt` were dead with it. It is about your trench, not a campus.
       - the aiwan `others` list kept off-map campuses (`:true` branch), so kmBetween() read
         CITY[undefined] and threw inside dayTick. On SEA that threw 300 times out of 300 calls,
         and the player saw "the simulation hit a hit snag" instead of a deal. */
  for (const [region, city] of MAPS) {
    const { ev, errors } = load();
    ev(`beginGame('X',${JSON.stringify(city)},{region:${JSON.stringify(region)}})`);
    const r = JSON.parse(ev(`(() => {
      S.cash=1e12;S.day=200;S.lvl=13;
      for(const c of CITIES) S.pops[c.id]={day:0,bb:{d:900},boost:0,down:0,routers:2,gen:true,rgen:3};
      /* A trench you dug, the way the game builds one: pairs deals only want owned fiber. */
      let pair=null;
      for(const A of CITIES){for(const B of CITIES){if(A.id<B.id&&dfAllowed(A.id,B.id)){pair=[A.id,B.id];break;}}if(pair)break;}
      if(pair){UI.pending={a:pair[0],b:pair[1]};UI.dfSrc='build';UI.dfSys='lite';ACT.orderDf();
        const l=S.links.find(x=>x.kind==='df');if(l){l.ready=S.day;S.cash=1e12;ACT.addCh({id:l.id,o:'zr4'});}}
      const mine=Object.keys(S.pops), errs=[];
      let pairs=0;
      for(let i=0;i<200;i++){S.offers=[];
        try{spawnMega('pairs',BIZ_T.pairs,()=>'Probe',mine);}catch(e){errs.push('pairs: '+e.message);}
        pairs+=S.offers.length;S.offers=[];}
      /* Every mega type, on every map: none may throw and none may name an off-map city. */
      for(const t of ['aiwan','mtrain','ingest','agi']){
        for(let i=0;i<200;i++){S.offers=[];
          try{spawnMega(t,BIZ_T[t],()=>'Probe',mine);}catch(e){errs.push(t+': '+e.message);}
          for(const o of S.offers) for(const c of bCities(o))
            if(!CITY[c]) errs.push(t+': offer in off-map city '+c);
          S.offers=[];}}
      return JSON.stringify({pairs, errs:[...new Set(errs)].slice(0,4), hasTrench:!!pair});
    })()`));
    assert.equal(r.hasTrench, true, `${region}: the probe must be able to dig a trench`);
    assert.ok(r.pairs > 0, `${region}: a fiber-pairs deal must be reachable on any map with a trench`);
    assert.deepEqual(r.errs, [], `${region}: the mega spawner threw or named an off-map city`);
    assert.deepEqual(errors, []);
  }
});

test('goals and badges: an item already earned stays visible when the map changes', () => {
  /* A player who earned "Six Continents" on Global and then starts a SEA game keeps the badge in
     their hall of fame. Hiding it would look like the game lost it. */
  const { ev, errors } = load();
  ev("localStorage.setItem('sot-badges',JSON.stringify({six:{d:'2026-01-01',n:'X'}}))");
  ev("beginGame('X','jkt',{region:'sea'})");
  assert.equal(ev("badgeList(hof()).some(b=>b.id==='six')"), true,
    'a badge earned before stays on the wall, even on a map that cannot offer it again');
  assert.equal(ev("document.querySelectorAll('#left .badges .bdg').length"),
    ev("badgeList(hof()).length"));
  assert.deepEqual(errors, []);
});
