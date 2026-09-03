import { scanGitHubPortfolio } from './tools.mjs';

const API='https://api.github.com';
const PRIORITY=[
  ['trustready','TrustReady'],
  ['digital-worker-factory','Digital Worker Factory'],
  ['pruefpilot','PrüfPilot'],
  ['care-os','CareOS'],
  ['gitlaw','GitLaw'],
  ['hyperspace-kids','Hyperspace Kids'],
  ['hyperspace-3d','Hyperspace 3D'],
  ['citizen-agents','Citizen Agents'],
  ['council','Council / Mission Control']
];
const priorityNames=new Set(PRIORITY.map(([name])=>name));
const token=()=>process.env.GITHUB_TOKEN||'';
const headers=()=>({Accept:'application/vnd.github+json','X-GitHub-Api-Version':'2026-03-10','User-Agent':'Council-Mission-Control',...(token()?{Authorization:`Bearer ${token()}`}:{})});

async function readTextFile(fullName,path){
  const [owner,repo]=String(fullName).split('/');
  if(!owner||!repo) return null;
  const response=await fetch(`${API}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/contents/${path.split('/').map(encodeURIComponent).join('/')}`,{headers:headers()});
  if(response.status===404) return null;
  if(!response.ok) throw new Error(`${fullName}:${path} GitHub ${response.status}`);
  const data=await response.json();
  if(data?.encoding!=='base64'||!data?.content) return null;
  return Buffer.from(String(data.content).replace(/\n/g,''),'base64').toString('utf8');
}
const jsonOrNull=(text)=>{try{return text?JSON.parse(text):null}catch{return null}};
async function mapLimit(items,limit,worker){
  const out=new Array(items.length);let cursor=0;
  const runners=Array.from({length:Math.min(limit,items.length)},async()=>{while(true){const i=cursor++;if(i>=items.length)return;out[i]=await worker(items[i],i)}});
  await Promise.all(runners);return out;
}
const cleanStatus=(value='')=>String(value||'').trim().toLowerCase().replace(/[\s-]+/g,'_');

export function deriveProjectState({repo=null,harness=null,task=null,label=''}){
  if(!repo) return {name:label||'Hidden project',repo:null,harnessed:false,state:'hidden',status:'hidden_from_scope',needsYou:false,blocked:false,attention:0,reason:'Not visible in the current GitHub runtime scope.',currentTask:'',nextStep:'Add authenticated GitHub scope or verify repository access.',nextOwner:'operator',failures:[],uncertainties:[]};
  const status=cleanStatus(task?.status || (harness?'idle':'untracked'));
  const failures=Array.isArray(task?.failures)?task.failures:[];
  const uncertainties=Array.isArray(task?.uncertainties)?task.uncertainties:[];
  const completed=status==='completed';
  const reviewStates=new Set(['ready_for_review','awaiting_review','awaiting_human_review','needs_human','awaiting_approval']);
  const needsYou=!completed && (Boolean(task?.approval_required)||reviewStates.has(status));
  const blocked=!completed && (status==='blocked'||status==='failed'||failures.length>0);
  const active=!completed && ['in_progress','active','building','verifying','ready_for_review','awaiting_review','awaiting_human_review','needs_human','awaiting_approval'].includes(status);
  let state='idle';
  if(!harness) state='untracked';
  else if(blocked) state='blocked';
  else if(needsYou) state='needs_you';
  else if(active) state='active';
  else if(completed) state='completed';
  const recent=repo.daysSincePush!==null&&repo.daysSincePush<=14;
  let attention=0;
  if(needsYou) attention+=100;
  if(blocked) attention+=90;
  if(active) attention+=45;
  if(!harness&&priorityNames.has(repo.name)) attention+=35;
  if(priorityNames.has(repo.name)&&!completed) attention+=20;
  if(recent&&!completed) attention+=10;
  const reason=needsYou?'Human review or approval is the current gate.':blocked?'Current task reports a blocker/failure.':!harness?'No repository-native harness state is visible.':active?'Work is currently active.':completed?'Last recorded harness task is completed.':'Harness exists; no active task is recorded.';
  return {
    name:harness?.project?.name||label||repo.name,
    repo:repo.fullName,
    url:repo.url,
    private:Boolean(repo.private),
    pushedAt:repo.pushedAt,
    daysSincePush:repo.daysSincePush,
    harnessed:Boolean(harness),
    state,status,needsYou,blocked,attention,reason,
    currentTask:task?.goal||'',
    nextStep:task?.next_step||'',
    nextOwner:task?.next_owner||'',
    riskClass:task?.risk_class||'',
    failures,uncertainties
  };
}

