const DEFAULT_MODEL = () => process.env.OPENAI_MODEL || 'gpt-5';
const ORCHESTRATOR_MODEL = () => process.env.OPENAI_ORCHESTRATOR_MODEL || DEFAULT_MODEL();
const HAS_API_KEY = () => Boolean(process.env.OPENAI_API_KEY);
const MAX_TOTAL_AGENT_TURNS = 6;
const MAX_MEMORY_ITEMS_PER_AGENT = 12;

export function status() {
  return {
    live: HAS_API_KEY(),
    model: HAS_API_KEY() ? DEFAULT_MODEL() : 'demo-mode',
    orchestratorModel: HAS_API_KEY() ? ORCHESTRATOR_MODEL() : 'demo-mode',
    capabilities: { webSearch: HAS_API_KEY(), memory: true, tasks: true, rooms: true }
  };
}

function transcriptToText(messages = [], limit = 34) {
  return messages
    .slice(-limit)
    .map((m) => `${m.name || m.role || 'Unknown'}: ${m.content || ''}`)
    .join('\n\n');
}

function cleanList(items = [], max = MAX_MEMORY_ITEMS_PER_AGENT) {
  return items
    .filter(Boolean)
    .map((x) => String(x).trim())
    .filter(Boolean)
    .slice(-max);
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
      if (part.type === 'output_text') {
        text += `${part.text || ''}\n`;
        for (const annotation of part.annotations || []) {
          const url = annotation.url || annotation.url_citation?.url;
          const title = annotation.title || annotation.url_citation?.title || url;
          if (url && !sources.some((s) => s.url === url)) sources.push({ title, url });
        }
      }
    }
  }

  if (!text.trim() && response.output_text) text = String(response.output_text);
  return { text: text.trim(), sources: sources.slice(0, 5), toolCalls };
}

function isReasoningModel(model = '') {
  return /^(gpt-5|o[134]|o4|o3)/i.test(model);
}

async function askModel({ instructions, input, model, tools = [], reasoning = 'low', maxOutput = 900 }) {
  const chosenModel = model || DEFAULT_MODEL();
  const body = {
    model: chosenModel,
    instructions,
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
  const data = await response.json();
  if (!response.ok) throw new Error(data?.error?.message || `OpenAI request failed (${response.status})`);
  const details = outputDetails(data);
  return { ...details, text: details.text || 'I have no useful contribution yet.', model: chosenModel };
}

function mentionedAgents(text, agents) {
  const lower = String(text || '').toLowerCase();
  return agents.filter((agent) => [agent.id, agent.name].filter(Boolean).some((name) => lower.includes(`@${String(name).toLowerCase()}`)));
}

function parseControls(text = '', agents = []) {
  const summons = [];
  const memories = [];
  const tasks = [];

  for (const match of text.matchAll(/\[\[SUMMON:([a-z0-9_-]+)\]\]/gi)) {
    const id = match[1].toLowerCase();
    if (agents.some((a) => a.id.toLowerCase() === id) && !summons.includes(id)) summons.push(id);
  }
  for (const match of text.matchAll(/\[\[REMEMBER:([^\]\n]{1,260})\]\]/gi)) {
    const note = match[1].trim();
    if (note && !memories.includes(note)) memories.push(note);
  }
  for (const match of text.matchAll(/\[\[TASK:([^|\]\n]{1,100})\|([^|\]\n]{1,50})\|([^\]\n]{1,20})\]\]/gi)) {
    const title = match[1].trim();
    const owner = match[2].trim().toLowerCase();
    const priority = match[3].trim().toLowerCase();
    if (title) tasks.push({ title, owner, priority: ['low', 'medium', 'high'].includes(priority) ? priority : 'medium' });
  }
  return { summons, memories, tasks };
}

