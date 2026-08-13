const GITHUB_API = 'https://api.github.com';
const GITHUB_VERSION = '2026-03-10';

export const EVIDENCE_GRADES = {
  A: 'Tool-verified — API metadata, file existence, timestamps and machine-observed state.',
  B: 'Repo-asserted — claims written in repository descriptions or READMEs; not independently verified.',
  C: 'Independently validated — external customer, revenue, usage, deployment or source proof. GitHub scan alone does not create Grade C evidence.',
  D: 'Council inference — clustering, impact, buyer, pricing, monetization, founder fit, ranking and other hypotheses.'
};

const now = () => Date.now();
const uid = (prefix = 'tool') => `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
const githubUsername = () => process.env.GITHUB_USERNAME || 'mikelninh';
const githubToken = () => process.env.GITHUB_TOKEN || '';

function githubHeaders(auth = true) {
  const headers = {
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': GITHUB_VERSION,
    'User-Agent': 'Council-Company-OS'
  };
  if (auth && githubToken()) headers.Authorization = `Bearer ${githubToken()}`;
  return headers;
}

async function githubFetch(path, { auth = true } = {}) {
  const res = await fetch(`${GITHUB_API}${path}`, { headers: githubHeaders(auth) });
  let data;
  try { data = await res.json(); } catch { data = null; }
  if (!res.ok) {
    const message = data?.message || `GitHub request failed (${res.status})`;
    const error = new Error(message);
    error.status = res.status;
    throw error;
  }
  return { data, headers: res.headers };
}

async function paginate(pathFactory, maxPages = 5, options = {}) {
  const all = [];
  for (let page = 1; page <= maxPages; page++) {
    const { data } = await githubFetch(pathFactory(page), options);
    const rows = Array.isArray(data) ? data : [];
    all.push(...rows);
    if (rows.length < 100) break;
  }
  return all;
}

function daysSince(date) {
  if (!date) return null;
  const ms = Date.now() - new Date(date).getTime();
  if (!Number.isFinite(ms)) return null;
  return Math.max(0, Math.floor(ms / 86400000));
}

function normalizeRepo(repo) {
  return {
    id: repo.id,
    name: repo.name,
    fullName: repo.full_name,
    owner: repo.owner?.login || '',
    description: repo.description || '',
    private: Boolean(repo.private),
    archived: Boolean(repo.archived),
    fork: Boolean(repo.fork),
    language: repo.language || 'Unknown',
    stars: Number(repo.stargazers_count || 0),
    forks: Number(repo.forks_count || 0),
    openIssues: Number(repo.open_issues_count || 0),
    topics: Array.isArray(repo.topics) ? repo.topics.slice(0, 12) : [],
    homepage: repo.homepage || '',
    url: repo.html_url,
    createdAt: repo.created_at,
    updatedAt: repo.updated_at,
    pushedAt: repo.pushed_at,
    daysSincePush: daysSince(repo.pushed_at),
    defaultBranch: repo.default_branch || 'main',
    visibility: repo.visibility || (repo.private ? 'private' : 'public'),
    size: Number(repo.size || 0),
    readme: '',
    readmeFound: false,
    evidence: {
      metadata: 'A',
      description: 'B',
      readme: 'B'
    }
  };
}

function repoInferenceText(repo) {
  return [repo.name, repo.description, repo.readme, ...(repo.topics || [])].join(' ').toLowerCase();
}

function familyForRepo(repo) {
  const t = repoInferenceText(repo);
  const name = String(repo.name || '').toLowerCase();

  if (/gitlaw|safevoice|klartext|agb|gesetz|legal|law|recht|stgb|bgb|eu261|flight-right|wohngeld|elterngeld|visa/.test(t)) {
    return { id:'legal-rights', name:'Legal, rights & access', rationale:'Legal navigation, consumer rights, benefits access and evidence workflows.' };
  }
  if (/public.money|bundestag|democra|citizen|lobby|haushalt|government|verwaltung|policy|faireint/.test(t)) {
    return { id:'public-systems', name:'Public systems & democracy', rationale:'Government transparency, public money, civic participation and state capability.' };
  }
  if (/agent|mcp|orchestr|council|worker|judge|crucible|toolkit|factory|eval|reliab/.test(t)) {
    return { id:'agent-infra', name:'Agent infrastructure & reliability', rationale:'Agent runtimes, orchestration, evaluation, tooling and company operating infrastructure.' };
  }
  if (/msa|health|fertility|wellness|vital|calm|apothecary|b12|vegan|empath|peace|wisdom/.test(t)) {
    return { id:'health-human', name:'Health, wellbeing & human development', rationale:'Health support, emotional development, nutrition, peace and wellbeing.' };
  }
  if (/game|gaming|tactics|poker|waifu|pokemon|card|world|realm|tien|snowman|sherlock|cyber.farm|aura|zootopia/.test(t)) {
    return { id:'games-creative', name:'Games & creative worlds', rationale:'Games, collectible experiences and playful interactive worlds.' };
  }
  if (/commerce|market|loyalty|transit|bietra|atelier|bank|collector|trading|wealth|storefront|brand|sneaker/.test(t)) {
    return { id:'commerce', name:'Commerce, marketplaces & financial tools', rationale:'Commerce platforms, loyalty, marketplaces, trading and buyer/seller utilities.' };
  }
  if (/portfolio|personal site|github\.io/.test(t) || ['mikelninh', 'mikelninh.github.io'].includes(name)) {
    return { id:'portfolio', name:'Portfolio & personal infrastructure', rationale:'Personal portfolio, identity and knowledge infrastructure.' };
  }
  return { id:'other', name:'Other experiments', rationale:'Projects not confidently assigned to another venture family.' };
}

export function clusterPortfolio(repos = []) {
  const groups = new Map();
  for (const repo of repos) {
    const family = familyForRepo(repo);
    if (!groups.has(family.id)) groups.set(family.id, { ...family, evidenceGrade:'D', repos:[] });
    groups.get(family.id).repos.push(repo);
  }
  return [...groups.values()]
    .map((group) => ({
      id: group.id,
      name: group.name,
      rationale: group.rationale,
      evidenceGrade: 'D',
      count: group.repos.length,
      privateCount: group.repos.filter((r) => r.private).length,
      active90: group.repos.filter((r) => r.daysSincePush !== null && r.daysSincePush <= 90).length,
      repoNames: group.repos
        .slice()
        .sort((a, b) => new Date(b.pushedAt || 0) - new Date(a.pushedAt || 0))
        .map((r) => r.fullName)
    }))
    .sort((a, b) => (b.active90 - a.active90) || (b.count - a.count) || a.name.localeCompare(b.name));
}

function portfolioSummary(repos, scope, username, ventures = []) {
  const active30 = repos.filter((r) => r.daysSincePush !== null && r.daysSincePush <= 30).length;
  const active90 = repos.filter((r) => r.daysSincePush !== null && r.daysSincePush <= 90).length;
  const privateCount = repos.filter((r) => r.private).length;
  const readmeCount = repos.filter((r) => r.readmeFound).length;
  const inspectableCount = repos.filter((r) => r.size > 0 && !r.archived).length;
  const languages = new Map();
  for (const r of repos) languages.set(r.language, (languages.get(r.language) || 0) + 1);
  const topLanguages = [...languages.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6).map(([language, count]) => ({ language, count }));
  return {
    username,
    scope,
    count: repos.length,
    privateCount,
    publicCount: repos.length - privateCount,
    active30,
    active90,
    archived: repos.filter((r) => r.archived).length,
    stars: repos.reduce((sum, r) => sum + r.stars, 0),
    readmeCount,
    inspectableCount,
    readmeCoverage: inspectableCount ? Math.round((readmeCount / inspectableCount) * 100) : 100,
    ventureCount: ventures.length,
    topLanguages
  };
}

function readmeExcerpt(markdown = '', max = 900) {
  return String(markdown)
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/<[^>]+>/g, ' ')
    .replace(/^#{1,6}\s*/gm, '')
    .replace(/[>*_`~|]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max);
}

