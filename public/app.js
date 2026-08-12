const $ = (q) => document.querySelector(q);
const $$ = (q) => [...document.querySelectorAll(q)];
const STORAGE_KEY = 'council-v4-company-state';

const AUTONOMY = {
  observe: { label:'Observe', note:'Can analyse and comment only.' },
  recommend: { label:'Recommend', note:'Can propose plans and internal tasks.' },
  approval: { label:'Act with approval', note:'Can prepare actions; human approves side effects.' },
  autonomous: { label:'Autonomous', note:'May execute pre-approved low-risk work when tools are connected.' }
};

const DEFAULT_AGENTS = [
  { id:'chief', avatar:'✦', name:'Chief of Staff', role:'Orchestration & Founder Office', department:'Executive', prompt:'Run the company operating rhythm. Turn the founder’s direction into priorities, route work to specialists, surface only decisions that genuinely need the founder, notice blockers and close loops. Summon the most relevant specialist instead of doing their job yourself.', temperature:.45, model:'inherit', reasoning:'medium', tools:{web:false}, enabled:true, autonomy:'approval' },
  { id:'builder', avatar:'🛠️', name:'Builder', role:'Product & Engineering', department:'Product', prompt:'Turn ideas into shippable systems. Find the smallest useful version, architecture, bottleneck, test and concrete next move. Prefer working software and measurable proof over theatre.', temperature:.55, model:'inherit', reasoning:'low', tools:{web:false}, enabled:true, autonomy:'approval' },
  { id:'designer', avatar:'◐', name:'Designer', role:'Experience & Story', department:'Product', prompt:'Make complex systems understandable, calm, beautiful and humane. Think in flows, hierarchy, interaction, emotion and progressive disclosure. Remove interface noise before adding decoration.', temperature:.72, model:'inherit', reasoning:'low', tools:{web:false}, enabled:true, autonomy:'recommend' },
  { id:'scientist', avatar:'🔬', name:'Scientist', role:'Evidence & Research', department:'Research', prompt:'Separate evidence from assumptions. Look for mechanisms, uncertainty, falsification, high-quality sources and what would change our mind. Use web research when current evidence matters.', temperature:.35, model:'inherit', reasoning:'medium', tools:{web:true}, enabled:true, autonomy:'recommend' },
  { id:'critic', avatar:'♟', name:'Critic', role:'Red Team & Risk', department:'Research', prompt:'Attack the strongest version of the plan. Find hidden assumptions, failure modes, second-order effects, security issues and coordination costs. Be constructive, specific and willing to say stop.', temperature:.45, model:'inherit', reasoning:'medium', tools:{web:false}, enabled:true, autonomy:'recommend' },
  { id:'humanist', avatar:'🌱', name:'Humanist', role:'People & Impact', department:'Impact', prompt:'Protect dignity, agency, inclusion and long-term human flourishing. Notice who benefits, who pays, who is unseen and whether the system actually reduces suffering.', temperature:.6, model:'inherit', reasoning:'low', tools:{web:false}, enabled:true, autonomy:'recommend' },
  { id:'capital', avatar:'◈', name:'Capital', role:'Business & Finance', department:'Business', prompt:'Test economic reality. Ask who pays, why now, distribution, margins, incentives, defensibility, scale and whether the business model strengthens the mission.', temperature:.45, model:'inherit', reasoning:'low', tools:{web:true}, enabled:true, autonomy:'recommend' },
  { id:'operator', avatar:'▦', name:'Operator', role:'Operations & Delivery', department:'Operations', prompt:'Turn decisions into repeatable execution. Clarify owner, sequence, dependencies, cadence, definition of done and where automation should replace coordination overhead.', temperature:.4, model:'inherit', reasoning:'low', tools:{web:false}, enabled:true, autonomy:'approval' },
  { id:'growth', avatar:'↗', name:'Growth', role:'Distribution & Partnerships', department:'Business', prompt:'Find the shortest honest path to users, partners and proof of demand. Think positioning, outreach, distribution loops, partnerships and learning speed without manipulative growth tactics.', temperature:.65, model:'inherit', reasoning:'low', tools:{web:true}, enabled:true, autonomy:'recommend' }
];

const now = () => Date.now();
const uid = (prefix='id') => `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,6)}`;
const esc = (s='') => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const humanize = (s='') => String(s).replace(/[_-]/g,' ');
const clamp = (n,a,b) => Math.max(a,Math.min(b,n));

function makeRoom(name='Company HQ', id=uid('room')) {
  return { id, name, goal:'Help Council Labs turn strategy into useful work. Challenge assumptions, assign concrete next actions, remember durable decisions, and surface founder decisions only when necessary.', messages:[], memories:{}, tasks:[], graphEdges:[], pulse:[] };
}

