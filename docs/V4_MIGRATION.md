# v4 browser-state migration

Council v4 intentionally starts a fresh browser-local company state using the key `council-v4-company-state`.

This avoids silently coercing v3 room data into company objects with invented owners, project health or founder decisions. Existing v3 local state remains untouched under its previous storage key.

A later migration can offer an explicit import flow that converts selected v3 rooms into v4 projects after the user chooses owners and project goals.
