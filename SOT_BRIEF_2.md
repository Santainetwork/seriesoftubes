# BRIEF 2 — Series of Tubes: sisa M3–M5 + permintaan baru

**Untuk harness.** Lanjutan dari `SOT_REGION_BRIEF.md` (brief 1). Brief 1 **sudah usang** di bagian M1/M2/F7 — itu sudah selesai dan committed. Dokumen ini hanya berisi **yang belum dikerjakan** plus **permintaan baru dari Arcello**.

**Repo:** `/opt/seriesoftubes` · branch `main`
**Basis:** v1.10.1 + M1 + M2 + F7 (commit `8e50e65`)
**File kerja:** `site/index.html` — **3.428 baris**, bukan 3.224 lagi. Semua nomor baris di brief 1 sudah bergeser. Pakai §7 di bawah.

---

## 0. Status sekarang

Sudah selesai dan committed:

| Commit | Isi | Gate |
|---|---|---|
| `eabbb0d` | M1 — `REGION` + `applyRegion` + `rebuildDerived`, Global-only | ✅ |
| `2aab3bc` | M2 — region selector, 3 save mode, migrasi | ✅ |
| `efe454d` | F7 — role picker, role-limited offers, POP cap, broadband gate | ✅ |
| `8e50e65` | fix tutorial untuk role tanpa broadband | ✅ |

Sudah ada di kode (diverifikasi runtime):

```
REGION             : object, keys = ['global']
applyRegion        : function
rebuildDerived     : function
UI.region          : 'global'
UI.saveMode        : 'device'
UI.role            : 'isp'
PICK_REGIONS       : [['global','Global'],['sea','SEA'],['idn','Indonesia']]
saveKey            : function
clearSave          : function
ROLES / ROLE_IDS   : 4 role, default isp
```

**Belum ada:**
```
REGION.sea / REGION.idn   → masih kosong; tombol SEA & Indonesia disabled di UI
regionRules()             → belum ada
IDN_LANDS                 → belum ada
S.idLic                   → belum ada
PNI lead time             → belum ada
piutang / SLA / peak hour → belum ada
```

Test gate yang sudah ada: `tests/prd-m1.test.js`, `tests/prd-m2.test.js`, `tests/prd-roles.test.js`, `tests/prd-baseline.test.js`.

---

## 1. Yang masih dikerjakan: M3-geo

Lane `geo` sedang jalan (tmux `jcode:2`). Cakupannya:

- 10 poligon baru (`sum, kal, sul, bal, pap, btm, tha, vnm, khm, mmr`) + `hkg`, `lao`
- 22 kota baru + `CITY_LL` + `CITY_NUDGE`
- proyeksi SEA: `lon 92–142`, `lat 21…−9`, `W=2000 H=1200`
- IX Manila (`mnl` sekarang `ix:''`)
- `wrapX:false` (opsional, boleh ditunda)

**Spesifikasi lengkap ada di brief 1 §4.1–§4.4 dan §4.6–§4.7.** Jangan diubah.

### 1.1 Tambahan untuk `geo` — permintaan Arcello (dari chat)

**Home city SEA harus kota ber-POP besar, bukan ibu kota.** Sudah dicek, urutan POP existing:

```
Jakarta 900 · Manila 600 · Bangkok 600 · Hong Kong 600
HCMC 500 · Singapura 450 · Taipei 450 · Kuala Lumpur 350
```

Jadi `REGION.sea.startCities` = **`['jkt','mnl','bkk','sin']`** (4 kartu, sama seperti Global).

Untuk `REGION.idn.startCities` = **`['jkt','sby','upg']`** — Jakarta (900), Surabaya (400), Makassar (150). Tiga wilayah, bukan tiga ibu kota.

### 1.2 Tambahan untuk `geo` — GGC scarcity

Arcello: *"gwe tambahin khusus main region indo GGC nya yang punya beberapa ISP aja"* dan *"atau gak dapet GGC nya lamaa banget"*.

**Konteks mekanik yang sudah ada** (diverifikasi):

