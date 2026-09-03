# Mission Control v0.2 handoff

## Status
Ready for independent verification.

## Current step
Run CI on the Mission Control branch.

## What changed
- Council gains a read-only `/api/mission-control` portfolio aggregator.
- The dashboard surfaces **Needs me**, blockers, active work and untracked projects.
- Priority projects are deep-inspected for `.harness/project.json` and `.harness/active-task.json`.
- Private projects that are outside runtime GitHub scope are shown as hidden rather than silently omitted.
- Council itself now uses Harness v0.1.

## Decisions
- Reuse Council rather than create another disconnected repository.
- Keep v0.2 read-only; recommendations may be automated later, cross-repo actions may not.
- Operational attention score is explicitly not a business-value score.

## Open risk
Private repository visibility requires `GITHUB_TOKEN` in the Council runtime. Without it, Mission Control still works but warns and cannot claim full coverage.

## Next owner
Verifier — run CI and record the actual evidence before merge.