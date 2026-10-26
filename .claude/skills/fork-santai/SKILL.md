---
name: fork-santai
description: Work safely in the Santainetwork fork of Series of Tubes — deploy with Docker, never touch origin, and avoid the temporal-dead-zone traps that have silently broken the map.
---

# Working in the Santainetwork fork

This repo is a fork. The upstream project is `fjaeckel/seriesoftubes`; the fork adds the
Indonesia and Southeast Asia maps, a role ladder, Komdigi/karhutla events, Waeve, and the
in-game exchanges. Read `docs/HANDOFF.md` for current state and `docs/FORK-NOTES.md` for rules.

## Remotes

| Name | Repo | Use |
|---|---|---|
| `origin` | `fjaeckel/seriesoftubes` | upstream. **Never push.** Only read, and only to port features |
| `santai` | `Santainetwork/seriesoftubes` | this fork. Push here |

`git push santai main`. Never `git push origin`, not even a branch, unless the user explicitly asks
for an upstream PR.

## Deploy is Docker, not systemd

The user rejected systemd for this project in plain words. Do not write unit files.

```bash
cd /opt/seriesoftubes
bash scripts/build.sh          # site/ -> _site/, stamps the version into APP_VERSION
docker restart seriesoftubes
curl -s -o /dev/null -w "%{http_code} %{size_download}\n" http://192.168.105.9:8099/
```

A 403 after a rebuild means the bind mount broke: `build.sh` does `rm -rf _site` and recreates it,
so the container can end up holding the old inode. Restarting the container fixes it.

## Temporal dead zone — this has broken the game three times

`site/index.html` is one long classic script, not an IIFE and not a module. `const` and `let` are
hoisted but uninitialised, so reading one before its declaration throws
`ReferenceError: Cannot access 'X' before initialization` and **the whole game fails to boot**.

**`typeof` does not protect you.** `typeof X` on a TDZ binding still throws. Use `try/catch`.

Three real cases, all of which shipped green tests and a dead game:

1. `lvReg()` read `REGION`, declared 4,000 lines below it.
2. `bowCables()` called `onLand`, declared after the call site.
3. `clearLand()` was called before `ALLPOLY` was rebuilt for the new region, so `onLand()` answered
   from the *previous* region's coastline and every check silently passed.

Rules:

- Before calling a function that touches map data, confirm its inputs are built. `ALLPOLY`, `LANDS`,
  `LANDP`, `COAST` and `CITY` are all rebuilt inside `applyRegion()`.
- When you add a `let f = () => ...` stub near a boot-time caller, **also assign the real
  implementation** once its data exists. A stub that returns `false` is worse than no stub: every
  guard built on it becomes a no-op that reports success.
- `paintWorld()` only runs inside `requestAnimationFrame`, so a crash there is invisible to the
  harness. A test must call it directly for each region.

## Verify before claiming

```bash
node -e "const {load}=require('./tests/harness.js');const h=load();
h.ev(\"beginGame('N','jkt',{region:'idn'})\");
console.log(JSON.stringify(h.errors));"
```

`errors: []` is the minimum bar. Then run the relevant `tests/*.test.js`, then the full suite, then
deploy and curl the byte count.

Never report a fix from reading the diff. Report it from a number you measured after the change.

## One writer per file

`site/index.html` is a single 1 MB file, so any two workers editing at once destroy each other.
Before a long edit, run `hermes kanban ls --status running`. If a card is writing the same file,
reclaim or block it first. If a measurement changes between two consecutive commands, suspect a
concurrent writer before suspecting your own code.

## Internal documents stay local

`PRD.md`, `SOT_*.md` and any `*.pdf` are gitignored on purpose — the user objected to internal
documents being published. Do not move them into `_site/` or into the repo.

## Player saves are sacred

`loadSave()` is region-scoped and there are backups. Never change the save key or the shape of
`S` without a migration, and never let a new code path drop an existing save. A player lost a
long game once and said, in so many words, that he was tired of rebuilding.

## Names are parodied on purpose

Exchange and NAP names are deliberately misspelled to avoid trademarks: `JKT-IKS`, `IXI`, `AIKS`,
`SisiX`, `BIKS`, `DU-CIKS`, `ODIKS`, `PANDA-IKS`, `BatamIKS`. Keep new ones in the same style. A
real company name in the game is a bug.
