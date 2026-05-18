# Implementation Plan: TRR Report

**Branch**: `012-trr-report` | **Date**: 2025-12-13 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/012-trr-report/spec.md`

## Summary

Implement a TRR (Tender Recommendation Report) section in the Procurement module, positioned directly below the Evaluation section. The feature aggregates data from Planning Card, RFT, Addendum, and Evaluation reports into a professional document with editable narrative sections (Executive Summary, Clarifications, Recommendation) and export to PDF/Word.

## Technical Context

**Language/Version**: TypeScript 5.x with Next.js 15 (App Router)
**Primary Dependencies**:
- FortuneSheet (@fortune-sheet/react) - for read-only evaluation table display
- Drizzle ORM - database operations
- TipTap or existing rich text editor - for editable narrative sections
- pdf-enhanced.ts / docx-enhanced.ts - export utilities
**Storage**: SQLite (assemble.db) via Drizzle ORM
**Testing**: Manual testing (no automated test framework specified)
**Target Platform**: Web (desktop-first, responsive)
**Project Type**: Web application (existing Next.js monolith)
**Performance Goals**:
- Report load < 2 seconds
- Export generation < 5 seconds
**Constraints**:
- SHORT tab is MVP; LONG tab shows placeholder for future RAG implementation
- Per-firm RFT date override via calendar picker
**Scale/Scope**: Single project at a time, one TRR per discipline/trade

## Constitution Check

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Intelligent Document Repository | PASS | Integrates with transmittal system for attachments |
| II. Domain-First Intelligence | PASS | TRR is core tender recommendation workflow |
| III. AI-Powered Automation | N/A | LONG tab (RAG) reserved for future |
| IV. Financial Visibility | PASS | Displays evaluation pricing data |
| V. Small Firm Optimization | PASS | Aggregates data - reduces manual work |
| VI. Sharp, Actionable Outputs | PASS | Export to PDF/Word for client distribution |
| VII. Integration Over Isolation | PASS | Aggregates from RFT, Addendum, Evaluation |
| VIII. Test-Driven Quality | N/A | Manual testing per spec |
| IX. Spreadsheet-Native UX | PASS | Evaluation tables displayed in read-only FortuneSheet |

## Project Structure

### Documentation (this feature)

```text
specs/012-trr-report/
├── plan.md              # This file
├── spec.md              # Feature specification
└── tasks.md             # Implementation tasks
```

### Source Code (additions to existing structure)

```text
src/
├── app/
│   └── api/
│       └── trr/
│           ├── route.ts                    # GET (get-or-create)
│           └── [id]/
│               ├── route.ts                # PUT update
│               ├── export/
│               │   └── route.ts            # POST export PDF/Word
│               └── transmittal/
│                   └── route.ts            # GET/POST transmittal
├── components/
│   └── trr/
│       ├── TRRSection.tsx                  # Main collapsible section
│       ├── TRRShortTab.tsx                 # SHORT tab content
│       ├── TRRLongTab.tsx                  # LONG tab placeholder
│       ├── TRRHeaderTable.tsx              # Header table component
│       ├── TRRTenderProcessTable.tsx       # Firms table with dates
│       ├── TRRAddendumTable.tsx            # Addenda listing
│       ├── TRREvaluationPrice.tsx          # Read-only evaluation display
│       ├── TRREditableSection.tsx          # Rich text editor wrapper
│       ├── TRRAttachments.tsx              # Attachments table
│       └── index.ts                        # Barrel export
├── lib/
│   ├── db/
│   │   └── schema.ts                       # Add trr, trr_transmittals tables
│   └── hooks/
│       └── use-trr.ts                      # React hook for TRR data

drizzle/
├── 0022_trr.sql                            # Migration for trr tables
└── 0023_rft_addendum_dates.sql             # Migration for date fields
```

## Implementation Phases

### Phase 1: Setup

- Database migrations for trr, trr_transmittals tables
- Add rft_date to rft_new, addendum_date to addenda
- Component directory structure

### Phase 2: Foundational

- API routes for TRR CRUD and transmittal
- React hook for data management
- Type definitions

### Phase 3: MVP - User Stories 1, 2, 3 (Priority: P1)

- TRR section with collapsible UI
- Header Table with project info
- Editable sections (Executive Summary, Clarifications, Recommendation)
- Tender Process table with firms and dates
- Addendum table
- Evaluation Price display (read-only)

### Phase 4: User Story 4 - Export (Priority: P1)

- PDF export with all sections
- Word export with editable structure

### Phase 5: User Story 5 - Transmittal (Priority: P2)

- Save/Load Transmittal integration
- Attachments table display

### Phase 6: User Story 6 - Tabs (Priority: P2)

- SHORT/LONG tab switcher
- LONG tab placeholder

### Phase 7: Polish

- Final styling, error handling, QA
