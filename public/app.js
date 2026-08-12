const $ = (q) => document.querySelector(q);
const $$ = (q) => [...document.querySelectorAll(q)];
const STORAGE_KEY = 'council-v5-company-state';
const V4_KEY = 'council-v4-company-state';

const AUTONOMY = {
  observe: 'Observe',
  recommend: 'Recommend',
  approval: 'Act with approval',
  autonomous: 'Autonomous'
};

const DEFAULT_AGENTS = [
  { id:'chief', avatar:'✦', name:'Chief of Staff', role:'Orchestration & Founder Office', department:'Executive', prompt:'Turn founder direction into priorities. Route work to specialists, surface real blockers and decisions, and close loops. Never invent operating state. If reality must be checked, require a tool trace.', model:'inherit', reasoning:'medium', tools:{web:false}, enabled:true, autonomy:'approval' },
  { id:'builder', avatar:'🛠️', name:'Builder', role:'Product & Engineering', department:'Product', prompt:'Inspect what actually exists, then turn the strongest opportunity into a small shippable system. Prefer working software, clear architecture, tests and measurable proof over presentation.', model:'inherit', reasoning:'low', tools:{web:false}, enabled:true, autonomy:'approval' },
  { id:'capital', avatar:'◈', name:'Capital', role:'Business & Finance', department:'Business', prompt:'Test economic reality: buyer, urgency, willingness to pay, pricing, distribution, margin and defensibility. Treat monetization as a hypothesis until buyer evidence exists.', model:'inherit', reasoning:'low', tools:{web:true}, enabled:true, autonomy:'recommend' },
  { id:'humanist', avatar:'🌱', name:'Humanist', role:'People & Impact', department:'Impact', prompt:'Evaluate who benefits, who pays, severity of the problem, dignity, agency and long-term human consequences. Do not confuse popularity with impact.', model:'inherit', reasoning:'low', tools:{web:false}, enabled:true, autonomy:'recommend' },
  { id:'critic', avatar:'♟', name:'Critic', role:'Red Team & Evidence', department:'Research', prompt:'Attack false progress, unsupported claims and coordination theatre. Check whether the requested external work actually happened before accepting a conclusion.', model:'inherit', reasoning:'medium', tools:{web:false}, enabled:true, autonomy:'recommend' },
  { id:'scientist', avatar:'🔬', name:'Scientist', role:'Research & Evidence', department:'Research', prompt:'Separate evidence from assumptions. Find mechanisms, uncertainty, falsification and high-quality sources. Use live research only when it materially changes the answer.', model:'inherit', reasoning:'medium', tools:{web:true}, enabled:true, autonomy:'recommend' },
  { id:'designer', avatar:'◐', name:'Designer', role:'Experience & Story', department:'Product', prompt:'Make complex systems understandable, calm and humane. Enter when experience or communication actually matters; do not duplicate product or business analysis.', model:'inherit', reasoning:'low', tools:{web:false}, enabled:true, autonomy:'recommend' },
  { id:'operator', avatar:'▦', name:'Operator', role:'Operations & Delivery', department:'Operations', prompt:'Turn decisions into owner, dependency, next action and definition of done. Never invent cadences, meetings or reports the system cannot execute.', model:'inherit', reasoning:'low', tools:{web:false}, enabled:true, autonomy:'approval' },
  { id:'growth', avatar:'↗', name:'Growth', role:'Distribution & Partnerships', department:'Business', prompt:'Find honest paths to real users and partners. Prefer experiments that teach demand over vanity growth.', model:'inherit', reasoning:'low', tools:{web:true}, enabled:true, autonomy:'recommend' }
];

const now = () => Date.now();
const uid = (prefix='id') => `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,6)}`;
const esc = (s='') => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmtNum = (n) => new Intl.NumberFormat().format(Number(n || 0));
const timeAgo = (ts) => {
  if (!ts) return 'never';
  const sec = Math.max(1, Math.floor((Date.now() - new Date(ts).getTime()) / 1000));
  if (sec < 60) return `${sec}s ago`;
  const min = Math.floor(sec / 60); if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60); if (hr < 24) return `${hr}h ago`;
  return `${Math.floor(hr / 24)}d ago`;
};

