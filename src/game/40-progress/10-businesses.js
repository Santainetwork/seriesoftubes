/* ================= BUSINESSES ================= */
const BIZ_T={
 dia:{l:tr('common.enterprise_dia'),opts:[1,2,5,10],rate:600},
 game:{l:tr('common.game_servers'),gaming:true,opts:[5,10,20,40],rate:120},
 host:{l:tr('common.hosting'),opts:[10,20,40,80],rate:60},
 isp:{l:tr('businesses.downstream_isp_buys_transit'),opts:[100,200,400,800],rate:15,lv:2},
 l2vpn:{l:tr('common.l2vpn_circuit'),opts:[1,10,40,100],rate:0,l2:true,km:1,lv:1},
 fabip:{l:tr('businesses.customer_on_a_fabric_transit_over'),opts:[1,5,10,25],rate:110,nni:true,lv:2},
 fabl2:{l:tr('businesses.fabric_circuit_to_one_of_your'),opts:[1,5,10],rate:0,l2:true,nni:true,km:0.8,lv:2},
 stream:{l:tr('common.streaming_startup'),opts:[50,100,200],rate:80,lv:2},
 edu:{l:tr('common.university_network'),opts:[20,50,100],rate:90,lv:2},
 gpu:{l:tr('businesses.ai_gpu_data_center'),opts:[200,400,800],rate:70,lv:3,names:['Neural Noodles AI','GPUs R Us','Hallucination Labs','Transformers & Sons','Token Burners Inc.','Very Large Language Co.','Prompt Engineering Ltd','DeepThought Farms','Parameter Pastures','Gradient Descent Diner','Attention Is All We Need LLC','Overfit Analytics']},
 onramp:{l:tr('businesses.cloud_on_ramp'),opts:[100,200,400],rate:0,l2:true,km:0.7,lv:3,names:["Amazin' Web Services on-ramp","Microsnoft Azzure on-ramp",'Goggle Cloud on-ramp','AliBubble Cloud on-ramp','Miracle Cloud on-ramp']},
 ai:{l:tr('businesses.ai_training_interconnect'),opts:[400,800,1600],rate:0,l2:true,div:true,km:0.9,lv:4,names:['Skynot Compute','Galaxy Brain Training Run','Megawatt Minds','The Big Model Co.','Infinite Context Corp','Sentient Spreadsheet Inc.']},
 hyper:{l:tr('common.hyperscaler_dci'),opts:[1600,3200,6400],rate:0,l2:true,div:true,km:0.5,lv:4,names:["Amazin' Web Services DCI","Microsnoft Azzure DCI",'Goggle Cloud DCI','Faceplant Infra DCI','AliBubble Cloud DCI']},
 hft:{l:tr('businesses.high_frequency_trading_link'),opts:[1,5,10],rate:0,l2:true,lat:true,km:6,lv:2,names:['Flash Boys Capital','Nanosecond Nancy Trading','Speed of Light Securities','Arbitrage & Sons','Front-Run Fund','Microwave Tower Capital','Tick-Tock Quant','Low Latency Larry LLC']},
 bulk:{l:tr('businesses.bulk_backup_transfer_latency_does'),opts:[100,200,400],rate:0,l2:true,scenic:true,km:0.1,lv:2,names:['Glacier Slow Storage','Tape Backup Tortoise','Scenic Route Archives','Cold Storage Cold Cuts','Sloth Sync','Eventually Consistent Inc.','Snail Mail Data Co.']},
 event:{l:tr('common.event_network'),opts:[100,200,400,800,1600,3200],rate:0,event:true,lv:2,names:['Carnaval Parade','Diwali Streaming Night','The Big Football Final','NANOG 99','Burning Router Festival','Euro-Pop Song Contest','Formula Ping Grand Prix','The Big Game','Olympic Pings','A Pop Megastar Stadium Tour','LAN Party of the Century','The Keynote (One More Thing)','Gamer-Con Expo','Oktoberfest Livestream']},
 sdwan:{l:tr('businesses.sd_wan_for_a_chain'),opts:[1,2,5,10],rate:0,l2:true,sdwan:true,km:0,lv:2,names:['Kebab Kingdom','Pretzel Palace','Burger Router Inc.','Café Latte-ncy','Hardware Hut Stores','Pharma-See Pharmacies','Bank of Tiny Branches','Supermarket Superhighway','Fitness Pings Gyms','Hotel Hops Group','Doughnut Data Diners']},
 wwave:{l:tr('common.wholesale_wave'),opts:[1],rate:0,fiber:true,lv:2,names:['Zay-No Fiber','Loomin’ Technologies','Clown Castle Fiber','G&T (Gin and Transit)','A Hyperscaler Who Shall Not Be Named','Megapork','youNetworks']},
 dfpair:{l:tr('businesses.dark_fiber_pair_lease'),opts:[1],rate:0,fiber:true,lv:3,names:['A Hyperscaler Who Shall Not Be Named','Goggle Fiber Division','Faceplant Infra','Amazin’ Backbone Team','A Very Secretive Trading Firm']},
 scrub:{l:tr('businesses.ddos_protection_dia'),opts:[1,5,10,20],rate:900},
 aiwan:{l:tr('businesses.ai_wan_between_two_ai_factories'),opts:[3200,6400,12800],rate:0,l2:true,div:true,mega:true,km:0.45,lv:4,names:['Fairweather AI WAN','Planet-Scale Superfactory Link','Two Brains One Model Inc.','Distributed Godlike Compute','The Gigawatt Handshake']},
 mtrain:{l:tr('businesses.multi_site_training_run'),opts:[1600,3200,6400],rate:0,l2:true,sdwan:true,mega:true,lv:4,names:['Gem-in-Eye Ultra Training Run','Frontier Model 9000','The Very Big Model','Checkpoint-Free Training Co.','Model Too Big For One Building']},
 ingest:{l:tr('businesses.dataset_ingest_elephant_flow'),opts:[1600,3200,6400],rate:0,event:true,mega:true,lv:3,names:['Scrape-the-Whole-Web Ingest','Checkpoint Sync Storm','Video Dataset Firehose','Every Book Ever (allegedly licensed)','Synthetic Data Tsunami']},
 remote:{l:tr('businesses.remote_peering_port'),opts:[10,100,400],rate:0,l2:true,km:0.4,lv:2,div:true},
 pairs:{l:tr('businesses.hundreds_of_fiber_pairs'),opts:[1],rate:0,fiber:true,mega:true,lv:4,names:['A Hyperscaler Who Shall Not Be Named','Planet-Scale AI WAN Team','The Fiber-Hungry Giant','Project Very Long Glass']},
 esport:{l:tr('businesses.esports_world_final'),opts:[400,800,1600,3200],rate:0,event:true,lv:5,names:['League of Lag Finals','Counter-Ping Major','Fortnightly World Cup','Dota Two Many Viewers','Rocket Leak Championship','Street Frighter Evo']},
 sov:{l:tr('businesses.sovereign_cloud_region'),opts:[400,800,1600],rate:0,l2:true,div:true,km:0.6,lv:6,names:['Gaia-Ex Sovereign Cloud','Bundeswolke (Very Secure)','Le Cloud Souverain','Datenschutz Deluxe','Your Data Stays Here, Probably','A Cloud With a Flag on It','Data Residency Is a State of Mind']},
 cgame:{l:tr('businesses.cloud_gaming_platform'),gaming:true,opts:[800,1600,3200],rate:45,lv:8,names:['Stadia-ium (Back Again)','GeForce Later','Ping Station Now','Luna-tick Gaming','Shadow of a Doubt Cloud PC','Input Lag Arcade','Bufferbloat Bros. Streaming']},
 metav:{l:tr('common.metaverse_platform'),opts:[1600,3200,6400],rate:35,lv:9,names:['Meh-taverse','Second Second Life','Horizon Worlds Apart','The Oasis (Ready Player Done)','Legs Finally Shipped Inc.','Decentra-landlocked']},
 agi:{l:tr('businesses.agi_lab_allegedly'),opts:[12800,25600],rate:0,l2:true,div:true,mega:true,km:0.4,lv:11,names:['Almost General Intelligence Inc.','Superintelligence Pending','The Lab That Said Two More Years','Paperclip Maximizer Labs','Deep Thought Two','Benevolent Overlord Research']},
 mars:{l:tr('businesses.mars_mission_ground_station'),opts:[100,200,400],rate:0,l2:true,lat:true,km:4,lv:13,names:['Red Planet Relay','Ares Ground Segment','Olympus Mons Uplink','Mars or Bust Mission Control','Interplanetary Ping Society','Light-Minute Logistics','RFC 1149 Avian Carriers (Mars Division)']},
 provedor:{l:tr('businesses.provedor_small_regional_isp'),opts:[5,10,20,40],rate:20,br:true,names:['Provedor Capivara Net','Fibra do Sertão','Rapidinho Telecom','Net Jabuticaba','Caipirinha Online','Wi-Fi do Zé','Pão de Queijo Fibra','Açaí Net','Tucano Telecom','Forró Fibra','Saci Net','Brigadeiro Banda Larga','Mandioca Online','Churrasco Connect']},
};
const LEVELS=[
 {n:tr('common.local_isp'),q:tr('businesses.your_network_diagram_is_a_photo'),req:tr('common.start_here'),unlock:tr('businesses.enterprises_game_servers_hosting')},
 {n:tr('common.regional_player'),q:tr('businesses.you_now_have_a_change_freeze'),req:tr('businesses.peak_200_gbps_and_3_pops'),unlock:tr('businesses.downstream_isps_streaming_startups')},
 {n:tr('common.serious_backbone'),q:tr('businesses.it_s_not_dns_there_s'),req:tr('businesses.peak_1_tbps_and_6_pops'),unlock:tr('businesses.ai_gpu_data_centers_and_cloud')},
 {n:tr('common.big_league'),q:tr('businesses.your_mtu_is_9000_on_every'),req:tr('businesses.peak_3_tbps_10_pops_3'),unlock:tr('businesses.ai_training_interconnects_and')},
 {n:tr('common.continental_carrier'),q:tr('businesses.your_noc_has_a_chat_channel'),req:tr('businesses.peak_6_tbps_15_pops_4'),era:1.15,unlock:tr('businesses.esports_world_finals_and_the_4k')},
 {n:tr('common.transcontinental'),q:tr('businesses.you_joined_the_outages_mailing_list'),req:tr('businesses.peak_9_tbps_and_20_pops'),unlock:tr('businesses.sovereign_cloud_regions_and_a_free')},
 {n:tr('common.global_backbone'),q:tr('businesses.your_asn_now_shows_up_in'),req:tr('businesses.peak_12_tbps_25_pops_5'),unlock:tr('businesses.a_free_pni_with_voda_phony')},
 {n:tr('common.packet_empire'),q:tr('businesses.your_maintenance_window_is_2_a'),req:tr('businesses.peak_16_tbps_and_32_pops'),era:1.15,unlock:tr('businesses.cloud_gaming_platforms_and_the_cloud')},
 {n:tr('businesses.six_continent_carrier'),q:tr('businesses.somewhere_on_every_continent_a'),req:tr('businesses.peak_21_tbps_40_pops_6'),unlock:tr('businesses.metaverse_platforms_it_finally_took')},
 {n:tr('businesses.backbone_of_backbones'),q:tr('businesses.your_routing_table_needs_its_own'),req:tr('businesses.peak_26_tbps_and_50_pops'),era:1.2,unlock:tr('businesses.the_vr_era_eyeballs_want_20')},
 {n:tr('businesses.internet_weather_system'),q:tr('businesses.when_your_bgp_sneezes_a_small'),req:tr('businesses.peak_33_tbps_and_60_pops'),unlock:tr('businesses.agi_labs_allegedly_wanting_ai_wans')},
 {n:tr('businesses.too_big_to_route'),q:tr('businesses.your_last_fat_fingered_route_leak'),req:tr('businesses.peak_40_tbps_and_70_pops'),era:1.25,unlock:tr('businesses.the_ai_agent_era_eyeballs_want')},
 {n:tr('common.the_internet'),q:tr('businesses.people_phone_you_to_ask_if'),req:tr('businesses.peak_50_tbps_and_80_pops'),unlock:tr('businesses.mars_mission_ground_stations_gear')},
];
// What each level asks for (peak Gbps, POPs, continents). Continents carry over to the levels above.
const LV_REQ=[null,{pk:200,pops:3},{pk:1000,pops:6},{pk:3000,pops:10,reg:3},{pk:6000,pops:15,reg:4},{pk:9000,pops:20},{pk:12000,pops:25,reg:5},{pk:16000,pops:32},{pk:21000,pops:40,reg:6},{pk:26000,pops:50},{pk:33000,pops:60},{pk:40000,pops:70},{pk:50000,pops:80}];
const lvReg=i=>{
  const want=Math.max(0,...LV_REQ.slice(1,i+1).map(q=>q.reg||0));
  /* REGION is declared far below this line (const, ~line 6266), so reading it here throws
     "Cannot access 'REGION' before initialization" — lvReg is called during boot, before the
     declaration is evaluated. Go through a try/catch instead of a typeof guard: typeof does not
     protect against a temporal dead zone. */
  let can=0;
  try{can=(REGION[curRegion]&&REGION[curRegion].rules&&REGION[curRegion].rules.maxRegions)||0;}catch(e){can=0;}
  return can?Math.min(want,can):want;
};
// Open gates (sandbox, puzzles): every level's unlocks are there from the start.
const lvl=()=>S&&S.rules&&S.rules.gates==='open'?LEVELS.length:(S&&S.lvl)||1;
// Lower-case just the first word for mid-sentence use, so names like Tel-Mess or AGI keep their capitals.
const lc1=t=>/^[A-Z][a-z]/.test(t)?t[0].toLowerCase()+t.slice(1):t;
/* Peak traffic is what the level ladder measures, and a private circuit is traffic too: an
   L2VPN, a cloud on-ramp or an AI interconnect moves real bits and pays real money, but it never
   passes an IP exit, so it never reached R.served. A hosting outfit could therefore sell 400G of
   on-ramp, quadruple its revenue, and stay at level 1 forever. Both peaks are kept, and the
   level (and every headline number) reads the larger of the two. */
