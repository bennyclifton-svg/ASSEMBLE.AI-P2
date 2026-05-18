# Implementation Plan: Intelligent Document Repository

**Branch**: `001-document-repo` | **Date**: 2025-11-22 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/001-document-repo/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

Implement the **Intelligent Document Repository** as the foundational layer of `assemble.ai`. This feature enables users to ingest, organize, and manage construction documents (PDFs, CAD, Excel, Word files, image files) with domain-specific categorization and automatic version control.

**Key Capabilities:**
- **Bulk Ingestion**: Drag-and-drop interface for multiple files (up to 20MB/file).
- **Auto-Versioning**: Intelligent detection of version patterns (V1 -> V2) to stack files.
- **User-Driven Categorization**: Users can drag-and-drop documents into predefined categories (e.g., Planning, Scheme Design, Detail Design). The system will also provide options to evaluate alternative categories, select the most appropriate one, or create new categories/subcategories on the fly, ensuring the user maintains full control over classification.
- **Consultant/Contractor Subcategories**: Granular tracking of disciplines (e.g., Structural, Plumbing).
- **Categorized List View**: High-density, grouped list view for efficient navigation.
- **File Deletion**: Users can delete individual files or entire document stacks, with appropriate confirmation prompts and access controls.

## Technical Context

<!--
  ACTION REQUIRED: Replace the content in this section with the technical details
  for the project. The structure here is presented in advisory capacity to guide
  the iteration process.
-->

**Language/Version**: TypeScript 5.x (Node.js 20+)
**Primary Dependencies**: 
- Framework: Next.js 14+ (App Router)
- Database: SQLite (via `better-sqlite3` or `drizzle-orm`) for metadata
- UI: React, Vanilla CSS (Variables/Modules)
- File Handling: `react-dropzone` or similar
**Storage**: Local Filesystem (initially) with path abstraction for future Cloud support.
**Testing**: Vitest (Unit), Playwright (E2E)
**Target Platform**: Web Application (Localhost initially, deployable to Vercel/Docker)
**Project Type**: Web Application
**Performance Goals**: 
- List render < 1s for 100 items.
- Upload processing < 30s for 100MB.
**Constraints**: 
- 20MB file size limit.
- Offline-capable (local first preference).
**Scale/Scope**: 
- ~100-500 documents per project.
- Single user focus initially (Small Firm Optimization).

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **[I] Intelligent Document Repository**: This plan directly implements Principle I.
- **[II] Domain-First Intelligence**: Enforces strict construction categories (Planning, Procurement, etc.) and subcategories.
- **[IV] Small Firm Optimization**: "Drag-and-drop" and "Auto-versioning" reduce manual admin work.
- **[IX] Spreadsheet-Native UX**: Prepares for this by ensuring Excel files are handled with "FortuneSheet" compatible structures (FR-008).
- **[VII] Test-Driven Quality**: Includes Vitest/Playwright in stack.

## Project Structure

### Documentation (this feature)

```text
specs/001-document-repo/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
{{ ... }}
  real paths (e.g., apps/admin, packages/something). The delivered plan must
  not include Option labels.
-->

```text
# Option 2: Web application (Next.js Structure)
src/
├── app/                 # Next.js App Router
│   ├── (dashboard)/     # Layout for main app
│   │   ├── documents/   # Document Repo Page
│   │   └── page.tsx     # Dashboard Home
│   ├── api/             # API Routes
│   │   └── documents/   # Document Management API
│   └── layout.tsx       # Root Layout
├── components/          # Shared Components
│   ├── documents/       # Feature-specific components (UploadZone, DocList)
│   └── ui/              # Generic UI (Buttons, Inputs)
├── lib/                 # Utilities
│   ├── db/              # Database connection/schema
│   ├── storage/         # File storage abstraction
│   ├── versioning.ts    # Auto-versioning logic
├── types/               # TypeScript definitions
└── styles/              # Global styles / CSS Modules
```

**Structure Decision**: Standard Next.js App Router structure for simplicity and performance. Keeps feature logic (`components/documents`) collocated while sharing core UI elements.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| None | | |
