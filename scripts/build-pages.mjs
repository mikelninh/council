import fs from 'node:fs';
import path from 'node:path';
import { deriveProjectState } from '../lib/mission-control.mjs';

const API='https://api.github.com';
const owner=process.env.GITHUB_USERNAME||'mikelninh';
const token=process.env.GITHUB_TOKEN||'';
const outDir=path.resolve(process.env.MISSION_CONTROL_OUTPUT||'dist-pages');
const refreshUrl=process.env.MISSION_CONTROL_REFRESH_URL||'https://github.com/mikelninh/council/actions';
const maxProjects=Math.max(8,Math.min(24,Number(process.env.MISSION_CONTROL_LIMIT||18)));
const publicPriority=(process.env.MISSION_CONTROL_PUBLIC_PRIORITY||'trustready,digital-worker-factory,pruefpilot,care-os,gitlaw,citizen-agents,council')
  .split(',').map((x)=>x.trim()).filter(Boolean);

const baseHeaders={Accept:'application/vnd.github+json','X-GitHub-Api-Version':'2026-03-10','User-Agent':'Council-GitHub-Pages-Mission-Control'};
async function request(pathname,{allow404=false}={}){
  const attempts=token?[true,false]:[false];
  let lastError=null;
  for(const authenticated of attempts){
    const headers={...baseHeaders,...(authenticated?{Authorization:`Bearer ${token}`}:{})};
    const response=await fetch(`${API}${pathname}`,{headers});
    if(response.status===404&&allow404)return null;
    if(response.ok)return response.json();
    const body=await response.json().catch(()=>({}));
    lastError=new Error(body?.message||`GitHub ${response.status}`);
    lastError.status=response.status;
    if(authenticated&&[401,403,404].includes(response.status))continue;
    break;
  }
  throw lastError||new Error('GitHub request failed');
}
async function listPublicRepos(){
  const repos=[];
  for(let page=1;page<=3;page++){
    const rows=await request(`/users/${encodeURIComponent(owner)}/repos?per_page=100&page=${page}&type=owner&sort=pushed&direction=desc`);
    repos.push(...(Array.isArray(rows)?rows:[]));
    if(!Array.isArray(rows)||rows.length<100)break;
  }
  return repos.filter((r)=>!r.private&&!r.archived&&!r.fork);
}
function daysSince(value){if(!value)return null;return Math.max(0,Math.floor((Date.now()-new Date(value).getTime())/86400000));}
function normalize(repo){return {name:repo.name,fullName:repo.full_name,url:repo.html_url,private:false,pushedAt:repo.pushed_at,daysSincePush:daysSince(repo.pushed_at),size:Number(repo.size||0),archived:Boolean(repo.archived)};}
async function readJson(fullName,file){
  const raw=await request(`/repos/${fullName.split('/').map(encodeURIComponent).join('/')}/contents/${file.split('/').map(encodeURIComponent).join('/')}`,{allow404:true});
  if(!raw?.content||raw.encoding!=='base64')return null;
  try{return JSON.parse(Buffer.from(String(raw.content).replace(/\n/g,''),'base64').toString('utf8'));}catch{return null;}
}
async function mapLimit(items,limit,worker){
  const output=new Array(items.length);let cursor=0;
  const runners=Array.from({length:Math.min(limit,items.length)},async()=>{while(true){const i=cursor++;if(i>=items.length)return;output[i]=await worker(items[i],i);}});
  await Promise.all(runners);return output;
}
function portfolioSummary(repos){
  return {username:owner,scope:'public-safe',count:repos.length,publicCount:repos.length,privateCount:0,active30:repos.filter((r)=>r.daysSincePush!==null&&r.daysSincePush<=30).length,active90:repos.filter((r)=>r.daysSincePush!==null&&r.daysSincePush<=90).length};
}
function newestTimestamp(repos){
  const values=repos.map((r)=>Date.parse(r.pushedAt||'')).filter(Number.isFinite);
  return new Date(values.length?Math.max(...values):Date.now()).toISOString();
}