const peakTraffic=()=>Math.max((S&&S.stats&&S.stats.peak)||0,(S&&S.stats&&S.stats.peakL2)||0);
function custLevel(){const pops=Object.keys(S.pops).length,pk=peakTraffic(),rc=regionsCount();let lv=1;for(let i=1;i<LV_REQ.length;i++){const q=LV_REQ[i];if(pk>=q.pk&&pops>=q.pops&&rc>=lvReg(i))lv=i+1;else break;}return lv;}
// Traffic eras: some levels bring a new reason to watch more video, and every city's eyeballs grow toward more.
const eraMul=()=>LEVELS.slice(0,lvl()).reduce((a,L)=>a*(L.era||1),1);
const eyeP=c=>CITY[c].P*eraMul();
// New broadband starts small, but never above what the town can grow to (St Helena has 4,500 people).
const bbStart=c=>Math.min(eyeP(c),Math.max(8,CITY[c].P*0.03));
/* ================= KOMDIGI (NAP licence, Indonesia only) =================
   A NAP in Indonesia does not get a licence on day one. It gets one year of grace to build the
   network it promised, then Komdigi audits four commitments. Failing the audit revokes the
   licence, which ends the run: a NAP without a licence cannot legally sell to anyone.
   Everything here is scoped to curRegion==='idn' && role==='nap'. */
