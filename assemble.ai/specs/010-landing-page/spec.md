# Feature Specification: Landing Page

**Feature Branch**: `010-landing-page`
**Created**: 2024-12-08
**Status**: Draft
**Input**: User description: "Landing Page with Authentication, Project Register, and Knowledge Libraries using 3-panel layout. Right panel to be a replica of the document repository with Knowledge Library tiles (Industrial, House, Apartments, Fitout, Due Diligence, Remediation). Left panel to be project register with simple list. Middle panel for default settings and basic user profile system."

---

## Overview

The landing page serves as the authenticated entry point to assemble.ai, providing users with a consolidated view of their projects, organizational settings, and global knowledge libraries. It reuses the existing 3-panel layout paradigm for consistency while repurposing the DocumentRepository component pattern for Knowledge Library management.

### Panel Layout

| Panel | Width | Purpose | Implementation Strategy |
|-------|-------|---------|------------------------|
| **Left** | 20% | Project Register | Simple list component (new) |
| **Center** | 55% | Settings & User Profile | New settings component |
| **Right** | 25% | Knowledge Libraries | Reuse DocumentRepository with different tiles |

### Knowledge Library Types (from 007-RAG)

- Due Diligence
- House
- Apartments
- Fitout
- Industrial
- Remediation

---

## Clarifications

### Session 2024-12-08

- Q: Does the landing page need multiple user roles with different permissions? → A: Single-role system - all authenticated users have full access to all features.
- Q: Should the system implement rate limiting on login attempts? → A: Yes, 5 failed attempts triggers 15-minute lockout per email.
- Q: What document formats should Knowledge Libraries accept? → A: Match existing DocumentRepository: PDF, DOCX, XLSX, images (PNG, JPG), text files.

---

## User Scenarios & Testing

### User Story 1 - User Authentication (Priority: P1)

A user must authenticate before accessing the application. New users can register an account while existing users can sign in with email/password credentials.

**Why this priority**: Security is foundational - no features should be accessible without authentication. This is the entry point for all other functionality.

**Independent Test**: Can be fully tested by attempting to access the dashboard URL and verifying redirect to login. Delivers immediate security value.

**Acceptance Scenarios**:

1. **Given** an unauthenticated user, **When** they navigate to any application route, **Then** they are redirected to the login page.
2. **Given** a user on the login page, **When** they enter valid credentials and submit, **Then** they are authenticated and redirected to the landing page.
3. **Given** a user on the login page, **When** they enter invalid credentials, **Then** they see an error message and remain on the login page.
4. **Given** a new user, **When** they complete the registration form with valid details, **Then** a new account is created and they are logged in automatically.
5. **Given** an authenticated user, **When** they click "Sign Out", **Then** their session is terminated and they are redirected to the login page.

---

### User Story 2 - View Project Register (Priority: P1)

An authenticated user can view all their projects in a simple list format on the left panel. They can click a project to navigate to the project workspace.

**Why this priority**: Project access is the core function - users need to see and access their projects immediately after login.

**Independent Test**: Can be tested by logging in and verifying the project list displays with correct data. Clicking a project navigates to that project's workspace.

**Acceptance Scenarios**:

1. **Given** an authenticated user with projects, **When** they view the landing page, **Then** they see a list of all their projects in the left panel.
2. **Given** a project list, **When** the user clicks on a project row, **Then** they are navigated to that project's workspace (existing 3-panel layout).
3. **Given** a project in the list, **When** viewing the list, **Then** they see the project name and key summary fields (stage, last updated).
4. **Given** an authenticated user with no projects, **When** they view the landing page, **Then** they see an empty state with a "Create Project" prompt.
5. **Given** a user viewing the project list, **When** they click "New Project", **Then** a new project is created and they are navigated to it.

---

### User Story 3 - Manage Knowledge Libraries (Priority: P2)

An authenticated user can manage organization-wide knowledge libraries in the right panel. The interface mirrors the Document Repository pattern with tiles for each library type (Industrial, House, Apartments, etc.).

**Why this priority**: Knowledge libraries enable cross-project document reuse and enhance RAG capabilities, but projects can function without them initially.

**Independent Test**: Can be tested by uploading documents to a library tile and verifying they appear in the library's document list.

**Acceptance Scenarios**:

1. **Given** an authenticated user, **When** they view the landing page, **Then** they see Knowledge Library tiles in the right panel (Due Diligence, House, Apartments, Fitout, Industrial, Remediation).
2. **Given** a Knowledge Library tile, **When** the user drags files onto it, **Then** the files are uploaded and added to that library.
3. **Given** a Knowledge Library tile, **When** the user clicks on it, **Then** they see a list of documents in that library.
4. **Given** documents in a Knowledge Library, **When** viewing the document list, **Then** the user can select and delete documents.
5. **Given** a Knowledge Library with documents, **When** the user clicks "Sync to AI", **Then** the documents are queued for RAG embedding.

---

### User Story 4 - User Profile Management (Priority: P2)

An authenticated user can view and update their profile information in the center panel's user settings section.

**Why this priority**: User profile provides identity but is not required for core project functionality.

**Independent Test**: Can be tested by updating profile fields and verifying changes persist after page refresh.

**Acceptance Scenarios**:

1. **Given** an authenticated user, **When** they view the center panel, **Then** they see their profile information (name, email).
2. **Given** a user viewing their profile, **When** they edit their display name and save, **Then** the change is persisted and reflected in the UI.
3. **Given** a user viewing their profile, **When** they click "Change Password", **Then** they can update their password.

---

### User Story 5 - Default Settings Configuration (Priority: P3)

An authenticated user can configure organization-wide default settings in the center panel. These settings apply as defaults when creating new projects.

**Why this priority**: Defaults improve efficiency but the system works without them - users can configure per-project.

**Independent Test**: Can be tested by setting a default value and creating a new project, verifying the default is applied.

**Acceptance Scenarios**:

1. **Given** an authenticated user, **When** they view the center panel, **Then** they see a "Default Settings" section.
2. **Given** the Default Settings section, **When** the user sets a default consultant discipline list, **Then** new projects inherit those enabled disciplines.
3. **Given** the Default Settings section, **When** the user configures default cost line templates, **Then** new projects are initialized with those cost lines.

---

### Edge Cases

- What happens when a user's session expires mid-session? System redirects to login with "Session expired" message.
- How does system handle concurrent logins from same user? Multiple sessions allowed from different devices.
- What happens when uploading a duplicate file to a Knowledge Library? Creates new version following existing versioning logic from DocumentRepository.
- How does the system handle a deleted/archived project appearing in the list? Projects with archived status are filtered out or shown in separate "Archived" section.
- What happens when a user is rate-limited? System displays "Too many failed attempts. Please try again in X minutes" with countdown.

---

## Requirements

### Functional Requirements

#### Authentication

- **FR-001**: System MUST authenticate users via email and password before granting access to any application feature.
- **FR-002**: System MUST provide a registration flow for new users requiring email, password, and display name.
- **FR-003**: System MUST validate email format and enforce password complexity (minimum 8 characters).
- **FR-004**: System MUST maintain user sessions with automatic expiry after 24 hours of inactivity.
- **FR-005**: System MUST provide a secure sign-out mechanism that invalidates the current session.
- **FR-006**: System MUST enforce rate limiting: after 5 failed login attempts for an email, lock out that email for 15 minutes.

#### Project Register (Left Panel)

- **FR-010**: System MUST display all user-accessible projects in a scrollable list.
- **FR-011**: Each project row MUST display: Project Name, Current Stage, Last Updated timestamp.
- **FR-012**: Clicking a project MUST navigate to the existing project workspace (3-panel layout at `/projects/[id]`).
- **FR-013**: System MUST provide a "New Project" action that creates a project and navigates to it.
- **FR-014**: Project list MUST refresh when returning to the landing page.

#### Knowledge Libraries (Right Panel)

- **FR-020**: System MUST display 6 Knowledge Library tiles: Due Diligence, House, Apartments, Fitout, Industrial, Remediation.
- **FR-021**: Knowledge Library tiles MUST support drag-and-drop file upload (same behavior as CategoryUploadTiles).
- **FR-021a**: Knowledge Libraries MUST accept the same file formats as DocumentRepository: PDF, DOCX, XLSX, PNG, JPG, and text files.
- **FR-022**: Clicking a tile MUST expand/reveal the list of documents in that library (same behavior as DocumentRepository).
- **FR-023**: Documents in a library MUST support selection, multi-select, and deletion.
- **FR-024**: System MUST provide a "Sync to AI" action that queues library documents for RAG embedding.
- **FR-025**: Knowledge Libraries MUST be shared across all projects in the organization.

