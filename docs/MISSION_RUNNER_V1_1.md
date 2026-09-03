# Mission Control v1.1 — Automatic bounded runner

## Goal
Turn an approved Mission Control recommendation into asynchronous GitHub work without giving the public browser credentials or silently widening authority.

## Flow

```text
Michael reviews/edits recommendation
        ↓
submits [Mission] issue in Council
        ↓
owner-only intake validates packet
        ↓
A0–A2? ── no → fail closed
        ↓ yes
create target-repo runner issue
        ↓
assign GitHub Copilot cloud agent
        ↓
Scout → Builder → Verifier
        ↓
agent opens PR (does not merge)
        ↓
watcher surfaces REVIEW
        ↓
merged PR → celebrate + recompute
```

## Credential model
The public Pages application contains no write token. The GitHub Actions dispatcher uses `MISSION_RUNNER_TOKEN`; while migrating, it may fall back to the already-supported `REPO_FACTORY_TOKEN`. The token must belong to Michael and have enough access to create/assign issues in the target repositories. Never copy it into browser code or mission issues.

## GitHub coding agent
The dispatcher assigns `copilot-swe-agent[bot]` using GitHub's agent-assignment API. GitHub account/repository Copilot policy must allow cloud-agent assignment. If GitHub rejects assignment, the mission becomes `runner-blocked` and remains inspectable; Mission Control never claims the work started.

## Safety gates
- Only the repository owner can trigger mission intake.
- Repository target is restricted to `mikelninh/*`.
- Automatic risk ceiling is A2.
- Mission packet must contain done criteria, constraints, forbidden actions and explicit A0–A2 boundary.
- Agent instructions require repository `AGENTS.md` / harness truth, minimal reversible changes, existing tests/evals, and a PR handoff.
- No merge, deploy, publish, send, spend, secret mutation or sensitive/production-data access.

## Idempotency
Every target issue contains a hidden source marker. Re-edits/retries search for that marker before creating work, preventing duplicate missions.

## Reconciliation
`mission-watch.yml` checks dispatched missions every 15 minutes. It moves Council issues through `agent-running` → `agent-review` → `mission-complete`, or `runner-blocked` if the target closes without a verified PR path.

## Public UI
Mission Control exposes a single compact Runner strip: working, result ready, blocked, queued, or last completed. This is operational status, not another dashboard.
