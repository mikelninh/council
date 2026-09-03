# Mission Control v1.1 automatic runner handoff

## Status
Released and verified.

## What is now true
Mission Control v1.1 can accept an owner-approved A0–A2 mission packet, validate it fail-closed, dispatch through the authenticated GitHub runner lane, reconcile runner state, and surface compact status back in the daily home. The browser remains credential-free and A3/A4 actions remain human-gated.

## Evidence
- Council PR #25 merged at `fe184b9f401ab3770d7deee7df7e22e766829105`.
- `Check Council` run `33781765627`: success, including the explicit bounded mission-runner contract test and public Pages snapshot build.
- `harness-contract` run `33781765667`: success.
- Release preflight Issue #26 passed through the production intake in `RUNNER_MODE: dry-run`.
- Production intake run `33781875109`: success.
- Issue #26 was automatically labelled `mission-approved` and `runner-ready`, then closed as completed without launching a coding agent.

## Safety boundary
The release preflight deliberately did **not** consume a coding-agent session. The first real end-to-end proof therefore remains the next explicitly approved A0–A2 mission. The agent may prepare branch/PR/evidence work but may not merge, deploy, send, spend or cross a sensitive-data boundary.

## Remaining uncertainty
GitHub Copilot cloud-agent assignment is still account/policy dependent for a real mission. If the first assignment is rejected, Mission Control must surface `runner-blocked` rather than simulate progress.

## Next owner
Chief — refresh the live Mission Control snapshot and recommend the next highest-leverage bounded mission. Michael reviews/edits/approves that exact mission; approval becomes the first real automatic runner test.
