# BRIEF — Series of Tubes: Region Selector + SEA/Indonesia Map

Dokumen kerja untuk harness. Berdiri sendiri, tidak butuh PRD.
Semua angka di sini **sudah diverifikasi** lewat `node` + jsdom terhadap `site/index.html` v1.10.0.

**Repo:** `/opt/seriesoftubes`
**File kerja:** `site/index.html` (457.837 byte, 3.224 baris, single-file, tanpa bundler)
**Target:** 1.11.0

---

## 0. Yang harus dibangun

Tiga hal, satu paket:

1. **Region selector** di title screen — `Global` / `Southeast Asia` / `Indonesia`
2. **Save mode selector** — `On device` / `This session only` / `No save`
3. **Peta SEA** — 30 kota, 12 kabel baru, 10 poligon baru, 20 long tail, aturan khas Indonesia

`Global` **wajib tetap identik**. Kalau ada satu angka Global berubah, pekerjaan gagal.

---

## 1. Baseline yang harus dijaga

Dijalankan pada v1.10.0, semua lulus:

```
CITIES.length                  94
CABLES.length                  73
CABLE_PAIRS.length            134
XIX.length                     25
TAIL.length                    60
NETS.filter(n=>!n.tail)        65
NETS.length                   125
LENSES.length                   7
LANDS_LL.length                14
Object.keys(CITY_LL).length    94
regionMult("sin")             2.5
kmBetween("fra","ams")        364
proj0(0,0)            [1000, 537.6]
npm test                       77 pass
```

Sudah ada test-nya di `tests/prd-baseline.test.js` (3 test, lulus). Jangan hapus.

---

## 2. Arsitektur: region sebagai data

### 2.1 Satu objek, bukan cabang `if`

```js
const REGION = {
  global: { /* perilaku 1.10.0 apa adanya */ },
  sea:    { /* §4 */ },
  idn:    { /* §5 — SEA + filter + aturan */ },
};
```

### 2.2 Yang harus jadi `let`

| Baris | Sekarang | Jadi |
|---|---|---|
| 498 | `const W=2000, H=1000, KM=14;` | `let W=2000, H=1000, KM=14;` |
| 592 | `const LENSES=[...]` | `let LENSES=[...]` |
| 593 | `function proj0(lon,lat){...}` | `let proj0 = (lon,lat)=>...` |
| 603 | `const CITIES=[...]` | `let CITIES=[...]` |
| 602 | `const CITY_LL={...}` | `let CITY_LL={...}` |
| 597 | `const LANDS_LL=[...]` | `let LANDS_LL=[...]` |
| 700 | `const CITY_NUDGE={...}` | `let CITY_NUDGE={...}` |
| 703 | `const CABLES=[...]` | `let CABLES=[...]` |
| 869 | `const XIX=[...]` | `let XIX=[...]` |
| 898 | `const TAIL=[...]` | `let TAIL=[...]` |
| 793 | `const NETS=[...]` | `let NETS=[...]` |

`W` dipakai 51×, `H` 15×. **Jangan** ganti jadi `MAP.W` — 66 titik edit tanpa manfaat. `let` di scope modul aman: game single-threaded, `applyRegion()` cuma dipanggil saat boot / ganti region di title screen.

### 2.3 `applyRegion()` + `rebuildDerived()`

Banyak struktur diturunkan **saat modul dievaluasi**. Ini yang harus dibangun ulang:

| Struktur | Baris | Dari |
|---|---|---|
| `LANDS` | 600 | `LANDS_LL` + `proj()` |
| `CITY.x/y` | 700 | `CITY_LL` + `proj()` + `CITY_NUDGE` |
| `CITY` | 702 | `CITIES` |
| `CABLE_PAIRS` | 779 | `CABLES` |
| `XIXM` | 896 | `XIX` |
| `NET` | 965 | `NETS` |
| `NSH` | 967 | `NETS` share |
| `LANDP`/`ALLPOLY`/`onLand` | 2919–2921 | `LANDS` |
| `WAVES`/`HILLS` | 2923 | `rng(7)` + `onLand` |

```js
function rebuildDerived(){
  LANDS = LANDS_LL.map(l => ({ id:l.id, hide:!!l.hide, pts:l.ll.map(q=>proj(q[0],q[1])) }));
  for (const c of CITIES) {
    const q = CITY_LL[c.id];
    if (q) { const pt = proj(q[0],q[1]), n = CITY_NUDGE[c.id]||[0,0]; c.x = pt[0]+n[0]; c.y = pt[1]+n[1]; }
  }
  CITY = Object.fromEntries(CITIES.map(c=>[c.id,c]));
  CABLE_PAIRS = /* turunan CABLES, lihat baris 779 */;
  XIXM = Object.fromEntries(XIX.map(x=>[x.id,x]));
  // ⚠️ URUTAN WAJIB: filter NETS dulu, baru NET, baru NSH
  NET = Object.fromEntries(NETS.map(n=>[n.id,n]));
  const t = NETS.reduce((a,n)=>a+n.share,0);
  NSH = {}; NETS.forEach(n => NSH[n.id] = n.share/t);
  // LANDP / ALLPOLY / onLand / WAVES / HILLS — rebuild dari LANDS
}
```

