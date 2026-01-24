# Feature Specification: Unified Stakeholder System

**Feature Branch**: `020-stakeholder`
**Created**: 2026-01-21
**Status**: Draft
**Input**: User description: "Unified Stakeholder System - Replaces and unifies the existing Consultant and Contractor lists with a new 4-group taxonomy (Client, Authority, Consultant, Contractor) and AI-powered stakeholder generation."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - AI-Powered Stakeholder Generation (Priority: P1)

A project manager has just completed the Profile and Objectives sections for a new commercial office fitout project. They navigate to the Stakeholders section in the left navigation panel and click the "Generate" button. The AI analyzes the project profile (Commercial class, Fitout type, Office subclass, 5 levels, Premium complexity) and objectives (functional quality around tenant experience, planning compliance around BCA/DDA). Within seconds, the system populates relevant stakeholders across all four groups: Client stakeholders (Owner, Tenant, Project Manager), Authority stakeholders (Council, FRNSW, Access Consultant), Consultant stakeholders (Architect, Interior Designer, Services Engineer, Structural Engineer, BCA Consultant), and Contractor stakeholders based on fitout scope.

**Why this priority**: This is the core value proposition - reducing manual data entry by 80% and ensuring no critical stakeholders are forgotten based on project characteristics.

**Independent Test**: Can be fully tested by creating a project with a completed profile, clicking Generate, and verifying the populated stakeholder list matches expected disciplines for that project type.

**Acceptance Scenarios**:

1. **Given** a project with completed Profile (Commercial/Fitout/Office/5 levels/Premium) and Objectives, **When** the user clicks "Generate" in Stakeholders section, **Then** the system populates stakeholders across all 4 groups with relevant subgroups for that project type within 5 seconds.
2. **Given** a generated stakeholder list, **When** the user reviews the list, **Then** they can see which stakeholders were AI-generated vs manually added (visual indicator).
3. **Given** an existing stakeholder list, **When** the user clicks "Generate" again, **Then** the system prompts to merge or replace, preserving any manually-entered firm/contact details.

---

### User Story 2 - Stakeholder Group Management (Priority: P1)

A project manager views the Stakeholders section which has two panels. The left panel displays a fixed list of all four stakeholder groups (Client, Authority, Consultant, Contractor) with the count of stakeholders in each group always visible - this provides an at-a-glance team size indicator showing how many people have been assembled for the project. The main panel displays all four groups concurrently as collapsible table sections. The Consultant group shows a table with columns for Discipline, Firm Name, Contact Person, Email, and Tender Status. The Contractor group shows similar columns with Trade instead of Discipline. The Authority group shows Submission Type and Status columns. The Client group shows Role and Organization columns. Users can expand/collapse individual group tables, add new stakeholders to any group, edit existing ones inline, and delete stakeholders they don't need.

**Why this priority**: The two-panel layout provides both a quick team size overview (left nav) and detailed stakeholder management (main panel), enabling fast situational awareness.

**Independent Test**: Can be tested by navigating to Stakeholders, verifying left nav shows all 4 groups with accurate counts, verifying main panel shows all 4 collapsible table sections, and adding/editing/deleting stakeholders while confirming counts update.

**Acceptance Scenarios**:

1. **Given** a project with stakeholders in multiple groups, **When** the user views the Stakeholders section, **Then** the left nav shows all 4 groups with accurate stakeholder counts, and the main panel shows all 4 groups as collapsible table sections.
2. **Given** the left nav is visible, **When** stakeholders are added or removed, **Then** the counts in the left nav update immediately to reflect the team size.
3. **Given** a stakeholder entry in any group, **When** the user clicks the row, **Then** they can inline-edit firm name, contact person, email, and phone fields.

---

### User Story 3 - Tender Process Integration (Priority: P2)

A project manager working with consultants and contractors needs to track the 4-stage tender process (Brief, Tender, Recommendation, Award) for each stakeholder. When viewing Consultant or Contractor groups, the table includes a tender progress indicator showing which stages are complete. Clicking a stage toggles its status. When Award is marked complete, the system prompts to link the stakeholder to a Cost Plan line item and creates a company record if one doesn't exist.

**Why this priority**: Tender tracking is essential for procurement workflow but builds on the core stakeholder management.

**Independent Test**: Can be tested by toggling tender stages for a consultant stakeholder and verifying the progress updates, then marking Award and confirming the Cost Plan integration prompt appears.

**Acceptance Scenarios**:

1. **Given** a Consultant stakeholder with a firm assigned, **When** the user views the stakeholder row, **Then** they see a 4-stage progress bar (Brief, Tender, Rec, Award) with current status highlighted.
2. **Given** all stages up to Rec are complete, **When** the user clicks Award, **Then** the system prompts "Link to Cost Plan?" with options to select an existing line or create new.
3. **Given** Award is marked complete with Cost Plan link, **When** the user views the Cost Plan section, **Then** the stakeholder's firm appears in the linked line item's company field.

---

### User Story 4 - Client & Authority Stakeholder Management (Priority: P2)

A project manager adds client stakeholders (Owner representative, Tenant coordinator, Project Manager) and authority stakeholders (Council planning officer, FRNSW, Heritage NSW). These stakeholders don't have the tender process workflow - instead they have simpler contact management with notes fields. Authority stakeholders can be marked with submission/approval status for regulatory approvals.

**Why this priority**: Client and Authority groups complete the unified stakeholder model but have simpler workflows than Consultant/Contractor.

