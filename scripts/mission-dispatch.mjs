import fs from 'node:fs';
import {assertMissionPacket,backendLabel,buildCopilotInstructions,buildRunnerIssueBody,parseMissionPacket,sourceMarker,targetMarker} from '../lib/mission-runner.mjs';

const API='https://api.github.com';
const sourceToken=process.env.SOURCE_TOKEN||'';
const runnerToken=process.env.MISSION_RUNNER_TOKEN||'';
const sourceRepo=process.env.GITHUB_REPOSITORY||'';
const eventPath=process.env.GITHUB_EVENT_PATH;
const event=eventPath?JSON.parse(fs.readFileSync(eventPath,'utf8')):{};
const issue=event.issue||{};
const issueNumber=Number(issue.number||0);
const owner=event.repository?.owner?.login||sourceRepo.split('/')[0]||'mikelninh';
const labelsOf=(value)=>new Set((value?.labels||[]).map(x=>typeof x==='string'?x:x?.name).filter(Boolean));

async function api(token,path,{method='GET',body,accept='application/vnd.github+json'}={}){
  if(!token)throw new Error('missing token');
  const response=await fetch(`${API}${path}`,{method,headers:{Accept:accept,Authorization:`Bearer ${token}`,'X-GitHub-Api-Version':'2022-11-28','Content-Type':'application/json','User-Agent':'Council-Mission-Runner'},body:body===undefined?undefined:JSON.stringify(body)});
  const text=await response.text();let payload=null;try{payload=text?JSON.parse(text):null}catch{payload=text}
  if(!response.ok){const error=new Error(payload?.message||`GitHub ${response.status}`);error.status=response.status;error.payload=payload;throw error}
  return payload;
}
const repoPath=(repo)=>repo.split('/').map(encodeURIComponent).join('/');
async function ensureLabel(token,repo,name,color,description){try{await api(token,`/repos/${repoPath(repo)}/labels`,{method:'POST',body:{name,color,description}})}catch(error){if(error.status!==422)throw error}}
async function addLabels(token,repo,number,labels){await api(token,`/repos/${repoPath(repo)}/issues/${number}/labels`,{method:'POST',body:{labels}})}
async function removeLabel(token,repo,number,label){try{await api(token,`/repos/${repoPath(repo)}/issues/${number}/labels/${encodeURIComponent(label)}`,{method:'DELETE'})}catch(error){if(error.status!==404)throw error}}
async function comment(token,repo,number,body){return api(token,`/repos/${repoPath(repo)}/issues/${number}/comments`,{method:'POST',body:{body}})}
async function setSourceState({add=[],remove=[],body}){
  const definitions=[
    ['runner-ready','19765d','Mission runner credentials and policy preflight passed'],
    ['runner-dispatched','315efb','Mission was handed to a bounded worker backend'],
    ['runner-queued','6f8cff','Mission is waiting for an available worker'],
    ['worker-running','6f8cff','Provider-independent worker is executing the approved mission'],
    ['worker-review','9d6a18','Worker result is ready for human PR review'],
    ['runner-blocked','b64a4a','Mission runner could not start or needs intervention']
  ];
  for(const [name,color,description] of definitions)await ensureLabel(sourceToken,sourceRepo,name,color,description);
  if(add.length)await addLabels(sourceToken,sourceRepo,issueNumber,add);
  for(const label of remove)await removeLabel(sourceToken,sourceRepo,issueNumber,label);
  if(body)await comment(sourceToken,sourceRepo,issueNumber,body);
}

async function findOrCreateTarget(packet,backend){
  const marker=sourceMarker(sourceRepo,issueNumber);
  const recent=await api(runnerToken,`/repos/${repoPath(packet.repository)}/issues?state=all&per_page=100&sort=created&direction=desc`);
  let targetIssue=(recent||[]).find(x=>!x.pull_request&&String(x.body||'').includes(marker));
  const targetLabels=[
    ['mission-runner','315efb','Bounded Mission Control worker task'],
    ['from-council','eef2ff','Mission originated in Council Mission Control'],
    ['runner-queued','6f8cff','Mission is waiting for an available worker'],
    [backendLabel(backend),'d4d7dd',`Mission Control backend: ${backend}`]
  ];
  for(const [name,color,description] of targetLabels){try{await ensureLabel(runnerToken,packet.repository,name,color,description)}catch{}}
  if(!targetIssue){
    targetIssue=await api(runnerToken,`/repos/${repoPath(packet.repository)}/issues`,{method:'POST',body:{title:`[Worker Mission C#${issueNumber}] ${packet.project}: ${packet.mission.slice(0,86)}`,body:buildRunnerIssueBody(packet,{sourceRepo,sourceIssueNumber:issueNumber,sourceIssueUrl:issue.html_url,backend}),labels:['mission-runner','from-council','runner-queued',backendLabel(backend)]}});
  }else if(targetIssue.state==='open'){
    try{await addLabels(runnerToken,packet.repository,targetIssue.number,['mission-runner','from-council','runner-queued',backendLabel(backend)])}catch{}
  }
  return targetIssue;
}

