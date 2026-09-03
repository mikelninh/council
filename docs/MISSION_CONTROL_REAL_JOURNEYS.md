# Mission Control v0.8 — Real project journeys

The roadmap graphic must tell the project's actual story, not display a generic stage template.

## Compact surface
Each core card shows:

`last earned milestone → NOW → next win → following win`

The labels come from optional `label` fields in `.harness/roadmap.json`. Full `title` values remain the durable explanatory text in the expanded detail.

Rules:
- no generic `ACHIEVED 3` badge;
- no repeated `ACHIEVED / NOW / NEXT / LATER` labels on every card;
- current milestone is the strongest visual node;
- achieved nodes use a filled graphite state;
- future nodes remain quiet;
- blocked is communicated with a restrained outline/state label, not a new rainbow palette;
- default card text is limited to one NOW line, one NEXT WIN line and one recent-win line;
- full North Star, all milestones, reasons and evidence stay behind expansion.

The roadmap contract stays authoritative. The UI may shorten only through explicit repository-owned `label` values; it must not invent strategic milestone names.
