# Mission Control v0.9 workflow routing

This release separates three kinds of truth:

- `.harness/roadmap.json` — product direction and milestone journey
- `.harness/active-task.json` — executable current contract, exact next step and next owner
- Mission Control — portfolio routing and progressive disclosure

Workflow lanes:
- **YOUR MOVE** — current contract names the operator/human or requires human approval/review.
- **CAN CONTINUE** — current contract names scout, builder, verifier or chief and is not blocked.
- **BLOCKED** — current task or roadmap explicitly reports a blocker.
- **NEEDS CONTRACT** — roadmap exists, but the current execution contract is missing or completed/stale.

The UI must not infer agent ownership from roadmap prose. It may derive NEEDS CONTRACT when execution truth is absent.