**Urutan `filter → NETS → NET → NSH` adalah hukum.** Kalau `NSH` dihitung sebelum `NETS` difilter, `sum(NSH) < 1` dan `reach` mentok selamanya (§4.5).

### 2.4 Titik masuk

```
boot
 └─ baca localStorage['sot-region'] (default 'global')
     └─ applyRegion(id)
         └─ rebuildDerived()
             └─ showTitle()
```

`applyRegion()` **harus** jalan sebelum baris 700–702. Kalau tidak, `CITY.x/y` terbentuk dengan proyeksi salah.

---

## 3. Save mode

| Mode | Key | Perilaku |
|---|---|---|
| `device` (default) | `sot-save-v1:<region>` | Seperti sekarang |
| `session` | `sot-save-session:<region>` | Tidak muncul di Continue; hapus saat `pagehide` |
| `none` | — | `save()` jadi no-op; chip merah di HUD |

```js
function saveKey(mode, region){
  return mode==='session' ? `sot-save-session:${region}` : `sot-save-v1:${region}`;
}
function save(){
  if(!S||S.lost) return;
  if(UI.saveMode==='none') return;              // BARU
  S.uiSpeed=UI.speed; S.cam={x:cam.x,y:cam.y,z:cam.z};
  try{ localStorage.setItem(saveKey(UI.saveMode, S.region), JSON.stringify(S)); }catch(e){}
  UI.lastSave=performance.now();
}
```

### Migrasi save lama (wajib, sekali saat boot)

```js
(function migrateLegacySave(){
  try{
    const old = localStorage.getItem('sot-save-v1');
    if(!old) return;
    const s = JSON.parse(old);
    if(s && s.v===1 && !s.region){
      s.region = 'global';
      localStorage.setItem('sot-save-v1:global', JSON.stringify(s));
      localStorage.removeItem('sot-save-v1');
    }
  }catch(e){}
})();
```

Plus di `sanitize()` (baris 1722): `if(!own(REGION,s.region)) s.region='global';`

**Aturan mati:** pemain Global tidak boleh kehilangan progres. Kalau ragu, fallback `'global'`, jangan hapus key lama sebelum migrasi sukses.

---

## 4. Region SEA

### 4.1 Bounding box & proyeksi

```
lon : 92 … 142   (50°)
lat : 21 … -9    (30°)
W = 2000, H = 1200
proj0 = (lon,lat) => [ (lon-92)/50*W, (21-lat)/30*H ]
```

Skala seragam 40 px/derajat di kedua sumbu — **7× lebih besar** dari Global (5,56 px/derajat horizontal).

**Lensa:** buang 7 lensa global, ganti 3:

```js
lenses: [
  { lon:106.8, lat:-6.2, r:6, m:1.25 },   // Jabodetabek
  { lon:103.8, lat: 1.3, r:5, m:1.20 },   // Singapura–Batam–Johor
  { lon:121.0, lat:14.6, r:7, m:1.15 },   // Luzon
]
```

### 4.2 `wrapX: false` — ini perbaikan gratis

SEA tidak punya antimeridian. Matikan wrap dan render jadi ~3× lebih murah:

| Fungsi | Baris | Kalau `wrapX:false` |
|---|---|---|
| `wrapDx(a,b)` | 1281 | `return b-a` |
| `wrapCam()` | 3128 | hapus `cam.x=((cam.x%W)+W)%W`, clamp saja |
| `visibleKs()` | 2937 | `return [0]` |
| `paintWorld()` | ~2900 | loop `[0,W,-W]` → `[0]` |
| `toS(wx,wy,k)` | ~2500 | `k` selalu 0 |

Bonus: membantu keluhan freeze di 8×.

### 4.3 Poligon — 14 dari 22 kota baru jatuh di laut

**Terverifikasi:** poligon `idn` di game **cuma Jawa** (10 titik, lon 105.2–114.6, lat −8.7…−6.1). Sumatra, Kalimantan, Sulawesi, Bali, Papua tidak ada.

Yang masuk poligon existing:

