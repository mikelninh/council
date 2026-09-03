# Mission Control v1.1 automatic runner handoff

## Status
Ready for independent verification.

## Current step
Run Council CI on `mission-control-v1.1-runner`, including runner contract tests and public-safe snapshot build.

## Evidence
- First manual runner trace already proved the desired execution sequence on PrüfPilot: approval → Scout → Builder → Verifier → PR → receipt.
- v1.1 encodes that handoff in `lib/mission-runner.mjs`, `scripts/mission-dispatch.mjs` and `scripts/mission-watch.mjs`.
- Intake now requires the GitHub event sender to equal the repository owner before any dispatch path exists.

## Decisions
- Use GitHub Copilot cloud agent as the first authenticated coding-agent runtime rather than inventing a second hosted agent service.
- Keep the public browser read-only; GitHub Actions owns credentials.
- Use a dedicated `MISSION_RUNNER_TOKEN`, with temporary fallback to existing `REPO_FACTORY_TOKEN` during migration.
- Do not spend a coding-agent session for infrastructure smoke testing; use `RUNNER_MODE: dry-run` after merge.

## Open risks
- Copilot cloud-agent assignment is account/policy dependent and cannot be proven by static CI alone.
- The watcher relies on GitHub issue/PR linkage and has a conservative fallback search; unusual agent PR metadata may require another reconciliation adapter.
- Private-repo runner status remains outside the public Pages snapshot until a private owner view exists.

## Next owner
Verifier — accept only if syntax, unit tests, harness invariants and the public Pages snapshot all pass. Operator then performs the no-agent dry-run preflight.
