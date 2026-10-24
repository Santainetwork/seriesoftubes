# BRIEF 3 — Kalibrasi `P` dengan data asli

**Untuk harness.** Ini **revisi angka** untuk `SOT_BRIEF_2.md` §1 dan §2.6, bukan dokumen baru yang berdiri sendiri. Baca brief 2 dulu, lalu ganti angka `P` dan tabel kota dengan yang di sini.

**Alasan revisi:** Arcello minta *"pertimbangkan dengan data asli biar ada kemiripan dengan realitas"*. Semua angka `P` di brief 1 dan 2 adalah tebakanku. Sekarang dihitung dari World Bank + PeeringDB.

**Repo:** `/opt/seriesoftubes` · `site/index.html` 3.428 baris

---

## 0. Sumber data

| Data | Sumber | Diambil |
|---|---|---|
| Populasi metro | World Bank `SP.POP.TOTL` + metro area (UN WUP) | 2025-10-25 |
| Penetrasi internet | World Bank `IT.NET.USER.ZS` 2024 | 2025-10-25 |
| Fixed broadband per 100 | World Bank `IT.NET.BBND.P2` 2024 | 2025-10-25 |
| IX member count | PeeringDB `/api/ix?country=XX` | 2025-10-25 |
| Traffic IX | HKIX/SGIX stats page (tidak bisa di-scrape, lihat §5) | — |

---

## 1. Kalibrasi: bagaimana `P` dihitung

Game memakai `P` sebagai **populasi kota**, dan `bb.d = max(8, P*0.03)` sebagai kapasitas eyeball awal yang tumbuh ke arah `P`.

**Cara kalibrasi:** ambil 8 kota SEA yang sudah ada di game, hitung *internet users* asli per kota, lalu cari rasio `users / P`.

| id | Metro pop | Penetrasi | Internet users | `P` game | users / P |
|---|---|---|---|---|---|
| `jkt` | 33,4 M (Jabodetabek) | 72,8% | 24,32 M | 900 | 27.017 |
| `mnl` | 14,7 M (Metro Manila) | 67,3% | 9,89 M | 600 | 16.488 |
| `bkk` | 11,2 M (Bangkok) | 90,9% | 10,18 M | 600 | 16.968 |
| `hkg` | 7,5 M | 95,8% | 7,18 M | 600 | 11.975 |
| `sgn` | 9,3 M (HCMC) | 84,2% | 7,83 M | 500 | 15.661 |
| `sin` | 6,1 M | 94,4% | 5,76 M | 450 | 12.796 |
| `tpe` | 7,0 M (Taipei–Keelung) | 90,0% | 6,30 M | 450 | 14.000 |
| `kul` | 8,4 M (Klang Valley) | 98,0% | 8,23 M | 350 | 23.520 |

**Median: 16.075 internet users per 1 unit `P`.** Stdev 5.293 (33% spread) — game memang tidak konsisten, tapi median-nya bisa dipakai.

**Formula untuk 24 kota baru:**

```
P = (metro_pop × internet_penetration) / 16.075
```

Dibulatkan: `<50 → kelipatan 5`, `<300 → kelipatan 10`, `≥300 → kelipatan 25`.

**Penetrasi per negara (World Bank 2024):**

| Negara | Penetrasi | Fixed bb/100 |
|---|---|---|
| Malaysia | 98,0% | 13,5 |
| Hong Kong | 95,8% | 40,3 |
| Singapore | 94,4% | 27,8 |
| Thailand | 90,9% | 14,9 |
| Vietnam | 84,2% | 23,7 |
| **Indonesia** | **72,8%** | **4,9** |
| Philippines | 67,3% | 7,1 |
| Laos | 62,0% | — |
| Cambodia | 60,0% | — |
| Myanmar | 45,0% | — |
| Timor-Leste | 40,0% | — |

**Catatan penting soal Indonesia:** penetrasi 72,8% tapi **fixed broadband cuma 4,9 per 100 penduduk**. Artinya mayoritas akses lewat **mobile**, bukan fiber ke rumah. Ini justru membenarkan `regionMult AS = 2.5` dan mekanik "mobile-first" — tapi juga berarti `bb.d` untuk kota Indonesia seharusnya tumbuh **lebih lambat** dari kota Thailand/Malaysia. Kalau mau lebih realistis, `idn` bisa diberi `bbGrowth: 0.7` (30% lebih lambat).

