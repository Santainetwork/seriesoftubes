/* ================= HELPERS ================= */
function curInfo(){
  const r=REGION[curRegion]&&REGION[curRegion].rules;
  return (r&&r.currency)||{code:'USD',symbol:'$',rate:1,dec:0};
}
/* Indonesian grouping: dot every three digits, comma for decimals. 324000 -> "324.000" */
function fmtNum(n){
  const r=Math.round(n*100)/100;
  const [ip,fp]=r.toFixed(r%1===0?0:2).split('.');
  const g=ip.replace(/\B(?=(\d{3})+(?!\d))/g,'.');
  return fp?g+','+fp:g;
}
/* Money is displayed in the region's own currency. Internally every number stays in dollars,
   so the economy, the balance sheet and the save format do not change — only the label and
   the scale the player reads. */
function fmt$(v){
  /* Two display conventions live here. Rupiah is quoted in thousands with a K suffix
     (brief 18 §L): "Rp 1.000,00 K" is one million rupiah. Every other region uses upstream's
     compact dollar form ($8.0k, $1.2M), which the bank and the goal cards expect. Stored
     numbers are always dollars either way — only the label changes. */
  const c=curInfo(),sg=v<0?'-':'';
  if(c.code==='IDR')return sg+'Rp '+fmtNum(Math.abs(v)*c.rate/1000)+' K';
  const a=Math.abs(v);
  if(a>=1e6)return sg+'$'+(a/1e6).toFixed(a>=1e7?1:2)+'M';
  if(a>=1e3)return sg+'$'+(a/1e3).toFixed(a>=1e5?0:1)+'k';
  return sg+'$'+Math.round(a);
}
const fmtG=g=>g>=1000?(g/1000).toFixed(g>=10000?1:2)+' Tbps':(g>=100?g.toFixed(0):g.toFixed(1))+' Gbps';
const pct=x=>Math.round(x*100)+'%';
// Reach never rounds up to 100%: Tier 1 needs more than 99.9%, and 99.6% must not look like a full house (#73).
const reachPct=x=>x>0.999?'100%':x>=0.99?(Math.floor(x*1000)/10).toFixed(1)+'%':pct(x);
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const pick=a=>a[Math.floor(Math.random()*a.length)];
// Names already given to customers, each once: only whether a name is in the list counts. Once every name had been
// used, the same names were added again every day (half a million entries, half of a late-game save).
const useName=n=>{if(!S.usedNames.includes(n))S.usedNames.push(n);};
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
/* A real calendar (#257): months of 28 to 31 days and Gregorian leap years, counted from Y1 (Y4 is a leap year,
   Y100 is not). Day 0 is 1 January Y1. Monthly prices are per calendar month. */
const leapY=y=>y%4===0&&(y%100!==0||y%400===0),MDAYS=[31,28,31,30,31,30,31,31,30,31,30,31],monDays=(y,m)=>m===1&&leapY(y)?29:MDAYS[m];
const yearStart=y=>{const n=y-1;return n*365+Math.floor(n/4)-Math.floor(n/100)+Math.floor(n/400);};
function cal(d){d=Math.max(0,Math.floor(d)||0);let y=1+Math.floor(d/365.2425);while(y>1&&yearStart(y)>d)y--;while(yearStart(y+1)<=d)y++;
  let r=d-yearStart(y),m=0;while(r>=monDays(y,m)){r-=monDays(y,m);m++;}return {y,m,d:r+1};}
const dayOf=(y,m,dd)=>{let n=yearStart(y);for(let i=0;i<m;i++)n+=monDays(y,i);return n+dd-1;};
// Months since the start, to tell one calendar month from the next; and the length of the month d is in.
const monthIdx=d=>{const c=cal(d);return (c.y-1)*12+c.m;},monLen=d=>{const c=cal(d);return monDays(c.y,c.m);};
// A monthly date that started on day s: the same day of the month, or the month's last day when it is shorter.
const monthiversary=(s,d)=>{if(d<=s)return false;const a=cal(s),b=cal(d);return b.d===Math.min(a.d,monDays(b.y,b.m));};
function dateStr(d){const c=cal(d);return tr('helpers.y_y_mon_d',{y:c.y,mon:MONTHS[c.m],d:c.d});}
function wrapDx(a,b){if(!WRAPX)return b-a;let dx=b-a;if(dx>W/2)dx-=W;if(dx<-W/2)dx+=W;return dx;}
function kmBetween(a,b){const A=CITY[a],B=CITY[b];return Math.max(20,Math.round(hav(A.lon,A.lat,B.lon,B.lat)));}
// Cities on a land bridge belong to two landmasses: Cairo reaches Asia overland across the Sinai, the way
// Istanbul does across the Bosporus (#47). Overland between continents still costs the intercontinental price.
const lands=C=>C.land2?[C.land,C.land2]:[C.land];
const isSub=(a,b)=>{const A=lands(CITY[a]),B=lands(CITY[b]);return !A.some(x=>B.includes(x));};
const popUp=c=>S.pops[c]&&!(S.pops[c].down>S.day);
const regionsCount=()=>new Set(Object.keys(S.pops).map(c=>CITY[c].reg)).size;
/* The most continents any player could ever reach on the current map: the gate ceiling. */
const mapRegionsCount=()=>new Set(CITIES.map(c=>c.reg)).size;
/* What the current map can actually supply, measured once per region. A goal or badge that asks
   for something here that the map does not have can never complete, so it is not shown at all:
   a goal you can never claim is worse than an absent one, because the player stops trusting the
   panel. Cached because goalsFor()/badgesFor() run on every render and every day tick. */
