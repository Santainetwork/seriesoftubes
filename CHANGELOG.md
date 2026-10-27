# Changelog

All notable changes to this project are documented here. The project follows
[Semantic Versioning](https://semver.org/). Each release is deployed to
[seriesoftub.es](https://seriesoftub.es).

## [Unreleased]

- Money readouts showed NaN on the Indonesia map. A stale panel button could build a POP keyed "undefined": the simulator then read a city that does not exist, crashed mid-day, and froze the cash display. The build now refuses an unknown city, and a save that already carries a phantom POP heals when it is loaded.
- Cables draw smoother. Hard corners are rounded the same gentle way the original game bends its lines, while the lane separation that keeps parallel cables apart is preserved. A duplicate resampling loop that flattened short spurs (like the Aceh Spur) into straight 3-point lines was removed, and regional rebinds now preserve cable geometry identically.

## [1.29.0] — 2026-10-26

- Merged upstream v1.28.0 and v1.29.0 into the fork. Africa grows from five cities to twenty-six with its own scenario, Brazil gets all forty IX.brrr locations, the game speaks Portuguese, RouteScript learns `prefer transit`, `avoid transit`, `prepend transit` and `protect customers`, twelve more Latin American cities and seven new African cables arrive, and big networks get a lot faster. Everything the fork had on top of v1.27 survives the merge: the Indonesia and SEA maps, the Natural Earth coastline, the sea-routed cables, the Komdigi licence, karhutla, the conferences and the Indonesian NAPs. The NOC's Leased lines tab is back too — the 1.27.0 merge had left it calling a function that no longer existed, so opening it threw.
- Goals and badges that a map can never satisfy are no longer shown on it. On the Southeast Asia and Indonesia maps a player was told to "have POPs on 3 continents" and shown a "Six Continents" badge when the whole map is one continent, so neither could ever be claimed. Seventeen goals and badges were impossible there, including three that named cables or cities the map does not have. They now disappear from the panel on maps that cannot supply them, and stay on the map that can.
- The goals panel showed every role's goals to every role. An ISP saw all 31 goals while the counter said 19, including three other roles' private ladders and a broadband goal it cannot even buy.
- A DE-KICKS badge was handed out on day one on the regional maps. "Ports at all six DE-KICKS exchanges" was checked against an empty list, which counts as satisfied, so a brand new network with one POP and no ports got an Epic badge for nothing.
- Hyperscaler fiber deals were unreachable on the Indonesia map, and threw an error on the Southeast Asia one. A fiber-pairs deal was gated behind an AI campus it does not use, so a map with no campus could never sell one; and the AI WAN deal could pick a campus that is not on the map, which failed the whole day instead of offering a contract.
- Tier 1 was unreachable on the Southeast Asia map. The club asked for POPs on two continents, but every city on that map is in one, so no amount of traffic or peering could open the door: a player with all 49 POPs, 3.2 Tbps served and 106 peering sessions was still refused for a continent the map does not contain. The requirement is now capped at what each map actually offers, and SEA's own rule states the honest number.
- A hosting outfit could not level up. Peak traffic — the number the customer levels are built on — was fed only by IP traffic, and a private circuit never passes an IP exit: a cloud on-ramp or an AI interconnect moved hundreds of gigabits, paid for them, and counted for nothing. Signing a 400G on-ramp could even make peak traffic fall, because the circuit was allocated before the IP customers and took the whole chassis. Private circuits now count towards peak traffic, and they are allocated after IP traffic instead of before it. A restricted role also obeys the level each customer type asks for, so a level-1 hosting outfit can no longer sign an AI interconnect that the rest of the game only offers at level 4.
- A bigger router no longer invents broadband demand. The eyeball ceiling was `max(calibrated, chassis)`, so a single Chonk 800 gave all 34 Indonesian cities the same 12,800 Gbps ceiling and Manado — 1.2 million people, a calibrated ceiling of 144 Gbps — could sell 1,768 Gbps off two Absolute Units, 12.3x what the city justifies. A chassis may now lift a city's ceiling to at most three times its calibrated figure, and no further than it can forward. Raising the regional multiplier instead would not have worked: 30 of the 34 cities were pinned by the chassis, not the multiplier.
- Singapore is no longer the cheapest big city on the Indonesia map. The boost table that lifts the biggest cities had a dead key (`mks`, which matched no city — Makassar is `upg`) and no entry at all for Singapore or Makassar, so both defaulted to 1.0: Singapore reported a 1,080 Gbps ceiling while Surabaya reported 2,160 at the same 450 Gbps of calibrated traffic. The table now has an entry for every city and is monotone in P, so more traffic can never mean a lower ceiling and two cities with the same traffic report the same number.
- Cables no longer pile up mid-route, and they no longer scribble. Routes that share a strait used to converge back onto the same waypoints after the hub fan had separated them; they are resampled and then offset into lanes that follow the strait, so two cables through the Sunda Strait run side by side instead of on top of each other. The sea router also stopped sending a 14px hop via Singapore. Waypoints per route went from 10 to 23, the average drawn detour from 3.1x to 2.2x, and sharp turns from 123 in 743 vertices to 94 in 5,414.
- Cables on the global map went missing. The sea router's output for the Asia maps was written over the whole route table, so the 139 routes between cities outside Southeast Asia lost their waypoints and every one of those cables was drawn as a straight line again. The table is the union of both now: the dense regional routes where the router produced them, the older ones everywhere else. The London–New York cable measures 6,362 km again, which is what caps a transatlantic wave at 1.2T.
- Your own subsea cable can no longer be longer than any optic can light (#88). New York to Sydney now says so before you pay, instead of after the ship comes home. Calling off a cable while it is still being laid returns most of the price of the part not laid yet, and an unusable cable from an older save goes back for a full refund.
- Your own IX can now live in either building of a two-site metro, or in both with a second switch, so a dark building no longer takes your exchange down (#36). The LAG buttons that did nothing on your own IX are gone.
- Upgrading the only router in a POP that has nothing plugged in yet no longer opens a maintenance window or a NOC warning (#105).
- Declining a loan offer clears the bank badge right away, even while the game is paused (#104).
- The 3.2T transponder now falls back to 1.2T between 4,000 and 5,500 km (6,000 to 8,250 km subsea), like the 1.6T one, instead of dropping to 800G (#107). A bigger optic now carries at least as much as a smaller one at every distance.
- Parallel waves of different sizes now show each size on the map, like 800G + 400G, instead of a misleading 2 × 1.2T (#56).
- Picking a subsea route from a city without a cable landing, like Oslo, now names the nearest landing station instead of saying its cables reach "nowhere" (#50).
- Big networks lag a lot less: on a network with a hundred POPs and a thousand peering ports, the NOC dashboard opens six times faster, the side panels three times faster, and each game day takes about a third less time. The map needs about a third fewer drawing steps per frame, and open panels only update what changed, which keeps them smooth and lets the traffic bars glide to their new values. The connection and customer lists in the NOC dashboard show 100 rows at a time, with a button for more. While the game is paused or animations are off, the map is only redrawn when something on it changes, which saves a lot of battery on phones. On a phone, the map also rests while the NOC dashboard fills the screen, so scrolling it stays smooth.
- Africa grows from five cities to twenty-six, across nineteen countries, and a new scenario, Cape to Cairo, asks you to cross it. New: Dakar, Abidjan, Accra, Douala, Kinshasa, Luanda, Casablanca, Algiers, Tunis, Djibouti, Addis Ababa, Mombasa, Dar es Salaam, Kampala, Kigali, Maputo, Durban, Windhoek, Lusaka, Harare and Gaborone, each with its own IX. Overland fiber across an African border costs twice as much, and Kinshasa, Lusaka and Harare have unreliable power.
- Brazil now has all forty IX.brrr locations, from Manaus to Lajeado, so you can build a real national network. Fiber into the Amazon costs twice as much and its repair crews go by boat, Oi Oi, TIM-TIM Mobile and Brisanada join Brazil's networks, and a new scenario, Order and Progress, asks you to peer on 20 IX.brrr exchanges.
- Series of Tubes now speaks Portuguese (Brazil). The game follows your browser's language the first time, and you can switch to Português under Settings or on the title screen.
- Come chat with other players in the new Series of Tubes Signal group. It's linked from the title screen, the menu and How to play: share screenshots, report bugs and argue about peering policy.
- RouteScript speaks more BGP. `prefer transit` and `avoid transit` set which upstream goes first, like local-pref, `prepend transit PROVIDER 1-3` moves part of an upstream's traffic away, the way AS-path prepending nudges the rest of the internet, and `protect customers` routes business traffic first when links are congested, so home users take the hit instead of your SLAs. A new Optimize button drafts a script from live traffic and points out networks you could reach over an IX or a PNI instead of transit.
- Twelve more Latin American cities: Montevideo, Asunción, Córdoba, La Paz, Quito, Medellín, Caracas, Guatemala City, San José, Querétaro, Monterrey and Guadalajara. Moviestar, Liberty Latte America, Antelope and Tiger Mobile join them, and Salvador and Montevideo get cable landings.
- Seven new cables around Africa (ACE of Spades, SAT-3-Legged Stool, MainOne-Track Mind, Mint Tea West Africa, Set SAIL, Sea-Comedy Hour and Dare-Devil-1), and the existing ones now stop in the new cities. Set SAIL and SACS-y Cable link Brazil to Cameroon and Angola, and Sea-Comedy Hour links Djibouti to Mumbai. Liquid Lunch Networks, Sea-Comedy Networks, Angle-a Cables, Djibouti Calling, Empty-N, Air-Tell Africa, Ethio-Tele-Calm and Atlas Shrugged Telecom join the networks.
- Hamburg and Munich join the map, with the Moin-IX and the Brezn-IX. Stuttgart and Frankfurt are back where they belong on the map, with Stuttgart between Frankfurt and Zurich instead of halfway to Prague.
- Swapping router models now sells the old ones on eBuy for 30% of their price, and removing a router does too (#82). A POP takes one swap a day, so a double click no longer buys two upgrades, and optics and waves now say which port speed they need instead of naming one model.
- Fiber between nearby cities bends gently again instead of looping wide around the neighbourhood, so dense regions like Toronto, Ottawa and Montreal stay readable.
- The game no longer gets slower after a long pause. The money that floats up from your cities on payday kept piling up off-screen instead of fading, hundreds of them on a big network.

## [1.28.0] — 2026-10-25

- Merged upstream v1.28.0: Belgium and Luxembourg, four new North American cities, waves that can
  join any route between two cities, embedded caches in either building of a two-site metro, and
  the Korean sender-pays market, on top of the fork's own maps and fixes.
- Belgium and Luxembourg join the map: Brussels, Oostkamp and Bettembourg (#79). Belgian POPs and transit cost more, and Belgian homes stay with their two big ISPs unless you run an ad campaign there. Telenyet, Proxyminus, B.I.G.S., Citrus Belgium and CityMess join the networks, a new cable connects London to Oostkamp through some very busy fishing grounds, and Bettembourg's cooling depends on a steady supply of waste wood.
- Four new cities in North America: Kansas City, Calgary, Vancouver and Ottawa (#76). Canada gets two more big networks, Tell Us and Bodgers Communications, which you also reach through the Tier 1s they buy transit from. Ottawa's power grid is about as reliable as you would expect, and Canadian fiber has a new natural enemy.
- New waves can join any route you already have between two cities, so two waves can run on the main route and two on the diverse one (#77). Each extra route shows up as its own choice, priced like the route it joins.
- Embedded caches can now sit in either building of a two-site metro (#69). A new box goes to the building with fewer of them, you can move boxes between A and B in the Peering tab, and a dark building only takes out the boxes inside it.
- Reach in the top bar no longer rounds up to 100% when it is just short, and the Goals tab now says why you are not Tier 1 right now (#73). Tier 1 needs more than 99.9% reach, so one small network out of reach is enough to lose the title.
- Customers in Russian cities no longer get unhappy because of Goggle's throttling (#70). People there simply get, and ask for, half as much Goggle video, so a well-built network serves the whole city again and the throttled half no longer fills your links.
- Incidents now come first in the NOC, with the ones you can fix in one click at the top (#63). No more scrolling past hot ports and congested links to replace a broken optic.
- Opening a link from the NOC on mobile now closes the NOC sheet so the link details are visible.

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

## [1.26.1] — 2026-10-25

- Subsea cables no longer disappear when you zoom in on the map (#49).

## [1.26.0] — 2026-10-25

- Customer levels now go up to 13 instead of 4. Every new level asks for more peak traffic, POPs and continents, ending at 50 Tbps and 80 POPs on six continents, and each one unlocks new customers, gear or deals. Reaching level 13 earns a new legendary badge.
- Seven new router models arrive between levels 5 and 13, including the first 3.2T routers with 3.2T ports and 12.8T waves. The Absolute Unit 3.2T is the main upgrade; whitebox, licensed, deep-buffer, Finnish and budget side-grades sit next to it.
- Paid-peering giants now give you a free PNI once you are big enough. Doitsche Telekomm gives in at level 6, then Voda-Phony, Tel-Mess, Etis-a-lot, China Moble, Du-opoly and Ooh-redoo.
- Loans got stranger, and good ones got harder to get. Your credit rating now adds a
  risk premium to the interest rate, the big banks only lend to strong ratings, and a
  loan worth more than five months of revenue also takes 2–8% of your revenue until
  it is repaid.
- Your own subsea cables now run much faster optics over long distances (#66). Subsea fiber is built for its whole route, so optics reach about half as far again as on land: Paris–Ashburn gets 1.2T per channel instead of 400G, and the 1.6T transponder gains a 1.2T long-haul setting on land too.
- Leased subsea waves now follow the same physics as your own cables (#68). A wave can only be as fast as its cable's length allows: transatlantic still takes 6.4T, the longest transpacific cables top out at 400G or 800G. Waves you already have keep running.
- You can lay your own subsea cable between two landing stations that also share a landmass, like Marseille–Singapore or Cairo–Palermo (#67).
- Declined PNI requests no longer repeat over and over behind an open window such as a DE-KICKS quote. Buttons hidden behind a window can no longer be pressed with the keyboard, and a declined PNI now shows why straight away instead of leaving its button there.
- New customers at the higher levels: esports world finals, sovereign cloud regions, cloud gaming platforms, metaverse platforms, AGI labs and Mars mission ground stations.
- Traffic keeps growing as you level up. Levels 5, 8, 10 and 12 each start a new era (4K everywhere, cloud gaming, VR, AI agents) that raises how many eyeballs every city wants.
- New optical gear for big networks: ROADMaster 9000 C+L line systems with 128 channels, Sienna WaveMagic 3.2T transponders, and eight fiber pairs in your own land trenches. Your own exchange gets a 102.4T fabric and scrubbing goes up to 100T.
- The "Next level" hint keeps names like Edge Lord 400 readable instead of lower-casing them.
- Your own subsea cable now runs beside the existing cable on its route instead of looping far out to sea (#64). Leased and own fiber next to a busy trench no longer swing out in giant loops either, on any route.
- New lenders: Ballooney Brothers (nothing to pay until it all comes due at once),
  Stormy Weather Lending (every open incident adds 2% to your rate), Peer Pressure
  Partners (you repay with 30% of your transit bill), Horoscope Holdings (the stars set
  your rate each month) and Papa Pizza Capital (cheap, but every incident means pizza
  for the NOC).
- New loan conditions: an odd number of POPs, no building in Bude, no diesel
  generators, no new links on a Friday, no Goggle caches, a job for the CEO's nephew
  and a yacht for the chairman.
- The in-app "What's new" is shorter: the first sentence of each change, at most
  five, with a link to the full release notes on GitHub.

## [1.25.2] — 2026-10-25

- Tier 1 networks can lay their own subsea cable (#22). Pick two cities with a
  cable landing station, pay a frankly rude amount of money, wait while a cable
  ship crosses the ocean, and own up to eight fiber pairs outright. It pays for
  itself in a few years if it replaces enough leased waves. Whales may cause
  delays.

## [1.25.1] — 2026-10-25

- Once you have half a billion in the bank, the banks stop sending loan offers
  (#52). They come back if your cash drops below that again.

## [1.25.0] — 2026-10-25

- Your own trench can carry more than one fiber pair (#35). Once a ROADMaster
  9000 has all 64 channels lit, light the next pair: another ROADMaster and
  another chain of amplifiers for 64 more channels, up to four pairs.

## [1.24.0] — 2026-10-25

- New scenario: Flood Season. Amsterdam in peak botnet season: a DDoS flood
  every few days, a third of them in the terabits and growing all year, on
  top of everything else that breaks. Hold 20 floods, 5 of them over 1 Tbps,
  with the city under attack still getting 97% of its traffic. Expect smart
  toasters, sentient fridges and one very determined printer.
- Fixed: when a DDoS attack started while another was still running, the
  first one ending could wipe out the new one early.

## [1.23.0] — 2026-10-25

- Fixed: on a phone, a first-time player could not get past the "Play it as an
  app" screen in the browser, and the Install button on the title screen did
  nothing. Settings now also opens from the title screen, as promised in 1.20.0.
- Taps land where you meant them (#44): a tap only presses the button it started
  on, nothing behind a menu that opened or closed mid-tap counts, a toast that
  pops up under your thumb ignores taps for half a second, and panels no longer
  redraw under your finger.
- The world map draws much lighter (#43). The detailed coastline is now painted
  once into an image and reused, also when zoomed in, instead of being redrawn
  every frame. This should fix the garbled map on Firefox for Android, and makes
  zooming smoother on every phone.
- Cairo now reaches the Middle East overland across the Sinai, like Istanbul
  does across the Bosporus (#47), at the same intercontinental price.
- The Tier 1 label shows what you are now (#46): buy transit again or lose a
  Tier 1 PNI and it drops, with a message saying why. Your Tier 1 badge stays.
- When an update adds new networks, you get a free 60-day courtesy route to
  the ones you cannot reach yet (#46), so your reach no longer drops overnight.
  Saves from before this version get it too.
- Unplugged optics go on a spares shelf instead of in the bin (#45): the next
  channel of that type uses a spare for free, or you can sell spares on eBuy
  for 40% of their price.

## [1.22.0] — 2026-10-25

- Scenarios show their goal and your progress at all times (#34): a card at the
  top of the Goals tab breaks the goal into steps with progress bars and shows the
  days left. The top bar on desktop, and the Goals tab on phones, show how far you
  are.
- Your customer level is always visible too: a card in the Goals tab shows what
  the next level unlocks and how close you are to it, and the Rank box shows
  your level.
- The NOC dashboard has tabs: Overview, Customers, Connections, Traffic and
  Links & routers, so you no longer scroll through everything at once.
- The share card draws links that cross the Pacific on both edges of the map
  (#42).

## [1.21.0] — 2026-10-25

- The world map now has real coastlines (#41, thanks @aulmaru). Greenland, the
  Arctic, Indonesia, the Philippines, Japan, Madagascar, Tasmania and New
  Zealand show up properly, and the Mediterranean, Black Sea, Red Sea, Gulf and
  Baltic have their real shapes. Zoomed out, the tiniest islands are left off so
  the map stays readable.

## [1.20.0] — 2026-10-25

- A proper Settings screen, from the menu or the title screen: alerts, animations,
  sound and language in one place, saved on your device.
- The game can pause when a customer turns furious, so you no longer lose
  customers to a notification you missed at 8× speed (#13). It is on by
  default and can be switched off in Settings, where you can also choose to
  pause on outages that cost you real traffic.
- Customer happiness is easier to keep an eye on (#15). You get an early warning
  when a customer drops below 60%, with the reason. A Customers box in the top bar
  (on phones, a red count on Deals) shows how happy they are overall.
- A Customers list in the NOC dashboard shows everyone who pays you, unhappiest
  first, with what they pay, whether they are getting happier or angrier, and
  exactly what is wrong. Filter it to the unhappy ones or by city, and tap Open
  to go to them (#14).

## [1.19.0] — 2026-10-25

- See all your connections in one place (#31, #33, #38): a new Connections list
  in the NOC dashboard shows every transit port, PNI, IX port, cache and fabric
  port, with where it is, how full it is and what it costs each month. Filter it
  by type, city or network, and tap Open to go straight to it. In the Networks
  tab, each network now shows where you connect to it, one tap away.
- On a phone, the game now explains why it is better installed as an app before
  you start a new network: full screen, offline, and on iPhone a save that
  Safari won't clear. It shows exactly how to add it to your home screen,
  and warns that on iPhone a game started in the browser stays there. You can
  still play in the browser.

## [1.18.4] — 2026-10-25

- The iPhone home-screen fix from 1.18.3 now stays in place. Before, it worked
  at launch and then the empty strip under the tab bar came back.

## [1.18.3] — 2026-10-25

- Installed on an iPhone home screen, the game now fills the whole screen. Before,
  the tab bar floated above an empty strip at the bottom.

## [1.18.2] — 2026-10-25

- A new legendary badge, A Petabit a Second, for serving a full petabit per
  second (a thousand terabits) of happy traffic.

## [1.18.1] — 2026-10-25

- New goal and badges for DDoS defence: a goal to stand up your first
  scrubbing center, and badges for weathering an attack, holding a
  multi-terabit flood, running a clean-pipe or a sacrificial PNI, blackholing
  your own city, and landing a HackBack that actually works.

## [1.18.0] — 2026-10-25

- Overland waves between continents (Europe to the Middle East and Asia) now cost
  45× the normal price, about ten times the subsea route or more, as in real life.
  Dark fiber pairs aren't sold on those routes at all (#40). Links you already
  lease keep their price.
- No more limit of four cache boxes per CDN in a POP: each box takes a router
  port, and free ports are now the only limit (#39).
- Scrubbing centers now come in tiers — 100G, 1T and 10T of clean bandwidth.
  A center cleans an attack only up to its capacity; a bigger flood leaks the
  rest past. Centers can run always-on, or cheaper on-demand, which takes a
  couple of days to engage once an attack starts.
- Transit clean-pipe add-on. Turn it on for a transit port and the provider
  scrubs a flood entering there before it ever reaches you, for a monthly fee
  per port.
- Sacrificial PNI. Mark a Chinese PNI as a deliberate choke point: a flood
  arriving over it dies on the small port instead of flooding your core, but
  legitimate traffic across it runs at half capacity.
- IX blackhole. A new mitigation on the live attack panel: announce the
  victim to the exchange and about half the members drop the junk — the
  customer stays up, unlike a full RTBH.
- Selling DDoS protection now carries an SLA: if a protected customer's city
  is hit and still goes down, you pay out an SLA credit and they get unhappy.

## [1.17.1] — 2026-10-25

- Flowspec is now a property of your router, not a licence you buy once. The
  drop rules live in hardware (TCAM), and the budget differs by model: the
  used Rusty Router can't do it at all, merchant-silicon and whitebox models
  filter a known flood part-way, and the big chassis knock it right down. The
  NOC shows how many of your POPs are Flowspec-capable, and the live attack
  panel names the router doing (or not doing) the filtering.

## [1.17.0] — 2026-10-25

- DDoS attacks now have a shape: a vector (DNS reflection, NTP or CLDAP
  amplification, SYN or HTTP flood), a size from a few Gbps up to a
  multi-terabit "botnet of toasters" monster, a target POP, a duration, and
  an entry point among that city's uplinks. Most are modest spikes; the big
  ones are rare.
- A DDoS toolbox in the NOC. A live attack panel shows the vector, size,
  entry and what each mitigation is doing right now:
  - **RTBH** — free and instant, but it blackholes the victim, so the
    attack and the customer both go dark. Earns the Collateral Damage badge.
  - **Flowspec** — a one-time licence that drops known UDP floods (DNS, NTP,
    CLDAP, SYN) at your edge. Precise, but useless against an HTTP flood, and
    the junk still fills the port it enters.
  - **Scrubbing center** — cleans attacks network-wide, as before, and still
    risks the GRE/MSS black hole.
  - **HackBack 3000™ by Skynot AI** — a tempting red button. Sometimes it
    ends the attack; more often it flattens an innocent and earns you a
    regulator fine and the Vigilante badge. Hack-back is illegal in reality.

## [1.16.0] — 2026-10-25

- Customers on interconnection fabrics. Companies already on Megapork,
  PocketFabric or Consolation Connect ask to buy transit from you over the
  fabric, or for a circuit from the fabric to one of your POPs. Both come in
  through your NNI port in that city, so you need a port there with room for
  them.

## [1.15.0] — 2026-10-25

- The map gets cleaner as you zoom out (#37): cities turn into dots, your POPs
  into small router pills, links get thinner, and only your own cities keep
  their labels. Up close, a POP shows your router instead of the skyline,
  and a city with a second building shows a small router B on its metro
  ring, so dual-site POPs stand out.
- Parallel waves on the same cable or in the same trench draw as one line
  with a combined label, like "8×6.4T · 7/8 up" (#19).
- Decommission POPs, one at a time or several at once, from the Infra tab.
  Everything in them goes, and customers who depended on them are let go
  with three months of their contract as an early-termination penalty.
- Dark fiber panels now list the other links between the two cities and can
  add a parallel link, like waves already could.
- NLNOG Day joins the conference calendar, in Amsterdam every September (#32).

## [1.14.0] — 2026-10-24

- More of Britain and Norway: Manchester, Edinburgh, the cable town of Bude
  in Cornwall, and Stavanger, with British and Norwegian eyeball networks
  (Bee-Tee, Sky-High Broadband, Virgin Mediocre, Tele-Nor-Way).
- Nine new cables: NO-UK-Way across the North Sea (with dark fiber for
  sale), Celtic Norsemen from Ireland to Norway, Havhingsten Hoofbeat from
  Blackpool to Denmark, the Shefa Sheep Line to Iceland via the Faroes, Oil
  Rig Wi-Fi from Stavanger to the Netherlands, Pas de Câble under the
  Channel, and Apollo 13, Yellow Brick Road and Glo-in-the-Dark into Bude.

## [1.13.2] — 2026-10-24

- On phones, the "new version is out" notice is a small card above the tab
  bar again instead of filling the whole screen.

## [1.13.1] — 2026-10-24

- New home-screen icons. On iPhone and on Android's round and squircle
  icons, the tube now sits on a full sky-blue background instead of a frame
  inside a frame.

## [1.13.0] — 2026-10-24

- Made for phones. A one-row status strip at the top, a tab bar at the
  bottom (play, speed, goals, deals, NOC, networks), and bottom sheets you
  drag up, down or away; on a phone held sideways they slide in from the
  side. Notifications tap away, dialogs open as sheets, and the start button
  stays in reach.
- Install it like an app: Series of Tubes now works offline and can be added
  to your home screen on Android and iOS (look for "Install" on the title
  screen or in Settings). It opens full screen and still updates itself.

## [1.12.0] — 2026-10-24

- Korea's "sender pays" market. Transit into Seoul costs four times the
  usual price, and the three incumbents, Kay-Tea, SK Broadbandit and LG
  You-Pay-Plus, only peer over paid PNIs billed per gigabit you send them.
  Glitch may quit Korea over the fees, Faceplant may quietly reroute Korean
  users via Hong Kong, and the new Gangnam Style Peering scenario starts you
  in Seoul. Collect all three PNIs for the Sender Pays badge.
- Sparkly Seabone is a Tier 1 now (#23), with a backbone across the
  Mediterranean, Europe and the Americas. New games need a PNI with all six
  Tier 1s to go transit-free; saves from before this release keep the five.
- Optical control plane meltdown: one bad update at your wave supplier, and
  every wave you lease from it in a region goes dark at once. Your own dark
  fiber carries on.
- New ways for things to go subtly wrong: LACP trouble (hash polarisation,
  timer mismatches, a member in the wrong switch, min-links set a little too
  keen), partial packet loss from dirty connectors, CRC errors and
  microbursts (deep-buffer routers shrug those off), and PMTUD black holes
  where pages to one network load halfway and stop.
- The top bar fits itself to the screen in every language: when labels get
  long, the less important readouts step aside instead of wrapping over the
  side panels.

- Series of Tubes now speaks Italian. The game follows your browser's
  language the first time, and you can switch between English and Italian
  under Settings or on the title screen; the choice is remembered (#26, thanks @daniloctdev).
- Want the real thing? The title screen, the help page and the victory screen
  now point to How the Internet Works by Thomas Kjær Aabo, an interactive,
  zoomable guide to how your packets actually travel.

## [1.11.0] — 2026-10-24

- Very long dark fiber works now (#17, #30). Optics drop to a slower, longer-
  reaching setting past their full-rate reach: the 1.6T transponder runs at
  800G to 7,000 km and 400G to 12,000 km, and ZR+ optics halve their speed
  to double their reach. Regeneration sites go further: each one turns the
  light back into bits and sends it on fresh, so optics only have to reach
  the next site. Existing long fibers light up without changes.
- "Quietest links" routing no longer flips between two paths every day. It
  judges how busy a link is without the customer's own traffic, splits the
  circuit over two paths that are about as quiet, and keeps yesterday's
  choice unless a new one is clearly better (#28).
- Fewer "-ish" names. Conferences and the RIPE NCC use their real names,
  data centers are named after their streets and districts, and cables,
  carriers and routers got proper puns instead (Concerto in Sea Minor,
  Circe du Soleil, Strait Outta Taipei, Jeddah-i Express, Kyiv Superstar,
  Du-opoly and friends).
- Customers who are afraid of sharks only ask for routes that can stay on
  land. No more Americas-to-Eurasia requests without a subsea cable, and
  impossible asks in existing saves are dropped (#16).
- The game no longer freezes when a peer drops you at a rival exchange
  (#24, thanks @daniloctdev), or when a route leak melts down one. The
  messages now name the exchange and its city.
- One failing day no longer freezes the whole game: the error is caught,
  you get a heads-up, and time keeps running.
- Barcelona joins the map with Catnip-IX, local transit and peering, and the
  Medusa Stare cable along the coast to Lisbon and Marseille (#18, thanks
  @NickBouwhuis).
- Community exchanges: FRIES-IX, Paella-NIX, KleyWrecks, LO-NAPS, JINXED-IX,
  IX Strayla and Bento-IX have their own, smaller member lists and cheaper
  ports. FRIES-IX 10G and 100G ports and LAG members are free.
- New networks get a random name, from Shinternet to Bogon Voyage. Click
  "Another one" for more questionable branding, or type your own (#27,
  thanks @NickBouwhuis).

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
