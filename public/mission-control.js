const $=(s)=>document.querySelector(s);let data=null;
const esc=(v='')=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const humanState=(state='')=>({needs_you:'NEEDS YOU',blocked:'BLOCKED',active:'MOVING',untracked:'SETUP NEEDED',idle:'QUIET',completed:'DONE',hidden:'HIDDEN'}[state]||String(state).replaceAll('_',' ').toUpperCase());
const projectUrl=(p)=>p?.repo?`https://github.com/${encodeURI(p.repo)}`:'';
const actionFor=(p)=>p?.nextStep||p?.currentTask||p?.reason||'Define the next explicit move.';
const isActionable=(p)=>p&&p.state!=='completed'&&p.state!=='hidden';

function chooseFocus(projects=[]){
  const rows=projects.filter(isActionable);
  const first=(state)=>rows.find(p=>p.state===state);
  return first('needs_you')||first('blocked')||first('active')||first('untracked')||rows[0]||projects.find(p=>p.state==='completed')||null;
}

function statusSentence(){
  const s=data.summary||{};
  if(s.needsYou>0)return `${s.needsYou} ${s.needsYou===1?'thing needs':'things need'} your judgement.`;
  if(s.blocked>0)return `${s.blocked} ${s.blocked===1?'project is':'projects are'} blocked. Nothing else deserves equal visual weight.`;
  const moving=(data.projects||[]).filter(p=>p.state==='active').length;
  if(moving>0)return `${moving} ${moving===1?'project is':'projects are'} moving. You only need the next decision.`;
  return 'Nothing urgent is asking for you. Pick deliberately.';
}

function renderFocus(){
  const focus=chooseFocus(data.projects||[]);const el=$('#focusCard');el.classList.remove('loading','offline');
  if(!focus){el.innerHTML='<div class="focus-kicker">NOW</div><h2 class="focus-action">No project state is available yet.</h2>';return;}
  const state=humanState(focus.state);const action=actionFor(focus);const link=projectUrl(focus);
  const reason=focus.reason||focus.currentTask||'This is the highest operational priority visible in the current evidence.';
  el.innerHTML=`<div class="focus-top"><div class="focus-kicker">NOW · ${esc(state)}</div><div class="focus-index">01</div></div><div class="focus-project">${esc(focus.name)}</div><h2 class="focus-action">${esc(action)}</h2><div class="focus-bottom"><div class="focus-meta"><div class="focus-state">WHY THIS IS HERE</div><p class="focus-reason">${esc(reason)}</p></div><div class="focus-actions">${link?`<a class="primary" href="${link}" target="_blank" rel="noreferrer">OPEN PROJECT ↗</a>`:''}<a class="secondary" href="#portfolioDetails">SEE CONTEXT</a></div></div>`;
}

function queueCandidates(){
  const projects=data.projects||[];const focus=chooseFocus(projects);
  const rows=projects.filter(p=>p!==focus&&isActionable(p));
  return rows.slice(0,3);
}
function renderNext(){
  const rows=queueCandidates();
  $('#nextUp').innerHTML=rows.length?rows.map((p,i)=>{const href=projectUrl(p);const content=`<span class="queue-index">0${i+2}</span><span class="queue-main"><strong>${esc(p.name)}</strong><span class="queue-state ${esc(p.state)}">${esc(humanState(p.state))}</span></span><span class="queue-copy">${esc(actionFor(p))}</span><span class="queue-arrow">↗</span>`;return href?`<a class="queue-row" href="${href}" target="_blank" rel="noreferrer">${content}</a>`:`<div class="queue-row">${content}</div>`}).join(''):'<div class="empty">No second priority needs your attention right now.</div>';
}

function groupProjects(){
  const groups=[['needs_you','Needs you'],['blocked','Blocked'],['active','Moving'],['untracked','Setup needed'],['idle','Quiet'],['completed','Done']];
  return groups.map(([state,label])=>({state,label,rows:(data.projects||[]).filter(p=>p.state===state)})).filter(g=>g.rows.length);
}
function renderPortfolio(){
  const projects=data.projects||[];const detailsCount=$('#detailsCount');detailsCount.textContent=`${projects.length} projects · hidden until you ask`;
  $('#portfolioGroups').innerHTML=groupProjects().map(g=>`<section class="group"><h3 class="group-title">${esc(g.label.toUpperCase())} · ${g.rows.length}</h3>${g.rows.map(p=>{const href=projectUrl(p);const row=`<strong>${esc(p.name)}</strong><span class="portfolio-copy">${esc(actionFor(p))}</span><span class="portfolio-state ${esc(p.state)}">${esc(humanState(p.state))}</span>`;return href?`<a class="portfolio-row" href="${href}" target="_blank" rel="noreferrer">${row}</a>`:`<div class="portfolio-row">${row}</div>`}).join('')}</section>`).join('')||'<div class="empty">No project state available.</div>';
}

function renderSystem(){
  const s=data.summary||{},p=data.portfolio||{};const generated=data.generatedAt?new Date(data.generatedAt).toLocaleString():'unknown';
  const items=[['SNAPSHOT',generated],['SCOPE',String(data.scope||'unknown').replaceAll('_',' ')],['PUBLIC REPOS',p.publicCount??p.count??'—'],['HARNESS',`${s.harnessed??0}/${s.deepTracked??0} deeply tracked`],['MODE',String(data.mode||'snapshot').replaceAll('_',' ')],['SAFETY',data.safety?.publicSafe?'public-safe · private details excluded':'runtime policy']];
  if(data.warning)items.push(['LIMITATION',data.warning]);
  $('#systemBody').innerHTML=items.map(([k,v])=>`<div class="system-item"><span class="system-key">${esc(k)}</span><div class="system-value ${k==='LIMITATION'?'warning':''}">${esc(v)}</div></div>`).join('');
}

function render(){
  $('#statusLine').textContent=statusSentence();
  $('#syncState').textContent='SNAPSHOT READY';
  renderFocus();renderNext();renderPortfolio();renderSystem();
  if(data.refresh?.workflowUrl){const refresh=$('#systemDetails summary');refresh.title='Source refresh is available in GitHub Actions';}
}

async function getJson(url){const res=await fetch(url,{cache:'no-store'});if(!res.ok)throw new Error(`HTTP ${res.status}`);return res.json()}
async function load(){
  const button=$('#refresh');button.disabled=true;$('#syncState').textContent='SYNCING';
  try{try{data=await getJson(`./mission-control.json?ts=${Date.now()}`)}catch{data=await getJson('/api/mission-control')}render()}
  catch(error){const el=$('#focusCard');el.classList.remove('loading');el.classList.add('offline');el.innerHTML=`<div class="focus-kicker">MISSION CONTROL OFFLINE</div><div class="focus-project">Could not read portfolio state.</div><h2 class="focus-action">Check the latest GitHub Pages workflow.</h2><div class="focus-bottom"><p class="focus-reason">${esc(error.message)}</p></div>`;$('#syncState').textContent='OFFLINE';$('#nextUp').innerHTML='';$('#detailsCount').textContent='Unavailable';}
  finally{button.disabled=false}
}
$('#refresh').addEventListener('click',load);load();
