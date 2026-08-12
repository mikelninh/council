const GITHUB_API = 'https://api.github.com';
const GITHUB_VERSION = '2026-03-10';

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

async function paginate(pathFactory, maxPages = 3, options = {}) {
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
    visibility: repo.visibility || (repo.private ? 'private' : 'public')
  };
}

function portfolioSummary(repos, scope, username) {
  const active30 = repos.filter((r) => r.daysSincePush !== null && r.daysSincePush <= 30).length;
  const active90 = repos.filter((r) => r.daysSincePush !== null && r.daysSincePush <= 90).length;
  const privateCount = repos.filter((r) => r.private).length;
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
    topLanguages
  };
}

export function toolStatus() {
  return {
    github: {
      available: true,
      username: githubUsername(),
      mode: githubToken() ? 'authenticated' : 'public',
      privateRepos: Boolean(githubToken())
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

export async function scanGitHubPortfolio({ username = githubUsername(), includeForks = false } = {}) {
  const started = now();
  let scope = 'public-only';
  let repos = [];
  let authError = null;

  if (githubToken()) {
    try {
      repos = await paginate(
        (page) => `/user/repos?per_page=100&page=${page}&sort=pushed&direction=desc&visibility=all&affiliation=owner,collaborator,organization_member`,
        3,
        { auth: true }
      );
      scope = 'authenticated';
    } catch (error) {
      authError = error.message;
    }
  }

  if (!repos.length) {
    repos = await paginate(
      (page) => `/users/${encodeURIComponent(username)}/repos?per_page=100&page=${page}&type=owner&sort=pushed&direction=desc`,
      3,
      { auth: false }
    );
    scope = authError ? 'public-fallback' : 'public-only';
  }

  const normalized = repos
    .map(normalizeRepo)
    .filter((repo) => includeForks || !repo.fork)
    .sort((a, b) => new Date(b.pushedAt || 0) - new Date(a.pushedAt || 0));

  return {
    id: uid('github-portfolio'),
    tool: 'github.portfolio.scan',
    status: 'success',
    startedAt: new Date(started).toISOString(),
    durationMs: now() - started,
    scope,
    summary: portfolioSummary(normalized, scope, username),
    data: { repos: normalized },
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
      if (tool === 'github.portfolio.scan') runs.push(await scanGitHubPortfolio({ username: username || githubUsername() }));
      if (tool === 'github.repo.snapshot') runs.push(await getGitHubRepoSnapshot());
    } catch (error) {
      runs.push(failedRun(tool, error, started));
    }
  }
  return { required, runs };
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
      const rows = (run.data?.repos || []).map((r, i) => {
        const desc = String(r.description || '').replace(/\s+/g, ' ').slice(0, 140) || '(no description)';
        const topics = r.topics?.length ? ` topics=${r.topics.join(',')}` : '';
        return `${i + 1}. ${r.fullName} | ${r.visibility} | ${r.language} | stars=${r.stars} forks=${r.forks} issues=${r.openIssues} | pushed=${r.pushedAt || 'unknown'} | ${desc}${topics}`;
      });
      blocks.push([
        `TOOL github.portfolio.scan: SUCCESS`,
        `Scope: ${s.scope}; user=${s.username}; repositories=${s.count}; private=${s.privateCount}; active30d=${s.active30}; active90d=${s.active90}; totalStars=${s.stars}.`,
        run.warning ? `Warning: ${run.warning}` : '',
        'REPOSITORIES:',
        ...rows
      ].filter(Boolean).join('\n'));
    }
    if (run.tool === 'github.repo.snapshot') {
      const r = run.data?.repo;
      blocks.push(`TOOL github.repo.snapshot: SUCCESS\n${r?.fullName} | ${r?.language} | stars=${r?.stars} issues=${r?.openIssues} | pushed=${r?.pushedAt} | ${r?.description || '(no description)'}`);
    }
  }
  return blocks.join('\n\n');
}