function seedState() {
  return {
    version:5,
    company:{
      name:'Council Labs', founder:'Michael', githubUsername:'mikelninh',
      mission:'Turn ambitious ideas into evidence, decisions and useful things — without losing humanity along the way.',
      focus:'Turn evidence into useful work'
    },
    agents:DEFAULT_AGENTS,
    mode:'orchestrated',
    activeView:'dashboard',
    messages:[],
    tasks:[],
    memories:[
      { id:'m1', category:'principle', title:'Truth before theatre', body:'Council may only claim an external check happened when a tool trace proves it.', createdAt:now() },
      { id:'m2', category:'principle', title:'Human authority', body:'Consequential external side effects stay human-approved until a workflow earns broader trust.', createdAt:now()-1000 }
    ],
    activity:[],
    lastBriefing:null,
    lastCycleAt:null,
    lastEvidenceGate:null
  };
}

function loadState() {
  try {
    const current = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
    if (current?.version === 5) return { ...seedState(), ...current, agents: current.agents?.length ? current.agents : DEFAULT_AGENTS };
    const v4 = JSON.parse(localStorage.getItem(V4_KEY) || 'null');
    if (v4) {
      const fresh = seedState();
      fresh.company = { ...fresh.company, ...(v4.company || {}) };
      fresh.company.githubUsername ||= 'mikelninh';
      fresh.agents = v4.agents?.length ? v4.agents : DEFAULT_AGENTS;
      fresh.memories.push(...(v4.memory || []).slice(-20));
      fresh.activity.push({ id:uid('act'), icon:'↟', text:'Migrated durable company context from v4. Live system state was intentionally not copied.', at:now() });
      return fresh;
    }
  } catch {}
  return seedState();
}

const state = loadState();
let runtimeStatus = null;
let portfolio = null;
let portfolioLoading = false;

function save() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({
    version:5, company:state.company, agents:state.agents, mode:state.mode, activeView:state.activeView,
    messages:state.messages.slice(-120), tasks:state.tasks.slice(-80), memories:state.memories.slice(-100),
    activity:state.activity.slice(-80), lastBriefing:state.lastBriefing, lastCycleAt:state.lastCycleAt,
    lastEvidenceGate:state.lastEvidenceGate
  }));
}

function toast(text) {
  const el = $('#toast'); el.textContent = text; el.classList.remove('hidden');
  clearTimeout(toast.timer); toast.timer = setTimeout(() => el.classList.add('hidden'), 2200);
}
function openModal(html) { $('#modalBody').innerHTML = html; $('#modal').classList.remove('hidden'); }
function closeModal() { $('#modal').classList.add('hidden'); }
$$('[data-close-modal]').forEach((x) => x.onclick = closeModal);

function setView(view) {
  state.activeView = view; save();
  $$('.view').forEach((el) => el.classList.toggle('active', el.id === `view-${view}`));
  $$('.nav-item').forEach((el) => el.classList.toggle('active', el.dataset.view === view));
  const labels = {
    dashboard:['FOUNDER DESK', greeting()], portfolio:['LIVE EVIDENCE','GitHub portfolio'],
    chat:['COMPANY ROOM','Evidence-first Council'], team:['ORGANISATION','Team'], memory:['INSTITUTIONAL MEMORY','Company memory']
  }[view];
  $('#viewEyebrow').textContent = labels?.[0] || 'COUNCIL';
  $('#viewTitle').textContent = labels?.[1] || 'Company';
  renderAll(false);
}
function greeting() {
  const hour = new Date().getHours();
  return `${hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'}, ${state.company.founder || 'Founder'}.`;
}

function systemRows() {
  const openai = runtimeStatus?.live;
  const gh = runtimeStatus?.tools?.github;
  const vercel = runtimeStatus?.tools?.vercel;
  return [
    { name:'OpenAI', status:openai ? 'live' : 'demo', detail:openai ? runtimeStatus.model : 'API not connected', ok:openai },
    { name:'GitHub', status:gh?.mode || 'unknown', detail:gh?.privateRepos ? 'public + private metadata' : 'public metadata only', ok:Boolean(gh?.available), warn:gh?.available && !gh?.privateRepos },
    { name:'Vercel runtime', status:vercel?.runtime ? 'running' : 'local', detail:vercel?.managementApi ? 'management API connected' : 'deployment management not connected', ok:Boolean(vercel?.runtime), warn:Boolean(vercel?.runtime && !vercel?.managementApi) }
  ];
}

