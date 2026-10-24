# M1 Plan — REGION + applyRegion + rebuildDerived (Global only)

Scouted 2026-10-24. Worktree: `site/index.html` 3244 lines / 458609 bytes at scout end
(3224 lines / 457837 bytes at scout start = PRD basis exactly; a concurrent
render-only patch added +20 lines mid-scout — see §1a).
HEAD is 3037 lines / 442267 bytes — do NOT base M1 on HEAD; the uncommitted
reach-report/UI patch (+187 lines, all CSS + HUD/render, zero data-model changes) is the floor.

## 1. Line-number drift verdict: ZERO vs worktree

Every PRD §10 table row re-grepped against the worktree. All match exactly.
(Offsets vs HEAD vary +21…+163 because the uncommitted patch inserts CSS early
and render code late — irrelevant, PRD was written against the worktree.)

| PRD §10 row | Worktree | Status |
|---|---|---|
| 479 APP_VERSION | 479 | OK |
| 498 W,H,KM | 498 | OK |
| 513 PORT | 513 | OK |
| 535 PORT_SLOT | 535 | OK |
| 592 LENSES | 592 | OK |
| 593 proj0 | 593 | OK |
| 597 LANDS_LL | 597 | OK |
| 602 CITY_LL | 602 | OK |
| 603 CITIES | 603 | OK |
| 700 CITY_NUDGE | 700 (loop at 701) | OK |
| 703 CABLES | 703 | OK |
| 793 NETS | 793 (+10× NETS.push blocks, grep count = 10) | OK |
| 869 XIX | 869 | OK |
| 898 TAIL | 898 | OK |
| 977 BIZ_T | 977 | OK |
| 1036 UI | 1036 | OK |
| 1121 SCN | 1121 | OK |
| 1134 beginGame | 1134 | OK |
| 1267 newGame | 1267 | OK |
| 1281 wrapDx | 1281 | OK |
| 1304 t1Club | 1304 | OK |
| 1560 compute | 1560 | OK |
| 1722 sanitize | **1693** (1722 = migrate) | MISLABEL, see §2 |
| 1799 regionMult | 1799 | OK |
| 1805 linkLat | 1805 | OK |
| 1847 sfOf | 1847 | OK |
| 2024 dayTick | 2024 | OK |
| 2181 checkGoals | 2181 | OK |
| 2190 ACT | 2190 | OK |
| 2355 ACT.start | 2355 | OK |
| 2360 ACT.pickStart | 2360 | OK |
| 2393 bbCost | 2393 | OK |
| 2399 save | 2399 | OK |
| 2419 loadSave | 2419 | OK |
| 2806 showTitle | 2806 | OK |
| 2838 showHelp | 2838 | OK |
| 2937 visibleKs | 2937 | OK |
| 3128 wrapCam | 3128 | OK |
| 2919–2923 LANDP/ALLPOLY/onLand/WAVES/HILLS | 2919/2920/2921/2922–2924 | OK |

## 1a. Mid-scout concurrent edit (render-only, no data-model impact)

During scouting the worktree grew 3224 → 3244 lines (+20, 457837 → 458609 bytes).
New hunks are render-only: `draw()` HOT-grade paths (2991–3034), frame-loop
tweaks (3191+). Re-grepped all 38 §10 anchors after the edit: 36 unchanged,
2 shifted +20 downstream of the insertions — `wrapCam` 3128 → **3148** and
`boot` 3206 → **3226** (+ the `hot.ready` call at 3240). `ACT.start` is still
**2355** (an earlier SHIFT flag was a grep-delimiter artifact in the check
script, not a file change). Baseline re-run after the edit: 3/3 pass.
M1 implementer: use wrapCam=3148, boot=3226; everything else per §1 table.

PRD-internal errors found (fix in PRD, not in code):
1. §10/§17 "1722 sanitize" → `sanitize` is at **1693**; 1722 is `migrate`.
   M1 touches neither (save work is M2), but M2 implementer must use 1693/1722.
2. §11.1 asserts `NETS.filter(n=>!n.tail).length == 23` → actual **65**.
   (23 = base literal only; +42 come from the 10 `NETS.push` blocks + `TAIL.forEach` at 961.)
   §16.1 already says 65 — §11.1 is the stale one. Baseline test pins 65.
3. §6.2 "toS() (415410)" → typo; `toS` is at **2933**.
4. §7.1 "S.cnLic default di baris 2322" → default `{state:'none'}` is in
   `newGame` (~1270); 2322 is `applyCn`. Pattern reference still valid.
5. §7.1 "CN_LIC=150000 di baris 498" → actually **507** (498 is the W line).

## 2. Verified const→let conversion points + rebuildDerived dependencies

Target: `REGION = { global: {...} }` with `applyRegion('global')` reproducing
byte-identical derivations. M1 ships GLOBAL ONLY (no sea/idn data yet).

