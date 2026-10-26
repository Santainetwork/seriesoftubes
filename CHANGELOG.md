## [Unreleased]

- Goals and badges that a map can never satisfy are no longer shown on it. On the Southeast Asia and
  Indonesia maps a player was told to "have POPs on 3 continents" and shown a "Six Continents" badge
  when the whole map is one continent, so neither could ever be claimed. Seventeen goals and badges
  were impossible there, including three that named cables or cities the map does not have. They now
  disappear from the panel on maps that cannot supply them, and stay on the map that can.
- The goals panel showed every role's goals to every role. An ISP saw all 31 goals while the counter
  said 19, including three other roles' private ladders and a broadband goal it cannot even buy.
- A DE-KICKS badge was handed out on day one on the regional maps. "Ports at all six DE-KICKS
  exchanges" was checked against an empty list, which counts as satisfied, so a brand new network
  with one POP and no ports got an Epic badge for nothing.
- Hyperscaler fiber deals were unreachable on the Indonesia map, and threw an error on the Southeast
  Asia one. A fiber-pairs deal was gated behind an AI campus it does not use, so a map with no campus
  could never sell one; and the AI WAN deal could pick a campus that is not on the map, which failed
  the whole day instead of offering a contract.
- Tier 1 was unreachable on the Southeast Asia map. The club asked for POPs on two continents, but
  every city on that map is in one, so no amount of traffic or peering could open the door: a
  player with all 49 POPs, 3.2 Tbps served and 106 peering sessions was still refused for a
  continent the map does not contain. The requirement is now capped at what each map actually
  offers, and SEA's own rule states the honest number.
- A hosting outfit could not level up. Peak traffic — the number the customer levels are built on
  — was fed only by IP traffic, and a private circuit never passes an IP exit: a cloud on-ramp or
  an AI interconnect moved hundreds of gigabits, paid for them, and counted for nothing. Signing a
  400G on-ramp could even make peak traffic fall, because the circuit was allocated before the IP
  customers and took the whole chassis. Private circuits now count towards peak traffic, and they
  are allocated after IP traffic instead of before it. A restricted role also obeys the level each
  customer type asks for, so a level-1 hosting outfit can no longer sign an AI interconnect that
  the rest of the game only offers at level 4.
- A bigger router no longer invents broadband demand. The eyeball ceiling was `max(calibrated,
  chassis)`, so a single Chonk 800 gave all 34 Indonesian cities the same 12,800 Gbps ceiling and
  Manado — 1.2 million people, a calibrated ceiling of 144 Gbps — could sell 1,768 Gbps off two
  Absolute Units, 12.3x what the city justifies. A chassis may now lift a city's ceiling to at
  most three times its calibrated figure, and no further than it can forward. Raising the
  regional multiplier instead would not have worked: 30 of the 34 cities were pinned by the
  chassis, not the multiplier.
- Singapore is no longer the cheapest big city on the Indonesia map. The boost table that lifts
  the biggest cities had a dead key (`mks`, which matched no city — Makassar is `upg`) and no
  entry at all for Singapore or Makassar, so both defaulted to 1.0: Singapore reported a 1,080
  Gbps ceiling while Surabaya reported 2,160 at the same 450 Gbps of calibrated traffic. The
  table now has an entry for every city and is monotone in P, so more traffic can never mean a
  lower ceiling and two cities with the same traffic report the same number.

## [1.27.6] — 2026-10-26

- Papua was drawn twice. Its easternmost islands reached x=2558 on a 2000px canvas, and SEA/IDN
  set wrapX:false, so the overflow was not wrapped away — it was drawn where it landed and a
  player saw a second Papua in the bottom-left corner. The projection now spans 90-156E: maxX
  1999, nothing outside the canvas, all 34 cities still on land.
- Levels 4 and up were unreachable on the SEA and Indonesia maps. LV_REQ asks for continents —
  three at level 4, five at 7, six at 10 — but those maps cover one projection region, so
  regionsCount() could never exceed 1 and a player stopped at level 3 however large the network
  grew. A player put it plainly: "itu 3 continent ganti dengan pulau, gak bisa leveling tuh".
  lvReg() now caps the requirement at what the map can offer.
- Tier 1 was unwinnable on both Asia maps. isTier1() needs a PNI with every Tier 1, and a PNI can
  only be built where that network has a POP; Level Tree's POPs were all in Europe and the
  Americas. Singapore, Jakarta and Hong Kong added.