---

## 2. Tabel final — 32 kota SEA

**Ganti seluruh tabel di brief 2 §1.1 dan §4.4 dengan ini.**

### 2.1 8 kota existing (tidak berubah)

| id | Nama | lon | lat | `P` | `land` | IX sekarang |
|---|---|---|---|---|---|---|
| `jkt` | Jakarta | 106.85 | −6.20 | **900** | jav | Nasi-IX |
| `mnl` | Manila | 120.98 | 14.60 | **600** | ph | **KOSONG** |
| `bkk` | Bangkok | 100.50 | 13.76 | **600** | tha | Tom-Yum-IX |
| `hkg` | Hong Kong | 114.17 | 22.32 | **600** | hkg | HK-Kicks |
| `sgn` | Ho Chi Minh City | 106.66 | 10.76 | **500** | vnm | Pho-IX |
| `sin` | Singapore | 103.82 | 1.35 | **450** | sg | Lah-IX |
| `tpe` | Taipei | 121.56 | 25.03 | **450** | tw | Bubble-Tea-IX |
| `kul` | Kuala Lumpur | 101.69 | 3.14 | **350** | mla | Satay-IX |

### 2.2 24 kota baru — **angka `P` dikalibrasi**

| id | Nama | lon | lat | `P` | `land` | Metro pop | users | Catatan |
|---|---|---|---|---|---|---|---|---|
| `sby` | Surabaya | 112.75 | −7.25 | **450** | jav | 9,9 M | 7,21 M | Gerbangkertosusila |
| `han` | Hanoi | 105.85 | 21.03 | **450** | vnm | 8,5 M | 7,16 M | |
| `bdg` | Bandung | 107.61 | −6.91 | **375** | jav | 8,5 M | 6,19 M | Bandung Raya |
| `smg` | Semarang | 110.42 | −6.99 | **270** | jav | 6,0 M | 4,37 M | Kedungsepur |
| `mdn` | Medan | 98.67 | 3.59 | **210** | sum | 4,7 M | 3,42 M | Mebidangro |
| `jog` | Yogyakarta | 110.37 | −7.80 | **180** | jav | 4,0 M | 2,91 M | Kartamantul+ |
| `plm` | Palembang | 104.75 | −2.98 | **160** | sum | 3,5 M | 2,55 M | Patungraya Agung |
| `rgn` | Yangon | 96.16 | 16.87 | **160** | mmr | 5,6 M | 2,52 M | penetrasi Myanmar rendah |
| `pen` | Penang | 100.33 | 5.41 | **150** | mla | 2,5 M | 2,45 M | **baru**, George Town |
| `ceb` | Cebu | 123.89 | 10.32 | **130** | ph | 3,2 M | 2,15 M | Metro Cebu |
| `upg` | Makassar | 119.42 | −5.15 | **120** | sul | 2,7 M | 1,97 M | Mamminasata |
| `dps` | Denpasar | 115.19 | −8.65 | **110** | bal | 2,5 M | 1,82 M | Sarbagita |
| `bjm` | Banjarmasin | 114.59 | −3.32 | **100** | kal | 2,2 M | 1,60 M | Banjarbakula |
| `pnh` | Phnom Penh | 104.92 | 11.56 | **90** | khm | 2,3 M | 1,38 M | penetrasi Kamboja 60% |
| `dvo` | Davao | 125.61 | 7.07 | **80** | ph | 1,8 M | 1,21 M | Metro Davao |
| `bpn` | Balikpapan | 116.83 | −1.27 | **70** | kal | 1,5 M | 1,09 M | + Samarinda |
| `btm` | Batam | 104.03 | 1.13 | **60** | btm | 1,4 M | 1,02 M | Batam–Bintan |
| `mdc` | Manado | 124.84 | 1.47 | **50** | sul | 1,2 M | 0,87 M | Bimindo |
| `pku` | Pekanbaru | 101.45 | 0.51 | **50** | sum | 1,2 M | 0,87 M | |
| `pnk` | Pontianak | 109.33 | −0.02 | **45** | kal | 1,0 M | 0,73 M | |
| `vte` | Vientiane | 102.60 | 17.97 | **35** | lao | 0,95 M | 0,59 M | |
| `jay` | Jayapura | 140.72 | −2.53 | **20** | pap | 0,4 M | 0,29 M | |
| `bwn` | Bandar Seri Begawan | 114.94 | 4.89 | **20** | **brn** | 0,3 M | 0,28 M | **Brunei, bukan Indonesia** |
| `dil` | Dili | 125.57 | −8.55 | **10** | **tls** | 0,35 M | 0,14 M | **Timor-Leste, bukan Indonesia** |

