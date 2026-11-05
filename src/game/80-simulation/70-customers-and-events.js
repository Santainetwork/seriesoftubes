function bizSf(b,ids){const T=BIZ_T[b.type];return T.fiber?(fiberOk(b,ids)?1:0):T.l2?clamp((R.l2[b.id]||0)/b.bw,0,1):bizSfOf(R,b.city)*((R.tgtF&&R.tgtF[b.id])??1);}
// Protected business traffic has its own served share; without the rule it shares the city's.
function bizSfOf(r,c){const d=r.bizDem&&r.bizDem[c];return teRules()&&teRules().protect&&d>1e-6?clamp(r.bizSrv[c]/d,0,1):sfOf(r,c);}
function bCities(o){return o.sites?o.sites.slice():[o.city,o.city2].filter(Boolean);}
function bHas(o){return !!BIZ_T[o.type].cap||bCities(o).every(c=>S.pops[c]);}
function eventLive(b){return BIZ_T[b.type].event&&S.day>=b.start&&S.day<b.start+b.dur;}
// No warning where nobody attacks (Best Effort, Change Freeze, puzzles, the sandbox's calm).
function bRisk(b){return BIZ_T[b.type]?.gaming&&!ddosOff()?`<div class="meta">⚠️ ${tr('customers_and_events.gaming_attracts_attacks')}</div>`:'';}
function bTerms(o){const T=BIZ_T[o.type];if(T.cap)return capTerms(o);
  if(T.event){const live=S.day>=o.start;return tr('customers_and_events.bw_extra_for_d_days_when',{bw:fmtG(o.bw),d:o.dur,when:live?tr('customers_and_events.day_n_of_d',{n:S.day-o.start+1,d:o.dur}):tr('customers_and_events.starting_in_n_d',{n:o.start-S.day}),fee:fmt$(o.fee)});}
  if(T.sdwan)return tr('customers_and_events.n_sites_list_bw_per_site',{n:o.sites.length,list:o.sites.map(c=>CITY[c].name).join(', '),bw:fmtG(o.bw),price:fmt$(o.bw*o.rate)});
  if(T.fiber)return esc(o.what)+' · '+tr('common.price_mo',{price:fmt$(o.rate)});
  return fmtG(o.bw)+' · '+tr('common.price_mo',{price:fmt$(o.bw*o.rate)});}
// Events are paid once at the end, prorated by how much of the crowd you served.
function eventTick(b,d){if(!BIZ_T[b.type].event)return false;if(d<b.start)return true;
  if(d<b.start+b.dur){b.srv=(b.srv||0)+sfOf(R,b.city);b.srvDays=(b.srvDays||0)+1;if(d===b.start)toast(tr('customers_and_events.name_starts_today_bw_of_extra',{name:esc(b.name),bw:fmtG(b.bw),city:CITY[b.city].name,d:b.dur}),'goal',[{l:tr('common.show_me'),act:'focusCity',args:{city:b.city}}]);return true;}
  const avg=b.srvDays?b.srv/b.srvDays:0;if(avg>=0.95)S.stats.evFull=(S.stats.evFull||0)+1;const pay=avg>=0.95?b.fee:avg>=0.7?Math.round(b.fee*avg):-Math.round(b.fee*0.2);S.cash+=pay;S.biz=S.biz.filter(x=>x!==b);
  toast(pay>=0?tr('customers_and_events.name_is_over_pay_you_delivered',{name:esc(b.name),pay:fmt$(pay),pct:pct(avg)})+(avg>=0.95?' '+tr('common.flawless'):''):tr('customers_and_events.name_was_a_disaster_only_pct',{name:esc(b.name),pct:pct(avg),pay:fmt$(-pay)}),pay>=0?'good':'bad');sfx(pay>=0?'coin':'err');return true;}