const KOMDIGI_GRACE=360;
const KOMDIGI_TAX={ppn:0.11,bhp:0.005,uso:0.0125};
const KOMDIGI_KM=100, KOMDIGI_T2=100, KOMDIGI_IRU=1, KOMDIGI_UP=2;

function komdigiOn(){return !!(S&&curRegion==='idn'&&S.role==='nap'&&S.komdigi);}

/* The four commitments, all cumulative across every POP. */
function komdigiChecks(){
  const links=S.links||[];
  const km=links.reduce((a,l)=>a+(+l.km||0),0);
  const bwT2=(S.transit||[]).filter(t=>{const n=netOf(t.net);return n&&n.type==='t2';})
    .reduce((a,t)=>a+((PORT[t.tier]||{}).g||0)*(t.n||1),0);
  /* An IRU is dark fiber leased from someone else. Digging your own trench is not an IRU. */
  const iru=links.some(l=>l.kind==='df'&&!l.own);
  const up=new Set((S.transit||[]).map(t=>t.net)).size;
  return [
    {id:'km',   l:'Kabel tergelar',  have:Math.round(km),      need:KOMDIGI_KM,  unit:'km', ok:km>=KOMDIGI_KM},
    {id:'t2',   l:'Bandwidth Tier-2',have:Math.round(bwT2),    need:KOMDIGI_T2,  unit:'G',  ok:bwT2>=KOMDIGI_T2},
    {id:'iru',  l:'IRU kabel',       have:iru?1:0,             need:KOMDIGI_IRU, unit:'',   ok:iru},
    {id:'up',   l:'Upstream',        have:up,                  need:KOMDIGI_UP,  unit:'',   ok:up>=KOMDIGI_UP},
  ];
}
function komdigiAllOk(){return komdigiChecks().every(c=>c.ok);}

