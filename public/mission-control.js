const $=(s)=>document.querySelector(s);let data=null;
const esc=(v='')=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const age=(days)=>days===0?'today':Number.isFinite(days)?`${days}d ago`:'unknown';
const stateLabel=(state='')=>({needs_you:'NEEDS YOU',blocked:'BLOCKED',active:'MOVING',untracked:'SETUP NEEDED',idle:'QUIET',completed:'LAST TASK DONE',hidden:'HIDDEN'}[state]||String(state).replaceAll('_',' ').toUpperCase());
const repoUrl=(p)=>p?.repo?`https://github.com/${encodeURI(p.repo)}`:'';
const brief=(p)=>p?.brief||{};

function projectLane(p){return brief(p).lane||((p.state==='needs_you'||p.state==='blocked'||(p.daysSincePush??999)>14)?'on_deck':'in_motion')}
function latestWin(){
  const rows=(data.projects||[]).flatMap(p=>(brief(p).achievements||[]).map(a=>({...a,project:p.name}))).filter(a=>a.text);
  rows.sort((a,b)=>Date.parse(b.date||0)-Date.parse(a.date||0));return rows[0]||null;
}
function renderCelebration(){
  const win=latestWin(),el=$('#celebration');el.classList.remove('loading');
  if(!win){el.innerHTML='<span class="celebrate-icon">✦</span><div><span class="celebrate-label">RECENT WINS</span><strong>No recent achievement has been captured yet.</strong></div>';return;}
  el.innerHTML=`<span class="celebrate-icon">🎉</span><div><span class="celebrate-label">LATEST PORTFOLIO WIN · ${esc(win.project)}</span><strong>${esc(win.text)}</strong></div><small>${win.date?esc(new Date(win.date).toLocaleDateString()):''}</small>`;
}
function roadmapHtml(p){
  const b=brief(p),road=b.roadmap||{},items=road.items||[];
  if(!items.length)return '<div class="missing">No explicit roadmap section found in repository-owned docs yet. Mission Control is not inventing one.</div>';
  return `<ol class="roadmap-list">${items.map((item,i)=>`<li class="${item.done?'done':i===road.currentIndex?'current':''}"><span class="road-dot">${item.done?'✓':i===road.currentIndex?'→':'·'}</span><span>${esc(item.text)}</span></li>`).join('')}</ol><div class="source-note">SOURCE · ${esc(road.source||'repository roadmap')}</div>`;
}
function achievementsHtml(p){
  const wins=brief(p).achievements||[];
  if(!wins.length)return '<div class="missing">No recent commit-level achievements captured.</div>';
  return wins.map(w=>`<div class="achievement-row"><span>🎉</span><div><strong>${esc(w.text)}</strong><small>${w.date?esc(new Date(w.date).toLocaleDateString()):''}</small></div></div>`).join('');
}
function winsHtml(p){
  const wins=brief(p).nextWins||[];
  if(!wins.length)return '<li>Define the next explicit milestone from repository evidence.</li>';
  return wins.slice(0,3).map(w=>`<li>${esc(w)}</li>`).join('');
}
function card(p){
  const b=brief(p),href=repoUrl(p),latest=(b.achievements||[])[0];
  const purpose=b.purpose||'Purpose not yet captured in the harness or repository description.';
  const current=b.currentSummary||p.currentTask||p.reason||'No explicit current task is recorded.';
  const goal=b.currentGoal||b.nextWins?.[0]||'Define the next explicit milestone.';
  const story=`<div class="card-top"><div><h2>${esc(p.name)}</h2><div class="activity">last activity ${esc(age(p.daysSincePush))}</div></div><span class="state ${esc(p.state)}">${esc(b.statusLabel||stateLabel(p.state))}</span></div>
  <div class="purpose"><span>PURPOSE</span><p>${esc(purpose)}</p></div>
  <div class="current"><span>${b.goalMode==='next'?'NEXT GOAL':'CURRENT GOAL'}</span><strong>${esc(goal)}</strong><p>${esc(current)}</p></div>
  <div class="win"><span>🎉 RECENT WIN</span><strong>${esc(latest?.text||'No recent win captured yet.')}</strong></div>
  <div class="next-wins"><span>NEXT BIG WINS</span><ol>${winsHtml(p)}</ol></div>`;
  return `<details class="project-card ${esc(projectLane(p))}"><summary>${story}<div class="card-footer"><span>ROADMAP + HISTORY</span><span class="expand">⌄</span></div></summary><div class="story-detail"><section><h3>RECENT ACHIEVEMENTS</h3>${achievementsHtml(p)}</section><section><h3>ROADMAP</h3>${roadmapHtml(p)}</section><section class="evidence"><h3>EVIDENCE</h3><p>${esc(b.evidenceNote||'Purpose, task state, recent commits and repository roadmap material.')}</p>${href?`<a href="${href}" target="_blank" rel="noreferrer">OPEN REPOSITORY ↗</a>`:''}</section></div></details>`;
}
function renderLane(id,countId,rows){$(countId).textContent=`${rows.length} ${rows.length===1?'project':'projects'}`;$(id).innerHTML=rows.length?rows.map(card).join(''):'<div class="empty">Nothing in this lane right now.</div>'}
function renderProjects(){
  const rows=data.projects||[];
  const inMotion=rows.filter(p=>projectLane(p)==='in_motion');
  const onDeck=rows.filter(p=>projectLane(p)==='on_deck');
  const quiet=rows.filter(p=>!['in_motion','on_deck'].includes(projectLane(p)));
  renderLane('#inMotion','#inMotionCount',inMotion);renderLane('#onDeck','#onDeckCount',onDeck);
  $('#quietCount').textContent=`${quiet.length} ${quiet.length===1?'project':'projects'} · open when needed`;
  $('#quietProjects').innerHTML=quiet.length?quiet.map(card).join(''):'<div class="empty">No quiet projects.</div>';
  $('#onDeckSection').classList.toggle('hidden',!onDeck.length);
}
function renderSystem(){
  const s=data.summary||{},p=data.portfolio||{},generated=data.generatedAt?new Date(data.generatedAt).toLocaleString():'unknown';
  const withRoadmap=(data.projects||[]).filter(x=>brief(x).roadmap?.items?.length).length;
  const withPurpose=(data.projects||[]).filter(x=>brief(x).purpose).length;
  const items=[['SNAPSHOT',generated],['PUBLIC PROJECTS',data.projects?.length??0],['PURPOSE COVERAGE',`${withPurpose}/${data.projects?.length??0}`],['ROADMAP COVERAGE',`${withRoadmap}/${data.projects?.length??0}`],['HARNESS',`${s.harnessed??0}/${s.deepTracked??0} deeply tracked`],['SCOPE',String(data.scope||'unknown').replaceAll('_',' ')],['SAFETY',data.safety?.publicSafe?'public-safe · private details excluded':'runtime policy']];
  if(data.warning)items.push(['LIMITATION',data.warning]);
  $('#systemBody').innerHTML=items.map(([k,v])=>`<div class="system-item"><span>${esc(k)}</span><div>${esc(v)}</div></div>`).join('');
}
function render(){
  const rows=data.projects||[],moving=rows.filter(p=>projectLane(p)==='in_motion').length,attention=rows.filter(p=>['needs_you','blocked'].includes(p.state)).length;
  $('#statusLine').textContent=`${moving} ${moving===1?'project is':'projects are'} in motion${attention?` · ${attention} need attention`:''}. Each card keeps the purpose, state, wins and next moves together.`;
  $('#syncState').textContent='SNAPSHOT READY';renderCelebration();renderProjects();renderSystem();
}
async function getJson(url){const res=await fetch(url,{cache:'no-store'});if(!res.ok)throw new Error(`HTTP ${res.status}`);return res.json()}
async function load(){const button=$('#refresh');button.disabled=true;$('#syncState').textContent='SYNCING';try{try{data=await getJson(`./mission-control.json?ts=${Date.now()}`)}catch{data=await getJson('/api/mission-control')}render()}catch(error){$('#syncState').textContent='OFFLINE';$('#celebration').classList.remove('loading');$('#celebration').innerHTML=`<span class="celebrate-icon">!</span><div><span class="celebrate-label">MISSION CONTROL OFFLINE</span><strong>${esc(error.message)}</strong></div>`;$('#inMotion').innerHTML='<div class="empty">Check the latest GitHub Pages workflow.</div>'}finally{button.disabled=false}}
$('#refresh').addEventListener('click',load);load();
