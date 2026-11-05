/* ---------- conference season ---------- */
/* Brief 10 §2.1: each region gets its own event calendar. Global's entries are an invariant
   (CONFS_GLOBAL) and are never mutated; applyRegion() rebinds CONFS. */
const CONFS_GLOBAL=[{n:'PTC',c:'hnl',m:0,cap:1},{n:'NANOG',c:'chi',m:1},{n:'APRICOT',c:'sin',m:1},{n:'Peering Days',c:'waw',m:2},{n:'DKNOG',c:'cph',m:2,j:N_('conferences.the_hallway_track_moved_to_a')},{n:'UKNOF',c:'lon',m:3},{n:'MENOG',c:'dxb',m:3},{n:'NZNOG',c:'akl',m:3},{n:'RIPE',c:'ams',m:4},{n:'NANOG',c:'sea',m:5},{n:'IX Forum',c:'tok',m:6},{n:'AfPIF',c:'nbo',m:7},{n:'AusNOG',c:'syd',m:8},{n:'NLNOG Day',c:'ams',m:8},{n:'LACNOG',c:'sao',m:9},{n:'NANOG',c:'ash',m:9},{n:'Capacity Europe',c:'lon',m:9,cap:1},{n:'DENOG',c:'fra',m:10},{n:'RIPE',c:'ber',m:10},{n:'PTT Forum',c:'sao',m:11},{n:'PacNOG',c:'suv',m:11}];
/* The regional calendars are parodies — no real NOG, APRICOT or APJII spelling appears here. */
const CONFS_SEA=[
 {n:'APRICOT-ish',  c:'sin', m:1},
 {n:'SANOG-ish',    c:'kul', m:3},
 {n:'PHNOGG',       c:'mnl', m:5},
 {n:'ThaiNOGG',     c:'bkk', m:6},
 {n:'VNNIC-ish',    c:'sgn', m:8},
 {n:'MyNOGG',       c:'kul', m:9},
 {n:'TWNOGG',       c:'tpe', m:10},
];
const CONFS_IDN=[
 {n:'Telko Nusantara', c:'mdn', m:2},
 {n:'APJII Conneck',   c:'jkt', m:3},
 {n:'Netsafe Roadshow',c:'smg', m:4},
 {n:'Kopidarat',       c:'bdg', m:5},
 {n:'Rack Party',      c:'btm', m:6},
 {n:'IDNOGG',          c:'jkt', m:7},
 {n:'Cyber Sekuriti',  c:'jog', m:8},
 {n:'IIX-Change',      c:'sby', m:9},
 {n:'Startup Bangsa',  c:'dps', m:10},
 {n:'Peering Nusantara',c:'jkt', m:11},
 /* Every province hosts something. Before this, ten conferences sat in eight cities and the
    other twenty-six never generated a single prospect, so a player who built outside Java
    could never use conference lead-gen at all. One per city, spread across the calendar so
    there is always something within reach. Names are deliberately not real events. */
 {n:'Sriwijaya Peering Forum', c:'plm', m:1},
 {n:'Celebes Interconnect',    c:'upg', m:2},
 {n:'Banjarmasin NetOps',      c:'bjm', m:3},
 {n:'Balikpapan Fibre Meet',   c:'bpn', m:4},
 {n:'Minahasa Broadband Day',  c:'mdc', m:5},
 {n:'Riau Digital Summit',     c:'pku', m:6},
 {n:'Kapuas Network Forum',    c:'pnk', m:7},
 {n:'Cenderawasih Peering',    c:'jay', m:8},
 {n:'Lampung Last Mile',       c:'tkg', m:9},
 {n:'Andalas NetConf',         c:'pdg', m:10},
 {n:'Serambi Internet Forum',  c:'btj', m:11},
 {n:'Batanghari Digital',      c:'djb', m:12},
 {n:'Rafflesia Network Day',   c:'bks', m:1},
 {n:'Kahayan Broadband',       c:'pky', m:2},
 {n:'Mahakam Interconnect',    c:'sri', m:3},
 {n:'Bintan Peering Meet',     c:'tnj', m:4},
 {n:'Timor NetOps Forum',      c:'koe', m:5},
 {n:'Lombok Interconnect',     c:'ami', m:6},
 {n:'Kendari Fibre Day',       c:'kdi', m:7},
 {n:'Palu Valley Network',     c:'plw', m:8},
 {n:'Maluku Peering Forum',    c:'amb', m:9},
 {n:'Ternate Digital Summit',  c:'ttn', m:10},
 {n:'Cendrawasih NetOps',      c:'soq', m:11},
 {n:'Batik NetForum',          c:'soc', m:12},
 {n:'Malang Broadband Day',    c:'mlg', m:1},
 {n:'Selat Peering Exchange',  c:'sin', m:7},
];
let CONFS=CONFS_GLOBAL;
const CONF_COST=8000,CONF_DAYS=45;
/* Brief 13: active B2B tenant acquisition for NAP/hosting. Separate from ACT.ad (broadband):
   a longer sales cycle, a longer campaign, and a hard cap on how many cities run at once. */