const repos=(await listPublicRepos()).map(normalize);
const byName=new Map(repos.map((r)=>[r.name,r]));
const candidates=[];const seen=new Set();
for(const name of publicPriority){const repo=byName.get(name);if(repo){candidates.push(repo);seen.add(repo.fullName);}}
for(const repo of repos){
  if(candidates.length>=maxProjects)break;
  if(seen.has(repo.fullName)||repo.size===0)continue;
  if(repo.daysSincePush!==null&&repo.daysSincePush<=90){candidates.push(repo);seen.add(repo.fullName);}
}
const projects=await mapLimit(candidates,5,async(repo)=>{
  let harness=null,task=null,inspectionError=null;
  try{[harness,task]=await Promise.all([readJson(repo.fullName,'.harness/project.json'),readJson(repo.fullName,'.harness/active-task.json')]);}
  catch(error){inspectionError=error.message;}
  const state=deriveProjectState({repo,harness,task,label:repo.name});
  if(inspectionError)state.uncertainties=[...(state.uncertainties||[]),inspectionError];
  return state;
});
projects.sort((a,b)=>b.attention-a.attention||(a.daysSincePush??9999)-(b.daysSincePush??9999)||a.name.localeCompare(b.name));
const harnessed=projects.filter((p)=>p.harnessed).length;
const needsYou=projects.filter((p)=>p.needsYou);
const blocked=projects.filter((p)=>p.blocked);
const untracked=projects.filter((p)=>p.state==='untracked');
const top=projects.find((p)=>p.attention>0)||null;
const snapshot={
  schema:'council-mission-control-v0.3',
  generatedAt:newestTimestamp(repos),
  mode:'github_pages_snapshot',
  scope:'public-safe',
  warning:'Public GitHub Pages intentionally publishes public repository state only. Private project details are excluded rather than leaked.',
  portfolio:portfolioSummary(repos),
  summary:{deepTracked:projects.length,harnessed,harnessCoverage:projects.length?Math.round(harnessed/projects.length*100):0,needsYou:needsYou.length,blocked:blocked.length,untracked:untracked.length,hidden:0},
  topMove:top?{project:top.name,state:top.state,reason:top.reason,nextStep:top.nextStep||'Open the project and define the next explicit task contract.',repo:top.repo}:null,
  projects,needsYou,blocked,
  refresh:{workflowUrl:refreshUrl,label:'Run GitHub refresh'},
  evidenceModel:{observed:'Public GitHub metadata and repository .harness files',inferred:'Attention ordering and operational priority'},
  safety:{publicSafe:true,privateDetailsPublished:false,browserSecrets:false},
  limitations:['v0.3 is read-only','Public Pages excludes private repository details','Operational attention is not a business-value score']
};

fs.rmSync(outDir,{recursive:true,force:true});
const missionDir=path.join(outDir,'mission-control');fs.mkdirSync(missionDir,{recursive:true});
for(const file of ['mission-control.html','mission-control.css','mission-control.js']){
  const source=path.resolve('public',file);const destination=path.join(missionDir,file==='mission-control.html'?'index.html':file);fs.copyFileSync(source,destination);
}
fs.writeFileSync(path.join(missionDir,'mission-control.json'),JSON.stringify(snapshot,null,2)+'\n');
fs.writeFileSync(path.join(outDir,'.nojekyll'),'');
fs.writeFileSync(path.join(outDir,'index.html'),'<!doctype html><meta charset="utf-8"><meta http-equiv="refresh" content="0; url=./mission-control/"><script>location.replace("./mission-control/")</script><title>Mission Control</title>');
console.log(`MISSION CONTROL PAGES PASS: ${projects.length} tracked public projects · ${harnessed} harnessed · ${needsYou.length} need human review.`);