```js
// baris 819-822
nfx: cache:{name:'Open Couch',          min:12}   // NetChill
ggl: cache:{name:'Goggle Global Cache', min:15}   // Goggle
fbk: cache:{name:'Faceplant Node Thingy', min:10}
akm: cache:{name:'…',                   min:6}    // Akamaybe

// baris 2338 — cache()
if((R.demTo[net]||0) < n.cache.min) { toast('…Send them N+ Gbps first.'); return; }
```

Artinya GGC sudah punya gate: butuh traffic minimum sebelum boleh minta box. Yang diminta Arcello adalah **variasi per region**: di `idn`, jangan semua kota bisa host GGC — hanya kota yang punya beberapa ISP eyeball.

**Data yang sudah dihitung** (jaringan `type:'eye'` non-tail per kota SEA):

| Kota | Eyeball net | Nama |
|---|---|---|
| `sin` | **3** | Etis-a-lot, Telkom-selfie, PLDTea Time |
| `jkt` | **2** | Telkom-selfie, Ooh-redoo |
| `hkg` | **2** | China Moble, PLDTea Time |
| `bkk` | 1 | Mostly-True Move |
| `mnl` | 1 | PLDTea Time |
| `kul` | 0 | — |
| `sgn` | 0 | — |
| `tpe` | 0 | — |

**Spesifikasi:**

```js
// di REGION.idn.rules
cacheCities: ['jkt','sby','sin'],   // hanya di sini GGC boleh minta
cacheMinMul: 1.6,                    // threshold naik 1.6× (Goggle 15 → 24 Gbps)

// di REGION.sea.rules
cacheCities: null,                   // null = semua kota (perilaku global)
cacheMinMul: 1.2,
```

Implementasi di `cache()` (baris 2338):

```js
const rr = REGION[curRegion].rules || {};
if (rr.cacheCities && !rr.cacheCities.includes(city)) {
  toast(`<b>${esc(n.cache.name)} is not built in ${CITY[city].name}.</b><br>` +
        `They only deploy in cities where several ISPs already peer.`, 'bad');
  sfx('err'); return;
}
const need = Math.ceil(n.cache.min * (rr.cacheMinMul || 1));
if ((R.demTo[net]||0) < need) {
  toast(`<b>${esc(n.name)} says not yet.</b><br>Send them ${need}+ Gbps first.`, 'bad');
  sfx('err'); return;
}
```

**Efek gameplay:** di region `idn`, pemain tidak bisa asal sebar GGC. Harus konsentrasi di Jakarta/Surabaya — persis realita Indonesia di mana GGC hanya ada di beberapa IX/DC besar.

**Test:**

```js
test('idn: GGC only in cacheCities', () => {
  applyRegion('idn');
  beginGame('X','jkt',{region:'idn'});
  S.pops['dps'] = {day:0,bb:null,boost:0,down:0,routers:1,gen:false};
  S.cash = 1e9;
  ACT.cache({city:'dps', net:'ggl'});   // harus ditolak
  assert.equal(ev('S.caches.length'), 0);
  assert.match(ev("document.getElementById('toasts').textContent"), /not built in Denpasar/);
});
test('idn: cache threshold is multiplied', () => {
  applyRegion('idn');
  // cacheMinMul 1.6 → Goggle butuh 24 Gbps, bukan 15
});
```

---

## 2. M3-topo (belum mulai)

Lane `topo` masih menunggu. Cakupan:

### 2.1 12 kabel baru

| id | Rute | price | age |
|---|---|---|---|
| `jksg` | jkt–sin | 0.55 | new |
| `jksb` | jkt–plm | 0.50 | new |
| `jvsb` | jkt–sby | 0.45 | new |
| `sbbl` | sby–dps | 0.50 | new |
| `mkst` | bjm–upg | 0.55 | new |
| `suln` | upg–mdc | 0.60 | new |
| `summ` | mdn–kul | 0.50 | new |
| `btmx` | sin–btm | 0.35 | new |
| `indo1` | sby–bjm | 0.60 | new |
| `papx` | upg–jay | 0.75 | new |
| `mnp` | mnl–tpe | 0.70 | mid |
| `cebx` | mnl–ceb | 0.50 | new |

### 2.2 Filter `NETS` + rekonsiliasi `NSH`

