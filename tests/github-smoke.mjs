import assert from 'node:assert/strict';
import { scanGitHubPortfolio } from '../lib/tools.mjs';
import { requiredToolsFor } from '../lib/council.mjs';

const prompt = 'can you check all my github projects and see which ones we want to work on together? highest impact, and monetisable';
const required = requiredToolsFor(prompt, {});
assert(required.includes('github.portfolio.scan'), 'Original portfolio prompt must require a GitHub portfolio scan.');

const scan = await scanGitHubPortfolio({ username: 'mikelninh' });
assert.equal(scan.status, 'success');
assert(scan.summary.count > 0, 'Expected at least one repository.');
assert(scan.data.repos.some((repo) => repo.fullName === 'mikelninh/council'), 'Expected the live scan to include mikelninh/council.');
assert(['public-only', 'public-fallback', 'authenticated'].includes(scan.summary.scope));
assert(scan.summary.readmeCount > 0, 'Expected the portfolio scan to inspect at least one README.');
const council = scan.data.repos.find((repo) => repo.fullName === 'mikelninh/council');
assert(council?.readmeFound, 'Expected the Council README to be inspected.');
assert.equal(council?.evidence?.metadata, 'A', 'GitHub API metadata must be grade A.');
assert.equal(council?.evidence?.readme, 'B', 'README claims must be grade B.');
assert(scan.evidenceModel?.A && scan.evidenceModel?.D, 'Expected the v5.2 evidence model.');
assert(Array.isArray(scan.data.ventures) && scan.data.ventures.length > 0, 'Expected inferred venture families.');
assert(scan.data.ventures.every((venture) => venture.evidenceGrade === 'D'), 'Venture families must remain grade D inference.');

console.log(`GitHub smoke: ${scan.summary.count} repos; scope=${scan.summary.scope}; READMEs=${scan.summary.readmeCount}/${scan.summary.inspectableCount}; ventures=${scan.summary.ventureCount}; council found=yes`);
