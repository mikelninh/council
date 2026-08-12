# Council v5.1 ✦ — Private Portfolio

Council is an **evidence-first AI company operating system**. The first company running on it is Council itself: **Council Labs, Company #001**.

v4 proved the company shell: roles, memory, tasks, projects and a founder dashboard. v5 added truthful tools and evidence gates. v5.1 makes the GitHub portfolio useful for the founder's real work: **owned public + private repositories, with README inspection rather than metadata-only pretending**.

## Product contract

**TOOLS → STATE → ACTION → VERIFICATION**

- If a request needs reality, Council runs the relevant tool before agents reason.
- External checks appear as visible tool traces with status, scope and duration.
- The Orchestrator enforces an evidence gate and refuses to declare completion when required proof is missing.
- Empty model outputs are retried once and then shown as execution failures — never replaced with “I have no useful contribution yet.”
- Hidden coordination controls are parsed server-side and never intentionally shown as prose.
- Expert routing is task-aware: GitHub + monetization routes to Builder / Capital / Humanist / Critic instead of inviting decorative roles.
- Consequential external side effects remain human-approved.

## GitHub Portfolio Scan

A request such as:

> Check all my GitHub projects and tell me which we should work on together for highest impact and monetizability.

triggers `github.portfolio.scan` before the agents speak.

The scan records every owned repository it can access and then inspects the README of every non-empty, non-archived repository. Evidence includes:

- repository name and description
- public/private scope
- language and topics
- stars, forks and open issues
- push recency
- portfolio activity over 30 / 90 days
- a bounded README excerpt for product purpose, capabilities and positioning
- explicit README coverage so Council cannot imply it inspected files it never opened

Repository metadata and README text are **evidence of what has been built**, not proof of impact or willingness to pay. Market and impact conclusions remain hypotheses until supported by users, pilots or revenue.

### Public vs private repositories

Without credentials, Council scans public repositories only.

To include private repositories, set a separate server-side `GITHUB_TOKEN` using a fine-grained GitHub token with access to the repositories you want Council to inspect and only the permissions it needs:

- Metadata: read
- Contents: read

Council does not need GitHub write permission for portfolio analysis.

**Security:** a deployment that can read private repositories must itself be private. On Vercel Hobby, the recommended setup is to put `GITHUB_TOKEN` in the **Preview** environment only and enable **Vercel Authentication / Standard Deployment Protection**. Keep Production public-only unless the production domain is separately protected.

Never expose `GITHUB_TOKEN` to browser code or commit it to GitHub.

## Reality layer

`/api/status` reports what Council can actually see:

- OpenAI live/demo state
- GitHub public vs authenticated mode
- whether private repositories are available
- whether deep README inspection is enabled
- whether Council is running on Vercel
- whether a Vercel management token is connected

The dashboard deliberately avoids copying stale deployment/project status into long-lived browser state.

## Agent execution

Council supports agent-to-agent coordination using hidden controls:

- `[[SUMMON:critic]]`
- `[[REMEMBER:durable room-specific note]]`
- `[[TASK:short title|builder|high]]`
- `[[SKIP]]` when an agent has no distinct contribution

The server strips these controls from visible replies.

## Run locally

Requires Node.js 20+.

```bash
npm start
```

Open `http://localhost:3030`.

On Windows, `START_COUNCIL.bat` launches the local server.

## Environment

Create `.env.local` next to `package.json`:

```env
OPENAI_API_KEY=your_key_here
OPENAI_MODEL=gpt-5
OPENAI_ORCHESTRATOR_MODEL=gpt-5
GITHUB_USERNAME=mikelninh
GITHUB_TOKEN=
COUNCIL_REPO=mikelninh/council
```

For Vercel, set secrets in Project Settings → Environment Variables. The browser never receives `OPENAI_API_KEY` or `GITHUB_TOKEN`.

## API surface

- `GET /api/status` — truthful runtime/capability state
- `GET /api/portfolio?username=...` — live GitHub portfolio + README evidence
- `POST /api/council` — evidence-gated multi-agent execution

## Company cycle

The company cycle no longer starts from hard-coded progress percentages. It receives the current client-side founder focus and internal tasks, then refreshes external state through server tools it can actually access. Systems that are not connected remain explicitly unknown.

## Repo Factory

The repository still contains the owner-gated GitHub Actions **Repo Factory**. An owner-authored `[create-repo] ...` issue can create an approved repository using the `REPO_FACTORY_TOKEN` secret.

The longer-term loop is:

```text
Founder direction
      ↓
truthful tool reads
      ↓
Chief of Staff routes specialists
      ↓
evidence → debate → decision
      ↓
internal task / human approval
      ↓
external action
      ↓
verification trace
```
