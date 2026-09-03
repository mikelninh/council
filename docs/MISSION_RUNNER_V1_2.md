# Mission Control v1.2 — Provider-independent worker fabric

## Decision

Mission Control owns orchestration. Worker providers are replaceable.

GitHub remains the durable state, approval, branch, PR and evidence layer. No single coding-agent vendor is allowed to become part of the mission contract.

Default path:

```text
Michael approves intent
        ↓
Council mission issue
        ↓
A0–A2 validation
        ↓
Target runner issue
        ↓
provider queue
        ↓
self-hosted worker
        ↓
Scout → Builder → Verifier
        ↓
branch + receipt + PR
        ↓
Michael reviews
```

A3/A4 always stops for explicit human approval.

## Backends

### `self-hosted` — default

Runs on a GitHub self-hosted runner you control. v1.2 ships one allowlisted local adapter:

- `aider-ollama`

The worker requires a model name to be configured explicitly. Mission Control does not guess which local model fits the machine.

### `copilot` — optional adapter

The old GitHub Copilot cloud-agent path remains an optional adapter for accounts that already have it. It is not required and is not the default.

Future adapters can implement the same contract without changing the Chief, approval UI or target-repository harness.

## Truthful states

- `runner-queued` — approval is durable; waiting for an available worker.
- `worker-running` — a configured provider has actually started the mission.
- `worker-review` — a verified PR exists and waits for human review.
- `runner-blocked` — provider, policy, setup or verifier stopped safely.
- `mission-complete` — verified PR was merged.

An offline local machine stays **queued**. It must never appear as working.

## One-time local setup

The first self-hosted machine needs four things:

1. A GitHub self-hosted runner registered to `mikelninh/council`.
2. The runner label `mission-control` in addition to GitHub's normal `self-hosted` label.
3. Ollama running locally with a coding model already pulled.
4. Aider installed and available on `PATH`.

The repository secret `MISSION_RUNNER_TOKEN` remains the cross-repository credential. It should stay repository-scoped and never be put in the browser or repository files.

### Windows setup

From the Council repository on the machine that should do the work:

1. Open `https://github.com/mikelninh/council/settings/actions/runners/new`.
2. Choose Windows and follow GitHub's generated download/config commands.
3. During runner configuration add the custom label `mission-control`.
4. Install Ollama and make sure `ollama --version` works from the same account that runs the GitHub runner.
5. Pull a coding model appropriate for the machine, for example:

   ```powershell
   ollama pull <your-model>
   ```

6. Install Aider:

   ```powershell
   python -m pip install aider-chat
   aider --version
   ```

7. In Council → Settings → Secrets and variables → Actions → **Variables**, create:

   - `MISSION_AGENT_BACKEND` = `aider-ollama`
   - `MISSION_LOCAL_MODEL` = the exact Ollama model name you pulled
   - optional `MISSION_MAX_REPAIRS` = `1`

8. Start the self-hosted runner and leave it online when you want Mission Control to execute local work.

No paid Copilot subscription is required.

## Worker contract

Before touching the target repository, the worker re-opens:

- source Council issue,
- target runner issue,
- `AGENTS.md`,
- `.harness/project.json`,
- `.harness/active-task.json`,
- `.harness/HANDOFF.md` when present.

The target checkout starts clean and on the repository default branch. Work moves to an idempotent branch:

```text
mission/c<SOURCE_ISSUE>-<project>
```

The local adapter may repair verifier failures only within a bounded retry budget. It may not remove or weaken the verifier to make the run pass.

## Verification

Verification is repository-owned, not provider-owned.

The worker reads `.harness/project.json` and runs:

- `commands.harness_check`
- `commands.quick_verification`

If the repository exposes neither, autonomous execution fails closed.

A passing worker writes a receipt under:

```text
.harness/receipts/mission-c<SOURCE_ISSUE>-provider-runner.json
```

The receipt records backend, model, branch, verifier commands, changed files and the A2 authority ceiling. It deliberately records no token or secret values.

## PR boundary

A successful worker may:

- create/edit files in the isolated target checkout,
- run local tests/evals,
- create a branch,
- push that branch,
- open a PR,
- add issue comments/labels,
- write a receipt.

It may not:

- merge the PR,
- deploy or publish,
- send external messages,
- spend money,
- access production/sensitive data,
- change secrets,
- widen autonomy/permissions,
- perform any A3/A4 action.

## Failure upgrade from v1.1

Council #28 successfully proved approval validation and target issue creation, then GitHub rejected Copilot cloud-agent assignment because the account did not have that paid capability. Digital Worker Factory #41 is the preserved target contract.

v1.2 converts that failure class into architecture: the same approved mission can be retried through `self-hosted` without rewriting its intent or paying for Copilot.

## First real proof after merge

1. Complete the one-time local setup above.
2. Re-open/edit Council #28 to include `RUNNER_BACKEND: self-hosted` (or rely on the v1.2 default).
3. The dispatcher reuses Digital Worker Factory #41.
4. `mission-worker.yml` queues on the local runner.
5. Mission Control must show **queued** until the machine actually picks it up.
6. The worker runs the DWF repository-owned harness/evals and returns a PR or a concrete blocker.
