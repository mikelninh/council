import assert from 'node:assert/strict';
import { buildFounderView } from '../api/council.mjs';

const result = {
  synthesis: {
    content: `1. EVIDENCE SCOPE — authenticated scan.\n\n4. RED-TEAM CHALLENGE — Strongest alternative: Public Money Mirror. GitLaw could lose if firms will not pay.\n\n5. DECISION — Make gitlaw the company priority now. It has the strongest combination of readiness and a credible paid wedge.\n\n6. CONFIDENCE — 78/100. Strong technical evidence, limited external revenue proof.\n\n7. FALSIFICATION TEST — Reverse this decision if 10 serious buyer conversations produce no paid pilot or credible willingness to pay.\n\n8. NEXT ACTION —\n1. Convert one pilot to a paid workflow.\n2. Run 10 buyer conversations.`
  },
  decisionQuality: { portfolioDecision:true, criticSucceeded:true },
  evidenceGate: { passed:true },
  selected:['builder','capital','humanist','critic','chief'],
  toolRuns:[{
    tool:'github.portfolio.scan', status:'success',
    summary:{ count:94, privateCount:50, scope:'authenticated', active90:46, readmeCoverage:89 }
  }]
};

const view = buildFounderView(result);
assert(view, 'Expected founder view.');
assert.match(view.title, /gitlaw/i);
assert.equal(view.confidence, 78);
assert.match(view.alternative, /Public Money Mirror/i);
assert.match(view.falsification, /10 serious buyer conversations/i);
assert.equal(view.nextActions.length, 2);
assert.equal(view.portfolio.repos, 94);
assert.equal(view.portfolio.privateRepos, 50);
assert.equal(view.agents, 5);
assert.equal(view.criticSucceeded, true);

console.log(`Founder view smoke: decision=${view.title}; confidence=${view.confidence}; repos=${view.portfolio.repos}; audit=preserved`);