export async function buildMissionControl({username=process.env.GITHUB_USERNAME||'mikelninh',limit=30}={}){
  const portfolio=await scanGitHubPortfolio({username,inspect:false});
  const repos=portfolio.data?.repos||[];
  const byName=new Map(repos.map((r)=>[r.name,r]));
  const candidates=[];const seen=new Set();
  for(const [name,label] of PRIORITY){const repo=byName.get(name)||null;candidates.push({repo,label,priority:true,name});if(repo)seen.add(repo.fullName)}
  for(const repo of repos){
    if(candidates.length>=Math.max(10,Math.min(40,Number(limit)||30))) break;
    if(seen.has(repo.fullName)||repo.archived||repo.size===0) continue;
    if(repo.daysSincePush!==null&&repo.daysSincePush<=90){candidates.push({repo,label:repo.name,priority:false,name:repo.name});seen.add(repo.fullName)}
  }
  const projects=await mapLimit(candidates,6,async(item)=>{
    if(!item.repo) return deriveProjectState({repo:null,label:item.label});
    let harness=null,task=null,inspectionError=null;
    try{
      const [projectText,taskText]=await Promise.all([
        readTextFile(item.repo.fullName,'.harness/project.json'),
        readTextFile(item.repo.fullName,'.harness/active-task.json')
      ]);
      harness=jsonOrNull(projectText);task=jsonOrNull(taskText);
    }catch(error){inspectionError=error.message}
    const state=deriveProjectState({repo:item.repo,harness,task,label:item.label});
    if(inspectionError) state.uncertainties=[...state.uncertainties,inspectionError];
    return state;
  });
  projects.sort((a,b)=>b.attention-a.attention || (a.daysSincePush??9999)-(b.daysSincePush??9999) || a.name.localeCompare(b.name));
  const visible=projects.filter((p)=>p.repo);
  const harnessed=visible.filter((p)=>p.harnessed).length;
  const needsYou=projects.filter((p)=>p.needsYou);
  const blocked=projects.filter((p)=>p.blocked);
  const untracked=projects.filter((p)=>p.state==='untracked');
  const hidden=projects.filter((p)=>p.state==='hidden');
  const top=projects.find((p)=>p.attention>0)||null;
  return {
    schema:'council-mission-control-v0.2',
    generatedAt:new Date().toISOString(),
    mode:'read_only',
    scope:portfolio.scope,
    warning:portfolio.warning || (hidden.length?`${hidden.length} priority project(s) are outside the current GitHub runtime scope.`:null),
    portfolio:portfolio.summary,
    summary:{deepTracked:visible.length,harnessed,harnessCoverage:visible.length?Math.round(harnessed/visible.length*100):0,needsYou:needsYou.length,blocked:blocked.length,untracked:untracked.length,hidden:hidden.length},
    topMove:top?{project:top.name,state:top.state,reason:top.reason,nextStep:top.nextStep||'Open the project and define the next explicit task contract.',repo:top.repo}:null,
    projects,
    needsYou,
    blocked,
    evidenceModel:{observed:'GitHub metadata and repository harness files',inferred:'attention ordering and operational priority'},
    limitations:['v0.2 is read-only','Operational attention is not a business-value score','Private coverage depends on authenticated GitHub runtime scope']
  };
}