| Kota baru | Poligon | Status |
|---|---|---|
| `sby, bdg, smg, jog` | `idn` | ✅ |
| `han, pnh, rgn, vte` | `eu` | ✅ (lihat catatan) |
| `mdn, plm, pku` | — | ❌ laut |
| `bjm, bpn, pnk, bwn` | — | ❌ laut |
| `upg, mdc` | — | ❌ laut |
| `dps` | — | ❌ laut |
| `jay` | — | ❌ laut |
| `btm` | — | ❌ laut |
| `ceb, dvo` | — | ❌ laut |

**Catatan `eu`:** di Global, `eu` membentang lon −9.5…190.0, lat 1.2…77.7. Seluruh Asia Tenggara daratan menempel di poligon Eropa — itu hack asli game. Konsekuensi: `sin–bkk` dianggap **darat**, padahal laut. Untuk SEA harus dipecah.

**10 poligon baru wajib:**

| id | Isi | Titik | Kota |
|---|---|---|---|
| `sum` | Sumatra | 16 | mdn, plm, pku |
| `kal` | Kalimantan + Sabah/Sarawak/Brunei | 24 | bjm, bpn, pnk, bwn |
| `sul` | Sulawesi | 22 | upg, mdc |
| `bal` | Bali | 8 | dps |
| `pap` | Papua (barat + PNG) | 20 | jay |
| `btm` | Batam | 6 | btm |
| `tha` | Thailand | 16 | bkk |
| `vnm` | Vietnam | 16 | sgn, han |
| `khm` | Kamboja | 10 | pnh |
| `mmr` | Myanmar | 14 | rgn |

**Dipakai ulang:** `jav` (rename `idn`), `ph`, `tw`, + `hkg` (baru kecil 6 titik), `lao` (baru kecil 8 titik).

**Sumber data:** Natural Earth 1:50m `ne_50m_admin_0_countries`, ambil 15–25 titik terluar per pulau. **Jangan 1:10m** — `inPoly()` dipanggil ribuan kali per frame.

**Test gerbang M3:**
```js
test('every SEA city sits on land', () => {
  applyRegion('sea');
  const atSea = Object.keys(CITY).filter(c => !onLand(CITY[c].x, CITY[c].y));
  assert.deepEqual(atSea, [], `in the sea: ${atSea}`);
});
```

### 4.4 Kota — bbox cuma memuat 8 kota existing

Diverifikasi: `lon 92–142`, `lat −9…21` → **6 kota**. Longgarkan `lat` ke 26 → **8 kota**:

| id | Nama | lon | lat | P | IX sekarang |
|---|---|---|---|---|---|
| `jkt` | Jakarta | 106.85 | −6.20 | 900 | Nasi-IX |
| `bkk` | Bangkok | 100.50 | 13.76 | 600 | Tom-Yum-IX |
| `hkg` | Hong Kong | 114.17 | 22.32 | 600 | HK-Kicks |
| `mnl` | Manila | 120.98 | 14.60 | 600 | **KOSONG** |
| `sgn` | Ho Chi Minh City | 106.66 | 10.76 | 500 | Pho-IX |
| `sin` | Singapore | 103.82 | 1.35 | 450 | Lah-IX |
| `tpe` | Taipei | 121.56 | 25.03 | 450 | Bubble-Tea-IX |
| `kul` | Kuala Lumpur | 101.69 | 3.14 | 350 | Satay-IX |

**22 kota baru:**

| id | Nama | lon | lat | P | land | Prioritas |
|---|---|---|---|---|---|---|
| `sby` | Surabaya | 112.75 | −7.25 | 400 | jav | P0 |
| `bdg` | Bandung | 107.61 | −6.91 | 260 | jav | P0 |
| `mdn` | Medan | 98.67 | 3.59 | 240 | sum | P0 |
| `smg` | Semarang | 110.42 | −6.99 | 180 | jav | P1 |
| `jog` | Yogyakarta | 110.37 | −7.80 | 170 | jav | P1 |
| `dps` | Denpasar | 115.19 | −8.65 | 140 | bal | P0 |
| `upg` | Makassar | 119.42 | −5.15 | 150 | sul | P0 |
| `plm` | Palembang | 104.75 | −2.98 | 130 | sum | P1 |
| `bjm` | Banjarmasin | 114.59 | −3.32 | 90 | kal | P0 |
| `bpn` | Balikpapan | 116.83 | −1.27 | 110 | kal | P1 |
| `pnk` | Pontianak | 109.33 | −0.02 | 80 | kal | P2 |
| `mdc` | Manado | 124.84 | 1.47 | 70 | sul | P1 |
| `jay` | Jayapura | 140.72 | −2.53 | 50 | pap | P2 |
| `btm` | Batam | 104.03 | 1.13 | 120 | btm | P1 |
| `pku` | Pekanbaru | 101.45 | 0.51 | 100 | sum | P2 |
| `han` | Hanoi | 105.85 | 21.03 | 300 | vnm | P0 |
| `pnh` | Phnom Penh | 104.92 | 11.56 | 120 | khm | P1 |
| `ceb` | Cebu | 123.89 | 10.32 | 160 | ph | P1 |
| `dvo` | Davao | 125.61 | 7.07 | 100 | ph | P2 |
| `rgn` | Yangon | 96.16 | 16.87 | 180 | mmr | P1 |
| `vte` | Vientiane | 102.60 | 17.97 | 60 | lao | P2 |
| `bwn` | Bandar Seri Begawan | 114.94 | 4.89 | 30 | kal | P2 |

