# Feature Specification: Planning Card

**Feature Branch**: `003-planning-card`  
**Created**: 2025-11-22  
**Status**: Draft  
**Input**: User description: "Planning Card with 7 sections: Details, Objectives, Staging, Risk, Stakeholders, Consultant List, Contractor List with inline editing and auto-save"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - View Project Details (Priority: P1)

Users need to view comprehensive project information organized into logical sections to quickly understand project scope, objectives, and key stakeholders.

**Why this priority**: Core information display is the foundation. Without this, the Planning Card serves no purpose.

**Independent Test**: Load a project and verify all 7 sections appear with their respective fields populated.

**Acceptance Scenarios**:

1. **Given** a project is selected, **When** the Planning Card loads, **Then** all 7 sections (Details, Objectives, Staging, Risk, Stakeholders, Consultant List, Contractor List) are visible.
2. **Given** the Details section is displayed, **When** viewing the fields, **Then** all 8 fields are shown: Project Name, Address, Legal Address, Zoning, Jurisdiction, Lot Area, Number of Stories, Building Class.
3. **Given** the Objectives section is displayed, **When** viewing the fields, **Then** all 4 fields are shown: Functional, Quality, Budget, Program.

---

### User Story 2 - Edit Fields Inline (Priority: P1)

Users need to edit project information directly within the Planning Card without navigating to separate edit screens, enabling quick updates during planning sessions.

**Why this priority**: Inline editing is a core requirement (AC-5.3) and essential for the workflow efficiency this feature aims to provide.

**Independent Test**: Click on any field, edit the value, and verify it saves automatically.

**Acceptance Scenarios**:

1. **Given** a field is displayed, **When** the user clicks on it, **Then** the field becomes editable with a text input or appropriate control.
2. **Given** a field is in edit mode, **When** the user types a new value and clicks outside, **Then** the change saves automatically to the database.
3. **Given** a field is in edit mode, **When** the user presses Tab, **Then** focus moves to the next field smoothly.
4. **Given** a field is saving, **When** the save operation is in progress, **Then** a loading spinner appears next to the field.
5. **Given** a field has been saved successfully, **When** the save completes, **Then** a success indicator (checkmark) appears briefly.

---

### User Story 3 - Validate and Handle Errors (Priority: P2)

Users need clear feedback when they enter invalid data or when save operations fail, preventing data loss and confusion.

**Why this priority**: Essential for data integrity, but the basic edit/save flow (P1) provides value even without validation.

**Independent Test**: Enter invalid data in a required field and verify error message appears.

**Acceptance Scenarios**:

1. **Given** a required field is empty, **When** the user tries to save, **Then** an error message appears indicating the field is required.
2. **Given** a field has validation rules, **When** the user enters invalid data, **Then** an inline error message appears with specific guidance.
3. **Given** a save operation fails, **When** the error occurs, **Then** the user sees an error notification with retry option.

---

### User Story 4 - Undo Recent Changes (Priority: P3)

Users need the ability to undo recent edits to recover from mistakes without manually reverting changes.

**Why this priority**: Nice-to-have feature that improves UX, but not critical for core functionality.

**Independent Test**: Edit a field, press Ctrl+Z, and verify the change is reverted.

**Acceptance Scenarios**:

1. **Given** a user has edited a field, **When** they press Ctrl+Z, **Then** the field reverts to its previous value.
2. **Given** multiple edits have been made, **When** the user presses Ctrl+Z multiple times, **Then** changes are undone in reverse chronological order.

---

### User Story 5 - Manage Consultant Disciplines (Priority: P1)

Users need to select which consultant disciplines are required for their project and track the status of each discipline through the procurement process.

**Why this priority**: Core to project planning - knowing which consultants are needed is fundamental to project setup.

**Independent Test**: Toggle a consultant discipline on/off and verify corresponding tab appears/disappears in Consultant Card.

**Acceptance Scenarios**:

1. **Given** the Consultant List section is displayed, **When** viewing the list, **Then** all default consultant disciplines are shown in a scrollable list (AC-7.1).
2. **Given** a consultant discipline is displayed, **When** the user clicks the toggle, **Then** the discipline is marked as needed/not needed for the project (AC-7.2).
3. **Given** a consultant discipline is displayed, **When** viewing status indicators, **Then** 4 status icons are shown: Brief, Tender, Rec (Recommendation), Award - all defaulting to off/ghosted state (AC-7.3).
4. **Given** a consultant discipline is toggled on, **When** the toggle completes, **Then** a corresponding tab is created in the Consultant Card (AC-7.4).
5. **Given** a consultant discipline is toggled off, **When** the user confirms the action, **Then** the corresponding tab is removed from the Consultant Card (AC-7.5).

