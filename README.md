# Council v4 ✦ — Company OS

Council is evolving from a multi-agent group chat into an **AI-native company operating system**. The first company running on it is Council itself: **Council Labs, Company #001**.

The founder sets direction. A Chief of Staff routes work. Specialist agents research, build, challenge and propose tasks. Projects get rooms and owners. Decisions that truly require a human rise to a founder queue. Durable lessons become company memory.

## v4: Company OS

- Executive founder dashboard: focus, decisions, open missions, portfolio and company pulse
- Council Labs seeded as Company #001, with Council v4 as its first product
- Chief of Staff, Builder, Designer, Scientist, Critic, Humanist, Capital, Operator and Growth agents
- Editable team roles, prompts, model overrides, reasoning and web-research access
- Explicit authority levels: Observe → Recommend → Act with approval → Autonomous
- Human approval remains the default for consequential external side effects in v4
- Portfolio with project owners, progress, health, milestones and dedicated project rooms
- Founder decision queue with agent recommendations and decisions written into company memory
- Institutional memory: mission, principles, decisions and lessons
- Company cycle: feed the current projects, founder decisions and open missions back into the agent loop for a fresh operating review
- Existing v3 collaboration engine remains: smart routing, `@mentions`, agent-to-agent summons, web research, room memory and agent-created tasks
- Demo mode without an API key; live OpenAI mode with server-side credentials
- Six-agent hard cap per turn to prevent runaway loops and control cost

## Run locally

Requires Node.js 20+.

```bash
npm start
```

Open `http://localhost:3030`.

On Windows, `START_COUNCIL.bat` launches the local server.

## Enable live AI

Create `.env.local` next to `package.json`:

```env
OPENAI_API_KEY=your_key_here
OPENAI_MODEL=gpt-5
OPENAI_ORCHESTRATOR_MODEL=gpt-5
```

Never commit `.env.local`.

For Vercel, add `OPENAI_API_KEY` to the project environment variables and redeploy. The browser never receives the API key.

## Company operating loop

```text
Founder direction
      ↓
Chief of Staff
      ↓
company snapshot → projects / decisions / missions / memory
      ↓
relevant specialists enter the room
      ↓
research · challenge · build · assign
      ↓
internal tasks + durable memory
      ↓
Founder briefing
      ↓
only consequential decisions return to the human
```

## Agent collaboration

Agents can emit hidden control tokens that the server parses and removes before display:

- `[[SUMMON:critic]]`
- `[[REMEMBER:durable room-specific note]]`
- `[[TASK:short title|builder|high]]`

This keeps coordination explicit and inspectable instead of burying it inside an opaque loop.

## Persistence

v4 deliberately keeps company state, rooms, tasks and memory in browser-local storage so the prototype has no database dependency. A multi-user version should move company state, permissions, audit trails and shared memory to a persistent backend.

## Repo Factory

The repository also contains a secure GitHub Actions **Repo Factory**. An owner-authored `[create-repo] ...` issue can create a new repository using the `REPO_FACTORY_TOKEN` secret. This gives Council a path toward spawning approved projects into real GitHub repositories while keeping repository creation behind an explicit control surface.
