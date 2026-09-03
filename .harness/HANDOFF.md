# Mission Control v0.3 handoff

## Status
Verified and accepted for merge.

## Current step
Merge Council PR #13, then wire the existing personal-site Pages workflow.

## Evidence
- `Check Council` run `33749050809`: success, including the real public-safe snapshot build.
- `harness-contract` run `33749050802`: success.
- The first harness attempt correctly failed because v0.3 wording had accidentally removed two existing invariants; those invariants were restored rather than weakening the checker.

## What changed
- Static GitHub Pages snapshot builder.
- Relative snapshot-first UI with live API fallback.
- Public-safe privacy boundary: private repository details are excluded from Pages.
- No browser GitHub credentials.
- No Vercel requirement for the public cockpit.

## Decisions
- Keep Council as the engine/source contract.
- Use the already-enabled `mikelninh.github.io` Pages pipeline as the view host.
- Preserve authenticated/private scope as a separate future lane instead of leaking it into a public static site.

## Next owner
Operator — merge PR #13, then deploy through personal-site PR #65 and verify the live `/mission-control/` route.