const PROMO_COST=12000,PROMO_DAYS=45,PROMO_MULT=3;
/* Brief 10 §2.4: CONF_COST itself is the Global invariant; NAP and hosting send more
   people (and a booth), so they pay a multiple at the point of registration. */
const confRoleMul=()=>S.role==='nap'?4:S.role==='hosting'?2:1;
// Sponsoring (#168) puts your logo on the lanyards: more customers call from that region while the glow lasts.
// Only some meetings sell sponsorships, the same ones every time you look. Capacity conferences are where carriers buy in bulk.
const CONF_SP=40000,CAP_COST=30000,CAP_LV=3;
const confSp=cf=>!cf.cap&&[...cf.key].reduce((a,ch)=>(a*31+ch.charCodeAt(0))>>>0,7)%3!==0;
const confCost=cf=>cf&&cf.cap?CAP_COST:CONF_COST*confRoleMul();
const confDay=(cf,y)=>dayOf(y+1,cf.m,10);
function confKey(cf,y){return cf.n+'@'+cf.c+'@'+y;}
// No conference season in Best Effort: nothing to register for, nothing in the panel, no invitations.
function upcomingConfs(within){if(!confsOn())return [];const y0=cal(S.day).y-1,out=[];for(const y of [y0,y0+1])for(const cf of CONFS){if(!CITY[cf.c])continue;const d=confDay(cf,y);if(d>=S.day&&d-S.day<=within)out.push({...cf,day:d,key:confKey(cf,y)});}return out.sort((a,b)=>a.day-b.day);}
function confBoost(id){const cb=S.conf;if(!cb||!(cb.until>S.day))return 1;const n=NET[id];return n&&n.pops.some(c=>CITY[c]&&CITY[c].reg===cb.reg)?0.5:1;}
function confTick(d){S.confReg=S.confReg||{};
  for(const cf of upcomingConfs(30)){if(cf.day-d===30&&!S.confReg[cf.key])toast(tr('conferences.conf_comes_to_city_in_30',{conf:esc(cf.n),city:esc(CITY[cf.c].name)}),'goal',[{l:tr('common.show_me'),act:'leftTab',args:{t:'deals'}}]);}
  for(const cf of upcomingConfs(0)){if(cf.day!==d||!S.confReg[cf.key])continue;const reg=CITY[cf.c].reg,sp=S.confReg[cf.key]==='sp';S.conf={until:d+CONF_DAYS,reg,name:cf.n,sp};S.stats.confs=(S.stats.confs||0)+1;if(sp)S.stats.confSp=(S.stats.confSp||0)+1;
    if(cf.cap)S.capDeal={at:d+4+Math.floor(Math.random()*5),c:cf.c};
    const r=Math.random();let extra='';if(r<0.3){const cash=5000+Math.floor(Math.random()*4)*5000;S.cash+=cash;extra=' '+tr('conferences.you_also_won_the_raffle_cash',{cash:fmt$(cash)});}else if(r<0.5)extra=' '+tr('conferences.someone_from_goggle_bought_you_a');if(cf.j)extra=' '+tr(cf.j)+(r<0.3?extra:'');
    toast(tr('conferences.conf_in_city_you_shook_a',{conf:esc(cf.n),city:esc(CITY[cf.c].name),n:CONF_DAYS,region:esc(REG[reg])})+(sp?' '+tr('conferences.your_logo_was_on_every_lanyard',{region:esc(REG[reg])}):'')+(cf.cap?' '+tr('conferences.carriers_took_your_card_expect_big'):'')+extra,'goal');sfx('coin');
    /* The prospect only exists if you show up. No registration, no lead — a ticket you never
       use buys nothing. And showing up is not a guarantee either: 1 in 4 trips ends with an
       empty notebook, because that is what conferences are really like. Paid at the door means
       the fuse counts from today, same as before. Do not pause here: this is good news and a
       routine pipeline event, not an outage. */
    if(Math.random()<0.75)eventDeals(cf);}
  capDealTick(d);}
