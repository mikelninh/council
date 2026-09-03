# Mission Control v0.8 handoff

## Status
Verified and accepted for merge.

## What changed
Mission Control now renders each core mission as its **actual named milestone journey**, not the same generic four-stage rail.

Default card grammar:

`last earned → last earned → ● CURRENT → next win → following win`

Examples are sourced from project-owned roadmap labels such as `Citation graph → MCP / APIs → Answer quality → Answer benchmark → Law-firm pilot` or `Clinical context → 500-case holdout → Recall → Holdout recall → Clinician eval`.

The meaningless `Achieved 3` count is gone. The large duplicate NOW panel is gone. Each card keeps one compact NEXT WIN signal and one recent-win line.

## Durable truth
Optional compact `label` fields live beside the full milestone `title` in `.harness/roadmap.json`. Full titles remain authoritative; the UI does not invent strategic short names.

## Verification
- `Check Council` run `33761242002`: success, including public-safe Pages snapshot build.
- `harness-contract` run `33761242024`: success.
- UI regression contract rejects the old generic stage rail and duplicate NOW block.

## Safety
Warm-paper / graphite / cobalt visual system remains. Public Pages remains public-only, read-only and browser-credential-free.

## Human check
Judge whether seven missions now feel visibly different at a glance and whether the named rails communicate enough context without reopening text density.

## Next owner
Operator — merge PR #18, refresh Pages and verify the live v0.8 route.