/* Where the giants actually build: gigawatt AI campuses and cloud regions, mapped to the nearest city on the map. */
const MEGA=[{c:'ash',n:'Data Center Alley'},{c:'ash',n:'Prome-the-mess Ohio'},{c:'dal',n:'Star-Gait Abilene'},{c:'dal',n:'Hyperbole Louisiana'},{c:'dal',n:'Colossal Ego Memphis'},{c:'chi',n:'Fairweather Wisconsin'},{c:'chi',n:'Project Rainy-er Indiana'},{c:'chi',n:'Cornfield Cluster Iowa'},{c:'nyc',n:'Neocloud New Jersey'},{c:'sto',n:'Star-Gait Fjord-way'},{c:'mad',n:'Aragón Mega-shed'},{c:'dub',n:'Bring-Your-Own-Power Dublin'},{c:'auh',n:'Star-Gait UAE'},{c:'ruh',n:'Desert Kingdom AI Campus'},{c:'doh',n:'Lusail Data Oasis'},{c:'kul',n:'Johor Overflow'},{c:'hyd',n:'Vizag AI Hub'},{c:'icn',n:'Ulsan AI Campus'},{c:'tok',n:'Hokkaido Snow DC'},{c:'syd',n:'Star-Gait Down Under'},{c:'syd',n:'AirDrunk Western Sydney'},{c:'mel',n:'AirDrunk Melbourne West'},{c:'mex',n:'Querétaro Cluster'},{c:'for',n:'Short-Video Ceará Campus'},{c:'scl',n:'Quilicura Region'}];
function spawnMega(t,T,nm,mine){
  /* A campus only exists where this map has its city: MEGA is a global list, and on a regional
     map most of it is off-map. Reading CITY[m.c] for one of those threw inside dayTick, so a SEA
     player with a campus POP got "the simulation hit a snag" instead of a deal. */
  const megaMine=MEGA.filter(m=>mine.includes(m.c)&&CITY[m.c]);
  if(t==='ingest'){if(!megaMine.length)return;const m=pick(megaMine),bw=pick(T.opts),dur=3+Math.floor(Math.random()*4),start=S.day+10+Math.floor(Math.random()*12);
    S.offers.push({id:uid(),city:m.c,city2:null,name:tr('customers_and_events.name_at_site',{name:nm(),site:m.n}),type:t,bw,rate:0,reqs:[],start,dur,fee:Math.round(bw*dur*55),exp:start-2,mega:true});return;}
  if(t==='aiwan'||t==='agi'){if(!megaMine.length)return;
    const a=pick(megaMine),others=MEGA.filter(m=>m.c!==a.c&&CITY[m.c]&&(Math.random()<0.7?mine.includes(m.c):true));if(!others.length)return;const b=pick(others),km=kmBetween(a.c,b.c),bw=pick(T.opts);
    if(!reqCan('diverse',{city:a.c,city2:b.c}))return;
    const reqs=['diverse'];if(Math.random()<0.4)reqs.push('metro');
    S.offers.push({id:uid(),city:a.c,city2:b.c,name:`${nm()}: ${a.n} ⇄ ${b.n}`,type:t,bw,rate:Math.round((150+km*0.08)*T.km),reqs,exp:S.day+45,mega:true});return;}
  if(t==='mtrain'){if(!megaMine.length)return;const hub=pick(megaMine),reg=CITY[hub.c].reg,pool=[...new Set(MEGA.filter(m=>m.c!==hub.c&&CITY[m.c]&&CITY[m.c].reg===reg).map(m=>m.c))];if(pool.length<2)return;
    const sites=[hub.c];while(sites.length<Math.min(4,pool.length+1)&&pool.length)sites.push(pool.splice(Math.floor(Math.random()*pool.length),1)[0]);
    const avg=sites.slice(1).reduce((x,c)=>x+kmBetween(hub.c,c),0)/(sites.length-1),bw=pick(T.opts);
    S.offers.push({id:uid(),city:hub.c,city2:null,sites,name:tr('customers_and_events.name_hub_site',{name:nm(),site:hub.n}),type:t,bw,rate:Math.round((150+avg*0.08)*0.6),reqs:[],exp:S.day+45,mega:true});return;}
  /* A fiber-pairs deal is about the trench you dug, not about an AI campus: it must not inherit
     the campus gate above, or a map with no campus can never sell a pair of fibers. */
  /* A trench buyer is still demand on that route, so a route whose market is already full does
     not get one: otherwise the broker's listings and the random offer pool compete for the same
     waves and the player is offered capacity the route no longer wants. */
  if(t==='pairs'){const ls=S.links.filter(l=>l.kind==='df'&&l.own&&l.ready<=S.day&&brFree(l)>=1&&!S.biz.some(b=>(b.type==='pairs'||b.type==='dfpair')&&b.link===l.id)&&!S.offers.some(o=>o.link===l.id));if(!ls.length)return;const l=pick(ls),n=100+50*Math.floor(Math.random()*7);
    S.offers.push({id:uid(),city:l.a,city2:l.b,link:l.id,what:tr('customers_and_events.n_fiber_pairs_in_your_a',{n,a:CITY[l.a].name,b:CITY[l.b].name}),name:nm(),type:t,bw:1,rate:Math.round(dfLeaseMo(l.km)*n*0.2),reqs:[],exp:S.day+30,mega:true});}
}
/* Brief 18 §B: Indonesian customer names for the Indonesia map. Every one is a parody —
   the real brand is never spelled correctly, so nothing here can be mistaken for the actual
   company. Only used when the region is `idn`; the global map keeps the original pool. */
