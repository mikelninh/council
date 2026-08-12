import { compactToolContext, requiredToolsFor, runRequiredTools, toolStatus } from './tools.mjs';

const DEFAULT_MODEL = () => process.env.OPENAI_MODEL || 'gpt-5';
const ORCHESTRATOR_MODEL = () => process.env.OPENAI_ORCHESTRATOR_MODEL || DEFAULT_MODEL();
const HAS_API_KEY = () => Boolean(process.env.OPENAI_API_KEY);
const MAX_TOTAL_AGENT_TURNS = 6;
const MAX_MEMORY_ITEMS_PER_AGENT = 12;

export function status() {
  const tools = toolStatus();
  return {
    version: 5,
    live: HAS_API_KEY(),
    model: HAS_API_KEY() ? DEFAULT_MODEL() : 'demo-mode',
    orchestratorModel: HAS_API_KEY() ? ORCHESTRATOR_MODEL() : 'demo-mode',
    capabilities: {
      webSearch: HAS_API_KEY(),
      memory: true,
      tasks: true,
      rooms: true,
      evidenceGate: true,
      toolTrace: true,
      githubPortfolio: true
    },
    tools
  };
}

function transcriptToText(messages = [], limit = 34) {
  return messages
    .slice(-limit)
    .filter((m) => m?.content)
    .map((m) => `${m.name || m.role || 'Unknown'}: ${m.content}`)
    .join('\n\n');
}

function cleanList(items = [], max = MAX_MEMORY_ITEMS_PER_AGENT) {
  return items.filter(Boolean).map((x) => String(x).trim()).filter(Boolean).slice(-max);
}

function outputDetails(response = {}) {
  let text = '';
  const sources = [];
  const toolCalls = [];
  for (const item of response.output || []) {
    if (item.type && item.type.endsWith('_call')) {
      const simple = item.type.replace(/_call$/, '').replace(/_/g, ' ');
      if (!toolCalls.includes(simple)) toolCalls.push(simple);
    }
    if (item.type !== 'message') continue;
    for (const part of item.content || []) {
      if (part.type !== 'output_text') continue;
      text += `${part.text || ''}\n`;
      for (const annotation of part.annotations || []) {
        const url = annotation.url || annotation.url_citation?.url;
        const title = annotation.title || annotation.url_citation?.title || url;
        if (url && !sources.some((s) => s.url === url)) sources.push({ title, url });
      }
    }
  }
  if (!text.trim() && response.output_text) text = String(response.output_text);
  return { text: text.trim(), sources: sources.slice(0, 6), toolCalls };
}

function isReasoningModel(model = '') {
  return /^(gpt-5|o[134]|o4|o3)/i.test(model);
}

async function askModel({ instructions, input, model, tools = [], reasoning = 'low', maxOutput = 900 }) {
  const chosenModel = model || DEFAULT_MODEL();
  let lastError = null;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const body = {
        model: chosenModel,
        instructions: attempt === 0
          ? instructions
          : `${instructions}\n\nRECOVERY: Your previous attempt returned no visible answer. Produce a concise, concrete answer now. Never return an empty response.`,
        input,
        store: false,
        max_output_tokens: maxOutput
      };
      if (tools.length) {
        body.tools = tools;
        body.tool_choice = 'auto';
      }
      if (reasoning && reasoning !== 'default' && isReasoningModel(chosenModel)) {
        body.reasoning = { effort: reasoning };
      }
      const response = await fetch('https://api.openai.com/v1/responses', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        lastError = data?.error?.message || `OpenAI request failed (${response.status})`;
        if (response.status < 500) break;
        continue;
      }
      const details = outputDetails(data);
      if (details.text.trim()) return { ok: true, ...details, model: chosenModel, attempts: attempt + 1 };
      lastError = 'Model returned no visible text.';
    } catch (error) {
      lastError = error?.message || String(error);
    }
  }
  return { ok: false, text: '', sources: [], toolCalls: [], model: chosenModel, error: lastError || 'Model execution failed.', attempts: 2 };
}

function mentionedAgents(text, agents) {
  const lower = String(text || '').toLowerCase();
  return agents.filter((agent) => [agent.id, agent.name].filter(Boolean).some((name) => lower.includes(`@${String(name).toLowerCase()}`)));
}

function addAgentById(list, enabled, id) {
  const agent = enabled.find((a) => a.id === id);
  if (agent && !list.includes(agent)) list.push(agent);
}

