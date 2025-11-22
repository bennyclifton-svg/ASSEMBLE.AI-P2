# Implementation Plan: Planning Card

**Branch**: `003-planning-card` | **Date**: 2025-11-22 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/003-planning-card/spec.md`

## Summary

Implement a comprehensive Planning Card with 7 sections (Details, Objectives, Staging, Risk, Stakeholders, Consultant List, Contractor List) featuring inline editing with auto-save, AI-assisted field filling, smart defaults from GIS APIs, interactive timeline visualization, and PDF export. The Planning Card integrates with Consultant and Contractor Cards through dynamic tab management.

## Technical Context

**Language/Version**: TypeScript 5+ (Next.js 16)
**Primary Dependencies**: 
- `drizzle-orm` (existing - database ORM)
- `better-sqlite3` (existing - database)
- `react-hook-form` (new - form state management)
- `zod` (new - validation)
- `jspdf` (existing - PDF generation)
- `@dnd-kit/core` (existing - drag interactions for timeline)
- AI SDK (new - for AI-assisted suggestions)
- GIS API client (new - for address-based auto-fill)

**Storage**: SQLite database (existing) with new tables for Planning Card entities
**Testing**: Manual verification (no test runner configured)
**Target Platform**: Web (Desktop focus)
**Project Type**: Web application
**Performance Goals**: 
- Field save < 500ms
- AI suggestions < 3s
- GIS lookup < 2s
- PDF generation < 5s
- Timeline interactions 60fps (16ms)

**Constraints**: 
- Must integrate with existing Consultant/Contractor Cards
- Must support offline editing with sync queue
- Must handle concurrent edits gracefully

**Scale/Scope**: 
- 12 new database entities
- 50+ functional requirements
- 10 user stories across 4 priority levels

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **[Pass] Domain-First Intelligence**: Planning Card is construction-specific with fields like Zoning, Jurisdiction, Building Class, and construction stages (Scheme Design, Detail Design, etc.).
- **[Pass] AI-Powered Automation**: AI-assisted field filling for Objectives, Staging, and Risk based on project context.
- **[Pass] Small Firm Optimization**: Inline editing and auto-save reduce friction; AI assistance helps small teams work efficiently.
- **[Pass] Integration Over Isolation**: Integrates with existing Consultant/Contractor Cards; uses GIS APIs for public data.
- **[N/A] Spreadsheet-Native UX**: Not a data grid feature.
- **[N/A] Financial Visibility**: Planning Card focuses on project setup, not cost tracking.

## Project Structure

### Documentation (this feature)

```text
specs/003-planning-card/
├── plan.md              # This file
├── spec.md              # Feature specification
├── research.md          # Phase 0 output (to be created)
├── data-model.md        # Phase 1 output (to be created)
├── quickstart.md        # Phase 1 output (to be created)
├── contracts/           # Phase 1 output (to be created)
│   ├── planning.yaml    # Planning Card CRUD API
│   ├── consultants.yaml # Consultant management API
│   └── contractors.yaml # Contractor management API
└── checklists/
    └── requirements.md  # Specification validation
```

### Source Code (repository root)

```text
src/
├── components/
│   ├── dashboard/
│   │   ├── PlanningCard.tsx           # [MODIFY] Replace placeholder with full implementation
│   │   ├── ConsultantCard.tsx         # [MODIFY] Add dynamic tab management
│   │   ├── ContractorCard.tsx         # [MODIFY] Add dynamic tab management
│   │   └── planning/                  # [NEW] Planning Card sub-components
│   │       ├── DetailsSection.tsx     # Details fields with inline editing
│   │       ├── ObjectivesSection.tsx  # Objectives with AI suggest
│   │       ├── StagingSection.tsx     # Interactive timeline
│   │       ├── RiskSection.tsx        # Risk list with AI suggest
│   │       ├── StakeholdersSection.tsx
│   │       ├── ConsultantListSection.tsx  # Toggle list with status icons
│   │       ├── ContractorListSection.tsx  # Toggle list with status icons
│   │       ├── InlineEditField.tsx    # Reusable inline edit component
│   │       ├── AIAssistButton.tsx     # "Suggest" button component
│   │       └── TimelineGrid.tsx       # Drag-to-set timeline visualization
│   └── ui/
│       └── pdf-export-button.tsx      # [NEW] PDF export trigger
├── app/
│   └── api/
│       ├── planning/
│       │   ├── route.ts               # [NEW] GET/POST planning data
│       │   └── [id]/route.ts          # [NEW] GET/PUT/DELETE specific planning
│       ├── consultants/
│       │   └── disciplines/route.ts   # [NEW] GET/POST consultant disciplines
│       ├── contractors/
│       │   └── trades/route.ts        # [NEW] GET/POST contractor trades
│       ├── ai/
│       │   └── suggest/route.ts       # [NEW] AI suggestions endpoint
│       ├── gis/
│       │   └── lookup/route.ts        # [NEW] GIS data lookup
│       └── export/
│           └── pdf/route.ts           # [NEW] PDF generation
├── lib/
│   ├── hooks/
│   │   ├── use-inline-edit.ts         # [NEW] Inline editing with auto-save
│   │   ├── use-undo-history.ts        # [NEW] Undo/redo state management
│   │   └── use-planning-data.ts       # [NEW] Planning Card data fetching
│   ├── services/
│   │   ├── ai-service.ts              # [NEW] AI integration
│   │   ├── gis-service.ts             # [NEW] GIS API integration
│   │   └── pdf-service.ts             # [NEW] PDF generation logic
│   └── validations/
│       └── planning-schema.ts         # [NEW] Zod schemas for validation
└── drizzle/
    └── schema/
        └── planning.ts                # [NEW] Database schema for Planning Card
```

**Structure Decision**: Standard Next.js App Router structure with feature-based components. Planning Card sub-components are organized under `components/dashboard/planning/` for modularity.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| None | | |
