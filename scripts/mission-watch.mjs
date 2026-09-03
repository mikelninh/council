import {targetMarker} from '../lib/mission-runner.mjs';

const API='https://api.github.com';
const sourceToken=process.env.SOURCE_TOKEN||'';
const runnerToken=process.env.MISSION_RUNNER_TOKEN||'';
const sourceRepo=process.env.GITHUB_REPOSITORY||'mikelninh/council';
const repoPath=(repo)=>repo.split('/').map(encodeURIComponent).join('/');
const labelsOf=(issue)=>new Set((issue?.labels||[]).map(x=>typeof x==='string'?x:x?.name).filter(Boolean));
async function api(token,path,{method='GET',body,accept='application/vnd.github+json'}={}){if(!token)throw new Error('missing token');const response=await fetch(`${API}${path}`,{method,headers:{Accept:accept,Authorization:`Bearer ${token}`,'X-GitHub-Api-Version':'2022-11-28','Content-Type':'application/json','User-Agent':'Council-Mission-Watch'},body:body===undefined?undefined:JSON.stringify(body)});const text=await response.text();let payload=null;try{payload=text?JSON.parse(text):null}catch{payload=text}if(!response.ok){const error=new Error(payload?.message||`GitHub ${response.status}`);error.status=response.status;throw error}return payload}
async function ensureLabel(name,color,description){try{await api(sourceToken,`/repos/${repoPath(sourceRepo)}/labels`,{method:'POST',body:{name,color,description}})}catch(error){if(error.status!==422)throw error}}
async function addLabels(number,labels){await api(sourceToken,`/repos/${repoPath(sourceRepo)}/issues/${number}/labels`,{method:'POST',body:{labels}})}
async function removeLabel(number,label){try{await api(sourceToken,`/repos/${repoPath(sourceRepo)}/issues/${number}/labels/${encodeURIComponent(label)}`,{method:'DELETE'})}catch(error){if(error.status!==404)throw error}}
async function commentOnce(number,marker,body){const comments=await api(sourceToken,`/repos/${repoPath(sourceRepo)}/issues/${number}/comments?per_page=100`);if((comments||[]).some(x=>String(x.body||'').includes(marker)))return;await api(sourceToken,`/repos/${repoPath(sourceRepo)}/issues/${number}/comments`,{method:'POST',body:{body:`${marker}\n${body}`}})}
function targetFromComments(comments=[]){for(const item of [...comments].reverse()){const match=String(item.body||'').match(/<!-- runner-target:([^#\s]+\/[^#\s]+)#(\d+) -->/);if(match)return {repo:match[1],number:Number(match[2])}}return null}
async function findPull(target){
  let timeline=[];try{timeline=await api(runnerToken,`/repos/${repoPath(target.repo)}/issues/${target.number}/timeline?per_page=100`,{accept:'application/vnd.github+json'})}catch{}
  for(const event of [...(timeline||[])].reverse()){const src=event?.source?.issue;if(src?.pull_request&&src?.number)return src.number}
  const pulls=await api(runnerToken,`/repos/${repoPath(target.repo)}/pulls?state=all&per_page=50&sort=updated&direction=desc`);const issueUrl=`https://github.com/${target.repo}/issues/${target.number}`;const row=(pulls||[]).find(pr=>String(pr.body||'').includes(issueUrl)||new RegExp(`(?:fix|close|resolve)[a-z ]*#${target.number}\\b`,'i').test(String(pr.body||'')));return row?.number||null;
}
async function main(){
  if(!sourceToken||!runnerToken){console.log('MISSION WATCH SKIP: runner token is not configured');return}
  for(const [name,color,description] of [['worker-review','9d6a18','Worker result is ready for human PR review'],['worker-running','6f8cff','Provider-independent worker is executing the approved mission'],['mission-complete','19765d','Approved mission completed through a verified PR'],['runner-blocked','b64a4a','Mission runner needs intervention']])await ensureLabel(name,color,description);
  const sourceIssues=await api(sourceToken,`/repos/${repoPath(sourceRepo)}/issues?state=open&labels=runner-dispatched&per_page=100`);
  for(const source of (sourceIssues||[]).filter(x=>!x.pull_request)){
    const sourceLabels=labelsOf(source),comments=await api(sourceToken,`/repos/${repoPath(sourceRepo)}/issues/${source.number}/comments?per_page=100`),target=targetFromComments(comments);if(!target)continue;
    const targetIssue=await api(runnerToken,`/repos/${repoPath(target.repo)}/issues/${target.number}`),targetLabels=labelsOf(targetIssue),prNumber=await findPull(target);
    if(prNumber){
      const pr=await api(runnerToken,`/repos/${repoPath(target.repo)}/pulls/${prNumber}`);
      if(pr.merged_at){await addLabels(source.number,['mission-complete']);for(const l of ['worker-running','worker-review','runner-queued','agent-running','agent-review','runner-blocked','runner-dispatched'])await removeLabel(source.number,l);await commentOnce(source.number,'<!-- runner-complete -->',`🎉 **Mission completed.** The verified worker PR was merged: ${pr.html_url}. Mission Control may now celebrate this win and recompute the next move.`);await api(sourceToken,`/repos/${repoPath(sourceRepo)}/issues/${source.number}`,{method:'PATCH',body:{state:'closed',state_reason:'completed'}});continue}
      if(pr.state==='open'){await addLabels(source.number,['worker-review']);for(const l of ['worker-running','runner-queued','agent-running','agent-review'])await removeLabel(source.number,l);await commentOnce(source.number,`<!-- runner-review:${target.repo}#${pr.number} -->`,`✅ **Result ready for review.** The provider-independent worker opened ${pr.html_url}. No merge/deploy is performed by Mission Control.`);continue}
    }
    if(targetIssue.state==='closed'){await addLabels(source.number,['runner-blocked']);for(const l of ['worker-running','runner-queued','agent-running'])await removeLabel(source.number,l);await commentOnce(source.number,'<!-- runner-closed-without-pr -->',`⚠️ The target runner issue closed without a merged PR: ${targetIssue.html_url}. Human inspection is required.`);continue}
    if(sourceLabels.has('runner-queued')&&!targetLabels.has('worker-running'))continue;
    if(targetLabels.has('worker-running')){await addLabels(source.number,['worker-running']);for(const l of ['runner-queued','worker-review','agent-review'])await removeLabel(source.number,l)}
  }
  console.log(`MISSION WATCH PASS: ${(sourceIssues||[]).length} dispatched missions checked.`);
}
main().catch(error=>{console.error(`MISSION WATCH FAIL: ${error.message}`);process.exitCode=1});
