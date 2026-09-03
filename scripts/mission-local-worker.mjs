import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';

const API='https://api.github.com';
const token=process.env.MISSION_RUNNER_TOKEN||'';
const sourceRepo=process.env.SOURCE_REPO||'mikelninh/council';
const sourceIssue=Number(process.env.SOURCE_ISSUE||0);
const targetRepo=String(process.env.TARGET_REPO||'');
const targetIssue=Number(process.env.TARGET_ISSUE||0);
const branch=String(process.env.BRANCH_NAME||'');
const baseBranch=String(process.env.BASE_BRANCH||'main');
const promptPath=String(process.env.PROMPT_PATH||'');
const project=String(process.env.PROJECT||targetRepo.split('/').pop()||'Mission');
const backend=String(process.env.MISSION_AGENT_BACKEND||'aider-ollama').toLowerCase();
const model=String(process.env.MISSION_LOCAL_MODEL||'').trim();
const maxRepairs=Math.max(0,Math.min(2,Number(process.env.MISSION_MAX_REPAIRS||1)));
const repoPath=(repo)=>repo.split('/').map(encodeURIComponent).join('/');

async function api(repoPathSuffix,{method='GET',body}={}){
  if(!token)throw new Error('MISSION_RUNNER_TOKEN is required');
  const response=await fetch(`${API}${repoPathSuffix}`,{method,headers:{Accept:'application/vnd.github+json',Authorization:`Bearer ${token}`,'X-GitHub-Api-Version':'2022-11-28','Content-Type':'application/json','User-Agent':'Council-Local-Worker'},body:body===undefined?undefined:JSON.stringify(body)});
  const text=await response.text();let payload=null;try{payload=text?JSON.parse(text):null}catch{payload=text}
  if(!response.ok){const error=new Error(payload?.message||`GitHub ${response.status}`);error.status=response.status;throw error}
  return payload;
}
function run(command,args=[],options={}){
  const result=spawnSync(command,args,{cwd:options.cwd||process.cwd(),encoding:'utf8',stdio:options.stdio||'pipe',timeout:options.timeout||45*60*1000,shell:options.shell??false,env:{...process.env,...(options.env||{})}});
  return {command:[command,...args].join(' '),status:result.status??1,stdout:String(result.stdout||''),stderr:String(result.stderr||''),error:result.error};
}
function must(result,label){if(result.error)throw new Error(`${label}: ${result.error.message}`);if(result.status!==0)throw new Error(`${label} failed (${result.status}): ${(result.stderr||result.stdout).slice(-1400)}`);return result}
function commandAvailable(command){const probe=run(command,['--version'],{timeout:30_000});return !probe.error&&probe.status===0}
function verificationCommands(){
  const file=path.join(process.cwd(),'.harness','project.json');
  if(!fs.existsSync(file))return fs.existsSync(path.join(process.cwd(),'scripts','harness-check.mjs'))?['node scripts/harness-check.mjs']:[];
  try{
    const projectJson=JSON.parse(fs.readFileSync(file,'utf8')),commands=projectJson.commands||{};
    return [...new Set([...(commands.harness_check||[]),...(commands.quick_verification||[])].filter(Boolean))];
  }catch(error){throw new Error(`Cannot parse .harness/project.json: ${error.message}`)}
}
function runVerifier(commands){return commands.map(command=>{const result=run(command,[],{shell:true,timeout:30*60*1000});return {command,status:result.status,stdout:result.stdout.slice(-1800),stderr:result.stderr.slice(-1800)}})}
function failures(results){return results.filter(x=>x.status!==0)}
function ensureLocalBackend(){
  if(backend!=='aider-ollama')throw new Error(`Unsupported local backend '${backend}'. Allowed in v1.2: aider-ollama.`);
  if(!model)throw new Error('MISSION_LOCAL_MODEL is not configured. Choose a model that fits this machine; Mission Control will not guess hardware capacity.');
  if(!commandAvailable('ollama'))throw new Error('Ollama is not installed or not on PATH. Install/start Ollama on the self-hosted runner first.');
  if(!commandAvailable('aider'))throw new Error('Aider is not installed or not on PATH. Install with `python -m pip install aider-chat` on the self-hosted runner.');
  const list=must(run('ollama',['list'],{timeout:30_000}),'ollama list');
  if(!list.stdout.toLowerCase().includes(model.toLowerCase().split(':')[0]))throw new Error(`Local model '${model}' is not present. Run: ollama pull ${model}`);
}
function runBuilder(messageFile){
  const args=['--model',`ollama_chat/${model}`,'--message-file',messageFile,'--yes-always','--no-auto-commits'];
  const result=run('aider',args,{stdio:'inherit',timeout:60*60*1000});
  if(result.error)throw new Error(`Local worker could not start: ${result.error.message}`);
  if(result.status!==0)throw new Error(`Local worker exited with status ${result.status}`);
}
async function ensureLabel(repo,name,color,description){try{await api(`/repos/${repoPath(repo)}/labels`,{method:'POST',body:{name,color,description}})}catch(error){if(error.status!==422)throw error}}
async function addLabels(repo,number,labels){await api(`/repos/${repoPath(repo)}/issues/${number}/labels`,{method:'POST',body:{labels}})}
async function removeLabel(repo,number,label){try{await api(`/repos/${repoPath(repo)}/issues/${number}/labels/${encodeURIComponent(label)}`,{method:'DELETE'})}catch(error){if(error.status!==404)throw error}}
async function comment(repo,number,body){await api(`/repos/${repoPath(repo)}/issues/${number}/comments`,{method:'POST',body:{body}})}
async function markBlocked(message){
  if(!token||!sourceIssue)return;
  try{
    await ensureLabel(sourceRepo,'runner-blocked','b64a4a','Mission runner could not start or needs intervention');
    await addLabels(sourceRepo,sourceIssue,['runner-blocked']);
    for(const label of ['worker-running','runner-queued'])await removeLabel(sourceRepo,sourceIssue,label);
    await comment(sourceRepo,sourceIssue,`⚠️ **Self-hosted worker stopped safely.** ${message.slice(0,1800)} No PR was merged or deployed.`);
  }catch{}
}
function writeReceipt(verifierResults,changedFiles){
  const dir=path.join(process.cwd(),'.harness','receipts');fs.mkdirSync(dir,{recursive:true});
  const receiptPath=path.join(dir,`mission-c${sourceIssue}-provider-runner.json`);
  const receipt={schema:'mission-control-provider-runner-v1.2',source:`${sourceRepo}#${sourceIssue}`,target:`${targetRepo}#${targetIssue}`,project,backend,model,branch,base_branch:baseBranch,verified_at:new Date().toISOString(),verification:verifierResults.map(x=>({command:x.command,status:x.status})),changed_files:changedFiles,authority_ceiling:'A2',automatic_merge:false,automatic_deploy:false};
  fs.writeFileSync(receiptPath,`${JSON.stringify(receipt,null,2)}\n`,'utf8');return path.relative(process.cwd(),receiptPath).replaceAll('\\','/');
}

