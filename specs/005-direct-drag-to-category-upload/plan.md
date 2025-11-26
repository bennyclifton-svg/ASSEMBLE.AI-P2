# Implementation Plan: Direct Drag-to-Category Upload

**Branch**: `005-direct-drag-to-category-upload` | **Date**: 2025-11-23 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/005-direct-drag-to-category-upload/spec.md`

**Note**: This plan follows the speckit.plan workflow. See `.specify/templates/plan-template.md` for the execution workflow.

## Summary

Enable users to drag files directly onto category and subcategory upload tiles for one-step upload and categorization. The feature includes a tile-based UI inspired by NotebookLM showing active categories in Row 1 with expandable subcategories in Row 2+, bulk re-categorization via multi-select + click, and visual feedback throughout. This eliminates the current two-step process (upload then categorize), reducing batch categorization time from ~45 seconds to ≤15 seconds.

**Technical Approach**: Extend existing `CategoryUploadTiles` component with enhanced drag-and-drop zones, integrate with existing bulk categorization API, filter tiles based on active Planning Card disciplines/trades, and add visual feedback using existing toast and animation patterns.

## Technical Context

**Language/Version**: TypeScript 5.x with Next.js 16.0.3
**Primary Dependencies**: React 19.2, @dnd-kit/core ^6.3.1, react-dropzone ^14.3.8, Drizzle ORM ^0.44.7, Radix UI components
**Storage**: SQLite with better-sqlite3 ^12.4.5 (categories, subcategories, documents, file_assets, versions tables)
**Testing**: Jest/React Testing Library (inferred from Next.js setup, to be confirmed in research phase)
**Target Platform**: Modern web browsers (Chrome, Firefox, Safari, Edge - ES2022+)
**Project Type**: Web (Next.js App Router with Server Components + Client Components)
**Performance Goals**:
- Upload and categorize 50 files in ≤12 seconds (SC-001)
- Tile hover response <100ms for visual feedback
- Category filter updates <200ms when Planning Card changes
- Toast notifications appear within 500ms of drop completion

**Constraints**:
- File size limit: 20MB per file (existing constraint from spec)
- Must maintain backward compatibility with existing upload zone (FR-002)
- No breaking changes to existing DocumentRepository component
- Visual consistency with existing VS Code-inspired dark theme
- Container queries for responsive tile layout

**Scale/Scope**:
- 6-15 active categories per project (based on Planning Card)
- Up to 20 subcategories per expandable category (Consultants/Contractors)
- 100+ documents per project
- Batch uploads of 40-50 files typical use case

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### Principle I: Intelligent Document Repository ✅
**Compliance**: PASS
- FR-001: Category tiles accept drag-and-drop for multiple files
- Maintains existing version control (automatic V1, V2 detection)
- Builds on existing repository as source of truth
- **Action**: None required

### Principle II: Domain-First Intelligence ✅
**Compliance**: PASS
- Uses construction-specific categories (Consultants/Contractors/Scheme Design/Detail Design)
- Integrates with Planning Card disciplines and trades
- Reduces construction-specific tender preparation work (batch categorization)
- **Action**: None required

### Principle III: AI-Powered Automation ⚠️
**Compliance**: DEFERRED (Not applicable to this feature)
- This feature focuses on UX improvement for manual categorization
- Future enhancement: AI-suggested categories based on file content/OCR
- **Action**: Document as future enhancement opportunity in research.md

### Principle IV: Financial Visibility Throughout Lifecycle ✅
**Compliance**: N/A (Not financial feature)
- No impact on cost tracking workflows
- **Action**: None required

### Principle V: Small Firm Optimization ✅
**Compliance**: PASS
- Reduces time from 45s → 15s per batch (huge productivity gain)
- Simple, intuitive drag-and-drop interaction
- No training required (familiar pattern)
- **Action**: None required

### Principle VI: Sharp, Actionable Outputs ✅
**Compliance**: PASS
- Clear visual feedback (tile highlights, toast notifications)
- Immediate categorization (no ambiguity)
- **Action**: None required

### Principle VII: Integration Over Isolation ✅
**Compliance**: PASS
- Extends existing upload system (doesn't replace)
- Works with existing file formats and storage
- **Action**: None required

### Principle VIII: Test-Driven Quality ⚠️
**Compliance**: REQUIRES ATTENTION
- Must add tests for drag-and-drop interactions
- Must test category filtering logic
- Must test bulk categorization flow
- **Action**: Add comprehensive test plan in research.md

### Principle IX: Spreadsheet-Native UX ✅
**Compliance**: N/A (Not data-grid feature)
- Document repository uses table layout, but not financial/spreadsheet context
- **Action**: None required

**GATE RESULT**: ✅ PASS with 2 action items
- Document future AI enhancement opportunity
- Create comprehensive test plan

## Project Structure

### Documentation (this feature)

```text
specs/005-direct-drag-to-category-upload/
├── plan.md              # This file
├── research.md          # Phase 0 output (technical decisions)
├── data-model.md        # Phase 1 output (entities/relationships)
├── quickstart.md        # Phase 1 output (developer guide)
├── contracts/           # Phase 1 output (API contracts)
│   └── bulk-categorize.openapi.yaml
└── tasks.md             # Phase 2 output (NOT created by this plan)
```

### Source Code (repository root)

```text
assemble.ai/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── documents/
│   │   │   │   ├── route.ts                    # [MODIFY] Document upload endpoint
│   │   │   │   └── bulk-categorize/
│   │   │   │       └── route.ts                # [EXISTING] Bulk categorization API
│   │   │   └── categories/
│   │   │       └── active/
│   │   │           └── route.ts                # [NEW] Get active categories for project
│   │   └── page.tsx                            # [EXISTING] Main dashboard
│   │
│   ├── components/
│   │   ├── documents/
│   │   │   ├── DocumentRepository.tsx          # [MODIFY] Main container
│   │   │   ├── CategoryUploadTiles.tsx         # [MODIFY] Enhanced tile component
│   │   │   ├── CategoryTile.tsx                # [NEW] Individual tile with drop zone
│   │   │   ├── UploadZone.tsx                  # [EXISTING] Main upload zone
│   │   │   └── CategorizedList.tsx             # [EXISTING] Document list
│   │   │
│   │   └── ui/
│   │       ├── toast.tsx                       # [EXISTING] Toast notifications
│   │       └── use-toast.ts                    # [EXISTING] Toast hook
│   │
│   └── lib/
│       ├── constants/
│       │   ├── categories.ts                   # [EXISTING] Category definitions
│       │   └── disciplines.ts                  # [EXISTING] Consultant disciplines
│       │
│       ├── hooks/
│       │   ├── use-active-categories.ts        # [NEW] Filter categories by project
│       │   ├── use-consultant-disciplines.ts   # [EXISTING] Consultant data
│       │   └── use-contractor-trades.ts        # [EXISTING] Contractor data
│       │
│       └── db/
│           └── schema.ts                       # [EXISTING] Database schema
│
└── tests/                                      # [NEW DIRECTORY]
    ├── components/
    │   └── documents/
    │       ├── CategoryTile.test.tsx           # [NEW] Tile interaction tests
    │       └── CategoryUploadTiles.test.tsx    # [NEW] Tile layout tests
    │
    └── integration/
        └── drag-to-category.test.tsx           # [NEW] E2E drag-drop flow
```

**Structure Decision**: Using Next.js App Router structure with Server Components for API routes and Client Components for interactive UI. The existing `src/` structure is maintained. New components follow the established pattern under `src/components/documents/`. Tests will be added in a new `tests/` directory at the project root, organized by test type (unit/integration).

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

No violations requiring justification. All constitution checks passed or were not applicable to this feature.
