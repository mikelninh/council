const $=(s)=>document.querySelector(s);let data=null;
const esc=(v='')=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const age=(days)=>days===0?'today':Number.isFinite(days)?`${days}d ago`:'unknown';
const stateLabel=(state='')=>({needs_you:'NEEDS YOU',blocked:'BLOCKED',active:'MOVING',untracked:'SETUP NEEDED',idle:'QUIET',completed:'MOVING · LAST TASK DONE',hidden:'HIDDEN'}[state]||String(state).replaceAll('_',' ').toUpperCase());
const brief=(p)=>p?.brief||{};const roadmap=(p)=>brief(p).roadmap||{};const repoUrl=(p)=>p?.repo?`https://github.com/${encodeURI(p.repo)}`:'';

function renderPulse(){
  const rows=data.projects||[],core=rows.filter(p=>brief(p).isCore),moving=core.filter(p=>['active','completed','needs_you','blocked'].includes(p.state)).length,attention=core.filter(p=>['needs_you','blocked'].includes(p.state)).length;
  const standardized=core.filter(p=>roadmap(p).standardized).length;
  $('#portfolioPulse').innerHTML=[['CORE MISSIONS',core.length,''],['ROADMAP TRUTH',`${standardized}/${core.length}`,''],['NEEDS YOU',attention,attention?'attention':'']].map(([label,value,cls])=>`<div class="pulse-chip ${cls}"><strong>${esc(value)}</strong><span>${esc(label)}</span></div>`).join('');
}
function recentWins(){
  const wins=(data.projects||[]).filter(p=>brief(p).isCore).flatMap(p=>(brief(p).achievements||[]).map(w=>({...w,project:p.name}))).filter(w=>w.text);
  wins.sort((a,b)=>Date.parse(b.date||0)-Date.parse(a.date||0));return wins.slice(0,3);
}
function renderWins(){
  const wins=recentWins();$('#winsStrip').innerHTML=wins.length?wins.map(w=>`<div class="win-tile"><span>${esc(w.project)}</span><strong>${esc(w.text)}</strong><small>${w.date?esc(new Date(w.date).toLocaleDateString()):'recently'}</small></div>`).join(''):'<div class="empty">No recent repository wins captured yet.</div>';
}
function railStep(label,text,kind='future'){return `<div class="rail-step ${kind}"><span class="rail-dot"></span><span class="rail-label">${esc(label)}</span><strong>${esc(text||'Not yet defined')}</strong></div>`}
function journeyHtml(p){
  const r=roadmap(p),achieved=r.achieved||[],next=r.next||[],later=r.later||[];const built=achieved.length?achieved[achieved.length-1].title:`${achieved.length} milestones captured`;
  return `<div class="journey">${railStep('ACHIEVED',built,'done')}${railStep('NOW',r.current?.title||brief(p).currentGoal,'current')}${railStep('NEXT',next[0]?.title||brief(p).nextWins?.[0],'future')}${railStep('LATER',later[0]||'Later horizon','future')}</div>`;
}
function achievementsHtml(p){const rows=roadmap(p).achieved||[];return rows.length?`<ul class="milestone-list">${rows.map(x=>`<li><span>✓</span><span>${esc(x.title||x.text||x)}</span></li>`).join('')}</ul>`:'<div class="missing">No achieved milestones captured in the roadmap contract yet.</div>'}
function nextHtml(p){const rows=roadmap(p).next||[];return rows.length?`<ol class="next-list">${rows.map((x,i)=>`<li><strong>${String(i+1).padStart(2,'0')} · ${esc(x.title||x.text||x)}</strong>${x.why?`<p>${esc(x.why)}</p>`:''}</li>`).join('')}</ol>`:'<div class="missing">No explicit next wins captured yet.</div>'}
function laterHtml(p){const rows=roadmap(p).later||[];return rows.length?`<ul class="later-list">${rows.map(x=>`<li><span>·</span><span>${esc(x.title||x)}</span></li>`).join('')}</ul>`:'<div class="missing">No later horizon captured yet.</div>'}
function activityHtml(p){const rows=brief(p).achievements||[];return rows.length?rows.map(w=>`<div class="activity-row"><span>↗</span><div><strong>${esc(w.text)}</strong><small>${w.date?esc(new Date(w.date).toLocaleDateString()):''}</small></div></div>`).join(''):'<div class="missing">No recent commit activity captured.</div>'}
function missionCard(p){
  const b=brief(p),r=roadmap(p),href=repoUrl(p),next=r.next?.[0],recent=b.achievements?.[0],badge=r.standardized?'ROADMAP':'DERIVED';
  const purpose=r.northStar||b.purpose||'Purpose not yet captured.';const nextTitle=next?.title||b.nextWins?.[0]||'Define the next explicit milestone.';
  return `<details class="mission-card ${esc(p.state)}"><summary><div class="mission-head"><div class="mission-name"><h2>${esc(p.name)}<span class="roadmap-badge ${r.standardized?'':'derived'}">${badge}</span></h2><div class="activity">last activity ${esc(age(p.daysSincePush))}</div></div><span class="state ${esc(p.state)}">${esc(b.statusLabel||stateLabel(p.state))}</span></div><div class="north-star"><span class="meta-label">NORTH STAR</span><p>${esc(purpose)}</p></div>${journeyHtml(p)}<div class="next-win"><div><span class="next-label">NEXT BIGGEST WIN</span><strong>${esc(nextTitle)}</strong></div><small>${esc((r.achieved||[]).length)} milestones achieved</small></div><div class="micro-win"><span>✓</span><p>${esc(recent?.text||((r.achieved||[]).at(-1)?.title)||'No recent win captured yet.')}</p></div><div class="card-footer"><span>OPEN FULL ROADMAP</span><span class="expand">⌄</span></div></summary><div class="mission-detail"><section><h3>WHAT WE ACHIEVED</h3>${achievementsHtml(p)}</section><section><h3>NEXT 3 WINS</h3>${nextHtml(p)}</section><section><h3>LATER</h3>${laterHtml(p)}</section><section><h3>RECENT REPOSITORY ACTIVITY</h3>${activityHtml(p)}</section><section class="detail-evidence"><h3>TRUTH SOURCE</h3><p>${r.standardized?'.harness/roadmap.json is the durable product roadmap for this project.':'No roadmap contract yet; this story is conservatively derived from repository-owned docs and harness state.'}</p>${href?`<a href="${href}" target="_blank" rel="noreferrer">OPEN REPOSITORY ↗</a>`:''}</section></div></details>`;
}
function compactRow(p){const b=brief(p),href=repoUrl(p),copy=b.currentGoal||b.purpose||p.currentTask||p.reason||'No explicit current milestone.';const row=`<strong>${esc(p.name)}</strong><p>${esc(copy)}</p><small>${esc(b.statusLabel||stateLabel(p.state))}</small>`;return href?`<a class="other-row" href="${href}" target="_blank" rel="noreferrer">${row}</a>`:`<div class="other-row">${row}</div>`}
function renderProjects(){
  const rows=data.projects||[],core=rows.filter(p=>brief(p).isCore),others=rows.filter(p=>!brief(p).isCore&&brief(p).lane!=='quiet'),quiet=rows.filter(p=>!brief(p).isCore&&brief(p).lane==='quiet');
  $('#coreCount').textContent=`${core.length} missions`;$('#coreGrid').innerHTML=core.length?core.map(missionCard).join(''):'<div class="empty">No core missions are visible in this snapshot.</div>';
  $('#otherCount').textContent=`${others.length} active experiments · open when useful`;$('#otherProjects').innerHTML=others.length?others.map(compactRow).join(''):'<div class="empty">No other active experiments.</div>';
  $('#quietCount').textContent=`${quiet.length} quiet / completed`;$('#quietProjects').innerHTML=quiet.length?quiet.map(compactRow).join(''):'<div class="empty">No quiet projects.</div>';
}
function renderSystem(){
  const rows=data.projects||[],core=rows.filter(p=>brief(p).isCore),standardized=core.filter(p=>roadmap(p).standardized).length,generated=data.generatedAt?new Date(data.generatedAt).toLocaleString():'unknown';
  const items=[['SNAPSHOT',generated],['CORE ROADMAP COVERAGE',`${standardized}/${core.length}`],['ALL PUBLIC PROJECTS',rows.length],['SCOPE',String(data.scope||'unknown').replaceAll('_',' ')],['MODE',String(data.mode||'snapshot').replaceAll('_',' ')],['SAFETY',data.safety?.publicSafe?'public-safe · private details excluded':'runtime policy']];if(data.warning)items.push(['LIMITATION',data.warning]);
  $('#systemBody').innerHTML=items.map(([k,v])=>`<div class="system-item"><span>${esc(k)}</span><div>${esc(v)}</div></div>`).join('');
}
function render(){
  const core=(data.projects||[]).filter(p=>brief(p).isCore),attention=core.filter(p=>['needs_you','blocked'].includes(p.state)).length;$('#statusLine').textContent=`${core.length} core missions${attention?` · ${attention} need your attention`:''}. The roadmap is explicit where the repository owns a .harness/roadmap.json; everything else stays secondary.`;$('#syncState').textContent='SNAPSHOT READY';renderPulse();renderWins();renderProjects();renderSystem();
}
async function getJson(url){const res=await fetch(url,{cache:'no-store'});if(!res.ok)throw new Error(`HTTP ${res.status}`);return res.json()}
async function load(){const button=$('#refresh');button.disabled=true;$('#syncState').textContent='SYNCING';try{try{data=await getJson(`./mission-control.json?ts=${Date.now()}`)}catch{data=await getJson('/api/mission-control')}render()}catch(error){$('#syncState').textContent='OFFLINE';$('#coreGrid').innerHTML=`<div class="empty">Mission Control could not read portfolio state: ${esc(error.message)}</div>`}finally{button.disabled=false}}
$('#refresh').addEventListener('click',load);load();