/* Called once a day. Grace ends, the audit runs, and from then on compliance is re-checked. */
function komdigiTick(){
  if(!komdigiOn())return;
  const K=S.komdigi;
  if(!K.audit)K.audit=(K.started||0)+KOMDIGI_GRACE;
  if(!K.licensed){
    if(S.day>=K.audit){
      const checks=komdigiChecks(), failed=checks.filter(c=>!c.ok);
      if(!failed.length){K.licensed=true;K.licensedDay=S.day;
        toast(`<b>Izin NAP terbit.</b><br>Komdigi menerima keempat komitmen. ${esc(S.name)} kini beroperasi resmi.`,'goal');}
      else{K.revoked=true;K.revokedWhy=failed.map(c=>`${c.l} ${c.have}/${c.need}${c.unit}`).join(', ');
        S.lost=true;S.lostWhy=`Izin NAP dicabut: ${K.revokedWhy}`;}
    }
  }else{
    /* Once licensed you must stay compliant: dropping below a threshold revokes it. */
    const failed=komdigiChecks().filter(c=>!c.ok);
    if(failed.length){K.revoked=true;K.revokedWhy=failed.map(c=>`${c.l} ${c.have}/${c.need}${c.unit}`).join(', ');
      S.lost=true;S.lostWhy=`Izin NAP dicabut: ${K.revokedWhy}`;}
  }
}

