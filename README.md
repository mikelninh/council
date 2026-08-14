# Council ✦

**Evidence-first multi-agent decision making.**

Council is an AI decision system that checks reality before reasoning, forces agents to disagree before converging, and makes important recommendations falsifiable rather than merely confident.

## The decision loop

```text
tools
  ↓
evidence
  ↓
multiple specialist views
  ↓
forced counter-case
  ↓
resolution
  ↓
confidence + falsification test
  ↓
human-approved action
```

## What it proves

- tool use is required when a decision depends on external reality
- evidence is graded instead of silently treated as equally reliable
- specialist agents contribute different decision lenses
- a critic is required to attack the emerging consensus
- a chief agent resolves disagreement rather than adding another vote
- final recommendations include confidence and what evidence would reverse them
- consequential external actions stay human-approved

## Evidence grades

| Grade | Meaning |
| --- | --- |
| **A** | tool-verified state |
| **B** | repository- or source-asserted claim |
| **C** | independently validated external proof |
| **D** | Council inference or hypothesis |

That distinction matters: successfully reading a README should never turn a claim inside it into independent proof.

## Example: portfolio decision

A request such as:

> Check my projects, cluster related work, challenge the ranking and pick one priority.

runs through:

```text
GitHub scan
   ↓
venture clustering
   ↓
Builder
   ↓
Capital
   ↓
Humanist
   ↓
Critic
   ↓
Chief of Staff
   ↓
falsifiable decision
```

## Reliability behaviour

Council fails visibly rather than inventing missing reasoning. The runtime includes recovery for empty model outputs, bounded portfolio context and explicit tool/evidence gates.

## API surface

- `GET /api/status` — runtime and capability state
- `GET /api/portfolio?username=...` — GitHub portfolio evidence + clustering
- `POST /api/council` — evidence-gated multi-agent execution

## Tests

```bash
npm run check
npm run test:decision
node tests/github-smoke.mjs
```

The deterministic tests verify routing order, evidence requirements, Critic-before-Chief behaviour, recovery paths and explicit separation between observed evidence and inference.

## Run locally

```bash
npm install
npm start
```

Requires Node.js 20+ and an `OPENAI_API_KEY` for live model execution.

## Stack

**JavaScript · Node.js · OpenAI API · multi-agent orchestration · tool calling · evidence gates · deterministic tests · GitHub integration**

---

Built by [Michael Ninh](https://mikelninh.github.io/) in Berlin.
