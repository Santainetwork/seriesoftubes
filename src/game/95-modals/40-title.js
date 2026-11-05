// Five suggested homes, or any city with someone selling transit there. Hidden cities and China (which needs
// a license first) can't be a home, and neither can a city where nobody sells transit: you'd start cut off.
const homeOk=c=>own(CITY,c)&&!CITY[c].off&&!CITY[c].cn&&NETS.some(n=>sellsAt(n,c));
const START5=['fra','nyc','sin','sao','syd'];
// A regional map may drop one of the five suggested homes: only the ones it keeps are offered,
// so the drawer never renders a city with no city record on that map. Re-derived after each
// region switch, not baked at load when the map is whole.
const START5_ON=()=>START5.filter(c=>own(CITY,c));
// One drawer for the home city: the cities the map keeps first, then every city with transit by continent.
const START_D=()=>({fra:tr('title.crossroads_of_europe_de_kicks_ix'),nyc:tr('title.huge_eyeball_market_pricey'),sin:tr('title.asia_hub_great_peering_far_from'),sao:tr('title.big_hungry_market_few_providers'),syd:tr('title.hard_mode_pricey_everything')});
function homePick(){const cs=Object.keys(CITY).filter(c=>homeOk(c)&&!START5_ON().includes(c)),cur=UI.startCity,opt=c=>`<option value="${c}"${c===cur?' selected':''}>${esc(CITY[c].name)}</option>`;
  return `<select class="pick homepick" id="homeSel" data-chg="pickHome" aria-labelledby="homeLbl"><optgroup label="${esc(tr('title.suggested'))}">${START5_ON().map(opt).join('')}</optgroup>${Object.keys(REG).map(r=>{const g=cs.filter(c=>CITY[c].reg===r).sort((a,b)=>CITY[a].name.localeCompare(CITY[b].name));
    return g.length?`<optgroup label="${esc(REG[r])}">${g.map(opt).join('')}</optgroup>`:'';}).join('')}</select>`;}
// The line under the drawer: what the suggested home is like, or which continent another city is on.
const homeWhat=()=>START5_ON().includes(UI.startCity)?esc(START_D()[UI.startCity]):`${esc(CITY[UI.startCity].name)} · ${esc(REG[CITY[UI.startCity].reg])}`;
/* Your own AS number (#135): any public 16- or 32-bit ASN, but not AS 0, AS_TRANS, the documentation and private ranges, or
   one a network on the map already uses. Left empty, the game picks one from the private-looking 200000s as before. */