function deterministicRoute(agents, text, context = {}, requiredTools = []) {
  const enabled = agents.filter((a) => a.enabled !== false);
  const direct = mentionedAgents(text, enabled);
  if (direct.length) return { agents: direct.slice(0, 4), reason: 'direct mention' };

  const lower = String(text).toLowerCase();
  const selected = [];
  if (context.companyCycle) {
    addAgentById(selected, enabled, 'chief');
    return { agents: selected.length ? selected : enabled.slice(0, 1), reason: 'company cycle' };
  }

  if (requiredTools.includes('github.portfolio.scan')) {
    addAgentById(selected, enabled, 'builder');
    if (/moneti|money|revenue|business|buyer|pricing|commercial/.test(lower)) addAgentById(selected, enabled, 'capital');
    if (/impact|help|good|suffering|social|public/.test(lower)) addAgentById(selected, enabled, 'humanist');
    addAgentById(selected, enabled, 'critic');
    if (!selected.some((a) => a.id === 'capital')) addAgentById(selected, enabled, 'capital');
    if (!selected.some((a) => a.id === 'humanist')) addAgentById(selected, enabled, 'humanist');
    return { agents: selected.slice(0, 5), reason: 'evidence-aware expert route' };
  }

  if (/build|ship|prototype|code|system|app|product|agent/.test(lower)) addAgentById(selected, enabled, 'builder');
  if (/study|evidence|science|health|research|data|verify|latest|current/.test(lower)) addAgentById(selected, enabled, 'scientist');
  if (/money|business|price|revenue|market|sell|fund/.test(lower)) addAgentById(selected, enabled, 'capital');
  if (/design|beautiful|ui|ux|experience|interface/.test(lower)) addAgentById(selected, enabled, 'designer');
  if (/company|founder|priority|operate|strategy|attention|focus/.test(lower)) addAgentById(selected, enabled, 'chief');
  addAgentById(selected, enabled, 'critic');
  return { agents: selected.slice(0, 4), reason: 'deterministic expert route' };
}

async function selectAgents({ agents, messages, text, councilGoal, context, requiredTools }) {
  const deterministic = deterministicRoute(agents, text, context, requiredTools);
  if (deterministic.agents.length) return deterministic;
  const enabled = agents.filter((a) => a.enabled !== false);
  if (!HAS_API_KEY()) return { agents: enabled.slice(0, 3), reason: 'demo fallback' };

  const roster = enabled.map((a) => `- ${a.id}: ${a.name} — ${a.role}`).join('\n');
  const result = await askModel({
    model: ORCHESTRATOR_MODEL(), reasoning: 'low', maxOutput: 120,
    instructions: 'Route the request efficiently. Return ONLY 1-3 comma-separated agent ids from the roster. Do not select a visual/design role unless the request is actually about design or experience.',
    input: `MISSION:\n${councilGoal || 'Help the human make better decisions and build useful things.'}\n\nROSTER:\n${roster}\n\nRECENT CHAT:\n${transcriptToText(messages, 12)}\n\nREQUEST:\n${text}`
  });
  if (!result.ok) return { agents: enabled.slice(0, 3), reason: 'router fallback' };
  const ids = result.text.split(/[,\n]/).map((s) => s.trim().replace(/[^a-z0-9_-]/gi, '')).filter(Boolean);
  const selected = ids.map((id) => enabled.find((a) => a.id === id)).filter(Boolean);
  return { agents: (selected.length ? [...new Set(selected)] : enabled.slice(0, 3)).slice(0, 3), reason: 'model route' };
}

function parseControls(text = '', agents = []) {
  const summons = [];
  const memories = [];
  const tasks = [];
  let skip = false;
  const regex = /\[\[\s*(SKIP|SUMMON|REMEMBER|TASK)\s*(?::\s*([\s\S]*?))?\s*\]\]/gi;
  for (const match of text.matchAll(regex)) {
    const type = String(match[1] || '').toUpperCase();
    const payload = String(match[2] || '').trim();
    if (type === 'SKIP') skip = true;
    if (type === 'SUMMON') {
      const id = payload.toLowerCase().replace(/[^a-z0-9_-]/g, '');
      if (agents.some((a) => a.id.toLowerCase() === id) && !summons.includes(id)) summons.push(id);
    }
    if (type === 'REMEMBER' && payload && !memories.includes(payload)) memories.push(payload.slice(0, 300));
    if (type === 'TASK') {
      const [titleRaw, ownerRaw, priorityRaw] = payload.split('|');
      const title = String(titleRaw || '').trim().slice(0, 120);
      const owner = String(ownerRaw || 'human').trim().toLowerCase().slice(0, 50);
      const priority = String(priorityRaw || 'medium').trim().toLowerCase();
      if (title) tasks.push({ title, owner, priority: ['low', 'medium', 'high'].includes(priority) ? priority : 'medium' });
    }
  }
  return { summons, memories, tasks, skip };
}