**Total: 30 kota, `sum(P)` = 7.690, eyeball capacity ≈ 314 Gbps.**

**Yang WAJIB dikeluarkan** (di luar bbox, kalau dipaksa peta gepeng):

```
bom, del, maa, blr, hyd, cbo, dac, khi, pek, sha, tok, icn, osa,
dxb, auh, fuj, doh, ruh, jed, per, drw, syd, mel, bne, akl
```

### 4.5 Jaringan — 33 dari 65 tidak punya POP di SEA

| Tipe | Total | Tanpa POP | Selamat |
|---|---|---|---|
| `t1` | 5 | 1 (`lvl`) | 4 |
| `t2` | 19 | 9 | 10 |
| `cdn` | 15 | 3 | 12 |
| `eye` | 26 | 20 | 6 |
| **Total** | **65** | **33** | **32** |

Long tail: 60 total, 55 tanpa POP, **5 selamat**.

**Yang mati:**
- `t1`: `lvl`
- `t2`: `tng, vdp, rtc, teg, clr, ptc, ttk, stc, skl`
- `cdn`: `ydx, vkl, mlv`
- `eye`: `cmc, dtk, tmx, bcd, spk, sfc, viv, jio, duu, opt, dgi, ups, kys, tim, fwb, meo, nos, cos, spc, vzn`

#### Ini BUKAN blocker — asalkan `NETS` difilter

**Cara salah** (biarkan `NETS` utuh):
```
125 entri, 86 kota dibuang
→ 88 jaringan tidak punya POP
→ reach maksimum 68,6%
→ t1Club() mustahil, semua B2B churn permanen
```

**Cara benar** (filter sebelum `NSH`):
```
NETS jadi 37 entri (32 non-tail + 5 tail)
→ NSH renormalisasi, sum = 1,0
→ reach bisa 100%
→ t1Club() bisa lulus
```

**Target M4c: 49 jaringan** (37 selamat + 12 baru Asia).

#### Tier 1 — sudah aman, tidak perlu apa-apa

Diverifikasi: `ntt` punya POP di **8/8** kota inti.

| Tier 1 | Coverage | Kota |
|---|---|---|
| `ntt` Not That Telecom | **8/8** ✅ | jkt, sin, kul, bkk, sgn, mnl, hkg, tpe |
| `tat` Ta-Ta Comms | 6/8 | jkt, sin, kul, bkk, hkg, tpe |
| `tly` Tell-Ya Carrier | 3/8 | sin, hkg, tpe |
| `cog` Cogentle | 2/8 | sin, hkg |
| `lvl` Level Tree | 0/8 | — |

**Jangan bikin Tier 1 pengganti.** `ntt` sudah cukup.

#### 14 jaringan Asia yang selamat

`tcs, abc, byd, ets, tsf, pld, tsy, atl, cht, kdi, tru, vtl, tmy, ord`

Tambah 12 lagi yang murni Indonesia/SEA untuk mencapai 49.

### 4.6 Kabel — 12 baru

Global: 73 kabel / 134 pair. Yang menyentuh SEA: 17, tapi **hanya 2 intra-SEA** (`aagony`, `darwin`).

| id | Nama | Rute | price | age |
|---|---|---|---|---|
| `jksg` | Selat-Max | jkt–sin | 0.55 | new |
| `jksb` | Java-Sumatra Link | jkt–plm | 0.50 | new |
| `jvsb` | Java-East | jkt–sby | 0.45 | new |
| `sbbl` | Bali Strait | sby–dps | 0.50 | new |
| `mkst` | Makassar Strait | bjm–upg | 0.55 | new |
| `suln` | Sulawesi North | upg–mdc | 0.60 | new |
| `summ` | Malacca North | mdn–kul | 0.50 | new |
| `btmx` | Batam Cross | sin–btm | 0.35 | new |
| `indo1` | Nusantara Backbone | sby–bjm | 0.60 | new |
| `papx` | Papua Link | upg–jay | 0.75 | new |
| `mnp` | Manila North | mnl–tpe | 0.70 | mid |
| `cebx` | Visayas | mnl–ceb | 0.50 | new |