/* PPN 11% + BHP 0,5% + USO 1,25% of gross revenue, settled once a year on day 360n. */
function komdigiTax(){
  if(!komdigiOn())return;
  const K=S.komdigi;
  if(S.day%360!==0)return;
  const gross=K.yearRev||0;
  K.yearRev=0;
  if(gross<=0)return;
  const bill=Math.round(gross*(KOMDIGI_TAX.ppn+KOMDIGI_TAX.bhp+KOMDIGI_TAX.uso));
  K.taxPaid=(K.taxPaid||0)+bill;K.lastBill=bill;K.lastGross=gross;
  if(bill<=0)return;
  if(S.cash>=bill){S.cash-=bill;toast(`<b>Pajak tahunan dibayar.</b><br>PPN 11% + BHP 0,5% + USO 1,25% dari pendapatan kotor ${fmt$(gross)}: ${fmt$(bill)}.`,'');}
  else{
    /* Do not kill the run over a tax bill: carry it as debt and say so. */
    const short=bill-S.cash;S.cash=0;K.arrears=(K.arrears||0)+short;
    toast(`<b>Pajak tahunan belum lunas.</b><br>${fmt$(bill)} jatuh tempo, kas kurang ${fmt$(short)}. Tunggakan dicatat.`,'bad');}
}
/* PRD F7: your role decides which kinds of customer you may serve and how far you can grow.
   'isp' is the classic game and stays unrestricted; the other roles are deliberately narrower. */
