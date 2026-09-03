# Mission Control v0.6 handoff

## Status
Verified and accepted for merge.

## What changed
Mission Control is now a roadmap-native **portfolio map**, not a pile of project cards.

The seven core missions remain visible together. Each one has an explicit North Star and a compact journey rail:

`ACHIEVED → NOW → NEXT → LATER`

The next biggest win is visible without opening the card. Full achieved milestones, next three wins, later horizon, recent repository activity and evidence are progressively disclosed.

## Durable truth
`.harness/roadmap.json` is now the product-direction contract for core projects. It contains North Star, achieved milestones, current milestone, next three wins and later horizon. `.harness/active-task.json` remains the execution contract.

Roadmap contracts are present for all seven core missions: TrustReady, Digital Worker Factory, PrüfPilot, CareOS, GitLaw, Citizen Agents and Council / Mission Control.

## Verification
- `Check Council` run `33755541735`: success.
- `harness-contract` run `33755541682`: success.
- Real Pages build: **18 projects · 7 core missions · 7/7 roadmap-native**.
- UI regression test protects portfolio pulse, celebrations, core visibility, journey grammar and progressive disclosure.

## Safety
Public Pages remains public-only, read-only and credential-free in the browser. Private project details remain excluded.

## Next owner
Operator — merge PR #16 and verify the next public Pages refresh.
