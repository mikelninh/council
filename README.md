# Council v3 ✦

A customisable multi-agent group chat: assemble a small AI team, give each member a role and operating prompt, let an orchestrator invite the right voices, and keep the resulting memory and work visible.

## v3

- Custom agents: name, avatar, role, prompt, boldness, model, reasoning level, enable/disable
- Multiple project rooms with independent briefs, chat histories, memories, tasks and debate maps
- Per-agent durable room memory (stored locally in your browser)
- Smart routing, direct `@mentions`, round-table mode and agent-to-agent summons
- Per-agent OpenAI model override
- Optional OpenAI web search for research-capable agents
- Source links surfaced below replies when the API returns web citations
- Mission queue: agents can propose tasks; humans can add, complete and remove them
- Visible debate / summon graph and last-turn room pulse
- Demo mode without an API key
- Server-side API key only; the browser never receives it
- Six-agent hard cap per turn to control runaway loops/cost

## Run locally

Requires Node.js 20+.

```bash
npm start
```

Then open `http://localhost:3030`.

On Windows you can also extract the project and double-click `START_COUNCIL.bat`.

## Enable live AI

Create `.env.local` next to `package.json`:

```env
OPENAI_API_KEY=your_key_here
OPENAI_MODEL=gpt-5
OPENAI_ORCHESTRATOR_MODEL=gpt-5
```

Never commit `.env.local`.

## Deploy on Vercel

Deploy this repository, then add `OPENAI_API_KEY` as a Vercel environment variable. `OPENAI_MODEL` and `OPENAI_ORCHESTRATOR_MODEL` are optional.

## Architecture

```text
Human
  ↓
Orchestrator ── selects 1–3 voices
  ↓
Agent A ── may summon ──→ Agent B
  ↓                       ↓
room transcript ←─────────┘
  ↓
Orchestrator synthesis
  ↓
Memory updates + tasks + debate graph
```

Agent memory and rooms are intentionally browser-local in v3 so the prototype needs no database. A future multi-user version can move rooms, memory and permissions to a persistent backend.

## Control tokens

Agents can emit hidden control tokens that the server parses and removes before display:

- `[[SUMMON:critic]]`
- `[[REMEMBER:durable room-specific note]]`
- `[[TASK:short title|builder|high]]`

These make coordination explicit and inspectable rather than hiding it inside a black-box agent loop.