---

### User Story 6 - Manage Contractor Trades (Priority: P1)

Users need to select which contractor trades are required for their project and track the status of each trade through the procurement process.

**Why this priority**: Core to project planning - knowing which contractors are needed is fundamental to project setup.

**Independent Test**: Toggle a contractor trade on/off and verify corresponding tab appears/disappears in Contractor Card.

**Acceptance Scenarios**:

1. **Given** the Contractor List section is displayed, **When** viewing the list, **Then** all default contractor trades are shown in a scrollable list (AC-8.1).
2. **Given** a contractor trade is displayed, **When** the user clicks the toggle, **Then** the trade is marked as needed/not needed for the project (AC-8.2).
3. **Given** a contractor trade is displayed, **When** viewing status indicators, **Then** 4 status icons are shown: Brief, Tender, Rec (Recommendation), Award - all defaulting to off/ghosted state (AC-8.3).
4. **Given** a contractor trade is toggled on, **When** the toggle completes, **Then** a corresponding tab is created in the Contractor Card (AC-8.4).
5. **Given** a contractor trade is toggled off, **When** the user confirms the action, **Then** the corresponding tab is removed from the Contractor Card (AC-8.5).

---

### User Story 7 - AI-Assisted Field Filling (Priority: P2)

Users need AI assistance to quickly populate Objectives, Staging, and Risk fields based on project type and address, reducing manual data entry and ensuring comprehensive planning.

**Why this priority**: Valuable time-saver, but manual entry still works. AI assistance enhances UX but isn't blocking.

**Independent Test**: Click "Suggest" button next to Objectives and verify AI fills in relevant content.

**Acceptance Scenarios**:

1. **Given** the Objectives section is displayed, **When** the user clicks "Suggest", **Then** AI fills Functional, Quality, Budget, and Program fields based on project type and address.
2. **Given** the Staging section is displayed, **When** the user clicks "Suggest", **Then** AI suggests appropriate timeline and milestones based on project scope.
3. **Given** the Risk section is displayed, **When** the user clicks "Suggest", **Then** AI identifies potential risks based on project location, type, and scope.
4. **Given** AI suggestions are displayed, **When** the user reviews them, **Then** all suggestions are editable and can be accepted or modified.

---

### User Story 8 - Smart Defaults from Address (Priority: P2)

Users need automatic population of location-specific fields (Zoning, Jurisdiction, Lot Area) when they enter a project address, eliminating manual lookup of public records.

**Why this priority**: Significant time-saver for common fields, but users can still enter manually if needed.

**Independent Test**: Enter an address and verify Zoning, Jurisdiction, and Lot Area auto-fill.

**Acceptance Scenarios**:

1. **Given** the Address field is empty, **When** the user types a valid address, **Then** the system queries public GIS APIs for property information.
2. **Given** GIS data is retrieved, **When** the query completes, **Then** Zoning, Jurisdiction, and Lot Area fields auto-fill with the retrieved data.
3. **Given** auto-filled fields are displayed, **When** the user views them, **Then** all auto-filled fields are editable and can be overridden.
4. **Given** GIS lookup fails, **When** the error occurs, **Then** fields remain empty and user can enter data manually.

---

### User Story 9 - Interactive Staging Timeline (Priority: P2)

Users need a visual, interactive timeline for project stages where they can drag to set durations, making schedule planning more intuitive and visual.

**Why this priority**: Enhances UX significantly, but text-based stage management still works.

**Independent Test**: Click and drag on the timeline grid to set stage duration and verify it saves.

**Acceptance Scenarios**:

1. **Given** the Staging section is displayed, **When** viewing the timeline, **Then** a grid-based timeline is shown with all 5 stages.
2. **Given** the timeline is displayed, **When** the user clicks and drags over the grid, **Then** the stage duration is visually represented.
3. **Given** a stage duration is set, **When** the user releases the drag, **Then** the duration is saved and displayed in the stage details.
4. **Given** multiple stages are set, **When** viewing the timeline, **Then** stage dependencies and overlaps are visually indicated.

---

### User Story 10 - Export Planning Card as PDF (Priority: P3)

Directors need to export the Planning Card as a professionally formatted PDF with revision history for client meetings and documentation purposes.

**Why this priority**: Important for client communication, but not essential for day-to-day planning work.

**Independent Test**: Click "Export PDF" and verify a formatted PDF is generated with all current data.

**Acceptance Scenarios**:

1. **Given** the Planning Card is displayed, **When** the user clicks "Export PDF", **Then** a beautifully formatted PDF is generated with all current data.
2. **Given** the PDF is generated, **When** viewing the document, **Then** it includes all 7 sections with proper formatting and branding.
3. **Given** the PDF is generated, **When** viewing revision history, **Then** a summary of recent changes is included with timestamps and user names.
4. **Given** the export is in progress, **When** generating the PDF, **Then** a progress indicator is shown to the user.