const IDN_NAMES={
 dia:['Mie Gacuan','Solariya','Kopi Kenongan','Warung Padang Sederhana-ish','Bakso Pak Tebe','Ayam Geprek Bensu-ish','Nasi Goreng Gila','Martabak Bangka-ish','Sate Taichan Srengseng','Es Teh Nusantara','Roti Bakar Keju','Soto Betawi Haji Umar-ish'],
 host:['Rukonet Data Center','Gedung Siber Nusantara','Kandang Server Cikarang','Balai Data Sentul','Rumah Server Tangerang','Wisma Data Bekasi','Menara Bit Surabaya','Pondok Rack Bandung'],
 stream:['Nontonin Yuk','Streamin Aja','Vidioan','Layar Nusantara','Tontonan Kita','Filmku Gratisan','Siaran Rakyat','Nobar Terus'],
 edu:['Kampus Online Nusa','Sekolah Digital Rakyat','Bimbel Cerdas Bangsa','Universitas Terbuka-ish','Les Privat Online','Akademi Koding Kampung','Ruang Belajar Kita','Guru Ngaji Digital'],
 gpu:['Warung GPU Nusantara','Render Kampung AI','Kandang Tensor Indonesia','Server Latih Model','Bengkel AI Jakarta','Klinik Komputasi','Rumah GPU Batam','Pabrik Model Bahasa'],
 onramp:['Awan Nusantara on-ramp','Gumpalan Cloud on-ramp','Toko Awan on-ramp','Layanan Awan Rakyat on-ramp','Awan Merah Putih on-ramp'],
 ai:['Otak Buatan Nusantara','Model Bahasa Indonesia','Latih Cerdas','Kandang Neural','Pabrik Kecerdasan','Riset AI Kampung','Bengkel Model','Data Latih Rakyat'],
 hyper:['Awan Nusantara DCI','Gumpalan Cloud DCI','Toko Awan DCI','Awan Rakyat DCI','Pusat Data Nasional-ish DCI'],
 hft:['Dana Kilat Sekuritas','Nanodetik Nusantara','Arbitrase Bursa','Modal Cepat','Perdagangan Kilat','Front-Run Pasar','Mikrowave Jakarta'],
 bulk:['Arsip Dingin Nusantara','Backup Nasional','Gudang Data Lambat','Tape Kampung','Cadangan Data Rakyat','Arsip Kementerian-ish'],
 event:['Konser Musik Nusantara','Pesta Rakyat Jakarta','Turnamen Esport Nasional','Festival Kuliner Nusantara','Panggung Gede Bandung','Karnaval Surabaya','Nobar Bareng Piala','Pameran Teknologi'],
 sdwan:['Kebab Turki Baba Rafi-ish','Warung Kopi Kekinian','Ayam Geprek Juara','Bakso President-ish','Martabak Kubang-ish','Es Krim Glico-ish','Resto Padang Sederhana-ish','Minimarket Sejahtera','Apotek Kesehatan Rakyat','Bank Rakyat Digital','SPBU Nusantara','Salon Kecantikan'],
 wwave:['Fiber Nusantara','Jaringan Rakyat','Kabel Kita','Serat Optik Kampung','Tiang Fiber Indonesia','Jalur Terang','Kabel Bawah Tanah','Serat Nusa'],
 dfpair:['Konsorsium Fiber Nusantara','Operator Kabel Nasional-ish','Investor Fiber Asing','Dana Infrastruktur','Konsorsium Gelap'],
 l2vpn:['Jaringan Tertutup Nusantara','VPN Korporat Kita','Jalur Khusus Bank','Kabel Pemerintah-ish','Jaringan Internal Grup'],
 game:['Server Game Nusantara','Game Online Rakyat','Arena Mobile','Turnamen Daring','Studio Game Kampung'],
 scrub:['Perisai Siber Nusantara','Benteng DDoS','Penangkal Serangan','Satpam Digital'],
 ingest:['Pengumpul Data Nusantara','Sensor Kota','Kamera Cerdas','Jaringan IoT Rakyat'],
 mtrain:['Latih Model Bersama','Konsorsium AI Nusantara','Riset Bahasa Daerah'],
 pairs:['Pasangan Fiber Nusantara','Duplet Kabel','Jalur Ganda'],
 /* An Indonesian ISP always has "Net" in its name — that is the convention, and a NAP selling
    downstream ports is talking to ISPs. Every entry ends in Net. */
 isp:['Jaringan Rakyat Net','Fiber Kita Net','Netindo Nusantara Net','Cepat Net Indonesia','Awan Nusantara Net','Kabel Net Rakyat','Sinar Net','Bintang Net','Maju Net','Sentosa Net','Prima Net Nusantara','Andalan Net','Nusa Net','Mitra Net','Harmoni Net','Cahaya Net','Bumi Net','Samudra Net','Cakrawala Net','Lintas Net','Tunas Net','Mekar Net','Surya Net','Gading Net'],
 remote:['JKT-IKS Remote Peering','IXI Remote Peering','SisiX Remote Peering','BIKS Remote Peering','CitraIKS Remote Peering','UNI-IKS Remote Peering','Konten Nusantara Remote Peering','Awan Nusantara Remote Peering','Nontonin Yuk Remote Peering','Gumpalan Cloud Remote Peering'],
};

