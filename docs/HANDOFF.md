# Serah-terima ke harness berikutnya

Ditulis 2026-10-26, setelah sesi panjang memperbaiki peta, kabel, level, T1, dan i18n.
Baca `docs/FORK-NOTES.md` dulu untuk aturan repo; dokumen ini soal **keadaan sekarang** dan
**apa yang belum selesai**.

## Keadaan saat ini

| | |
|---|---|
| Versi | **1.29.0** (merge upstream v1.28/v1.29 sedang berjalan, lihat di bawah) |
| Commit | `ab021e6` di `main`, sudah di-push ke `santai` |
| Live | `http://192.168.105.9:8099/` dan tunnel, ~1,08 MB |
| Repo | `Santainetwork/seriesoftubes` (privat). `origin` = upstream, **jangan disentuh** |
| Dev | `bash scripts/build.sh && docker restart seriesoftubes` |

## Yang sudah diperbaiki sesi ini

Semua di bawah ini punya test pengunci. Kalau test itu merah, perbaikannya hilang.

| Masalah | Test | Angka |
|---|---|---|
| Peta SEA/IDN tergambar di atas peta dunia | `prd-paint` | `paintWorld()` memakai `LANDP` regional, bukan `COAST` global |
| Poligon dekorasi global menimpa garis pantai | `prd-paint` | `DECOR_LL` ikut berganti region |
| Papua tergambar dua kali | `prd-paint` | proyeksi 90–156 BT, maxX 1999 dari kanvas 2000 |
| Timor terpotong tepi bawah | `prd-paint` | lintang 28–-12, Dili di y=1089 dari 1200 |
| Madura + Kangean dilabeli Bali | `prd-rings` | keduanya `jav` sekarang |
| Lombok dilabeli Bali | `prd-rings` | `ntb`, dan karhutla/isSub jadi benar |
| Tanjung Pinang `land:'kep'` (id hantu) | `prd-rings` | jadi `btm` |
| Level 4+ mustahil di IDN/SEA | — | `lvReg()` dibatasi `maxRegions` |
| T1 mustahil di IDN/SEA | `prd-t1reach` | `lvl` dapat POP di `jkt`, `sin`, `hkg` |
| Kabel menyeberang darat | `prd-cablebow` | 27,3% → **1,5%** titik di darat (batas data routing) |
| Kabel berliku/melengkung liar | `prd-cablebow` | detour 3,08× → **2,24×**, patahan 572/5414 |
| Tombol anti-DDoS mati | `prd-scrub` | `'scrub'` → `buildScrub`/`rmScrub` |
| Kredit penulis hilang dari game | `attribution` | `HTIW` + `plugHtml()` di 3 layar |
| Toast versi baru tidak pernah muncul | `prd-update` | 3/3 (dulu 0/3) |
| i18n mati | `i18n` | `navigatorLanguage` + `lang` di harness, `pt` terdaftar |
| 24 berkas upstream hilang | — | dipulihkan dari `origin/main` |

## Yang **belum** selesai — ini tugasmu

### 1. Suite belum hijau penuh

Run terakhir (`/tmp/audit_v29.log`) menunjukkan kegagalan yang perlu diperiksa satu per satu:

```
not ok 159 - PRD §16.1: every city sits on land in the global map
not ok 166 - idn: 34 cities including Singapore, all on land, none isolated
```

Dua ini kemungkinan efek perubahan proyeksi SEA/IDN (90–156 BT, 28–-12 LS) yang membuat
`prd-m1-global`/`prd-m3` masih memakai koordinat lama, **atau** benar-benar ada kota yang
terdorong ke laut. Ukur dulu: hitung kota yang `onLand(CITY[x].x, CITY[x].y) === false`.

Sisa kegagalan lain (kalau ada) hampir pasti fitur upstream v1.28/v1.29 yang belum ter-port:
`indexed routing`, `fast routing index`, render invalidation, panel catch-up, payday floaters.

### 2. Merge upstream v1.28/v1.29 belum tuntas

Worker kanban sempat menulis `package.json` dan `site/index.html` bersamaan, jadi versi lompat ke
1.29.0 tapi merge-nya belum lengkap. Yang perlu dicek:

- `git log --oneline origin/main -3` → `c88bad3`, `92b24fd`, `3cd30aa`
- Fitur baru: region Afrika dan Brazil, bahasa Portugis, `perf-bench`, lima perbaikan bug
- Risiko: region Afrika/Brazil bisa mengganggu peta SEA/IDN kalau `applyRegion` tidak siap

### 3. Kabel: warna masih cuma 3