**`land` per kota** — menentukan `isSub(a,b) = CITY[a].land !== CITY[b].land`:

```
jav : jkt, sby, bdg, smg, jog
sum : mdn, plm, pku
kal : bjm, bpn, pnk, bwn
sul : upg, mdc
bal : dps
pap : jay
btm : btm        ← pulau sendiri, WAJIB kabel sin–btm
mla : kul
tha : bkk
vnm : sgn, han
khm : pnh
lao : vte
mmr : rgn
ph  : mnl, ceb, dvo
```

**Test:**
```js
test('SEA land masses are not glued', () => {
  applyRegion('sea');
  assert.equal(isSub('sin','bkk'), true,  'Singapore–Bangkok is subsea');
  assert.equal(isSub('jkt','sby'), false, 'Jakarta–Surabaya is overland');
  assert.equal(isSub('sby','dps'), true,  'Surabaya–Denpasar is subsea');
});
```

### 4.7 IX

- **`mnl` punya `ix:''`** — Manila 600 populasi tanpa titik peering. Buat `{id:'mnl', c:'mnl', name:'Adobo-IX', cheap:0.55, take:0.5}`.
- Tambah pesaing: `{id:'jkt~2', c:'jkt', name:'Bakso-IX', cheap:0.45, take:0.5}`, `{id:'sin~2', c:'sin', name:'Kaya-IX', cheap:0.5, take:0.55}`.

### 4.8 Long tail — 20 baru

Format `[nama, tipe, [kota], blurb]`. ASN, IX, policy, share dihitung otomatis oleh `hstr()` di baris 961 — **tidak perlu hardcode**.

```js
['Warnet Jaya Abadi','eye',['jkt','bdg'],'Empat belas PC, satu kipas angin, satu printer yang selalu offline.'],
['RT/RW Net Melati','eye',['jkt'],'Delapan rumah, satu kabel drop, satu tetangga yang suka reboot.'],
['Kos-Kosan Fiber','eye',['jog','sby'],'Setiap kamar 20 Mbps. Yang pojok dapat 5.'],
['Kopi Warkop Hosting','cdn',['sby'],'Server di belakang kasir, dingin karena AC kafe sebelah.'],
['Pasar Pagi Net','eye',['plm'],'Ramai jam 5 pagi, sepi jam 10.'],
['Nelayan Broadband','eye',['upg'],'Antena di tiang kapal, uplink lewat BTS pesisir.'],
['Sekolah Negeri Net','eye',['bdg'],'Lab komputer 40 unit, dipakai 3 jam sehari.'],
['Pompa Bensin Fiber','eye',['bjm'],'Kabel ikut trench pipa.'],
['Gunung Kidul Wireless','eye',['jog'],'Radio 5 GHz menembus bukit.'],
['Batam Data Center','cdn',['btm'],'Lantai dua ruko, tapi ping ke Singapura 4 ms.'],
['Tambang Net','eye',['bpn'],'Site camp, 200 karyawan, satu Starlink cadangan.'],
['Resort Bali Hosting','cdn',['dps'],'Tamu lebih penting dari uptime.'],
['Pasar Ikan Digital','eye',['mdc'],'Transaksi pakai QR, jaringan pakai doa.'],
['Becak Fiber Co-op','eye',['sby'],'Koperasi 60 anggota, iuran Rp50rb/bulan.'],
['Kampung Cyber','eye',['jkt'],'Satu RT, 300 jiwa, satu ONT 100 Mbps.'],
['Universitas Swasta Net','eye',['bdg','jkt'],'Mahasiswa lebih suka WiFi kampus daripada kos.'],
['Startup Unicorn Palsu','cdn',['jkt'],'Valuasi $1B, server satu VPS.'],
['Genset Hosting','cdn',['upg'],'Uptime bergantung harga solar.'],
['Kabel Nyasar Net','eye',['smg'],'Sering dipotong proyek drainase.'],
['Pulau Terluar Net','eye',['jay'],'Backhaul microwave 80 km.'],
```

### 4.9 `regionMult` SEA

**Pertahankan `AS: 2.5`.** Jangan diturunkan — itu yang membuat on-net CDN jadi strategi wajib, persis realita IIX ratio Indonesia. Yang berubah hanya `OC`: `1.8 → 1.4` (kabel ke Australia lebih dekat di map SEA).

### 4.10 Ambang Tier 1 per region

`t1Club()` (baris 1304) sekarang: 10 POP, 3 benua, 1.500 Gbps, 20 sesi.

| Region | `t1Served` | `t1Pops` | `t1Continents` | Alasan |
|---|---|---|---|---|
| Global | 1.500 | 10 | 3 | tidak berubah |
| SEA | 400 | 8 | 2 | eyeball 314 Gbps; AS + OC = 2 benua |
| `idn` | 300 | 6 | **1** | semua kota bereg `AS` |