function seedState(){
  const hq = makeRoom('Company HQ','company-hq');
  const product = makeRoom('Council v4','council-v4-room');
  product.goal = 'Ship Council v4 as a genuinely useful Company OS: executive clarity, project ownership, agent collaboration, decisions, memory and safe autonomy.';
  return {
    version:4,
    company:{
      name:'Council Labs',
      number:'001',
      mission:'Council exists to turn ambitious ideas into evidence, decisions and useful things — without losing humanity along the way.',
      focus:'Ship Company OS v4',
      founder:'Michael',
      principles:['Make complexity understandable.','Evidence before theatre.','Humans keep consequential judgement.','Build the smallest thing that can fail honestly.','Reduce suffering; expand agency.']
    },
    agents:DEFAULT_AGENTS,
    mode:'orchestrated',
    rooms:[hq,product],
    activeRoomId:'company-hq',
    activeView:'dashboard',
    projects:[
      {id:'council-v4',emoji:'✦',name:'Council Company OS',owner:'builder',roomId:'council-v4-room',status:'active',health:'on-track',progress:68,goal:'Turn Council from a multi-agent chat into an AI-native company operating system.',milestone:'Founder dashboard + company cycle',due:'This week',updatedAt:now()},
      {id:'live-agents',emoji:'⚡',name:'Live agent infrastructure',owner:'operator',roomId:'company-hq',status:'blocked',health:'blocked',progress:55,goal:'Run real OpenAI-backed agents reliably in the deployed product.',milestone:'Configure OPENAI_API_KEY in Vercel and verify live cycle',due:'Next',updatedAt:now()-3600000},
      {id:'repo-factory',emoji:'🏭',name:'Repo Factory',owner:'builder',roomId:'company-hq',status:'active',health:'on-track',progress:92,goal:'Create new GitHub repositories from an approved Council workflow.',milestone:'Connect approved company projects to factory requests',due:'Later',updatedAt:now()-7200000}
    ],
    decisions:[
      {id:'decision-home',title:'Make Company OS the default Council home?',context:'v4 changes Council from chat-first to executive-dashboard-first. Chat remains a first-class tool inside the company.',options:['Yes — executive first','Keep chat as the default'],recommendations:[{agent:'chief',choice:0,note:'The founder should see decisions and blockers before conversation.'},{agent:'builder',choice:0,note:'It makes the product behaviour match the Company OS thesis.'},{agent:'critic',choice:0,note:'Only if chat stays one click away and the dashboard does not become decorative reporting.'}],status:'open',createdAt:now()},
      {id:'decision-autonomy',title:'How much autonomy should v4 expose?',context:'The interface can model permissions now, while keeping real external side effects behind human approval until tools and audit trails mature.',options:['Model permissions; keep side effects human-approved','Enable autonomous external actions immediately'],recommendations:[{agent:'critic',choice:0,note:'Permissions without auditability are theatre; side effects need explicit gates.'},{agent:'operator',choice:0,note:'Start with internal tasks and prepared actions, then promote proven workflows.'}],status:'open',createdAt:now()-1000}
    ],
    memory:[
      {id:'mem-1',category:'mission',title:'Company #001',body:'Council Labs is using Council itself as the first company operated through Council.',createdAt:now()},
      {id:'mem-2',category:'decision',title:'Company direction',body:'Council v4 should behave like a company operating system rather than a collection of chat personas.',createdAt:now()-5000},
      {id:'mem-3',category:'lesson',title:'Repo creation bottleneck removed',body:'Repo Factory successfully created a private test repository end-to-end through a GitHub issue workflow.',createdAt:now()-10000}
    ],
    activity:[
      {id:uid('act'),icon:'🏭',text:'Repo Factory completed its first end-to-end repository creation.',at:now()-120000},
      {id:uid('act'),icon:'✦',text:'Council v4 Company OS became the company’s primary product focus.',at:now()-60000}
    ],
    lastCycleAt:null,
    lastBriefing:null
  };
}

let state;
try { state = JSON.parse(localStorage.getItem(STORAGE_KEY)) || seedState(); } catch { state = seedState(); }
if (!state.version || state.version < 4) state = seedState();
state.agents ||= DEFAULT_AGENTS;
state.company ||= seedState().company;
state.projects ||= [];
state.decisions ||= [];
state.memory ||= [];
state.activity ||= [];
state.rooms ||= [makeRoom('Company HQ','company-hq')];
state.activeRoomId ||= state.rooms[0].id;
state.activeView ||= 'dashboard';
state.mode ||= 'orchestrated';

const save = () => localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
const room = () => state.rooms.find(r=>r.id===state.activeRoomId) || state.rooms[0];
const agentById = (id) => state.agents.find(a=>a.id===id);
const projectById = (id) => state.projects.find(p=>p.id===id);

function timeAgo(ts){
  if(!ts) return 'never';
  const sec=Math.max(1,Math.floor((Date.now()-ts)/1000));
  if(sec<60)return `${sec}s ago`; const min=Math.floor(sec/60); if(min<60)return `${min}m ago`; const hr=Math.floor(min/60); if(hr<24)return `${hr}h ago`; return `${Math.floor(hr/24)}d ago`;
}

function toast(msg){const el=$('#toast');el.textContent=msg;el.classList.remove('hidden');clearTimeout(toast.t);toast.t=setTimeout(()=>el.classList.add('hidden'),2200);}
function openModal(html){$('#modalBody').innerHTML=html;$('#modal').classList.remove('hidden');$('#modal').setAttribute('aria-hidden','false');}
function closeModal(){$('#modal').classList.add('hidden');$('#modal').setAttribute('aria-hidden','true');}
$$('[data-close-modal]').forEach(x=>x.onclick=closeModal);