function cleanControlTokens(text = '') {
  return String(text)
    .replace(/\[\[\s*(?:SKIP|SUMMON|REMEMBER|TASK)\s*(?::\s*[\s\S]*?)?\s*\]\]/gi, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]{2,}/g, ' ')
    .trim();
}

function demoReply(agent, userText, toolRuns = []) {
  const portfolio = toolRuns.find((r) => r.tool === 'github.portfolio.scan' && r.status === 'success');
  if (portfolio) {
    const s = portfolio.summary;
    const latest = (portfolio.data?.repos || []).slice(0, 5).map((r) => r.name).join(', ');
    const role = {
      builder: `I actually scanned ${s.count} repositories (${s.scope}). ${s.active90} were pushed in the last 90 days. The most recently active include ${latest}. I would shortlist by product completeness and how quickly each can become a real user test.`,
      capital: `The scan covers ${s.count} repositories (${s.scope}). Repo metadata alone cannot prove willingness to pay, so I would treat monetization scores as hypotheses and prioritize projects with a clear external buyer and a demoable workflow.`,
      humanist: `The scan covers ${s.count} repositories (${s.scope}). Impact cannot be inferred from stars alone; I would rank projects by severity of the problem, number of people affected, and whether the project expands agency or reduces suffering.`,
      critic: `Evidence check: GitHub was actually queried, but repository metadata is not customer research. Any “highest monetization” ranking should be marked provisional until we inspect the strongest repos and test buyer demand.`
    }[agent.id];
    return { ok: true, text: role || `I reviewed the live GitHub portfolio evidence: ${s.count} repositories were scanned.`, sources: [], toolCalls: [], model: 'demo-mode', attempts: 1 };
  }
  return { ok: true, text: `Demo mode: ${agent.name} can reason about the request, but live model execution is not connected.`, sources: [], toolCalls: [], model: 'demo-mode', attempts: 1 };
}

async function runAgent({ agent, messages, userText, councilGoal, availableAgents, memories, toolRuns, requiredTools, context }) {
  if (!HAS_API_KEY()) return demoReply(agent, userText, toolRuns);
  const roster = availableAgents.filter((a) => a.id !== agent.id).map((a) => `- ${a.id}: ${a.name} — ${a.role}`).join('\n');
  const memoryText = cleanList(memories?.[agent.id]).map((m) => `- ${m}`).join('\n') || '(none)';
  const externalContext = compactToolContext(toolRuns) || '(no external tools were required for this request)';
  const model = agent.model && agent.model !== 'inherit' ? agent.model : DEFAULT_MODEL();
  const webTools = agent.tools?.web ? [{ type: 'web_search' }] : [];
  const instructions = `You are ${agent.name}, ${agent.role}, inside Council v5 — an AI-native company operating system.\n\nYOUR ROLE:\n${agent.prompt}\n\nMISSION:\n${councilGoal || 'Turn ideas into evidence, decisions and useful work.'}\n\nROOM MEMORY:\n${memoryText}\n\nTRUTHFUL TOOL CONTEXT:\n${externalContext}\n\nRULES:\n- External facts must come from the tool context above or a tool you actually use. Never pretend to have checked GitHub, the web, deployments, files, or metrics.\n- If the GitHub scan says public-only, explicitly preserve that limitation when it matters.\n- Do not ask for information already present in the tool context.\n- Add a distinct contribution; do not repeat another agent. If you truly add no value, output [[SKIP]].\n- Prefer concrete findings over methodology. For repo/portfolio questions, name actual repositories from the scan and explain the evidence and uncertainty.\n- Impact and monetization are hypotheses unless supported by real user/revenue evidence; label them accordingly.\n- Be concise: typically 3-7 bullets or short paragraphs.\n- If another specialist genuinely needs to enter, append [[SUMMON:agent-id]]. At most one.\n- If one durable room fact is worth keeping, append [[REMEMBER:...]].\n- If there is a concrete internal next action, append [[TASK:title|owner-id-or-human|low|medium|high]] using exactly three pipe-separated fields; priority is one of low, medium, high.\n- Machine controls are not prose. Do not explain them.\n\nAVAILABLE SPECIALISTS:\n${roster || '(none)'}\n\nREQUEST CONTEXT:\n${context?.companyCycle ? 'This is a company operating cycle. Move the company forward; do not invent meetings, deadlines, reports, or actions the system cannot actually execute.' : 'Normal Council request.'}`;
  return askModel({
    model,
    tools: webTools,
    reasoning: agent.reasoning || 'low',
    maxOutput: 1100,
    instructions,
    input: `RECENT GROUP CHAT:\n${transcriptToText(messages)}\n\nLATEST HUMAN REQUEST:\n${userText}\n\nSpeak now as ${agent.name}.`
  });
}

