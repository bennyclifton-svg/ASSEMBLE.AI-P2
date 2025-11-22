# Feature Specification: Intelligent Document Repository

**Feature Branch**: `001-document-repo`  
**Created**: 2025-11-22  
**Status**: Draft  
**Input**: User description: "Intelligent Document Repository with drag-and-drop, version control, and NotebookLM inspiration"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Bulk Document Ingestion (Priority: P1)

As a Project Manager, I want to drag and drop multiple construction documents (PDF, Excel, CAD) into the workspace so that they are instantly available for processing.

**Why this priority**: This is the entry point for all data. Without documents, the AI has nothing to process.

**Independent Test**: Can be tested by dragging 10+ files into the UI and verifying they appear in the list with correct metadata.

**Acceptance Scenarios**:

1. **Given** a set of 5 PDF files (15MB each), **When** I drag them to the upload zone, **Then** all 5 upload successfully and appear in the repository.
2. **Given** a file larger than 20MB, **When** I attempt to upload it, **Then** the system rejects it with a clear error message.
3. **Given** a mix of supported (PDF, XLSX) and unsupported files, **When** I upload them, **Then** only supported files are ingested, and unsupported ones are flagged.

---

### User Story 2 - Automatic Version Control (Priority: P1)

As a Project Manager, I want the system to automatically detect when I upload a new version of an existing plan so that I don't have to manually manage file replacements.

**Why this priority**: Construction projects have constant revisions. Manual versioning is error-prone and leads to using outdated plans.

**Independent Test**: Upload "Plan_A_V1.pdf", then upload "Plan_A_V2.pdf" and verify they are stacked as versions of the same document entity.

**Acceptance Scenarios**:

1.  **Given** "Architectural_Plans_V1.pdf" exists in the repo, **When** I upload "Architectural_Plans_V2.pdf", **Then** the system identifies it as a new version of the existing document.
2.  **Given** a document with 3 versions, **When** I view its history, **Then** I can see and access all 3 versions, with the latest being default.
3.  **Given** two files with completely different names, **When** I upload them, **Then** they are treated as separate documents.

---

### User Story 3 - Transmittals (formerly Saved Sets) (Priority: P2)

As a Project Manager, I want to select a discrete set of documents and create a "Transmittal" associated with a specific consultant or contractor discipline, so that I can issue a precise package of documents for tender or construction.

**Why this priority**: "Transmittal" is the industry-standard term. Sending the wrong documents is a major risk.

**Independent Test**: Select 5 files, create Transmittal "Carpentry Tender Package". Export to PDF. Verify PDF lists exactly those 5 files with correct versions.

**Acceptance Scenarios**:

1.  **Given** a list of documents, **When** I use **Shift+Click** (Range) or **Ctrl+Click** (Individual) or **Select All**, **Then** I can perform bulk actions.
2.  **Given** a selection, **When** I click "Create Transmittal", **Then** I can name it and link it to a Subcategory (e.g., "Carpenter").
3.  **Given** a Transmittal, **When** I click "Export", **Then** I can download a formatted Schedule (Excel/PDF) with columns: Document Title, Latest Version, Date, Category, Notes.
4.  **Given** a Transmittal, **When** I click "Download Files", **Then** I get a ZIP file containing all documents in that Transmittal.

---

### User Story 5 - Bulk Operations & Accessibility (Priority: P2)

As a Power User, I want to manage large numbers of files efficiently using keyboard shortcuts and bulk actions, ensuring the system is accessible and fast.

**Acceptance Scenarios**:

1.  **Given** a selection of 20 files, **When** I choose "Bulk Re-categorize", **Then** I can move them all to "Scheme Design" in one action.
2.  **Given** a keyboard-only user, **When** I navigate the list, **Then** I can use Arrow keys to move and Space/Enter to select files (WCAG 2.1 AA compliance).
3.  **Given** a document upload, **When** it finishes, **Then** the system records an OCR status (Pending) for future processing.

---

## Requirements *(mandatory)*

### Functional Requirements

-   **FR-001**: System MUST support drag-and-drop upload for multiple files simultaneously.
-   **FR-002**: System MUST enforce a **50MB** hard limit per file.
-   **FR-003**: System MUST automatically detect version patterns in filenames (e.g., V1, V2, revA, revB) and stack them.
-   **FR-004**: System MUST allow users to manually link two files as versions if auto-detection fails.
-   **FR-005**: Users MUST be able to assign documents to mandatory categories via drag-and-drop: **Planning**, **Scheme Design**, **Detail Design**, **Procurement**, **Delivery**, **Consultants**, **Contractors**, **Administration**, **Cost Planning**.
-   **FR-006**: System MUST support specific subcategories for Consultants (as defined previously).
-   **FR-007**: System MUST support specific subcategories for Contractors (as defined previously).
-   **FR-008**: System MUST allow creating named "**Transmittals**" (Document Schedules) from a selection of documents.
-   **FR-009**: System MUST support **Shift+Click**, **Ctrl+Click**, and **Select All** for multi-selection.
-   **FR-010**: System MUST allow **Bulk Operations**: Re-categorize, Add to Transmittal, Remove from Transmittal, Download as ZIP.
-   **FR-011**: System MUST persist document metadata including **OCR Status** (Pending, Complete, Failed).
-   **FR-012**: System MUST support "FortuneSheet" compatible data structures for Excel files.
-   **FR-013**: System MUST provide a compact list view grouped by Category.
-   **FR-014**: System MUST allow **Exporting Transmittals** to formatted Excel/PDF (Columns: Title, Version, Date, Category, Notes).
-   **FR-015**: System MUST comply with **WCAG 2.1 AA** (Keyboard navigation, screen reader labels).

### Key Entities

-   **Document**: The abstract entity representing a file history.
-   **FileAsset**: A specific physical file (binary).
-   **Transmittal**: A named collection of Document Versions (formerly Saved Set/Context).
-   **Version**: Metadata linking a FileAsset to a Document.
-   **Category/Subcategory**: Organization tags.

## Success Criteria *(mandatory)*

### Measurable Outcomes

-   **SC-001**: Upload 10 files (total 200MB) in under 60 seconds.
-   **SC-002**: List view renders 100 categorized items in under 1 second.
-   **SC-003**: Bulk re-categorize 50 items in under 2 seconds.
-   **SC-004**: Generate Transmittal PDF export for 50 items in under 3 seconds.
-   **SC-005**: ZIP download of 20 files starts within 2 seconds.