### 2.1 Scalars (line 498)
`const W=2000, H=1000, KM=14` → `let`.
- `rg \bW\b` = **51** (matches PRD's "51 pemakaian" claim exactly).
  2 are harmless shadow locals: 1895 (`W=pick(WAVECO)` incident string) and
  2719 (`const W=600,H=180` chart fn). True global reads ≈ 48. No `W=` writes
  to the global anywhere — conversion is a pure declaration change.
- `rg \bH\b` = **15** (matches PRD). Same story, no writes.
- `rg \bKM\b` = **1** (declaration only — KM is never read). Free.

### 2.2 Arrays / objects that become region-owned
| Line | Decl | → | Rebuilt from |
|---|---|---|---|
| 592 | `const LENSES` (7) | `let` | `REGION.global.lenses` literal; loop at 594 (`L.x/L.y = proj0(...)`) must re-run inside rebuildDerived |
| 593 | `function proj0` | `let proj0` + reassignment | `REGION.global.proj` (same formula) |
| 597 | `const LANDS_LL` (11 in literal) | source data | move literal into `REGION.global.lands`; **keep the 599 push** (`lk/sa/tw`) — LANDS_LL.length must stay **14** (baseline-adjacent assertion in §16.1) |
| 600 | `const LANDS` | `let`, recompute | `LANDS_LL.map(... proj ...)` — order matters: AFTER proj0/LENSES are set |
| 601 | `const DECOR` | `let`, recompute | same proj pass as LANDS (PRD table omits DECOR — include it) |
| 602 | `const CITY_LL` (94 keys) | source data | move into region data; single reader at 701 |
| 603 | `const CITIES` (94) | `let` | region cities; 701 loop attaches lon/lat/x/y via `proj` + `CITY_NUDGE` (700, stays global per-region later) |
| 702 | `const CITY` | `let`, `CITY = Object.fromEntries(...)` | after CITIES; all readers dereference per-call — safe |
| 703 | `const CABLES` (73) | source data (M1: same array) | region cables |
| 778 | `const CAB` | `let`, recompute | `Object.fromEntries(CABLES...)` (PRD table omits — include) |
| 779 | `const CABLE_PAIRS` (134) | `let`, recompute | needs CITY + W (wrap-aware `near`) |
| 786 | `const ALLC` | `let`, recompute | `CITIES.filter(...)` (PRD table omits — include; read by offers/spawn + nfx/ggl/akm pops) |
| 789 | `const BIGC` | keep `const` for M1 | static id list; all 74 ids exist in global. Flag for M3: must become region-scoped or filtered |
| 793 | `const NETS` (23 literal +10 push +TAIL.forEach → 125, 65 non-tail) | `let` | M1: same build sequence; M4c replaces with filtered region list |
| 961 | `TAIL.forEach` → NETS tail push | keep in build path | reads `ixStatic` (CITY+XIX) + `hstr`; runs AFTER CITY/XIX exist |
| 965 | `const NET` | `let`, recompute | after NETS final |
| 966 | `X.members=` loop | re-run | after NETS+NSH (PRD table omits 966 — include; drives peer UI + `ixMembers`) |
| 967 | `const NSH` | `let`, recompute | `NETS.reduce share` — MUST run after final NETS (this is the §6.5b order rule; M1 establishes the shape) |
| 970–971 | `NSH_RU/NSH_CN` | keep `const` for M1 | static weights; region-scoping is M4+ work |
| 972 | `CN_BLOCKED` | keep `const` for M1 | derived from NETS; recompute only when NETS becomes regional (M4c) |
| 869 | `const XIX` (25) | source data (M1: same) | region exchanges |
| 896 | `const XIXM` | `let`, recompute | after XIX |
| 898 | `const TAIL` (60) | source data (M1: same) | region tail |
| 2919 | `const LANDP` | `let`, recompute | `smoothPath` over LANDS+DECOR |
| 2920 | `const ALLPOLY` | `let`, recompute | `onLand` source |
| 2922 | `const R1/WAVES/HILLS` | `let`, recompute loops 2923–2924 | seeded `rng(7)` scatter; MUST re-seed + re-scatter or global map art changes |
| 2925 | `const CLOUDS` | `let`, recompute | also W/H-derived (PRD table omits — include) |
| 3056+ | `WL` cache | invalidate | `WL.key` snapshots render; stale key after rebind = wrong map. Reset in applyRegion |

### 2.3 Rebuild order (hard constraint)
```
proj0 → LENSES(+x/y loop) → LANDS_LL(+599 push) → LANDS → DECOR
 → CITIES(+701 coord loop) → CITY → CABLES → CAB → CABLE_PAIRS
 → NETS(base+pushes+TAIL.forEach) → NET → NSH → XIX → XIXM → X.members(966)
 → LANDP → ALLPOLY → WAVES/HILLS/CLOUDS(reseed rng(7)) → WL invalidate
```
`boot()` (3226) calls `compute()` which reads CITY/CABLE_PAIRS/NETS/NSH —
`applyRegion('global')` must run before that. Minimal M1 hook: call it at the
top of `boot()` (or end of script before the `boot(...)` invocation at 3240).

### 2.4 PRD §6 numeric claims re-verified live (harness, worktree)
- Strict bbox lon92–142/lat−9–21: `jkt,mnl,sin,kul,bkk,sgn` (6 cities) ✓
- Loose bbox lat≤26: +`hkg,tpe` (8 cities), `sum(P)` = **4450** ✓
- NETS: 125 total / **65** non-tail ✓ (§11.1's "23" is wrong, §16.1's 65 right)
- Survivors with POP in 8 core cities: **37** (= 32 non-tail + 5 tail) ✓
  tail survivors: Hawker Centre Hosting, Night Market Net, Bánh Mì Broadband,
  Jeepney Jumpnet, Chip Fab Cleanroom Net (note: TAIL rows use index `[2]`,
  not `.pops` — the PRD §6.5b survivor-count method must use `t[2]`)
- Dead by type: t1=1 (`lvl`), t2=9, cdn=24 (3 base + 21 tail-derived),
  eye=54 (20 base + 34 tail-derived). PRD's "33/55" counts are base-only
  (pre-TAIL.forEach); post-derivation totals are 88 dead / 37 alive.
  M4c filter must run on final NETS (after TAIL.forEach), not the base array.
- T1 coverage of 8 core: `lvl:0, ntt:8, tly:3, cog:2, tat:6` ✓ (`ntt` 8/8, Sea-Tree stays cancelled)
- `mnl.ix` = `""` ✓ (needs Adobo-IX in M4a); `isSub('sin','bkk')` = false
  (both `land:'eu'` — the glue §6.3 must break in M3a) ✓; NSH sums to 1 ✓

## 3. Baselines (recorded 2026-10-24, worktree as-is, zero source edits)

- `node --test tests/prd-baseline.test.js` → **3/3 pass**, ~1.9 s
  (global numbers unchanged; all cities on land; ntt covers 8/8 core)
- `npm test` (full suite, 9 files incl. prd-baseline) →
  **77/77 pass, 0 fail, 85.5 s**
  (PRD §16.1 claims 77 tests / 84.7 s — delta is machine variance; test script
  already includes `tests/prd-baseline.test.js`)
- `tests/prd-baseline.test.js` is UNTRACKED (`??`); `tests/issues.test.js`
  has +50 uncommitted lines (reach-report tests). M1 gate: all 77 pass
  **without modifying any test file**.

## 4. M1 work plan (for implementer)

1. Add `REGION` object + `global` entry holding current literals
   (W/H/KM, proj fn, lenses, lands LL, city LL, cities, cables, nets build,
   xix, tail, regionMult 2.5, startCities `[fra,nyc,sin,sao]` per §4.3/starts 2808).
2. Convert §2.2 decls `const`→`let`; add `applyRegion('global')` +
   `rebuildDerived()` in the §2.3 order; hook before first `compute()`.
3. Keep `BIGC/NSH_RU/NSH_CN/CN_BLOCKED` const for M1 (global-only, values identical).
4. Do NOT touch: animation loop, save/load keys, UI, tests.
5. Gate: `npm test` 77/77 unmodified + the §16.1 M1 assertions
   (CITIES 94, CABLE_PAIRS 134, XIX 25, TAIL 60, non-tail NETS 65,
   regionMult('sin') 2.5, kmBetween('fra','ams') 364, proj0(0,0) [1000,537.6],
   LENSES 7, LANDS_LL 14, CITY_LL 94).
6. If any gate fails → STOP, do not proceed to M2 (per PRD §13 fallback:
   separate builds per region, no selector).

## 5. Risks / follow-ups for coordinator
- R1 (PRD's own risk table): `const`→`let` on CITY/CITIES breaks boot if any
  top-level reader runs before applyRegion. Mitigated by §2.3 order + gate.
- R2: PRD §11.1's "23" and §10's "1722 sanitize" will mislead M2/M4
  implementers — fix those two PRD lines (doc-only edit, no code).
- R3: `rng(7)` re-seed in rebuildDerived must reproduce identical WAVES/HILLS
  or the global map art silently changes while tests stay green (no test pins
  scatter). Suggest adding a scatter-hash assertion to the M1 gate.
- R4: M4c must filter POST-derivation NETS (125 incl. tail-derived), not the
  65 base — PRD's "65→32" framing understates the dead set (88 dead / 37 alive).
- No blockers for M1 itself: FEASIBLE. All edit points verified, no drift,
  toolchain (`npm test`, harness) works, baselines recorded.
