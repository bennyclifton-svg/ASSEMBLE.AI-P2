# Implementation Plan: Default Financial Data Initialization

**Branch**: `009-default-financial-data` | **Date**: 2025-12-06 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/009-default-financial-data/spec.md`

## Summary

When a new project is created, initialize default financial data including 20 cost line items (across FEES, CONSULTANTS, CONSTRUCTION, CONTINGENCY sections with $900,000 total default budget), one sample variation, and one sample invoice. This extends the existing project initialization transaction in `POST /api/projects/route.ts`. Additionally, rename the section enum from `PC_ITEMS` to `CONSTRUCTION` across all affected files.

## Technical Context

**Language/Version**: TypeScript 5.x / Next.js 14.x
**Primary Dependencies**: Drizzle ORM, better-sqlite3, React
**Storage**: SQLite (local database via better-sqlite3)
**Testing**: Jest, React Testing Library
**Target Platform**: Web (Next.js App Router)
**Project Type**: Web application (Next.js full-stack)
**Performance Goals**: Project creation with 20+ cost lines in <2 seconds
**Constraints**: Synchronous transaction (better-sqlite3), atomic operation
**Scale/Scope**: 20 default cost lines, 1 variation, 1 invoice per project

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Intelligent Document Repository | N/A | This feature is about cost data, not documents |
| II. Domain-First Intelligence | ✅ PASS | Uses construction-specific terminology (FEES, CONSULTANTS, CONSTRUCTION, CONTINGENCY) |
| III. AI-Powered Automation | ✅ PASS | Automates tedious manual setup of cost structures |
| IV. Financial Visibility Throughout Lifecycle | ✅ PASS | Provides default budget framework from project inception |
| V. Small Firm Optimization | ✅ PASS | Reduces setup time, enables immediate productivity |
| VI. Sharp, Actionable Outputs | ✅ PASS | Nominal amounts are realistic placeholders, not zeros |
| VII. Integration Over Isolation | N/A | No external integrations required |
| VIII. Test-Driven Quality | ✅ PASS | Will include unit tests for initialization logic |
| IX. Spreadsheet-Native UX | ✅ PASS | Data integrates with existing FortuneSheet-based cost plan UI |

**Gate Status**: ✅ PASSED - No violations

## Project Structure

### Documentation (this feature)

```text
specs/009-default-financial-data/
├── spec.md              # Feature specification (complete)
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
│   └── cost-lines.yaml  # API contract for cost line initialization
├── checklists/
│   └── requirements.md  # Spec validation checklist (complete)
└── tasks.md             # Phase 2 output (created by /speckit.tasks)
```

### Source Code (repository root)

```text
src/
├── lib/
│   ├── constants/
│   │   └── default-cost-lines.ts    # NEW: Default cost line templates
│   └── db/
│       └── schema.ts                 # MODIFIED: PC_ITEMS → CONSTRUCTION enum
├── app/
│   └── api/
│       └── projects/
│           └── route.ts              # MODIFIED: Add cost line initialization
├── types/
│   └── cost-plan.ts                  # MODIFIED: Update section type
└── components/
    └── cost-plan/
        └── *.tsx                     # MODIFIED: Update section references

scripts/
└── run-migration-0011.js             # NEW: Migration for PC_ITEMS → CONSTRUCTION

drizzle/
└── 0011_default_financial_data.sql   # NEW: Migration script

tests/
├── unit/
│   └── default-cost-lines.test.ts   # NEW: Unit tests for constants
└── integration/
    └── project-initialization.test.ts # NEW: Integration test for full init
```

**Structure Decision**: Extends existing Next.js App Router structure. New constants file for default data, migration for enum rename, extended project creation route.

## Complexity Tracking

> No violations to justify - implementation follows existing patterns.

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| (none) | - | - |

## Implementation Phases

### Phase 0: Research (Complete)
- Existing project initialization pattern understood from 008-project-initialization
- better-sqlite3 synchronous transaction pattern confirmed
- PC_ITEMS → CONSTRUCTION rename scope identified (12 files)

### Phase 1: Design
- Data model for default cost lines
- API contract extension for project creation
- Migration script for enum rename

### Phase 2: Tasks (via /speckit.tasks)
- Implementation tasks broken down by priority
