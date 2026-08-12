import assert from 'node:assert/strict';
import { scanGitHubPortfolio } from '../lib/tools.mjs';
import { requiredToolsFor } from '../lib/council.mjs';

const prompt = 'can you check all my github projects and see which ones we want to work on together? highest impact, and monetisable';
const required = requiredToolsFor(prompt, {});
assert(required.includes('github.portfolio.scan'), 'Original portfolio prompt must require a GitHub portfolio scan.');

const scan = await scanGitHubPortfolio({ username: 'mikelninh' });
assert.equal(scan.status, 'success');
assert(scan.summary.count > 0, 'Expected at least one public repository.');
assert(scan.data.repos.some((repo) => repo.fullName === 'mikelninh/council'), 'Expected the live scan to include mikelninh/council.');
assert(['public-only', 'public-fallback', 'authenticated'].includes(scan.summary.scope));

console.log(`GitHub smoke: ${scan.summary.count} repos; scope=${scan.summary.scope}; council found=yes`);