function renderShell() {
  $('#companyNameSide').textContent = state.company.name;
  $('#navChatCount').textContent = state.messages.filter((m) => m.role === 'user').length;
  $('#navTeamCount').textContent = state.agents.filter((a) => a.enabled !== false).length;
  $('#navMemoryCount').textContent = state.memories.length;
  $('#navRepoCount').textContent = portfolio?.summary?.count ?? '—';
  $('#navTruth').textContent = runtimeStatus?.live ? 'live' : 'demo';
  $('#systemMini').innerHTML = systemRows().map((r) => `<div class="system-mini-row"><i class="${r.ok ? (r.warn ? 'warn' : 'ok') : 'off'}"></i><span><b>${esc(r.name)}</b><small>${esc(r.status)}</small></span></div>`).join('');
}

function renderDashboard() {
  const s = portfolio?.summary;
  $('#metricRepos').textContent = s ? fmtNum(s.count) : '—';
  $('#metricReposNote').textContent = s ? `${s.scope} · scanned ${timeAgo(portfolio.startedAt)}` : 'not scanned';
  $('#metricActive').textContent = s ? fmtNum(s.active90) : '—';
  $('#metricTasks').textContent = state.tasks.filter((t) => !t.done).length;
  $('#companyFocus').textContent = state.company.focus;
  $('#lastCycleLabel').textContent = state.lastCycleAt ? `Last cycle ${timeAgo(state.lastCycleAt)}` : 'No company cycle yet';
  $('#truthGrid').innerHTML = systemRows().map((r) => `<div class="truth-row"><div><i class="${r.ok ? (r.warn ? 'warn' : 'ok') : 'off'}"></i><strong>${esc(r.name)}</strong></div><span>${esc(r.status)}</span><p>${esc(r.detail)}</p></div>`).join('');

  const briefing = state.lastBriefing;
  $('#founderBriefing').innerHTML = briefing
    ? `<div class="brief-live"><span>LAST VERIFIED CYCLE</span><p>${formatText(briefing)}</p></div>`
    : `<div class="brief-empty"><span>✦</span><div><b>No synthetic briefing.</b><p>Run a company cycle and Council will refresh the systems it can actually inspect before briefing you.</p></div></div>`;

  const activity = [...state.activity].sort((a,b) => b.at-a.at).slice(0,7);
  $('#activityFeed').innerHTML = activity.length ? activity.map((a) => `<div class="activity-item"><span>${esc(a.icon || '·')}</span><div><p>${esc(a.text)}</p><small>${timeAgo(a.at)}</small></div></div>`).join('') : `<div class="empty-state">No activity yet.</div>`;
}

function portfolioSummaryHtml() {
  if (portfolioLoading) return `<div class="scan-state"><span class="spinner">✦</span><div><b>Scanning GitHub…</b><p>Fetching repository metadata from the real API.</p></div></div>`;
  if (!portfolio?.summary) return `<div class="scan-state"><span>◫</span><div><b>No portfolio scan yet.</b><p>Run a scan to see actual repositories before asking the company to rank them.</p></div></div>`;
  const s = portfolio.summary;
  return `<div class="portfolio-metrics">
    <div><span>Repositories</span><strong>${fmtNum(s.count)}</strong><small>${esc(s.scope)}</small></div>
    <div><span>Active 30d</span><strong>${fmtNum(s.active30)}</strong><small>recent pushes</small></div>
    <div><span>Active 90d</span><strong>${fmtNum(s.active90)}</strong><small>recent pushes</small></div>
    <div><span>Private seen</span><strong>${fmtNum(s.privateCount)}</strong><small>${s.scope === 'authenticated' ? 'authenticated' : 'not connected'}</small></div>
    <div><span>Total stars</span><strong>${fmtNum(s.stars)}</strong><small>signal, not value</small></div>
  </div>${portfolio.warning ? `<div class="warning-banner">${esc(portfolio.warning)}</div>` : ''}`;
}

function repoCard(repo) {
  const desc = repo.description || 'No repository description yet.';
  const age = repo.daysSincePush === null ? 'unknown' : repo.daysSincePush === 0 ? 'today' : `${repo.daysSincePush}d ago`;
  return `<a class="repo-card ${repo.archived ? 'archived' : ''}" href="${esc(repo.url)}" target="_blank" rel="noreferrer">
    <div class="repo-top"><span class="visibility ${repo.private ? 'private' : ''}">${repo.private ? 'private' : 'public'}</span><small>pushed ${esc(age)}</small></div>
    <h3>${esc(repo.name)}</h3><p>${esc(desc)}</p>
    <div class="repo-meta"><span>${esc(repo.language)}</span><span>★ ${fmtNum(repo.stars)}</span><span>⑂ ${fmtNum(repo.forks)}</span><span>◌ ${fmtNum(repo.openIssues)}</span></div>
    ${repo.topics?.length ? `<div class="topics">${repo.topics.slice(0,4).map((t) => `<i>${esc(t)}</i>`).join('')}</div>` : ''}
  </a>`;
}