function setView(view){
  state.activeView=view; save();
  $$('.view').forEach(v=>v.classList.toggle('active',v.id===`view-${view}`));
  $$('.nav-item').forEach(b=>b.classList.toggle('active',b.dataset.view===view));
  const meta={
    dashboard:['FOUNDER DESK',`Good afternoon, ${state.company.founder||'Founder'}.`],
    chat:['COMPANY CHAT',room().name],
    projects:['PORTFOLIO','Projects'],
    decisions:['FOUNDER QUEUE','Decisions'],
    team:['ORGANISATION','Team'],
    memory:['INSTITUTIONAL MEMORY','Company memory']
  }[view]||['COUNCIL','Company'];
  $('#viewEyebrow').textContent=meta[0]; $('#viewTitle').textContent=meta[1];
  if(view==='chat') renderChat();
}

function renderShell(){
  $('#companyNameSide').textContent=state.company.name;
  const openDecisions=state.decisions.filter(d=>d.status==='open').length;
  $('#navDecisionCount').textContent=openDecisions; $('#navDecisionCount2').textContent=openDecisions;
  $('#navChatCount').textContent=state.rooms.reduce((n,r)=>n+r.messages.length,0);
  $('#navProjectCount').textContent=state.projects.filter(p=>p.status!=='done').length;
  $('#navTeamCount').textContent=state.agents.filter(a=>a.enabled!==false).length;
  $('#navMemoryCount').textContent=state.memory.length;
  $('#projectRoomList').innerHTML=state.projects.slice(0,6).map(p=>`<button class="room-link" data-room="${esc(p.roomId)}"><span>${esc(p.emoji||'◇')}</span><b>${esc(p.name)}</b><i class="status-dot ${esc(p.health||'on-track')}"></i></button>`).join('');
  $$('[data-room]').forEach(b=>b.onclick=()=>{state.activeRoomId=b.dataset.room;save();setView('chat');renderChat();renderShell();});
}

function renderDashboard(){
  $('#companyMissionText').textContent=state.company.mission;
  $('#currentFocus').textContent=state.company.focus;
  $('#cycleStamp').textContent=state.lastCycleAt?`Last company cycle ${timeAgo(state.lastCycleAt)}`:'No cycle run yet';
  $('#metricDecisions').textContent=state.decisions.filter(d=>d.status==='open').length;
  const openTasks=state.rooms.flatMap(r=>r.tasks||[]).filter(t=>!t.done).length;
  $('#metricTasks').textContent=openTasks;
  $('#metricProjects').textContent=state.projects.filter(p=>p.status!=='done').length;

  const briefing = state.lastBriefing || {
    conclusion:'Council v4 is the company’s highest-leverage project. The interface is becoming an operating system; the remaining proof is whether a real agent cycle can turn company state into useful action.',
    tension:'The product can look like a company before it can truly act like one. Keep the dashboard tied to real tasks, decisions and agent work.',
    next:'Ship v4, configure the live OpenAI key on Vercel, then run the first real company cycle on Council itself.'
  };
  $('#founderBriefing').innerHTML=`<div class="brief-row"><span>01</span><div><b>Where we are</b><p>${esc(briefing.conclusion||briefing.where||'')}</p></div></div><div class="brief-row"><span>02</span><div><b>Watch this</b><p>${esc(briefing.tension||'No unresolved tension recorded.')}</p></div></div><div class="brief-row accent"><span>03</span><div><b>Best next move</b><p>${esc(briefing.next||'Run a company cycle.')}</p></div></div>`;

  const open=state.decisions.filter(d=>d.status==='open').slice(0,3);
  $('#dashboardDecisions').innerHTML=open.length?open.map(decisionCard).join(''):`<div class="empty-state">Nothing needs you right now. That is the dream. ☕</div>`;
  $('#dashboardProjects').innerHTML=state.projects.slice(0,5).map(projectRow).join('');
  $('#activityFeed').innerHTML=state.activity.slice().sort((a,b)=>b.at-a.at).slice(0,7).map(a=>`<div class="activity-item"><span>${esc(a.icon||'·')}</span><div><p>${esc(a.text)}</p><small>${timeAgo(a.at)}</small></div></div>`).join('') || `<div class="empty-state">No activity yet.</div>`;
}

function projectRow(p){const owner=agentById(p.owner);return `<button class="project-row" data-project="${esc(p.id)}"><span class="project-icon">${esc(p.emoji||'◇')}</span><span class="project-main"><strong>${esc(p.name)}</strong><small>${esc(p.milestone||p.goal||'')}</small></span><span class="project-owner">${owner?`${esc(owner.avatar)} ${esc(owner.name)}`:'Unassigned'}</span><span class="progress-wrap"><i style="width:${clamp(Number(p.progress)||0,0,100)}%"></i></span><span class="health ${esc(p.health||'on-track')}">${esc(humanize(p.health||'on-track'))}</span></button>`;}

function decisionCard(d){
  const recs=(d.recommendations||[]).slice(0,3).map(r=>{const a=agentById(r.agent);return a?`<span title="${esc(r.note||'')}">${esc(a.avatar)} ${esc(d.options?.[r.choice]||'')}</span>`:''}).join('');
  return `<article class="decision-card ${d.status!=='open'?'resolved':''}" data-decision="${esc(d.id)}"><div class="decision-top"><span>${d.status==='open'?'Needs you':'Decided'}</span><small>${timeAgo(d.createdAt)}</small></div><h4>${esc(d.title)}</h4><p>${esc(d.context||'')}</p><div class="recommendations">${recs}</div>${d.status==='open'?`<div class="decision-actions">${(d.options||[]).map((o,i)=>`<button data-decide="${esc(d.id)}:${i}">${esc(o)}</button>`).join('')}</div>`:`<div class="decision-result">✓ ${esc(d.options?.[d.choice]||d.result||'Resolved')}</div>`}</article>`;
}

