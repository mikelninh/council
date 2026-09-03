# Mission Control v0.5 handoff

## Status
Ready for independent verification.

## What changed
Mission Control now treats each concurrent project as a compact story rather than forcing one artificial priority or hiding everything after three items.

Each card shows purpose, current/next goal, current state, a recent win, next big wins, and expandable achievement/roadmap history. Projects are grouped into In motion, On deck, and Quiet/completed.

The Pages builder now enriches public project state with:
- harness purpose and active task state;
- recent public GitHub commit achievements;
- explicit roadmap/next/milestone items from repository-owned Markdown;
- next-win ordering without inventing missing roadmap facts.

## Safety
Public Pages remains public-only. Private project names/tasks/evidence are not emitted. Browser code receives no GitHub credential.

## Next owner
Verifier — accept only if CI, harness, UI contract, GitHub adapter and the real static snapshot build pass.
