# Mission Control v0.4 handoff

## Status
Ready for independent verification.

## Current step
Run Council CI on `mission-control-v0.4-focus`.

## Information architecture
1. **NOW** — exactly one visually dominant project/action.
2. **NEXT UP** — at most three compact rows.
3. **Everything else** — collapsed portfolio grouped by operational state.
4. **System details** — collapsed evidence/scope/debug information.

## What was removed from the default view
- six-metric wall
- project-card grid
- state filter bar
- separate Needs Me side panel
- technical metadata competing with the decision

Nothing was deleted from the evidence model; it was moved to the correct hierarchy level.

## Verification target
CI must prove syntax, state derivation, founder-first UI structure and static GitHub Pages generation still pass.

## Next owner
Verifier.
