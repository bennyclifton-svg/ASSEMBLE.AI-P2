# Assemble.ai Domain Context

Assemble.ai is a SaaS construction project management platform for architectural, construction, project management, cost management, and contract administration teams. The product combines a structured project workspace with an agentic AI layer. The AI layer can read project data, reason over uploaded documents and knowledge libraries, and propose database writes, but users remain in control through approval gates.

## Core Concepts

**Project workspace**: the main authenticated workspace for a project. It contains project details, project profile, objectives, cost plan, variations, invoices, program, risks, notes, meetings, reports, stakeholders, procurement records, documents, and knowledge libraries.

**Project profiler**: the structured project classification model. It captures building class, subclass, project type, scale data, region/state, procurement route, complexity attributes, and inferred objectives. The profiler drives domain tag resolution, knowledge library filtering, objectives generation, and context assembly.

**Project workspace entity**: any editable project record that appears in the workspace, including cost lines, variations, invoices, program activities, program milestones, objectives, risks, notes, meetings, reports, stakeholders, documents, transmittals, addenda, RFTs, TRRs, and tender evaluations.

**Application action**: a registered project operation that owns validation, preview diffs, approval policy, application logic, event emission, audit, and agent access. UI controls, chat agents, and future workflows should use application actions rather than duplicating write behavior.

**Approval gate**: the user-control mechanism for proposed writes. Agent-driven and higher-risk operations produce an approval record and a diff card before data changes. Approval applies the write under optimistic row-version locking where the target entity supports it.

**Agent system**: the chat-based AI layer. The Orchestrator routes user requests to specialists such as Finance, Program, Design, Procurement, Delivery, Correspondence, and Feasibility. Specialists use read tools freely and mutating tools only through the approval gate.

**Communication artifact**: a note, meeting, or project report. These artifacts share lifecycle behavior around creation, editing, copy, attendees/distribution, sections, transmittals, exports, and AI-assisted content generation.

**Document repository**: the project document store. Documents have versions, file assets, categories/subcategories, optional drawing metadata, and can be attached to communication artifacts or document sets.

**RAG ingestion**: the pipeline that makes documents searchable by AI. It reads a stored file, parses content, chunks it with construction-aware structure, embeds chunks, persists them in the RAG database, and tracks sync status.

**Knowledge library**: a curated domain library covering Australian construction practice, contracts, cost management, program, procurement, NCC/AS references, and discipline-specific guidance. Knowledge library content should go through the same reliable ingestion model as project documents.

**Context assembly**: the process of gathering project workspace facts, RAG excerpts, knowledge library excerpts, and cross-module insights for an AI task. `assembleContext()` is intended to become the single external interface for this behavior.

## Architectural Direction

The codebase should prefer deep modules around stable product concepts:

- project workspace writes go through application actions
- database table objects come from the PostgreSQL schema surface
- communication artifacts share one lifecycle module where behavior is common
- RAG ingestion owns queueing and sync status transitions for all AI-searchable documents
- AI consumers receive context through `assembleContext()`

