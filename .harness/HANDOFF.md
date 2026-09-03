# Mission Control v0.3 handoff

## Status
Ready for independent verification.

## Current step
Run Council CI on `mission-control-v0.3-github-pages`.

## What changed
- Added a static GitHub Pages snapshot builder.
- Made the Mission Control UI work from a relative JSON snapshot with live API fallback.
- Added an explicit public-safe privacy boundary: private repository details are excluded from Pages.
- Added a no-Vercel delivery design using the already-enabled `mikelninh.github.io` Pages repository.
- Added CI verification for the generated cockpit artefacts.

## Decisions
- Do not enable Pages on Council when the existing personal-site repository already has Pages enabled.
- Keep Council as the engine/source contract and use the personal site as the public view host.
- Do not solve private-project visibility by leaking credentials or private metadata into static Pages.

## Open risk
The personal-site workflow still needs to be installed after Council CI passes.

## Next owner
Verifier — accept only if syntax, deterministic tests, GitHub adapter smoke and public snapshot build pass.
