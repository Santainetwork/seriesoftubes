Object.assign(ACT,{
 teEdit:()=>{if(!S.te)return;UI.teDraft=undefined;teModal();},
 teClose:()=>{const t=$('teSrc');if(t)UI.teDraft=t.value;closeModal();},
 teOpt:()=>{UI.teDraft=teOptimize();teModal();},
 teExample:()=>{UI.teDraft=TE_EXAMPLE;teModal();},
 teSlop:()=>{const t0=performance.now(),a=aiSlop(Math.random()<0.02),secs=Math.max(0.1,(performance.now()-t0)/1000);UI.teDraft=UI.slop=a.src;teModal(`<p class="note aisay">🤖 <b>${esc(a.ai)}</b> <small>${tr('route_script_and_tools.thought_for_s_seconds',{s:secs.toFixed(1)})}</small><br>${tr(a.say)}</p>`);sfx('build');},
 teHelp:()=>{const t=$('teSrc');if(t)UI.teDraft=t.value;teHelpModal();},
 teBack:()=>teModal(),
 teRecipe:({id})=>{const r=TE_RECIPES.find(x=>x.id===id);if(!r)return;UI.teDraft=r.src().join('\n');teModal(`<p class="note">${tr('route_script_and_tools.loaded_name_check_it_then_deploy',{name:tr(r.n)})}</p>`);},
 teClear:()=>{S.te.script='';UI.teDraft=undefined;TE_CACHE={src:null,p:null};after();teModal(`<p class="note">${tr('route_script_and_tools.script_removed_plain_auto_te_is')}</p>`);},
 teCheck:()=>{const t=$('teSrc');const src=t?t.value:'';UI.teDraft=src;const p=teParse(src);if(p.errors.length){teModal(`<pre class="term err">${esc(p.errors.join('\n'))}</pre>`);return;}const r=teTrial(src);teModal(`<pre class="term">${esc(trn('route_script_and_tools.n_rule_ok',p.n)+'\n'+tr('route_script_and_tools.served_a_b',{a:fmtG(r.before.served),b:fmtG(r.after.served)})+'\n'+tr('route_script_and_tools.transit_a_mo_b_mo',{a:fmt$(r.before.tc),b:fmt$(r.after.tc)})+'\n'+tr('route_script_and_tools.spilled_g_onto_alternate_paths',{g:fmtG(r.after.moved)})+(r.after.bh?'\n'+tr('route_script_and_tools.blackholed_g',{g:fmtG(r.after.bh)}):''))}</pre>`);},
 teDeploy:()=>{const t=$('teSrc');const src=(t?t.value:'').slice(0,4000);UI.teDraft=src;const p=teParse(src);if(p.errors.length){teModal(`<pre class="term err">${esc(tr('common.commit_failed')+'\n'+p.errors.join('\n'))}</pre>`);sfx('err');return;}const r=teTrial(src);S.te.script=src;S.te.on=true;TE_CACHE={src:null,p:null};UI.teDraft=undefined;after();
   const drop=r.before.served>1?1-r.after.served/r.before.served:0,saved=r.before.tc>0?1-r.after.tc/r.before.tc:0;
   if(drop>0.1&&UI.slop===src){if(drop>0.3)S.stats.fat=1;toast(tr('route_script_and_tools.commit_complete_traffic_down_p_the',{p:pct(drop)}),'bad');sfx('alert');}
   else if(drop>0.3){S.stats.fat=1;toast(tr('route_script_and_tools.commit_complete_traffic_down_p_you',{p:pct(drop)}),'bad');sfx('alert');}
   else{if(saved>0.1&&drop<0.01)S.stats.kiddie=1;toast(`<b>${tr('common.commit_complete')}</b><br>${saved>0.01?trn('route_script_and_tools.n_rule_live_transit_bill_down',p.n,{p:pct(saved)}):trn('route_script_and_tools.n_rule_live',p.n)}`,'good');sfx('build');}closeModal();UI.slop=undefined;checkGoals();},
 buyTE:()=>{if(S.te)return;if(lvl()<3){toast(tr('route_script_and_tools.auto_te_unlocks_at_customer_level'),'bad');sfx('err');return;}if(!coreTE()){toast(tr('core.auto_te_needs_an_rsvp_te_or'),'bad');sfx('err');return;}if(!spend(TE_COST))return;S.te={on:true,day:S.day};toast(tr('route_script_and_tools.auto_te_is_live_the_controller'),'good');after();},
 teToggle:()=>{if(!S.te)return;S.te.on=!S.te.on;after();},
 rtbh:()=>{const a=S.ev.ddos;if(!a){toast('<b>No attack to blackhole right now.</b>','');return;}a.bh=true;S.stats.rtbh=(S.stats.rtbh||0)+1;toast(`<b>RTBH announced.</b><br>You blackholed the target in ${CITY[a.city].name}. The flood stops, and so does everyone there.`,'bad');sfx('alert');after();},
 unrtbh:()=>{const a=S.ev.ddos;if(!a||!a.bh)return;a.bh=false;toast(`<b>Blackhole withdrawn.</b><br>${CITY[a.city].name} is reachable again. Brace for the junk.`,'');after();},
 hackback:()=>{const a=S.ev.ddos;if(!a||a.until<=S.day){toast('<b>Nothing to hack back right now.</b>','');return;}if(!spend(20000))return;S.stats.hackback=(S.stats.hackback||0)+1;
   if(Math.random()<0.35){a.until=S.day;a.bh=false;toast(`<b>HackBack 3000™ strikes back!</b><br>Skynot AI traced the botnet and politely bricked it. The attack on ${CITY[a.city].name} stops cold.`,'goal');sfx('coin');}
   else{const fine=15000+Math.floor(Math.random()*35000);S.cash-=fine;S.stats.vigilante=(S.stats.vigilante||0)+1;
     toast(`<b>HackBack 3000™ hit the wrong target.</b><br>${pick(['Skynot AI flattened a grandma\'s internet-connected fridge.','You counter-flooded a hospital in a country you cannot pronounce.','The botnet was already someone else’s botnet. They are furious.'])} A regulator sends you a ${fmt$(fine)} fine, and the attack rolls on.`,'bad');sfx('err');}
   after();},
 trace:({city})=>traceModal(city),
 traceRun:()=>{const f=$('trFrom'),t=$('trTo');traceModal(f&&f.value,t&&t.value);},
 traceCopy:()=>{try{navigator.clipboard.writeText(UI.trText||'');toast(tr('route_script_and_tools.copied_paste_it_into_your_favourite'),'good');}catch(e){}},
 share:()=>shareModal(),
 shareDl:()=>shareFile(f=>{if(!f)return;const a=document.createElement('a');a.href=URL.createObjectURL(f);a.download=f.name;document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove();},1000);track('share_download');}),
 shareGo:()=>shareFile(f=>{const d={title:'Series of Tubes',text:tr('route_script_and_tools.name_as_asn_tier_peak_peak',{name:S.name,asn:S.asn,tier:tierLabel(),peak:fmtG(peakTraffic())}),url:'https://seriesoftub.es/'};try{if(f&&navigator.canShare&&navigator.canShare({files:[f]}))d.files=[f];navigator.share(d).then(()=>track('share_done')).catch(()=>{});}catch(e){}}),
 confGo:({key})=>{S.confReg=S.confReg||{};if(S.confReg[key])return;const cf=upcomingConfs(75).find(x=>x.key===key);if(!cf||cf.day<=S.day||(cf.cap&&lvl()<CAP_LV))return;if(!spend(confCost(cf)))return;S.confReg[key]=true;toast(tr('route_script_and_tools.registered_flights_booked_badge'),'good');after();},
 confSponsor:({key})=>{S.confReg=S.confReg||{};const was=S.confReg[key];if(was==='sp')return;const cf=upcomingConfs(75).find(x=>x.key===key);if(!cf||cf.day<=S.day||!confSp(cf))return;if(!spend(CONF_SP-(was?confCost(cf):0)))return;S.confReg[key]='sp';toast(tr('conferences.you_are_sponsoring_conf_your_logo',{conf:esc(cf.n),region:esc(REG[CITY[cf.c].reg])}),'good');sfx('coin');after();},
 tutSkip:()=>{S.tut=null;try{localStorage.setItem('sot-tut','1');}catch(e){}renderCoach();},
});
