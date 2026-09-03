import assert from 'node:assert/strict';
import fs from 'node:fs';

const html=fs.readFileSync(new URL('../public/mission-control.html', import.meta.url),'utf8');
const js=fs.readFileSync(new URL('../public/mission-control.js', import.meta.url),'utf8');

assert.match(html,/id="focusCard"/,'one dominant focus card must exist');
assert.match(html,/id="nextUp"/,'a compact next-up queue must exist');
assert.match(html,/<details[^>]*id="portfolioDetails"/,'portfolio detail must be progressive disclosure');
assert.match(html,/<details[^>]*id="systemDetails"/,'system/debug detail must be progressive disclosure');
assert.doesNotMatch(html,/id="metrics"/,'metric wall must not return to the default view');
assert.doesNotMatch(html,/PROJECT RUNWAY/,'dashboard-era project runway language must not return');
assert.match(js,/slice\(0,3\)/,'default queue must remain intentionally bounded');
assert.match(js,/detailsCount/,'hidden project count must be explicit rather than silently omitted');
console.log('MISSION CONTROL UI PASS: founder-first progressive disclosure contract is intact.');