async function mapLimit(items, limit, worker) {
  const output = new Array(items.length);
  let cursor = 0;
  const runners = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (true) {
      const index = cursor++;
      if (index >= items.length) return;
      output[index] = await worker(items[index], index);
    }
  });
  await Promise.all(runners);
  return output;
}

async function inspectReadmes(repos, { authenticated }) {
  const candidates = repos.filter((repo) => repo.size > 0 && !repo.archived);
  await mapLimit(candidates, 8, async (repo) => {
    try {
      const { data } = await githubFetch(`/repos/${encodeURIComponent(repo.owner)}/${encodeURIComponent(repo.name)}/readme`, { auth: authenticated });
      if (data?.content && data?.encoding === 'base64') {
        const markdown = Buffer.from(String(data.content).replace(/\n/g, ''), 'base64').toString('utf8');
        repo.readme = readmeExcerpt(markdown);
        repo.readmeFound = Boolean(repo.readme);
      }
    } catch (error) {
      if (error?.status !== 404) repo.readmeError = error?.message || 'README fetch failed';
    }
    return repo;
  });
  return repos;
}

export function toolStatus() {
  return {
    github: {
      available: true,
      username: githubUsername(),
      mode: githubToken() ? 'authenticated' : 'public',
      privateRepos: Boolean(githubToken()),
      deepInspection: true,
      evidenceGrades: true,
      ventureClustering: true
    },
    openai: {
      available: Boolean(process.env.OPENAI_API_KEY),
      webSearch: Boolean(process.env.OPENAI_API_KEY)
    },
    vercel: {
      runtime: Boolean(process.env.VERCEL),
      environment: process.env.VERCEL_ENV || 'local',
      managementApi: Boolean(process.env.VERCEL_TOKEN)
    }
  };
}

