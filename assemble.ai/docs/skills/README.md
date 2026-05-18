# Skill Source Material Archive

The files in this directory are archived source/reference material. They are not runtime skills, they are not loaded by the Next.js app, and they are not a backlog for adding a skill loader.

Current Sitewise runtime facts:

- Project records live in PostgreSQL through the app schema.
- Document/RAG search uses the current document processing pipeline and pgvector-backed storage.
- Background work runs through the app workers and queue infrastructure.
- New agent/workflow writes go through registered application actions and approval gates.

If a `SKILL.md` file mentions `project.db`, ChromaDB, a desktop harness, a file watcher, local Python pipelines, direct SQL, or autonomous agent writes, treat that as historical implementation source material only. Preserve useful domain knowledge, but translate it into current product shapes before implementation.

## How To Mine This Material

Use these files as source material for current artefacts:

- **Knowledge libraries:** clauses, checklists, terminology, domain rules, review criteria, and reference tables.
- **Prompt/source context:** agent role language, decision heuristics, response structure, and review rubrics.
- **Action specs:** validated write operations, approval previews, audit requirements, and lifecycle transitions.
- **Workflow specs:** multi-step PM workflows, evidence gathering, questions, and review gates.
- **Product docs:** user-facing workflow descriptions, templates, and operational guidance.
- **Follow-up issues:** capabilities that are valuable but not implemented in the current runtime.

When promoting content:

1. Verify whether the capability already exists in `src/`, workers, migrations, or current docs.
2. Replace old storage/runtime assumptions with current Sitewise concepts.
3. Link back to the source `SKILL.md` from the new artefact or issue.
4. Keep runtime changes action-backed and approval-gated where they mutate project records.
5. Do not create a generic markdown skill loader, plugin system, Chroma path, SQLite/project.db path, or desktop file-watcher path.

## Translation Guide

| Historical phrase | Current interpretation |
| --- | --- |
| `project.db` | Historical local database sketch. Translate to PostgreSQL/Drizzle schema, existing project records, or a new migration if needed. |
| ChromaDB / `project-vectors` | Historical vector-store sketch. Translate to current RAG schema and pgvector-backed retrieval. |
| file watcher | Historical desktop-harness trigger. Translate to explicit upload, document processing workers, or a product workflow trigger. |
| Python indexing script | Historical prototype shape. Translate to the current TypeScript/worker pipeline unless a separate tool is deliberately scoped. |
| direct SQL updates | Historical scaffold. Translate to domain services, registered actions, validation, approval, audit, and events. |
| skill invocation | Historical harness concept. Translate to runtime agent tools, workflow steps, prompt/source context, or knowledge-library retrieval. |

## Source Index

| Source | Best current destination |
| --- | --- |
| `cashflow-funding/SKILL.md` | Finance knowledge library, report prompts, funding workflow notes |
| `consultant-brief-mgmt/SKILL.md` | Stakeholder/brief product docs, consultant procurement actions |
| `contact-management/SKILL.md` | Stakeholder/contact action specs and UI docs |
| `contract-admin/SKILL.md` | Contract administration knowledge library and workflow specs |
| `contract-formation/SKILL.md` | Procurement knowledge library and contract formation workflow notes |
| `correspondence-register/SKILL.md` | Correspondence action specs and register product docs |
| `cost-planning/SKILL.md` | Cost planning knowledge library and finance prompts |
| `critical-path-delay/SKILL.md` | Programme knowledge library and future delay workflow specs |
| `da-approvals/SKILL.md` | Planning/DA knowledge library and Design Agent source material |
| `design-review-tracking/SKILL.md` | Design review workflow specs and knowledge-library review criteria |
| `dev-pro-forma/SKILL.md` | Feasibility/finance knowledge library and product templates |
| `document-register/SKILL.md` | Document repository product docs and register action specs |
| `drawing-compare/SKILL.md` | Future drawing comparison action/workflow specs |
| `dxf-parser/SKILL.md` | Drawing intelligence technical source material |
| `email-drafting/SKILL.md` | Correspondence prompt/source context |
| `environmental-dd/SKILL.md` | Feasibility knowledge library and due-diligence workflow specs |
| `file-watcher/SKILL.md` | Historical trigger model; mine only for document intake requirements |
| `final-account/SKILL.md` | Finance knowledge library and final-account workflow specs |
| `financial-reporting/SKILL.md` | Finance/reporting prompts and weekly report source material |
| `formal-letters/SKILL.md` | Correspondence prompt/source context and templates |
| `master-programme/SKILL.md` | Programme knowledge library and schedule action specs |
| `milestone-tracking/SKILL.md` | Programme product docs and workflow specs |
| `ncc-compliance/SKILL.md` | Knowledge library for NCC/AS references and Design Agent source material |
| `outlook-integration/SKILL.md` | Historical email-integration source; mine only into scoped correspondence issues |
| `planning-risk/SKILL.md` | Planning knowledge library and risk prompts |
| `procurement-process/SKILL.md` | Procurement knowledge library, workflows, and product docs |
| `programme-reporting/SKILL.md` | Weekly briefing/reporting prompts and programme report source material |
| `quality-completion/SKILL.md` | Delivery/quality knowledge library and closeout workflow specs |
| `report-extractor/SKILL.md` | Extraction prompt/source context and current RAG extraction specs |
| `report-indexer/SKILL.md` | Historical RAG source; current implementation is document workers plus pgvector |
| `rfi-management/SKILL.md` | RFI typed-record action specs, workflow specs, and product docs |
| `risk-schedule/SKILL.md` | Risk/programme knowledge library and schedule-risk prompts |
| `site-assessment/SKILL.md` | Feasibility knowledge library and site assessment workflow specs |
| `site-instructions/SKILL.md` | Future contract-admin typed-record/action specs |
| `spec-indexer/SKILL.md` | Historical RAG source; mine trade-section ideas into current chunking specs |
| `stakeholder-mapping/SKILL.md` | Stakeholder knowledge library and stakeholder product docs |
| `tender-evaluation/SKILL.md` | Tender evaluation prompts, extraction specs, and product docs |
| `transmittals/SKILL.md` | Transmittal action specs, product docs, and correspondence workflows |

## Review Check

The companion review note at `docs/skills/source-material-review.md` records the 2026-05-14 documentation check for issue 013.
