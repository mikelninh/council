import assert from 'node:assert/strict';
import { deriveProjectState } from '../lib/mission-control.mjs';

const repo={name:'hyperspace-kids',fullName:'mikelninh/hyperspace-kids',url:'https://github.com/mikelninh/hyperspace-kids',private:true,pushedAt:'2026-09-01T00:00:00Z',daysSincePush:2};
const harness={project:{name:'Hyperspace Kids'}};
let state=deriveProjectState({repo,harness,task:{status:'awaiting_human_review',approval_required:false,goal:'Judge real-device release gate.',next_step:'Review phone interaction.',risk_class:'A2',failures:[],uncertainties:[]}});
assert.equal(state.state,'needs_you');assert.equal(state.needsYou,true);assert.equal(state.blocked,false);assert.ok(state.attention>=100);
state=deriveProjectState({repo,harness:null,task:null});assert.equal(state.state,'untracked');assert.equal(state.harnessed,false);assert.ok(state.attention>0);
state=deriveProjectState({repo,harness,task:{status:'completed',failures:[],uncertainties:[]}});assert.equal(state.state,'completed');assert.equal(state.needsYou,false);assert.equal(state.attention,0);
state=deriveProjectState({repo,harness,task:{status:'blocked',failures:['missing evidence'],uncertainties:[]}});assert.equal(state.state,'blocked');assert.equal(state.blocked,true);
state=deriveProjectState({repo:null,label:'Private Project'});assert.equal(state.state,'hidden');assert.match(state.reason,/scope/i);
console.log('MISSION CONTROL PASS: state derivation and human/blocker gates are deterministic.');