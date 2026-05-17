# Sitewise Domain Context

Sitewise is moving toward a local/private single-user project appliance for client-side construction project management. The current north star is: Sitewise is a private project record system where an AI project officer helps one PM keep the job coherent, evidenced, and ready to issue.

The first design center is one accountable PM running one live project. The product should not be treated as pure desktop-only software, public SaaS-first software, or a firm-wide collaboration rollout in the current horizon. The current strategy note is `docs/strategy/local-private-appliance.md`.

The product combines a structured project workspace with an agentic AI layer. The AI layer can read project data, reason over uploaded documents and knowledge libraries, and propose database writes, but users remain in control through approval gates.

## Core Concepts

**Project workspace**: the main authenticated workspace for a project. It contains project details, project profile, objectives, cost plan, variations, invoices, program, risks, notes, meetings, reports, stakeholders, procurement records, documents, and knowledge libraries.

**Project profiler**: the structured project classification model. It captures building class, subclass, project type, scale data, region/state, procurement route, complexity attributes, and inferred objectives. The profiler drives domain tag resolution, knowledge library filtering, objectives generation, and context assembly.

**Project workspace entity**: any editable project record that appears in the workspace, including cost lines, variations, invoices, program activities, program milestones, objectives, risks, notes, meetings, reports, stakeholders, documents, transmittals, addenda, RFTs, TRRs, and tender evaluations.

**Application action**: a registered project operation that owns validation, preview diffs, approval policy, application logic, event emission, audit, and agent access. New agent and workflow writes should use application actions rather than duplicating write behavior. Existing direct UI routes can converge onto actions over time.

**Approval gate**: the user-control mechanism for proposed writes. Agent-driven and higher-risk operations produce an approval record and a diff card before data changes. Approval applies the write under optimistic row-version locking where the target entity supports it.

**Agent system**: the chat-based AI layer. Runtime support currently includes the Orchestrator and implemented specialists/flows in the codebase; long-form agent docs may describe future or unwired capabilities. Specialists use read tools freely and mutating tools only through approval-gated paths.

**Canonical project truth**: structured PostgreSQL records and stored files are the source of truth. Chat is interaction history. AI memory is editable preference/context only and must not override schema facts, document evidence, or issued artefacts.

**Typed-record pilot**: RFI is the first contract-administration typed-record pilot. EOTs, defects, site instructions, progress claims, determinations, and notices should wait until the RFI pattern is proven.

**Flagship workflow**: briefing/reporting is the first weekly workflow proof point. It should read current records, documents, RAG excerpts, and approved memory, then produce reviewable, evidence-aware outputs through approved writes where needed.

**Communication artifact**: a note, meeting, or project report. These artifacts share lifecycle behavior around creation, editing, copy, attendees/distribution, sections, transmittals, exports, and AI-assisted content generation.

**Document repository**: the project document store. Documents have versions, file assets, categories/subcategories, optional drawing metadata, and can be attached to communication artifacts or document sets.

**RAG ingestion**: the pipeline that makes documents searchable by AI. It reads a stored file, parses content, chunks it with construction-aware structure, embeds chunks, persists them in the RAG database, and tracks sync status.

**Knowledge library**: a curated domain library covering Australian construction practice, contracts, cost management, program, procurement, NCC/AS references, and discipline-specific guidance. Knowledge library content should go through the same reliable ingestion model as project documents.

**Context assembly**: the process of gathering project workspace facts, RAG excerpts, knowledge library excerpts, and cross-module insights for an AI task. `assembleContext()` is intended to become the single external interface for this behavior.

## Architectural Direction

The codebase should prefer deep modules around stable product concepts:

- project workspace writes go through application actions
- database table objects come from the PostgreSQL schema surface
- PostgreSQL and pgvector remain the data platform; SQLite is out of scope
- communication artifacts share one lifecycle module where behavior is common
- RAG ingestion owns queueing and sync status transitions for all AI-searchable documents
- AI consumers receive context through `assembleContext()`
- `docs/skills/*/SKILL.md` files are source/reference material, not live runtime skills