function eventBizName(){
  return pick(['Hallway Track Ltd','Badge Scanner Co','Lanyard Logistics','Booth Babe Broadband',
    'Keynote Cloud','Coffee Break Carrier','Swag Bag Networks','Panel Session Systems',
    'Afterparty Fibre','Name Tag Telecom']);
}
function eventDealOffer(cf,t,premLo,premSpan){
  const T=BIZ_T[t];if(!T)return;
  const bw=pick(T.opts.slice(0,3));             // small-to-mid: event deals are pilots
  const rate=Math.round(T.rate*(premLo+Math.random()*premSpan)); // in town premium
  S.offers.push({id:uid(),city:cf.c,city2:null,name:eventBizName(),type:t,bw,rate,
    reqs:['metro'],exp:S.day+14,fromEvent:cf.n});
  toast(`<b>${esc(cf.n)}: a lead.</b><br>${esc(S.offers[S.offers.length-1].name)} needs ${bw}G of ${esc(BIZ_T[t].l||t)} in ${esc(CITY[cf.c].name)}. They fly home in 14 days.`,'goal',[{l:'See the deal',act:'leftTab',args:{t:'deals'}}]);
}
function napEventDeals(cf){
  const city=cf.c;
  if(!S.pops[city])return;                      // no POP, no deal
  const t=pick(['isp','hyper','ai'].filter(x=>roleAllowsType(x)&&typeAtLevel(x)));
  if(!t)return;
  eventDealOffer(cf,t,1.4,0.6);                 // 40–100% premium: they are in town
}
/* Attending a conference always produces a lead in the host city. Whether you can sign it
   today depends on having a POP there — but the lead exists either way. That is the point
   of going: you come home with a name, not a brochure. */
function eventDeals(cf){
  let t;
  if(S.role==='nap')          t=pick(['isp','hyper','ai'].filter(x=>roleAllowsType(x)&&typeAtLevel(x)));
  else if(S.role==='hosting') t=pick(['host','gpu'].filter(x=>roleAllowsType(x)&&typeAtLevel(x)));
  else if(S.role==='isp')     t=pick(['dia','stream','edu'].filter(x=>roleAllowsType(x)&&typeAtLevel(x)));
  else return;                   // RT/RW nets are too small for a conference lead (brief 10)
  if(!t)return;
  const prem=S.role==='nap'?1.4:S.role==='hosting'?1.3:1.2;
  const span=S.role==='nap'?0.6:S.role==='hosting'?0:0.2;
  eventDealOffer(cf,t,prem,span);
}
function confSection(){const up=upcomingConfs(75).slice(0,3),cb=S.conf&&S.conf.until>S.day?S.conf:null;if(!up.length&&!cb)return '';
  return `<h3 style="font-size:15px;margin:10px 0 4px">${tr('common.conferences')}</h3>${cb?`<div class="inc" style="background:#EAF7EE"><div class="nm">${tr('conferences.name_glow_n_days_left',{name:esc(cb.name),n:cb.until-S.day})}</div><div class="meta">${tr('conferences.selective_networks_in_region_need',{region:esc(REG[cb.reg])})}${cb.sp?' '+tr('conferences.as_a_sponsor_you_also_get',{region:esc(REG[cb.reg])}):''}</div></div>`:''}${up.map(confRow).join('')}`;}
function confRow(cf){const reg=S.confReg&&S.confReg[cf.key],open=cf.day>S.day,sp=confSp(cf),cost=confCost(cf),lk=cf.cap&&lvl()<CAP_LV;
  const tags=(reg==='sp'?'<span class="tag st on">'+tr('conferences.sponsor')+'</span>':reg?'<span class="tag st on">'+tr('common.registered')+'</span>':open?'':'<span class="tag st">'+tr('common.registration_closed')+'</span>');
  const btns=!open||reg==='sp'?'':(reg?'':lk?btn(tr('sites_and_service.level_n',{n:CAP_LV}),'confGo',{key:cf.key},'sm',true):btn(tr('conferences.attend_cost',{cost:fmt$(cost)}),'confGo',{key:cf.key},'sm',S.cash<cost))+(sp?btn(tr('conferences.sponsor_cost',{cost:fmt$(CONF_SP-(reg?cost:0))}),'confSponsor',{key:cf.key},'pink sm',S.cash<CONF_SP-(reg?cost:0)):'');
  return `<div class="row"><div class="grow"><div class="nm">${esc(cf.n)} · ${esc(CITY[cf.c].name)}</div><div class="meta">${cf.day===S.day?tr('common.today'):tr('conferences.in_n_days',{n:cf.day-S.day})} · ${esc(REG[CITY[cf.c].reg])}${cf.cap?' · '+tr('conferences.capacity_conference_carriers_buy_in'):sp&&open&&reg!=='sp'?' · '+tr('conferences.sponsorships_available'):''}</div></div>${tags}${btns?`<div class="btns">${btns}</div>`:''}</div>`;}
