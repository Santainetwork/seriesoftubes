// Everything that can fill up at a POP: transit ports, IX ports, PNIs, caches and the routers themselves.
const HOT=0.9,HOTL={t:'T',ix:'IX',p:'P',c:'C',r:'R'},HOTC={t:'#7B61FF',ix:'#FFD23F',p:'#2C7A7B',c:'#C8102E',r:'#FF4F9A'};
/* ---------- Reach report ----------
   Reach is the share of the world's traffic that can reach your network. When it is stuck below
   100%, this works out, per missing network, which exit should have carried it and what is
   actually in the way: an event, a peering policy, a missing port, or no exit at all. */
function reachReport(){
  const day=S.day,ev=S.ev||{},gaps=[];
  const depeer=ev.depeer>day||scnRule('spat'),leak=ev.leak&&ev.leak.until>day?ev.leak.net:null;
  const rpki=ev.rpki&&ev.rpki.until>day?new Set(ev.rpki.nets):null;
  const mine=Object.keys(S.pops),rem=remoteCities();
  const hasPop=c=>!!S.pops[c]&&!(S.pops[c].down>S.day);
  for(const n of NETS){
    if(R.reachable[n.id])continue;
    const share=NSH[n.id]||0,g={id:n.id,name:n.name,share,col:n.col,asn:n.asn,type:n.type};
    const until=d=>Math.max(0,d-day);
    // 1. Something you already pay for would carry it, but the route is filtered or the port is down.
    if(rpki&&rpki.has(n.id)){g.kind='wait';g.why='RPKI invalid: about half the internet is dropping your prefixes until the ROA is renewed.';g.eta=until(ev.rpki.until);g.fix='Wait it out, or fix the ROA now.';g.act='fixRpki';}
    else if(leak===n.id){g.kind='wait';g.why=`A route leak is black-holing ${n.name} over transit. Direct peering still works.`;g.eta=until(ev.leak.until);g.fix='Wait, or peer with them directly.';}
    else if(depeer&&n.id==='ggl'&&S.transit.some(t=>t.net==='cog')){g.kind='wait';g.why='Cogentle and Goggle are not speaking, so Cogentle transit cannot carry Goggle.';g.eta=until(ev.depeer);g.fix='Peer with Goggle directly, or buy a second upstream.';}
    else{
      // 2. A port you own that should carry it, but is down.
      const deadT=S.transit.find(t=>t.down>day&&((netOf(t.net)||{}).type==='t1'||(netOf(t.net)||{}).type==='t2'));
      const deadIx=Object.keys(S.ixp).find(c=>ev.ixdown&&ev.ixdown[c]>day&&ixMembers(c).includes(n.id));
      const deadP=S.pni.find(p=>p.net===n.id&&!hasPop(p.city));
      if(deadT||deadIx||deadP){g.kind='down';g.why=deadT?`${netName(deadT.net)} transit in ${CITY[deadT.city].name} is down.`:`${ixName(deadIx)} is down.`;g.fix='Rush the repair, or make sure a second exit can carry it.';}
      else{
        // 3. You are on an IX with them but have no session: policy, size or a snub.
        let best=null;
        for(const c of Object.keys(S.ixp)){const city=ixCity(c);if(!(hasPop(city)||rem.includes(city)))continue;if(!ixMembers(c).includes(n.id))continue;
          const chk=peerOk(n.id,'ix',c);const score=(chk.ok?0:1)*100+(chk.snub?20:0);if(!best||score<best.score)best={c,city,chk,score};}
        if(best){
          if(best.chk.ok){g.kind='session';g.why=`You are both on ${ixName(best.c)}, but the session is not up yet.`;g.fix='Request the session.';g.act='peer';g.city=best.c;}
          else if(best.chk.snub){g.kind='wait';g.why=best.chk.why;g.eta=Math.max(0,(snub(n.id,best.c)||{}).until-day||0);g.fix='They will reconsider; peer elsewhere meanwhile.';}
          else{g.kind='policy';g.why=best.chk.why;g.fix='Grow traffic, or take a PNI instead.';g.act='ix';g.city=best.c;}
        }else{
          // 4. An IX where you have (or could rent) a port lists them as a member.
          let ixPick=null;
          for(const c of mine){for(const x of ixIdsIn(c)){if(!ixMembers(x).includes(n.id))continue;if(!ixPick||(S.ixp[x]!==undefined&&S.ixp[ixPick]===undefined))ixPick=x;}}
          if(!ixPick&&n.ix==='ALL'){for(const c of mine){const x=ixIdsIn(c)[0];if(x&&(!ixPick||(S.ixp[x]!==undefined&&S.ixp[ixPick]===undefined)))ixPick=x;}}
          if(ixPick){g.kind='ix';g.why=`They are a member of ${ixName(ixPick)} in ${CITY[ixCity(ixPick)].name}, where you have no port.`;g.fix=S.ixp[ixPick]!==undefined?'Peer with them at the IX.':`Buy a port at ${ixName(ixPick)}.`;g.act=S.ixp[ixPick]!==undefined?'ix':'ixBuy';g.city=ixPick;}
          else{
            // 5. A PNI in a city you both share.
            const shared=n.pops.filter(c=>mine.includes(c));
            const pniC=shared.find(c=>peerOk(n.id,'pni',c).ok);
            // 6. Transit you could buy where you already have a POP.
            const trCity=mine.find(c=>NETS.some(x=>x.price&&x.pops.includes(c)));
            // 7. A cache you could host.
            const cacheOk=n.cache&&mine.length;
            if(pniC){g.kind='pni';g.why=`You both have a POP in ${CITY[pniC].name}, and they will take a PNI.`;g.fix='Order a private cross-connect.';g.act='pni';g.city=pniC;}
            else if(cacheOk){g.kind='cache';g.why=`${n.cache.name} is free once you send ${n.cache.min} Gbps to ${n.name}.`;g.fix='Request a cache box in one of your POPs.';g.act='cache';g.city=mine[0];}
            else if(trCity){g.kind='transit';g.why=`No exit reaches them from your network yet.`;g.fix=`Buy transit in ${CITY[trCity].name}.`;g.act='transit';g.city=trCity;}
            else if(n.pops.length){const c=n.pops.find(x=>!CITY[x].cn||cnOk())||n.pops[0];g.kind='pop';g.why=`They are only present in ${CITY[c].name}, and you have no POP there.`;g.fix=`Open a POP in ${CITY[c].name} and peer there.`;g.act='pop';g.city=c;}
            else{g.kind='none';g.why='No practical exit from your current footprint.';g.fix='Grow your footprint.';}
          }
        }
      }
    }
    gaps.push(g);
  }
  gaps.sort((a,b)=>b.share-a.share);
  return {reach:R.reach,gaps,missing:gaps.reduce((a,g)=>a+g.share,0)};
}
const REACH_KIND={wait:['Blocked right now','#FFAA1F'],down:['Port is down','#FF4D5E'],session:['Session not up','#2F8CFF'],policy:['They will not peer yet','#FF8A3D'],ix:['No IX port there','#7B61FF'],pni:['PNI available','#2C7A7B'],cache:['Cache available','#C8102E'],transit:['No transit to them','#9D4EDD'],pop:['No POP there','#55608A'],none:['Out of reach','#55608A']};
function reachHTML(){
  const rep=reachReport(),pctReach=clamp(rep.reach,0,1);
  const groups={};for(const g of rep.gaps)(groups[g.kind]=groups[g.kind]||[]).push(g);
  const order=Object.keys(groups).sort((a,b)=>groups[b].reduce((x,g)=>x+g.share,0)-groups[a].reduce((x,g)=>x+g.share,0));
  let h=`<div style="display:flex;align-items:center"><div><div class="eyebrow">Reach report</div><h2 style="font-size:26px">Who can't you reach?</h2></div><button class="x" data-act="closeModal" aria-label="Close">×</button></div>
  <p class="tagline" style="margin:8px 0 4px">Reach is the share of the world's traffic that has a working path to your network. Customers need <b>99%+</b> before they will sign, and Tier 1 needs all of it.</p>
  <div class="reachbar" role="img" aria-label="Reach ${pct(pctReach)}"><i style="width:${pctReach*100}%"></i><span class="mark"></span></div>
  <div class="kv"><span>Reachable now</span><b>${pct(pctReach)}</b></div>`;
  if(!rep.gaps.length){
    h+=`<p class="lead" style="margin-top:10px"><b>Everything is reachable.</b> Every network on the map has a working path from your POPs. Keep it that way: a cut cable or a de-peering can take a slice of the internet away in a single day.</p>`;
  }else{
    h+=`<p class="lead" style="margin-top:10px"><b>${rep.gaps.length} network${rep.gaps.length===1?'':'s'}</b> missing, worth ${pct(rep.missing)} of the world's traffic. Biggest first:</p>`;
    // One row per cause, biggest first: the shortest path from "stuck at 40%" to "everyone is reachable".
    h+=`<div class="panel2" style="margin:6px 0 4px"><h3 style="font-size:15px">Start here</h3>`;
    for(const k of order.slice(0,3)){
      const list=groups[k],[lab,col]=REACH_KIND[k]||['Missing','#55608A'];
      const share=list.reduce((a,g)=>a+g.share,0),first=list[0];
      const act=k==='transit'?btn('Buy transit','reachGo',{act:'transit',city:first.city},'pink sm')
        :k==='ix'||k==='ixBuy'?btn('Open peering','reachGo',{act:'ixBuy',city:first.city},'pink sm')
        :k==='session'?btn('Request','reachGo',{act:'peer',city:first.city,net:first.id},'pink sm')
        :k==='wait'?`<span class="tag st">wait${first.eta?` ~${first.eta}d`:''}</span>`
        :k==='pni'?btn('Order PNI','reachGo',{act:'pni',city:first.city},'pink sm')
        :k==='cache'?btn('Request cache','reachGo',{act:'cache',city:first.city},'pink sm')
        :k==='pop'?btn('Open POP','reachGo',{act:'pop',city:first.city},'pink sm')
        :'';
      h+=`<div class="reachrow"><span class="dot" style="background:${col};margin-top:4px"></span><div class="grow"><div class="nm">${lab} <span class="meta">${list.length} network${list.length===1?'':'s'} · ${pct(share)}</span></div><div class="meta">${esc(first.fix)}</div></div>${act}</div>`;
    }
    if(order.length>3)h+=`<p class="note">${order.length-3} smaller cause${order.length-3===1?'':'s'} below.</p>`;
    h+=`</div>`;
    for(const k of order){
      const list=groups[k],[lab,col]=REACH_KIND[k]||['Missing','#55608A'];
      h+=`<section><h3 style="font-size:16px"><span class="dot" style="background:${col}"></span>${lab} <span class="meta" style="font-weight:800">${list.length} · ${pct(list.reduce((a,g)=>a+g.share,0))}</span></h3>`;
      for(const g of list.slice(0,6)){
        h+=`<div class="reachrow">${logo(netOf(g.id)||{col:'#888'})}<div class="grow"><div class="nm">${esc(g.name)} <span class="meta">AS${g.asn} · ${pct(g.share)} of traffic</span></div><div class="why">${esc(g.why)}</div><div class="meta"><b>Do this:</b> ${esc(g.fix)}${g.eta?` · about ${g.eta} day${g.eta===1?'':'s'}`:''}</div></div>
        ${g.act==='fixRpki'?btn('Fix now','reachGo',{act:'fixRpki'},'pink sm'):g.act==='peer'?btn('Request','reachGo',{act:'peer',city:g.city,net:g.id},'pink sm'):g.act?btn('Open','reachGo',{act:g.act,city:g.city,net:g.id},'sm'):''}</div>`;
      }
      if(list.length>6)h+=`<p class="note">and ${list.length-6} more, each a sliver of traffic.</p>`;
      h+=`</section>`;
    }
  }
  h+=`<div class="btns" style="margin-top:10px">${btn('NOC dashboard','dash',{},'ghost')}${btn('Traceroute','trace',{},'ghost')}${btn('Close','closeModal',{},'ghost')}</div>`;
  return h;
}
function hotPorts(){const out=[];if(!R||!S)return out;
  for(const t of S.transit){if(t.down>S.day)continue;const cap=lagCap(PORT[t.tier].g,t.n),u=(R.useT[t.id]||0)/cap;if(u>=HOT)out.push({k:'t',city:t.city,lab:tr('hot_ports_and_rank.net_transit_lag',{net:NET[t.net].name,lag:lagName(t.tier,t.n)}),u,tip:tr('hot_ports_and_rank.add_a_lag_member_upgrade_the')});}
  for(const c in S.ixp){const cap=ixCap(c);if(!cap)continue;const u=(R.useIx[c]||0)/cap;if(u>=HOT)out.push({k:'ix',city:ixCity(c),lab:tr('common.port_port',{port:ixName(c)}),u,tip:tr('hot_ports_and_rank.upgrade_the_ix_port_or_add')});}
  for(const p of S.pni){if(!pniOn(p))continue;const cap=lagCap(pniG(p),p.n),u=(R.usePni[p.id]||0)/cap;if(u>=HOT)out.push({k:'p',city:p.city,lab:tr('common.pni_with_net',{net:NET[p.net].name}),u,tip:tr('hot_ports_and_rank.add_a_lag_member_or_upgrade')});}
  const cc={};for(const x of S.caches){const k=x.city+'|'+x.net;(cc[k]=cc[k]||{city:x.city,net:x.net,used:0,cap:0,n:0});cc[k].used+=R.useCache[x.id]||0;cc[k].cap+=cacheG(x);cc[k].n++;}
  for(const k in cc){const x=cc[k],u=x.used/x.cap;if(u>=HOT)out.push({k:'c',city:x.city,lab:x.n>1?tr('hot_ports_and_rank.name_caches',{name:NET[x.net].cache.name}):tr('common.name_cache',{name:NET[x.net].cache.name}),u,tip:tr('hot_ports_and_rank.ask_for_another_box_the_overflow')});}
  for(const c in S.pops){const cap=R.nodeCap[c];if(!cap)continue;const u=(R.nodeLoad[c]||0)/cap;if(u>=HOT)out.push({k:'r',city:c,lab:tr('common.routers'),u,tip:tr('hot_ports_and_rank.upgrade_the_router_or_add_a')});}
  return out.sort((a,b)=>b.u-a.u);}
