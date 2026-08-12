const $ = (q) => document.querySelector(q);
const $$ = (q) => [...document.querySelectorAll(q)];
const STORAGE_KEY = 'council-v3-state';

const DEFAULT_AGENTS = [
  { id:'builder', avatar:'🛠️', name:'Builder', role:'Product & Engineering', prompt:'Turn ideas into shippable systems. Find the smallest useful version, architecture, bottleneck, test and concrete next move.', temperature:.55, model:'inherit', reasoning:'low', tools:{web:false}, enabled:true },
  { id:'scientist', avatar:'🔬', name:'Scientist', role:'Evidence & Research', prompt:'Separate evidence from assumptions. Look for mechanisms, uncertainty, falsification, high-quality sources and what would change our mind.', temperature:.35, model:'inherit', reasoning:'medium', tools:{web:true}, enabled:true },
  { id:'designer', avatar:'◐', name:'Designer', role:'Experience & Story', prompt:'Make complex systems understandable, calm, beautiful and humane. Think in flows, hierarchy, interaction, emotion and progressive disclosure.', temperature:.75, model:'inherit', reasoning:'low', tools:{web:false}, enabled:true },
  { id:'critic', avatar:'♟', name:'Critic', role:'Red Team', prompt:'Attack the strongest version of the idea. Find hidden assumptions, failure modes, second-order effects, security issues and coordination costs. Be constructive, not cynical.', temperature:.45, model:'inherit', reasoning:'medium', tools:{web:false}, enabled:true },
  { id:'humanist', avatar:'🌱', name:'Humanist', role:'People & Impact', prompt:'Protect dignity, agency, inclusion and long-term human flourishing. Notice who benefits, who pays, who is unseen and whether the system reduces suffering.', temperature:.6, model:'inherit', reasoning:'low', tools:{web:false}, enabled:true },
  { id:'capital', avatar:'◈', name:'Capital', role:'Business & Incentives', prompt:'Test economic reality. Ask who pays, why now, distribution, margins, incentives, defensibility, scale and whether the business model strengthens the mission.', temperature:.45, model:'inherit', reasoning:'low', tools:{web:true}, enabled:true }
];

function makeRoom(name='The Round Table') {
  const id = (name.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'') || 'room') + '-' + Math.random().toString(36).slice(2,6);
  return { id, name, goal:'Help me make wiser decisions, build useful things, reduce suffering, and turn good ideas into reality.', messages:[], memories:{}, tasks:[], graphEdges:[], pulse:[] };
}

function initialState() {
  let agents = DEFAULT_AGENTS;
  try {
    const old = JSON.parse(localStorage.getItem('council-agents-v2') || 'null');
    if (Array.isArray(old) && old.length) agents = old.map((a) => ({...a, model:a.model||'inherit', reasoning:a.reasoning||'low', tools:a.tools||{web:a.id==='scientist'||a.id==='capital'}}));
  } catch {}
  const room = makeRoom('The Round Table');
  room.id = 'main-room';
  return { agents, rooms:[room], activeRoomId:room.id, mode:'orchestrated' };
}

let state;
try { state = JSON.parse(localStorage.getItem(STORAGE_KEY)) || initialState(); } catch { state = initialState(); }
if (!Array.isArray(state.agents) || !state.agents.length) state.agents = DEFAULT_AGENTS;
if (!Array.isArray(state.rooms) || !state.rooms.length) state.rooms = [makeRoom()];
if (!state.activeRoomId || !state.rooms.some(r=>r.id===state.activeRoomId)) state.activeRoomId = state.rooms[0].id;
state.mode ||= 'orchestrated';

const room = () => state.rooms.find(r => r.id === state.activeRoomId) || state.rooms[0];
const agentById = (id) => state.agents.find(a => a.id === id);
const save = () => localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
const esc = (s='') => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const humanize = (s='') => String(s).replace(/[_-]/g,' ');

function renderRooms() {
  $('#roomList').innerHTML = state.rooms.map(r => `<button class="room-item ${r.id===state.activeRoomId?'active':''}" data-room="${esc(r.id)}"><span class="room-hash">#</span><span>${esc(r.name)}</span><small>${r.messages.length}</small></button>`).join('');
  $$('.room-item').forEach(btn => btn.onclick = () => { state.activeRoomId=btn.dataset.room; save(); renderAll(); });
  $('#roomTitle').textContent = room().name;
  $('#roomEyebrow').textContent = `# ${room().id.replace(/-[a-z0-9]{4}$/,'')}`;
  $('#councilGoal').value = room().goal || '';
}

