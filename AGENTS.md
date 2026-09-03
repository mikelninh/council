# AGENTS.md — Council / Mission Control

## Mission
Give Michael one evidence-first operating view across his portfolio: what is active, what is blocked, what needs him, what agents may safely continue, and what the exact next move is.

## Start here
1. Read `README.md`.
2. Read `.harness/project.json`.
3. Read `.harness/active-task.json` and `.harness/HANDOFF.md`.
4. For portfolio state, re-open GitHub/API evidence rather than relying on chat memory.

## Source-of-truth map
- Decision runtime: `lib/council.mjs`, `api/council.mjs`
- GitHub evidence tools: `lib/tools.mjs`
- Mission Control aggregation: `lib/mission-control.mjs`, `api/mission-control.mjs`
- GitHub Pages snapshot builder: `scripts/build-pages.mjs`, `docs/MISSION_CONTROL_GITHUB_NATIVE.md`
- Founder UI: `public/`
- Deterministic tests: `tests/`
- Current work state: `.harness/`
- CI truth: `.github/workflows/`

## Contract before work
Every substantial task defines goal, sources, outputs, constraints, done criteria, forbidden actions, risk class, retry budget and next owner.

## Roles
- Chief: triage and route.
- Scout: collect current evidence read-only.
- Builder: make isolated reversible changes.
- Verifier: independently test claims and artefacts.
- Operator: perform approved consequential actions.

## Action classes
- A0 Observe — read/search/analyse. Automatic.
- A1 Local reversible — draft/test/edit isolated work. Automatic.
- A2 Shared reversible — branch, PR, preview, issue. Logged; normally automatic.
- A3 Consequential — deploy, send, publish, spend, write externally. Human approval required.
- A4 High-impact — destructive production changes, sensitive-data egress, legal/financial commitments. Explicit approval plus stronger verification.

## Mission Control rules
- Portfolio metadata is observed evidence; rankings are inference.
- Private projects must never silently disappear. In an authenticated/private view they must surface as visible state or an explicit scope limitation; in public GitHub Pages they are deliberately excluded to prevent leakage.
- `completed` work must not masquerade as active work.
- A project requiring human review must surface in **Needs me**.
- Missing `.harness/` state is visible as `untracked`, not guessed.
- Mission Control is read-only in v0.2 and remains read-only in v0.3. It may recommend actions; it does not execute cross-repo writes.
- Public GitHub Pages may publish **public repository state only**. Never leak private repository names, task text, evidence, credentials or metadata into a static snapshot.
- Browser code must never contain GitHub credentials. Refresh happens in GitHub Actions or the trusted runtime, not by shipping a token to the client.

## Verification
Minimum checks:
- `node scripts/harness-check.mjs`
- `npm run check`
- `npm run test:mission`
- `npm run test:decision`
- `npm run test:founder`
- `npm run build:pages` for GitHub-native release work

Never claim a command passed unless it actually ran and the result is captured.

## Durable state
Chat is not the system of record. Keep current work and handoff state in `.harness/`. Re-open current GitHub state before decisions.

## Retries
Default maximum: 3. If the same failure repeats twice, stop and upgrade the harness/test/tool path.

## Definition of done
The requested capability exists, tests/CI support the claim, remaining limitations are explicit, and the next owner/action is recorded.
