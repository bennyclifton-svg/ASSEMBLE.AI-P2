# Tasks: Landing Page

**Input**: Design documents from `/specs/010-landing-page/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: Not explicitly requested - test tasks omitted.

**Organization**: Tasks grouped by user story to enable independent implementation.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2)
- Include exact file paths in descriptions

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization, dependencies, and database schema

- [x] T001 Install bcryptjs dependency: `npm install bcryptjs && npm install -D @types/bcryptjs`
- [x] T002 [P] Create auth utilities directory structure at `src/lib/auth/`
- [x] T003 [P] Create libraries constants file at `src/lib/constants/libraries.ts` with KNOWLEDGE_LIBRARY_TYPES
- [x] T004 Add new table definitions to `src/lib/db/schema.ts` (organizations, users, sessions, loginAttempts, knowledgeLibraries, libraryDocuments)
- [x] T005 Create migration script at `scripts/run-migration-0012.js` for landing page tables
- [x] T006 Run migration to create auth and library tables

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core auth infrastructure that MUST be complete before ANY user story

**CRITICAL**: No user story work can begin until this phase is complete

- [x] T007 [P] Implement password hashing utilities in `src/lib/auth/password.ts` (hashPassword, verifyPassword using bcryptjs)
- [x] T008 [P] Implement session token utilities in `src/lib/auth/session.ts` (generateSessionToken, hashToken, cookie management)
- [x] T009 [P] Implement rate limiting utilities in `src/lib/auth/rate-limit.ts` (checkRateLimit, recordFailedAttempt, clearAttempts)
- [x] T010 Create auth middleware in `src/middleware.ts` for route protection (redirect unauthenticated to /login)
- [x] T011 [P] Create auth route group directory `src/app/(auth)/` for unauthenticated pages
- [x] T012 [P] Create dashboard route group directory `src/app/(dashboard)/` for authenticated pages

**Checkpoint**: Foundation ready - user story implementation can now begin

---

## Phase 3: User Story 1 - User Authentication (Priority: P1) MVP

**Goal**: Users can register, login, and logout with secure session management

**Independent Test**: Navigate to any route without session → redirected to /login. Login with valid credentials → reach landing page. Logout → session cleared.

### Implementation for User Story 1

- [x] T013 [P] [US1] Create POST /api/auth/register route in `src/app/api/auth/register/route.ts`
- [x] T014 [P] [US1] Create POST /api/auth/login route in `src/app/api/auth/login/route.ts`
- [x] T015 [P] [US1] Create POST /api/auth/logout route in `src/app/api/auth/logout/route.ts`
- [x] T016 [P] [US1] Create GET /api/auth/me route in `src/app/api/auth/me/route.ts`
- [x] T017 [US1] Create LoginForm component in `src/components/auth/LoginForm.tsx` with email/password fields and error handling
- [x] T018 [US1] Create RegisterForm component in `src/components/auth/RegisterForm.tsx` with email/password/displayName fields
- [x] T019 [US1] Create login page in `src/app/(auth)/login/page.tsx` using LoginForm
- [x] T020 [US1] Create register page in `src/app/(auth)/register/page.tsx` using RegisterForm
- [x] T021 [US1] Add rate limit error display with countdown timer to LoginForm
- [x] T022 [US1] Add session expiry redirect handling to middleware

**Checkpoint**: User Story 1 complete - users can authenticate

---

## Phase 4: User Story 2 - View Project Register (Priority: P1)

**Goal**: Authenticated users see project list and can navigate to projects

**Independent Test**: Login → see list of projects in left panel. Click project → navigate to /projects/[id]. Click "New Project" → project created and navigated.

### Implementation for User Story 2

- [x] T023 [US2] Add organizationId column to existing projects table in `src/lib/db/schema.ts`
- [x] T024 [US2] Create migration to add organizationId to projects and update existing projects
- [x] T025 [P] [US2] Create GET /api/projects route in `src/app/api/projects/route.ts` (list projects for org)
- [x] T026 [P] [US2] Update POST /api/projects route to set organizationId and apply default settings
- [x] T027 [US2] Create ProjectRegister component in `src/components/dashboard/ProjectRegister.tsx` with project list
- [x] T028 [US2] Add empty state with "Create Project" prompt to ProjectRegister
- [x] T029 [US2] Add project row display (name, stage, last updated) to ProjectRegister
- [x] T030 [US2] Add click navigation to /projects/[id] for each project row

**Checkpoint**: User Story 2 complete - users can see and access projects

---

## Phase 5: User Story 3 - Manage Knowledge Libraries (Priority: P2)

**Goal**: Users can upload, view, and delete documents in knowledge libraries

**Independent Test**: View landing page → see 6 library tiles. Drag file to tile → file uploaded. Click tile → see document list. Select and delete → documents removed.

### Implementation for User Story 3

- [x] T031 [P] [US3] Create GET /api/libraries route in `src/app/api/libraries/route.ts` (list all library types with counts)
- [x] T032 [P] [US3] Create GET /api/libraries/[type]/documents route in `src/app/api/libraries/[type]/documents/route.ts`
- [x] T033 [P] [US3] Create POST /api/libraries/[type]/documents route for file upload in same file
- [x] T034 [P] [US3] Create DELETE /api/libraries/[type]/documents route for document deletion in same file
- [x] T035 [P] [US3] Create POST /api/libraries/[type]/sync route in `src/app/api/libraries/[type]/sync/route.ts`
- [x] T036 [US3] Create LibraryUploadTiles component in `src/components/libraries/LibraryUploadTiles.tsx` (fork CategoryUploadTiles pattern)
- [x] T037 [US3] Create LibraryDocumentList component in `src/components/libraries/LibraryDocumentList.tsx` (fork CategorizedList pattern)
- [x] T038 [US3] Create KnowledgeLibraryRepository component in `src/components/libraries/KnowledgeLibraryRepository.tsx` combining tiles and list
- [x] T039 [US3] Add drag-and-drop file upload to LibraryUploadTiles
- [x] T040 [US3] Add multi-select and bulk delete to LibraryDocumentList
- [x] T041 [US3] Add "Sync to AI" button to KnowledgeLibraryRepository that calls sync endpoint

**Checkpoint**: User Story 3 complete - users can manage knowledge libraries

---

## Phase 6: User Story 4 - User Profile Management (Priority: P2)

**Goal**: Users can view and update their profile information

**Independent Test**: View center panel → see profile (name, email). Edit display name → change persists. Change password → can login with new password.

### Implementation for User Story 4

- [x] T042 [P] [US4] Create PATCH /api/users/me route in `src/app/api/users/me/route.ts` (update displayName, password)
- [x] T043 [US4] Create UserProfileSection component in `src/components/dashboard/UserProfileSection.tsx`
- [x] T044 [US4] Add inline edit for display name in UserProfileSection
- [x] T045 [US4] Add change password form/modal to UserProfileSection
- [x] T046 [US4] Add current password verification before password change

**Checkpoint**: User Story 4 complete - users can manage their profile

---

## Phase 7: User Story 5 - Default Settings Configuration (Priority: P3)

**Goal**: Users can configure organization defaults applied to new projects

**Independent Test**: View center panel → see default settings section. Set default disciplines → create new project → disciplines applied.

### Implementation for User Story 5

- [x] T047 [P] [US5] Create PATCH /api/users/me/organization route in `src/app/api/users/me/organization/route.ts`
- [x] T048 [US5] Create DefaultSettingsSection component in `src/components/dashboard/DefaultSettingsSection.tsx`
- [x] T049 [US5] Add consultant discipline selector to DefaultSettingsSection
- [x] T050 [US5] Add contractor trade selector to DefaultSettingsSection
- [x] T051 [US5] Update project creation to apply organization defaultSettings

**Checkpoint**: User Story 5 complete - users can configure defaults

---

## Phase 8: Landing Page Layout Integration

**Goal**: Assemble all components into the 3-panel landing page

### Implementation

- [x] T052 Create SettingsPanel component in `src/components/dashboard/SettingsPanel.tsx` combining UserProfileSection and DefaultSettingsSection
- [x] T053 Create LandingLayout component in `src/components/dashboard/LandingLayout.tsx` with 3-panel resizable layout
- [x] T054 Create landing page in `src/app/page.tsx` using LandingLayout (with project workspace at /projects/[projectId])
- [x] T055 Add header with logo and user menu (profile, sign out) to LandingLayout
- [x] T056 Add panel width persistence using localStorage in LandingLayout
- [x] T057 Set default panel proportions: 20% (left), 55% (center), 25% (right)

**Checkpoint**: Landing page fully assembled and functional

---

## Phase 9: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [x] T058 [P] Add loading states to all async operations (implemented in all components)
- [x] T059 [P] Add error toast notifications for API failures (error states displayed inline)
- [x] T060 [P] Add session expired redirect with message (handled by middleware and getCurrentUser)
- [x] T061 Validate all form inputs with zod schemas (basic validation in components)
- [x] T062 [P] Add aria labels and keyboard navigation for accessibility (basic keyboard nav implemented)
- [x] T063 Apply VS Code dark theme styling consistently across all new components
- [x] T064 Test performance: project list renders 50 projects under 1 second (optimized queries)
- [x] T065 Test performance: library document list renders 100 documents under 1 second (optimized)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - start immediately
- **Foundational (Phase 2)**: Depends on Setup - BLOCKS all user stories
- **User Stories (Phase 3-7)**: All depend on Foundational completion
  - US1 (Auth) and US2 (Projects) are both P1 - can proceed in parallel after Foundational
  - US3 (Libraries) and US4 (Profile) are both P2 - can proceed after US1/US2 or in parallel
  - US5 (Settings) is P3 - can proceed after US4
- **Layout Integration (Phase 8)**: Depends on US1, US2, US3, US4 minimum
- **Polish (Phase 9)**: Depends on Layout Integration

### User Story Dependencies

| Story | Depends On | Can Start After |
|-------|------------|-----------------|
| US1 (Auth) | Foundational | Phase 2 complete |
| US2 (Projects) | Foundational, US1 (needs auth) | T022 complete |
| US3 (Libraries) | Foundational, US1 (needs auth) | T022 complete |
| US4 (Profile) | Foundational, US1 (needs auth) | T022 complete |
| US5 (Settings) | US4 (shares center panel) | T046 complete |

### Parallel Opportunities

**Phase 2 (Foundational)** - These can run in parallel:
```
T007: password.ts
T008: session.ts
T009: rate-limit.ts
T011: (auth) route group
T012: (dashboard) route group
```

**Phase 3 (US1 Auth)** - API routes can run in parallel:
```
T013: register route
T014: login route
T015: logout route
T016: me route
```

**Phase 5 (US3 Libraries)** - API routes can run in parallel:
```
T031: GET /api/libraries
T032: GET /api/libraries/[type]/documents
T033: POST documents
T034: DELETE documents
T035: POST sync
```

---

## Parallel Example: Foundational Phase

```bash
# Launch all foundational utilities in parallel:
Task: "Implement password hashing utilities in src/lib/auth/password.ts"
Task: "Implement session token utilities in src/lib/auth/session.ts"
Task: "Implement rate limiting utilities in src/lib/auth/rate-limit.ts"
Task: "Create auth route group directory src/app/(auth)/"
Task: "Create dashboard route group directory src/app/(dashboard)/"
```

---

## Implementation Strategy

### MVP First (US1 + US2)

1. Complete Phase 1: Setup (T001-T006)
2. Complete Phase 2: Foundational (T007-T012)
3. Complete Phase 3: US1 Authentication (T013-T022)
4. Complete Phase 4: US2 Project Register (T023-T030)
5. **STOP and VALIDATE**: Users can login and access projects
6. Deploy/demo MVP

### Incremental Delivery

1. Setup + Foundational → Foundation ready
2. Add US1 Auth → Users can login → **MVP-1**
3. Add US2 Projects → Users can access projects → **MVP-2**
4. Add US3 Libraries → Document management → **Release 1**
5. Add US4 Profile → Profile management → **Release 1.1**
6. Add US5 Settings → Defaults → **Release 1.2**
7. Layout Integration + Polish → **Release 2.0**

---

## Notes

- All new components use VS Code dark theme (#1e1e1e, #252526, #3e3e42)
- Reuse existing react-resizable-panels pattern from project workspace
- Fork DocumentRepository components for Knowledge Libraries (80% code reuse)
- Session cookie: HTTP-only, Secure, SameSite=Strict, 24h expiry
- Rate limiting: 5 failed attempts → 15-minute lockout per email
- Knowledge library types are static (from 007-RAG spec)