function renderAgents() {
  $('#agentList').innerHTML = state.agents.map(a => `<div class="agent-row ${a.enabled===false?'off':''}">
    <button class="agent-main" data-edit="${esc(a.id)}"><span class="agent-avatar">${esc(a.avatar)}</span><span class="agent-copy"><strong>${esc(a.name)}</strong><small>${esc(a.role)}</small></span></button>
    <div class="agent-meta"><span title="Model">${a.model && a.model!=='inherit' ? esc(a.model.replace('gpt-','G')) : 'auto'}</span>${a.tools?.web?'<span title="Web research">⌕</span>':''}</div>
    <button class="toggle ${a.enabled===false?'':'on'}" data-toggle="${esc(a.id)}" title="Enable/disable"><i></i></button>
  </div>`).join('');
  $$('[data-edit]').forEach(b => b.onclick = () => editAgent(b.dataset.edit));
  $$('[data-toggle]').forEach(b => b.onclick = () => { const a=agentById(b.dataset.toggle); a.enabled=a.enabled===false; save(); renderAgents(); renderMap(); });
}

function linkifyMentions(text='') {
  let safe = esc(text);
  for (const a of state.agents) {
    const re = new RegExp(`@(${a.name.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}|${a.id.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')})`, 'gi');
    safe = safe.replace(re, '<span class="inline-mention">@$1</span>');
  }
  return safe;
}

function sourcesHtml(sources=[]) {
  if (!sources.length) return '';
  return `<div class="source-row">${sources.map((s,i)=>`<a href="${esc(s.url)}" target="_blank" rel="noreferrer" title="${esc(s.title||s.url)}">${i+1} · ${esc((s.title||'Source').slice(0,36))}</a>`).join('')}</div>`;
}

function messageHtml(m) {
  if (m.role === 'user') return `<article class="message user"><div class="bubble">${linkifyMentions(m.content)}</div></article>`;
  const a = agentById(m.agentId);
  const orchestrator = m.role === 'orchestrator';
  const avatar = orchestrator ? '✦' : (m.avatar || a?.avatar || '✧');
  const name = m.name || (orchestrator ? 'Orchestrator' : a?.name || 'Agent');
  const label = orchestrator ? 'Council synthesis' : (m.roleLabel || a?.role || 'Agent');
  const model = m.model && m.model !== 'demo-mode' ? `<span class="model-chip">${esc(m.model)}</span>` : '';
  const tools = (m.toolCalls||[]).length ? `<span class="tool-chip">⌕ ${esc((m.toolCalls||[]).map(humanize).join(', '))}</span>` : '';
  return `<article class="message ${orchestrator?'orchestrator':''}"><div class="msg-avatar">${esc(avatar)}</div><div><div class="msg-head"><strong>${esc(name)}</strong><span>${esc(label)}</span>${model}${tools}</div><div class="bubble">${linkifyMentions(m.content)}</div>${sourcesHtml(m.sources)}</div></article>`;
}

function renderChat() {
  const r=room();
  if (!r.messages.length) {
    $('#chat').innerHTML = `<div class="welcome"><div class="welcome-orbit"><span>✦</span></div><div class="eyebrow">A room of minds</div><h2>What should we think through together?</h2><p>Ask normally and the orchestrator selects the right voices. Or invite someone directly with <strong>@Builder</strong>, <strong>@Critic</strong> or <strong>@Scientist</strong>.</p><div class="starter-grid"><button class="starter">@Builder turn one of my ideas into a 7-day experiment.</button><button class="starter">@Critic attack the strongest assumption in my plan.</button><button class="starter">What should our team focus on this week?</button></div></div>`;
    $$('.starter').forEach(b=>b.onclick=()=>{$('#messageInput').value=b.textContent; $('#messageInput').focus(); autoGrow();});
  } else $('#chat').innerHTML = r.messages.map(messageHtml).join('');
  $('#chat').scrollTop = $('#chat').scrollHeight;
  $('#roomStats').textContent = `${r.memories ? Object.values(r.memories).flat().length : 0} memories · ${r.tasks.filter(t=>!t.done).length} open tasks`;
}

