function newGame(name,home,region,role){
  role=ROLES[role]?role:'isp';
  /* Brief 3 §4: SEA starts with 300k USD (1.5× Global) and IDN with 250k USD. Brief 6 §3.1 moves
     those numbers into REGION.*.roles so every role has a region-aware starting cash; Global
     keeps the brief-5 table (roles:null). */
  const rr=REGION[region||curRegion],rov=rr&&rr.roles&&rr.roles[role];
  const startCash=(rov&&rov.cash)||ROLES[role].cash;
  S={v:1,name,region:region||curRegion,role,roleUp:null,unlocked:{},asn:200000+Math.floor(_rand()*15000),home,day:0,cash:startCash,
    ltv:2,t1v:4,auV:1,calV:1,ops:opsNew(),achP:{},seen:NETS.map(n=>n.id),spares:{},pops:{[home]:{day:0,bb:null,boost:0,down:0,routers:1,gen:false}},links:[],nni:[],transit:[],ixp:{},rs:{},peers:{},pni:[],caches:[],biz:[],offers:[],myIx:{},promo:{},pairMet:{},
    done:{},inc:[],fleet:{},ev:{ddosMore:[]},ddosStarts:[],priceMul:1,nextFail:45,nextEvent:40,usedNames:[],stats:{survived:0,incidents:0,peak:0,peakL2:0,offersSeen:0},cnLic:{state:'none'},scrubs:[],scrubMode:'always',ddosAuto:{rtbh:false,scrub:true},scrubAt:null,capDeal:null,core:{lv:0,run:0},popStd:null,won:false,lost:false,neg:0,loans:[],loanOffers:[],loanStrikes:0,ppol:'open',pdesk:null,pdeskRep:null,hw:{},rules:makeRules('oncall'),charter:'global',chartSet:false,demo:{},seatOff:null,solWon:0,monkey:{next:null,on:0}};
}