---

### Edge Cases

- What happens when multiple users edit the same field simultaneously? (Should show conflict resolution or last-write-wins with notification)
- What happens if the network connection is lost during save? (Should queue changes and retry when connection is restored)
- What happens if a field value exceeds maximum length? (Should show character count and prevent submission)
- What happens when switching projects while edits are in progress? (Should save or prompt to save changes)

## Requirements *(mandatory)*

### Functional Requirements

**Details Section (AC-5.1)**:
- **FR-001**: System MUST display a Details section with 8 fields: Project Name, Address, Legal Address, Zoning, Jurisdiction, Lot Area, Number of Stories, Building Class.

**Objectives Section (AC-5.2)**:
- **FR-002**: System MUST display an Objectives section with 4 fields: Functional, Quality, Budget, Program.

**Staging Section (AC-6.1)**:
- **FR-003**: System MUST display a Staging section with 5 default stages: Stage 1 Initiation, Stage 2 Scheme Design, Stage 3 Detail Design, Stage 4 Procurement, Stage 5 Delivery.

**Risk Section (AC-6.2)**:
- **FR-004**: System MUST display a Risk section with 3 default risk placeholder items: Risk 1, Risk 2, Risk 3.

**Stakeholders Section**:
- **FR-005**: System MUST display a Stakeholders section with editable stakeholder list.

**Consultant List Section (AC-7.x)**:
- **FR-020**: System MUST display all default consultant disciplines in a scrollable list (AC-7.1).
- **FR-021**: System MUST provide a toggle control for each consultant discipline to mark as needed/not needed (AC-7.2).
- **FR-022**: System MUST display 4 status icons per discipline: Brief, Tender, Rec (Recommendation), Award - all defaulting to off/ghosted state (AC-7.3).
- **FR-023**: System MUST create a corresponding tab in the Consultant Card when a discipline is toggled on (AC-7.4).
- **FR-024**: System MUST remove the corresponding tab from the Consultant Card when a discipline is toggled off, with user confirmation (AC-7.5).

**Contractor List Section (AC-8.x)**:
- **FR-025**: System MUST display all default contractor trades in a scrollable list (AC-8.1).
- **FR-026**: System MUST provide a toggle control for each contractor trade to mark as needed/not needed (AC-8.2).
- **FR-027**: System MUST display 4 status icons per trade: Brief, Tender, Rec (Recommendation), Award - all defaulting to off/ghosted state (AC-8.3).
- **FR-028**: System MUST create a corresponding tab in the Contractor Card when a trade is toggled on (AC-8.4).
- **FR-029**: System MUST remove the corresponding tab from the Contractor Card when a trade is toggled off, with user confirmation (AC-8.5).

**AI-Assisted Field Filling**:
- **FR-030**: System MUST provide a "Suggest" button next to the Objectives section.
- **FR-031**: System MUST use AI to fill Functional, Quality, Budget, and Program fields based on project type and address when "Suggest" is clicked.
- **FR-032**: System MUST provide a "Suggest" button next to the Staging section.
- **FR-033**: System MUST use AI to suggest appropriate timeline and milestones based on project scope.
- **FR-034**: System MUST provide a "Suggest" button next to the Risk section.
- **FR-035**: System MUST use AI to identify potential risks based on project location, type, and scope.
- **FR-036**: System MUST make all AI suggestions editable and allow users to accept or modify them.

**Smart Defaults from Address**:
- **FR-037**: System MUST query public GIS APIs when a user enters a project address.
- **FR-038**: System MUST auto-fill Zoning, Jurisdiction, and Lot Area fields with data retrieved from GIS APIs.
- **FR-039**: System MUST allow users to edit or override all auto-filled fields.
- **FR-040**: System MUST handle GIS lookup failures gracefully, leaving fields empty for manual entry.

**Interactive Staging Timeline**:
- **FR-041**: System MUST display the Staging section as a grid-based interactive timeline.
- **FR-042**: System MUST allow users to click and drag over the grid to set stage durations.
- **FR-043**: System MUST visually represent stage durations on the timeline.
- **FR-044**: System MUST save stage durations when the user releases the drag.
- **FR-045**: System MUST visually indicate stage dependencies and overlaps on the timeline.

**PDF Export**:
- **FR-046**: System MUST provide an "Export PDF" button on the Planning Card.
- **FR-047**: System MUST generate a professionally formatted PDF with all 7 sections when export is triggered.
- **FR-048**: System MUST include revision history in the PDF with timestamps and user names.
- **FR-049**: System MUST display a progress indicator during PDF generation.
- **FR-050**: System MUST apply proper formatting and branding to the exported PDF.

