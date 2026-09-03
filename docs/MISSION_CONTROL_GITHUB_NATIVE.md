# Mission Control v0.3 — GitHub-native delivery

## Architecture

```text
public GitHub repositories
        ↓
.harness/project.json + active-task.json
        ↓
Council snapshot builder
        ↓
public-safe mission-control.json
        ↓
GitHub Actions in mikelninh.github.io
        ↓
GitHub Pages /mission-control/
```

## Why this version exists
Mission Control v0.2 required a live Node/API runtime. v0.3 makes the cockpit useful without Vercel, a database or browser credentials.

The generated Pages payload is deliberately **public-safe**. It publishes public repository state only. Private repository names, tasks, evidence and metadata are not copied into the static site.

## Refresh model
- the personal-site workflow may refresh on schedule or manually;
- it runs Council's `npm run build:pages`;
- it commits only when the generated public snapshot changed;
- GitHub Pages then republishes from the existing personal-site repository.

The browser never receives a GitHub token.

## Limits
This is the public read-only cockpit. Private portfolio state requires a separate authenticated/private delivery lane; it must not be solved by embedding a token into GitHub Pages.

## Local build

```bash
npm run build:pages
```

Output: `dist-pages/mission-control/`.