function evidenceGate(required = [], runs = []) {
  const missing = required.filter((name) => !runs.some((r) => r.tool === name && r.status === 'success'));
  const failed = runs.filter((r) => r.status === 'failed').map((r) => ({ tool: r.tool, error: r.error }));
  return { required, passed: missing.length === 0, missing, failed };
}

function fallbackSynthesis({ userText, toolRuns, replies, gate }) {
  if (!gate.passed) return `Analysis incomplete. Required evidence could not be collected: ${gate.missing.join(', ')}. I will not pretend the requested real-world check happened.`;
  const portfolio = toolRuns.find((r) => r.tool === 'github.portfolio.scan' && r.status === 'success');
  if (portfolio) {
    const s = portfolio.summary;
    const names = (portfolio.data?.repos || []).slice(0, 5).map((r) => r.name).join(', ');
    return `GitHub was actually scanned: ${s.count} repositories (${s.scope}), with ${s.active90} active in the last 90 days. Recent projects include ${names}. The agent analysis above should be treated as a first triage; monetization and impact remain hypotheses until we inspect the strongest candidates and test them with real users or buyers.`;
  }
  const useful = replies.filter((r) => r.status === 'success').map((r) => r.name).join(', ');
  return useful ? `Council completed the request with contributions from ${useful}. Review the strongest concrete next action above.` : `Council could not produce a reliable answer to “${String(userText).slice(0, 120)}”.`;
}

async function synthesize({ messages, userText, selected, councilGoal, tasks, toolRuns, gate }) {
  if (!gate.passed) return { ok: true, text: fallbackSynthesis({ userText, toolRuns, replies: [], gate }), sources: [], toolCalls: [], model: 'evidence-gate' };
  if (!HAS_API_KEY()) return { ok: true, text: fallbackSynthesis({ userText, toolRuns, replies: messages, gate }), sources: [], toolCalls: [], model: 'demo-mode' };
  const toolContext = compactToolContext(toolRuns) || '(no external tool required)';
  const portfolioRequired = gate.required.includes('github.portfolio.scan');
  const result = await askModel({
    model: ORCHESTRATOR_MODEL(), reasoning: 'low', maxOutput: 900,
    instructions: `You are Council's Orchestrator and evidence gate. Synthesize only what the room actually established. Never reward agents for describing a process instead of doing the requested work. If a request required an external check, verify the tool trace before declaring completion. ${portfolioRequired ? 'For a portfolio request: give a concrete ranked shortlist of actual repository names, explain impact and monetization hypotheses, state the GitHub scan scope, and end with one project/action to pursue next. Do not ask for the GitHub username because it was already scanned.' : 'Give: conclusion, strongest unresolved tension, and one best next action.'} Do not invent scheduled briefs, meetings, external actions, revenue, users, or tool use.`,
    input: `REQUEST:\n${userText}\n\nTOOL EVIDENCE:\n${toolContext}\n\nROOM:\n${transcriptToText(messages, 52)}\n\nAGENTS WHO SPOKE:\n${selected.map((a) => a.name).join(', ') || '(none)'}\n\nTASKS PROPOSED:\n${tasks.map((t) => t.title).join('; ') || '(none)'}\n\nMISSION:\n${councilGoal || 'Turn ideas into evidence, decisions and useful work.'}`
  });
  if (result.ok) return result;
  return { ok: true, text: fallbackSynthesis({ userText, toolRuns, replies: messages, gate }), sources: [], toolCalls: [], model: 'deterministic-fallback', warning: result.error };
}

function edgesFromContent(speakerId, content, agents) {
  const edges = [];
  const lower = String(content || '').toLowerCase();
  for (const target of agents) {
    if (target.id === speakerId) continue;
    if (lower.includes(`@${target.name.toLowerCase()}`) || lower.includes(`@${target.id.toLowerCase()}`)) edges.push({ from: speakerId, to: target.id, type: 'mention' });
  }
  return edges;
}

