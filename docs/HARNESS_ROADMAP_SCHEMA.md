# Harness Roadmap v0.1

Mission Control treats `.harness/roadmap.json` as the durable product-direction truth for serious projects.

It answers five questions only:

1. **North Star** — why does this project deserve to exist?
2. **Achieved** — what meaningful milestones have actually been earned?
3. **Current** — what outcome are we trying to unlock now?
4. **Next** — what are the next three biggest wins, and why do they matter?
5. **Later** — what belongs on the horizon but should not compete with NOW?

```json
{
  "schema": "mikel-harness-roadmap-v0.1",
  "project": "Project name",
  "north_star": "One durable sentence.",
  "achieved": [
    {"title": "Earned milestone", "evidence": ["README.md"]}
  ],
  "current": {
    "title": "Current milestone",
    "status": "active",
    "outcome": "What becomes true when this is done."
  },
  "next": [
    {"title": "Next win", "why": "Why this has leverage now."}
  ],
  "later": ["Later horizon"],
  "sources": ["README.md"],
  "updated_at": "YYYY-MM-DD"
}
```

## Rules

- Keep it small enough to understand in under a minute.
- `north_star` changes rarely.
- `achieved` records meaningful outcomes, not every commit.
- `current` is one milestone, not a backlog.
- `next` is capped at three.
- `later` prevents good ideas from polluting current attention.
- Every milestone should be supportable by repository evidence or explicit owner intent.
- Missing truth stays missing; Mission Control must not fabricate a roadmap.
- This file describes product direction. `.harness/active-task.json` describes the current execution contract.
