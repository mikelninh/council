import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { runCouncil, status } from './lib/council.mjs';
import { scanGitHubPortfolio } from './lib/tools.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.join(__dirname, 'public');

function loadEnvFile() {
  for (const name of ['.env.local', '.env']) {
    const file = path.join(__dirname, name);
    if (!fs.existsSync(file)) continue;
    for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const i = trimmed.indexOf('=');
      if (i < 1) continue;
      const key = trimmed.slice(0, i).trim();
      const value = trimmed.slice(i + 1).trim().replace(/^['"]|['"]$/g, '');
      if (!(key in process.env)) process.env[key] = value;
    }
  }
}
loadEnvFile();

const port = Number(process.env.PORT || 3030);
function json(res, code, value) {
  res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(value));
}
async function readJson(req) {
  let body = '';
  for await (const chunk of req) {
    body += chunk;
    if (body.length > 1_500_000) throw Object.assign(new Error('Request too large.'), { status: 413 });
  }
  return body ? JSON.parse(body) : {};
}

function serveStatic(req, res) {
  const urlPath = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
  const requested = urlPath === '/' ? 'index.html' : urlPath.replace(/^\//, '');
  const file = path.normalize(path.join(publicDir, requested));
  if (!file.startsWith(publicDir) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
    res.writeHead(404);
    return res.end('Not found');
  }
  const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml' };
  res.writeHead(200, { 'Content-Type': types[path.extname(file)] || 'application/octet-stream' });
  fs.createReadStream(file).pipe(res);
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://localhost');
    const pathname = url.pathname;
    if (req.method === 'GET' && pathname === '/api/status') return json(res, 200, status());
    if (req.method === 'GET' && pathname === '/api/portfolio') {
      const username = url.searchParams.get('username') || process.env.GITHUB_USERNAME || 'mikelninh';
      if (!/^[a-zA-Z0-9-]{1,39}$/.test(username)) return json(res, 400, { error: 'Invalid GitHub username.' });
      return json(res, 200, await scanGitHubPortfolio({ username }));
    }
    if (req.method === 'POST' && pathname === '/api/council') return json(res, 200, await runCouncil(await readJson(req)));
    if (req.method === 'GET') return serveStatic(req, res);
    res.writeHead(405);
    res.end('Method not allowed');
  } catch (error) {
    console.error(error);
    json(res, error?.status || 500, { error: error?.message || 'Council failed.' });
  }
});

server.listen(port, () => {
  const s = status();
  console.log(`Council v5 running at http://localhost:${port} (${s.live ? s.model : 'demo mode'})`);
});