export async function runCouncil(payload = {}) {
  const {
    text,
    agents = [],
    messages = [],
    mode = 'orchestrated',
    councilGoal = '',
    memories = {},
    context = {},
    githubUsername
  } = payload;
  if (!text?.trim()) throw Object.assign(new Error('Message is required.'), { status: 400 });
  const enabled = agents.filter((a) => a.enabled !== false);
  if (!enabled.length) throw Object.assign(new Error('Enable at least one agent.'), { status: 400 });

  const toolPlan = await runRequiredTools({ text, context, username: githubUsername });
  const gate = evidenceGate(toolPlan.required, toolPlan.runs);

  let initial;
  let selectionReason;
  if (mode === 'roundtable') {
    const direct = mentionedAgents(text, enabled);
    initial = direct.length ? direct : enabled.slice(0, 6);
    selectionReason = direct.length ? 'direct mention' : 'round table';
  } else {
    const routed = await selectAgents({ agents: enabled, messages, text, councilGoal, context, requiredTools: toolPlan.required });
    initial = routed.agents;
    selectionReason = routed.reason;
  }

  const workingMessages = [...messages, { role: 'user', name: 'You', content: text }];
  const queue = [...initial];
  const spoken = new Set();
  const replies = [];
  const edges = [];
  const invited = [];
  const memoryUpdates = [];
  const tasks = [];
  const failedAgents = [];

  while (queue.length && spoken.size < MAX_TOTAL_AGENT_TURNS) {
    const agent = queue.shift();
    if (!agent || spoken.has(agent.id) || agent.enabled === false) continue;
    spoken.add(agent.id);
    invited.push(agent.id);

    const raw = await runAgent({
      agent,
      messages: workingMessages,
      userText: text,
      councilGoal,
      availableAgents: enabled,
      memories,
      toolRuns: toolPlan.runs,
      requiredTools: toolPlan.required,
      context
    });

    if (!raw.ok) {
      failedAgents.push({ agentId: agent.id, name: agent.name, error: raw.error, attempts: raw.attempts });
      replies.push({ role: 'assistant', status: 'failed', agentId: agent.id, name: agent.name, roleLabel: agent.role, avatar: agent.avatar, content: '', model: raw.model, error: raw.error, attempts: raw.attempts, toolRunIds: toolPlan.runs.map((r) => r.id) });
      continue;
    }

    const controls = parseControls(raw.text, enabled);
    const content = cleanControlTokens(raw.text);
    if (controls.skip && !content) {
      replies.push({ role: 'assistant', status: 'skipped', agentId: agent.id, name: agent.name, roleLabel: agent.role, avatar: agent.avatar, content: '', model: raw.model, attempts: raw.attempts, toolRunIds: toolPlan.runs.map((r) => r.id) });
    } else if (content) {
      const reply = {
        role: 'assistant', status: 'success', agentId: agent.id, name: agent.name, roleLabel: agent.role, avatar: agent.avatar,
        content, model: raw.model, toolCalls: raw.toolCalls, sources: raw.sources, attempts: raw.attempts,
        toolRunIds: toolPlan.runs.map((r) => r.id)
      };
      replies.push(reply);
      workingMessages.push(reply);
      edges.push(...edgesFromContent(agent.id, content, enabled));
    }

    for (const memory of controls.memories) memoryUpdates.push({ agentId: agent.id, memory, note: memory });
    for (const task of controls.tasks) tasks.push({ ...task, proposedBy: agent.id });
    for (const summonId of controls.summons) {
      const target = enabled.find((a) => a.id === summonId);
      if (target && !spoken.has(target.id) && !queue.some((a) => a.id === target.id)) {
        queue.push(target);
        edges.push({ from: agent.id, to: target.id, type: 'summon' });
      }
    }
  }

  const successfulAgents = replies.filter((r) => r.status === 'success').map((r) => enabled.find((a) => a.id === r.agentId)).filter(Boolean);
  const synthesisRaw = await synthesize({ messages: workingMessages, userText: text, selected: successfulAgents, councilGoal, tasks, toolRuns: toolPlan.runs, gate });
  const synthesisContent = cleanControlTokens(synthesisRaw.text || '') || fallbackSynthesis({ userText: text, toolRuns: toolPlan.runs, replies, gate });

  return {
    replies,
    synthesis: {
      role: 'orchestrator', name: 'Orchestrator', avatar: '✦', status: 'success', content: synthesisContent,
      model: synthesisRaw.model, toolCalls: synthesisRaw.toolCalls || [], sources: synthesisRaw.sources || []
    },
    selected: invited,
    selectionReason,
    edges,
    memoryUpdates,
    tasks,
    toolRuns: toolPlan.runs,
    evidenceGate: gate,
    failedAgents,
    live: HAS_API_KEY(),
    maxTurns: MAX_TOTAL_AGENT_TURNS,
    version: 5
  };
}

export { requiredToolsFor };
