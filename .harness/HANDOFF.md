# Mission Control v0.7 handoff

## Status
Verified and accepted for merge.

## What changed
Mission Control now prioritizes **visual scanning over reading**.

The dark multi-accent dashboard language is gone. The default surface uses warm paper, graphite text, white cards and one cobalt accent. Core missions render in a compact 3-column desktop grid.

Each mission defaults to only:
- visual project symbol + state
- four-stage roadmap rail
- one-line NOW milestone
- one-line NEXT WIN
- one recent win marker

North Star, achieved milestones, next-three, later horizon and repository evidence stay behind expansion.

## Verification
- `Check Council` run `33756835412`: success.
- `harness-contract` run `33756835352`: success.
- Public Pages snapshot build passed.
- UI regression test protects visual roadmap hierarchy, restrained palette and progressive disclosure.

## Safety
Roadmap truth, public-only Pages scope, read-only behavior and browser credential boundaries are unchanged.

## Human check
Taste cannot be proven by CI. The live v0.7 should be judged on: can all seven core missions be scanned quickly, does the cobalt/paper palette feel calmer, and is any remaining text still competing with the roadmap graphic?

## Next owner
Operator — merge PR #17, trigger the Pages refresh and verify the public route.
