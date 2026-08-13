import assert from 'node:assert/strict';
import { clusterPortfolio } from '../lib/tools.mjs';
import { portfolioDecisionRoleIds, recoveryPolicy, requiredToolsFor } from '../lib/council.mjs';

const prompt = 'Check all 94 of my GitHub projects and rank the best projects for impact and monetizability. Pick one company priority.';
const required = requiredToolsFor(prompt, {});
assert(required.includes('github.portfolio.scan'), 'Portfolio decision must require a GitHub scan.');

const roles = portfolioDecisionRoleIds(prompt);
assert.deepEqual(roles, ['builder', 'capital', 'humanist', 'critic', 'chief']);
assert(roles.indexOf('critic') < roles.indexOf('chief'), 'Critic must speak before Chief resolves the decision.');

const retry = recoveryPolicy({ attempt: 1, reasoning: 'medium', maxOutput: 1100 });
assert.equal(retry.reasoning, 'low', 'Recovery must reduce reasoning effort.');
assert(retry.maxOutput >= 1800, 'Recovery must increase visible output budget.');

const repos = [
  { name:'gitlaw', fullName:'mikelninh/gitlaw', description:'German legal research over federal laws', readme:'legal law citation checks', topics:['legal'], private:false, daysSincePush:1, pushedAt:'2026-08-12T00:00:00Z' },
  { name:'pmm-mcp', fullName:'mikelninh/pmm-mcp', description:'Public Money Mirror Bundeshaushalt', readme:'public budget watchdog', topics:['civic-tech'], private:false, daysSincePush:2, pushedAt:'2026-08-11T00:00:00Z' },
  { name:'council', fullName:'mikelninh/council', description:'AI company operating system', readme:'agent orchestration and evidence gate', topics:['agent'], private:false, daysSincePush:0, pushedAt:'2026-08-13T00:00:00Z' },
  { name:'tiny-tactics-starfall', fullName:'mikelninh/tiny-tactics-starfall', description:'auto chess game', readme:'pvp game world', topics:['game'], private:true, daysSincePush:3, pushedAt:'2026-08-10T00:00:00Z' }
];

const clusters = clusterPortfolio(repos);
const names = new Set(clusters.map((c) => c.name));
assert(names.has('Legal, rights & access'));
assert(names.has('Public systems & democracy'));
assert(names.has('Agent infrastructure & reliability'));
assert(names.has('Games & creative worlds'));
assert(clusters.every((c) => c.evidenceGrade === 'D'), 'Venture clustering must be labeled as Council inference [D].');

console.log(`Decision quality smoke: roles=${roles.join('>')}; retry=${retry.reasoning}/${retry.maxOutput}; ventures=${clusters.length}`);