`cableCol(C)` mengembalikan `'#14A88C'` (harga ≤0.85), `'#2F7BEA'` (≤1.1), `'#A05AE0'` (sisanya).
Semua kabel murah jadi hijau, jadi 99 pair terlihat seperti satu benang. Permintaan Arcello:
**8–10 warna stabil dari hash `cid`**, tetap terkelompok per harga. Belum dikerjakan.

### 4. Kabel: belum "sejajar"

Permintaan terakhir Arcello: "buat agar lebih rapi dan sejajar gitu sudutnya". Sekarang kabel
mengikuti garis pantai (rute laut asli), bukan grid sejajar. Kalau mau benar-benar sejajar,
pendekatannya bukan offset render lagi — perlu **menyederhanakan rute** jadi segmen panjang
(atau mengkuantisasi arah ke kelipatan 15°/45°), lalu offset paralel per segmen.

### 5. `CLAUDE.md` masih milik upstream

Isinya menyebut `seriesoftub.es`, `Frederic Jung` sebagai committer, dan aturan rilis upstream.
Menulis ke `CLAUDE.md` atau `AGENTS.md` **diblokir** oleh guard file instruksi agent (butuh
persetujuan manusia, dan prompt-nya timeout dua kali). Aturan fork ada di `docs/FORK-NOTES.md`.
Kalau mau `CLAUDE.md` diganti, minta Arcello menyetujui prompt-nya.

### 6. Saldo kas tidak cukup untuk scrubbing center

Arcello melaporkan tombol anti-DDoS tidak bisa ditekan dengan kas **Rp 3.356.640 K** (= Rp 3,36
miliar) sementara harga **Rp 972.000 K** (= Rp 972 juta). Secara angka cukup, jadi kemungkinan
itu **bug tampilan `fmt$`**: `Rp 972.000 K` bisa dibaca 972 ribu atau 972 juta. Tombolnya sudah
kuperbaiki (aksi `'scrub'` tidak ada), tapi belum diverifikasi dengan kas besar di browser nyata.

## Cara memverifikasi apa pun

```bash
cd /opt/seriesoftubes

# 1. Muat game di harness dan ukur
node -e "const {load}=require('./tests/harness.js');const h=load();
h.ev(\"beginGame('N','jkt',{region:'idn'})\");
console.log(h.ev('CITIES.length'), JSON.stringify(h.errors));"

# 2. Satu suite
node --test tests/prd-cablebow.test.js

# 3. Semua (9-12 menit)
node --test --test-concurrency=1 tests/*.test.js > /tmp/suite.log 2>&1
grep -E "^# (tests|pass|fail)" /tmp/suite.log

# 4. Deploy dan buktikan
bash scripts/build.sh && docker restart seriesoftubes
curl -s -o /dev/null -w "%{http_code} %{size_download}\n" http://192.168.105.9:8099/
```

## Jebakan yang sudah memakan waktu — baca sebelum mengedit

1. **Worker kanban menulis `site/index.html` bersamaan.** Kalau angka pengukuran berubah sendiri
   di antara dua perintah, cek `hermes kanban ls --status running` dulu. Ini sudah tiga kali
   membuatku menyimpulkan "bug" yang sebenarnya file ditimpa proses lain.
2. **TDZ.** `lvReg()` pernah membaca `REGION` (dideklarasikan 4.000 baris di bawahnya) dan
   `bowCables()` memanggil `onLand` sebelum deklarasinya. Keduanya `ReferenceError: Cannot access
   before initialization` yang membuat **seluruh game gagal boot**. `typeof` **tidak** melindungi
   dari TDZ — pakai `try/catch`.
3. **`paintWorld()` hanya jalan di `requestAnimationFrame`.** Harness tidak akan menangkap error di
   sana kecuali test memanggilnya langsung. Pernah ada crash tiap frame dengan suite hijau.
4. **Ukur dua sisi, jangan satu.** Menaikkan `CORRIDOR` menurunkan jumlah kabel berimpit tapi
   membuat detour 15,8× dan 1.546 persilangan. Metrik tunggal selalu bisa dimenangkan dengan cara
   yang salah. Selalu ukur **detour + persilangan + patahan + titik di darat** bersamaan.
5. **Data routing ≠ render.** Kabel "kusut" ternyata 0,9% di darat pada data mentah, tapi 30%
   setelah offset render. Periksa `CABLE_PTS` mentah dulu sebelum menyalahkan renderer.

## Papan kerja

Kanban Hermes di `http://127.0.0.1:3001` (Virtual Office). Agent: `deepseek-dev`, `glm-dev`,
`spark-dev`, `asoy`, plus enam agent non-teknis. `default` sengaja disembunyikan kantor — jangan
menugaskan pekerjaan ke sana, tidak akan terlihat.

Kartu yang masih terbuka saat dokumen ini ditulis: merge v1.28/v1.29, warna kabel, dan UI
peering/transit/infra.
