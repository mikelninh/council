# Mission Control v0.7 — Visual Map

## Design goal
Reduce reading. Preserve orientation.

The default screen should communicate project state through hierarchy, progress and compact labels before prose.

## Default information hierarchy
1. Portfolio header — count + attention only.
2. Recent wins — compact celebratory ticker.
3. Core missions — visual mission tiles.
4. Secondary experiments — collapsed.
5. Quiet/completed — collapsed.
6. System/evidence details — collapsed.

## Mission tile contract
Each core mission shows only:
- symbol + project name
- state
- visual 4-stage roadmap rail: achieved → now → next → later
- one-line current milestone
- one-line next biggest win
- one recent win marker

North Star, full achieved milestones, next-three rationale, later horizon and evidence live behind expansion.

## Visual language
- warm paper background
- near-black graphite text
- white cards
- cobalt as the single primary accent
- status colors appear only when semantically necessary
- no gradients that compete with content
- no metric wall
- no paragraph blocks in the default core-mission surface

## Truth
`.harness/roadmap.json` remains the durable roadmap source for core missions. The redesign changes presentation only, not roadmap truth or authority.