**`t1Continents: 1` untuk `idn` WAJIB.** `regionsCount()` = `new Set(...CITY[c].reg)` — semua kota Indonesia bereg `AS`, hasilnya **selalu 1**. Syarat "3 benua" tidak akan pernah lulus.

---

## 5. Region `idn` — SEA + filter + aturan

**Bukan peta baru.** Geometri dikerjakan sekali, dipakai dua region.

```js
idn: {
  ...REGION.sea,
  id: 'idn',
  name: 'Indonesia',
  blurb: '17.000 islands, three layers of permits, and a monsoon.',
  cities: REGION.sea.cities.filter(c => IDN_LANDS.has(c.land)),
  cables: REGION.sea.cables.filter(c => bothEndsIn(c, IDN_LANDS)),
  xix:    REGION.sea.xix.filter(x => IDN_LANDS.has(CITY[x.c].land)),
  rules:  { indonesianRules:true, peakHour:true, seasons:true },
  startCities: ['jkt','sby','upg'],
}
// IDN_LANDS = {jav, sum, kal, sul, bal, pap, btm}
```

**16 kota Indonesia** dari 30:

| `land` | Kota | n |
|---|---|---|
| `jav` | jkt, sby, bdg, smg, jog | 5 |
| `sum` | mdn, plm, pku | 3 |
| `kal` | bjm, bpn, pnk | 3 |
| `sul` | upg, mdc | 2 |
| `bal` | dps | 1 |
| `pap` | jay | 1 |
| `btm` | btm | 1 |
| **Total** | | **16** |

Skala: `sum(P)` = 3.190, eyeball ≈ 151 Gbps (10,4% dari Global).

### 5.1 Izin tiga lapis

```js
S.idLic = {
  oss:   { state:'none', ready:0 },   // 90 hari, $30.000 — wajib transit
  apjii: { state:'none', ready:0 },   // 45 hari, $5.000/th — wajib port IX
  row:   {},                           // per kota, 20 hari, $8.000 — wajib DF
};
```

| Tanpa | Efek |
|---|---|
| `oss` | `buyTransit()` ditolak → peering murni 90 hari pertama |
| `apjii` | `ixPort()` ditolak → hanya PNI swasta |
| `row[kota]` | `orderDf()` ditolak → POP boleh, backbone sendiri tidak |

Pola sudah ada: `S.cnLic` default `{state:'none'}` di baris 2322, `CN_LIC=150000` di baris 498.

### 5.2 PNI lead time

```js
// pni() — baris 2281
const lead = NET[net].pol==='paid' ? 14 + (hstr(net)%17) : 3 + (hstr(net)%12);
S.pni.push({ id:uid(), city, net, tier, ready: S.day + lead });
```

Di `compute()` (baris 1560), loop `for(const p of S.pni)`:
```js
if(regionRules('idn') && p.ready > day) continue;   // masih provisioning
```

### 5.3 Piutang

```js
const TERM = { dia:30, isp:45, gpu:30, hyper:60, edu:60, gov:60 };
```

Di `dayTick()`, revenue B2B **tidak** langsung ke `S.cash`:

```js
for(const b of S.biz){
  if(BIZ_T[b.type].l2) continue;
  b.owed = (b.owed||0) + b.bw*b.rate/30;
  if(S.day >= (b.invDay||0) + (TERM[b.type]||30)){
    S.cash += b.owed; b.owed = 0; b.invDay = S.day;
  }
  if(b.owed > b.bw*b.rate*(TERM[b.type]||30)/30 * 1.5) b.mood -= 5;
}
```

Efek: laporan profit, kas kosong. Memaksa pakai `S.loans`.

### 5.4 SLA & churn

`b.mood` sudah ada (baris 2051, blok `// businesses mood`). Yang berubah: **grace per tipe**.

```js
const grace = BIZ_T[b.type].lv >= 3 ? 3 : 15;   // enterprise 3 hari, UMKM 15
if(S.day - (b.since||0) < grace) { /* abaikan */ }
else { b.mood -= (...); }
if(sf < 0.995) b.penalty = (b.penalty||0) + b.bw*b.rate*0.02;
```

### 5.5 Jam sibuk

```js
const peakMul = regionRules('idn') ? 3.2 : 1;   // 19:00–23:00
const sf = clamp(r.citySrv[c] / (d * peakMul), 0, 1);
```

Jaringan yang "cukup" siang jadi merah malam — persis penyebab Netflix buffer.

### 5.6 Musim & insiden lokal

Tambah ke pool `addInc` (baris 1850):