**Dua koreksi penting dari brief 2:**

1. **`bwn` (Bandar Seri Begawan) itu Brunei, bukan Kalimantan Indonesia.** Brief 2 salah kasih `land:'kal'`. Harus `land:'brn'` — kalau tidak, Brunei bisa dihubungkan lewat darat dari Balikpapan, padahal harus laut.
2. **`dil` (Dili) itu Timor-Leste.** Brief 2 tidak punya kota ini; sekarang ditambah dengan `land:'tls'`.

### 2.3 Ringkasan

| Metrik | SEA | IDN |
|---|---|---|
| Kota | **32** | **16** |
| `sum(P)` | **7.845** | **3.170** |
| Eyeball capacity (`sum max(8, P*0.03)`) | **340 Gbps** | **156 Gbps** |
| Rasio vs Global | 23% | 11% |

**16 kota IDN** (`land` ∈ `{jav, sum, kal, sul, bal, pap, btm}`):

```
jkt, sby, bdg, smg, mdn, jog, plm, upg, dps, bjm, bpn, btm, mdc, pku, pnk, jay
```

**16 kota SEA non-IDN:**

```
mnl, bkk, hkg, sgn, sin, tpe, kul, han, rgn, ceb, dvo, pnh, pen, vte, bwn, dil
```

### 2.4 `land` final — 18 nilai

```
jav : jkt, sby, bdg, smg, jog
sum : mdn, plm, pku
kal : bjm, bpn, pnk
sul : upg, mdc
bal : dps
pap : jay
btm : btm
sg  : sin
mla : kul, pen
tha : bkk
vnm : sgn, han
khm : pnh
lao : vte
mmr : rgn
ph  : mnl, ceb, dvo
hkg : hkg
tw  : tpe
brn : bwn
tls : dil
```

**Poligon yang harus digambar: 20** (bukan 12 seperti di brief 2):

| Baru | Isi |
|---|---|
| `sum` | Sumatra |
| `kal` | Kalimantan Indonesia |
| `sul` | Sulawesi |
| `bal` | Bali |
| `pap` | Papua barat |
| `btm` | Batam |
| `tha` | Thailand |
| `vnm` | Vietnam |
| `khm` | Kamboja |
| `lao` | Laos |
| `mmr` | Myanmar |
| `hkg` | Hong Kong |
| `sg` | Singapore |
| `mla` | Semenanjung Malaysia |
| `pen` | Penang (bisa gabung `mla`) |
| `brn` | Brunei |
| `tls` | Timor-Leste |

Dipakai ulang: `jav` (rename `idn`), `ph`, `tw`.

**Catatan:** `singapore` dan `penang` bisa menempel di `mla` kalau malas — tapi konsekuensinya `sin–kul` jadi darat (padahal laut). Untuk `sin` **wajib** poligon sendiri.

---

## 3. Ambang Tier 1 — dikalibrasi ulang

| Region | Eyeball | Proporsional | **Pakai** | Alasan |
|---|---|---|---|---|
| Global | 1.451 | 1.500 | **1.500** | tidak berubah |
| SEA | 340 | 351 | **400** | bulat ke atas, wajib ada B2B |
| IDN | 156 | 161 | **250** | ~1,6× eyeball |

```js
global: { t1Served:1500, t1Pops:10, t1Continents:3 }
sea:    { t1Served: 400, t1Pops: 8, t1Continents:2 }
idn:    { t1Served: 250, t1Pops: 6, t1Continents:1 }
```

**`t1Pops` untuk SEA = 8 dari 32 kota (25%).** Global 10 dari 94 (11%) — jadi SEA sebenarnya **lebih longgar** per kapita kota. Kalau mau proporsional ketat, `t1Pops: 3`. Tapi 8 lebih masuk akal gameplay: pemain harus benar-benar membangun jaringan, bukan cuma 3 POP.

**`t1Continents: 2` untuk SEA** bisa dicapai karena ada `syd`/`per`/`drw` (`reg:'OC'`). **Kalau Australia dikeluarkan dari region, harus jadi 1.**