export async function scanGitHubPortfolio({ username = githubUsername(), includeForks = false, inspect = true } = {}) {
  const started = now();
  let scope = 'public-only';
  let repos = [];
  let authError = null;
  const wantedOwner = String(username).toLowerCase();

  if (githubToken()) {
    try {
      repos = await paginate(
        (page) => `/user/repos?per_page=100&page=${page}&sort=pushed&direction=desc&visibility=all&affiliation=owner`,
        5,
        { auth: true }
      );
      repos = repos.filter((repo) => String(repo.owner?.login || '').toLowerCase() === wantedOwner);
      scope = 'authenticated';
    } catch (error) {
      authError = error.message;
    }
  }

  if (!repos.length) {
    repos = await paginate(
      (page) => `/users/${encodeURIComponent(username)}/repos?per_page=100&page=${page}&type=owner&sort=pushed&direction=desc`,
      5,
      { auth: false }
    );
    scope = authError ? 'public-fallback' : 'public-only';
  }

  let normalized = repos
    .map(normalizeRepo)
    .filter((repo) => includeForks || !repo.fork)
    .sort((a, b) => new Date(b.pushedAt || 0) - new Date(a.pushedAt || 0));

  if (inspect) normalized = await inspectReadmes(normalized, { authenticated: scope === 'authenticated' });
  const ventures = clusterPortfolio(normalized);

  return {
    id: uid('github-portfolio'),
    tool: 'github.portfolio.scan',
    status: 'success',
    startedAt: new Date(started).toISOString(),
    durationMs: now() - started,
    scope,
    summary: portfolioSummary(normalized, scope, username, ventures),
    evidenceModel: EVIDENCE_GRADES,
    data: { repos: normalized, ventures },
    evidence: [
      { label: `${username} on GitHub`, url: `https://github.com/${encodeURIComponent(username)}` }
    ],
    warning: authError ? `Authenticated GitHub access failed; fell back to public repositories: ${authError}` : null
  };
}

export async function getGitHubRepoSnapshot(fullName = process.env.COUNCIL_REPO || 'mikelninh/council') {
  const started = now();
  const [owner, repo] = String(fullName).split('/');
  if (!owner || !repo) throw new Error('Invalid repository name.');
  const { data } = await githubFetch(`/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`, { auth: Boolean(githubToken()) });
  const normalized = normalizeRepo(data);
  return {
    id: uid('github-repo'),
    tool: 'github.repo.snapshot',
    status: 'success',
    startedAt: new Date(started).toISOString(),
    durationMs: now() - started,
    scope: githubToken() ? 'authenticated' : 'public',
    evidenceModel: EVIDENCE_GRADES,
    summary: {
      fullName: normalized.fullName,
      pushedAt: normalized.pushedAt,
      daysSincePush: normalized.daysSincePush,
      stars: normalized.stars,
      openIssues: normalized.openIssues,
      language: normalized.language,
      archived: normalized.archived
    },
    data: { repo: normalized },
    evidence: [{ label: normalized.fullName, url: normalized.url }]
  };
}