| Insiden | Pemicu | Efek | Pesan |
|---|---|---|---|
| Banjir | Nov–Mar, kota rendah (`jkt, smg, sby, plm, bjm`) | `p.down` 3–7 hari | `A monsoon flood took out the basement in ${name}. The routers are on a table now.` |
| Kabel dicuri | sepanjang tahun, koridor padat | `l.down` 3–10 hari | `Someone stole 400 m of your fiber near ${name} and sold it for scrap.` |
| Gempa | ring of fire (`mdc, upg, dps, jay`) | POP down + kabel laut putus | `A 6.4 quake near ${name}. The landing station is fine, the road to it is not.` |
| PLN padam | kota tanpa `p.gen` | `p.down` 1 hari | `A four-hour blackout in ${name}. Your UPS lasted twenty minutes.` |

### 5.7 Latency

`linkLat(l) = km*f/200` (baris 1805). Untuk SEA, faktor pembagi **200 → 150**:

```
Jakarta–Makassar 1.396 km : 7,0 ms → 9,3 ms
Jakarta–Jayapura 3.300 km : 16,5 ms → 22,0 ms
```

Realita RTT: JKT–Makassar ~30 ms, JKT–Jayapura ~80 ms. Game tetap lebih murah (pilihan desain yang sudah ada), tapi cukup untuk membuat `latMax` bermakna.

---

## 6. Role (P2 — boleh ditunda)

```js
S.role = o.role || 'isp';   // 'hosting' | 'nap' | 'isp' | 'rtnet'
```

| Role | BIZ_T | Batas | Modal |
|---|---|---|---|
| `hosting` | `host, gpu, onramp, ai` | max 3 POP, no `bb` | $50k |
| `nap` | `isp, hyper, ai` | wajib 5 POP sebelum profit | $2M |
| `isp` | `dia, isp, stream, edu, gpu` | normal | $200k |
| `rtnet` | `dia` kecil | max 2 POP, wajib beli transit dari ISP lain | $2k |

Implementasi termurah: filter di `offersHere()` dan `bbCost()`. Tidak perlu mesin baru.

---

## 7. Urutan kerja

| M | Isi | Hari | Gerbang |
|---|---|---|---|
| **M1** | `REGION` + `applyRegion` + `rebuildDerived`, Global saja | 2–3 | **semua test lama lulus tanpa diubah** |
| **M2** | Selector UI + 3 save mode + migrasi | 1–2 | test save |
| **M3a** | 10 poligon baru | 2–3 | `onLand` lulus 30/30 |
| **M3b** | 22 kota + `CITY_LL` + `CITY_NUDGE` + proyeksi | 2–3 | `onLand` + `isSub` |
| **M4a** | 12 kabel + IX Manila + 2 IX pesaing | 1–2 | `cablesFor` tidak kosong |
| **M4b** | 20 long tail | 1–2 | `TAIL.length` = 80 |
| **M4c** | Filter `NETS` 65→32 + `NSH` + 12 jaringan Asia | 2–3 | `NSH`=1,0 |
| **M5** | Aturan Indonesia | 4–6 | 7 test IDN |
| **M6** | Role + search + drill-down | 3–5 | — |

**Total ~3,5–4,5 minggu.**

**M1 gerbang mati.** Kalau `applyRegion` tidak bisa me-rebind `CITIES`/`CITY`/`LANDS` tanpa merusak Global → **berhenti**, laporkan. Rencana cadangan: build terpisah per region (dua artefak, tanpa selector).

---

## 8. Test wajib

