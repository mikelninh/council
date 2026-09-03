import assert from 'node:assert/strict';
import { buildChiefBrief, scoreChiefCandidate } from '../lib/chief.mjs';

const project=(name,lane,decision,extra={})=>({name,repo:`mikelninh/${name}`,brief:{isCore:true,workflow:{lane,owner:lane==='your_move'?'operator':'builder',riskClass:lane==='your_move'?'A3':'A2',nextMove:`Do ${name}`,goal:`Goal ${name}`,expectedOutcomes:[`Finish ${name}`],constraints:['bounded'],forbidden:['A3'],sources:['README.md']},decision,...extra}});
const estimate=(impact,urgency,unlockValue,effort,confidence,rationale='why')=>({impact,urgency,unlockValue,effort,confidence,rationale,source:'chief_estimate_v1'});

const pruef=project('pruefpilot','can_continue',estimate(5,5,5,3,5));
const factory=project('digital-worker-factory','can_continue',estimate(5,4,5,3,4));
const trust=project('trustready','your_move',estimate(5,5,5,1.5,4.5));
const blocked=project('care-os','blocked',estimate(5,5,5,2,5));

const scored=scoreChiefCandidate(pruef);
assert.equal(scored.project,'pruefpilot');
assert.equal(scored.lane,'can_continue');
assert.ok(scored.score>0);
assert.equal(scored.confidencePercent,100);

const chief=buildChiefBrief([trust,factory,pruef,blocked]);
assert.equal(chief.recommendation.project,'pruefpilot','Chief should prefer the strongest unblocked delegation over a human gate or blocker');
assert.equal(chief.highestHumanGate.project,'trustready');
assert.equal(chief.highestBlocker.project,'care-os');
assert.equal(chief.counts.delegatable,2);
assert.match(chief.policy.scoring,/impact/);
assert.match(chief.policy.authority,/A3\/A4/);

console.log('CHIEF PASS: recommendation ranking is deterministic, explainable and preserves human approval boundaries.');
