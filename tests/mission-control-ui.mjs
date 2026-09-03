import assert from 'node:assert/strict';
import fs from 'node:fs';
const html=fs.readFileSync(new URL('../public/mission-control.html',import.meta.url),'utf8');
const js=fs.readFileSync(new URL('../public/mission-control.js',import.meta.url),'utf8');
const css=fs.readFileSync(new URL('../public/mission-control.css',import.meta.url),'utf8');
const build=fs.readFileSync(new URL('../scripts/build-pages.mjs',import.meta.url),'utf8');

assert.match(html,/Chief of Staff · v1\.0/,'daily home must identify the v1 Chief experience');
assert.match(html,/id="chiefCard"/,'one primary Chief recommendation must dominate the daily home');
assert.match(html,/id="missionGrid"/,'all core missions must remain available below the decision surface');
assert.match(html,/id="approvalDialog"/,'recommendations must have an explicit review/approval surface');
assert.match(html,/id="missionDialog"/,'project depth must use progressive disclosure rather than default text walls');
assert.match(html,/LATEST WIN/,'celebration must remain part of the daily experience');
assert.match(html,/<details[^>]*id="otherDetails"/,'secondary experiments must remain progressively disclosed');
assert.match(html,/<details[^>]*id="quietDetails"/,'quiet history must remain progressively disclosed');

assert.ok(js.includes('MY RECOMMENDATION'),'Chief recommendation must be visually explicit');
assert.ok(js.includes('REVIEW MISSION'),'recommendation must be reviewable before approval');
assert.ok(js.includes('APPROVE & QUEUE'),'approval must create a durable mission handoff instead of pretending to execute anonymously');
assert.ok(js.includes('mission-control-last-approval'),'browser may remember local approval state without exposing credentials');
assert.ok(js.includes('issues/new'),'public Pages approval must hand off to GitHub rather than embedding a write token');
assert.ok(js.includes('A0–A2'),'approval UI must explain bounded execution authority');
assert.doesNotMatch(js,/const nodes=\[\['done','ACHIEVED'/,'generic roadmap stage skeleton must not return');

assert.match(css,/--cobalt:#315efb/,'restrained cobalt accent must remain');
assert.match(css,/--paper:#f4f1ea/,'premium warm-paper foundation must remain');
assert.match(css,/\.chief-card/,'Chief recommendation needs a distinct visual surface');
assert.match(css,/\.mission-tile/,'project overview must remain compact and scan-first');
assert.doesNotMatch(css,/--cyan:|--violet:/,'legacy cyber palette must not return');

assert.match(build,/buildChiefBrief/,'snapshot builder must run the Chief recommendation engine');
assert.match(build,/decision_estimate/,'Chief scoring must come from explicit inspectable estimates');
assert.match(build,/experienceVersion:'1\.0'/,'snapshot must expose v1.0 experience');
assert.match(build,/no authenticated agent runner is embedded in the public browser/,'static Pages boundary must remain explicit');

console.log('MISSION CONTROL UI PASS: v1 is a calm Chief-of-Staff decision surface with progressive project context and explicit bounded approval handoff.');
