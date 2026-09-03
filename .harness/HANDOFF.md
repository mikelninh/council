# Mission Control v0.2 handoff

## Status
Verified and accepted for merge.

## Current step
Merge PR #12.

## Evidence
- `Check Council` workflow `33745959915`: success.
- `harness-contract` workflow `33745960014`: success.
- Mission Control state derivation tests run inside the harness workflow.
- Existing Council decision/founder tests remain part of the gate.

## What changed
- Council gains a read-only `/api/mission-control` portfolio aggregator.
- The dashboard surfaces **Needs me**, blockers, active work and untracked projects.
- Priority projects are deep-inspected for `.harness/project.json` and `.harness/active-task.json`.
- Private projects outside runtime GitHub scope are shown as hidden rather than silently omitted.
- Council itself now uses Harness v0.1.

## Decisions
- Reuse Council rather than create another disconnected repository.
- Keep v0.2 read-only; recommendations may be automated later, cross-repo actions may not.
- Operational attention score is explicitly not a business-value score.

## Remaining limitation
Private repository visibility requires `GITHUB_TOKEN` in the Council runtime. Without it, Mission Control still works but warns and cannot claim full coverage.

## Next owner
Operator — merge PR #12, then make Mission Control the default starting surface for portfolio work.