```js
// M1 — Global tidak berubah (sudah ada di tests/prd-baseline.test.js)
test('global baseline', () => {
  applyRegion('global');
  assert.equal(CITIES.length, 94);
  assert.equal(CABLE_PAIRS.length, 134);
  assert.equal(NETS.filter(n=>!n.tail).length, 65);
  assert.equal(regionMult('sin'), 2.5);
  assert.equal(JSON.stringify(proj0(0,0)), '[1000,537.6]');
});

// M2 — save
test('three save modes', () => { /* §3 */ });
test('legacy save migrates to global', () => { /* §3 */ });
test('region switch does not clobber save', () => {
  UI.region='global'; beginGame('A','fra',{}); save();
  UI.region='sea';    beginGame('B','jkt',{}); save();
  UI.region='global'; assert.equal(loadSave().name, 'A');
});

// M3 — geometri
test('every SEA city sits on land', () => { /* §4.3 */ });
test('every SEA city projects inside canvas', () => {
  applyRegion('sea');
  for (const c of Object.keys(CITY)) {
    assert.ok(CITY[c].x>=0 && CITY[c].x<=W, `${c}.x`);
    assert.ok(CITY[c].y>=0 && CITY[c].y<=H, `${c}.y`);
  }
});
test('no antimeridian wrap in SEA', () => {
  applyRegion('sea');
  assert.equal(wrapDx(100,1900), 1800);
  assert.equal(visibleKs().length, 1);
});

// M4 — ekonomi
test('NSH sums to 1 in every region', () => {
  for (const r of ['global','sea','idn']) {
    applyRegion(r);
    const s = Object.values(NSH).reduce((a,b)=>a+b,0);
    assert.ok(Math.abs(s-1) < 1e-9, `${r}: ${s}`);
  }
});
test('every region has a Tier 1', () => { /* ... */ });
test('at least one T1 covers 8 SEA core cities', () => {
  applyRegion('sea');
  const core = ['jkt','sin','kul','bkk','sgn','mnl','hkg','tpe'];
  assert.ok(NETS.some(n=>n.type==='t1' && core.every(c=>n.pops.includes(c))));
});
test('Manila has an IX', () => {
  applyRegion('sea');
  assert.ok(CITY['mnl'].ix && CITY['mnl'].ix.length > 0);
});

// M5 — Indonesia
test('transit blocked without OSS', () => { /* ... */ });
test('IX port blocked without APJII', () => { /* ... */ });
test('DF blocked without ROW for that city', () => { /* ... */ });
test('PNI not live until ready day', () => { /* ... */ });
test('B2B revenue lands after payment term', () => { /* ... */ });
test('enterprise churn after 3 days, UMKM after 15', () => { /* ... */ });
test('peak hour reduces service factor', () => { /* ... */ });
```

---

## 9. Jebakan

| Jebakan | Akibat | Cegah |
|---|---|---|
| `NETS` tidak difilter | `reach` mentok 68,6%, semua B2B churn | urutan `filter→NETS→NET→NSH` |
| `proj0` dipakai sebelum di-set | peta gepeng | `applyRegion` sebelum baris 700 |
| Poligon self-intersecting | kota di laut / darat palsu | test `onLand` + visual check |
| Save Global tertimpa | pemain hilang progres | key per-region + migrasi |
| `land` salah | `isSub` salah, rute gratis atau buntu | test `isSub` per pasangan |
| Sentuh loop animasi | konflik patch time-warp Arcello | **jangan** |

---

## 10. Yang sudah diputuskan

| Pertanyaan | Jawaban |
|---|---|
| SEA menggantikan Global? | **Tidak.** Menambah. Global tetap default |
| Kota existing di bbox SEA | **8**, bukan 23 |
| Poligon baru | **10**, karena 14/22 kota baru di laut |
| `idn` perlu geometri sendiri? | **Tidak.** SEA + filter + aturan |
| Tier 1 pengganti? | **Tidak.** `ntt` sudah 8/8 |
| `regionMult` AS diturunkan? | **Tidak.** Tetap 2,5 |
| Kabel baru | **12** |
| Long tail baru | **20** |
| Jaringan baru (M4c) | **12** |

---

## 11. Referensi baris (v1.10.0, terverifikasi)

```
479   APP_VERSION
498   W=2000,H=1000,KM=14 · POP_COST · CN_LIC
513   PORT[]
535   PORT_SLOT (10G=0.25)
592   LENSES[7]
593   proj0(lon,lat) = [(lon+180)/360*W, (84-lat)*6.4]
597   LANDS_LL[14]
600   LANDS
602   CITY_LL{94}
603   CITIES[94]
700   CITY.x/y
702   CITY
703   CABLES[73]
779   CABLE_PAIRS[134]
793   NETS[23] base + 10 push → 65 non-tail
869   XIX[25]
896   XIXM
898   TAIL[60]
961   TAIL.forEach → ASN/IX/policy/share
965   NET
967   NSH
977   BIZ_T
1036  UI
1121  SCN[6]
1134  beginGame
1267  newGame
1281  wrapDx
1304  t1Club() — 10 POP / 3 benua / 1500 G / 20 sesi
1560  compute()
1722  sanitize / migrate
1799  regionMult
1805  linkLat = km*f/200
1847  sfOf
1850  addInc
2024  dayTick()
2051  // businesses mood
2181  checkGoals
2190  ACT{}
2281  pni()
2322  S.cnLic default
2355  ACT.start
2360  ACT.pickStart
2393  bbCost = 15000 + P*20
2399  save()
2419  loadSave()
2806  showTitle()
2838  showHelp()
2919  LANDP
2920  ALLPOLY
2921  onLand
2923  WAVES / HILLS
2937  visibleKs()
3128  wrapCam()
```

---

*Semua angka diverifikasi dengan `node` + jsdom terhadap `site/index.html` v1.10.0. Baseline test: `node --test tests/prd-baseline.test.js` → 3/3 lulus.*