function spawnSpecial(t){const T=BIZ_T[t],mine=Object.keys(S.pops),lv=lvl();
  /* Brief 18 §B: on the Indonesia map the prospect pool is Indonesian and parodic. */
  const poolS=(curRegion==='idn'&&IDN_NAMES[t])?IDN_NAMES[t]:T.names;
  const nm=()=>{const list=poolS.filter(n=>!S.usedNames.includes(n));const n=list.length?pick(list):pick(poolS);useName(n);return n;};
  if(T.mega){spawnMega(t,T,nm,mine);return;}
  if(T.event){const city=Math.random()<0.85&&mine.length?pick(mine):pick(OFFC);const bw=pick(T.opts.slice(0,Math.min(T.opts.length,lv+2)));const dur=3+Math.floor(Math.random()*5),start=S.day+12+Math.floor(Math.random()*14);
    S.offers.push({id:uid(),city,city2:null,name:tr('customers_and_events.name_in_city',{name:nm(),city:CITY[city].name}),type:t,bw,rate:0,reqs:[],start,dur,fee:Math.round(bw*dur*70),exp:start-2});return;}
  if(T.sdwan){const hub=pick(mine),n=3+Math.floor(Math.random()*4),pool=(Math.random()<0.85?mine:OFFC).filter(c=>c!==hub),sites=[hub];
    while(sites.length<n&&pool.length)sites.push(pool.splice(Math.floor(Math.random()*pool.length),1)[0]);if(sites.length<3)return;
    S.offers.push({id:uid(),city:hub,city2:null,sites,name:nm(),type:t,bw:pick(T.opts),rate:(T.siteRate||700)*sites.length,reqs:[],exp:S.day+40});return;}
  const ready=S.links.filter(l=>l.kind==='df'&&l.ready<=S.day);
  if(t==='wwave'){const u=fiberUse(),ls=ready.filter(l=>freeCh(l,u)>=1&&brFree(l)>=1&&!S.offers.some(o=>o.link===l.id));if(!ls.length)return;S.offers.push(fiberOffer(t,pick(ls),nm));return;}
  if(t==='dfpair'){const u=fiberUse(),ls=ready.filter(l=>pairFree(l,u)&&brFree(l)>=BR_PAIR&&!S.offers.some(o=>o.link===l.id));if(!ls.length)return;S.offers.push(fiberOffer(t,pick(ls),nm));}
}
