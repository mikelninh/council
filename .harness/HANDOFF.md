# Mission Control v0.9 handoff

## Status
Ready for independent verification.

## What changed
Mission Control is now a **workflow router**, not only a roadmap viewer.

The roadmap still answers **where are we?**. The execution contract now answers **who moves next and what exactly happens?**.

Workflow lanes:
- **YOUR MOVE** — operator/human review or approval is the current gate.
- **CAN CONTINUE** — chief/scout/builder/verifier owns the next execution step.
- **BLOCKED** — task or roadmap reports a blocker.
- **NEEDS CONTRACT** — roadmap exists but execution truth is missing or stale.

Default card grammar:

`project + workflow lane → real milestone journey → exact NEXT MOVE → recent win`

The top of the page is compressed into workflow counts, filter chips and a thin latest-win ticker. All core missions remain visible by default.

## Durable truth
- `.harness/roadmap.json` owns product direction.
- `.harness/active-task.json` owns current execution, next step and next owner.
- Mission Control does not infer agent ownership from roadmap prose.

Core execution contracts were refreshed before this UI release so routing is meaningful rather than cosmetic.

## Safety
Public Pages remains public-only, read-only and browser-credential-free. A3/A4 actions cannot be executed from this surface.

## Next owner
Verifier — run Council CI and the real public snapshot build. Accept only if workflow ownership comes from `active-task.json`, stale contracts surface truthfully, and the visual map remains compact.
