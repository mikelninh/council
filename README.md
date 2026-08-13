# Council v5.2 ✦ — Decision Quality

Council is an **evidence-first AI company operating system**. The first company running on it is Council itself: **Council Labs, Company #001**.

v4 proved the company shell. v5 added truthful tools and evidence gates. v5.1 added authenticated private GitHub portfolio inspection. **v5.2 makes the company better at deciding**: evidence grades, venture-family reasoning, forced disagreement, Chief resolution, confidence, and falsification tests.

## Product contract

**TOOLS → STATE → ACTION → VERIFICATION**

For high-stakes portfolio decisions, v5.2 adds:

**EVIDENCE → CLUSTER → DISAGREE → RESOLVE → FALSIFY**

- If a request needs reality, Council runs the relevant tool before agents reason.
- External checks appear as visible tool traces with status, scope and duration.
- The Orchestrator enforces an evidence gate and refuses to declare completion when required proof is missing.
- Repository assertions are never silently upgraded into independently verified facts.
- Portfolio decisions reason across venture families before treating every repository as a separate company.
- Builder, Capital and Humanist contribute different lenses.
- Critic is required to attack the emerging consensus.
- Chief of Staff speaks after Critic and resolves the disagreement into exactly one priority.
- The final decision carries confidence and a falsification test: what evidence would make Council reverse itself?
- Consequential external side effects remain human-approved.

## Evidence grades

Council v5.2 uses four explicit evidence levels:

- **A — Tool-verified:** GitHub API metadata, file existence, timestamps and machine-observed state.
- **B — Repo-asserted:** claims written in repository descriptions or READMEs. Useful evidence of intent and claimed capability, but not independently verified.
- **C — Independently validated:** external proof such as real customer evidence, revenue, usage, a verified deployment or an independently checked source. The GitHub scan alone cannot create Grade C evidence.
- **D — Council inference:** venture clustering, impact, monetizability, buyer, pricing, founder fit, rankings and other hypotheses.

This prevents a README sentence like “pilot with X” from being called **proven** merely because Council successfully fetched the README.

## Decision-quality portfolio loop

A request such as:

> Check all my GitHub projects, cluster related work, rank the strongest opportunities for impact and monetizability, challenge the ranking, then pick one company priority.

triggers this order:

```text
GitHub portfolio scan
      ↓
venture-family inference [D]
      ↓
Builder — readiness / technical leverage
      ↓
Capital — buyer / revenue / distribution
      ↓
Humanist — severity / dignity / impact
      ↓
Critic — forced counter-case
      ↓
Chief of Staff — resolve disagreement
      ↓
Orchestrator — evidence gate + final decision
      ↓
confidence + falsification test + ≤2 next tasks
```

The Chief is deliberately last. It should not create a fifth independent ranking; it resolves the room.

If Critic fails at runtime, Council must say so explicitly. The Orchestrator then performs a separate counter-case before making a decision instead of pretending the ranking was challenged.

## Model recovery

v5.2 hardens the empty-output failure seen in Chief and Critic:

- first attempt uses the agent's configured reasoning level;
- if the model returns no visible text, the retry automatically drops to **low reasoning**;
- the retry receives a materially larger visible-output budget;
- incomplete-response reasons are retained in the execution error when available;
- failures remain visible — there is still no fake text fallback.

Portfolio tool context is also compressed: all repositories remain represented, but README excerpts are bounded more aggressively and venture families appear first. This reduces repeated context pressure while preserving the full portfolio scope.

## GitHub Portfolio Scan

The scan records every owned repository it can access and inspects the README of every non-empty, non-archived repository. Evidence includes:

- repository name
- public/private scope
- language and topics
- stars, forks and open issues
- push recency
- portfolio activity over 30 / 90 days
- bounded README excerpt
- explicit README coverage
- inferred venture family [D]

### Public vs private repositories

Without credentials, Council scans public repositories only.

To include private repositories, set a separate server-side `GITHUB_TOKEN` using a fine-grained GitHub token with only:

- Metadata: read
- Contents: read

Council does not need GitHub write permission for portfolio analysis.

**Security:** a deployment that can read private repositories must itself be private. On Vercel Hobby, the recommended setup is to put `GITHUB_TOKEN` in the **Preview** environment only and enable **Vercel Authentication / Standard Deployment Protection**. Keep Production public-only unless the production domain is separately protected.

Never expose `GITHUB_TOKEN` to browser code or commit it to GitHub.

## Reality layer

`/api/status` reports what Council can actually see, including:

- OpenAI live/demo state
- GitHub public vs authenticated mode
- private repository access
- deep README inspection
- evidence grading
- venture clustering
- Vercel runtime state

## Agent controls

Council supports hidden coordination controls:

- `[[SUMMON:critic]]`
- `[[REMEMBER:durable room-specific note]]`
- `[[TASK:short title|builder|high]]`
- `[[SKIP]]`

The server strips these controls from visible replies.

## Run locally

Requires Node.js 20+.

```bash
npm start
```

Open `http://localhost:3030`.

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

For Vercel, set secrets in Project Settings → Environments → the target environment → Environment Variables. The browser never receives `OPENAI_API_KEY` or `GITHUB_TOKEN`.

## Tests

```bash
npm run check
npm run test:decision
node tests/github-smoke.mjs
```

The deterministic decision-quality smoke test verifies:

- portfolio requests require the GitHub tool;
- routing order is Builder → Capital → Humanist → Critic → Chief;
- Critic appears before Chief;
- empty-output recovery lowers reasoning effort and increases output budget;
- venture clustering stays explicitly Grade D.

The GitHub smoke test touches the real public GitHub API and verifies README inspection, evidence grades and venture-family output.

## API surface

- `GET /api/status` — truthful runtime/capability state
- `GET /api/portfolio?username=...` — live GitHub portfolio + README evidence + venture-family inference
- `POST /api/council` — evidence-gated multi-agent execution + decision-quality metadata

## Company cycle

The company cycle refreshes external state through server tools it can actually access. Systems that are not connected remain explicitly unknown.

## Repo Factory

The repository still contains the owner-gated GitHub Actions **Repo Factory**. An owner-authored `[create-repo] ...` issue can create an approved repository using the `REPO_FACTORY_TOKEN` secret.

The longer-term company loop is:

```text
Founder direction
      ↓
truthful tool reads
      ↓
evidence grades
      ↓
venture / problem framing
      ↓
role-distinct debate
      ↓
forced challenge
      ↓
Chief resolution
      ↓
falsifiable decision
      ↓
human-approved action
      ↓
verification trace
```