---

## 4. Modal awal — dikalibrasi

Global `START_CASH = 200.000`. Skala:

| Region | Eyeball | Modal | Rasio vs Global |
|---|---|---|---|
| Global | 1.451 | $200.000 | 1,0× |
| SEA | 340 | **$300.000** | 1,5× |
| IDN | 156 | **$250.000** | 1,25× |

**Kenapa bukan $500.000 seperti brief 2:** `regionMult AS = 2.5` memang mahal, tapi kalau modal naik 2,5× juga, kesulitannya jadi sama — tidak ada tantangan. 1,5× cukup untuk mengompensasi harga tanpa menghilangkan tekanan.

**Kalau Arcello mau "impossible difficulty"** (dia menyebut itu di chat): pakai `$150.000` untuk `idn` — lebih kecil dari Global meski harga 2,5×. Itu akan sangat brutal.

---

## 5. Data IX asli — untuk nama exchange

**PeeringDB, diambil 2025-10-25.** Ini bisa dipakai untuk memberi nama IX yang mirip realitas, bukan parodi.

### Indonesia — 60+ IX terdaftar

| IX | Kota | Member |
|---|---|---|
| **JKT-IX** | Jakarta | **872** |
| **IIX-Jakarta** | Jakarta | **836** |
| OpenIXP / NiCE | Indonesia | 627 |
| AIX | Depok | 322 |
| ODIX Omadata | Surabaya | 213 |
| CXC Jakarta | Jakarta | 201 |
| BIX Jakarta | Jakarta | 180 |
| DE-CIX Jakarta | Jakarta | 177 |
| EdgeNXT | Jakarta | 133 |
| MyIX (MY) | KL | 118 |
| ILIX | Jakarta Selatan | 113 |
| Digital Edge EPIX | Jakarta | 99 |
| CDIX | Jakarta | 84 |
| OMNIIX | Batam/Jakarta | 77 |
| **IIX-JawaTimur** | **Surabaya** | **72** |
| NCIX neuCentrIX | Jakarta | 66 |
| Transhybrid IX | Jakarta | 65 |
| DCI Indonesia DCI-IX | Bekasi | 60 |
| **JKT-IX Surabaya** | **Surabaya** | **58** |
| CitraIX Yogyakarta | Yogyakarta | 58 |
| CXC Denpasar | Denpasar | 52 |
| IIX-Jabar | Bandung | 43 |
| C2IX | Jakarta | 42 |
| CENTRO-IX | Pekanbaru | 37 |
| IIX-Bali | Denpasar | 36 |
| UNY-IX | Yogyakarta | 35 |
| IIX-Jogja | Yogyakarta | 28 |
| MONICA IX | Jakarta | 20 |
| CitraIX Surakarta | Surakarta | 19 |
| IIX-Sumut | Medan | 7 |
| IIX-Sulampua | **Makassar** | 2 |
| BIX Medan | Medan | 2 |
| BIX Semarang | Semarang | 3 |
| BIX Denpasar | Denpasar | 9 |
| BatamIX Batam | Batam | 3 |

**Insight besar:** Indonesia punya **60+ IX**, mayoritas di Jakarta. Ini justru **membenarkan** desain game yang punya banyak IX kecil — bukan karangan.

### SEA lain

| Negara | IX terbesar | Member |
|---|---|---|
| Thailand | BKNIX (Bangkok) | 73 |
| Thailand | TH-IX (Bangkok) | 58 |
| Thailand | BBIX Thailand | 49 |
| Philippines | **GetaFIX Manila** | **126** |
| Philippines | BBIX Manila | 99 |
| Philippines | Maharlika IX | 57 |
| Philippines | PhOpenIX-Manila | 48 |
| Taiwan | **TPIX-TW** | **168** |
| Taiwan | STUIX | 129 |
| Malaysia | **MyIX** | **118** |
| Malaysia | DE-CIX Kuala Lumpur | 39 |
| Malaysia | Penang IX | 15 |
| Vietnam | VNIX-HN (Hanoi) | 7 |
| Vietnam | VNIX-HCM | 6 |
| **Hong Kong** | **HKIX** | **255** |
| **Singapore** | **SGIX** | **252** |

### Rekomendasi nama IX untuk game

Ganti nama parodi dengan yang **mirip asli tapi tetap lucu**:

```js
// Indonesia
{id:'jkt',   name:'JKT-IX',        cheap:0.55, take:0.5}   // 872 member, realistis
{id:'jkt~2', name:'IIX-JKT',       cheap:0.45, take:0.45}  // 836 member, pesaing
{id:'sby',   name:'IIX-Jatim',     cheap:0.4,  take:0.4}   // 72 member
{id:'sby~2', name:'JKT-IX SBY',    cheap:0.45, take:0.45}  // 58 member
{id:'bdg',   name:'IIX-Jabar',     cheap:0.35, take:0.35}  // 43
{id:'jog',   name:'CitraIX',       cheap:0.35, take:0.35}  // 58
{id:'dps',   name:'IIX-Bali',      cheap:0.35, take:0.3}   // 36
{id:'upg',   name:'IIX-Sulampua',  cheap:0.3,  take:0.25}  // 2 — sangat tipis!
{id:'mdn',   name:'IIX-Sumut',     cheap:0.3,  take:0.3}   // 7
{id:'btm',   name:'BatamIX',       cheap:0.4,  take:0.4}   // 3

// SEA
{id:'sin',   name:'SGIX',          cheap:0.55, take:0.55}  // 252
{id:'hkg',   name:'HKIX',          cheap:0.55, take:0.6}   // 255
{id:'mnl',   name:'GetaFIX',       cheap:0.5,  take:0.5}   // 126 ← isi yang kosong
{id:'bkk',   name:'BKNIX',         cheap:0.45, take:0.45}  // 73
{id:'kul',   name:'MyIX',          cheap:0.45, take:0.5}   // 118
{id:'tpe',   name:'TPIX',          cheap:0.5,  take:0.5}   // 168
{id:'han',   name:'VNIX-HN',       cheap:0.35, take:0.3}   // 7 — tipis
{id:'sgn',   name:'VNIX-HCM',      cheap:0.35, take:0.3}   // 6 — tipis
{id:'pen',   name:'Penang-IX',     cheap:0.35, take:0.3}   // 15
{id:'ceb',   name:'Cebu-IX',       cheap:0.3,  take:0.25}  // tidak terdaftar, buat sendiri
{id:'rgn',   name:'Myanma-IX',     cheap:0.3,  take:0.25}
```

**Insight gameplay:** `IIX-Sulampua` (Makassar) cuma **2 member**. Itu realistis — Indonesia timur memang tipis. Di game, ini berarti POP Makassar tidak akan memberi banyak peer; pemain harus andalkan PNI atau backbone ke Jawa. **Persis seperti realitanya.**

---

## 6. Traffic IX — data tidak tersedia, tapi ada proxy

HKIX dan SGIX punya halaman statistik, tapi **di-blokir WAF** (nexusguard error page). Tidak bisa di-scrape dari server ini.

**Proxy yang bisa dipakai** (dari PeeringDB + pengetahuan umum):

| IX | Member | Perkiraan peak |
|---|---|---|
| HKIX | 255 | ~5–7 Tbps |
| SGIX | 252 | ~2–3 Tbps |
| JKT-IX | 872 | ~2–3 Tbps |
| IIX-Jakarta | 836 | ~1,5–2 Tbps |
| TPIX | 168 | ~2–3 Tbps |
| MyIX | 118 | ~1–1,5 Tbps |
| BKNIX | 73 | ~500–800 Gbps |
| GetaFIX | 126 | ~300–500 Gbps |

**Jangan hardcode angka ini** — tidak terverifikasi. Kalau harness butuh skala traffic IX, pakai `net_count` dari PeeringDB sebagai proxy (sudah terverifikasi), bukan angka Tbps.

---

## 7. Yang berubah dari brief 2

| Item | Brief 2 | Brief 3 (final) |
|---|---|---|
| Jumlah kota SEA | 30 | **32** (+`pen`, +`dil`) |
| `sum(P)` SEA | 7.690 | **7.845** |
| Eyeball SEA | 314 Gbps | **340 Gbps** |
| `sum(P)` IDN | 3.190 | **3.170** |
| Eyeball IDN | 151 Gbps | **156 Gbps** |
| `P` Surabaya | 400 | **450** |
| `P` Bandung | 260 | **375** |
| `P` Semarang | 180 | **270** |
| `P` Medan | 240 | **210** |
| `P` Makassar | 150 | **120** |
| `P` Denpasar | 140 | **110** |
| `P` Banjarmasin | 90 | **100** |
| `P` Balikpapan | 110 | **70** |
| `P` Batam | 120 | **60** |
| `P` Manado | 70 | **50** |
| `land` bwn | kal ❌ | **brn** ✅ |
| `dil` | tidak ada | **ada**, `land:'tls'` |
| Poligon | 12 | **20** |
| `t1Served` SEA | 400 | **400** (sama) |
| `t1Served` IDN | 300 | **250** |
| Modal SEA | $500.000 | **$300.000** |
| Modal IDN | — | **$250.000** |