const ROLES={
 hosting:{l:'Hosting',cash:90000,maxPops:3,bb:false,types:['host','gpu','onramp','ai'],
   blurb:'Colo and AI hosting. Hosting, GPU, cloud on-ramp and AI deals only. Max 3 POPs, no home broadband.'},
 nap:{l:'NAP',cash:2000000,minPops:3,bb:false,types:['isp','hyper','ai','l2vpn','remote'],early:['isp'],
   blurb:'Carrier hotel. Sells to ISPs, hyperscalers and AI. Small ISP deals from day one; wholesale contracts need 3 POPs.'},
 isp:{l:'ISP',cash:START_CASH,all:true,bb:true,
   blurb:'The classic all-rounder: home broadband, DIA, downstream ISPs, streaming, education and GPU deals. No extra limits.'},
 rtnet:{l:'RT/RW net',cash:45000,maxPops:2,bb:false,types:['dia'],bwMax:2,
   blurb:'Neighbourhood network. Small DIA deals only, max 2 POPs, and you must buy transit from another ISP first.'},
};
const ROLE_IDS=['hosting','nap','isp','rtnet'];
/* Brief 6 §3: the role table is global, but each region may override individual numbers
   (starting cash, POP limits, RT/RW bandwidth). Global ships roles:null, so its table is
   exactly the brief-5 one. */
function roleDef(role){
  const id=role||(S&&S.role)||'isp';
  const base=ROLES[id]||ROLES.isp;
  const rr=(typeof REGION!=='undefined'&&REGION[curRegion]&&REGION[curRegion].roles)||null;
  const ov=(rr&&rr[id])||null;
  return ov?{...base,...ov}:base;
}
/* Brief 6 §2: the legality ladder. Each step mixes traffic with the things that really
   gate an ISP in the physical world — POPs, tenants, an exchange, a building, time and cash.
   The network itself is carried across untouched. */
const ROLE_UP=[
 { from:'rtnet', to:'isp',
   req:{ served:50, pops:2, transit:1, days:120, cash:100000, lic:['oss'] },
   cost:60000,
   why:'50 Gbps of paying traffic, two POPs, a transit port, four months of books and the licence fee.' },
 { from:'isp', to:'nap',
   req:{ served:1000, pops:6, myIx:1, bizIsp:10, days:540, cash:500000 },
   cost:400000,
   why:'A terabit of traffic, six POPs, your own exchange, ten ISP tenants and half a million for the building.' },
 { from:'hosting', to:'nap',
   req:{ served:300, pops:3, site2:2, days:365, cash:400000 },
   cost:400000,
   why:'Every rack full, two metros with redundancy, and enough cash to buy the building instead of renting racks.' },
 { from:'nap', to:'isp',
   req:{ served:2000, pops:8, bb:1, days:730, cash:1000000 },
   cost:0,
   why:'You already own the building. Selling broadband yourself is just a decision — but you need a terabit of eyeballs first.' },
];
function roleAllowsType(t){const R=roleDef();return !!R.all||(R.types||[]).includes(t);}
/* A restricted role used to draw straight from its own type list, which ignored the level each
   customer type asks for: a hosting outfit at level 1 could sign an AI training interconnect that
   the general pool only offers at level 4. The level gate applies to every role now. `early` is the
   one deliberate exception — a NAP sells small ISP jobs from day one (brief 7 §4.1c), so ISP work
   is allowed below its usual level. */
