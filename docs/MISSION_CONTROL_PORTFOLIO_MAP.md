# Mission Control v0.6 — Portfolio Map

v0.5 proved that showing purpose, current state, wins and roadmap together was useful, but the two-column story cards still asked the eye to read too much text before understanding the portfolio.

v0.6 applies a stricter information hierarchy.

## Default reading order

1. **Portfolio orientation** — how many core missions exist, how many have durable roadmap truth, and whether any need human attention.
2. **Recent wins** — three compact celebrations so progress is not psychologically invisible.
3. **Core missions** — all serious projects remain visible together.
4. **Per-project journey** — `ACHIEVED → NOW → NEXT → LATER` is the primary visual grammar.
5. **Next biggest win** — one explicit leverage point per project.
6. **Full roadmap** — achieved milestones, next three wins, later horizon, activity and evidence appear only when expanded.
7. **Other experiments / quiet work** — still accessible, but progressively disclosed so they do not compete with core missions.

## Truth hierarchy

For core projects Mission Control prefers:

`.harness/roadmap.json` → `.harness/project.json` / `active-task.json` → public GitHub activity → conservative fallback from explicit repository docs.

A roadmap contract is marked **ROADMAP**. A fallback is marked **DERIVED**. The UI never presents a derived guess as durable project truth.

## Why this is calmer

The previous card asked the user to read Purpose, Current Goal, Current State, Recent Win and Next Big Wins as separate text blocks. v0.6 compresses that into a visual story:

`WHY → ✓ what we earned → ● where we are → ○ what unlocks next → later`

The detailed backlog is still present, but it no longer competes with the scan path.