**Yang TIDAK berubah:** 12 kabel, 20 long tail, 12 jaringan Asia, `ntt` 8/8, `regionMult AS=2.5`, filter `NETS`, `avoid cache`, GGC scarcity, semua aturan M5.

---

## 8. Verifikasi

Setelah menerapkan angka baru, jalankan:

```bash
cd /opt/seriesoftubes

# 1. P total harus cocok
node -e "
const {load}=require('./tests/harness');const {ev}=load();
ev(\"applyRegion('sea')\");
const P = ev('CITIES.reduce((a,c)=>a+c.P,0)');
console.log('SEA sum(P):', P, P===7845?'OK':'MISMATCH');
const eye = ev('CITIES.reduce((a,c)=>a+Math.max(8,c.P*0.03),0)');
console.log('SEA eyeball:', eye.toFixed(1), Math.abs(eye-340)<2?'OK':'MISMATCH');
"

# 2. IDN subset
node -e "
const {load}=require('./tests/harness');const {ev}=load();
ev(\"applyRegion('idn')\");
console.log('IDN cities:', ev('CITIES.length'), 'want 16');
console.log('IDN sum(P):', ev('CITIES.reduce((a,c)=>a+c.P,0)'), 'want 3170');
"

# 3. Semua kota di darat
node --test tests/prd-m3.test.js

# 4. Global tidak berubah
node --test tests/prd-baseline.test.js
```

---

## 9. Test tambahan yang wajib

```js
test('SEA P total matches calibrated data', () => {
  applyRegion('sea');
  assert.equal(ev('CITIES.reduce((a,c)=>a+c.P,0)'), 7845);
});
test('SEA eyeball capacity matches', () => {
  applyRegion('sea');
  const eye = ev('CITIES.reduce((a,c)=>a+Math.max(8,c.P*0.03),0)');
  assert.ok(Math.abs(eye - 340) < 2, `eyeball ${eye}`);
});
test('IDN has exactly 16 cities', () => {
  applyRegion('idn');
  assert.equal(ev('CITIES.length'), 16);
});
test('bwn is Brunei, not Kalimantan', () => {
  applyRegion('sea');
  assert.equal(ev("CITY['bwn'].land"), 'brn');
  assert.equal(ev("isSub('bpn','bwn')"), true, 'Balikpapan–Brunei is subsea');
});
test('dil is Timor-Leste', () => {
  applyRegion('sea');
  assert.equal(ev("CITY['dil'].land"), 'tls');
});
test('Penang and KL are same landmass', () => {
  applyRegion('sea');
  assert.equal(ev("isSub('pen','kul')"), false, 'Penang–KL is overland');
});
test('Singapore is its own landmass', () => {
  applyRegion('sea');
  assert.equal(ev("isSub('sin','kul')"), true, 'SG–KL is subsea');
});
```

---

## 10. Sumber lengkap

```
World Bank SP.POP.TOTL          populasi 2023–2025
World Bank IT.NET.USER.ZS       penetrasi internet 2019–2024
World Bank IT.NET.BBND.P2       fixed broadband per 100 2019–2024
World Bank IT.NET.BBND          fixed broadband absolut (IDN 13,95 M 2024)
PeeringDB /api/ix?country=ID    60+ IX Indonesia, member count
PeeringDB /api/ix?country=TH/VN/PH/TW/MY    IX SEA
PeeringDB /api/ix?name=HKIX     HKIX 255 member, 6 facility
PeeringDB /api/ix?name=SGIX     SGIX 252 member, 16 facility
```

**Tidak terverifikasi:** angka Tbps per IX (WAF blokir). Jangan dipakai.

---

*Semua `P` dihitung dari `(metro_pop × penetration) / 16.075`, di mana 16.075 adalah median `users/P` dari 8 kota existing di game. Data diambil 2025-10-25.*
