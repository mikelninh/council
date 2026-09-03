import assert from 'node:assert/strict';
import {buildRunnerIssueBody,parseMissionPacket,runnerStatusFromLabels,summarizeMissionIssues,validateMissionPacket} from '../lib/mission-runner.mjs';

const body=`## Mission Control approval

APPROVAL: approved
PROJECT: PrüfPilot
REPOSITORY: mikelninh/pruefpilot
RISK_CLASS: A2
RUNNER_MODE: auto
SNAPSHOT: 2026-09-03T14:33:26.000Z

### Approved mission
Build a representative reviewer study.

### Why now
It closes the proof gap.

### Done when
- Case set exists.
- Validator passes.

### Constraints
- Synthetic data only.

### Forbidden
- Production deployment
- External sends

### Execution boundary
Scout → Builder → Verifier may continue only within A0–A2. Any A3/A4 action must stop.`;
const packet=parseMissionPacket(body,'[Mission] PrüfPilot');
assert.equal(packet.project,'PrüfPilot');
assert.equal(packet.repository,'mikelninh/pruefpilot');
assert.equal(packet.riskClass,'A2');
assert.equal(packet.runnerMode,'auto');
assert.deepEqual(packet.doneWhen,['Case set exists.','Validator passes.']);
assert.equal(validateMissionPacket(packet).ok,true);
assert.match(buildRunnerIssueBody(packet,{sourceRepo:'mikelninh/council',sourceIssueNumber:21,sourceIssueUrl:'https://github.com/mikelninh/council/issues/21'}),/Scout/);
const unsafe={...packet,riskClass:'A3'};assert.equal(validateMissionPacket(unsafe).ok,false,'A3 must never enter automatic runner');
assert.equal(runnerStatusFromLabels([{name:'agent-running'}]),'working');
assert.equal(runnerStatusFromLabels([{name:'agent-running'},{name:'agent-review'}]),'review');
const summary=summarizeMissionIssues([{number:21,title:'[Mission] PrüfPilot',html_url:'https://example/21',body,labels:[{name:'agent-running'}],state:'open',updated_at:'2026-09-03T15:00:00Z'},{number:20,title:'[Mission] GitLaw',html_url:'https://example/20',body:body.replaceAll('PrüfPilot','GitLaw').replace('pruefpilot','gitlaw'),labels:[{name:'mission-complete'}],state:'closed',updated_at:'2026-09-03T14:00:00Z'}]);
assert.equal(summary.counts.working,1);assert.equal(summary.counts.complete,1);assert.equal(summary.active[0].project,'PrüfPilot');
console.log('MISSION RUNNER PASS: approval packets are bounded, parseable, status-aware and A3/A4 fail closed.');
