# Mission Control v0.5 — Project stories

The founder does not need one artificial priority or a wall of repository telemetry. Multiple projects can be genuinely active at once. Mission Control should preserve that reality while making each project legible in seconds.

## Default card contract
Every visible project answers the same questions, in the same order:

1. **Purpose** — why this project exists.
2. **Current state** — where the work actually is now, including whether the last explicit task is already complete.
3. **Recent win** — the latest concrete achievement worth celebrating.
4. **Next big wins** — the next one to three useful outcomes, not a generic backlog dump.
5. **Roadmap** — progressive detail, sourced from repository roadmap/end-goal material where available.

## Portfolio hierarchy
- **In motion**: projects needing attention or touched recently. All are visible; there is no arbitrary top-three cap.
- **On deck**: projects still warm but not currently demanding focus.
- **Quiet / completed**: collapsed by default so historical projects do not compete with current work.
- **System details**: evidence/scope/debug information remains available but visually secondary.

## Evidence rules
- Purpose prefers `.harness/project.json`, then repository description.
- Current work prefers `.harness/active-task.json`; a completed task must not imply the whole project is finished when recent repository activity exists.
- Recent wins come from recent repository commits and explicit completed task evidence.
- Roadmap items are extracted from explicit roadmap/next/milestone sections in repository-owned documentation. If no such source exists, Mission Control says so rather than inventing one.
- Next wins prefer the active task's next step and explicit unfinished roadmap items.

## Design rule
The project card is the unit of understanding. Technical metadata, harness coverage and raw evidence are not removed; they are moved behind progressive disclosure.