const asnOk=a=>Number.isInteger(a)&&a>=1&&a<=4294967294&&a!==23456&&!(a>=64496&&a<=131071)&&!(a>=4200000000)&&!NETS.some(n=>n.asn===a);
const asnSuggest=()=>{for(;;){const a=200000+Math.floor(Math.random()*15000);if(asnOk(a))return a;}};
function showTitle(){
  const list=slotIdx(true),top=slotTop(list),many=list.length>1||(list.length===1&&list[0]!==top);
  if(UI.nm==null)UI.nm=randomNetworkName();if(UI.asnSug==null)UI.asnSug=asnSuggest();
  /* Fork: role picker. The four roles (hosting/NAP/ISP/RT-net) gate offers, POP caps and
     broadband; UI.role defaults to isp and pickRole re-renders the title. */
  const roleBtns=typeof ROLE_IDS!=='undefined'?ROLE_IDS.map(id=>`<button class="pick ${UI.role===id?'on':''}" data-act="pickRole" data-args='{"id":"${id}"}' title="${esc(ROLES[id].blurb)}">${ROLES[id].l}</button>`).join(''):'';
  const roleNote=(typeof ROLES!=='undefined'&&ROLES[UI.role])?ROLES[UI.role].blurb:(typeof ROLES!=='undefined'?ROLES.isp.blurb:'');
  openModal(`<div class="tlang"><label class="sr-only" for="langTitle">${tr('common.language')}</label>${langPick('langTitle')}</div><div class="title-art"><svg width="74" height="74" viewBox="0 0 74 74" aria-hidden="true"><path d="M10 60V40c0-14 10-24 24-24h18" fill="none" stroke="#1E2640" stroke-width="16" stroke-linecap="round"/><path d="M10 60V40c0-14 10-24 24-24h18" fill="none" stroke="#FFD23F" stroke-width="9" stroke-linecap="round"/><circle cx="58" cy="16" r="11" fill="#FF4F9A" stroke="#1E2640" stroke-width="4"/><circle cx="21" cy="44" r="3" fill="#fff"/><circle cx="30" cy="27" r="3" fill="#fff"/></svg>
  <h1>Series<br>of <span>Tubes</span></h1></div>
  <p class="tagline">${tr('title.build_an_internet_lay_fiber_between')}</p>${isPhone()?installRow():''}
  ${top?`<div class="btns tcont" style="margin-bottom:6px">${btn(tr('title.continue_name_date',{name:esc(top.name||tr('common.unnamed_network')),date:dateStr(top.day)}),'cont',{id:top.id},'pink big')}</div>`:''}
  ${many?slotsHtml():''}
  <label class="f" for="nmIn">${tr('title.name_your_network')}</label><div class="network-name"><div class="nmwrap"><input class="t" id="nmIn" maxlength="24" value="${esc(UI.nm)}" autocomplete="off"><button class="reroll" data-act="randomName" aria-label="${tr('common.another_one')}" title="${tr('common.another_one')}">↻</button></div><div class="asnwrap"><span aria-hidden="true">AS</span><input class="t" id="asnIn" inputmode="numeric" maxlength="10" value="${esc(UI.asnTxt==null?'':UI.asnTxt)}" placeholder="${UI.asnSug}" aria-label="${tr('title.as_number')}" autocomplete="off"></div></div>
  ${doorsHtml()}
  ${ACT.pickRegion?`<label class="f">${tr('common.play_in')}</label><div class="pick3">${PICK_REGIONS.map(([id,l])=>`<button class="pick ${UI.region===id?'on':''}" data-act="pickRegion" data-args='{"id":"${id}"}'>${(REGION[id]||{}).name||l}</button>`).join('')}</div>`:''}
  ${roleBtns?`<label class="f">${tr('title.your_role')}</label><div class="pick4">${roleBtns}</div><p class="pickdesc">${esc(roleNote)}</p>`:''}
  <label class="f" id="homeLbl" for="homeSel">${tr('title.pick_your_home_city')}</label>${homePick()}<p class="note" id="homeWhat">${homeWhat()}</p>
  <div class="btns cta tcta" style="margin-top:16px">${btn(list.length?tr('common.start_a_new_network'):tr('common.start_building'),'start',{},'big')}${btn(tr('common.how_to_play'),'help',{},'ghost')}${btn(tr('common.import_a_save'),'importPick',{},'ghost')}${btn(tr('common.settings'),'settings',{},'ghost')}</div>${plugHtml(false)}<p class="ver">v${APP_VERSION} · <a href="https://github.com/fjaeckel/seriesoftubes" target="_blank" rel="noopener">${tr('title.source_on_github')}</a> · <a href="${SIGNAL}" target="_blank" rel="noopener">${tr('title.chat_on_signal')}</a> · ${tr('title.cookieless_stats_no_tracking')}</p>`);
  $('nmIn').addEventListener('input',e=>{UI.nm=e.target.value;});
  $('asnIn').addEventListener('input',e=>{UI.asnTxt=e.target.value.replace(/\D/g,'').slice(0,10);if(e.target.value!==UI.asnTxt)e.target.value=UI.asnTxt;e.target.classList.toggle('bad',!!UI.asnTxt&&!asnOk(+UI.asnTxt));});
}
// "What's new": shown once to returning players after an update, or on demand.
function whatsNew(returning,force){
  if(IS_DEV||(!RELEASE_NOTES.length&&!RELEASE_STORY.length))return false;let seen=null;
  try{seen=localStorage.getItem('sot-seen-version');localStorage.setItem('sot-seen-version',APP_VERSION);}catch(e){}
  if(!force&&(!returning||seen===APP_VERSION))return false;
  openModal(`<div style="display:flex;align-items:center"><div><div class="eyebrow">${tr('common.release_notes')}</div><h2 style="font-size:28px">${tr('title.new_in_series_of_tubes_v',{v:esc(APP_VERSION)})}</h2></div><button class="x" data-act="${UI.started?'closeModal':'helpClose'}" aria-label="${tr('common.close')}">×</button></div>
  ${notesHtml(RELEASE_NOTES,APP_VERSION)}
  ${returning&&S?`<p class="note">${tr('title.your_network_name_was_saved_and',{name:esc(S.name)})}</p>`:''}
  <div class="btns" style="margin-top:12px">${btn(UI.started?tr('title.back_to_my_network'):tr('common.got_it'),UI.started?'closeModal':'helpClose',{},'pink big')}${notesLong(RELEASE_NOTES)||RELEASE_STORY.length?'':`<a class="b ghost" href="https://github.com/fjaeckel/seriesoftubes/blob/main/CHANGELOG.md" target="_blank" rel="noopener">${tr('common.full_changelog')}</a>`}</div>`);
  return true;}