function renderMemory() {
  const r=room();
  const entries = [];
  for (const a of state.agents) for (const [index, memory] of (r.memories?.[a.id]||[]).entries()) entries.push({a,index,memory});
  $('#memoryCount').textContent = `${entries.length} note${entries.length===1?'':'s'}`;
  $('#memoryList').innerHTML = entries.length ? entries.map(({a,index,memory}) => `<div class="memory-card"><div class="memory-head"><span>${esc(a.avatar)}</span><strong>${esc(a.name)}</strong><button data-forget="${esc(a.id)}:${index}" title="Forget">×</button></div><p>${esc(memory)}</p></div>`).join('') : `<div class="empty-state">No durable memories yet. As the room makes decisions, agents can choose what is worth carrying forward.</div>`;
  $$('[data-forget]').forEach(b=>b.onclick=()=>{ const [id,i]=b.dataset.forget.split(':'); r.memories[id].splice(Number(i),1); save(); renderMemory(); renderChat(); });
}

function renderTasks() {
  const r=room();
  const sorted=[...r.tasks].sort((a,b)=>Number(a.done)-Number(b.done));
  $('#taskList').innerHTML = sorted.length ? sorted.map(t=>{const owner=agentById(t.owner);return `<div class="task-card ${t.done?'done':''}"><button class="task-check" data-task-toggle="${esc(t.id)}">${t.done?'✓':''}</button><div class="task-copy"><strong>${esc(t.title)}</strong><span>${owner?`${esc(owner.avatar)} ${esc(owner.name)}`:esc(t.owner==='human'?'You':t.owner||'Unassigned')} · ${esc(t.priority||'medium')}</span></div><button class="task-remove" data-task-remove="${esc(t.id)}">×</button></div>`}).join('') : `<div class="empty-state">No tasks yet. When an agent identifies a concrete next move, it can add it here automatically.</div>`;
  $$('[data-task-toggle]').forEach(b=>b.onclick=()=>{const t=r.tasks.find(x=>x.id===b.dataset.taskToggle);t.done=!t.done;save();renderTasks();renderChat();});
  $$('[data-task-remove]').forEach(b=>b.onclick=()=>{r.tasks=r.tasks.filter(x=>x.id!==b.dataset.taskRemove);save();renderTasks();renderChat();});
}

function renderPulse() {
  const ids=room().pulse||[];
  $('#roomPulse').innerHTML = ids.length ? ids.map((id,i)=>{const a=agentById(id);return a?`<div class="pulse-row"><span class="pulse-index">0${i+1}</span><span class="pulse-avatar">${esc(a.avatar)}</span><span class="pulse-name">${esc(a.name)}</span><span class="pulse-tag">spoke</span></div>`:''}).join('') : `<div class="empty-state">Ask something and watch the team form around the problem.</div>`;
  $('#turnCount').textContent = `${ids.length} voice${ids.length===1?'':'s'}`;
}

function renderMap() {
  const svg=$('#debateMap');
  const enabled=state.agents.filter(a=>a.enabled!==false);
  const edges=room().graphEdges||[];
  const active=new Set(room().pulse||[]);
  const cx=140,cy=140,rad=94;
  const pos={};
  enabled.forEach((a,i)=>{const angle=(Math.PI*2*i/enabled.length)-Math.PI/2;pos[a.id]={x:cx+Math.cos(angle)*rad,y:cy+Math.sin(angle)*rad};});
  let html=`<circle class="map-core-ring" cx="140" cy="140" r="34"></circle><text class="map-core-glyph" x="140" y="137" text-anchor="middle">✦</text><text class="map-core-text" x="140" y="154" text-anchor="middle">COUNCIL</text>`;
  for(const e of edges){if(!pos[e.from]||!pos[e.to])continue;html+=`<line class="map-edge ${esc(e.type)}" x1="${pos[e.from].x}" y1="${pos[e.from].y}" x2="${pos[e.to].x}" y2="${pos[e.to].y}"/>`;}
  enabled.forEach(a=>{const p=pos[a.id];html+=`<g class="map-node ${active.has(a.id)?'active':''}" transform="translate(${p.x},${p.y})"><circle r="23"></circle><text class="map-avatar" text-anchor="middle" y="5">${esc(a.avatar)}</text><text class="map-label" text-anchor="middle" y="34">${esc(a.name.toUpperCase())}</text></g>`;});
  svg.innerHTML=html;
}