#### User Profile & Settings (Center Panel)

- **FR-030**: Center panel MUST display current user's profile: display name, email.
- **FR-031**: Users MUST be able to edit their display name with inline editing.
- **FR-032**: Users MUST be able to change their password via a secure form.
- **FR-033**: Center panel MUST display a "Default Settings" section for organization configuration.
- **FR-034**: Default settings MUST include: default enabled consultant disciplines, default enabled contractor trades.

#### Layout & Navigation

- **FR-040**: Landing page MUST use the same 3-panel resizable layout as the project workspace.
- **FR-041**: Panel proportions MUST default to 20% (left), 55% (center), 25% (right).
- **FR-042**: Header MUST display the assemble.ai logo and user menu (profile, sign out).
- **FR-043**: System MUST persist user preference for panel widths.

---

### Key Entities

- **User**: Represents an authenticated user with credentials (email, password hash), profile information (display name), and session state.
- **Organization**: Groups users and knowledge libraries. Initially 1:1 with user (single-tenant model).
- **Knowledge Library**: A categorized collection of documents shared across projects. Fixed types: Due Diligence, House, Apartments, Fitout, Industrial, Remediation.
- **Library Document**: A document uploaded to a Knowledge Library, linked to the RAG embedding system via existing document infrastructure.
- **Session**: Tracks authenticated user sessions with token and expiry timestamp.
- **Default Settings**: Organization-level configuration applied when creating new projects.

---

## Success Criteria

### Measurable Outcomes

- **SC-001**: Users can complete login and reach the landing page in under 3 seconds.
- **SC-002**: Users can create a new project from the landing page in under 5 seconds (2 clicks maximum).
- **SC-003**: Project list displays up to 50 projects without pagination, rendering in under 1 second.
- **SC-004**: File upload to Knowledge Library completes in under 10 seconds for files up to 50MB.
- **SC-005**: Knowledge Library document list renders 100 documents in under 1 second.
- **SC-006**: 90% of users can navigate from login to their target project in under 10 seconds.
- **SC-007**: Profile changes save and reflect in the UI within 2 seconds.

---

## Implementation Notes

### Component Reuse Strategy

The Knowledge Libraries panel should maximize reuse of existing DocumentRepository components with minimal new code:

| Existing Component | Reused As | Changes Required |
|-------------------|-----------|------------------|
| `DocumentRepository` | `KnowledgeLibraryRepository` | Replace `projectId` with `organizationId`, swap category data source |
| `CategoryUploadTiles` | `LibraryUploadTiles` | Replace `useActiveCategories` with static library types |
| `CategoryTile` | Reuse directly | Pass library data instead of category data |
| `CategorizedList` | `LibraryDocumentList` | Query by `libraryId` instead of `projectId` |

### Knowledge Library Tiles Configuration

```typescript
const KNOWLEDGE_LIBRARY_TYPES = [
  { id: 'due-diligence', name: 'Due Diligence', color: '#ce9178' },
  { id: 'house', name: 'House', color: '#4ec9b0' },
  { id: 'apartments', name: 'Apartments', color: '#569cd6' },
  { id: 'fitout', name: 'Fitout', color: '#dcdcaa' },
  { id: 'industrial', name: 'Industrial', color: '#c586c0' },
  { id: 'remediation', name: 'Remediation', color: '#9cdcfe' },
];
```

### Routing Structure

```
/login              → Login page (unauthenticated)
/register           → Registration page (unauthenticated)
/                   → Landing page (authenticated, 3-panel)
/projects/[id]      → Project workspace (existing)
```

---

## Assumptions

- Single-tenant initially: one organization per deployment, multi-tenancy deferred.
- Single-role system: all authenticated users have full access to all features; role-based permissions deferred.
- OAuth/SSO authentication deferred to future enhancement.
- Knowledge Library types are fixed (6 types from 007-RAG spec), not user-configurable.
- Existing project creation and initialization (spec 008/009) continues to work unchanged.
- RAG sync infrastructure from 007-RAG is available and reusable for library documents.
- Document versioning behavior from DocumentRepository applies to Knowledge Libraries.