let MAPCAP=null;
function mapCap(){
  if(MAPCAP&&MAPCAP.region===curRegion)return MAPCAP;
  const ids=new Set(CITIES.map(c=>c.id));
  MAPCAP={region:curRegion,
    cities:CITIES.length,
    citySet:ids,
    cableSet:new Set(CABLES.map(c=>c.id)),
    regions:new Set(CITIES.map(c=>c.reg)).size,
    ix:CITIES.filter(c=>c.ix).length,
    campuses:new Set(MEGA.filter(m=>ids.has(m.c)).map(m=>m.c)).size,
    cn:CITIES.some(c=>c.cn),
    uae:CITIES.filter(c=>c.uae).length,
    andes:new Set(CITIES.filter(c=>c.andes).map(c=>c.andes)).size,
    /* Every DE-KICKS exchange present, not just some: the badge is all six. */
    dk:DK_CITIES.every(c=>CITY[c]&&CITY[c].ix)};
  return MAPCAP;
}
/* Read a `needs` declaration against the map. Unknown keys are ignored on purpose: a typo in a
   declaration must not silently hide a goal that does work, and the test below pins the keys. */
function mapHas(n){
  const c=mapCap();
  if(n.regions!=null&&c.regions<n.regions)return false;
  if(n.pops!=null&&c.cities<n.pops)return false;
  if(n.cities&&!n.cities.every(x=>c.citySet.has(x)))return false;
  if(n.cables&&!n.cables.every(x=>c.cableSet.has(x)))return false;
  if(n.nets&&!n.nets.every(x=>!!NET[x]))return false;
  if(n.ix!=null&&c.ix<n.ix)return false;
  if(n.campuses!=null&&c.campuses<n.campuses)return false;
  if(n.cn&&!c.cn)return false;
  if(n.uae!=null&&c.uae<n.uae)return false;
  if(n.andes!=null&&c.andes<n.andes)return false;
  if(n.dk&&!c.dk)return false;
  return true;
}
/* Something already earned stays on the wall even if this map cannot offer it again. */
const goalShown=g=>!g.needs||mapHas(g.needs);
const badgeShown=b=>!b.needs||mapHas(b.needs);
/* What the badge wall draws: everything this map can offer, plus anything already earned here or
   on this device, so switching maps never looks like the game lost a badge. `h` is passed in
   because badgeGrid() already has the hall of fame and this runs once per badge. */
const badgeList=h=>BADGES.filter(b=>badgeShown(b)||(S&&S.ach&&S.ach[b.id]!==undefined)||!!(h&&h[b.id]));
const ixCity=x=>String(x).split('~')[0];
function ixIdsIn(c){const o=ixStatic(c);if(S&&S.myIx&&S.myIx[c]&&!o.includes(c))o.unshift(c);return o;}
const hasIxAt=c=>ixIdsIn(c).some(x=>S.ixp[x]!==undefined);
function ixName(c){if(XIXM[c])return XIXM[c].name;return S.myIx[c]?S.myIx[c].name:CITY[c].ix;}
// IX.brrr Campinas already says where it is, so messages skip "in Campinas" (#134)
const ixNamesCity=c=>String(ixName(c)||'').toLowerCase().includes(CITY[ixCity(c)].name.toLowerCase());
/* Brief 18 §G: on the Indonesia map only the domestic carriers sell transit. The global Tier 1s
   and Tier 2s are peering partners there, not suppliers — you peer with them at an exchange. */
function sellsTransit(n){return curRegion==='idn'?!!n.transitOnly:!!n.price;}
/* Brief 18 §G: on the Indonesia map the global Tier 1s and Tier 2s peer at every local exchange.
   They are not for sale there — you cannot buy transit from "Not That Telecom" in Jakarta — but
   you can peer with them, which is exactly what makes a real NAP a NAP. */
function idnPeers(){return NETS.filter(n=>!n.transitOnly&&(n.type==='t1'||n.type==='t2'));}