function cleanControlTokens(text = '') {
  return text
    .replace(/\s*\[\[(?:SUMMON|REMEMBER|TASK):[^\]\n]+\]\]\s*/gi, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function demoReply(agent, topic, spokenIds) {
  const fragments = {
    builder: `I’d turn “${topic}” into one narrow experiment: one user, one painful job, one observable success metric. Then ship the smallest loop that can fail honestly.\n\nI’d also make the result reusable as a portfolio proof, not just a demo.`,
    scientist: `For “${topic}”, separate evidence from aspiration. I’d write down the two assumptions most likely to kill the idea and decide what evidence would actually change our mind.`,
    designer: `The experience for “${topic}” should make the next action obvious while hiding complexity until it is needed. The interface should feel calm even when the system underneath is complicated.`,
    critic: `The hidden failure mode in “${topic}” is likely coordination cost: too many actors, vague ownership, or incentives that break at scale. I’d attack that before polishing anything.`,
    humanist: `For “${topic}”, success should include dignity and agency, not just throughput. Ask who benefits, who carries the burden, and who disappears from the dashboard.`,
    capital: `For “${topic}”, I want the incentive loop: who pays, why now, what becomes cheaper or more valuable, and whether growth strengthens the mission instead of quietly corrupting it.`
  };
  let text = fragments[agent.id] || `My contribution to “${topic}” is to turn my speciality into one concrete decision for the room.`;
  if (agent.id === 'builder' && !spokenIds.has('critic')) text += ` [[SUMMON:critic]] [[TASK:Define the smallest testable prototype|builder|high]]`;
  if (agent.id === 'critic' && !spokenIds.has('humanist')) text += ` [[SUMMON:humanist]]`;
  text += ` [[REMEMBER:The room is currently exploring: ${topic.slice(0, 150)}]]`;
  return { text, sources: [], toolCalls: [], model: 'demo-mode' };
}

function chooseDemoAgents(agents, text) {
  const enabled = agents.filter((a) => a.enabled !== false);
  const direct = mentionedAgents(text, enabled);
  if (direct.length) return direct.slice(0, 3);
  const lower = text.toLowerCase();
  const priority = [];
  const add = (id) => {
    const agent = enabled.find((x) => x.id === id);
    if (agent && !priority.includes(agent)) priority.push(agent);
  };
  if (/build|ship|prototype|code|system|app|product|agent/.test(lower)) add('builder');
  if (/study|evidence|science|health|research|data|verify|latest|current/.test(lower)) add('scientist');
  if (/money|business|price|revenue|market|sell|fund/.test(lower)) add('capital');
  if (/design|beautiful|ui|ux|experience|interface/.test(lower)) add('designer');
  add('critic'); add('humanist'); enabled.forEach((a) => add(a.id));
  return priority.slice(0, Math.min(3, enabled.length));
}

async function selectAgents({ agents, messages, text, councilGoal }) {
  const enabled = agents.filter((a) => a.enabled !== false);
  const direct = mentionedAgents(text, enabled);
  if (direct.length) return { agents: direct.slice(0, 3), reason: 'direct mention' };
  if (!HAS_API_KEY()) return { agents: chooseDemoAgents(agents, text), reason: 'smart select' };

  const roster = enabled.map((a) => `- ${a.id}: ${a.name} — ${a.role}; tools: ${a.tools?.web ? 'web' : 'none'}`).join('\n');
  const result = await askModel({
    model: ORCHESTRATOR_MODEL(),
    reasoning: 'low',
    maxOutput: 120,
    instructions: 'You are the Council Orchestrator. Route efficiently. Return ONLY 1-3 comma-separated agent ids from the roster. No prose.',
    input: `COUNCIL MISSION:\n${councilGoal || 'Help the human make better decisions and build useful things.'}\n\nROSTER:\n${roster}\n\nRECENT CHAT:\n${transcriptToText(messages, 18)}\n\nLATEST HUMAN MESSAGE:\n${text}`
  });
  const ids = result.text.split(/[,\n]/).map((s) => s.trim().replace(/[^a-z0-9_-]/gi, '')).filter(Boolean);
  const selected = ids.map((id) => enabled.find((a) => a.id === id)).filter(Boolean);
  return { agents: (selected.length ? [...new Set(selected)] : enabled.slice(0, 3)).slice(0, 3), reason: 'smart select' };
}

async function runAgent({ agent, messages, userText, councilGoal, availableAgents, memories }) {
  if (!HAS_API_KEY()) return demoReply(agent, userText.slice(0, 90), new Set(messages.map((m) => m.agentId).filter(Boolean)));

  const roster = availableAgents
    .filter((a) => a.id !== agent.id)
    .map((a) => `- ${a.id}: ${a.name} — ${a.role}`)
    .join('\n');
  const memoryText = cleanList(memories?.[agent.id]).map((m) => `- ${m}`).join('\n') || '(no durable memory yet)';
  const boldness = Number(agent.temperature ?? 0.5);
  const boldnessNote = boldness < .35 ? 'Be precise and conservative.' : boldness > .75 ? 'Explore bolder connections while staying useful.' : 'Balance precision with fresh ideas.';
  const tools = agent.tools?.web ? [{ type: 'web_search' }] : [];
  const model = agent.model && agent.model !== 'inherit' ? agent.model : DEFAULT_MODEL();

  const instructions = `You are ${agent.name}, the ${agent.role}, inside a visible multi-agent group chat called Council.\n\nYOUR OPERATING PROMPT:\n${agent.prompt}\n\nCOUNCIL MISSION:\n${councilGoal || 'Help the human make better decisions and build useful things.'}\n\nYOUR DURABLE MEMORY FOR THIS ROOM:\n${memoryText}\n\nSTYLE:\n${boldnessNote}\n\nRULES:\n- Read what the human and other agents already said.\n- Add a distinct contribution; do not repeat the room.\n- Be concise: usually 2-5 short paragraphs or bullets.\n- Challenge another agent constructively when useful.\n- If web search is available, use it only when fresh public information materially helps.\n- Never claim a tool was used unless it actually was.\n- If another specialist genuinely needs to enter next, append exactly [[SUMMON:agent-id]] at the end. Summon at most one.\n- If there is one durable fact, decision, preference, constraint, or lesson worth remembering in THIS ROOM, append [[REMEMBER:one concise memory]]. Otherwise append nothing.\n- If the discussion creates a concrete next action, you may append [[TASK:short title|owner-agent-id-or-human|low|medium|high]]. Use exactly one priority word as the third field. Create at most one task.\n\nAVAILABLE SPECIALISTS TO SUMMON:\n${roster || '(none)'}`;

  return askModel({
    model,
    tools,
    reasoning: agent.reasoning || 'low',
    maxOutput: 950,
    instructions,
    input: `RECENT GROUP CHAT:\n${transcriptToText(messages)}\n\nLATEST HUMAN MESSAGE:\n${userText}\n\nSpeak now as ${agent.name}.`
  });
}

async function synthesize({ messages, userText, selected, councilGoal, tasks }) {
  if (!HAS_API_KEY()) {
    return {
      text: `Council synthesis: make one testable decision now, while keeping the biggest failure mode and the human consequence visible. ${selected.map((a) => a.name).join(', ')} approached it from different angles; use that disagreement as a checklist, not as a reason to stall.`,
      sources: [], toolCalls: [], model: 'demo-mode'
    };
  }
  return askModel({
    model: ORCHESTRATOR_MODEL(),
    reasoning: 'low',
    maxOutput: 650,
    instructions: `You are Council's Orchestrator. Resolve the room without flattening disagreement. Give the human: (1) the conclusion, (2) strongest unresolved tension if any, and (3) one best next action. Keep it crisp. Do not invent sources or tool use. Council mission: ${councilGoal || 'Help the human make better decisions and build useful things.'}`,
    input: `LATEST USER MESSAGE:\n${userText}\n\nGROUP CHAT:\n${transcriptToText(messages, 46)}\n\nAgents who spoke: ${selected.map((a) => a.name).join(', ')}.\n\nTasks proposed this turn: ${tasks.map((t) => t.title).join('; ') || '(none)'}.`
  });
}

function edgesFromContent(speakerId, content, agents) {
  const edges = [];
  const lower = content.toLowerCase();
  for (const target of agents) {
    if (target.id === speakerId) continue;
    if (lower.includes(`@${target.name.toLowerCase()}`) || lower.includes(`@${target.id.toLowerCase()}`)) {
      edges.push({ from: speakerId, to: target.id, type: 'mention' });
    }
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
    memories = {}
  } = payload;
  if (!text?.trim()) throw Object.assign(new Error('Message is required.'), { status: 400 });
  const enabled = agents.filter((a) => a.enabled !== false);
  if (!enabled.length) throw Object.assign(new Error('Enable at least one agent.'), { status: 400 });

  let initial;
  let selectionReason = 'round table';
  if (mode === 'roundtable') {
    const direct = mentionedAgents(text, enabled);
    initial = direct.length ? direct : enabled.slice(0, 8);
    selectionReason = direct.length ? 'direct mention' : 'round table';
  } else {
    const routed = await selectAgents({ agents, messages, text, councilGoal });
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

  while (queue.length && spoken.size < MAX_TOTAL_AGENT_TURNS) {
    const agent = queue.shift();
    if (!agent || spoken.has(agent.id) || agent.enabled === false) continue;
    spoken.add(agent.id);
    invited.push(agent.id);

    const raw = await runAgent({ agent, messages: workingMessages, userText: text, councilGoal, availableAgents: enabled, memories });
    const controls = parseControls(raw.text, enabled);
    const content = cleanControlTokens(raw.text);
    const reply = {
      role: 'assistant',
      agentId: agent.id,
      name: agent.name,
      roleLabel: agent.role,
      avatar: agent.avatar,
      content,
      model: raw.model,
      toolCalls: raw.toolCalls,
      sources: raw.sources
    };
    replies.push(reply);
    workingMessages.push(reply);
    edges.push(...edgesFromContent(agent.id, content, enabled));

    for (const memory of controls.memories) memoryUpdates.push({ agentId: agent.id, memory });
    for (const task of controls.tasks) tasks.push({ ...task, proposedBy: agent.id });
    for (const summonId of controls.summons) {
      const target = enabled.find((a) => a.id === summonId);
      if (target && !spoken.has(target.id) && !queue.some((a) => a.id === target.id)) {
        queue.push(target);
        edges.push({ from: agent.id, to: target.id, type: 'summon' });
      }
    }
  }

  const synthesis = await synthesize({ messages: workingMessages, userText: text, selected: replies.map((r) => enabled.find((a) => a.id === r.agentId)).filter(Boolean), councilGoal, tasks });

  return {
    replies,
    synthesis: { role: 'orchestrator', name: 'Orchestrator', avatar: '✦', content: cleanControlTokens(synthesis.text), model: synthesis.model, toolCalls: synthesis.toolCalls, sources: synthesis.sources },
    selected: invited,
    selectionReason,
    edges,
    memoryUpdates,
    tasks,
    live: HAS_API_KEY(),
    maxTurns: MAX_TOTAL_AGENT_TURNS
  };
}
