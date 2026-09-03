# Mission Control v1.0 Chief of Staff handoff

## Status
Implementation ready for independent verification.

## What changed
Mission Control is now designed as a **daily decision surface** rather than a dashboard.

Default hierarchy:
1. greeting;
2. one Chief recommendation;
3. explicit why-now / leverage factors / confidence;
4. review, edit, approve or not-now controls;
5. compact portfolio pulse and latest win;
6. all core missions as small visual tiles;
7. full project story only on demand.

## Chief truth model
- `.harness/roadmap.json` owns product direction.
- `.harness/active-task.json` owns execution and next owner.
- `decision_estimate` owns explicit 1–5 judgement inputs: impact, urgency, unlock value, effort and confidence.
- `lib/chief.mjs` applies a deterministic, documented leverage heuristic and prefers an unblocked A0–A2 delegation when one exists.

## Approval
`REVIEW MISSION` opens the proposed mission contract. Michael may edit the mission text. `APPROVE & QUEUE` opens a pre-filled GitHub approval issue containing the exact mission, done criteria, constraints, forbidden actions, risk class and A0–A2 boundary.

`.github/workflows/mission-intake.yml` validates and labels valid approval packets. It explicitly reports that the authenticated agent runner is **not connected yet** rather than pretending the static public page launched an agent.

## Safety
- no browser GitHub token;
- no AI-provider credential in Pages;
- private project data excluded;
- A3/A4 remains behind explicit human approval;
- Chief scores are inference, not objective truth.

## Next owner
Verifier — run syntax, Chief tests, UI regression contract, harness contract and a real public-safe Pages snapshot build. Only merge if all pass.
