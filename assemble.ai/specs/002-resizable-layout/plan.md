# Implementation Plan: Resizable Three-Column Layout

**Branch**: `002-resizable-layout` | **Date**: 2025-11-22 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/002-resizable-layout/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

Implement a 3-column dashboard layout (Planning, Consultant, Document) with drag-to-resize functionality using `react-resizable-panels`. Include a Project Switcher in the header. Column widths persist for the session only.

## Technical Context

**Language/Version**: TypeScript 5+ (Next.js 16)
**Primary Dependencies**: `react-resizable-panels`, `@radix-ui/react-dropdown-menu` (or shadcn/ui equivalent), `lucide-react`
**Storage**: React State (Session persistence only)
**Testing**: Manual verification (no test runner configured)
**Target Platform**: Web (Desktop focus)
**Project Type**: Web application
**Performance Goals**: Resize < 16ms (60fps), Switch project < 1s
**Constraints**: Minimum column widths to prevent inaccessibility
**Scale/Scope**: 3 fixed columns, N projects

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **[Pass] Domain-First Intelligence**: Layout is specifically designed for the construction workflow (Planning/Consultant/Document context).
- **[Pass] Small Firm Optimization**: Simple session-based persistence avoids complex user settings management.
- **[Pass] Integration Over Isolation**: Uses standard UI libraries (`react-resizable-panels`) and patterns.
- **[N/A] Spreadsheet-Native UX**: Not a data grid feature.

## Project Structure

### Documentation (this feature)

```text
specs/002-resizable-layout/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
└── tasks.md             # Phase 2 output
```

### Source Code (repository root)

```text
src/
├── components/
│   ├── layout/
│   │   └── ResizableLayout.tsx    # [NEW] Main layout component
│   ├── dashboard/
│   │   ├── ProjectSwitcher.tsx    # [NEW] Project selector
│   │   ├── PlanningCard.tsx       # [NEW] Placeholder
│   │   ├── ConsultantCard.tsx     # [NEW] Placeholder
│   │   └── DocumentCard.tsx       # [NEW] Placeholder
│   └── ui/
│       └── resizable.tsx          # [NEW] shadcn/ui wrapper for panels
├── app/
│   ├── api/
│   │   └── projects/
│   │       └── route.ts           # [NEW] Mock API for projects
│   └── page.tsx                   # [MODIFY] Implement layout
└── lib/
    └── hooks/
        └── use-layout-store.ts    # [NEW] Session state management
```

**Structure Decision**: Standard Next.js App Router structure with feature-based components in `src/components`.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| None | | |
