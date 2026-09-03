import fs from 'node:fs';
import {assertMissionPacket,buildWorkerInstructions,parseMissionPacket,sourceMarker} from '../lib/mission-runner.mjs';

const API='https://api.github.com';
const token=process.env.MISSION_RUNNER_TOKEN||'';
const sourceRepo=process.env.GITHUB_REPOSITORY||'mikelninh/council';
const sourceIssue=Number(process.env.SOURCE_ISSUE||0);
const requestedRepo=String(process.env.TARGET_REPO||'');
const requestedIssue=Number(process.env.TARGET_ISSUE||0);
const outputPath=process.env.GITHUB_OUTPUT||'';
const runnerTemp=process.env.RUNNER_TEMP||process.cwd();
const repoPath=(repo)=>repo.split('/').map(encodeURIComponent).join('/');
const slug=(value='')=>String(value).toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,42)||'mission';

async function api(path,{method='GET',body,accept='application/vnd.github+json'}={}){
  if(!token)throw new Error('MISSION_RUNNER_TOKEN is required');
  const response=await fetch(`${API}${path}`,{method,headers:{Accept:accept,Authorization:`Bearer ${token}`,'X-GitHub-Api-Version':'2022-11-28','Content-Type':'application/json','User-Agent':'Council-Provider-Worker'},body:body===undefined?undefined:JSON.stringify(body)});
  const text=await response.text();let payload=null;try{payload=text?JSON.parse(text):null}catch{payload=text}
  if(!response.ok){const error=new Error(payload?.message||`GitHub ${response.status}`);error.status=response.status;throw error}
  return payload;
}
async function ensureLabel(repo,name,color,description){try{await api(`/repos/${repoPath(repo)}/labels`,{method:'POST',body:{name,color,description}})}catch(error){if(error.status!==422)throw error}}
async function addLabels(repo,number,labels){await api(`/repos/${repoPath(repo)}/issues/${number}/labels`,{method:'POST',body:{labels}})}
async function removeLabel(repo,number,label){try{await api(`/repos/${repoPath(repo)}/issues/${number}/labels/${encodeURIComponent(label)}`,{method:'DELETE'})}catch(error){if(error.status!==404)throw error}}
async function commentOnce(repo,number,marker,body){const comments=await api(`/repos/${repoPath(repo)}/issues/${number}/comments?per_page=100`);if((comments||[]).some(x=>String(x.body||'').includes(marker)))return;await api(`/repos/${repoPath(repo)}/issues/${number}/comments`,{method:'POST',body:{body:`${marker}\n${body}`}})}
function output(key,value){if(!outputPath)return;fs.appendFileSync(outputPath,`${key}=${String(value).replace(/\r?\n/g,' ')}\n`)}

async function main(){
  if(!sourceIssue||!requestedRepo||!requestedIssue)throw new Error('SOURCE_ISSUE, TARGET_REPO and TARGET_ISSUE are required');
  const source=await api(`/repos/${repoPath(sourceRepo)}/issues/${sourceIssue}`);
  const packet=assertMissionPacket(parseMissionPacket(source.body||'',source.title||''),{owner:sourceRepo.split('/')[0]});
  if(packet.runnerMode!=='auto')throw new Error(`Worker cannot execute RUNNER_MODE=${packet.runnerMode}`);
  if(packet.runnerBackend!=='self-hosted')throw new Error(`Self-hosted worker cannot execute backend ${packet.runnerBackend}`);
  if(packet.repository!==requestedRepo)throw new Error(`Target repository mismatch: contract=${packet.repository} dispatch=${requestedRepo}`);
  const target=await api(`/repos/${repoPath(requestedRepo)}/issues/${requestedIssue}`);
  if(target.state!=='open')throw new Error(`Target issue ${requestedRepo}#${requestedIssue} is not open`);
  if(!String(target.body||'').includes(sourceMarker(sourceRepo,sourceIssue)))throw new Error('Target issue is not bound to this source mission');
  const meta=await api(`/repos/${repoPath(requestedRepo)}`);
  const branch=`mission/c${sourceIssue}-${slug(packet.project)}`;
  const pulls=await api(`/repos/${repoPath(requestedRepo)}/pulls?state=all&head=${encodeURIComponent(`${requestedRepo.split('/')[0]}:${branch}`)}&per_page=10`);
  const existing=(pulls||[]).find(pr=>pr.state==='open'||pr.merged_at);
  if(existing){
    for(const [name,color,description] of [['worker-review','9d6a18','Worker result is ready for human PR review'],['runner-dispatched','315efb','Mission was handed to a bounded worker backend']])await ensureLabel(sourceRepo,name,color,description);
    await addLabels(sourceRepo,sourceIssue,[existing.merged_at?'mission-complete':'worker-review']);
    for(const label of ['runner-queued','worker-running','runner-blocked'])await removeLabel(sourceRepo,sourceIssue,label);
    await commentOnce(sourceRepo,sourceIssue,'<!-- provider-worker-existing-pr -->',`ℹ️ Provider worker found an existing ${existing.merged_at?'merged':'open'} PR for this mission: ${existing.html_url}. Duplicate execution was skipped.`);
    output('skip','true');output('existing_pr',existing.html_url);return;
  }
  const promptPath=`${runnerTemp.replace(/[\\/]$/,'')}/mission-control-c${sourceIssue}.md`;
  const instructions=buildWorkerInstructions(packet,{sourceIssueUrl:source.html_url,targetIssueUrl:target.html_url,backend:'self-hosted'});
  const prompt=[`# Mission Control C#${sourceIssue}`,instructions,'','## Approved mission',packet.mission,'','## Why now',packet.whyNow,'','## Done when',...packet.doneWhen.map(x=>`- ${x}`),'','## Constraints',...packet.constraints.map(x=>`- ${x}`),'','## Forbidden',...packet.forbidden.map(x=>`- ${x}`),'','## Required handoff','Update durable harness state when appropriate. Every changed claim must be supported by repository-owned tests/evals or marked uncertain. Do not merge the PR.'].join('\n');
  fs.writeFileSync(promptPath,prompt,'utf8');
  for(const [repo,name,color,description] of [[sourceRepo,'worker-running','6f8cff','Provider-independent worker is executing the approved mission'],[requestedRepo,'worker-running','6f8cff','Provider-independent worker is executing the approved mission']])await ensureLabel(repo,name,color,description);
  await addLabels(sourceRepo,sourceIssue,['runner-dispatched','worker-running']);
  await addLabels(requestedRepo,requestedIssue,['worker-running']);
  for(const label of ['runner-queued','runner-blocked','agent-running','agent-review'])await removeLabel(sourceRepo,sourceIssue,label);
  await removeLabel(requestedRepo,requestedIssue,'runner-queued');
  await commentOnce(sourceRepo,sourceIssue,'<!-- provider-worker-started -->',`⚙️ **Self-hosted worker started.** Backend contract: local provider adapter. Target: ${target.html_url}. Branch: \`${branch}\`. A3/A4 remains forbidden.`);
  output('skip','false');
  output('repository',requestedRepo);
  output('target_issue',requestedIssue);
  output('base_branch',meta.default_branch||'main');
  output('branch',branch);
  output('prompt_path',promptPath);
  output('project',packet.project);
  console.log(`MISSION WORKER PLAN PASS: ${requestedRepo}#${requestedIssue} -> ${branch}`);
}

main().catch(error=>{console.error(`MISSION WORKER PLAN FAIL: ${error.message}`);process.exitCode=1});