function typeAtLevel(t){const T=BIZ_T[t];if(!T)return false;if(!T.lv||T.lv<=((S&&S.lvl)||1))return true;return (roleDef().early||[]).includes(t);}
/* An offer already on the table was vetted when it spawned (spawnOffer applies typeAtLevel). The
   panels only hide what the role cannot take at all: re-applying the level gate there would make
   Deals list a contract the city panel silently hides (and vice versa). Level still gates spawning. */
function roleOfferVisible(o){if(!o||!roleAllowsType(o.type))return false;if(roleBlockOffers())return false;if(S.role==='rtnet'&&!S.transit.length)return false;return true;}
function roleOfferOk(o){return roleOfferVisible(o)&&typeAtLevel(o.type);}
/* Brief 8 §2.2: Singapore unlock for the Indonesia map. Mirrors the roleUpOffer() checklist
   pattern (items with ok flags, missing list). The APJII leg uses the 'APJII Conneck'
   conference stamp because M5 licences do not exist yet. */
function unlockOffer(city){
  const rr=REGION[curRegion]&&REGION[curRegion].rules;
  const u=rr&&rr.unlock&&rr.unlock[city];
  if(!u) return null;
  if(S.unlocked&&S.unlocked[city]) return {ok:true,done:true,...u,items:[],missing:[]};
  const r=u.req, miss=[], items=[];
  const chk=(ok,l)=>{items.push({l,ok:!!ok});if(!ok)miss.push(l);};
  if(r.pops) chk(Object.keys(S.pops).length>=r.pops,`${r.pops} POPs`);
  if(r.served) chk((R.served||0)>=r.served,`${r.served} Gbps served (${fmtG(R.served||0)})`);
  if(r.apjii){
    const stamp=S.confReg&&Object.keys(S.confReg).some(k=>k.indexOf('APJII Conneck')===0);
    chk(!!stamp,'an APJII Conneck stamp (attend it in Deals)');
  }
  if(r.days) chk(S.day>=r.days,`${r.days} days of operation (day ${S.day})`);
  if(u.cost!==undefined) chk(S.cash>=u.cost,`${fmt$(u.cost)} in the bank`);
  return {...u, ok:!miss.length, missing:miss, items};
}
/* Cities that join the buildable set late. sin is the only one. */
const UNLOCK_CITIES={
  sin:{id:'sin',name:'Singapore'},
};
/* Brief 6 §2.2: what it would take to move one rung up. `missing` blocks the move; `pending`
   lists requirements whose mechanic has not shipped yet (M5 licences) and is shown as a note. */
function roleUpOffer(){
  if(!S||!S.role) return null;
  return ROLE_UP.filter(u=>u.from===S.role).map(u=>{
    const r=u.req, miss=[], pending=[], items=[];
    const chk=(ok,l)=>{items.push({l,ok:!!ok});if(!ok)miss.push(l);};
    chk((R.served||0)>=r.served,`${r.served} Gbps served (${fmtG(R.served||0)})`);
    chk(Object.keys(S.pops).length>=r.pops,`${r.pops} POPs`);
    if(r.transit) chk(S.transit.length>=r.transit,'a transit port');
    if(r.myIx) chk(Object.keys(S.myIx).length>=r.myIx,'your own IX');
    if(r.bizIsp) chk(S.biz.filter(b=>b.type==='isp').length>=r.bizIsp,`${r.bizIsp} ISP tenants`);
    if(r.site2) chk(Object.values(S.pops).filter(p=>p.site2).length>=r.site2,`${r.site2} second sites`);
    if(r.days) chk(S.day>=r.days,`${r.days} days of operation (day ${S.day})`);
    if(r.cash) chk(S.cash>=r.cash+u.cost,`${fmt$(r.cash+u.cost)} in the bank`);
    /* Licences arrive with M5. Until S.idLic exists the check is skipped and the step is still
       allowed, but the requirement is surfaced so the UI never pretends it was satisfied. */
    if(r.lic){
      if(typeof S.idLic==='undefined') pending.push(`${r.lic.join(', ')} licence (pending M5 licences)`);
      else for(const l of r.lic) chk(!!S.idLic[l],`the ${l} licence`);
    }
    return {...u, ok:!miss.length, missing:miss, pending, items};
  });
}
/* Brief 7 §4.1c: a NAP below its POP threshold still gets small ISP jobs, so the role can
   fund its way up. Every other gated role is blocked outright until it meets minPops. */