function renderPortfolio() {
  $('#githubUsername').value = state.company.githubUsername || 'mikelninh';
  $('#portfolioSummary').innerHTML = portfolioSummaryHtml();
  $('#portfolioActions').classList.toggle('hidden', !portfolio?.data?.repos?.length);
  if (!portfolio?.data?.repos?.length) { $('#repoGrid').innerHTML = ''; return; }
  const filter = String($('#repoFilter')?.value || '').toLowerCase();
  const sort = $('#repoSort')?.value || 'recent';
  let repos = portfolio.data.repos.filter((r) => !filter || `${r.name} ${r.description} ${r.language} ${(r.topics || []).join(' ')}`.toLowerCase().includes(filter));
  repos = [...repos].sort((a,b) => sort === 'stars' ? b.stars-a.stars : sort === 'name' ? a.name.localeCompare(b.name) : new Date(b.pushedAt || 0)-new Date(a.pushedAt || 0));
  $('#repoGrid').innerHTML = repos.map(repoCard).join('');
}

function formatText(text='') {
  return esc(text).replace(/\n/g,'<br>').replace(/\*\*(.*?)\*\*/g,'<strong>$1</strong>');
}
function sourcesHtml(sources=[]) {
  return sources.length ? `<div class="source-row">${sources.slice(0,6).map((s,i) => `<a href="${esc(s.url)}" target="_blank" rel="noreferrer">${i+1} · ${esc((s.title || 'Source').slice(0,42))}</a>`).join('')}</div>` : '';
}
function toolRunHtml(run) {
  const success = run.status === 'success';
  let detail = run.error || '';
  if (run.tool === 'github.portfolio.scan' && success) detail = `${run.summary?.count || 0} repos · ${run.summary?.scope || run.scope} · ${run.summary?.active90 || 0} active in 90d`;
  if (run.tool === 'github.repo.snapshot' && success) detail = `${run.summary?.fullName || 'repo'} · pushed ${timeAgo(run.summary?.pushedAt)}`;
  return `<div class="tool-run ${success ? 'success' : 'failed'}"><i>${success ? '✓' : '!'}</i><div><strong>${esc(run.tool)}</strong><span>${esc(detail)}</span></div><small>${fmtNum(run.durationMs)}ms</small></div>`;
}
function traceMessageHtml(m) {
  const gate = m.evidenceGate || { required:[], passed:true };
  return `<article class="trace-message"><div class="trace-head"><span>EVIDENCE TRACE</span><b class="gate ${gate.passed ? 'pass' : 'fail'}">${gate.passed ? 'PASS' : 'INCOMPLETE'}</b></div>${(m.toolRuns || []).length ? (m.toolRuns || []).map(toolRunHtml).join('') : `<div class="no-tools">No external tool required for this request.</div>`}</article>`;
}
function messageHtml(m) {
  if (m.role === 'trace') return traceMessageHtml(m);
  if (m.role === 'user') return `<article class="message user"><div class="bubble">${formatText(m.content)}</div></article>`;
  if (m.status === 'failed') return `<article class="message agent failed"><div class="msg-avatar">${esc(m.avatar || '!')}</div><div class="msg-body"><div class="msg-head"><strong>${esc(m.name)}</strong><span>execution failed</span></div><div class="failure-box">No fake fallback. ${esc(m.error || 'Model produced no usable output.')} ${m.attempts ? `Tried ${m.attempts}×.` : ''}</div></div></article>`;
  if (m.status === 'skipped') return '';
  const orch = m.role === 'orchestrator';
  const avatar = orch ? '✦' : (m.avatar || '✧');
  const label = orch ? 'Council synthesis' : (m.roleLabel || 'Agent');
  const model = m.model ? `<span class="chip">${esc(m.model)}</span>` : '';
  const tools = m.toolCalls?.length ? `<span class="chip">⌕ ${esc(m.toolCalls.join(', '))}</span>` : '';
  return `<article class="message ${orch ? 'orchestrator' : 'agent'}"><div class="msg-avatar">${esc(avatar)}</div><div class="msg-body"><div class="msg-head"><strong>${esc(m.name || 'Agent')}</strong><span>${esc(label)}</span>${model}${tools}</div><div class="bubble">${formatText(m.content)}</div>${sourcesHtml(m.sources || [])}</div></article>`;
}