- Madura and Kangean were filed under Bali and read as one stray island glued to it. Both belong
  to Java Timur.
- The decorative polygons of the Global map stayed loaded after switching to SEA or Indonesia:
  23 rings projected with the regional lens, landing thousands of pixels off-map and drawing a
  coarse second outline over the Natural Earth coastline.
- The canvas renderer crashed on every frame after the coastline fix — `const LANDP` declared
  below its own use — and separately after a cable-worker edit left bowCables() closed early,
  which stopped the whole script from parsing.
- Restored what the 1.27.0 merge had dropped: 24 upstream files (.github workflows and issue
  templates, CLAUDE.md, CONTRIBUTING.md, LICENSE, docs/ARCHITECTURE.md, the perf scripts, pt.js,
  and two test suites), the i18n support in the test harness, and the in-game credit to Thomas
  Kjær Aabo's *How the Internet Works*.
- A capacity countdown in the city panel: a fresh ISP in Semarang carries 8 Gbps against a
  400 Gbps router and grows 2.5% a day, so the wall is 156 days out — three weeks of real play at
  8x. Players were meeting it with no warning.
- New suites: prd-paint (8), prd-rings (4), prd-capwarn (5), prd-update (3), prd-t1reach (3),
  prd-cablebow (3).

## [1.27.5] — 2026-10-26

- Fixes a crash introduced in 1.27.4. The regional-coastline patch declared `const LANDP` and
  referenced LANDP on the line above it: a temporal dead zone, so the canvas renderer threw
  "Cannot access LANDP before initialization" on every frame and the console filled with errors.
  The fallback now lives in its own name, `coast`.
- The harness could not catch it because paintWorld only runs inside requestAnimationFrame.
  prd-paint now calls paintWorld directly in all three regions and asserts it does not throw.

## [1.27.4] — 2026-10-26

- The SEA and Indonesia maps were painted on top of the world map. Manila stood in the
  Mediterranean, Hanoi in North America, Cebu near East Africa: the cities were projected with
  the regional lens while paintWorld() still read LANDP_ALL/LANDP_FAR, which are frozen from
  the Global COAST at module load. It now paints LANDP, the table applyRegion() rebuilds.
  prd-paint locks it: the regional coastline must be richer than the global one, and every
  SEA city must fall inside a painted polygon.

## [1.27.3] — 2026-10-26

- The city panel now counts down to the capacity wall. A fresh ISP in Semarang carries 8 Gbps
  of demand against a 400 Gbps router and grows 2.5% a day: the wall is 156 days out, which at
  8x speed is about three weeks. Players were hitting it with no warning and calling it a bug.
  capDays() projects the day, capWarn() shows it in the panel, and both are covered by tests.

## [1.27.2] — 2026-10-26

- Lombok was filed under Bali. The nearest-vertex rule matched the Bali reference point to
  Lombok's west coast, so Mataram stood on a ring labelled bal while its own land field said ntb.
  Karhutla therefore skipped Lombok and the subsea test answered for the wrong island.
- Tanjung Pinang used land kep, an id nothing else in the game knew about: not a landmass, not in
  any ring. It is now btm, because Bintan is part of the Batam group.
- New test suite prd-rings locks the invariant that broke both: every city must sit inside a ring
  of its own landmass, no ring may span twelve degrees in both directions, and Kangean and Kai
  Besar must stay drawn.

## [1.27.1] — 2026-10-26

- The region picker works again. showTitle() called loadSave() on every render, and loadSave()
  overwrites UI.region with whichever save is newest, so choosing Indonesia drew the Indonesian
  map and then immediately relit the Global button. loadSave({keepRegion:true}) from the title
  screen leaves the choice alone; boot still restores the last-played region.

## [1.27.0] — 2026-10-26

- Merged upstream v1.27.0. Thirteen levels, seven new router models, subsea optics physics,
  102.4T exchange fabric, esports and sovereign-cloud customers, credit-rated loans, and the
  whole v1.12-v1.27 line, on top of the Indonesia and SEA maps.
- Sumatra was drawn twice: the ring-assignment rule filed the whole island under Batam because
  one coastal vertex sat near that reference point. Fixed; no land point overlaps now.
- Everything from the fork survives the merge: the Natural Earth coastline, 238 sea-routed
  cables, the Komdigi licence, karhutla, 36 conferences across 34 cities, 16 Indonesian NAPs.

