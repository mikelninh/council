# Mission Control v0.9 — Workflow Routing

Mission Control separates three kinds of truth:

- `.harness/roadmap.json` — product direction and milestone journey.
- `.harness/active-task.json` — executable current contract, exact next step and next owner.
- Mission Control — portfolio routing and progressive disclosure.

## Workflow lanes

- **YOUR MOVE** — the current contract names the operator/human or requires human approval/review.
- **CAN CONTINUE** — the current contract names scout, builder, verifier or chief and is not blocked.
- **BLOCKED** — the current task or roadmap explicitly reports a blocker.
- **NEEDS CONTRACT** — roadmap truth exists, but the current execution contract is missing or completed/stale.

## Rules

Mission Control does not infer agent ownership from roadmap prose. If execution truth is absent, it says **NEEDS CONTRACT** rather than pretending an agent can proceed.

The roadmap rail remains the visual answer to **where are we?**. The workflow badge and **NEXT MOVE** answer **who moves next and what exactly happens?**.

Public GitHub Pages remains read-only and public-safe. A3/A4 actions are not executable from this surface.
