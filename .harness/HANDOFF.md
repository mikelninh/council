# Mission Control v0.4 handoff

## Status
Verified and accepted for merge.

## Current step
Merge Council PR #14; the existing Pages workflow will publish it on its next run.

## Information architecture
1. **NOW** — one visually dominant project/action.
2. **NEXT UP** — at most three compact rows.
3. **Everything else** — collapsed portfolio grouped by operational state.
4. **System details** — collapsed evidence/scope/debug information.

## Verification evidence
- `Check Council` run `33751284606`: success.
- `harness-contract` run `33751284506`: success.
- GitHub adapter smoke: success.
- Static Pages snapshot build: success.
- Founder-first UI regression test: success.

## What changed
The information model was not reduced. Its hierarchy was. The default view now optimizes for the next decision rather than system observability.

## Next owner
Operator — merge and verify the live `/mission-control/` route.