async function main(){
  if(!sourceIssue||!targetRepo||!targetIssue||!branch||!promptPath)throw new Error('Worker inputs are incomplete');
  if(!fs.existsSync(promptPath))throw new Error(`Mission prompt is missing: ${promptPath}`);
  const dirty=must(run('git',['status','--porcelain']),'git status').stdout.trim();if(dirty)throw new Error('Target checkout is not clean before worker execution');
  ensureLocalBackend();
  must(run('git',['fetch','origin','--prune'],{timeout:5*60*1000}),'git fetch');
  const remote=run('git',['ls-remote','--exit-code','--heads','origin',`refs/heads/${branch}`],{timeout:60_000});
  if(remote.status===0)must(run('git',['switch','-C',branch,`origin/${branch}`]),'resume mission branch');else must(run('git',['switch','-c',branch]),'create mission branch');
  const verifyCommands=verificationCommands();
  if(!verifyCommands.length)throw new Error('Target repository exposes no harness/quick verification commands; refusing unverified autonomous work');
  runBuilder(promptPath);
  let verifierResults=runVerifier(verifyCommands),repair=0;
  while(failures(verifierResults).length&&repair<maxRepairs){
    repair+=1;
    const feedbackPath=path.join(process.env.RUNNER_TEMP||process.cwd(),`mission-c${sourceIssue}-verifier-${repair}.md`);
    const failed=failures(verifierResults).map(x=>`### ${x.command}\nExit: ${x.status}\n\n${(x.stderr||x.stdout).slice(-3500)}`).join('\n\n');
    fs.writeFileSync(feedbackPath,`# Verifier repair ${repair}\nThe repository-owned verifier failed. Repair only the approved mission; do not weaken or remove tests/gates.\n\n${failed}\n`,'utf8');
    runBuilder(feedbackPath);verifierResults=runVerifier(verifyCommands);
  }
  if(failures(verifierResults).length)throw new Error(`Verifier still failing after ${repair} repair attempt(s): ${failures(verifierResults).map(x=>x.command).join(', ')}`);
  const changed=must(run('git',['status','--porcelain']),'git status after worker').stdout.trim().split(/\r?\n/).filter(Boolean).map(line=>line.slice(3).trim());
  if(!changed.length)throw new Error('Worker produced no repository change; mission needs human inspection rather than an empty PR');
  const suspicious=changed.filter(file=>/(^|\/)(\.env($|\.)|secrets?\/)|\.(pem|key|p12)$/i.test(file));
  if(suspicious.length)throw new Error(`Worker touched secret-like paths and was stopped: ${suspicious.join(', ')}`);
  const receiptPath=writeReceipt(verifierResults,changed);
  must(run('git',['add','-A']),'git add');
  const staged=must(run('git',['diff','--cached','--name-only']),'staged files').stdout.trim();if(!staged)throw new Error('Nothing staged after receipt generation');
  must(run('git',['-c','user.name=Mission Control Worker','-c','user.email=mission-control@users.noreply.github.com','commit','-m',`Mission C#${sourceIssue}: ${project}`]),'git commit');
  must(run('git',['push','--set-upstream','origin',branch],{timeout:10*60*1000}),'git push');
  const sourceUrl=`https://github.com/${sourceRepo}/issues/${sourceIssue}`,targetUrl=`https://github.com/${targetRepo}/issues/${targetIssue}`;
  const verificationText=verifierResults.map(x=>`- ✅ \`${x.command}\``).join('\n');
  const prBody=[`Source mission: ${sourceUrl}`,`Runner contract: ${targetUrl}`,'',`Backend: **${backend}** · local model: **${model}**`,'','## Scout / Builder / Verifier','The worker was bound to the target issue and repository harness. Changes were produced on an isolated branch, then repository-owned verification ran independently before this PR was opened.','','## Verification',verificationText,'',`Runner receipt: \`${receiptPath}\``,'','## Authority','A0–A2 only. This PR was not merged or deployed automatically. External sends, production actions, spending, secrets and sensitive data remain outside the worker authority.'].join('\n');
  let existing=(await api(`/repos/${repoPath(targetRepo)}/pulls?state=open&head=${encodeURIComponent(`${targetRepo.split('/')[0]}:${branch}`)}&per_page=10`))[0];
  if(!existing)existing=await api(`/repos/${repoPath(targetRepo)}/pulls`,{method:'POST',body:{title:`[Mission C#${sourceIssue}] ${project}: provider-independent worker result`,head:branch,base:baseBranch,body:prBody}});
  for(const [repo,name,color,description] of [[sourceRepo,'worker-review','9d6a18','Worker result is ready for human PR review'],[targetRepo,'worker-review','9d6a18','Worker result is ready for human PR review']])await ensureLabel(repo,name,color,description);
  await addLabels(sourceRepo,sourceIssue,['runner-dispatched','worker-review']);await addLabels(targetRepo,targetIssue,['worker-review']);
  for(const label of ['worker-running','runner-queued','runner-blocked','agent-running','agent-review'])await removeLabel(sourceRepo,sourceIssue,label);
  await removeLabel(targetRepo,targetIssue,'worker-running');
  await comment(targetRepo,targetIssue,`✅ Provider-independent worker returned PR ${existing.html_url}. Repository-owned verification passed. Human review/merge remains required.`);
  await comment(sourceRepo,sourceIssue,`✅ **Result ready for review.** Self-hosted worker returned ${existing.html_url}. Verification passed; Mission Control did not merge or deploy it.`);
  console.log(`MISSION LOCAL WORKER PASS: ${existing.html_url}`);
}

main().catch(async error=>{console.error(`MISSION LOCAL WORKER FAIL: ${error.message}`);await markBlocked(error.message);process.exitCode=1});