**Ini bagian paling kritis.** 33 dari 65 jaringan non-tail tidak punya POP di SEA. Kalau `NETS` dibiarkan utuh sementara 86 kota dibuang → `reach` mentok **68,6%**, `t1Club()` mustahil, semua B2B churn permanen.

**Urutan wajib di `rebuildDerived()`:**

```js
// 1. filter NETS dulu
NETS.length = 0;
NETS.push(...regionNets);        // sudah difilter: hanya yang punya POP di region

// 2. baru turunan
NET = Object.fromEntries(NETS.map(n=>[n.id,n]));
{const t = NETS.reduce((a,n)=>a+n.share,0);
 for(const k in NSH) delete NSH[k];
 NETS.forEach(n=>NSH[n.id] = n.share/t);}
```

Kalau urutannya dibalik, `sum(NSH) < 1` dan `reach` tidak akan pernah 1,0.

**Yang mati (33 non-tail):**
- `t1`: `lvl`
- `t2`: `tng, vdp, rtc, teg, clr, ptc, ttk, stc, skl`
- `cdn`: `ydx, vkl, mlv`
- `eye`: `cmc, dtk, tmx, bcd, spk, sfc, viv, jio, duu, opt, dgi, ups, kys, tim, fwb, meo, nos, cos, spc, vzn`

Plus long tail: 55 dari 60 mati, hanya 5 selamat.

### 2.3 Tier 1 — sudah aman, JANGAN diubah

Diverifikasi: `ntt` punya POP di **8/8** kota inti SEA.

| Tier 1 | Coverage |
|---|---|
| `ntt` | **8/8** ✅ |
| `tat` | 6/8 |
| `tly` | 3/8 |
| `cog` | 2/8 |
| `lvl` | 0/8 |

**Jangan bikin `Sea-Tree` atau Tier 1 pengganti.** Rekomendasi itu sudah dibatalkan di brief 1.

### 2.4 Ambang T1 per region

`t1Club()` sekarang hardcoded 10 POP / 3 benua / 1500 Gbps / 20 sesi.

```js
// REGION[x].rules
global: { t1Served:1500, t1Pops:10, t1Continents:3 }
sea:    { t1Served: 400, t1Pops: 8, t1Continents:2 }
idn:    { t1Served: 300, t1Pops: 6, t1Continents:1 }
```

**`t1Continents: 1` untuk `idn` WAJIB.** `regionsCount()` = `new Set(...CITY[c].reg)` — semua kota Indonesia bereg `AS`, hasilnya selalu 1. Syarat "3 benua" mustahil lulus.

### 2.5 Modal awal

```js
sea: { startCash: 500000 }    // 2.5× global, karena regionMult AS 2.5
idn: { startCash: 400000 }
```

### 2.6 20 long tail baru

Format `[nama, tipe, [kota], blurb]`. ASN/IX/policy/share dihitung otomatis oleh `hstr()`.

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

### 2.7 12 jaringan Asia baru

Untuk mencapai 49 jaringan di region SEA (37 selamat + 12 baru). 14 yang sudah selamat: `tcs, abc, byd, ets, tsf, pld, tsy, atl, cht, kdi, tru, vtl, tmy, ord`.

Nama bebas, tapi harus Asia-anchored dan `pops` hanya kota SEA.

---

## 3. M5 — Aturan Indonesia (belum mulai)

Aktif hanya kalau `REGION[curRegion].rules.indonesianRules === true`.

Tambahkan helper dulu:

```js
function regionRules(){const r=REGION[curRegion];return (r&&r.rules)||{};}
function idnRules(){return !!regionRules().indonesianRules;}
```

### 3.1 Izin tiga lapis

```js
S.idLic = {
  oss:   { state:'none', ready:0 },   // 90 hari, $30.000 — wajib transit
  apjii: { state:'none', ready:0 },   // 45 hari, $5.000/th — wajib port IX
  row:   {},                           // per kota, 20 hari, $8.000 — wajib DF
};
```

| Tanpa | Efek |
|---|---|
| `oss` | `buyTransit()` ditolak |
| `apjii` | IX port ditolak |
| `row[kota]` | `orderDf()` ditolak (POP tetap boleh) |