function renderMode() { $$('.mode-btn').forEach(b=>b.classList.toggle('active',b.dataset.mode===state.mode)); }
function renderAll(){ renderRooms(); renderAgents(); renderChat(); renderMemory(); renderTasks(); renderPulse(); renderMap(); renderMode(); }

$('#councilGoal').addEventListener('input',e=>{room().goal=e.target.value;save();});
$('.mode-switch').addEventListener('click',e=>{const b=e.target.closest('[data-mode]');if(!b)return;state.mode=b.dataset.mode;save();renderMode();});
$('#addRoom').onclick=()=>{const name=prompt('Name this Council room:','New project');if(!name?.trim())return;const r=makeRoom(name.trim());state.rooms.push(r);state.activeRoomId=r.id;save();renderAll();};
$('#clearChat').onclick=()=>{if(!room().messages.length)return;if(confirm('Clear this room’s chat? Memories and tasks will stay.')){room().messages=[];room().graphEdges=[];room().pulse=[];save();renderAll();}};
$('#addTask').onclick=()=>{const title=prompt('Task:');if(!title?.trim())return;room().tasks.push({id:`task-${Date.now()}`,title:title.trim(),owner:'human',priority:'medium',done:false,createdAt:Date.now()});save();renderTasks();renderChat();};

$$('.insight-tab').forEach(tab=>tab.onclick=()=>{$$('.insight-tab').forEach(t=>t.classList.toggle('active',t===tab));$$('.insight-view').forEach(v=>v.classList.toggle('hidden',v.id!==`panel-${tab.dataset.panel}`));});

const input=$('#messageInput');
function autoGrow(){input.style.height='auto';input.style.height=Math.min(input.scrollHeight,150)+'px';renderMentionTray();}
input.addEventListener('input',autoGrow);
input.addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();$('#composer').requestSubmit();}});

function renderMentionTray(){const value=input.value;const m=value.match(/@([a-z0-9_-]*)$/i);if(!m){$('#mentionTray').classList.add('hidden');return;}const q=m[1].toLowerCase();const matches=state.agents.filter(a=>a.enabled!==false&&(a.name.toLowerCase().includes(q)||a.id.includes(q))).slice(0,6);if(!matches.length){$('#mentionTray').classList.add('hidden');return;}$('#mentionTray').innerHTML=matches.map(a=>`<button type="button" data-mention="${esc(a.name)}"><span>${esc(a.avatar)}</span><strong>${esc(a.name)}</strong><small>${esc(a.role)}</small></button>`).join('');$('#mentionTray').classList.remove('hidden');$$('[data-mention]').forEach(b=>b.onclick=()=>{input.value=value.replace(/@[a-z0-9_-]*$/i,`@${b.dataset.mention} `);$('#mentionTray').classList.add('hidden');input.focus();autoGrow();});}

function addThinking(){const el=document.createElement('article');el.id='thinking';el.className='message orchestrator thinking';el.innerHTML='<div class="msg-avatar">✦</div><div><div class="msg-head"><strong>Council</strong><span>forming the room</span></div><div class="bubble">Choosing who should enter…</div></div>';$('#chat').appendChild(el);$('#chat').scrollTop=$('#chat').scrollHeight;}

