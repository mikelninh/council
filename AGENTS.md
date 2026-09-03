# AGENTS.md — Council / Mission Control

## Mission
Give Michael one evidence-first AI Chief of Staff across his portfolio: understand where every serious project stands, recommend the highest-leverage next move, safely delegate bounded work, verify the result and return consequential decisions to him.

## Start here
1. Read `README.md`.
2. Read `.harness/project.json`.
3. Read `.harness/active-task.json`, `.harness/roadmap.json` and `.harness/HANDOFF.md`.
4. Read `docs/CHIEF_OF_STAFF_V1.md` and `docs/MISSION_RUNNER_V1_1.md` for recommendation, approval and runner semantics.
5. Re-open current GitHub/API evidence rather than relying on chat memory.

## Source-of-truth map
- Decision runtime: `lib/council.mjs`, `api/council.mjs`
- Chief recommendation policy: `lib/chief.mjs`
- Runner packet/status contract: `lib/mission-runner.mjs`
- GitHub evidence tools: `lib/tools.mjs`
- Mission Control aggregation: `lib/mission-control.mjs`, `api/mission-control.mjs`
- GitHub Pages snapshot builder: `scripts/build-pages.mjs`
- Daily home: `public/mission-control.*`
- Approved mission intake + dispatch: `.github/workflows/mission-intake.yml`, `scripts/mission-dispatch.mjs`
- Runner reconciliation: `.github/workflows/mission-watch.yml`, `scripts/mission-watch.mjs`
- Deterministic tests: `tests/`
- Current work state: `.harness/`
- CI truth: `.github/workflows/`

## Contract before work
Every substantial task defines goal, sources, outputs, constraints, done criteria, forbidden actions, risk class, retry budget and next owner.
A task may also define `decision_estimate` with impact, urgency, unlock value, effort and confidence on a 1–5 scale. These are explicit judgement inputs, never observed facts.

## Roles
- Chief: triage, recommend, route, synthesize and escalate. No specialist production work.
- Scout: collect current evidence read-only.
- Builder: make isolated reversible changes.
- Verifier: independently test claims and artefacts.
- Operator: perform approved consequential actions.

## Action classes
- A0 Observe — read/search/analyse. Automatic.
- A1 Local reversible — draft/test/edit isolated work. Automatic inside an approved mission.
- A2 Shared reversible — branch, PR, preview, issue. Logged; normally automatic inside an approved mission.
- A3 Consequential — deploy, send, publish, spend, write externally. Human approval required.
- A4 High-impact — destructive production changes, sensitive-data egress, legal/financial/clinical commitments. Explicit approval plus stronger verification.

## Chief recommendation rules
- Prefer a high-leverage unblocked A0–A2 delegation when one exists.
- Surface human gates and blockers separately even when they are not the primary delegation recommendation.
- Recommendation factors must be inspectable; never present a heuristic score as objective truth.
- `roadmap.json` defines direction. `active-task.json` defines current execution. Never infer execution ownership from roadmap prose.
- If the active task is missing or completed, surface a contract gap rather than inventing work.
- Owner corrections (`approve`, `edit`, `not now`) outrank repository activity when a future private preference loop is available.

## Approval and runner boundary
- Public GitHub Pages contains no GitHub write credential and no secret agent credential.
- `APPROVE & QUEUE` opens a durable owner-submitted mission packet; the browser itself never mutates repositories.
- Approved mission packets must preserve project, exact mission, risk class, done criteria, constraints, forbidden actions and A0–A2 boundary.
- `.github/workflows/mission-intake.yml` accepts owner-created/edited `[Mission]` issues only and rejects A3/A4 before dispatch.
- The authenticated runner may create a target issue and assign GitHub Copilot cloud agent only inside the recorded A0–A2 contract.
- The coding agent must read `AGENTS.md`, preserve safety/readiness gates, open a PR and stop before merge/deploy/send/spend/sensitive-data actions.
- `.github/workflows/mission-watch.yml` may reconcile public issue/PR status; it never grants additional authority.
- Missing runner credentials or policy support must surface as `runner-blocked`, never as fake progress.

## Mission Control rules
- Mission Control is read-only in v0.2 and the public v1 Pages experience remains advisory/read-only; approved work leaves the browser through an explicit durable handoff.
- Portfolio metadata is observed evidence; rankings and Chief scores are inference.
- Private projects must never silently disappear. Public Pages deliberately excludes private details; authenticated owner views must state their scope.
- `completed` work must not masquerade as active work.
- Missing `.harness/` state is visible as `untracked`, not guessed.
- Public Pages may publish public repository state only.
- Browser code must never contain GitHub or AI-provider credentials.

## Verification
Minimum checks:
- `node scripts/harness-check.mjs`
- `npm run check`
- `npm run test:mission`
- `npm run test:decision`
- `npm run test:founder`
- `npm run test:mission-ui`
- `npm run test:chief`
- `npm run test:runner`
- `npm run build:pages` for GitHub-native release work
Never claim a command passed unless it actually ran and the result is captured.

## Durable state
Chat is not the system of record. Keep current work, roadmaps, approvals, receipts and handoffs durable in repositories. Re-open current GitHub state before decisions.

## Failure upgrades
If dispatch, agent assignment or reconciliation fails, preserve the approved packet, mark the exact runner failure, and improve the contract/tool path rather than bypassing a gate.

## Retries
Default maximum: 3. If the same failure repeats twice, stop and upgrade the harness/test/tool path.

## Definition of done
The requested capability exists, tests/CI support the claim, remaining limitations are explicit, and the next owner/action is recorded.