**Independent Test**: Can be tested by adding stakeholders to Client and Authority groups and verifying the tender process columns don't appear, while notes and contact fields work correctly.

**Acceptance Scenarios**:

1. **Given** the Client group is selected, **When** the user adds a new stakeholder, **Then** the form shows Subgroup dropdown (Owner, Tenant, Project Manager, Other), contact fields, and notes - no tender stages.
2. **Given** the Authority group is selected, **When** the user views an authority stakeholder, **Then** they see submission status (Pending, Submitted, Approved, Rejected) instead of tender stages.
3. **Given** an Authority stakeholder marked as "Approved", **When** viewing the Planning section, **Then** the approval status is visible in relevant compliance indicators.

---

### User Story 5 - Data Migration from Existing System (Priority: P3)

When the system is upgraded, existing consultant disciplines, contractor trades, and their associated firms are migrated to the new unified stakeholder schema. Consultant disciplines become Consultant group stakeholders with the discipline as subgroup. Contractor trades become Contractor group stakeholders with the trade as subgroup. Firm associations, tender statuses, and brief/scope data are preserved.

**Why this priority**: Migration is essential for existing users but only needs to run once per project during upgrade.

**Independent Test**: Can be tested by running migration on a project with existing consultant/contractor data and verifying all data appears correctly in the new Stakeholders section with no data loss.

**Acceptance Scenarios**:

1. **Given** a project with 10 consultant disciplines (5 enabled, 5 disabled) and associated firms, **When** migration runs, **Then** 10 Consultant stakeholders are created with correct subgroups, enabled status, and firm associations preserved.
2. **Given** a consultant discipline with Brief data (services, deliverables, fee, program), **When** migration runs, **Then** the data is accessible in the new stakeholder's scope/brief fields.
3. **Given** contractor trades with tender statuses (brief=true, tender=true, rec=false, award=false), **When** migration runs, **Then** the same status is reflected in the migrated stakeholder's tender progress.

---

### Edge Cases

- What happens when user clicks "Generate" on a project with no Profile completed? System shows validation message requiring Profile completion first.
- How does system handle duplicate stakeholder entries (same subgroup, same firm)? Allow duplicates without warning - valid use case for multiple contacts from same firm (e.g., 5 architects from one firm) for distribution lists (meeting minutes, reports).
- What happens if a stakeholder is deleted but has Cost Plan line associations? Soft-delete stakeholder, preserve Cost Plan links with "(Deleted)" indicator.
- How does system handle very large stakeholder counts (50+ per group)? Table virtualization with pagination after 25 rows.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST support 4 stakeholder groups: Client, Authority, Consultant, Contractor
- **FR-002**: System MUST allow subgroups within each group:
  - Client: Owner, Tenant, Project Manager, Superintendent, Quantity Surveyor, Other
  - Authority: Council, FRNSW, TfNSW, EPA, Heritage NSW, NSW Planning, Access, Other
  - Consultant: Architecture, Structural, Civil, Mechanical, Electrical, Hydraulic, Fire, Facade, Acoustic, Traffic, Landscape, Interior Design, BCA, Access, Surveyor, Other
  - Contractor: (Trade-based, dynamically populated from project requirements)
- **FR-003**: System MUST provide AI-powered stakeholder generation using Profile and Objectives context
- **FR-004**: System MUST display stakeholder counts per group in the left navigation panel
- **FR-005**: System MUST support the 4-stage tender process (Brief, Tender, Rec, Award) for Consultant and Contractor groups only
- **FR-006**: System MUST allow inline editing of stakeholder details (firm name, contact person, email, phone, notes)
- **FR-007**: System MUST integrate Award stage completion with Cost Plan line items and Companies table
- **FR-008**: System MUST support Authority-specific submission status (Pending, Submitted, Approved, Rejected)
- **FR-009**: System MUST migrate existing consultant disciplines and contractor trades to the new schema
- **FR-010**: System MUST preserve all existing data during migration (tender statuses, firm associations, brief/scope data)
- **FR-011**: System MUST visually distinguish AI-generated vs manually-added stakeholders
- **FR-012**: System MUST support stakeholder enable/disable toggle (carries over from existing discipline/trade behavior)
- **FR-013**: System MUST soft-delete stakeholders to preserve Cost Plan and document references

### Key Entities

- **Stakeholder**: Represents a party involved in the project. Has group, subgroup, firm details, contact info, and workflow status. Central entity replacing consultantDisciplines/contractorTrades.
- **StakeholderGroup**: Enum of four values (Client, Authority, Consultant, Contractor) determining workflow behavior.
- **TenderStatus**: For Consultant/Contractor groups, tracks 4-stage procurement process.
- **SubmissionStatus**: For Authority group, tracks regulatory approval workflow.
- **StakeholderFirm**: Links stakeholder to Companies table for cost tracking integration.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can view and manage all stakeholders across 4 groups from a single unified interface
- **SC-002**: AI generation populates 80% of expected stakeholders correctly based on project profile (measured by user acceptance rate)
- **SC-003**: Stakeholder section loads and displays within 2 seconds for projects with up to 100 stakeholders
- **SC-004**: Existing consultant/contractor data is migrated with 100% data preservation (no manual re-entry required)
- **SC-005**: Users report reduced time to set up project stakeholders by 60% compared to previous dual-list system
- **SC-006**: Tender stage transitions update instantly with optimistic UI (confirmed within 500ms)
- **SC-007**: Cost Plan integration triggers correctly on 100% of Award completions with firm association