**Inline Editing (AC-5.3)**:
- **FR-006**: System MUST allow users to edit all fields inline by clicking on them.
- **FR-007**: System MUST convert clicked fields into editable inputs (text, textarea, select, etc. as appropriate).

**Auto-Save (AC-5.4)**:
- **FR-008**: System MUST save changes automatically when a user clicks outside an edited field or presses Enter.
- **FR-009**: System MUST use optimistic updates (show changes immediately while saving in background).

**Tab Navigation (AC-5.5)**:
- **FR-010**: System MUST support Tab key navigation between fields in logical order.
- **FR-011**: System MUST support Shift+Tab for reverse navigation.

**Visual Feedback (AC-5.6)**:
- **FR-012**: System MUST display a loading spinner next to a field during save operations.
- **FR-013**: System MUST display a success indicator (checkmark) when save completes successfully.
- **FR-014**: System MUST display an error indicator when save fails.

**Validation (AC-5.7)**:
- **FR-015**: System MUST validate required fields before saving.
- **FR-016**: System MUST display inline error messages for validation failures.
- **FR-017**: System MUST prevent saving invalid data to the database.

**Undo Capability (AC-5.8)**:
- **FR-018**: System MUST support Ctrl+Z (Cmd+Z on Mac) to undo recent edits.
- **FR-019**: System MUST maintain an undo history for the current session.

### Key Entities *(include if feature involves data)*

- **Project**: The main entity containing all planning information.
- **ProjectDetails**: Stores the 8 detail fields (Project Name, Address, Legal Address, Zoning, Jurisdiction, Lot Area, Number of Stories, Building Class).
- **ProjectObjectives**: Stores the 4 objective fields (Functional, Quality, Budget, Program).
- **ProjectStage**: Represents each of the 5 project stages with status, duration, and timeline metadata.
- **Risk**: Represents individual risk items with description, likelihood, impact, and mitigation strategies.
- **Stakeholder**: Represents project stakeholders with name, role, and contact information.
- **ConsultantDiscipline**: Represents a consultant discipline (e.g., Architect, Structural Engineer) with toggle state and status tracking.
- **ConsultantStatus**: Tracks the 4 status states (Brief, Tender, Rec, Award) for each consultant discipline.
- **ContractorTrade**: Represents a contractor trade (e.g., Electrical, Plumbing) with toggle state and status tracking.
- **ContractorStatus**: Tracks the 4 status states (Brief, Tender, Rec, Award) for each contractor trade.
- **RevisionHistory**: Stores change history with timestamp, user, field changed, old value, and new value.
- **GISData**: Cached data from public GIS APIs for address-based auto-fill.

## Success Criteria *(mandatory)*

### Measurable Outcomes

**Core Functionality**:
- **SC-001**: Users can view all project information in the Planning Card within 1 second of loading.
- **SC-002**: Users can edit and save a field in under 3 seconds (click, edit, save).
- **SC-003**: 95% of save operations complete successfully within 500ms.
- **SC-004**: Tab navigation moves focus to the next field in under 100ms.
- **SC-005**: Validation errors appear within 200ms of invalid input.
- **SC-006**: Undo operation reverts changes within 100ms.

**Consultant/Contractor Management**:
- **SC-007**: Toggling a consultant/contractor on creates a tab in the respective card within 500ms.
- **SC-008**: Status icon updates reflect immediately with optimistic UI updates.
- **SC-009**: Users can view all consultant disciplines and contractor trades in a scrollable list without performance degradation.

**AI Features**:
- **SC-010**: AI suggestions for Objectives appear within 3 seconds of clicking "Suggest".
- **SC-011**: AI-generated content is relevant and accurate for 80%+ of projects based on user feedback.
- **SC-012**: Users can edit AI suggestions before accepting them.

**Smart Defaults**:
- **SC-013**: GIS API queries complete within 2 seconds for 95% of valid addresses.
- **SC-014**: Auto-filled fields (Zoning, Jurisdiction, Lot Area) are accurate for 90%+ of addresses.
- **SC-015**: Users can override auto-filled values without friction.

**Interactive Timeline**:
- **SC-016**: Timeline drag interactions respond within 16ms (60fps) for smooth visual feedback.
- **SC-017**: Stage duration changes save within 500ms of releasing the drag.
- **SC-018**: Timeline visually indicates overlaps and dependencies clearly.

**PDF Export**:
- **SC-019**: PDF generation completes within 5 seconds for typical projects.
- **SC-020**: Exported PDFs are professionally formatted and include all 7 sections.
- **SC-021**: Revision history in PDF is accurate and complete.