async function dispatchSelfHosted(packet,targetIssue){
  const current=labelsOf(issue);
  if(current.has('runner-dispatched')&&(current.has('runner-queued')||current.has('worker-running')||current.has('worker-review'))){
    console.log(`RUNNER DISPATCH SKIP: ${sourceRepo}#${issueNumber} is already queued/running/review`);return;
  }
  try{
    await api(runnerToken,`/repos/${repoPath(sourceRepo)}/actions/workflows/mission-worker.yml/dispatches`,{method:'POST',body:{ref:'main',inputs:{source_issue:String(issueNumber),target_repo:packet.repository,target_issue:String(targetIssue.number)}}});
  }catch(error){
    await setSourceState({add:['runner-blocked'],remove:['agent-handoff','agent-running','worker-running','runner-queued'],body:`${targetMarker(packet.repository,targetIssue.number)}\n⚠️ **Worker dispatch blocked.** Target issue: ${targetIssue.html_url}. GitHub returned: ${error.message}. The mission remains durable; no A3/A4 action occurred.`});throw error;
  }
  await setSourceState({add:['runner-dispatched','runner-queued'],remove:['agent-handoff','agent-running','agent-review','worker-running','worker-review','runner-blocked','runner-ready'],body:`${targetMarker(packet.repository,targetIssue.number)}\n✦ **Mission queued for the provider-independent worker.** Target: ${targetIssue.html_url}. Backend: **self-hosted**. If no local runner is online, the workflow stays queued rather than pretending to work.`});
  console.log(`RUNNER DISPATCH PASS: self-hosted ${packet.repository}#${targetIssue.number}`);
}

async function dispatchCopilot(packet,targetIssue,targetMeta){
  const alreadyAssigned=(targetIssue.assignees||[]).some(x=>x.login==='copilot-swe-agent[bot]');
  if(!alreadyAssigned){
    try{
      await api(runnerToken,`/repos/${repoPath(packet.repository)}/issues/${targetIssue.number}/assignees`,{method:'POST',body:{assignees:['copilot-swe-agent[bot]'],agent_assignment:{target_repo:packet.repository,base_branch:targetMeta.default_branch||'main',custom_instructions:buildCopilotInstructions(packet,{sourceIssueUrl:issue.html_url,targetIssueUrl:targetIssue.html_url}),custom_agent:'',model:''}}});
    }catch(error){
      await setSourceState({add:['runner-blocked'],remove:['agent-handoff','agent-running','worker-running','runner-queued'],body:`${targetMarker(packet.repository,targetIssue.number)}\n⚠️ **Optional Copilot backend could not start.** Target issue: ${targetIssue.html_url}. GitHub returned: ${error.message}. Switch to the self-hosted backend or enable Copilot; no A3/A4 action occurred.`});throw error;
    }
  }
  await setSourceState({add:['runner-dispatched','worker-running'],remove:['agent-handoff','runner-queued','runner-blocked','runner-ready'],body:`${targetMarker(packet.repository,targetIssue.number)}\n✦ **Worker started.** Optional backend: GitHub Copilot cloud agent. The same A0–A2 contract applies and the worker must return a PR rather than merge or deploy.`});
  console.log(`RUNNER DISPATCH PASS: copilot ${packet.repository}#${targetIssue.number}`);
}

async function main(){
  if(!sourceToken)throw new Error('SOURCE_TOKEN is required');
  if(!issueNumber||!String(issue.title||'').startsWith('[Mission]'))throw new Error('Dispatcher requires a [Mission] issue event');
  if(event.sender?.login&&event.sender.login!==owner)throw new Error(`Only repository owner ${owner} may dispatch missions`);
  const parsed=parseMissionPacket(issue.body||'',issue.title||'');
  const backend=String(process.env.MISSION_RUNNER_BACKEND||parsed.runnerBackend||'self-hosted').toLowerCase();
  const packet=assertMissionPacket({...parsed,runnerBackend:backend},{owner});
  if(!runnerToken){await setSourceState({add:['runner-blocked'],remove:['agent-handoff','agent-running','worker-running','runner-queued'],body:'⚠️ **Runner blocked:** no `MISSION_RUNNER_TOKEN` (or compatible fallback token) is configured. The approval remains durable; no worker was launched.'});throw new Error('MISSION_RUNNER_TOKEN is not configured')}
  const targetMeta=await api(runnerToken,`/repos/${repoPath(packet.repository)}`);
  if(packet.runnerMode==='dry-run'){
    await setSourceState({add:['runner-ready'],remove:['agent-handoff','agent-running','worker-running','runner-queued','runner-blocked'],body:`✅ **Runner preflight passed.** The authenticated dispatcher can access **${packet.repository}**, backend **${backend}** is allowed, and the A0–A2 packet validated. Dry-run mode launched no worker.`});
    await api(sourceToken,`/repos/${repoPath(sourceRepo)}/issues/${issueNumber}`,{method:'PATCH',body:{state:'closed',state_reason:'completed'}});
    console.log(`RUNNER PREFLIGHT PASS: ${backend} ${packet.repository}`);return;
  }
  const targetIssue=await findOrCreateTarget(packet,backend);
  if(targetIssue.state==='closed'){
    await setSourceState({add:['runner-dispatched'],remove:['agent-handoff','agent-running','worker-running','runner-queued','runner-blocked'],body:`${targetMarker(packet.repository,targetIssue.number)}\nℹ️ The dispatcher found an existing completed target trace: ${targetIssue.html_url}. It did not launch duplicate work.`});return;
  }
  if(backend==='self-hosted')return dispatchSelfHosted(packet,targetIssue);
  if(backend==='copilot')return dispatchCopilot(packet,targetIssue,targetMeta);
  throw new Error(`Unsupported backend: ${backend}`);
}

main().catch(error=>{console.error(`RUNNER DISPATCH FAIL: ${error.message}`);process.exitCode=1});
