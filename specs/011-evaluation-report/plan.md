# Implementation Plan: Evaluation Report

**Branch**: `011-evaluation-report` | **Date**: 2025-12-12 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/011-evaluation-report/spec.md`

## Summary

Implement a new EVALUATION report section in the Procurement module, positioned directly below the Addendum section. The feature provides two FortuneSheet-based tables (Initial Price, Adds & Subs) for side-by-side comparison of short-listed firm pricing proposals, with AI-powered document parsing for automatic tender data extraction.

## Technical Context

**Language/Version**: TypeScript 5.x with Next.js 15 (App Router)
**Primary Dependencies**:
- FortuneSheet (@fortune-sheet/react) - spreadsheet component
- Drizzle ORM - database operations
- Anthropic Claude API - document parsing (via existing RAG infrastructure)
- react-pdf or pdf-parse - PDF text extraction
**Storage**: SQLite (assemble.db) via Drizzle ORM
**Testing**: Manual testing (no automated test framework specified)
**Target Platform**: Web (desktop-first, responsive)
**Project Type**: Web application (existing Next.js monolith)
**Performance Goals**:
- Table render < 2 seconds
- Calculation updates < 100ms
- Bulk parsing of 5 PDFs < 30 seconds
**Constraints**:
- Maximum 6 firms for side-by-side display (horizontal scroll beyond)
- PDF parsing timeout: 60 seconds per document
**Scale/Scope**: Single project at a time, 1-6 short-listed firms per discipline/trade

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Intelligent Document Repository | PASS | PDF upload integrates with existing category structure (Consultant/Discipline, Contractor/Trade) |
| II. Domain-First Intelligence | PASS | Tender evaluation is core construction workflow; uses industry terminology |
| III. AI-Powered Automation | PASS | AI extracts pricing from tender PDFs; reduces manual data entry |
| IV. Financial Visibility | PASS | Real-time cost comparison with automatic calculations |
| V. Small Firm Optimization | PASS | Simple drag-and-drop workflow; no training required |
| VI. Sharp, Actionable Outputs | PASS | Side-by-side comparison with clear totals enables quick decisions |
| VII. Integration Over Isolation | PASS | Uses existing document repository; exports to PDF/Word/Excel |
| VIII. Test-Driven Quality | N/A | Manual testing per spec; no automated tests requested |
| IX. Spreadsheet-Native UX | PASS | FortuneSheet provides Excel-like experience for financial data |

## Project Structure

### Documentation (this feature)

```text
specs/011-evaluation-report/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── contracts/           # Phase 1 output (API routes)
│   └── evaluation-api.yaml
└── tasks.md             # Phase 2 output
```

### Source Code (additions to existing structure)

```text
src/
├── app/
│   └── api/
│       └── evaluation/
│           ├── [projectId]/
│           │   ├── [contextType]/
│           │   │   └── [contextId]/
│           │   │       ├── route.ts          # GET/PUT evaluation data
│           │   │       └── parse/
│           │   │           └── route.ts      # POST - parse single PDF
│           │   └── bulk-parse/
│           │       └── route.ts              # POST - parse all PDFs
├── components/
│   └── evaluation/
│       ├── EvaluationSection.tsx             # Main collapsible section
│       ├── EvaluationPriceTab.tsx            # PRICE tab with FortuneSheet tables
│       ├── EvaluationNonPriceTab.tsx         # NON-PRICE placeholder tab
│       ├── EvaluationSheet.tsx               # FortuneSheet wrapper for evaluation
│       ├── EvaluationDropZone.tsx            # PDF drop zone per firm column
│       ├── BulkEvaluateModal.tsx             # Progress modal for bulk parsing
│       └── index.ts                          # Barrel export
├── lib/
│   ├── db/
│   │   └── schema.ts                         # Add evaluation tables
│   ├── hooks/
│   │   └── use-evaluation.ts                 # React hook for evaluation data
│   └── services/
│       └── tender-parser.ts                  # AI-powered PDF parsing service

drizzle/
└── 0020_evaluation.sql                       # Migration for evaluation tables
```

**Structure Decision**: Extends existing Next.js App Router structure. Components follow established patterns (RFTNewSection, AddendumSection). Database extends existing Drizzle schema.

## Complexity Tracking

> No violations. Feature follows established patterns and constitution principles.

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| None | N/A | N/A |

## Implementation Phases

### Phase 0: Research (Complete)

See [research.md](./research.md) for:
- FortuneSheet dynamic column configuration patterns
- PDF parsing approach (Claude API vs. local extraction)
- Firm identification algorithm for bulk parsing

### Phase 1: Design

See [data-model.md](./data-model.md) for:
- Database schema (evaluations, evaluation_rows, evaluation_cells)
- Entity relationships

See [contracts/evaluation-api.yaml](./contracts/evaluation-api.yaml) for:
- API endpoint specifications

### Phase 2: Implementation

See [tasks.md](./tasks.md) for:
- Prioritized task list organized by user story
- Dependency graph
- Parallel execution opportunities