/* The four doors: one game, its rules picked here and locked for the network's life. Normal and Sandbox stay on this
   screen (presets / chaos below), Puzzles and Scenarios open their own lists. Choices toggle in place (no re-render). */
const DOORS=[['puzzle','🧩',tr('title.puzzles'),tr('title.one_network_one_knot_no_clock')],['sandbox','🏖️',tr('common.sandbox'),tr('title.a_billion_dollars_and_every_toy')],['normal','📟',tr('common.normal'),tr('title.the_real_game_climb_from_tier')],['scn','🏆',tr('title.scenarios_amp_weekly'),tr('title.hand_built_crises_and_one_world')]];
const doorAct={puzzle:'puzzleDoor',sandbox:'modeSet',normal:'modeSet',scn:'scenarios'};
// The chosen preset in one line: its joke, then what actually changes.
const presetWhat=k=>`${esc(PRESETS[k].d)} <span class="meta">${esc(PRESETS[k].x)}</span>`;
function doorsHtml(){const m=UI.mode==='sandbox'?'sandbox':'normal',pr=own(PRESETS,UI.preset)&&NORMAL_PRESETS.includes(UI.preset)?UI.preset:'oncall',ch=own(CHAOS,UI.sbChaos)?UI.sbChaos:'none';
  return `<label class="f">${tr('title.pick_a_door')}</label><div class="doors">${DOORS.map(([k,i,n,d])=>`<button class="door${k===m?' on':''}" data-door="${k}" data-act="${doorAct[k]}" data-args='${k==='sandbox'||k==='normal'?`{"m":"${k}"}`:'{}'}'><i aria-hidden="true">${i}</i><b>${n}</b><span>${d}</span>${k==='puzzle'&&pzWkNew()||k==='scn'&&wsNew()?`<em class="pznew">${tr('puzzles.new_this_sunday')}</em>`:''}</button>`).join('')}</div>
  <div id="doorNormal"${m==='normal'?'':' hidden'}><label class="f">${tr('title.how_much_trouble')}</label><div class="presets">${NORMAL_PRESETS.map(k=>{const P=PRESETS[k];return `<button class="preset${k===pr?' on':''}" data-preset="${k}" data-act="presetSet" data-args='{"p":"${k}"}' aria-pressed="${k===pr}"><i aria-hidden="true">${P.i}</i><b>${P.n}</b></button>`;}).join('')}</div><p class="note" id="presetWhat">${presetWhat(pr)}</p></div>
  <div id="doorSandbox"${m==='sandbox'?'':' hidden'}><label class="f">${tr('title.chaos_in_your_sandbox')}</label><div class="chaos">${Object.entries(CHAOS).map(([k,C])=>`<button class="chs${k===ch?' on':''}" data-chaos="${k}" data-act="chaosSet" data-args='{"c":"${k}"}'><i aria-hidden="true">${C.i}</i><b>${C.n}</b><span>${C.d}</span></button>`).join('')}</div></div>
  <p class="note lockn">🔒 ${tr('title.rules_are_picked_once_and_locked')}</p>`;}
