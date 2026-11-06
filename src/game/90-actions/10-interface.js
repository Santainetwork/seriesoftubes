/* ================= ACTIONS ================= */
function spend(c){if(S.cash<c){toast(tr('interface.not_enough_cash_wait_for_revenue'),'bad');sfx('err');return false;}S.cash-=c;sfx('build');return true;}
const ACT={
 linkCheck:({id})=>{const l=S.links.find(x=>x.id===id);if(!l||linkDown(l))return;linkCheckModal(l);},
 speed:({v})=>{v=+v;if(pzOn())return;if(![0,0.5,1,2,4,8].includes(v)||(S&&!rule('clock')&&v))return;if(v)UI.lastSpeed=v;UI.speed=v;renderHUD();},
 help:()=>showHelp(),
 dash:()=>{if(!S||pzOn())return;const d=$('dash');d.hidden=!d.hidden;if(!d.hidden)renderDash();},
 reach:()=>{if(!S)return;openModal(reachHTML());},
 reachGo:({act,city,net})=>{
   if(act==='fixRpki'){const i=S.inc.find(x=>x.type==='rpki'||x.type==='hijack');if(i&&i.cost>0){ACT.fixInc({id:i.id});if(S.inc.includes(i))return;}else{toast('<b>Nothing to fix right now.</b><br>Reach recovers when the incident clears.','goal');return;}closeModal();return;}
   if(act==='peer'){ACT.peer({city,net});closeModal();selectCity(ixCity(city));UI.tab='peer';renderPanel();return;}
   if(act==='transit'){ACT.focusCity({city});UI.tab='up';renderPanel();closeModal();return;}
   if(act==='pop'){ACT.focusCity({city});closeModal();return;}
   if(act==='ix'||act==='ixBuy'){ACT.focusCity({city:ixCity(city)});UI.tab='peer';renderPanel();closeModal();return;}
   if(act==='pni'||act==='cache'){ACT.focusCity({city});UI.tab='peer';renderPanel();closeModal();return;}
   closeModal();
 },
 dashClose:()=>{$('dash').hidden=true;},
 dashTab:({k})=>{if(!DTABS.includes(k))return;UI.dtab=k;renderDash();const d=$('dash');if(d)d.scrollTop=0;},
 listMore:({k})=>{if(k!=='conn'&&k!=='cust')return;UI.listN=UI.listN||{};UI.listN[k]=listN(k)+LIST_PAGE;renderDash();},
 dashSort:({k})=>{if(!['name','asn','type','traffic','cost','lost'].includes(k))return;if(UI.dashSort===k)UI.dashDir=-(UI.dashDir||-1);else{UI.dashSort=k;UI.dashDir=k==='name'||k==='type'||k==='asn'?1:-1;}renderDash();},
 bank:()=>{if(!S||pzOn())return;UI.confirm=null;$('dash').hidden=true;const b=$('bankBox');b.hidden=false;UI._bh=null;renderBank();},
 bankClose:()=>{UI.confirm=null;$('bankBox').hidden=true;},
 takeLoan:({id})=>{const o=S.loanOffers.find(x=>x.id===id);if(!o)return;S.stats.loans=(S.stats.loans||0)+1;const B=BANKS[o.bank];let got=o.amount,note='';
   if(B.crypto){const f=0.55+Math.random()*0.8;got=Math.round(o.amount*f);note=' '+(f>=1?tr('interface.tubecoin_moved_up_p_on_the',{p:Math.round(Math.abs(f-1)*100)}):tr('interface.tubecoin_moved_down_p_on_the',{p:Math.round(Math.abs(f-1)*100)}));}
   S.cash+=got;S.loanOffers=S.loanOffers.filter(x=>x!==o);
   S.loans.push({id:o.id,bank:o.bank,start:S.day,amount:o.amount,got,bal:o.model==='transit'?o.owe:o.amount,apr:o.apr||0,apr0:o.apr||0,pay:o.pay||0,left:o.term||0,term:o.term||0,share:o.share||0,model:o.model,cut:o.cut,covs:o.covs,base:{sub:S.links.filter(x=>x.sub).length}});
   track('loan_taken');toast(`<b>${tr('interface.amt_from_bank_has_landed',{amt:fmt$(got),bank:esc(B.name)})}</b><br>${B.equity?tr('interface.they_now_own_p_of_your',{p:pct(o.share)}):loanSummary(o)}${note}`,'good');sfx('coin');after();renderBank();},
 declineLoan:({id})=>{S.loanOffers=S.loanOffers.filter(x=>x.id!==id);sfx('click');renderBank();renderHUD();save();},
 repayLoan:({id})=>{const l=S.loans.find(x=>x.id===id);if(!l)return;const B=BANKS[l.bank];const cost=repayCost(l,B);
   if(UI.confirm!==id){UI.confirm=id;renderBank();return;}UI.confirm=null;if(!spend(cost)){renderBank();return;}S.loans=S.loans.filter(x=>x!==l);track('loan_repaid');
   toast(B.equity?tr('interface.you_bought_out_bank_they_flew',{bank:esc(B.name)}):tr('interface.loan_from_bank_repaid_early',{bank:esc(B.name)}),'good');after();renderBank();},
 leaseSwap:({a,b,src})=>{if(!S.pops[a]||!S.pops[b]||a===b)return;$('dash').hidden=true;UI.lmode='df';UI.dfSrc=['lease','build','cable'].includes(src)?src:isSub(a,b)?'cable':'build';UI.dfSys=lvl()>=3?'roadm':'lite';openLinkModal(a,b);},
 dashLink:({id})=>{$('dash').hidden=true;selectLink(id);focusLink(id);},
 animSet:({v})=>{if(!['auto','on','off'].includes(v))return;UI.anim=v;try{localStorage.setItem('sot-anim',v);}catch(e){}applyAnim();refreshSettings();},
 soundSet:({v})=>{UI.muted=v==='off';try{localStorage.setItem('sot-mute',UI.muted?'1':'0');}catch(e){}renderHUD();refreshSettings();},
 langSet:({v})=>{if(!Object.hasOwn(LANGS,v)||v===LANG)return;try{localStorage.setItem('sot-lang',v);}catch(e){}save(true);location.reload();},
 mute:()=>{UI.muted=!UI.muted;try{localStorage.setItem('sot-mute',UI.muted?'1':'0');}catch(e){}renderHUD();},
 closePanel:()=>{UI.sel=null;UI.confirm=null;renderPanel();renderLeft();},
 closeModal:()=>closeModal(),
 /* Brief 6 §2.2: climb one rung. All validation and payment happen before S.role changes, and
    nothing in S.pops/links/transit/pni/caches/biz is touched — the network comes with you. */
 roleUp:({to,sure})=>{
   const off=roleUpOffer().find(o=>o.to===to);
   if(!off||!off.ok) return;
   if(!sure){openModal(`<h2>Become a ${esc(ROLES[to].l)}?</h2><p class="tagline">${esc(off.why)}</p>
     <p class="meta">You keep every POP, link, peer and customer. Only the rules change: ${esc(ROLES[to].blurb)}</p>
     ${(off.pending||[]).length?`<p class="meta"><b>Note:</b> ${esc(off.pending.join(' · '))} — not enforced yet.</p>`:''}
     <div class="btns">${btn('Do it','roleUp',{to,sure:1},'pink big')}${btn('Not yet','closeModal',{},'ghost big')}</div>`);return;}
   if(!spend(off.cost)) return;
   const from=S.role; S.role=to; S.roleUp={from,to,day:S.day};
   toast(`<b>You are a ${esc(ROLES[to].l)} now.</b><br>${esc(ROLES[to].blurb)}`,'goal'); sfx('coin');
   track('role_up_'+from+'_'+to); after(); closeModal();
 },
 tab:({t})=>{UI.tab=t;UI.confirm=null;renderPanel();},
 /* Brief 8 §2.2: pay the cross-connect. The city, its island and its cables are already on
    the map (34th city) — the unlock only lifts the build gate. */
 unlockCity:({city,sure})=>{
   const o=unlockOffer(city);
   if(!o||!o.ok||o.done) return;
   if(!sure){openModal(`<h2>Unlock ${esc(UNLOCK_CITIES[city]?UNLOCK_CITIES[city].name:city)}?</h2><p class="tagline">${esc(o.why)}</p>
     <div class="btns">${btn('Pay '+esc(fmt$(o.cost)),'unlockCity',{city,sure:1},'pink big')}${btn('Not yet','closeModal',{},'ghost big')}</div>`);return;}
   if(!spend(o.cost)) return;
   S.unlocked=S.unlocked||{};S.unlocked[city]=S.day;
   toast(`<b>${esc(CITY[city].name)} is open.</b><br>You can build a POP there now.`,'goal');
   sfx('coin'); after(); closeModal();
 },
 leftTab:({t})=>{UI.left=t;UI.leftOpen=true;renderLeft();},
 netFocus:({id})=>{if(!NET[id])return;$('dash').hidden=true;UI.netFocus=id;UI.nf='all';UI.left='nets';UI.leftOpen=true;UI.sel=null;renderPanel();renderLeft();const b=$('leftBody');if(b)b.scrollTop=0;},
 netFilter:({f})=>{UI.nf=f==='out'?'out':'all';listReset('nets');UI.netFocus=null;$('dash').hidden=true;UI.left='nets';UI.leftOpen=true;UI.sel=null;renderPanel();renderLeft();const b=$('leftBody');if(b)b.scrollTop=0;},
 meetGo:({city})=>{if(!isCity(city))return;$('dash').hidden=true;ACT.focusCity({city});if(S.pops[city]){UI.tab='peer';renderPanel();}},
 toggleLeft:()=>{UI.leftOpen=!UI.leftOpen;renderLeft();},
 phoneTab:({t})=>{if(!['goals','deals','noc','nets'].includes(t))return;if($('modal').classList.contains('link-check'))closeModal();haptic(8);if(UI.leftOpen&&UI.left===t&&!UI.sel){UI.leftOpen=false;}else{UI.left=t;UI.leftOpen=true;UI.sel=null;renderPanel();}$('left').classList.remove('full');renderLeft();},
 phonePlay:()=>{if(pzOn())return;if(S&&!rule('clock'))return;haptic(10);if(UI.speed){UI.lastSpeed=UI.speed;UI.speed=0;}else UI.speed=UI.lastSpeed||1;renderHUD();},
 phoneSpeed:()=>{if(pzOn())return;if(S&&!rule('clock'))return;haptic(8);const cur=UI.speed||UI.lastSpeed||1,i=SPEEDS.indexOf(cur),n=SPEEDS[(i+1)%SPEEDS.length];UI.speed=n;UI.lastSpeed=n;renderHUD();},
 install:()=>{if(installEvt){installEvt.prompt();installEvt.userChoice.finally(()=>{installEvt=null;});return;}
   openModal(pitchHtml(false));},
 pitchSkip:()=>{const p=UI.pendGame;UI.pendGame=null;UI.pitched=true;if(p)beginGame(...p);else closeModal();},
 logOpen:({id})=>{const e=(S.log||[]).find(x=>x.id===id),o=e&&e.o;if(!o)return;$('dash').hidden=true;closeModal();
  if(o.a==='city'&&isCity(o.v)){ACT.focusCity({city:o.v});return;}
  if(o.a==='link'){if(S.links.some(l=>l.id===o.v)){ACT.selLink({id:o.v});return;}toast(tr('interface.that_link_is_gone_it_was'),'');return;}
  if(o.a==='cust'){if(S.biz.some(b=>b.id===o.v)){ACT.custGo({id:o.v});return;}toast(tr('interface.that_customer_is_gone_the_contract'),'');return;}
  if(o.a==='bank'){ACT.bank({});return;}if(o.a==='ops'){ACT.opsOpen();return;}if(o.a==='tab'&&LOG_TABS.includes(o.v))ACT.leftTab({t:o.v});},
 logAll:()=>{UI.logAll=!UI.logAll;renderLeft();},
 findOpen:()=>findOpen(),
 findGo:({city})=>{if(!isCity(city))return;closeModal();$('dash').hidden=true;ACT.focusCity({city});},
 focusCity:({city})=>{selectCity(city);const C=CITY[city];cam.x=C.x;cam.y=C.y;cam.z=Math.max(cam.z,1.2);if(innerWidth<760)UI.leftOpen=false;renderLeft();},
 popStep:({d})=>{const L=popOrder(),n=L.length;if(!n)return;const i=UI.sel&&UI.sel.type==='city'?L.indexOf(UI.sel.id):-1;$('dash').hidden=true;ACT.focusCity({city:L[i<0?(d>0?0:n-1):(i+(d>0?1:n-1))%n]});},
 // The offer stays marked in its city's Offers here until something else is selected, so two offers in one city each get a press.
 offerStep:()=>{const L=offerOrder(),n=L.length;if(!n){toast(tr('hud_and_panels.no_open_offers_right_now_businesses'));return;}
  const i=L.findIndex(o=>o.id===UI.offerAt),o=L[(i+1)%n];$('dash').hidden=true;ACT.focusCity({city:o.city});UI.offerAt=o.id;if(S.pops[o.city])UI.tab='cust';renderPanel();
  const r=document.querySelector('#panelBody .row.on');if(r&&r.scrollIntoView)r.scrollIntoView({block:'nearest'});},
 zoomStep:({d})=>zoomAt(CW/2,CH/2,d>0?1.25:0.8),
 keys:()=>showKeys(),
 selLink:({id})=>{selectLink(id);focusLink(id);},
};
