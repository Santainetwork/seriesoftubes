# Backlog

Open work on the Indonesia + SEA fork. Mirrors the Virtual Office kanban board
(`http://127.0.0.1:3001`, tasks `t_*`) so the list survives a lost session.

## Open

- **Verifikasi merge 1.27.1 di browser sungguhan** (p0, `t_f9e1222e`).
  The suite is green at 334/334, but nobody has played the merged build. Check the region
  picker sticks, the map draws, no city sits in the sea, and the router panel shows its
  capacity delta.

- **Perbaiki 8 ring Indonesia yang salah pulau** (p3, `t_dec7a7e3`).
  Aru, Taliabu, Wetar, Kai Kecil, Natuna, Kangean, Komodo, Kai Besar. None holds a city or a
  cable, so the damage is a few specks in the wrong colour, but they are wrong.

- **Region Global masih pakai garis pantai gambar tangan** (p3, `t_7d26a317`).
  `LANDS_LL` is 14 rings with a 0.074° median error against the real coast. Natural Earth 1:50m
  worldwide is 1,026 rings / 28,784 points / ~420 KB, and `index.html` is already 938 KB, so the
  table belongs in a fetched asset, not inline.

- **Commit kartu kanban ini ke repo sebagai backlog** (p4, `t_ff221a4e`).
  This file.

## Done this session

- RT/RW net broadband refusal toast now specifies what the role sells (DIA to businesses) instead of generic rejection (`t_bdb8ef6b`). r2 goal text fixed to business DIA.

- Merge upstream v1.27.0; 334/334 tests, live as 1.27.1.
- Sumatra was drawn twice (`btm` mislabelled the whole island); fixed, zero overlapping points.
- Eleven behaviours the upstream rewrite had dropped were restored: `BIZ_T.remote`, GOALS
  `by:`/`win:` tags, `renderLeft` counting, `t1Club` region thresholds, the mood-bleed cap,
  the `WRAPX` guards, the `hSave` chip, and unguarded `CITY[c]` reads.
- Region picker sticks again (`loadSave({keepRegion:true})`).
- Fork test suites run on the merged code (22/22).
- `package.json` test script globs `tests/`; the two geometry generators moved into the repo.