function renderChat() {
  const chat = $('#chat');
  chat.innerHTML = state.messages.length ? state.messages.map(messageHtml).join('') : `<div class="chat-welcome"><div class="welcome-star">✦</div><span class="eyebrow">COUNCIL v5</span><h2>Ask for reality.</h2><p>Try the exact test that exposed v4.</p><button class="starter">Check all my GitHub projects and tell me which we should work on together for highest impact and monetizability.</button></div>`;
  $$('.starter').forEach((b) => b.onclick = () => { $('#messageInput').value = b.textContent; $('#messageInput').focus(); autoGrow(); });
  chat.scrollTop = chat.scrollHeight;
  renderEvidenceGate(); renderTasks(); renderRoomMemory();
  $$('.segmented [data-mode]').forEach((b) => b.classList.toggle('active', b.dataset.mode === state.mode));
}

function renderEvidenceGate() {
  const g = state.lastEvidenceGate;
  if (!g) { $('#evidenceGateCard').innerHTML = `<div class="gate-empty">No run yet.</div>`; return; }
  $('#evidenceGateCard').innerHTML = `<div class="gate-card ${g.passed ? 'pass' : 'fail'}"><strong>${g.passed ? '✓ Evidence complete' : '! Evidence incomplete'}</strong><p>${g.required?.length ? `Required: ${g.required.join(', ')}` : 'No external tool was required.'}</p>${g.missing?.length ? `<span>Missing: ${g.missing.join(', ')}</span>` : ''}</div>`;
}
function renderTasks() {
  const rows = [...state.tasks].sort((a,b) => Number(a.done)-Number(b.done));
  $('#taskList').innerHTML = rows.length ? rows.map((t) => `<div class="task ${t.done ? 'done' : ''}"><button data-task-toggle="${esc(t.id)}">${t.done ? '✓' : ''}</button><div><strong>${esc(t.title)}</strong><span>${esc(t.owner || 'human')} · ${esc(t.priority || 'medium')}</span></div><button data-task-remove="${esc(t.id)}">×</button></div>`).join('') : `<div class="empty-state">No internal missions.</div>`;
  $$('[data-task-toggle]').forEach((b) => b.onclick = () => { const t = state.tasks.find((x) => x.id === b.dataset.taskToggle); if (t) { t.done = !t.done; save(); renderAll(); } });
  $$('[data-task-remove]').forEach((b) => b.onclick = () => { state.tasks = state.tasks.filter((x) => x.id !== b.dataset.taskRemove); save(); renderAll(); });
}
function renderRoomMemory() {
  const items = state.memories.filter((m) => m.category === 'room').slice(-7).reverse();
  $('#roomMemory').innerHTML = items.length ? items.map((m) => `<div class="memory-mini"><span>${esc(state.agents.find((a) => a.id === m.agentId)?.avatar || '⌁')}</span><p>${esc(m.body)}</p></div>`).join('') : `<div class="empty-state">No room memory yet.</div>`;
}

