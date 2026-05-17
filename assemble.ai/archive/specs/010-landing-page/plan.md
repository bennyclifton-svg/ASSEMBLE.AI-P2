# Implementation Plan: Landing Page

**Branch**: `010-landing-page` | **Date**: 2024-12-08 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/010-landing-page/spec.md`

## Summary

Implement an authenticated landing page with 3-panel layout providing: (1) Project Register in left panel for project access, (2) User Profile & Default Settings in center panel, (3) Knowledge Libraries in right panel reusing DocumentRepository components. Authentication uses email/password with session management and rate limiting.

## Technical Context

**Language/Version**: TypeScript 5.x, React 19.2.0, Next.js 16.0.3
**Primary Dependencies**: better-sqlite3, drizzle-orm, react-resizable-panels, zod, react-hook-form
**Storage**: SQLite (better-sqlite3) for core data, PostgreSQL + pgvector for RAG embeddings
**Testing**: Jest + React Testing Library
**Target Platform**: Web (Next.js App Router), deployed to Vercel/Railway
**Project Type**: Web application (monorepo with frontend + API routes)
**Performance Goals**: Login <3s, project list render <1s (50 projects), file upload <10s (50MB)
**Constraints**: Single-tenant, single-role system; reuse existing DocumentRepository patterns
**Scale/Scope**: 50+ projects per organization, 100 documents per library, 10-50 concurrent users

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| **I. Intelligent Document Repository** | ✅ PASS | Knowledge Libraries extend document repository pattern with same UX |
| **II. Domain-First Intelligence** | ✅ PASS | Library types (Industrial, House, etc.) are construction-specific |
| **III. AI-Powered Automation** | ✅ PASS | Sync to AI integrates with existing RAG pipeline |
| **IV. Financial Visibility** | ⚪ N/A | Landing page doesn't directly handle financial data |
| **V. Small Firm Optimization** | ✅ PASS | Simple login, single-role, minimal configuration |
| **VI. Sharp, Actionable Outputs** | ⚪ N/A | No content generation in this feature |
| **VII. Integration Over Isolation** | ✅ PASS | Reuses existing components, standard auth patterns |
| **VIII. Test-Driven Quality** | ✅ PASS | Auth and project list require testing |
| **IX. Spreadsheet-Native UX** | ⚪ N/A | No financial data grids in landing page |

**Gate Result**: PASS - No violations requiring justification.

## Project Structure

### Documentation (this feature)

```text
specs/010-landing-page/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output (API contracts)
└── tasks.md             # Phase 2 output (via /speckit.tasks)
```

### Source Code (repository root)

```text
src/
├── app/
│   ├── (auth)/                    # Auth route group (unauthenticated)
│   │   ├── login/page.tsx         # Login page
│   │   └── register/page.tsx      # Registration page
│   ├── (dashboard)/               # Dashboard route group (authenticated)
│   │   └── page.tsx               # Landing page (3-panel)
│   └── api/
│       ├── auth/
│       │   ├── login/route.ts     # POST /api/auth/login
│       │   ├── register/route.ts  # POST /api/auth/register
│       │   ├── logout/route.ts    # POST /api/auth/logout
│       │   └── me/route.ts        # GET /api/auth/me
│       ├── users/
│       │   └── me/route.ts        # PATCH /api/users/me (profile update)
│       └── libraries/
│           ├── route.ts           # GET /api/libraries
│           └── [type]/
│               ├── documents/route.ts  # GET, POST /api/libraries/[type]/documents
│               └── sync/route.ts       # POST /api/libraries/[type]/sync
├── components/
│   ├── auth/
│   │   ├── LoginForm.tsx
│   │   ├── RegisterForm.tsx
│   │   └── AuthGuard.tsx          # HOC for protected routes
│   ├── dashboard/
│   │   ├── LandingLayout.tsx      # 3-panel layout for landing page
│   │   ├── ProjectRegister.tsx    # Left panel - project list
│   │   └── SettingsPanel.tsx      # Center panel - profile & defaults
│   └── libraries/
│       ├── KnowledgeLibraryRepository.tsx  # Right panel (fork of DocumentRepository)
│       ├── LibraryUploadTiles.tsx          # Fork of CategoryUploadTiles
│       └── LibraryDocumentList.tsx         # Fork of CategorizedList
├── lib/
│   ├── auth/
│   │   ├── session.ts             # Session management utilities
│   │   ├── password.ts            # Password hashing (bcrypt or similar)
│   │   └── rate-limit.ts          # Login rate limiting
│   ├── db/
│   │   └── schema.ts              # Add users, sessions, libraries tables
│   └── constants/
│       └── libraries.ts           # KNOWLEDGE_LIBRARY_TYPES constant
└── middleware.ts                  # Auth middleware for protected routes

tests/
├── unit/
│   ├── auth/
│   │   ├── password.test.ts
│   │   └── rate-limit.test.ts
│   └── libraries/
│       └── library-types.test.ts
└── integration/
    ├── auth/
    │   ├── login.test.ts
    │   └── register.test.ts
    └── libraries/
        └── upload.test.ts
```

**Structure Decision**: Web application structure using Next.js App Router with route groups for auth separation. New components in `components/auth/`, `components/dashboard/`, and `components/libraries/` directories. Extends existing `lib/db/schema.ts` with auth tables.

## Complexity Tracking

> No violations requiring justification - all gates passed.

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| *None* | — | — |
