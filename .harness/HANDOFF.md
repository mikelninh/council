# Mission Control v0.5 handoff

## Status
Verified and accepted for merge.

## What changed
Mission Control now treats each concurrent project as a compact story rather than forcing one artificial priority or hiding everything after three items.

Each card shows purpose, current/next goal, current state, a recent win, next big wins, and expandable achievement/roadmap history. Projects are grouped into In motion, On deck, and Quiet/completed.

## Verification
- `Check Council` run `33752487886`: success.
- `harness-contract` run `33752487657`: success.
- Real Pages snapshot build: 18 project stories, 5 explicit roadmaps, all 18 with recent commit achievements.
- UI contract protects concurrent project visibility, celebration, purpose, next wins and roadmap/history disclosure.

## Important limitation
Roadmap coverage is evidence-limited. Only explicit roadmap/next/milestone sections in repository-owned Markdown are surfaced. Missing roadmap data is visible rather than inferred as fact.

## Safety
Public Pages remains public-only. Private project names/tasks/evidence are not emitted. Browser code receives no GitHub credential.

## Next owner
Operator — merge PR #15 and verify the next public Pages refresh.
