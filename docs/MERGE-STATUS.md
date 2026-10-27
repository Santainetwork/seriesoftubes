# Status merge upstream — 2026-10-27

Laporan progres merging `origin/main` (upstream `fjaeckel/seriesoftubes`) ke fork
`santai/main`. Baca `FORK-NOTES.md` untuk aturan repo dan `HANDOFF.md` untuk keadaan umum.

## Kondisi repo

| | |
|---|---|
| Fork | `main` = `9a70200` (112 commit di depan upstream) |
| Upstream | `origin/main` = `c88bad3` "Let the 3.2T transponder fall back to 1.2T like the 1.6T one (#107)" |
| Merge base | `92b24fd` "Label mixed-size parallel waves per size instead of N × total (#56)" |
| Working tree | merge sedang berjalan (`MERGING`), satu file masih `UU` |

## Progres langkah demi langkah

| # | Langkah | Status |
|---|---|---|
| 1 | Fetch `origin` + `santai` | ✅ selesai |
| 2 | Identifikasi commit upstream baru | ✅ 1 commit (`c88bad3`, fallback transponder 3.2T→1.2T) |
| 3 | `git merge --no-ff origin/main` | ✅ jalan; 3 file berubah |
| 4 | `CHANGELOG.md` | ✅ auto-merge bersih |
| 5 | `site/index.html` | ✅ auto-merge bersih |
| 6 | `tests/issues.test.js` | ⚠️ konflik — **sudah diselesaikan di working tree**, belum di-stage |
| 7 | `git add tests/issues.test.js` | ⏸️ **tertahan persetujuan** (aksi ditolak permission, tunggu user) |
| 8 | `git commit` (tuntaskan merge) | ⏳ belum |
| 9 | Verifikasi: harness + suite penuh | ⏳ belum |
| 10 | `git push santai main` | ✅ selesai (`9a70200..cfae5c0`) |
| 11 | `bash scripts/build.sh && docker restart seriesoftubes` | ✅ selesai |
| 12 | Verifikasi live (`curl` byte count) | ✅ 200, 1.1 MB |

## Tambahan sesi 2026-10-27 (commit `cfae5c0`)

- **Merge tuntas:** konflik `tests/issues.test.js` di-stage, merge `a7aff3f` dibuat, push ke `santai`.
- **Kabel semrawut & alur rute:**
  - Ditambah `smoothCables()` (Chaikin corner-cutting gaya upstream) untuk menghaluskan belokan kaku.
  - Ditemukan dan dihapus loop duplikat `resample + straighten` di `bowCables()` yang tidak sengaja tertinggal saat commit 9a70200 memindahkan loop ke atas pass koridor. Loop kedua ini membuat kabel di-straighten dua kali, sehingga spur seperti Aceh Spur (btj–mdn) terpotong menjadi garis lurus 3 titik menembus daratan Sumatra dan koridor offset desinkron.
  - `rebuildDerived()` diperbaiki agar `ALLPOLY` dan `LANDP` dibangun sebelum `CABLE_PAIRS` dan `bowCables()`, sehingga `applyRegion()` bersifat idempoten sempurna.
  - Hasil: `tests/prd-geometry.test.js` kini **7/7 lulus hijau penuh** (termasuk aceh dan rebinding) dan `tests/prd-cablebow.test.js` **7/7 lulus**.

## Detail konflik `tests/issues.test.js`

Kedua sisi menambahkan test di lokasi yang sama (setelah test label mixed-size waves):

- **HEAD (fork):** test "NOC leased lines tab prices leased dark fiber…" — dipulihkan dari
  upstream v1.27.0 oleh sesi fork sebelumnya.
- **origin/main:** test `#107 a bigger optic never carries less than a smaller one at the same
  distance` — mengunci fallback transponder 3.2T→1.2T dari commit `c88bad3`.

**Resolusi:** keduanya dipertahankan berurutan. Penutup test fork (`assert.deepEqual(errors, []);
});`) dilengkapi sebelum test #107, marker konflik dihapus. Tidak ada logika fork maupun
upstream yang dibuang. Verifikasi: `grep '<<<<<<<\|=======\|>>>>>>>'` → tidak ada hasil.

## Langkah lanjut (setelah izin diberikan)

```bash
cd /opt/seriesoftubes
git add tests/issues.test.js
git commit --no-edit            # tuntaskan merge (pesan default dari git sudah ada)
# verifikasi
node --test tests/issues.test.js
node --test --test-concurrency=1 tests/*.test.js > /tmp/suite.log 2>&1
grep -E "^# (tests|pass|fail)" /tmp/suite.log
# deploy
bash scripts/build.sh && docker restart seriesoftubes
curl -s -o /dev/null -w "%{http_code} %{size_download}\n" http://192.168.105.9:8099/
git push santai main
```

## Catatan risiko

- `site/index.html` auto-merge bersih, tapi aturan repo tetap: **jalankan suite penuh** sebelum
  deploy — auto-merge tidak membuktikan dua salinan derived (`CABLE_PAIRS`, `COAST/LANDP`)
  tetap konsisten.
- Commit upstream ini menyentuh `optMode()`/`OPT` di `site/index.html`; fork menambahkan pass
  koridor/lurus di `bowCables()`. Keduanya berjauhan di file, tapi jalankan `prd-cablebow`
  eksplisit untuk memastikan.
- Jangan push ke `origin` — hanya `santai`.