function renderProjects(){
  $('#projectGrid').innerHTML=state.projects.map(p=>{const owner=agentById(p.owner);const r=state.rooms.find(x=>x.id===p.roomId);const tasks=(r?.tasks||[]).filter(t=>!t.done).length;return `<article class="project-card" data-project="${esc(p.id)}"><div class="project-card-top"><span class="project-icon big">${esc(p.emoji||'◇')}</span><span class="health ${esc(p.health||'on-track')}">${esc(humanize(p.health||'on-track'))}</span></div><h3>${esc(p.name)}</h3><p>${esc(p.goal||'')}</p><div class="project-progress"><div><span>Progress</span><b>${clamp(Number(p.progress)||0,0,100)}%</b></div><i><em style="width:${clamp(Number(p.progress)||0,0,100)}%"></em></i></div><div class="project-meta"><span><small>Owner</small><b>${owner?`${esc(owner.avatar)} ${esc(owner.name)}`:'Unassigned'}</b></span><span><small>Open work</small><b>${tasks} tasks</b></span></div><div class="milestone"><span>Next milestone</span><strong>${esc(p.milestone||'Define next milestone')}</strong></div><button class="wide-btn" data-open-project="${esc(p.id)}">Open project room →</button></article>`;}).join('');
  $$('[data-open-project]').forEach(b=>b.onclick=e=>{e.stopPropagation();const p=projectById(b.dataset.openProject);if(p){state.activeRoomId=p.roomId;save();setView('chat');renderAll();}});
}

function renderDecisions(){
  const sorted=[...state.decisions].sort((a,b)=>(a.status==='open'?0:1)-(b.status==='open'?0:1)||b.createdAt-a.createdAt);
  $('#decisionBoard').innerHTML=sorted.length?sorted.map(decisionCard).join(''):`<div class="empty-state large">No founder decisions queued.</div>`;
  $$('[data-decide]').forEach(b=>b.onclick=()=>resolveDecision(b.dataset.decide));
}

function resolveDecision(spec){
  const [id,idx]=spec.split(':'); const d=state.decisions.find(x=>x.id===id); if(!d)return;
  d.status='decided'; d.choice=Number(idx); d.decidedAt=now();
  state.memory.push({id:uid('mem'),category:'decision',title:d.title,body:`Founder decided: ${d.options[d.choice]}.`,createdAt:now()});
  state.activity.unshift({id:uid('act'),icon:'◆',text:`Founder decided: ${d.title} → ${d.options[d.choice]}`,at:now()});
  save();renderAll();toast('Decision recorded in company memory.');
}

function renderTeam(){
  const departments=[...new Set(state.agents.filter(a=>a.enabled!==false).map(a=>a.department||'Other'))];
  $('#orgChart').innerHTML=`<div class="founder-node"><span>YOU</span><strong>${esc(state.company.founder||'Founder')}</strong><small>Founder / owner</small></div><div class="org-line"></div><div class="org-departments">${departments.map(d=>`<div><span>${esc(d)}</span><strong>${state.agents.filter(a=>a.enabled!==false&&(a.department||'Other')===d).length}</strong></div>`).join('')}</div>`;
  $('#teamGrid').innerHTML=state.agents.map(a=>`<article class="agent-card ${a.enabled===false?'disabled':''}"><div class="agent-card-top"><span class="agent-avatar big">${esc(a.avatar)}</span><button class="toggle ${a.enabled===false?'':'on'}" data-agent-toggle="${esc(a.id)}"><i></i></button></div><span class="dept">${esc(a.department||'Company')}</span><h3>${esc(a.name)}</h3><p>${esc(a.role)}</p><div class="agent-prompt">${esc(a.prompt)}</div><div class="agent-settings"><label>Authority<select data-autonomy="${esc(a.id)}">${Object.entries(AUTONOMY).map(([k,v])=>`<option value="${k}" ${a.autonomy===k?'selected':''}>${esc(v.label)}</option>`).join('')}</select></label><div class="tool-row"><span>${a.tools?.web?'⌕ Web research':'○ No web'}</span><span>${a.model&&a.model!=='inherit'?esc(a.model):'Model: company default'}</span></div></div><button class="wide-btn subtle" data-edit-agent="${esc(a.id)}">Edit role</button></article>`).join('');
  $$('[data-agent-toggle]').forEach(b=>b.onclick=()=>{const a=agentById(b.dataset.agentToggle);a.enabled=a.enabled===false;save();renderAll();});
  $$('[data-autonomy]').forEach(s=>s.onchange=()=>{const a=agentById(s.dataset.autonomy);a.autonomy=s.value;save();toast(`${a.name}: ${AUTONOMY[a.autonomy].label}`);});
  $$('[data-edit-agent]').forEach(b=>b.onclick=()=>editAgent(b.dataset.editAgent));
}

