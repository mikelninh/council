import fs from 'node:fs';

const errors=[];
const fail=(m)=>errors.push(m);
const required=['AGENTS.md','.harness/project.json','.harness/active-task.json','.harness/HANDOFF.md','.harness/receipts/README.md','lib/mission-control.mjs','api/mission-control.mjs','public/mission-control.html','public/mission-control.js','public/mission-control.css'];
for(const p of required) if(!fs.existsSync(p)) fail(`missing ${p}`);
let project,task;
try{project=JSON.parse(fs.readFileSync('.harness/project.json','utf8'));}catch(e){fail(`invalid project json: ${e.message}`)}
try{task=JSON.parse(fs.readFileSync('.harness/active-task.json','utf8'));}catch(e){fail(`invalid task json: ${e.message}`)}
if(project){
  const policy=project.action_policy||{};
  if(policy.A3?.approval_required!==true||policy.A4?.approval_required!==true) fail('A3/A4 must require approval');
  if(project.mission_control?.mode!=='read_only') fail('Mission Control v0.2 must remain read_only');
  if((project.retry_policy?.max_retries??99)>3) fail('retry budget too large');
}
if(task){
  for(const key of ['task_id','status','goal','sources','outputs','constraints','done_when','forbidden','risk_class','max_retries','next_owner','next_step']) if(!(key in task)) fail(`task missing ${key}`);
  if(['A3','A4'].includes(task.risk_class)&&task.approval_required!==true) fail('consequential task missing approval gate');
}
const agents=fs.existsSync('AGENTS.md')?fs.readFileSync('AGENTS.md','utf8'):'';
for(const phrase of ['Mission Control is read-only in v0.2','Private projects must never silently disappear','Missing `.harness/` state is visible as `untracked`']) if(!agents.includes(phrase)) fail(`AGENTS invariant missing: ${phrase}`);
if(errors.length){for(const e of errors) console.error(`HARNESS FAIL: ${e}`);process.exit(1)}
console.log('HARNESS PASS: Mission Control contract and authority boundaries present.');