$('#composer').addEventListener('submit',async(e)=>{
  e.preventDefault();
  const text=input.value.trim();if(!text)return;
  const r=room();
  const history=[...r.messages].slice(-36);
  input.value='';autoGrow();$('#mentionTray').classList.add('hidden');$('#sendButton').disabled=true;$('#selectedHint').textContent='Council is thinking…';
  r.messages.push({role:'user',name:'You',content:text});renderChat();addThinking();
  try{
    const res=await fetch('/api/council',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({text,agents:state.agents,messages:history,mode:state.mode,councilGoal:r.goal,memories:r.memories||{}})});
    const data=await res.json();if(!res.ok)throw new Error(data.error||'Council failed.');
    $('#thinking')?.remove();
    r.messages.push(...data.replies,data.synthesis);
    r.graphEdges=data.edges||[];r.pulse=data.selected||[];
    r.memories ||= {};
    for(const u of data.memoryUpdates||[]){r.memories[u.agentId] ||= [];if(!r.memories[u.agentId].includes(u.memory))r.memories[u.agentId].push(u.memory);r.memories[u.agentId]=r.memories[u.agentId].slice(-12);}
    for(const t of data.tasks||[]){if(!r.tasks.some(x=>!x.done&&x.title.toLowerCase()===t.title.toLowerCase()))r.tasks.push({id:`task-${Date.now()}-${Math.random().toString(36).slice(2,5)}`,...t,done:false,createdAt:Date.now()});}
    $('#selectedHint').textContent=`${data.selectionReason}: ${(data.selected||[]).map(id=>agentById(id)?.name||id).join(' → ')}`;
    save();renderAll();
  }catch(err){$('#thinking')?.remove();r.messages.push({role:'orchestrator',name:'Council',avatar:'!',content:`I hit an error: ${err.message}`});save();renderChat();}
  finally{$('#sendButton').disabled=false;input.focus();}
});

const dialog=$('#agentDialog');
function editAgent(id){const a=agentById(id);if(!a)return;$('#agentId').value=a.id;$('#agentAvatar').value=a.avatar;$('#agentName').value=a.name;$('#agentRole').value=a.role;$('#agentModel').value=a.model||'inherit';$('#agentReasoning').value=a.reasoning||'low';$('#agentWeb').checked=Boolean(a.tools?.web);$('#agentPrompt').value=a.prompt;$('#agentTemperature').value=a.temperature??.5;$('#tempValue').textContent=a.temperature??.5;$('#deleteAgent').classList.remove('hidden');$('#dialogTitle').textContent='Edit agent';dialog.showModal();}
function newAgent(){$('#agentId').value='';$('#agentAvatar').value='✨';$('#agentName').value='';$('#agentRole').value='';$('#agentModel').value='inherit';$('#agentReasoning').value='low';$('#agentWeb').checked=false;$('#agentPrompt').value='';$('#agentTemperature').value=.5;$('#tempValue').textContent='.5';$('#deleteAgent').classList.add('hidden');$('#dialogTitle').textContent='Create agent';dialog.showModal();}
$('#addAgent').onclick=newAgent;$('#closeDialog').onclick=()=>dialog.close();$('#cancelAgent').onclick=()=>dialog.close();$('#agentTemperature').oninput=e=>$('#tempValue').textContent=e.target.value;
$('#agentForm').addEventListener('submit',e=>{e.preventDefault();const id=$('#agentId').value;const data={avatar:$('#agentAvatar').value||'✨',name:$('#agentName').value.trim(),role:$('#agentRole').value.trim(),model:$('#agentModel').value.trim()||'inherit',reasoning:$('#agentReasoning').value,tools:{web:$('#agentWeb').checked},prompt:$('#agentPrompt').value.trim(),temperature:Number($('#agentTemperature').value),enabled:true};if(id){Object.assign(agentById(id),data)}else{data.id=(data.name.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')||`agent-${Date.now()}`);if(state.agents.some(a=>a.id===data.id))data.id+=`-${Date.now().toString().slice(-4)}`;state.agents.push(data)}save();renderAll();dialog.close();});
$('#deleteAgent').onclick=()=>{const id=$('#agentId').value;if(!id)return;state.agents=state.agents.filter(a=>a.id!==id);for(const r of state.rooms){r.graphEdges=(r.graphEdges||[]).filter(e=>e.from!==id&&e.to!==id);r.pulse=(r.pulse||[]).filter(x=>x!==id);}save();renderAll();dialog.close();};

async function statusCheck(){try{const d=await fetch('/api/status').then(r=>r.json());$('#statusDot').classList.toggle('live',d.live);$('#statusLabel').textContent=d.live?'AI connected':'Demo mode';$('#modelLabel').textContent=d.live?`Default ${d.model}`:'Works without API calls';}catch{$('#statusLabel').textContent='Server offline';$('#modelLabel').textContent='Start Council locally';}}

renderAll();statusCheck();input.focus();
