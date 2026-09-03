import fs from 'node:fs';
import path from 'node:path';
import { deriveProjectState } from '../lib/mission-control.mjs';

const API='https://api.github.com';
const owner=process.env.GITHUB_USERNAME||'mikelninh';
const token=process.env.GITHUB_TOKEN||'';
const outDir=path.resolve(process.env.MISSION_CONTROL_OUTPUT||'dist-pages');
const refreshUrl=process.env.MISSION_CONTROL_REFRESH_URL||'https://github.com/mikelninh/council/actions';
const maxProjects=Math.max(8,Math.min(24,Number(process.env.MISSION_CONTROL_LIMIT||18)));
const publicPriority=(process.env.MISSION_CONTROL_PUBLIC_PRIORITY||'trustready,digital-worker-factory,pruefpilot,care-os,gitlaw,citizen-agents,council').split(',').map(x=>x.trim()).filter(Boolean);
const baseHeaders={Accept:'application/vnd.github+json','X-GitHub-Api-Version':'2026-03-10','User-Agent':'Council-GitHub-Pages-Mission-Control'};

async function request(pathname,{allow404=false}={}){
  const attempts=token?[true,false]:[false];let lastError=null;
  for(const authenticated of attempts){
    const response=await fetch(`${API}${pathname}`,{headers:{...baseHeaders,...(authenticated?{Authorization:`Bearer ${token}`}:{})}});
    if(response.status===404&&allow404)return null;
    if(response.ok)return response.json();
    const body=await response.json().catch(()=>({}));lastError=new Error(body?.message||`GitHub ${response.status}`);lastError.status=response.status;
    if(authenticated&&[401,403,404].includes(response.status))continue;break;
  }
  throw lastError||new Error('GitHub request failed');
}
async function rawText(repo,file){
  const ref=encodeURIComponent(repo.defaultBranch||'main');const target=file.split('/').map(encodeURIComponent).join('/');
  const response=await fetch(`https://raw.githubusercontent.com/${repo.fullName}/${ref}/${target}`,{headers:{'User-Agent':'Council-Mission-Control'}});
  if(response.status===404)return null;if(!response.ok)throw new Error(`raw ${response.status} ${repo.fullName}/${file}`);return response.text();
}
async function readJson(repo,file){const text=await rawText(repo,file);if(!text)return null;try{return JSON.parse(text)}catch{return null}}
async function listPublicRepos(){
  const repos=[];for(let page=1;page<=3;page++){const rows=await request(`/users/${encodeURIComponent(owner)}/repos?per_page=100&page=${page}&type=owner&sort=pushed&direction=desc`);repos.push(...(Array.isArray(rows)?rows:[]));if(!Array.isArray(rows)||rows.length<100)break}return repos.filter(r=>!r.private&&!r.archived&&!r.fork);
}
function daysSince(value){if(!value)return null;return Math.max(0,Math.floor((Date.now()-new Date(value).getTime())/86400000))}
function normalize(repo){return {name:repo.name,fullName:repo.full_name,url:repo.html_url,private:false,pushedAt:repo.pushed_at,daysSincePush:daysSince(repo.pushed_at),size:Number(repo.size||0),archived:Boolean(repo.archived),description:repo.description||'',defaultBranch:repo.default_branch||'main'}}
async function mapLimit(items,limit,worker){const output=new Array(items.length);let cursor=0;const runners=Array.from({length:Math.min(limit,items.length)},async()=>{while(true){const i=cursor++;if(i>=items.length)return;output[i]=await worker(items[i],i)}});await Promise.all(runners);return output}
const clean=(line='')=>line.replace(/^[-*+]\s+/,'').replace(/^\d+[.)]\s+/,'').replace(/^\[[ xX]\]\s*/,'').replace(/\[([^\]]+)\]\([^\)]+\)/g,'$1').replace(/[*_`>#]/g,'').replace(/\s+/g,' ').trim();
function extractRoadmapItems(text,source){
  if(!text)return [];const lines=text.split(/\r?\n/);let capture=false;const items=[];const sourceIsRoadmap=/roadmap|endgoal|plan/i.test(source);
  for(const line of lines){const heading=line.match(/^#{1,4}\s+(.+)/);if(heading){const title=clean(heading[1]);capture=/roadmap|next|priority|milestone|phase|plan|what.?s next|current/i.test(title);if(items.length&&!capture)break;continue}
    const bullet=line.match(/^\s*(?:[-*+] |\d+[.)] )(.+)/);if(!bullet||(!capture&&!sourceIsRoadmap))continue;const raw=bullet[1].trim();const done=/^\[[xX]\]/.test(raw);const textValue=clean(raw);if(textValue&&textValue.length<=180&&!/^https?:/i.test(textValue))items.push({text:textValue,done});if(items.length>=6)break}
  return items;
}
function roadmapCandidates(harness){
  const explicit=(harness?.sources_of_truth||[]).filter(s=>/product|roadmap|plan|goal/i.test(s.area||'')).flatMap(s=>s.paths||[]).filter(p=>/\.md$/i.test(p));
  return [...new Set(['ROADMAP.md','docs/ROADMAP.md','docs/ENDGOAL.md',...explicit,'README.md'])].slice(0,7);
}
async function findRoadmap(repo,harness){
  for(const source of roadmapCandidates(harness)){try{const text=await rawText(repo,source);const items=extractRoadmapItems(text,source);if(items.length){const currentIndex=Math.max(0,items.findIndex(i=>!i.done));return {source,items,currentIndex:currentIndex<0?items.length-1:currentIndex}}}catch{}}
  return {source:null,items:[],currentIndex:-1};
}
function commitTitle(message=''){
  const lines=String(message).split(/\r?\n/).map(x=>x.trim()).filter(Boolean);if(!lines.length)return null;
  let title=lines[0];if(/^merge pull request/i.test(title)&&lines[1])title=lines[1];if(/^merge branch/i.test(title))return null;if(/noop|pages-deploy-status/i.test(title))return null;return clean(title).slice(0,180);
}
async function recentAchievements(repo){
  try{const rows=await request(`/repos/${repo.fullName.split('/').map(encodeURIComponent).join('/')}/commits?per_page=6`);return (Array.isArray(rows)?rows:[]).map(row=>({text:commitTitle(row.commit?.message),date:row.commit?.committer?.date||row.commit?.author?.date||null,url:row.html_url||null})).filter(x=>x.text).slice(0,3)}catch{return []}
}
function compactUnique(values,limit=3){const seen=new Set();const out=[];for(const value of values){const text=clean(String(value||''));const key=text.toLowerCase();if(!text||seen.has(key)||/merge pr|merge pull request/i.test(text))continue;seen.add(key);out.push(text);if(out.length>=limit)break}return out}
function makeBrief(repo,harness,task,roadmap,achievements,state){
  const purpose=harness?.project?.purpose||repo.description||null;const taskDone=task?.status==='completed';const unfinished=(roadmap.items||[]).filter(x=>!x.done).map(x=>x.text);
  const nextWins=compactUnique([...(task&&!taskDone?[task.next_step]:[]),...unfinished,...(task&&!taskDone?(task.done_when||[]):[])],3);
  const currentGoal=task&&!taskDone?task.goal:(nextWins[0]||'Choose the next explicit product milestone.');
  const currentSummary=task?(taskDone?`The last explicit task is complete${repo.daysSincePush!==null&&repo.daysSincePush<=14?'; the repository has moved again recently, so the next task contract should catch up.':'.'}`:`${String(task.status||'active').replaceAll('_',' ')} · ${task.current_step||'work in progress'}`):(repo.daysSincePush!==null&&repo.daysSincePush<=14?'Recently active, but no explicit harness task is recorded.':'No explicit current task is recorded.');
  const statusLabel=state.state==='completed'&&repo.daysSincePush!==null&&repo.daysSincePush<=14?'MOVING · LAST TASK DONE':({needs_you:'NEEDS YOU',blocked:'BLOCKED',active:'MOVING',untracked:'SETUP NEEDED',idle:'QUIET',completed:'LAST TASK DONE'}[state.state]||String(state.state).toUpperCase());
  let lane='quiet';if(['needs_you','blocked'].includes(state.state)||(repo.daysSincePush!==null&&repo.daysSincePush<=14))lane='in_motion';else if(repo.daysSincePush!==null&&repo.daysSincePush<=60)lane='on_deck';
  return {purpose,currentGoal,goalMode:task&&!taskDone?'current':'next',currentSummary,statusLabel,lane,achievements,nextWins,roadmap,evidenceNote:'Observed from public GitHub metadata, repository harness state, recent commits and explicit roadmap/end-goal documentation.'};
}
function portfolioSummary(repos){return {username:owner,scope:'public-safe',count:repos.length,publicCount:repos.length,privateCount:0,active30:repos.filter(r=>r.daysSincePush!==null&&r.daysSincePush<=30).length,active90:repos.filter(r=>r.daysSincePush!==null&&r.daysSincePush<=90).length}}
function newestTimestamp(repos){const values=repos.map(r=>Date.parse(r.pushedAt||'')).filter(Number.isFinite);return new Date(values.length?Math.max(...values):Date.now()).toISOString()}

const repos=(await listPublicRepos()).map(normalize);const byName=new Map(repos.map(r=>[r.name,r]));const candidates=[];const seen=new Set();
for(const name of publicPriority){const repo=byName.get(name);if(repo){candidates.push(repo);seen.add(repo.fullName)}}
for(const repo of repos){if(candidates.length>=maxProjects)break;if(seen.has(repo.fullName)||repo.size===0)continue;if(repo.daysSincePush!==null&&repo.daysSincePush<=90){candidates.push(repo);seen.add(repo.fullName)}}
const projects=await mapLimit(candidates,4,async repo=>{
  let harness=null,task=null,inspectionError=null;try{[harness,task]=await Promise.all([readJson(repo,'.harness/project.json'),readJson(repo,'.harness/active-task.json')])}catch(error){inspectionError=error.message}
  const state=deriveProjectState({repo,harness,task,label:repo.name});if(inspectionError)state.uncertainties=[...(state.uncertainties||[]),inspectionError];
  const [roadmap,achievements]=await Promise.all([findRoadmap(repo,harness),recentAchievements(repo)]);state.brief=makeBrief(repo,harness,task,roadmap,achievements,state);return state;
});
projects.sort((a,b)=>{const laneRank={in_motion:0,on_deck:1,quiet:2};return (laneRank[a.brief?.lane]??9)-(laneRank[b.brief?.lane]??9)||b.attention-a.attention||(a.daysSincePush??9999)-(b.daysSincePush??9999)||a.name.localeCompare(b.name)});
const harnessed=projects.filter(p=>p.harnessed).length,needsYou=projects.filter(p=>p.needsYou),blocked=projects.filter(p=>p.blocked),untracked=projects.filter(p=>p.state==='untracked'),top=projects.find(p=>p.attention>0)||null;
const snapshot={schema:'council-mission-control-v0.3',experienceVersion:'0.5',generatedAt:newestTimestamp(repos),mode:'github_pages_snapshot',scope:'public-safe',warning:'Public GitHub Pages intentionally publishes public repository state only. Private project details are excluded rather than leaked.',portfolio:portfolioSummary(repos),summary:{deepTracked:projects.length,harnessed,harnessCoverage:projects.length?Math.round(harnessed/projects.length*100):0,needsYou:needsYou.length,blocked:blocked.length,untracked:untracked.length,hidden:0},topMove:top?{project:top.name,state:top.state,reason:top.reason,nextStep:top.nextStep||'Open the project and define the next explicit task contract.',repo:top.repo}:null,projects,needsYou,blocked,refresh:{workflowUrl:refreshUrl,label:'Run GitHub refresh'},evidenceModel:{observed:'Public GitHub metadata, repository harness state, recent commits and explicit roadmap documentation',inferred:'Lane assignment and next-win ordering'},safety:{publicSafe:true,privateDetailsPublished:false,browserSecrets:false},limitations:['v0.5 is read-only','Public Pages excludes private repository details','Roadmap extraction only uses explicit repository-owned roadmap/next/milestone sections']};
fs.rmSync(outDir,{recursive:true,force:true});const missionDir=path.join(outDir,'mission-control');fs.mkdirSync(missionDir,{recursive:true});for(const file of ['mission-control.html','mission-control.css','mission-control.js']){const source=path.resolve('public',file),destination=path.join(missionDir,file==='mission-control.html'?'index.html':file);fs.copyFileSync(source,destination)}fs.writeFileSync(path.join(missionDir,'mission-control.json'),JSON.stringify(snapshot,null,2)+'\n');fs.writeFileSync(path.join(outDir,'.nojekyll'),'');fs.writeFileSync(path.join(outDir,'index.html'),'<!doctype html><meta charset="utf-8"><meta http-equiv="refresh" content="0; url=./mission-control/"><script>location.replace("./mission-control/")</script><title>Mission Control</title>');console.log(`MISSION CONTROL PAGES PASS: ${projects.length} project stories · ${projects.filter(p=>p.brief?.roadmap?.items?.length).length} roadmaps · ${projects.filter(p=>p.brief?.achievements?.length).length} with recent wins.`);