Pola sudah ada: `S.cnLic` default `{state:'none'}`, `CN_LIC=150000`.

### 3.2 PNI lead time

```js
// pni()
const lead = NET[net].pol==='paid' ? 14+(hstr(net)%17) : 3+(hstr(net)%12);
S.pni.push({ id:uid(), city, net, tier, ready: S.day+lead });
```

Di `compute()`, loop `for(const p of S.pni)`:
```js
if(idnRules() && p.ready > day) continue;
```

### 3.3 Piutang

```js
const TERM = { dia:30, isp:45, gpu:30, hyper:60, edu:60, gov:60 };
```

Revenue B2B tidak langsung ke `S.cash`:

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

### 3.4 SLA & churn

`b.mood` sudah ada. Yang berubah: **grace per tipe**.

```js
const grace = BIZ_T[b.type].lv >= 3 ? 3 : 15;   // enterprise 3 hari, UMKM 15
if(S.day - (b.since||0) < grace) { /* abaikan */ }
else { b.mood -= (...); }
if(sf < 0.995) b.penalty = (b.penalty||0) + b.bw*b.rate*0.02;
```

### 3.5 Jam sibuk

```js
const peakMul = idnRules() ? 3.2 : 1;
const sf = clamp(r.citySrv[c] / (d * peakMul), 0, 1);
```

### 3.6 Musim & insiden lokal

Tambah ke pool `addInc`:

| Insiden | Pemicu | Efek | Pesan |
|---|---|---|---|
| Banjir | Nov–Mar, kota rendah (`jkt, smg, sby, plm, bjm`) | `p.down` 3–7 hari | `A monsoon flood took out the basement in ${name}. The routers are on a table now.` |
| Kabel dicuri | sepanjang tahun | `l.down` 3–10 hari | `Someone stole 400 m of your fiber near ${name} and sold it for scrap.` |
| Gempa | ring of fire (`mdc, upg, dps, jay`) | POP down + kabel laut putus | `A 6.4 quake near ${name}. The landing station is fine, the road to it is not.` |
| PLN padam | kota tanpa `p.gen` | `p.down` 1 hari | `A four-hour blackout in ${name}. Your UPS lasted twenty minutes.` |

### 3.7 Latency

`linkLat(l) = km*f/200`. Untuk SEA/IDN, faktor pembagi **200 → 150**:

```js
function linkLat(l){const f=l.kind==='df'?(l.own?1.1:1.25):l.kind==='vxc'?1.4:l.cable?(CAB[l.cable].lat||1):1.3;
  const div = REGION[curRegion].rules.latDiv || 200;
  return l.km*f/div;}
```

---

## 4. PERMINTAAN BARU — `avoid cache` di RouteScript

**Dari chat, Arcello + superman.** Verifikasi: **belum ada.**

```
$ teParse("avoid cache for goggle").errors
["line 1: I don't understand “avoid cache for goggle”. Try: spill at 80%, prefer pni for goggle,
  avoid transit for netchill, cap transit cogentle at 20 gbps, drain paris, avoid link fra-ams, blackhole ddos"]
```

`teParse()` sekarang hanya menerima `prefer|avoid` untuk `pni|ix|transit`:

```js
// TE_KINDS
TE_KINDS = { pni:'p', ix:'ix', transit:'t' };
```

Tidak ada `cache`. Padahal di `compute()` cache adalah **rank 0** — paling diutamakan:

```js
// baris 1236
out.push({ k:'c', rank:0, lab:NET[net].cache.name+' cache', cap:CACHE_CAP, ... });
```

**Yang diminta:** pemain bisa memaksa traffic **tidak** lewat cache, misal karena cache box penuh atau ingin traffic lewat IX yang sudah dibayar.

### 4.1 Spesifikasi

Tambah `cache` ke `TE_KINDS`:

```js
const TE_KINDS = { pni:'p', ix:'ix', transit:'t', cache:'c' };
```

Tambah rank untuk cache di `eff()` — sekarang `cache` rank 0 (paling bagus). Untuk `avoid cache`, rank harus jadi paling buruk **tanpa** mematikan cache:

```js
// eff() — cari fungsi ini, tambahkan cabang cache
if (k === 'cache') return rank.avoidCache ?? 4.7;   // lebih buruk dari drain (4.6)
```

Di `teParse()`, regex `prefer|avoid` sudah generik — cukup `TE_KINDS` yang diperluas, **tidak perlu ubah regex**. Tapi validasi: `prefer cache` tidak masuk akal (cache sudah rank 0). Tolak dengan pesan jelas:

```js
if(m[1]==='prefer' && m[2]==='cache') {
  out.errors.push(`line ${L}: cache is already the best path; use "avoid cache for <net>" to steer away from it`);
  return;
}
```

### 4.2 Efek di `compute()`

Egress cache dibangun di baris ~1236:

```js
if(cacheNets.has(n.id) && !(TRX && TRX.avoidCache && TRX.avoidCache.has(n.id))) {
  // baru boleh pakai cache
}
```

Dan flow yang tadinya `flows.push({c,n,rem:a*0.85,cache:true})` harus jadi `rem:a` (semua lewat jalur normal) kalau `avoidCache.has(n.id)`.

### 4.3 Test

```js
test('RouteScript: avoid cache parses', () => {
  const { ev } = load();
  assert.equal(ev('JSON.stringify(teParse("avoid cache for goggle").errors)'), '[]');
  assert.equal(ev('teParse("avoid cache for goggle").n'), 1);
});
test('RouteScript: prefer cache is rejected with a helpful message', () => {
  const { ev } = load();
  assert.match(ev('teParse("prefer cache for goggle").errors[0]'), /already the best path/);
});
test('RouteScript: avoid cache actually moves traffic off the cache', () => {
  // build game, install ggl cache, measure R.useCache['...'] before/after deploy
});
```

### 4.4 Kenapa ini berguna

Skenario nyata dari chat: **"GGC Singapore penuh"** (367/400G warning). Cache box punya `CACHE_CAP = 100` per box, maksimal 4 box per kota per network (baris 2338: `>=4` return). Kalau 4 box sudah penuh, `avoid cache` adalah satu-satunya cara memindahkan traffic ke IX tanpa membongkar cache.

Alternatif yang sudah ada: buka GGC di kota lain (Arcello: *"open ggc di tempat lain om biar ke split"*). Tapi itu butuh POP + port + $400/mo. `avoid cache` gratis.

---

## 5. Referensi baris — v1.10.1 (3.428 baris)

**Nomor di brief 1 sudah usang. Pakai tabel ini.**

```
508   W/H/KM (let)
509   POP_COST · CACHE_CAP=100 · CACHE_MO=400 · CN_LIC
613   CITY_LL
614   CITIES
607   LANDS_LL
714   CABLES
804   NETS
819   nfx cache:{min:12}
820   ggl cache:{min:15}
821   fbk cache:{min:10}
880   XIX
909   TAIL
988   BIZ_T
1023  ROLES
1033  ROLE_IDS · roleDef() · roleAllowsType()
1068  UI
1172  curRegion · beginGame applyRegion
1236  cache egress rank:0
1307  newGame (caches:[], idLic belum ada)
1322  wrapDx
1345  t1Club()
1475  reachGo hint (cacheOk)
1538  cache load warning (HOT) — blok `const cc={}`
1601  compute()
1711  CACHE_MO cost
1734  sanitize
1842  regionMult
1890  sfOf
2067  dayTick
2243  ACT
2338  cache() action · CACHE_MO toast
2340  rmCache
2411  pickRole
2417  SAVE_MODES · pickSaveMode
2464  saveKey · clearSave
2470  save()
2517  loadSave
2858  cost label (caches)
2918  PICK_REGIONS · SAVE_MODES · START_DESC
2921  showTitle
3056  REGION={global:…}
3068  rebuildDerived
3091  applyRegion
3111  visibleKs
3326  wrapCam
```

`teParse` cari dengan `h.find('function teParse')`. `TE_KINDS` cari dengan `h.find('TE_KINDS')`.

---

## 6. Urutan kerja yang disarankan

