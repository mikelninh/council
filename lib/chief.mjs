const CORE_LANES=new Set(['your_move','can_continue','blocked','needs_contract']);

const clamp=(value,min=0,max=5)=>Math.max(min,Math.min(max,Number(value)||0));
const round=(value,digits=1)=>Number(Number(value).toFixed(digits));

function decisionOf(project){
  return project?.brief?.decision||project?.brief?.workflow?.decision||null;
}

function workflowOf(project){
  return project?.brief?.workflow||{};
}

function roadmapOf(project){
  return project?.brief?.roadmap||{};
}

export function scoreChiefCandidate(project){
  const workflow=workflowOf(project);
  const decision=decisionOf(project);
  if(!project?.brief?.isCore||!CORE_LANES.has(workflow.lane)||!decision)return null;

  const impact=clamp(decision.impact);
  const urgency=clamp(decision.urgency);
  const unlockValue=clamp(decision.unlockValue??decision.unlock_value);
  const effort=Math.max(.5,clamp(decision.effort,.5,5));
  const confidence=clamp(decision.confidence);

  // Transparent leverage heuristic. These weights are policy, not objective truth.
  const raw=(impact*2)+(unlockValue*2)+(urgency*1.5)+(confidence*1.2)-(effort*1.1);
  const laneAdjustment=workflow.lane==='can_continue'?1.5:workflow.lane==='your_move'?1:workflow.lane==='blocked'?-2:-5;
  const score=round(raw+laneAdjustment,1);

  return {
    project:project.name,
    repo:project.repo,
    lane:workflow.lane,
    owner:workflow.owner||'',
    riskClass:workflow.riskClass||'',
    nextMove:workflow.nextMove||roadmapOf(project).next?.[0]?.title||'Define the next explicit mission.',
    goal:workflow.goal||project.currentTask||roadmapOf(project).current?.title||'',
    rationale:decision.rationale||'No Chief rationale has been recorded yet.',
    score,
    factors:{impact,urgency,unlockValue,effort,confidence},
    confidencePercent:Math.round((confidence/5)*100),
    expectedOutcomes:Array.isArray(workflow.expectedOutcomes)?workflow.expectedOutcomes.slice(0,3):[],
    constraints:Array.isArray(workflow.constraints)?workflow.constraints.slice(0,4):[],
    forbidden:Array.isArray(workflow.forbidden)?workflow.forbidden.slice(0,4):[],
    sources:Array.isArray(workflow.sources)?workflow.sources.slice(0,5):[],
    evidenceType:decision.source||'chief_estimate_v1'
  };
}

function rank(rows){return rows.map(scoreChiefCandidate).filter(Boolean).sort((a,b)=>b.score-a.score||b.factors.confidence-a.factors.confidence||a.project.localeCompare(b.project));}

export function buildChiefBrief(projects=[]){
  const ranked=rank(projects);
  const delegations=ranked.filter(x=>x.lane==='can_continue');
  const humanMoves=ranked.filter(x=>x.lane==='your_move');
  const blockers=ranked.filter(x=>x.lane==='blocked');
  const missingContracts=ranked.filter(x=>x.lane==='needs_contract');
  const recommendation=delegations[0]||humanMoves[0]||blockers[0]||missingContracts[0]||null;

  return {
    schema:'council-chief-v1',
    recommendation,
    alternatives:ranked.filter(x=>x!==recommendation).slice(0,4),
    highestHumanGate:humanMoves[0]||null,
    highestBlocker:blockers[0]||null,
    counts:{delegatable:delegations.length,yourMove:humanMoves.length,blocked:blockers.length,needsContract:missingContracts.length},
    policy:{
      recommendationPreference:'Prefer an unblocked A0-A2 delegation when one exists; surface human gates separately.',
      scoring:'impact×2 + unlock×2 + urgency×1.5 + confidence×1.2 − effort×1.1 + lane adjustment',
      authority:'Recommendations are advisory. Approval does not authorize A3/A4 actions.'
    }
  };
}