function failedRun(tool, error, started = now()) {
  return {
    id: uid(tool.replace(/[^a-z]+/gi, '-')),
    tool,
    status: 'failed',
    startedAt: new Date(started).toISOString(),
    durationMs: now() - started,
    error: error?.message || String(error || 'Tool failed'),
    evidence: []
  };
}

export function requiredToolsFor(text = '', context = {}) {
  const lower = String(text).toLowerCase();
  const tools = [];
  const portfolioIntent = /github|repositor|\brepos?\b|codebase|portfolio/.test(lower) ||
    (/projects?/.test(lower) && /moneti|impact|rank|priorit|work on|which/.test(lower));
  if (portfolioIntent) tools.push('github.portfolio.scan');
  if (context.companyCycle && !tools.includes('github.repo.snapshot')) tools.push('github.repo.snapshot');
  return tools;
}

export async function runRequiredTools({ text = '', context = {}, username } = {}) {
  const required = requiredToolsFor(text, context);
  const runs = [];
  for (const tool of required) {
    const started = now();
    try {
      if (tool === 'github.portfolio.scan') runs.push(await scanGitHubPortfolio({ username: username || githubUsername(), inspect: true }));
      if (tool === 'github.repo.snapshot') runs.push(await getGitHubRepoSnapshot());
    } catch (error) {
      runs.push(failedRun(tool, error, started));
    }
  }
  return { required, runs };
}

function compactRepoLine(r, i) {
  const desc = String(r.description || '').replace(/\s+/g, ' ').slice(0, 130) || '(no description)';
  const topics = r.topics?.length ? ` topics=${r.topics.slice(0, 6).join(',')}` : '';
  const readme = r.readme ? ` | [B README] ${String(r.readme).replace(/\s+/g, ' ').slice(0, 320)}` : '';
  return `${i + 1}. ${r.fullName} | [A] ${r.visibility}; ${r.language}; stars=${r.stars}; issues=${r.openIssues}; pushed=${r.pushedAt || 'unknown'} | [B description] ${desc}${topics}${readme}`;
}

export function compactToolContext(runs = []) {
  const blocks = [];
  for (const run of runs) {
    if (run.status !== 'success') {
      blocks.push(`TOOL ${run.tool}: FAILED — ${run.error || 'unknown error'}`);
      continue;
    }
    if (run.tool === 'github.portfolio.scan') {
      const s = run.summary;
      const rows = (run.data?.repos || []).map(compactRepoLine);
      const ventures = (run.data?.ventures || []).map((v, i) => `${i + 1}. [D] ${v.name} — ${v.count} repos; ${v.active90} active90; members=${v.repoNames.join(', ')}`);
      blocks.push([
        `TOOL github.portfolio.scan: SUCCESS`,
        `Scope: ${s.scope}; user=${s.username}; repositories=${s.count}; private=${s.privateCount}; public=${s.publicCount}; active30d=${s.active30}; active90d=${s.active90}; README inspected=${s.readmeCount}/${s.inspectableCount} (${s.readmeCoverage}%); inferredVentureFamilies=${s.ventureCount}; totalStars=${s.stars}.`,
        `EVIDENCE GRADES: [A] ${EVIDENCE_GRADES.A} [B] ${EVIDENCE_GRADES.B} [C] ${EVIDENCE_GRADES.C} [D] ${EVIDENCE_GRADES.D}`,
        run.warning ? `Warning: ${run.warning}` : '',
        'VENTURE FAMILIES — [D] heuristic grouping, challenge if wrong:',
        ...ventures,
        'REPOSITORIES:',
        ...rows
      ].filter(Boolean).join('\n'));
    }
    if (run.tool === 'github.repo.snapshot') {
      const r = run.data?.repo;
      blocks.push(`TOOL github.repo.snapshot: SUCCESS\n[A] ${r?.fullName} | ${r?.language} | stars=${r?.stars} issues=${r?.openIssues} | pushed=${r?.pushedAt}\n[B description] ${r?.description || '(no description)'}`);
    }
  }
  return blocks.join('\n\n');
}
