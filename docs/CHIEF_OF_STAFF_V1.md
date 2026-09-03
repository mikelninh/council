# Mission Control v1.0 — Chief of Staff

## Product promise
Mission Control is no longer primarily a portfolio dashboard. The daily home should answer:

> **What is the highest-leverage move I can safely approve right now?**

The answer is advisory, evidence-linked and inspectable. Michael keeps authority over intent and all consequential actions.

## Three layers of truth

1. `.harness/roadmap.json` — why the project exists and where it is going.
2. `.harness/active-task.json` — the current executable contract, owner, next step, constraints and risk class.
3. `decision_estimate` inside the active task — explicit 1–5 estimates for impact, urgency, unlock value, effort and confidence.

The estimates are judgement, not observed fact. They are stored beside the task so they can be reviewed and corrected.

## Chief recommendation policy
The deterministic v1 heuristic is:

`impact×2 + unlock×2 + urgency×1.5 + confidence×1.2 − effort×1.1 + lane adjustment`

The Chief prefers the highest-scoring unblocked `CAN CONTINUE` A0–A2 mission. Human gates and blockers remain visible separately so a low-effort human unblock is never hidden.

This heuristic is intentionally simple. Its job is to make assumptions inspectable before we introduce a more capable model-based planner.

## Daily-home hierarchy

1. Greeting + one recommendation.
2. Why now + leverage factors + confidence.
3. Review mission / why this / not now.
4. Compact portfolio pulse: needs you, agents ready, blocked, latest win.
5. All core missions in compact visual tiles.
6. Full project story only on demand.
7. System/evidence details last.

## Approval
`REVIEW MISSION` opens the bounded mission contract. Michael can edit the mission text before approving it.

`APPROVE & QUEUE` creates a pre-filled GitHub issue containing:
- project and repository;
- exact approved mission;
- risk class;
- Chief score and snapshot timestamp;
- done criteria;
- constraints and forbidden actions;
- explicit A0–A2 execution boundary.

Public GitHub Pages intentionally has no write credential. The browser therefore opens the durable GitHub handoff rather than secretly writing or launching agents.

## Agent execution boundary
Approved A0–A2 mission shape:

`Scout → Builder → Verifier → Chief → PR + receipt`

- A0 read/search/analyse: automatic.
- A1 isolated reversible work: automatic within the approved mission.
- A2 branch/PR/issue/preview: automatic within the approved mission.
- A3 deploy/send/publish/spend/external write: stop for explicit approval.
- A4 destructive/sensitive/legal/financial/clinical action: stronger explicit approval and verification; often forbidden.

## What v1 does not claim
The public static site does **not** contain an authenticated agent runner. Approval creates the durable, machine-readable mission handoff. Connecting a runner that consumes those approved queue items is the next execution-layer milestone.

## Learning loop
`Not now`, edited missions and approved missions are valuable owner feedback. v1 records only the last browser approval locally; a future private owner layer should persist preference corrections safely and use them to improve future recommendations.
