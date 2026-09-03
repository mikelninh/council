import fs from 'node:fs';
import {assertMissionPacket,buildCopilotInstructions,buildRunnerIssueBody,parseMissionPacket,sourceMarker,targetMarker} from '../lib/mission-runner.mjs';

const API='https://api.github.com';
const sourceToken=process.env.SOURCE_TOKEN||'';
const runnerToken=process.env.MISSION_RUNNER_TOKEN||'';
const sourceRepo=process.env.GITHUB_REPOSITORY||'';
const eventPath=process.env.GITHUB_EVENT_PATH;
const event=eventPath?JSON.parse(fs.readFileSync(eventPath,'utf8')):{};
const issue=event.issue||{};
const issueNumber=Number(issue.number||0);
const owner=event.repository?.owner?.login||sourceRepo.split('/')[0]||'mikelninh';

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
async function setSourceState({add=[],remove=[],body}){for(const [name,color,description] of [['runner-ready','19765d','Mission runner credentials and policy preflight passed'],['runner-dispatched','315efb','Mission was dispatched to a coding agent'],['agent-running','6f8cff','Coding agent is working on the approved mission'],['runner-blocked','b64a4a','Mission runner could not start or needs intervention']])await ensureLabel(sourceToken,sourceRepo,name,color,description);if(add.length)await addLabels(sourceToken,sourceRepo,issueNumber,add);for(const label of remove)await removeLabel(sourceToken,sourceRepo,issueNumber,label);if(body)await comment(sourceToken,sourceRepo,issueNumber,body)}

async function main(){
  if(!sourceToken)throw new Error('SOURCE_TOKEN is required');
  if(!issueNumber||!String(issue.title||'').startsWith('[Mission]'))throw new Error('Dispatcher requires a [Mission] issue event');
  if(event.sender?.login&&event.sender.login!==owner)throw new Error(`Only repository owner ${owner} may dispatch missions`);
  const packet=assertMissionPacket(parseMissionPacket(issue.body||'',issue.title||''),{owner});
  if(!runnerToken){await setSourceState({add:['runner-blocked'],remove:['agent-handoff','agent-running'],body:'⚠️ **Runner blocked:** no `MISSION_RUNNER_TOKEN` (or compatible fallback token) is configured. The approval remains durable; no agent was launched.'});throw new Error('MISSION_RUNNER_TOKEN is not configured')}
  const targetMeta=await api(runnerToken,`/repos/${repoPath(packet.repository)}`);
  if(packet.runnerMode==='dry-run'){
    await setSourceState({add:['runner-ready'],remove:['agent-handoff','agent-running','runner-blocked'],body:`✅ **Runner preflight passed.** The authenticated runner can access **${packet.repository}** and the A0–A2 packet validated. Dry-run mode launched no coding agent.`});
    await api(sourceToken,`/repos/${repoPath(sourceRepo)}/issues/${issueNumber}`,{method:'PATCH',body:{state:'closed',state_reason:'completed'}});
    console.log(`RUNNER PREFLIGHT PASS: ${packet.repository}`);return;
  }
  const marker=sourceMarker(sourceRepo,issueNumber);
  const recent=await api(runnerToken,`/repos/${repoPath(packet.repository)}/issues?state=all&per_page=100&sort=created&direction=desc`);
  let targetIssue=(recent||[]).find(x=>!x.pull_request&&String(x.body||'').includes(marker));
  if(!targetIssue){
    for(const [name,color,description] of [['mission-runner','315efb','Bounded Mission Control coding-agent task'],['from-council','eef2ff','Mission originated in Council Mission Control']]){try{await ensureLabel(runnerToken,packet.repository,name,color,description)}catch{}}
    const created=await api(runnerToken,`/repos/${repoPath(packet.repository)}/issues`,{method:'POST',body:{title:`[Agent Mission C#${issueNumber}] ${packet.project}: ${packet.mission.slice(0,88)}`,body:buildRunnerIssueBody(packet,{sourceRepo,sourceIssueNumber:issueNumber,sourceIssueUrl:issue.html_url}),labels:['mission-runner','from-council']}});
    targetIssue=created;
  }
  if(targetIssue.state==='closed'){
    await setSourceState({add:['runner-dispatched'],remove:['agent-handoff','agent-running','runner-blocked'],body:`${targetMarker(packet.repository,targetIssue.number)}\nℹ️ The runner found an existing completed target trace: ${targetIssue.html_url}. It did not launch duplicate work.`});return;
  }
  const alreadyAssigned=(targetIssue.assignees||[]).some(x=>x.login==='copilot-swe-agent[bot]');
  if(!alreadyAssigned){
    try{
      await api(runnerToken,`/repos/${repoPath(packet.repository)}/issues/${targetIssue.number}/assignees`,{method:'POST',body:{assignees:['copilot-swe-agent[bot]'],agent_assignment:{target_repo:packet.repository,base_branch:targetMeta.default_branch||'main',custom_instructions:buildCopilotInstructions(packet,{sourceIssueUrl:issue.html_url}),custom_agent:'',model:''}}});
    }catch(error){
      await setSourceState({add:['runner-blocked'],remove:['agent-handoff','agent-running'],body:`${targetMarker(packet.repository,targetIssue.number)}\n⚠️ **Runner could not assign the coding agent.** Target issue: ${targetIssue.html_url}. GitHub returned: ${error.message}. No A3/A4 action occurred.`});throw error;
    }
  }
  await setSourceState({add:['runner-dispatched','agent-running'],remove:['agent-handoff','runner-blocked','runner-ready'],body:`${targetMarker(packet.repository,targetIssue.number)}\n✦ **Runner started.** GitHub Copilot cloud agent is assigned to ${targetIssue.html_url}. It is bound to the approved A0–A2 contract and must return a PR for review rather than merge or deploy.`});
  console.log(`RUNNER DISPATCH PASS: ${packet.repository}#${targetIssue.number}`);
}

main().catch(error=>{console.error(`RUNNER DISPATCH FAIL: ${error.message}`);process.exitCode=1});