function renderTeam() {
  const depts = [...new Set(state.agents.filter((a) => a.enabled !== false).map((a) => a.department || 'Company'))];
  $('#orgChart').innerHTML = `<div class="founder-node"><span>YOU</span><strong>${esc(state.company.founder || 'Founder')}</strong><small>direction + consequential decisions</small></div><div class="org-line"></div><div class="dept-row">${depts.map((d) => `<span>${esc(d)} · ${state.agents.filter((a) => a.enabled !== false && (a.department || 'Company') === d).length}</span>`).join('')}</div>`;
  $('#teamGrid').innerHTML = state.agents.map((a) => `<article class="agent-card ${a.enabled === false ? 'disabled' : ''}"><div class="agent-top"><span class="agent-avatar">${esc(a.avatar)}</span><button class="toggle ${a.enabled === false ? '' : 'on'}" data-agent-toggle="${esc(a.id)}"><i></i></button></div><small>${esc(a.department || 'Company')}</small><h3>${esc(a.name)}</h3><b>${esc(a.role)}</b><p>${esc(a.prompt)}</p><div class="agent-controls"><label>Authority<select data-autonomy="${esc(a.id)}">${Object.entries(AUTONOMY).map(([k,v]) => `<option value="${k}" ${a.autonomy === k ? 'selected' : ''}>${esc(v)}</option>`).join('')}</select></label><span>${a.tools?.web ? '⌕ live web' : '○ no web'}</span></div><button class="wide-btn" data-edit-agent="${esc(a.id)}">Edit role</button></article>`).join('');
  $$('[data-agent-toggle]').forEach((b) => b.onclick = () => { const a = state.agents.find((x) => x.id === b.dataset.agentToggle); if (a) { a.enabled = a.enabled === false; save(); renderAll(); } });
  $$('[data-autonomy]').forEach((s) => s.onchange = () => { const a = state.agents.find((x) => x.id === s.dataset.autonomy); if (a) { a.autonomy = s.value; save(); toast(`${a.name}: ${AUTONOMY[a.autonomy]}`); } });
  $$('[data-edit-agent]').forEach((b) => b.onclick = () => editAgent(b.dataset.editAgent));
}
function editAgent(id) {
  const a = state.agents.find((x) => x.id === id); if (!a) return;
  openModal(`<div class="modal-eyebrow">EDIT AGENT</div><h2>${esc(a.avatar)} ${esc(a.name)}</h2><form id="agentForm" class="form-stack"><label>Role<input name="role" value="${esc(a.role)}"></label><label>Operating prompt<textarea name="prompt" rows="7">${esc(a.prompt)}</textarea></label><div class="form-grid"><label>Model<input name="model" value="${esc(a.model || 'inherit')}"></label><label>Reasoning<select name="reasoning">${['low','medium','high'].map((r) => `<option ${a.reasoning === r ? 'selected' : ''}>${r}</option>`).join('')}</select></label></div><label class="check-label"><input type="checkbox" name="web" ${a.tools?.web ? 'checked' : ''}/> Allow OpenAI web search</label><button class="primary-btn" type="submit">Save</button></form>`);
  $('#agentForm').onsubmit = (e) => { e.preventDefault(); const f = new FormData(e.currentTarget); a.role = String(f.get('role') || '').trim(); a.prompt = String(f.get('prompt') || '').trim(); a.model = String(f.get('model') || 'inherit').trim() || 'inherit'; a.reasoning = f.get('reasoning'); a.tools = { ...(a.tools || {}), web:f.get('web') === 'on' }; save(); closeModal(); renderAll(); };
}

function renderMemory() {
  const groups = ['principle','decision','lesson','room'];
  $('#memoryGrid').innerHTML = groups.map((cat) => { const items = state.memories.filter((m) => m.category === cat); return `<section class="memory-column card"><div class="memory-col-head"><span>${cat.toUpperCase()}</span><b>${items.length}</b></div>${items.length ? items.slice().reverse().map((m) => `<article><small>${timeAgo(m.createdAt)}</small><h4>${esc(m.title || cat)}</h4><p>${esc(m.body)}</p><button data-forget="${esc(m.id)}">×</button></article>`).join('') : `<div class="empty-state">Nothing recorded.</div>`}</section>`; }).join('');
  $$('[data-forget]').forEach((b) => b.onclick = () => { state.memories = state.memories.filter((m) => m.id !== b.dataset.forget); save(); renderAll(); });
}

function renderAll(recurse=true) {
  renderShell(); renderDashboard(); renderPortfolio(); renderChat(); renderTeam(); renderMemory();
  if (recurse) {
    $$('.view').forEach((el) => el.classList.toggle('active', el.id === `view-${state.activeView}`));
    $$('.nav-item').forEach((el) => el.classList.toggle('active', el.dataset.view === state.activeView));
  }
}

async function refreshStatus() {
  try {
    const res = await fetch('/api/status', { cache:'no-store' });
    runtimeStatus = await res.json();
  } catch { runtimeStatus = null; }
  renderAll();
}

async function scanPortfolio() {
  if (portfolioLoading) return;
  const username = String($('#githubUsername')?.value || state.company.githubUsername || 'mikelninh').trim();
  if (!username) return;
  state.company.githubUsername = username; save();
  portfolioLoading = true; renderPortfolio();
  try {
    const res = await fetch(`/api/portfolio?username=${encodeURIComponent(username)}`, { cache:'no-store' });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'GitHub scan failed');
    portfolio = data;
    state.activity.unshift({ id:uid('act'), icon:'◫', text:`GitHub scan: ${data.summary.count} repositories (${data.summary.scope}).`, at:now() });
    save(); toast(`Scanned ${data.summary.count} repositories.`);
  } catch (error) { toast(error.message); }
  finally { portfolioLoading = false; renderAll(); }
}

