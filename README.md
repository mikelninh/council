# Council v5 ✦ — Truth & Tools

Council is an **evidence-first AI company operating system**. The first company running on it is Council itself: **Council Labs, Company #001**.

v4 proved the company shell: roles, memory, tasks, projects and a founder dashboard. v5 fixes the important weakness: agents are no longer allowed to sound as if they performed external work when they did not.

## v5 product contract

**TOOLS → STATE → ACTION → VERIFICATION**

- If a request needs reality, Council runs the relevant tool before agents reason.
- External checks appear as visible tool traces with status, scope and duration.
- The Orchestrator enforces an evidence gate and refuses to declare completion when required proof is missing.
- Empty model outputs are retried once and then shown as execution failures — never replaced with “I have no useful contribution yet.”
- Hidden coordination controls are parsed server-side and never intentionally shown as prose.
- Expert routing is task-aware: GitHub + monetization routes to Builder / Capital / Humanist / Critic instead of inviting decorative roles.
- Consequential external side effects remain human-approved.

## Real GitHub Portfolio Scan

A request such as:

> Check all my GitHub projects and tell me which we should work on together for highest impact and monetizability.

now triggers `github.portfolio.scan` before the agents speak.

The scan records:

- repository name and description
- public/private scope
- language and topics
- stars, forks and open issues
- push recency
- portfolio activity over 30 / 90 days

Repository metadata is treated as **evidence of activity and technical shape**, not proof of impact or willingness to pay. The agents must label market and impact conclusions as hypotheses until better evidence exists.

### Public vs private repositories

GitHub scanning works immediately without credentials for public repositories.

To include private repositories, set a server-side `GITHUB_TOKEN` with the minimum read access needed for repository metadata. Never expose that token to the browser or commit it to GitHub.

## Reality layer

`/api/status` reports what Council can actually see:

- OpenAI live/demo state
- GitHub public vs authenticated mode
- whether private repository metadata is available
- whether Council is running on Vercel
- whether a Vercel management token is connected

The dashboard deliberately avoids copying stale deployment/project status into long-lived browser state.

## Agent execution

Council still supports agent-to-agent coordination using hidden controls:

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
- `GET /api/portfolio?username=...` — live GitHub portfolio metadata
- `POST /api/council` — evidence-gated multi-agent execution

## Company cycle

The v5 company cycle no longer starts from hard-coded progress percentages. It receives the current client-side founder focus and internal tasks, then refreshes external state through server tools it can actually access. Systems that are not connected must remain explicitly unknown.

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
