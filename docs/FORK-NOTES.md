# Catatan fork: Series of Tubes IDN + SEA

Dokumen ini menggantikan `CLAUDE.md` (yang masih milik upstream: menyebut seriesoftub.es,
Frederic Jung, dan aturan rilis upstream) untuk pekerjaan di fork ini.

Fork Indonesia + SEA dari [fjaeckel/seriesoftubes](https://github.com/fjaeckel/seriesoftubes).
Satu halaman statis: `site/index.html` (HTML, CSS, JS dalam satu file, tanpa framework).
Bahasa kerja: **Indonesia** untuk laporan, Inggris untuk kode dan komentar.

Upstream ada di `origin`, fork kita di `santai` (`Santainetwork/seriesoftubes`, privat).
**Jangan pernah push ke `origin`** — repo itu milik orang lain dan konsepnya berbeda.

## Perintah

```bash
npm ci                        # sekali: jsdom untuk test
npm test                      # semua suite; wajib hijau
npm run test:quiet            # ringkas (dot reporter), untuk log
node scripts/i18n-check.js    # harus "0 missing, 0 unused, 0 broken"
bash scripts/build.sh         # bangun _site/ (stamp versi + release notes)
```

Untuk melihat hasil kerja:

```bash
bash scripts/build.sh && docker restart seriesoftubes
curl -s -o /dev/null -w "%{http_code} %{size_download}\n" http://192.168.105.9:8099/
```

`_site/` yang disajikan nginx (bind mount Docker); `site/` sumbernya. **Mengedit `site/` tidak
mengubah apa pun yang dilihat pemain sampai di-build.** `tests/harness.js` membaca `site/`, jadi
suite hijau tidak membuktikan apa pun tentang yang di-deploy.

## Aturan keras

- **Satu file, dua salinan derived.** `site/index.html` membangun ulang beberapa tabel dua kali:
  sekali saat modul dimuat, sekali di dalam `applyRegion()`. `CABLE_PAIRS` dan `COAST`/`LANDP`
  adalah kasus yang sudah pernah salah. Sebelum mengedit tabel derived, hitung dulu
  `grep -n "CABLE_PAIRS=CABLES" site/index.html` — harus **dua** hasil.
- **`const` → `let` untuk global yang di-rebind.** `CITIES`, `NETS`, `PORT`, `LEVELS`, `DECOR_LL`
  dideklarasikan `const` di upstream tapi di-rebind per region di fork ini.
- **`tr()` ada, tapi `DICT` hanya terisi kalau `i18n/<lang>.js` dimuat.** Bahasa terdaftar di
  `window.SOT_LANGS`; kalau menambah bahasa, daftarkan di situ atau `LANG` jatuh ke `en`.
- **Nama diplestetin.** Tidak ada nama perusahaan nyata untuk network, vendor, kabel, bank, data
  center, atau exchange. Plesetan harus **pun**, bukan nama asli digeser satu huruf.
- **Save pemain suci.** Field baru dapat default di `newGame()` dan pemeriksaan di `sanitize()`.
  Jangan pernah menghapus save yang sudah ada; `clearSave()` juga harus menghapus backup.
- **Test menyertai fitur.** Test di-seed, tidak boleh bergantung keberuntungan. Kunci **hubungan**
  (`eyeCap(jkt) > eyeCap(smg)`), bukan angka yang tumbuh tiap rilis.
- **Harga selalu bilangan bulat.** IDR dibulatkan ke ribuan (`Rp 45.402 K`), USD ke dolar utuh.
  Tombol harga tidak boleh perlu ditafsirkan.
- **Laporan ke grup: hanya hasil.** Versi, jumlah test, ukuran byte, dan apa yang diperbaiki.
  Jangan stream progres, output tool, atau hasil background run.

## Jebakan yang sudah memakan waktu

- **`Math.max(cal, hw)` di `eyeCap()` membocorkan plafon.** Router besar *menciptakan* permintaan,
  bukan hanya melayani. Dengan Chonk 800 semua 34 kota melaporkan plafon identik 12.800 Gbps.
- **`LV_REQ` menuntut benua.** Peta IDN/SEA hanya punya satu region, jadi level 4+ mustahil sebelum
  `lvReg()` dibatasi `maxRegions`.
- **`t1Club()` menuntut benua yang tidak ada di peta.** SEA menyatakan `t1Continents:2` padahal
  ke-49 kotanya `reg:'AS'`, jadi Tier 1 mustahil di sana — 49 POP, 3,2 Tbps dan 106 sesi tetap
  ditolak. Ini kelas bug yang sama dengan `lvReg()`; sekarang dibatasi `mapRegionsCount()`, dan
  nilainya di `rules` juga diperbaiki jadi 1.
- **Tier 1 butuh PNI dengan semua T1**, dan PNI hanya bisa dibangun di kota yang punya POP jaringan
  itu. `lvl` (Level Tree) dulu hanya punya POP Eropa/Amerika, jadi T1 mustahil di peta Asia.
- **`t1Sessions` tidak ada di `rules` region mana pun** — semua memakai literal 20, gerbang yang
  tidak pernah diumumkan ke pemain.
- **`S.stats.peak` hanya menghitung lalu lintas IP**, sedangkan produk andalan role Hosting adalah
  sirkit L2 yang menyumbang 0 ke peak. Pemain bisa berpendapatan ratusan juta dengan peak 0.
- **Proyeksi bisa membuang peta keluar kanvas.** Papua timur sempat sampai x=2558 pada kanvas 2000
  dengan `wrapX:false`, jadi tergambar ulang di kiri bawah sebagai Papua kedua.
- **Memisahkan kabel punya dua sisi.** Menaikkan `CORRIDOR` menurunkan jumlah kabel berimpit tapi
  membuat rute melengkung liar: pada 80, detour rata-rata 15,8× jarak lurus dan 1.546 pasang kabel
  saling menyilang. Selalu ukur **detour** dan **persilangan**, bukan hanya tumpukan.
- **`paintWorld()` hanya jalan di `requestAnimationFrame`.** Harness tidak akan menangkap error di
  sana kecuali test memanggilnya langsung — pernah ada `const LANDP` yang dirujuk sebelum
  deklarasinya dan renderer crash tiap frame tanpa satu test pun gagal.
- **Worker kanban menulis `site/index.html` bersamaan.** Kalau angka pengukuran berubah sendiri,
  cek `hermes kanban ls --status running` sebelum menyimpulkan ada bug.

## Gaya kode

- JavaScript padat dalam satu file. Ikuti gaya sekitarnya: nama helper pendek, arrow function,
  HTML template literal, tanpa dependensi baru.
- UI dibangun ulang dari state: ubah `S`, lalu panggil `after()`. Tombol adalah
  `btn(label, actName, args, cls, disabled)` yang mengirim ke `ACT[actName](args)`.
- Semua akses network lewat `netOf()`, jangan `NET[id]` mentah — pola ini sudah tiga kali membuat
  tab freeze.
- Komentar pendek dan tentang **mengapa**, bukan apa.

## Test yang mengunci perilaku penting

`prd-paint` (peta tidak menggambar di luar kanvas, tidak ada poligon asing) · `prd-rings` (setiap
kota di ring pulau yang benar) · `prd-cablebow` (ujung kabel tetap di kota, detour wajar) ·
`prd-t1reach` (setiap T1 punya POP di peta) · `prd-capwarn` (hitungan mundur kapasitas) ·
`prd-update` (toast versi baru muncul) · `prd-komdigi` · `prd-karhutla` · `prd-geometry`.

## Kredit

Game aslinya oleh Frederic Jung. Panduan visual *How the Internet Works* oleh Thomas Kjær Aabo
(https://tkjaer.github.io/how-the-internet-works/) ditautkan dari layar judul, bantuan dan
kemenangan. Jangan hapus atribusi itu — `tests/attribution.test.js` akan gagal.
