# Skill yang dibutuhkan developer Series of Tubes

Hasil audit 26 direktori skill di `~/.hermes/skills` terhadap pekerjaan nyata di repo ini. Yang
dimaksud "dibutuhkan" bukan yang enak dipunya, tapi yang **sudah terbukti** dipakai atau
diperlukan untuk menyelesaikan bug yang muncul di grup.

## Sudah ada dan wajib dibaca

| Skill | Kenapa perlu |
|---|---|
| `seriesoftubes-dev` | Aturan repo: worktree terpisah, `const`→`let`, `CABLE_PAIRS` ganda, `tr()` tidak ada, build→restart→curl. Ini yang mencegah bug berulang. |
| `test-driven-development` | Setiap perbaikan di repo ini lahir dari test yang gagal dulu. Suite 364 test; tanpa TDD, merge kemarin kehilangan 11 perilaku tanpa terdeteksi. |
| `systematic-debugging` | Empat fase: pahami dulu. Keluhan "eyeball 20 Tbps" ternyata bukan kurva P, tapi `Math.max(cal, hw)` yang membiarkan router besar menembus plafon demografis. |
| `simplify-code` | Satu file 940 KB menampung seluruh game. Cleanup paralel 4-agent menjaga tidak jadi benang kusut. |
| `requesting-code-review` | Sebelum commit yang menyentuh `site/index.html`. |
| `node-inspect-debugger` | Harness JSDOM mengeksekusi game di Node; `node --inspect-brk` satu-satunya cara menembus state `S` saat runtime. |
| `codebase-inspection` | Mengukur pertumbuhan file: 503 KB → 940 KB dalam 3 minggu. Tanpa angka, pembengkakan tidak terasa. |

## Sudah ada, relevan tapi belum dipakai

| Skill | Untuk apa |
|---|---|
| `networking` / `network-routing-benchmarks` | Domain game ini: BGP, IXP, PNI, latency. Berguna saat memvalidasi apakah `t1Club()` atau `isSub()` masuk akal terhadap jaringan nyata. |
| `hermes-virtual-office-ops` | Kantor 3D tempat progres dipantau. Dipakai malam ini untuk sinkron agent. |
| `jcode` | Harness dev tmux. |
| `web/blocked-page-recovery` | Saat mengambil data PeeringDB/World Bank untuk kalibrasi `P` kota. |
| `creative/architecture-diagram` | Untuk diagram topologi di PRD. |

## Belum ada — ini celahnya

Tiga area kerja berulang yang **tidak punya skill** dan selalu dikerjakan dari nol:

### 1. Kalibrasi data geografis dan demografis

Setiap kali menambah kota, memperbaiki poligon, atau menggeser `P`, prosedurnya diulang manual:
unduh Natural Earth, jalankan `build-idn-land.py`, cek kota di darat, jalankan
`build-cable-paths.py`, cek titik tengah kabel di laut, lalu audit ring salah pulau.

Yang seharusnya jadi satu skill: **sumber data mana yang dipakai untuk apa** (World Bank untuk
populasi metro, PeeringDB untuk IX dan role ladder, Natural Earth 1:50m untuk garis pantai),
ambang yang sudah terbukti (`area >= 1.0` pakai centroid, ring kecil pakai vertex terdekat,
`MIN_AREA = 0.02`), dan pemeriksaan wajib setelah generate (0 kota di laut, 0 titik tertimpa,
label ring cocok dengan `land` kota).

### 2. Grafik canvas 2D di satu file

`paintWorld()`, `bowCables()`, `smoothPath()`, lensa proyeksi, dan LOD semuanya tulisan tangan
di dalam `index.html`. Tidak ada panduan kapan memakai `LANDP_ALL` vs `LANDP_FAR`, bagaimana
`wrapDx()` menangani peta yang membungkus, atau mengapa `CABLE_PTS` harus di-key
`"<cid>|<a>|<b>"`.

Yang dibutuhkan: skill kanvas untuk repo ini — urutan gambar, aturan LOD, cara menambah lapisan
tanpa membuat `paintWorld()` makin lambat, dan cara menguji hasilnya tanpa mata (hitung jarak
titik tengah, cek titik di dalam poligon).

### 3. Menyeimbangkan ekonomi game

`eyeCap`, `eyeMul`, `eyeBoost`, `PORT` 8 tingkat, `RG` 17 model router, `EYE_RATE`, `komdigiTax`
12,75%, `ROLE_UP` 4 transisi. Tidak ada dokumen yang menjelaskan **hubungan** antar angka ini,
jadi setiap penyesuaian dikerjakan dengan coba-coba dan sering merusak yang lain.

Yang dibutuhkan: skill balance — berapa target eyeball per kota terhadap traffic Indonesia nyata
(~10–15 Tbps nasional, Jakarta ~3 Tbps), bagaimana `Math.max(cal, hw)` membocorkan plafon, dan
cara menguji bahwa menaikkan satu angka tidak membuat role lain mustahil.

## Rekomendasi urutan

1. **Balance** — paling sering diminta pemain, paling mudah salah, dan sudah ada dua keluhan
   nyata yang menunggu (eyeball 20 Tbps, T1 tidak tercapai).
2. **Data geografis** — dikerjakan setiap kali peta berubah, dan kesalahannya diam (ring salah
   pulau tidak terlihat sampai ada yang zoom).
3. **Kanvas** — paling jarang berubah, tapi paling mahal kalau salah.