function historyForApi() {
  return state.messages.filter((m) => ['user','assistant','orchestrator'].includes(m.role) && m.content).slice(-34).map((m) => ({ role:m.role, name:m.name, agentId:m.agentId, content:m.content }));
}
function memoryMap() {
  const map = {};
  for (const m of state.memories.filter((x) => x.category === 'room' && x.agentId)) { map[m.agentId] ||= []; map[m.agentId].push(m.body); }
  return map;
}

async function sendMessage(text, { companyCycle=false } = {}) {
  text = String(text || '').trim(); if (!text) return;
  const previous = historyForApi();
  state.messages.push({ role:'user', name:'You', content:text, createdAt:now() }); save(); renderChat();
  const input = $('#messageInput'); if (input) { input.value = ''; autoGrow(); }
  const send = $('.send-btn'); if (send) { send.disabled = true; send.textContent = '…'; }
  try {
    const payload = {
      text, agents:state.agents.filter((a) => a.enabled !== false), messages:previous, mode:state.mode,
      councilGoal:state.company.mission, memories:memoryMap(), githubUsername:state.company.githubUsername,
      context:{ companyCycle, company:{ name:state.company.name, focus:state.company.focus }, internalTasks:state.tasks.filter((t) => !t.done).map((t) => ({ title:t.title, owner:t.owner, priority:t.priority })) }
    };
    const res = await fetch('/api/council', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(payload) });
    const data = await res.json(); if (!res.ok) throw new Error(data.error || 'Council request failed');
    state.messages.push({ role:'trace', toolRuns:data.toolRuns || [], evidenceGate:data.evidenceGate, createdAt:now() });
    for (const r of data.replies || []) state.messages.push({ ...r, createdAt:now() });
    if (data.synthesis?.content) state.messages.push({ ...data.synthesis, createdAt:now() });
    state.lastEvidenceGate = data.evidenceGate || null;
    for (const m of data.memoryUpdates || []) {
      const body = m.memory || m.note; if (!body) continue;
      if (!state.memories.some((x) => x.category === 'room' && x.agentId === m.agentId && x.body === body)) state.memories.push({ id:uid('mem'), category:'room', title:'Room memory', body, agentId:m.agentId, createdAt:now() });
    }
    for (const t of data.tasks || []) if (!state.tasks.some((x) => !x.done && x.title === t.title)) state.tasks.push({ id:uid('task'), title:t.title, owner:t.owner || 'human', priority:t.priority || 'medium', done:false, createdAt:now(), proposedBy:t.proposedBy });
    if (companyCycle) { state.lastCycleAt = now(); state.lastBriefing = data.synthesis?.content || null; }
    const tools = (data.toolRuns || []).filter((r) => r.status === 'success').map((r) => r.tool).join(', ');
    state.activity.unshift({ id:uid('act'), icon:data.evidenceGate?.passed ? '✓' : '!', text:`Council run ${data.evidenceGate?.passed ? 'passed' : 'failed'} evidence gate${tools ? ` · ${tools}` : ''}.`, at:now() });
    save(); renderAll();
  } catch (error) {
    state.messages.push({ role:'assistant', status:'failed', name:'System', avatar:'!', content:'', error:error.message, createdAt:now() }); save(); renderAll(); toast(error.message);
  } finally { if (send) { send.disabled = false; send.textContent = '↑'; } }
}

async function runCompanyCycle() {
  state.activeView = 'chat'; save(); renderAll();
  const s = runtimeStatus;
  const p = portfolio?.summary;
  const verified = [
    `OpenAI: ${s?.live ? `live (${s.model})` : 'demo / not connected'}`,
    `GitHub tool: ${s?.tools?.github?.mode || 'unknown'}${s?.tools?.github?.privateRepos ? ' (private metadata enabled)' : ' (public metadata only)'}`,
    `Vercel runtime: ${s?.tools?.vercel?.runtime ? 'running' : 'not verified'}`,
    p ? `Last portfolio scan: ${p.count} repos, ${p.active90} active in 90d, scope=${p.scope}` : 'Portfolio scan: not run in this browser session',
    `Open internal missions: ${state.tasks.filter((t) => !t.done).map((t) => t.title).join('; ') || 'none'}`
  ].join('\n');
  const prompt = `@Chief of Staff, run Council Labs' company operating cycle. Refresh the external state you can actually verify, identify the single highest-leverage next move, bring in specialists only if they add distinct value, call out false progress, and create at most two concrete internal tasks. Do not invent meetings, reports, deadlines, customer facts, deployment status, or other state you cannot verify.\n\nFOUNDER FOCUS: ${state.company.focus}\n\nCLIENT-SIDE VERIFIED SNAPSHOT (may be refreshed by server tools):\n${verified}`;
  $('#runCycleBtn').disabled = true; $('#runCycleBtn').innerHTML = '<span>✦</span> Company thinking…';
  await sendMessage(prompt, { companyCycle:true });
  $('#runCycleBtn').disabled = false; $('#runCycleBtn').innerHTML = '<span>✦</span> Run company cycle';
}

