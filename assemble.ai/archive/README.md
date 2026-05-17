# Archive

This directory contains historical planning documents from the pre-2026-05 era when Sitewise was being designed as a multi-tenant SaaS. These documents are preserved for reference but do not reflect current implementation truth. See [`../CODEBASE.md`](../CODEBASE.md) and [`../docs/strategy/`](../docs/strategy/) for current truth.

## Why this exists

Sitewise's product direction changed in May 2026 from a multi-tenant SaaS to a local/private single-user project appliance, where an AI project officer helps one accountable PM keep one live project coherent, evidenced, and ready to issue. The PRDs, specs, plans, and supporting documents written under the prior direction were not deleted because they remain useful as historical context, source material for knowledge libraries, and a record of decisions that were considered, tried, or deferred.

If you are looking for what Sitewise is today, do not read anything in this directory. Read:

- [`../README.md`](../README.md) — product overview
- [`../CLAUDE.md`](../CLAUDE.md) — agent context
- [`../CODEBASE.md`](../CODEBASE.md) — current codebase state
- [`../docs/strategy/local-private-appliance.md`](../docs/strategy/local-private-appliance.md) — current product strategy
- [`../docs/adr/`](../docs/adr/) — architecture decisions
- [`../docs/issues/`](../docs/issues/) — current work items
- [`../docs/setup/local-private-bootstrap.md`](../docs/setup/local-private-bootstrap.md) — current setup

If you are working on the new public SaaS reintegration track, start from [`../docs/strategy/public-saas-reintegration.md`](../docs/strategy/public-saas-reintegration.md), [`../docs/prds/2026-05-17-public-saas-reintegration-prd.md`](../docs/prds/2026-05-17-public-saas-reintegration-prd.md), and [`../docs/issues/2026-05-17-public-saas-reintegration/`](../docs/issues/2026-05-17-public-saas-reintegration/). The SaaS-era documents in this archive remain reference material only; do not merge or re-import them without re-evaluating them against the current app.

## What's in here

- `specs/` — numbered feature specs 000–025 from the SaaS-era roadmap (document repo, procurement, cost planning, RAG, project initialization, landing page, evaluation reports, profiler, stakeholders, notes/meetings/reports, profiler expansion, better-auth/Polar payments, intelligent reports, etc.).
- `docs/prds/` — product requirement documents from the prior planning cycle, including the briefing grill-me PRD and the local/private RFI appliance PRD that became the cutover input to current strategy.
- `docs/plans/` — dated design and implementation plans from early 2026 covering project details, objectives extraction, budget application, AI prompt architecture, coaching engine, context orchestrator, knowledge domains, design categories, document repo navigation, admin page, agent integration, cross-tab live updates, broad write tools, chat-as-control-surface, briefing pack, delivery-lite, brief building, client-side pivot, landing animation, and tender evaluation AI blueprint.
- `docs/research/` — domain research reports on architectural trades, civil engineering, MEP services, structural engineering, and trade interfaces. Useful as source material for knowledge libraries; not live product surface.
- `HIGH_LEVEL_STRATEGY.md` — the prior high-level strategy note. Superseded by `../docs/strategy/local-private-appliance.md`.
- `CONTEXT.md` — prior cross-cutting context for the SaaS-era product shape.
- `DEPLOYMENT.md` — prior deployment instructions. To be replaced by appliance-shaped deployment docs (see issue 014 in the current RFI appliance plan).
- `walkthrough.md` — prior product walkthrough.
- `CODEBASE_B.md` — earlier draft of the codebase review. The current draft lives at `../CODEBASE.md`.
- `before_profiler.tsx` — orphaned snapshot of a component from a prior refactor.

## Conventions

Files keep their original names. Subdirectories under `archive/docs/` mirror the path they had under `../docs/` so cross-references in older documents continue to make sense when read in context. Nothing here should be re-imported into the live tree without re-evaluation against current strategy.