| M | Isi | Status | Gate |
|---|---|---|---|
| M1 | REGION + applyRegion | ✅ done | `prd-m1.test.js` |
| M2 | selector + save mode | ✅ done | `prd-m2.test.js` |
| F7 | roles | ✅ done | `prd-roles.test.js` |
| **M3-geo** | poligon + kota + proyeksi + IX Manila + **GGC scarcity** | 🔄 running | `onLand` 30/30 |
| **M4-cache** | `avoid cache` RouteScript | ⬜ baru | 3 test §4.3 |
| **M3-topo** | 12 kabel + filter NETS + ambang T1 + 20 tail + 12 net | ⬜ | `NSH`=1,0 |
| **M5** | aturan Indonesia | ⬜ | 7 test |

**M4-cache bisa dikerjakan paralel** dengan M3-topo — dia menyentuh `teParse`/`compute`, bukan data kota.

---

## 7. Test wajib

Semua harus lulus sebelum merge:

```js
// M3-geo
test('every SEA city sits on land', () => { /* §1 brief 1 */ });
test('every SEA city projects inside canvas', () => { /* ... */ });
test('idn: GGC only in cacheCities', () => { /* §1.2 di atas */ });
test('idn: cache threshold multiplied', () => { /* §1.2 */ });

// M4-cache
test('RouteScript: avoid cache parses', () => { /* §4.3 */ });
test('RouteScript: prefer cache rejected', () => { /* §4.3 */ });
test('RouteScript: avoid cache moves traffic', () => { /* §4.3 */ });

// M3-topo
test('NSH sums to 1 in every region', () => { /* ... */ });
test('at least one T1 covers 8 SEA core cities', () => { /* ntt 8/8 */ });
test('Manila has an IX', () => { /* ... */ });
test('SEA startCities are the 4 biggest POPs', () => {
  assert.deepEqual(REGION.sea.startCities, ['jkt','mnl','bkk','sin']);
});

// M5
test('transit blocked without OSS', () => { /* ... */ });
test('IX port blocked without APJII', () => { /* ... */ });
test('DF blocked without ROW', () => { /* ... */ });
test('PNI not live until ready day', () => { /* ... */ });
test('B2B revenue lands after payment term', () => { /* ... */ });
test('enterprise churn 3 days, UMKM 15', () => { /* ... */ });
test('peak hour reduces service factor', () => { /* ... */ });

// Regresi — jangan sampai rusak
test('global baseline unchanged', () => { /* tests/prd-baseline.test.js */ });
```

---

## 8. Jebakan

| Jebakan | Akibat | Cegah |
|---|---|---|
| `NETS` tidak difilter | `reach` mentok 68,6%, semua B2B churn | urutan `filter→NETS→NET→NSH` |
| `proj0` dipakai sebelum di-set | peta gepeng | `applyRegion` sebelum `CITY.x/y` |
| Poligon self-intersecting | kota di laut / darat palsu | test `onLand` |
| `t1Continents:3` di `idn` | T1 mustahil | override jadi 1 |
| `prefer cache` diterima | tidak ada efek, membingungkan | tolak dengan pesan |
| `avoid cache` mematikan cache | rank `Infinity` = traffic drop | pakai rank 4.7, bukan Infinity |
| Sentuh loop animasi | konflik patch time-warp | **jangan** |

---

## 9. Yang sudah final — jangan diubah

| Keputusan | Nilai |
|---|---|
| SEA menggantikan Global? | **Tidak.** Menambah |
| Kota existing di bbox SEA | **8** |
| Poligon baru | **10** |
| `idn` geometri sendiri? | **Tidak.** SEA + filter + aturan |
| Tier 1 pengganti? | **Tidak.** `ntt` sudah 8/8 |
| `regionMult` AS | **2.5**, jangan diturunkan |
| `REGION.sea.startCities` | `['jkt','mnl','bkk','sin']` |
| `REGION.idn.startCities` | `['jkt','sby','upg']` |
| Kabel baru | **12** |
| Long tail baru | **20** |
| Jaringan baru | **12** |
| `t1Continents` idn | **1** |

---

*Basis: v1.10.1 + M1 + M2 + F7 (commit `8e50e65`), `site/index.html` 3.428 baris. Semua nomor baris di §5 diverifikasi dengan `grep -n` pada commit tersebut.*