function hotByCity(){const m={};for(const h of hotPorts())(m[h.city]=m[h.city]||{})[h.k]=Math.max((m[h.city]||{})[h.k]||0,h.u);return m;}
function isTier2(){return Object.keys(S.pops).length>=5&&Object.keys(S.ixp).length>=3&&R.sessions>=15;}
// Sparkly Seabone joined the Tier 1s in 1.12. Older saves keep the five they were playing for.
// Tier 1s added later only count for games started after them, so old saves keep their win (#155, #194).
const T1_SINCE={att:3,dtk:4,skl:2,tng:4};
const t1Need=()=>NETS.filter(n=>n.type==='t1'&&(!T1_SINCE[n.id]||(S&&S.t1v>=T1_SINCE[n.id])));
/* Reach is counted through customer cones (#85): a PNI with a Tier 1 reaches everyone who buys transit from it, and
   their customers. That only ever adds reach, so the rule is easier for every save, old ones included, and needs no
   version: what was Tier 1 stays Tier 1. Networks in nobody's cone still need peering of their own. */
function isTier1(){return t1Need().every(n=>S.pni.some(p=>p.net===n.id&&pniOn(p)))&&S.transit.length===0&&R.reach>0.999;}
// What you are now, not what you once were (#46): buying transit again or losing reach drops the label.
function tierLabel(){return S.won&&isTier1()?'Tier 1':isTier2()?'Tier 2':'Tier 3';}
function t1Why(){if(S.transit.length)return tr('hot_ports_and_rank.you_buy_transit_again');const miss=t1Need().filter(n=>!S.pni.some(p=>p.net===n.id&&pniOn(p)));if(miss.length)return tr('hot_ports_and_rank.no_pni_with_list',{list:miss.map(n=>n.name).join(', ')});{const lost=NETS.filter(n=>!R.reachable[n.id]).sort((a,b)=>NSH[b.id]-NSH[a.id]);if(lost.length)return tr('hot_ports_and_rank.you_cannot_reach_list_outside_cones',{list:lost.slice(0,3).map(n=>n.name).join(', ')+(lost.length>3?' '+tr('hot_ports_and_rank.and_n_more',{n:lost.length-3}):'')});}return tr('hot_ports_and_rank.your_reach_is_p_not_100',{p:reachPct(R.reach)});}