# Changelog

All notable changes to this project are documented here. The project follows
[Semantic Versioning](https://semver.org/). Each release is deployed to
[seriesoftub.es](https://seriesoftub.es).

## [1.11.3] — 2026-10-26

- Prices read as whole numbers. Rupiah was printed as "Rp 2.802,60 K", which is
  either 2.8 million or 2,802 thousand depending on how you parse the K, and a
  price button should not need parsing. It is now "Rp 45.402 K" with no
  decimals, and dollars are whole too: $2.803 instead of $2.802,60.

## [1.11.2] — 2026-10-26

- Waeve rail fibre is now the cheap lease it claims to be, and it hurts. 39% of
  the price of a real cable, +2.5 ms of latency, and it is cut three or four
  times a day with a one-to-three day repair: the only crew certified for
  railway property flies in from Jakarta and needs a possession order first. The
  route picker says so before you buy, because at that cut rate the link is dark
  most of the time and that is the trade, not a bug.
- A rail cut's repair deadline is set from the tick's own day instead of S.day.
  dayTick() has already advanced the clock, so every outage was silently one day
  longer than the message claimed.
- Sixteen Indonesian NAPs now carry their real ASN nudged by seven, and five more
  were added: Fibre-Star, Pusat Fibre, Sol-Net, i-Forte and Data-Kom. Thirty-seven
  Tier-2 carriers in the Indonesian map.

## [1.11.1] — 2026-10-26

- Campaigns are no longer instant either. Paying for one books the sales team
  and prints the deck; the first meeting lands three to seven days later. What
  you buy is the 45 days of triple lead rate, not a contract at the till.
- Waeve rail fibre now behaves like the cheap lease it is: 39% of the price of a
  real cable, 2-3 ms of extra latency from the longer path and the
  regenerators, and three or four cuts a month. Repair takes one to three days,
  because the only crew certified for railway property flies in from Jakarta and
  needs a possession order before anyone touches the duct.
- Router upgrades and extra routers now say what you get: the upgrade button
  shows the capacity and port delta, and both buttons explain why they are
  disabled instead of just greying out.
- Karhutla. Peat fires in Sumatra and Kalimantan now blanket the region in haze
  for two to three weeks. It is not a typhoon: nothing breaks, everything gets
  worse. Land links in the smoke lose a third of their capacity, because haze
  stops a terrestrial microwave shot, while subsea cable is on the seabed and
  does not care. Everyone stays indoors streaming, so eyeball demand in the
  burning provinces rises 30%. The event only fires if you run a POP in Sumatra,
  Kalimantan or Batam.
- Conference leads now take time. Registering buys a badge, not a contract: the
  first lead lands on the first morning of the event, another by the closing day,
  across a three-to-seven day window.
- 36 conferences across all 34 Indonesian cities, up from ten events in eight
  cities, so a player who builds outside Java can finally generate prospects.

## [1.11.0] — 2026-10-26

- The map finally looks like Indonesia. The coastline used to be hand-drawn —
  25 rings and 168 points for the whole archipelago, which is why Java read as a
  smear and Batam sat on top of Sumatra. It now comes from Natural Earth 1:50m:
  158 rings, 3,623 points, 22 landmasses, with small islands simplified gently so
  Bintan keeps enough shape to hold Tanjung Pinang. Every city in SEA and IDN
  verifies on land.
- Subsea cables follow water instead of cutting across islands. 86 of 99 pairs
  used to be three points (A, midpoint, B) and drew as ruler lines through
  Sumatra and Borneo. A router now runs A* over a 0.05-degree water grid with
  carved corridors for Suez, Panama, Corinth, Kiel, Bosphorus, Dardanelles,
  Messina and Oresund: 232 of 238 pairs across all three regions follow open
  water, median 9.5 waypoints, 1.68% of interior waypoints on land.
- The NAP role in Indonesia now needs a Komdigi licence. You start with Rp 100
  juta and 360 days to meet four cumulative commitments — 100 km of cable, 100G
  of Tier-2 bandwidth, one IRU (a leased dark-fibre pair, not your own trench),
  and two upstreams. Pass the audit and the licence is issued; fail and it is
  revoked, which ends the run. PPN 11% + BHP 0,5% + USO 1,25% of gross revenue is
  billed yearly, and an unpaid bill becomes arrears rather than bankruptcy.
- Batam and Tanjung Pinang were both drawn on the Sumatran coast, 90 km from
  where they belong. Their coordinates were wrong, not just crowded.
- Timor-Leste had no coastline at all: the generator looked for "Timor-Leste"
  but Natural Earth calls it "East Timor", so 1.22 square degrees of land were
  silently dropped and Dili was drawn on Flores.
- New game really starts over, mode changes ask first, and the region picker
  stops snapping back to Global.
- 13 levels, following upstream, with the LV_REQ table.

## [1.10.1] — 2026-10-24

- Reach is now a button, not a mystery. Tap the Reach chip (or the new line in
  the NOC tab) to get a report of every network you cannot reach, grouped by
  cause: no transit, no IX port, a peering policy, a port that is down, or an
  incident that just has to clear. Each one says what to do next and links
  straight to the right panel, with a "Start here" list of the three biggest
  causes and the traffic each is worth.
- The map stays responsive at 8×. Catch-up after a stall is capped, a slow day
  no longer eats a whole frame, the panels redraw once per frame instead of once
  per simulated day, and a single failing day is skipped and reported instead of
  stopping the game.
- Fixed a stale "Tap your city, then Launch broadband" hint that never went away
  once that goal was completed on day 0.
- Phone and tablet layout fixes: the HUD is two rows instead of four on a phone,
  panels, hints, toasts and the tutorial now position themselves from the HUD's
  real height, and the tutorial no longer sits on top of the panel it points at.

## [1.10.0] — 2026-10-24

- Router ports are finite. Every transit, IX, PNI and cache port, every wave
  and every fibre channel takes a router port; 10G ports ride a breakout,
  four to a port. The Infra tab shows how many are left, and plugging in more
  than you have is refused.
- More routers: up to six per POP, and six new models to swap in from the
  Infra tab: Mikrowtik CCR-ish, Sonic the Whitebox 32 (cheap, crashes more),
  Arrrhipster 7280R-ish and 7800R-ish (lots of ports, deep buffers, boots in
  minutes), Disco 8K-ish (licence keys for everything) and Knockia 7750-ish.
  A swap that would not fit what is already plugged in is refused.
- New cities: Milan, Rome, Palermo, Lisbon and Athens in Europe; Atlanta,
  Denver, Phoenix, Boston, Houston and Salt Lake City in the US. New cables
  land with them (Lisbon to Brazil, Africa and the US Southeast; Genoa to
  Sicily and Athens; Palermo to Marseille and Alexandria; Athens to Istanbul;
  Boston to Dublin), along with local networks to peer with.
- Rival exchanges: 25 big metros now have a second (sometimes third) IX.
  Challengers are cheaper and share many members with the incumbent, but not
  all of them. Each IX is its own port, LAG and route server.
- The long tail: 60 small, odd networks with a sliver of traffic each, spread
  over random exchanges. "Request all willing peers" signs them up in one go,
  and they fold into one row in the network lists.
- Europe's peering market is competitive: IX ports there cost 20% less, and
  price wars between rival exchanges cut your port bill further. DE-KICKS
  responds with a webinar.
- Voda-Phony has ended settlement-free peering. It now peers only over a paid
  PNI, through its interconnection partner.
- New US eyeballs Spectre-um Cable and Very-Zone (paid peering only).
- Pausing now freezes the map too: packet dots, waves and clouds stop
  moving until you press play again (#11).
- Ports in both buildings: with a second site, any transit port, PNI or IX
  port can now be set to "Both". That splits it into a LAG with members in
  each building (adding a member if needed), so a dark building only takes
  out half the port instead of all of it (#8).
- The top bar no longer wraps onto a second row and covers the side panels
  on laptop-sized screens.
- Routers make sense now: the Chonk 800 takes 800G waves and ports (a new
  800G wave sits between 400G and 1.6T), and only the Absolute Unit has 1.6T
  ports and takes 6.4T waves, handed off as 4×1.6T. Existing waves keep
  their size.
- London–Amsterdam is everywhere: three more cheap North Sea cables, and dark
  fiber you can lease on them (and on the Channel), since you can't dig under
  the sea.
- Your own IX can grow (#10): upgrade its fabric from 400G to 1.6T, 6.4T and
  25.6T. Bigger fabrics carry more and have room for more members.
- Wave prices follow real markets: Europe is cheap, North America average,
  Asia and South America pricier, and anything into Africa several times the
  price. Every route has its own going rate, and new leases get about 8%
  cheaper each year. The link planner tells you how a route compares.
- Cairo–Dubai over the Red Sea, plus I-ME-WE-Us to Fujairah and Mumbai.
- The Gulf: Jeddah, Riyadh and Doha. Saudi POPs need a local telecom licence,
  gigaprojects want enormous demo networks, and now and then the neighbours
  fall out and every link between Qatar and Saudi Arabia or the UAE goes dark
  for months. Qatar is on the map as a peninsula now, too.
- Tablets in landscape: slimmer side panels, bigger touch targets, and the
  left panel tucks away while a city is open (tap "Goals & NOC" to bring it
  back).

## [1.9.0] — 2026-10-23

- RouteScript: program your Auto-TE controller from the NOC tab with a tiny
  rule language: `spill at 80%`, `prefer pni for goggle`, `avoid transit for
  netchill`, `cap transit cogentle at 20 gbps`, `drain paris`, `avoid link
  fra-ams` and `blackhole ddos`. Check runs a dry run against live traffic
  and shows what would change; Deploy makes it real. Typos get a "did you
  mean". Two new badges: Script Kiddie and Fat Finger.
- Zoom in twice as far as before, handy for crowded spots like the UAE,
  Singapore or Central Europe.
- Half speed: a new ½× button, or press 0.
- NOC dashboard: a legend explains the colours in "How it arrives", the
  network table sorts by any column (traffic, transit cost, loss, name), and a
  new "Who your transit carries" list shows the networks you pay transit to
  reach, with the cheapest way to move each one to peering (#7).
- The Transit tab shows the top destinations on each transit port, with the
  same hint, so you can see who to peer with in that city (#7).
- A full code review, and about 40 fixes from it:
  - Saves and imported files are checked and repaired before use, so a
    damaged or hand-edited save can no longer break the game or inject
    anything into the page.
  - Loophole fixes: flipping crypto loans for profit, free repairs of
    geopolitical cable cuts, re-rolling DE-KICKS quotes, walking out of a
    failing event, and selling the same trench twice.
  - The Red Sea scenario really cuts the Red Sea now, the weekly challenge
    gives everyone the same world, and its "pricey" and "poor" twists work.
  - China Telecomet and China Unicorn no longer act like Tier 1s.
  - Metro ring cuts now alert you, overlapping site outages no longer cancel
    each other, and alien waves work on unlit fiber.
  - Routing is several times faster on big networks.
  - The map fills wide screens at any zoom, pinch zoom goes as far as the
    mouse wheel, and touch scrolling and cancelled touches behave.
  - Starting a scenario from a running game asks first, and Space no longer
    pauses when you meant to press a button.
- Settings for animations and sound, in the menu and on the help screen.
  Animations can follow your device's reduce-motion setting (the default),
  or be forced on or off. Off freezes the map: no moving packets, pulses or
  floating text.

## [1.8.0] — 2026-10-23

- Traceroute and looking glass: tap 🔍 Traceroute on any of your cities, or
  open it from the NOC tab. See the exact path to any network or POP, hop by
  hop, with latency, the exit it leaves through and the AS path, plus why
  that exit won.
- Share card: an image of your network with a mini map, your stats and your
  rarest badges, ready to post. Find it in the menu, after winning and after
  a scenario.
- Scenarios: six hand-built challenges with a goal and a deadline (Only
  Spätzle-IX, Red Sea Crisis, The Cogentle Spat, Carnaval, Mind the Gap and
  Anchors Away), plus a weekly challenge where everyone gets the same world,
  the same start city and the same two twists for a week.
- Sandbox mode: a billion dollars, every unlock and nothing ever breaks.
  No badges, though.
- Conference season: NANOG-ish, RIPE-ish, DENOG-ish, APRICOT-ish and more
  come round every year. Register in the Deals tab and selective networks in
  that region need half the usual traffic to peer with you for 45 days.
- A guided first game for new players, step by step, with a skip button.
- Kyiv, with Varenyky-IX and KyivStar-ish. Blackouts are frequent, so bring
  a generator. Nobody sells capacity between Kyiv and Moscow.
- 7 more badges for scenarios, the weekly challenge and conferences.

## [1.7.0] — 2026-10-23

- Auto-TE: from customer level 3 you can install a traffic-engineering
  controller in the NOC tab. When the shortest path is full, the overflow
  spills onto up to two alternate paths with free capacity instead of being
  dropped. Without it, traffic still reroutes around failures, but a full
  link stays full, just like a real IGP.
- 16 more badges, mostly rare, epic and legendary: Traffic Whisperer, Same
  Street, Anchors Aweigh, Samba Peering, DE-KICKS Bingo, Ring of Fire, Iron
  Curtain Call, Island Hopper, Through the Wall, Darwin Award, Unbreakable,
  Gigawatt Landlord, Blitz, Hundred Terabits and a few more, one of them
  secret. That makes 46.

## [1.6.0] — 2026-10-23

- South America is on the map properly: Fortaleza, Rio de Janeiro, Buenos
  Aires, Santiago, Lima, Bogotá and Panama City, with new cables including a
  ring round Cape Horn, a direct São Paulo–New York cable and the first
  cable from Chile to Sydney. Nothing crosses the Darién Gap by land, transit
  is pricier because so much traffic hairpins through Miami, and fiber over
  the Andes costs double and breaks often. IX.brrr is run by a nonprofit
  with cheap public prices, and small Brazilian provedores now buy transit
  from you.
- More India: Delhi, Chennai, Bengaluru and Hyderabad, with east-coast cables
  to Singapore and a lot of road widening.
- Taiwan: Taipei, with cables to Tokyo, Hong Kong, Los Angeles, Seattle and
  Shanghai, and ships that keep dragging their anchors over them.
- The UAE: Abu Dhabi and Fujairah join Dubai. Only the licensed duopoly may
  run fiber inside the country, so there is no dark fiber, waves cost 3×, and
  POPs need a free-zone license. Most cables land in Fujairah.
- Cape Town, with Atlantic cables up the west coast of Africa and load
  shedding: bring a generator.
- New local networks: Clarovision, Vivo-ish, Mercado Livre-ly, Jio-graphy,
  Airtel-tale, Chunghwa Tele-calm and do-ish.
- Metro diversity: add a second data center in any POP's metro from the
  Infra tab, joined by your own metro ring. A power cut, cleaner or A/C
  failure then only takes out half the city. You choose which site each
  transit, PNI and IX port plugs into, and metro ring cuts can cut site B
  off. Some hyperscaler and AI customers now insist on two sites.
- More Asia-Pacific: Melbourne, Brisbane, Darwin, Osaka, Kuala Lumpur,
  Bangkok, Ho Chi Minh City, Karachi, Dhaka and Colombo, with cables to match.
  Vietnam's cables break a lot, and Darwin has crocodiles.
- Central and Eastern Europe: Warsaw, Prague, Vienna, Budapest, Bucharest,
  Tallinn and Istanbul. Baltic cables meet a lot of anchors.
- The giants: at customer levels 3 and 4, hyperscalers and AI clouds bring
  deals only they would ask for. Terabit AI WANs between gigawatt campuses,
  training runs spread over three or four sites, week-long dataset ingests,
  and hundreds of fiber pairs in a trench you dug yourself. Their campuses,
  from Star-Gait Abilene to the Johor-ish Overflow, show up in each city's
  "Who's here".
- Dark fiber pairs you lease out now earn even before you light your own
  channels on that fiber.
- More local networks: KD-DIY, Opt-Out-Us, Mostly-True Move, Viet-tell,
  PTC-hell, Telekom Ma-lazy-sia, Türk Tele-komik, Digi-tally Cheap and
  UPC-You-Later.
- Badges: 30 achievements from common to legendary, shown under your goals.
  Some take luck (Shark Bait), some take years (Five Nines, Speedrun), and a
  couple are secret. Badges from earlier games stay on this device in a hall
  of fame.
- Five new goals between Tier 2 and Tier 1: light your own dark fiber, be in
  two buildings at once, five continents, sign a giant, and serve 10 Tbps.
- Tap your network's name in the top left for a menu to export or import a
  save, or start a new network.

## [1.5.0] — 2026-10-23

- Several transits in the same city now share the load instead of filling one
  after the other. The same goes for any exits that are equally close: traffic
  is spread by free capacity, and local exits still win over far ones (#4).
- Export your save to a file and import it on another device, from the help
  screen or the title screen (#5).
- Full transit ports, IX ports, PNIs, caches and routers are now easy to spot.
  They get red badges on the map (T, P, C, R), the IX hexagon blinks red when
  its port is full, and the NOC lists everything running hot with a hint on
  what to do (#6).
- Some routers take forever to boot. The Infra tab shows each chassis's boot
  time and its forwarding chip, including the Junipurr PacketOinker™ in the
  Chonk 800 and two of them in the Absolute Unit. On a slow booter, crashes
  last a few days longer, a rush repair still needs a day of booting, and
  swapping the only router takes three days. Bigger chassis are slow more
  often. A second router hides all of it.

## [1.4.0] — 2026-10-23

- Big peers have moods now. In some cities, large selective networks refuse
  new peering for a few months, or only take PNIs there, each with a reason
  ("the peering coordinator is on sabbatical", "a new VP wants to monetise
  interconnection"). Now and then they also tear down a session you already
  had, and traffic falls back to your next best path. Try another city or a
  PNI, and ask again later.
- Remote peering is still on offer, but it is now a last resort. Ports come
  through a reseller at 1.5× the price and only 80% of the port is really
  yours. Goggle, Faceplant, Comecast and several other selective networks
  refuse remote members outright. The route server still gets you every open
  network, and building a real POP removes all of this.
- DE-KICKS Group (Frankfurt, Madrid, Marseille, Dubai, Mumbai and New York)
  really hates open pricing. There is no price list, only a personalised
  quote that grows with how big you look. Haggling can get you a discount,
  raise the price "after consulting with management", or stall for a week
  behind an NDA. Prices are "harmonised" upwards once a year. Add-ons like
  Route Server Gold and Premium Port LEDs appear on your invoice until you opt
  out, which takes two clicks. Trying to leave gets you a retention discount
  that ends with a loyalty fee.

## [1.3.0] — 2026-10-23

- Event networks: festivals, trade fairs and big games book a fat temporary
  pipe in a city weeks ahead. Nothing is paid up front; deliver the bandwidth
  for the whole event and you get the full fee, fall short and the organisers
  pay less, fail badly and you pay them.
- SD-WAN for chains: kebab empires, coffee franchises and furniture giants
  want every shop wired back to their head office. Each site needs a path to
  the hub, and one dead spoke takes the whole contract down until it is fixed.
- Wholesale waves: once you light your own dark fiber, other carriers ask to
  rent spare spectrum on it as alien waves. Every slot you sell is one fewer
  channel for you.
- Dark fiber pair leases: fiber you built yourself can be leased out pair by
  pair to others for steady monthly money.

## [1.2.0] — 2026-10-23

- A bank: tap your cash to open it. Lenders (Goldman Sacks, Deutsche Bankrupt,
  Spätzle-Sparkasse, the Ministry of Tubes, Crypto Bros Capital, Venture
  Vultures, the Loan Shark and more) make offers with odd conditions. Offers
  come faster when you are in the red, so a bad hour no longer has to end in
  bankruptcy. Credit ratings, penalties for broken conditions, early repayment.
- Your game now saves every few seconds and whenever you leave the page, and a
  reload drops you straight back into your network.
- Release announcements: a "What's new" card after an update, and a banner with
  a one-click reload when a new version comes out while you are playing.
- Start a new network any time from the help screen.

## [1.1.0] — 2026-10-23

- Stuttgart, home of the Spätzle-IX.

## [1.0.0] — 2026-10-23

First public release.

- Cartoon world map with real-ish geography, magnified Europe and East Asia,
  about 50 cities and around 40 named subsea cable systems.
- POPs, home broadband, business customers with escalating customer levels
  (up to AI training interconnects and hyperscaler DCI) and quirky requirements.
- IP transit on 95th-percentile billing, IXs with route servers, peering
  policies, PNIs, embedded caches, NNI fabrics and remote peering.
- Leased waves, parallel links in shared or diverse trenches, dark fiber
  (lease or build) with DWDM line systems, amplifiers and ZR+/transponder optics.
- Router generations from 100G to 1.6T ports, extra routers and generators for
  redundancy.
- LAGs: bundle up to 8 identical ports to the same transit provider, IX or PNI.
- Traffic engineering: per-link traffic breakdown, link metrics, egress
  preferences, latency-aware and scenic routing.
- Mainland China (licenses, the Great Firewall, premium routes via Hong Kong),
  Russia (government boxes, throttling, sovereign internet drills) and an
  underserved Asian market.
- Dozens of failure types and geopolitical events, a NOC with an event log, and
  a NOC dashboard with traffic, money and per-ASN graphs.
- Cookieless Ridiculytics analytics on the live site only.