function renderMemory(){
  const cats=['mission','principle','decision','lesson'];
  $('#companyMemoryGrid').innerHTML=cats.map(cat=>{const items=state.memory.filter(m=>m.category===cat);const seeded=cat==='principle'?state.company.principles.map((p,i)=>({id:`principle-${i}`,title:`Principle ${String(i+1).padStart(2,'0')}`,body:p,createdAt:0,locked:true})):[];const all=[...seeded,...items];return `<section class="memory-column card"><div class="memory-column-head"><span>${cat.toUpperCase()}</span><b>${all.length}</b></div>${all.length?all.map(m=>`<article class="company-memory"><small>${m.createdAt?timeAgo(m.createdAt):'company constitution'}</small><h4>${esc(m.title)}</h4><p>${esc(m.body)}</p>${!m.locked?`<button data-forget-company="${esc(m.id)}">×</button>`:''}</article>`).join(''):`<div class="empty-state">Nothing recorded.</div>`}</section>`;}).join('');
  $$('[data-forget-company]').forEach(b=>b.onclick=()=>{state.memory=state.memory.filter(m=>m.id!==b.dataset.forgetCompany);save();renderAll();});
}

function linkifyMentions(text=''){
  let safe=esc(text).replace(/\n/g,'<br>');
  for(const a of state.agents){const names=[a.name,a.id].map(x=>x.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')).join('|');safe=safe.replace(new RegExp(`@(${names})`,'gi'),'<span class="inline-mention">@$1</span>');}
  return safe;
}
function sourcesHtml(sources=[]){return sources?.length?`<div class="source-row">${sources.slice(0,5).map((s,i)=>`<a href="${esc(s.url)}" target="_blank" rel="noreferrer">${i+1} · ${esc((s.title||'Source').slice(0,36))}</a>`).join('')}</div>`:'';}
function messageHtml(m){
  if(m.role==='user')return `<article class="message user"><div class="bubble">${linkifyMentions(m.content)}</div></article>`;
  const a=agentById(m.agentId);const orch=m.role==='orchestrator';const avatar=orch?'✦':(m.avatar||a?.avatar||'✧');const name=m.name||(orch?'Orchestrator':a?.name||'Agent');const label=orch?'Council synthesis':(m.roleLabel||a?.role||'Agent');const model=m.model&&m.model!=='demo-mode'?`<span class="chip">${esc(m.model)}</span>`:'';const tools=(m.toolCalls||[]).length?`<span class="chip">⌕ ${esc(m.toolCalls.map(humanize).join(', '))}</span>`:'';return `<article class="message ${orch?'orchestrator':''}"><div class="msg-avatar">${esc(avatar)}</div><div class="msg-body"><div class="msg-head"><strong>${esc(name)}</strong><span>${esc(label)}</span>${model}${tools}</div><div class="bubble">${linkifyMentions(m.content)}</div>${sourcesHtml(m.sources)}</div></article>`;
}

function renderChat(){
  const r=room(); $('#chatRoomTitle').textContent=r.name; $('#chatRoomEyebrow').textContent=`# ${r.id.replace(/-room$/,'')}`; $('#roomGoal').value=r.goal||'';
  const messages=r.messages||[];
  $('#chat').innerHTML=messages.length?messages.map(messageHtml).join(''):`<div class="chat-welcome"><div class="welcome-star">✦</div><span class="eyebrow">COMPANY CHAT</span><h2>Give the company direction.</h2><p>Ask normally, invite a specialist, or ask <strong>@Chief of Staff</strong> to turn the room into a coordinated company discussion.</p><div class="starter-grid"><button class="starter">@Chief of Staff, what needs my attention today?</button><button class="starter">@Critic, what are we pretending is working?</button><button class="starter">@Builder, what is the smallest thing we should ship next?</button></div></div>`;
  $$('.starter').forEach(b=>b.onclick=()=>{$('#messageInput').value=b.textContent;$('#messageInput').focus();autoGrow();});
  $('#chat').scrollTop=$('#chat').scrollHeight;
  renderRoomTasks();renderRoomMemory();
  $$('.segmented [data-mode]').forEach(b=>b.classList.toggle('active',b.dataset.mode===state.mode));
}
function renderRoomTasks(){const r=room();const tasks=[...(r.tasks||[])].sort((a,b)=>Number(a.done)-Number(b.done));$('#taskList').innerHTML=tasks.length?tasks.map(t=>{const owner=agentById(t.owner);return `<div class="task-card ${t.done?'done':''}"><button class="task-check" data-task-toggle="${esc(t.id)}">${t.done?'✓':''}</button><div><strong>${esc(t.title)}</strong><span>${owner?`${esc(owner.avatar)} ${esc(owner.name)}`:esc(t.owner==='human'?'You':t.owner||'Unassigned')} · ${esc(t.priority||'medium')}</span></div><button class="task-remove" data-task-remove="${esc(t.id)}">×</button></div>`;}).join(''):`<div class="empty-state">No open work in this room.</div>`;$$('[data-task-toggle]').forEach(b=>b.onclick=()=>{const t=r.tasks.find(x=>x.id===b.dataset.taskToggle);t.done=!t.done;state.activity.unshift({id:uid('act'),icon:t.done?'✓':'↺',text:`${t.done?'Completed':'Reopened'}: ${t.title}`,at:now()});save();renderAll();});$$('[data-task-remove]').forEach(b=>b.onclick=()=>{r.tasks=r.tasks.filter(x=>x.id!==b.dataset.taskRemove);save();renderAll();});}
function renderRoomMemory(){const r=room();const items=[];for(const a of state.agents)for(const m of(r.memories?.[a.id]||[]))items.push({a,m});$('#roomMemory').innerHTML=items.length?items.slice(-8).reverse().map(({a,m})=>`<div class="memory-mini-item"><span>${esc(a.avatar)}</span><p>${esc(m)}</p></div>`).join(''):`<div class="empty-state">No durable room memory yet.</div>`;}

function renderAll(){renderShell();renderDashboard();renderProjects();renderDecisions();renderTeam();renderMemory();setView(state.activeView);}

async function checkStatus(){
  try{const res=await fetch('/api/status');const data=await res.json();const pill=$('#connectionPill');pill.classList.toggle('live',!!data.live);pill.innerHTML=`<i></i><span>${data.live?`AI live · ${esc(data.model||'OpenAI')}`:'Demo mode · add OPENAI_API_KEY'}</span>`;}catch{$('#connectionPill').innerHTML='<i></i><span>Local UI · API unavailable</span>';}
}

function applyCouncilResult(data,r){
  for(const reply of data.replies||[])r.messages.push({role:'assistant',agentId:reply.agentId,name:reply.name,avatar:reply.avatar,roleLabel:reply.role,content:reply.content,model:reply.model,sources:reply.sources||[],toolCalls:reply.toolCalls||[]});
  if(data.synthesis?.content)r.messages.push({role:'orchestrator',name:'Orchestrator',content:data.synthesis.content,model:data.synthesis.model,sources:data.synthesis.sources||[],toolCalls:data.synthesis.toolCalls||[]});
  r.graphEdges=data.edges||[];r.pulse=data.invited||[];r.memories||={};
  for(const update of data.memoryUpdates||[]){r.memories[update.agentId]||=[];if(!r.memories[update.agentId].includes(update.note))r.memories[update.agentId].push(update.note);r.memories[update.agentId]=r.memories[update.agentId].slice(-12);}
  for(const task of data.tasks||[]){if(!(r.tasks||[]).some(t=>!t.done&&t.title===task.title)){r.tasks.push({id:uid('task'),title:task.title,owner:task.owner||'human',priority:task.priority||'medium',done:false,createdAt:now()});state.activity.unshift({id:uid('act'),icon:'▦',text:`New mission: ${task.title}`,at:now()});}}
}

async function sendMessage(text,{companyCycle=false}={}){
  const r=room(); if(!text?.trim())return;
  const userMessage={role:'user',name:'You',content:text.trim(),createdAt:now()};r.messages.push(userMessage);save();renderChat();
  $('#messageInput').value='';autoGrow();
  const send=$('.send-btn');send.disabled=true;send.textContent='…';
  try{
    const payload={text:text.trim(),agents:state.agents.filter(a=>a.enabled!==false),messages:r.messages.slice(0,-1),mode:state.mode,councilGoal:r.goal,memories:r.memories||{}};
    const res=await fetch('/api/council',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});const data=await res.json();if(!res.ok)throw new Error(data.error||'Council request failed');
    applyCouncilResult(data,r);
    if(companyCycle){
      state.lastCycleAt=now();
      const synth=data.synthesis?.content||'';
      state.lastBriefing=parseBriefing(synth);
      state.activity.unshift({id:uid('act'),icon:'✦',text:`Company cycle completed with ${(data.invited||[]).length||'several'} agent voices.`,at:now()});
    }
    save();renderAll();
  }catch(err){r.messages.push({role:'orchestrator',name:'System',content:`Company cycle failed: ${err.message}`});save();renderAll();toast(err.message);}finally{send.disabled=false;send.textContent='↑';}
}

function parseBriefing(text=''){
  const cleaned=text.replace(/^Council synthesis:\s*/i,'').trim();
  const parts=cleaned.split(/\n+/).map(x=>x.replace(/^[-*\d.()\s]+/,'').trim()).filter(Boolean);
  return {conclusion:parts[0]||cleaned||'Company cycle completed.',tension:parts[1]||'No major unresolved tension surfaced.',next:parts[2]||parts[parts.length-1]||'Review the company chat.'};
}

function companySnapshot(){
  const projects=state.projects.map(p=>`${p.name}: ${p.status}, ${p.progress}% — next: ${p.milestone}`).join('\n');
  const decisions=state.decisions.filter(d=>d.status==='open').map(d=>`- ${d.title}`).join('\n')||'- none';
  const tasks=state.rooms.flatMap(r=>(r.tasks||[]).filter(t=>!t.done).map(t=>`- ${t.title} (${t.owner||'unassigned'}, ${t.priority||'medium'})`)).join('\n')||'- none';
  return `COMPANY: ${state.company.name} (#${state.company.number})\nMISSION: ${state.company.mission}\nFOUNDER FOCUS: ${state.company.focus}\n\nPROJECTS\n${projects}\n\nFOUNDER DECISIONS\n${decisions}\n\nOPEN MISSIONS\n${tasks}`;
}

async function runCompanyCycle(){
  state.activeRoomId='company-hq';state.activeView='chat';save();renderAll();
  const prompt=`@Chief of Staff, run the company operating cycle for Council itself. Read the company snapshot below, identify the single highest-leverage priority, bring in the specialists you genuinely need, challenge any false progress, create at most two concrete internal tasks, and end with what the founder needs to know or decide.\n\n${companySnapshot()}`;
  $('#runCycleBtn').disabled=true;$('#runCycleBtn').innerHTML='<span>✦</span> Company thinking…';
  await sendMessage(prompt,{companyCycle:true});
  $('#runCycleBtn').disabled=false;$('#runCycleBtn').innerHTML='<span>✦</span> Run company cycle';
}

function editAgent(id){const a=agentById(id);if(!a)return;openModal(`<div class="modal-eyebrow">EDIT AGENT</div><h2>${esc(a.avatar)} ${esc(a.name)}</h2><form id="agentForm" class="form-stack"><label>Name<input name="name" value="${esc(a.name)}" required></label><label>Role<input name="role" value="${esc(a.role)}" required></label><label>Department<input name="department" value="${esc(a.department||'Company')}"></label><label>Operating prompt<textarea name="prompt" rows="7">${esc(a.prompt)}</textarea></label><div class="form-grid"><label>Model<input name="model" value="${esc(a.model||'inherit')}" placeholder="inherit"></label><label>Reasoning<select name="reasoning">${['low','medium','high'].map(x=>`<option ${a.reasoning===x?'selected':''}>${x}</option>`).join('')}</select></label></div><label class="check-label"><input type="checkbox" name="web" ${a.tools?.web?'checked':''}> Allow live web research</label><button class="primary-btn" type="submit">Save agent</button></form>`);$('#agentForm').onsubmit=e=>{e.preventDefault();const f=new FormData(e.currentTarget);a.name=f.get('name').trim();a.role=f.get('role').trim();a.department=f.get('department').trim();a.prompt=f.get('prompt').trim();a.model=f.get('model').trim()||'inherit';a.reasoning=f.get('reasoning');a.tools={...(a.tools||{}),web:f.get('web')==='on'};save();closeModal();renderAll();toast('Agent updated.');};}

function addAgent(){openModal(`<div class="modal-eyebrow">HIRE AGENT</div><h2>Add a specialist</h2><form id="hireForm" class="form-stack"><div class="form-grid"><label>Avatar<input name="avatar" value="✧" maxlength="4"></label><label>Name<input name="name" placeholder="Librarian" required></label></div><label>Role<input name="role" placeholder="Knowledge & Context" required></label><label>Department<input name="department" placeholder="Research"></label><label>Operating prompt<textarea name="prompt" rows="6" placeholder="What is this agent responsible for?"></textarea></label><button class="primary-btn" type="submit">Hire into Council</button></form>`);$('#hireForm').onsubmit=e=>{e.preventDefault();const f=new FormData(e.currentTarget);const name=f.get('name').trim();state.agents.push({id:name.toLowerCase().replace(/[^a-z0-9]+/g,'-'),avatar:f.get('avatar')||'✧',name,role:f.get('role').trim(),department:f.get('department').trim()||'Company',prompt:f.get('prompt').trim()||'Contribute your speciality clearly and constructively.',temperature:.5,model:'inherit',reasoning:'low',tools:{web:false},enabled:true,autonomy:'recommend'});save();closeModal();renderAll();};}

function addProjectFlow(){openModal(`<div class="modal-eyebrow">NEW PROJECT</div><h2>Turn an intention into owned work.</h2><form id="projectForm" class="form-stack"><div class="form-grid"><label>Emoji<input name="emoji" value="◇" maxlength="4"></label><label>Name<input name="name" placeholder="Peace Education" required></label></div><label>Goal<textarea name="goal" rows="3" placeholder="What should be true when this succeeds?" required></textarea></label><div class="form-grid"><label>Owner<select name="owner">${state.agents.filter(a=>a.enabled!==false).map(a=>`<option value="${esc(a.id)}">${esc(a.avatar)} ${esc(a.name)}</option>`).join('')}</select></label><label>First milestone<input name="milestone" placeholder="Ship pilot"></label></div><button class="primary-btn" type="submit">Create project + room</button></form>`);$('#projectForm').onsubmit=e=>{e.preventDefault();const f=new FormData(e.currentTarget);const name=f.get('name').trim();const id=name.toLowerCase().replace(/[^a-z0-9]+/g,'-')||uid('project');const r=makeRoom(name,`${id}-room`);r.goal=f.get('goal').trim();state.rooms.push(r);state.projects.push({id,emoji:f.get('emoji')||'◇',name,owner:f.get('owner'),roomId:r.id,status:'active',health:'on-track',progress:5,goal:r.goal,milestone:f.get('milestone').trim()||'Define first experiment',due:'Unscheduled',updatedAt:now()});state.activity.unshift({id:uid('act'),icon:f.get('emoji')||'◇',text:`New project created: ${name}`,at:now()});save();closeModal();renderAll();toast('Project and project room created.');};}

function addDecisionFlow(){openModal(`<div class="modal-eyebrow">FOUNDER DECISION</div><h2>Add something that genuinely needs a call.</h2><form id="decisionForm" class="form-stack"><label>Decision<input name="title" placeholder="What are we deciding?" required></label><label>Context<textarea name="context" rows="4"></textarea></label><label>Option A<input name="a" required></label><label>Option B<input name="b" required></label><button class="primary-btn" type="submit">Add to founder queue</button></form>`);$('#decisionForm').onsubmit=e=>{e.preventDefault();const f=new FormData(e.currentTarget);state.decisions.unshift({id:uid('decision'),title:f.get('title').trim(),context:f.get('context').trim(),options:[f.get('a').trim(),f.get('b').trim()],recommendations:[],status:'open',createdAt:now()});save();closeModal();renderAll();};}

function addMemoryFlow(){openModal(`<div class="modal-eyebrow">REMEMBER</div><h2>Add institutional memory</h2><form id="memoryForm" class="form-stack"><label>Category<select name="category"><option>lesson</option><option>decision</option><option>mission</option></select></label><label>Title<input name="title" required></label><label>Memory<textarea name="body" rows="5" required></textarea></label><button class="primary-btn" type="submit">Remember</button></form>`);$('#memoryForm').onsubmit=e=>{e.preventDefault();const f=new FormData(e.currentTarget);state.memory.unshift({id:uid('mem'),category:f.get('category'),title:f.get('title').trim(),body:f.get('body').trim(),createdAt:now()});save();closeModal();renderAll();};}

function editCompanyFlow(){openModal(`<div class="modal-eyebrow">COMPANY</div><h2>${esc(state.company.name)}</h2><form id="companyForm" class="form-stack"><label>Company name<input name="name" value="${esc(state.company.name)}"></label><label>Mission<textarea name="mission" rows="5">${esc(state.company.mission)}</textarea></label><label>Founder<input name="founder" value="${esc(state.company.founder||'')}"></label><button class="primary-btn" type="submit">Save company</button></form>`);$('#companyForm').onsubmit=e=>{e.preventDefault();const f=new FormData(e.currentTarget);state.company.name=f.get('name').trim();state.company.mission=f.get('mission').trim();state.company.founder=f.get('founder').trim();save();closeModal();renderAll();};}

$$('.nav-item').forEach(b=>b.onclick=()=>setView(b.dataset.view));
$$('[data-go]').forEach(b=>b.onclick=()=>setView(b.dataset.go));
$('#openChatBtn').onclick=()=>{state.activeRoomId='company-hq';save();setView('chat');renderAll();};
$('#runCycleBtn').onclick=runCompanyCycle;$('#refreshBriefing').onclick=runCompanyCycle;
$('#editCompany').onclick=editCompanyFlow;
$('#editFocus').onclick=()=>{const f=prompt('What is the company’s current focus?',state.company.focus);if(f?.trim()){state.company.focus=f.trim();state.activity.unshift({id:uid('act'),icon:'◎',text:`Founder focus changed to: ${f.trim()}`,at:now()});save();renderAll();}};
['addProject','addProjectPage','addProjectMini'].forEach(id=>$('#'+id).onclick=addProjectFlow);
$('#addDecision').onclick=addDecisionFlow;$('#addCompanyMemory').onclick=addMemoryFlow;$('#addAgent').onclick=addAgent;
$('#roomGoal').addEventListener('input',e=>{room().goal=e.target.value;save();});
$('#addTask').onclick=()=>{const title=prompt('Mission / task:');if(title?.trim()){room().tasks.push({id:uid('task'),title:title.trim(),owner:'human',priority:'medium',done:false,createdAt:now()});save();renderAll();}};
$$('.segmented [data-mode]').forEach(b=>b.onclick=()=>{state.mode=b.dataset.mode;save();renderChat();});

const input=$('#messageInput');
function autoGrow(){input.style.height='auto';input.style.height=Math.min(input.scrollHeight,150)+'px';renderMentionTray();}
input.addEventListener('input',autoGrow);input.addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();$('#composer').requestSubmit();}});
function renderMentionTray(){const m=input.value.match(/@([a-z0-9 _-]*)$/i);if(!m){$('#mentionTray').classList.add('hidden');return;}const q=m[1].toLowerCase().trim();const matches=state.agents.filter(a=>a.enabled!==false&&(a.name.toLowerCase().includes(q)||a.id.includes(q))).slice(0,7);if(!matches.length){$('#mentionTray').classList.add('hidden');return;}$('#mentionTray').innerHTML=matches.map(a=>`<button type="button" data-mention="${esc(a.id)}"><span>${esc(a.avatar)}</span><b>${esc(a.name)}</b><small>${esc(a.role)}</small></button>`).join('');$('#mentionTray').classList.remove('hidden');$$('[data-mention]').forEach(b=>b.onclick=()=>{const a=agentById(b.dataset.mention);input.value=input.value.replace(/@([a-z0-9 _-]*)$/i,`@${a.name} `);$('#mentionTray').classList.add('hidden');input.focus();autoGrow();});}
$('#composer').onsubmit=e=>{e.preventDefault();sendMessage(input.value);};

document.addEventListener('click',e=>{const dec=e.target.closest('[data-decide]');if(dec)resolveDecision(dec.dataset.decide);const proj=e.target.closest('[data-project]');if(proj&&!e.target.closest('[data-open-project]')){const p=projectById(proj.dataset.project);if(p){state.activeRoomId=p.roomId;save();setView('chat');renderAll();}}});

renderAll();checkStatus();