function addMemory() {
  openModal(`<div class="modal-eyebrow">REMEMBER</div><h2>Add durable company context</h2><form id="memoryForm" class="form-stack"><label>Category<select name="category"><option>lesson</option><option>decision</option><option>principle</option></select></label><label>Title<input name="title" required></label><label>Memory<textarea name="body" rows="5" required></textarea></label><button class="primary-btn" type="submit">Remember</button></form>`);
  $('#memoryForm').onsubmit = (e) => { e.preventDefault(); const f = new FormData(e.currentTarget); state.memories.push({ id:uid('mem'), category:f.get('category'), title:String(f.get('title')).trim(), body:String(f.get('body')).trim(), createdAt:now() }); save(); closeModal(); renderAll(); };
}

$$('.nav-item').forEach((b) => b.onclick = () => setView(b.dataset.view));
$('#openChatBtn').onclick = () => setView('chat');
$('#runCycleBtn').onclick = runCompanyCycle;
$('#briefingBtn').onclick = runCompanyCycle;
$('#refreshStatusBtn').onclick = refreshStatus;
$('#scanTopBtn').onclick = () => { setView('portfolio'); scanPortfolio(); };
$('#scanPortfolioBtn').onclick = scanPortfolio;
$('#rankPortfolioBtn').onclick = () => { setView('chat'); sendMessage(`Check all my GitHub projects for ${state.company.githubUsername}. Rank the best projects for us to work on together, optimizing for highest real-world impact and monetizability. Use the actual GitHub scan, name the top 5 repositories, give a clear #1 recommendation, and distinguish repository evidence from market/impact hypotheses.`); };
$('#editFocusBtn').onclick = () => { const value = prompt('Company focus:', state.company.focus); if (value?.trim()) { state.company.focus = value.trim(); save(); renderAll(); } };
$('#addMemoryBtn').onclick = addMemory;
$('#addTaskBtn').onclick = () => { const title = prompt('Internal mission:'); if (title?.trim()) { state.tasks.push({ id:uid('task'), title:title.trim(), owner:'human', priority:'medium', done:false, createdAt:now() }); save(); renderAll(); } };
$('#repoFilter').addEventListener('input', renderPortfolio);
$('#repoSort').addEventListener('change', renderPortfolio);
$$('.segmented [data-mode]').forEach((b) => b.onclick = () => { state.mode = b.dataset.mode; save(); renderChat(); });

const input = $('#messageInput');
function autoGrow() { input.style.height = 'auto'; input.style.height = `${Math.min(input.scrollHeight, 160)}px`; renderMentionTray(); }
function renderMentionTray() {
  const match = input.value.match(/@([a-z0-9 _-]*)$/i);
  if (!match) { $('#mentionTray').classList.add('hidden'); return; }
  const q = match[1].toLowerCase().trim();
  const matches = state.agents.filter((a) => a.enabled !== false && (a.name.toLowerCase().includes(q) || a.id.includes(q))).slice(0,7);
  if (!matches.length) { $('#mentionTray').classList.add('hidden'); return; }
  $('#mentionTray').innerHTML = matches.map((a) => `<button type="button" data-mention="${esc(a.id)}"><span>${esc(a.avatar)}</span><b>${esc(a.name)}</b><small>${esc(a.role)}</small></button>`).join('');
  $('#mentionTray').classList.remove('hidden');
  $$('[data-mention]').forEach((b) => b.onclick = () => { const a = state.agents.find((x) => x.id === b.dataset.mention); input.value = input.value.replace(/@([a-z0-9 _-]*)$/i, `@${a.name} `); $('#mentionTray').classList.add('hidden'); input.focus(); autoGrow(); });
}
input.addEventListener('input', autoGrow);
input.addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); $('#composer').requestSubmit(); } });
$('#composer').onsubmit = (e) => { e.preventDefault(); sendMessage(input.value); };

document.addEventListener('click', (e) => { if (!e.target.closest('.mention-tray') && e.target !== input) $('#mentionTray').classList.add('hidden'); });

renderAll();
refreshStatus();