function roleBlockOffers(){const R=roleDef();if(!R.minPops)return false;if(Object.keys(S.pops).length>=R.minPops)return false;return S.role!=='nap';}
/* An offer is only real for this role: the right customer type, the role's POP threshold met,
   and (for RT/RW nets) a transit port already bought from another ISP. */
function popCap(){const R=roleDef();return R.maxPops||Infinity;}
/* Soft cap: the role's limit is a price signal, not a wall. Beyond it every extra POP
   costs POP_COST × overMul, so the role keeps its identity without making any goal
   structurally impossible. */
function popOverMul(){
  /* A puzzle or architect run is a fixed budget with no role to play: the soft footprint
     cap would quietly inflate its reference plans past the published budget. */
  if(S&&S.mode==='puzzle') return 1;
  const R=roleDef(), cap=R.maxPops;
  if(!cap) return 1;
  const n=Object.keys(S.pops).length;
  return n<cap ? 1 : 1+0.75*(n-cap+1);   // (cap+1)th POP → 1.75×, (cap+2)th → 2.5×, …
}
function canAddPop(){return true;}        // never blocks; the cap only raises the price
const BIZ_N=['Byte-Size Bakery','Hamster Wheel Power Co.','Llama Logistics','Cloud Nine Hosting','Rural Rabbit Broadband','Tiny Telco','Pixel Pirates Games','Moo-Moo Dairy Corp','Snack Overflow','Git Happens Ltd','Kernel Sanders Fried Code','Lag-Free Llamas','404 Bistro','Ping Pong Sports','Null Pointer Pets','Buffer Bloat Boats','Packet Pizza','Latency Lattes','Ctrl-Alt-Deli','Sudo Sandwiches','Cache Me Outside','Hertz So Good Radio','Jitterbug Dance Hall','Bit Barn Hosting','Fiber Optimists','The Daily Ping','Squirrel Mesh Wireless','Spam & Eggs Diner','Router Rooter Plumbing','Kilobyte Kebab','Gigglebit Studios','Uptime Funk Records','Ohm Sweet Ohm','Dial-Up Nostalgia Club','Two-Factor Tacos'];
/* Brief 18 §B: the same region switch for the generic pool. On the Indonesia map a prospect
   is a warung, a kampus or a minimarket — all parodies, never the real brand. */
const BIZ_N_IDN=['Mie Gacuan','Solariya','Kopi Kenongan','Bakso Pak Tebe','Ayam Geprek Juara','Martabak Kubang-ish','Nasi Goreng Gila','Es Teh Nusantara','Warung Padang Sederhana-ish','Roti Bakar Keju','Sate Taichan Srengseng','Kebab Turki Baba Rafi-ish','Minimarket Sejahtera','Apotek Kesehatan Rakyat','Bank Rakyat Digital','Klinik Gigi Keluarga','Salon Kecantikan Ayu','Bengkel Motor Jaya','Toko Bangunan Makmur','Laundry Kilat','Katering Ibu Rumah','SPBU Nusantara','Bimbel Cerdas Bangsa','Kampus Online Nusa','Ruang Belajar Kita'];
