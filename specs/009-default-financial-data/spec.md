# Feature Specification: Default Financial Data Initialization

**Feature Branch**: `009-default-financial-data`
**Created**: 2025-12-06
**Status**: Draft
**Input**: User description: "Default financial data initialization when creating a new project so cost plan, variations and invoices tables are pre-populated with typical data"

---

## 1. Overview

### 1.1 Purpose

When a user creates a new project, the Cost Planning module should be pre-populated with a standard set of financial data that reflects typical construction project cost structures. This reduces setup time and provides a familiar starting template that users can customize.

### 1.2 Problem Statement

Currently, when a user creates a new project and opens the Cost Planning module:
- The Cost Plan table is empty
- The Variations table is empty
- The Invoices table is empty

Users must manually create all cost line items from scratch, which is time-consuming and error-prone. Most construction projects follow similar cost structures, so providing sensible defaults improves user experience and adoption.

### 1.3 Solution

Initialize default financial data at project creation time, including:
- **Cost Lines**: Standard budget line items organized by section (FEES, CONSULTANTS, CONSTRUCTION, CONTINGENCY)
- **Variations**: Sample variation to demonstrate linking functionality
- **Invoices**: Sample invoice to demonstrate linking functionality

---

## User Scenarios & Testing

### User Story 1 - Pre-populated Cost Plan (Priority: P1)

As a Project Manager, when I create a new project and navigate to the Cost Planning module, I want to see a pre-populated cost plan with typical budget line items organized by section, so I can immediately start customizing amounts rather than building the structure from scratch.

**Why this priority**: This is the core value proposition - reducing setup time from hours to minutes for the most commonly used module.

**Independent Test**: Can be fully tested by creating a new project and verifying the Cost Plan tab shows pre-populated cost line items across 4 sections with nominal default amounts.

**Acceptance Scenarios**:

1. **Given** a user has the project creation dialog open, **When** they submit a new project, **Then** the cost_lines table is populated with default entries for FEES, CONSULTANTS, CONSTRUCTION, and CONTINGENCY sections.

2. **Given** a newly created project, **When** the user opens the Cost Plan tab, **Then** they see 4 collapsible sections with typical line items already present.

3. **Given** a newly created project with default cost lines, **When** the user views the Cost Plan, **Then** all items have nominal budget amounts pre-filled totaling $900,000.

---

### User Story 2 - Sensible Section Organization (Priority: P1)

As a Project Manager, I want the default cost lines to be organized into industry-standard sections (FEES, CONSULTANTS, CONSTRUCTION, CONTINGENCY) with appropriate items in each, so the structure matches how I think about project finances.

**Why this priority**: Proper section organization is essential for the cost plan to be usable; incorrect categorization would require manual fixing.

**Independent Test**: Can be verified by checking each section contains relevant line items (e.g., "Council Fees" in FEES, "Project Manager" in CONSULTANTS).

**Acceptance Scenarios**:

1. **Given** a new project, **When** viewing the FEES section, **Then** it contains items like "Council Fees", "Section 7.12 Levy", "Long Service Leave Levy" with nominal amounts.

2. **Given** a new project, **When** viewing the CONSULTANTS section, **Then** it contains items like "Project Manager", "Architect", "Town Planner", "BCA Consultant", etc.

3. **Given** a new project, **When** viewing the CONTINGENCY section, **Then** it contains "Construction Contingency".

---

### User Story 3 - Delete or Modify Default Items (Priority: P1)

As a Project Manager, I want to be able to delete default cost lines that don't apply to my project, so I can customize the cost plan to my specific needs.

**Why this priority**: Every project is different; forcing users to keep irrelevant line items would be frustrating.

**Independent Test**: Delete a default cost line and verify it is removed; edit a description and verify it persists.

**Acceptance Scenarios**:

1. **Given** a default cost line item, **When** the user right-clicks and selects "Delete Row", **Then** the item is removed from the cost plan.

2. **Given** a default cost line item, **When** the user edits the description or amount, **Then** the changes are saved and persist.

---

### User Story 4 - Sample Variation and Invoice (Priority: P2)

As a Project Manager, I want to see a sample variation and invoice in my new project, so I understand how linking between cost lines, variations, and invoices works.

**Why this priority**: Demonstrating the linking workflow helps users understand the system's capabilities.

**Independent Test**: Create a new project, verify sample variation and invoice exist and are linked to a cost line.

**Acceptance Scenarios**:

1. **Given** a new project, **When** the user opens the Variations tab, **Then** they see one sample variation linked to "Construction Contingency".

2. **Given** a new project, **When** the user opens the Invoices tab, **Then** they see one sample invoice linked to a consultant cost line.

3. **Given** the sample variation and invoice, **When** the user views them, **Then** they can delete them if not needed.

---

### User Story 5 - Automatic Cost Code Generation (Priority: P2)

As a Project Manager, I want default cost lines to have sensible cost codes pre-assigned, so I can quickly reference items without manually numbering them.

**Why this priority**: Cost codes aid navigation and reporting; having them pre-assigned saves time.

**Independent Test**: Verify default cost lines have cost codes like "1.01", "1.02", "2.01", etc.

**Acceptance Scenarios**:

1. **Given** a new project with default cost lines, **When** viewing the FEES section, **Then** items have cost codes "1.01", "1.02", "1.03", etc.

2. **Given** a new project with default cost lines, **When** viewing the CONSULTANTS section, **Then** items have cost codes "2.01", "2.02", "2.03", etc.

---

### Edge Cases

- What happens when a project is duplicated? Default: Copy the current cost plan, not use defaults.
- How does this interact with the existing project initialization (008-project-initialization)? It extends the same transaction.
- What if a user wants to start with a truly empty cost plan? They can delete all items; future: add "Start Empty" option.

---

## Requirements

### Functional Requirements

- **FR-001**: System MUST create default cost line items when a new project is created.
- **FR-002**: System MUST organize default cost lines into 4 sections: FEES, CONSULTANTS, CONSTRUCTION, CONTINGENCY.
- **FR-003**: Each default cost line MUST have a description, cost code, section assignment, and sort order.
- **FR-004**: All cost line items MUST have nominal budget amounts pre-filled (total $900,000).
- **FR-005**: Default cost lines MUST be deletable by the user.
- **FR-006**: Default cost lines MUST be editable by the user.
- **FR-007**: System MUST create one sample variation linked to "Construction Contingency".
- **FR-008**: System MUST create one sample invoice linked to a consultant cost line.
- **FR-009**: Default data initialization MUST be part of the same transaction as project creation (atomic operation).
- **FR-010**: System MUST NOT create duplicate default data if initialization is called multiple times.
- **FR-011**: System MUST rename existing "PC_ITEMS" section to "CONSTRUCTION" across all project documents.

### Key Entities

- **Default Cost Line Template**: A pre-defined set of cost line configurations that serve as the template for new projects.
- **Section**: One of FEES, CONSULTANTS, CONSTRUCTION, CONTINGENCY - each containing related cost lines.
- **Sample Variation**: A demonstration variation to show linking workflow.
- **Sample Invoice**: A demonstration invoice to show linking workflow.

---

## Default Data Definition

### FEES Section (Section ID: "FEES", Cost Codes: 1.xx)

| Cost Code | Description | Default Budget | Notes |
|-----------|-------------|----------------|-------|
| 1.01 | Council Fees | $25,000 | Development application fees |
| 1.02 | Section 7.12 Levy | $50,000 | Infrastructure contributions (NSW) |
| 1.03 | Long Service Leave Levy | $15,000 | LSL contribution (~2.35% of contract) |
| 1.04 | Authority Fees | $10,000 | Water, power, gas connection fees |

**Total: 4 items | Default Budget: $100,000**

### CONSULTANTS Section (Section ID: "CONSULTANTS", Cost Codes: 2.xx)

| Cost Code | Description | Default Budget | Notes |
|-----------|-------------|----------------|-------|
| 2.01 | Project Manager | $50,000 | PM fees through all stages |
| 2.02 | Architect | $80,000 | Design and documentation |
| 2.03 | Town Planner | $15,000 | Planning approvals, DA preparation |
| 2.04 | Structural | $25,000 | Structural design |
| 2.05 | Civil Engineer | $15,000 | Site works, drainage |
| 2.06 | Surveyor | $8,000 | Site survey, setout |
| 2.07 | BCA Consultant | $12,000 | Building Code Australia compliance |
| 2.08 | Building Certifier | $20,000 | Certification and inspections |
| 2.09 | Quantity Surveyor | $25,000 | Cost estimation, BoQ |
| 2.10 | Fire Engineer | $15,000 | Fire safety engineering |

**Total: 10 items | Default Budget: $265,000**

### CONSTRUCTION Section (Section ID: "CONSTRUCTION", Cost Codes: 3.xx)

> **Note**: This section was previously named "PC_ITEMS". All existing project documents will be updated.

| Cost Code | Description | Default Budget | Notes |
|-----------|-------------|----------------|-------|
| 3.01 | Prelims & Margin | $150,000 | Preliminaries and contractor margin |
| 3.02 | Fitout Works | $200,000 | Tenant fitout allowance |
| 3.03 | FF&E | $50,000 | Furniture, fixtures, equipment |
| 3.04 | IT/AV Systems | $30,000 | Technology, audiovisual |
| 3.05 | Landscaping | $25,000 | Soft and hard landscaping |

**Total: 5 items | Default Budget: $455,000**

### CONTINGENCY Section (Section ID: "CONTINGENCY", Cost Codes: 4.xx)

| Cost Code | Description | Default Budget | Notes |
|-----------|-------------|----------------|-------|
| 4.01 | Construction Contingency | $80,000 | Typically 5-10% of construction costs |

**Total: 1 item | Default Budget: $80,000**

---

**Grand Total: 20 default cost line items | Total Default Budget: $900,000**

---

## Sample Data Definition

### Sample Variation

| Field | Value |
|-------|-------|
| Variation Number | PV-001 |
| Category | Principal |
| Description | Sample variation - delete if not needed |
| Status | Forecast |
| Amount Forecast | $10,000 |
| Amount Approved | $0 |
| Cost Line Link | 4.01 - Construction Contingency |
| Requested By | System |
| Date Submitted | (Project creation date) |

### Sample Invoice

| Field | Value |
|-------|-------|
| Invoice Number | INV-SAMPLE-001 |
| Company | (None - unlinked) |
| Description | Sample invoice - delete if not needed |
| Amount | $1,000 |
| GST | $100 |
| Cost Line Link | 2.01 - Project Manager |
| Period | (Current month/year) |
| Paid Status | Unpaid |
| Invoice Date | (Project creation date) |

---

## Success Criteria

### Measurable Outcomes

- **SC-001**: New projects have cost plan pre-populated with 20 line items within 2 seconds of project creation.
- **SC-002**: All sections display with nominal budget amounts totaling $900,000.
- **SC-003**: 100% of default cost lines are deletable and editable by users.
- **SC-004**: Cost Plan sections (FEES, CONSULTANTS, CONSTRUCTION, CONTINGENCY) display correctly with proper grouping.
- **SC-005**: Sample variation and invoice are created and linked correctly.
- **SC-006**: Default data creation is atomic with project creation - if project creation fails, no orphan data exists.

---

## Implementation Notes

### Integration with Existing Project Initialization

This feature extends the existing project initialization logic in `POST /api/projects/route.ts` defined in [008-project-initialization](../008-project-initialization/spec.md). The transaction should:

1. Create project record
2. Initialize consultant disciplines (existing - 36 items)
3. Initialize contractor trades (existing - 21 items)
4. Initialize project stages (existing - 5 items)
5. Initialize project details (existing - 1 record)
6. Initialize project objectives (existing - 1 record)
7. **NEW: Initialize default cost lines (20 items)**
8. **NEW: Initialize sample variation (1 item)**
9. **NEW: Initialize sample invoice (1 item)**

### Data Constants

Define default cost line configurations in a constants file:
- Location: `src/lib/constants/default-cost-lines.ts`
- Export: `DEFAULT_COST_LINES: { section, costCode, description, budgetCents, sortOrder }[]`

### Schema Update Required

The `cost_lines.section` enum must be updated:
- Change `PC_ITEMS` to `CONSTRUCTION`
- Location: `src/lib/db/schema.ts`
- Requires database migration

### Migration for Existing Projects

This feature should **NOT** backfill existing projects with default cost lines:
- Existing projects may have already customized their cost plans
- Only apply defaults to newly created projects going forward

However, the PC_ITEMS → CONSTRUCTION rename MUST be applied to existing data via migration.

---

## Breaking Changes

### PC_ITEMS → CONSTRUCTION Rename

The following files need to be updated:

**Already Updated (spec phase):**
- [x] `src/lib/db/schema.ts` - enum updated
- [x] `specs/006-cost-planning/spec.md` - section references updated

**To Be Updated (implementation phase):**

| File | Changes Required |
|------|------------------|
| `src/types/cost-plan.ts` | Update `CostLineSection` type and `SECTION_LABELS` |
| `src/app/projects/[projectId]/cost-plan/page.tsx` | Update dropdown option |
| `src/app/cost-plan-poc/page.tsx` | Update section type and labels |
| `src/components/cost-plan/cells/CostLineDropdown.tsx` | Update section mapping |
| `src/lib/calculations/variance.ts` | Update sections array |
| `src/components/cost-plan/CostPlanPanel.tsx` | Update SECTION_DISPLAY_NAMES and SECTIONS |
| `src/components/cost-plan/CostPlanSheet.tsx` | Update SECTION_NAMES and sections array |
| `src/lib/calculations/cost-plan-formulas.ts` | Update sections array |
| `src/components/cost-plan/dialogs/ColumnMappingDialog.tsx` | Update section description |
| `src/lib/calculations/aggregations.ts` | Update sections arrays (2 locations) |
| `src/lib/fortune-sheet/row-groups.ts` | Update SECTIONS, SECTION_NAMES, SECTION_ICONS |
| `src/components/cost-plan/sheets/ProjectSummarySheet.tsx` | Update SECTIONS array |

**Database Migration Required:**
- Update existing `cost_lines.section` values from `'PC_ITEMS'` to `'CONSTRUCTION'`

---

## Assumptions

- The 20 default line items are appropriate for typical Australian construction projects.
- Organizations with different needs can delete/modify items after project creation.
- No organization-level customization of defaults is required in v1.
- All sections have nominal budget amounts totaling $900,000 as a starting template.
- Cost codes follow a simple section.item pattern (1.01, 2.01, etc.).
- Sample variation and invoice help users understand the linking workflow.

---

## Out of Scope (v1)

- Organization-specific default templates
- Project type-specific templates (residential vs commercial vs infrastructure)
- Importing defaults from a previous project
- AI-generated cost line suggestions based on project description
- "Start with empty cost plan" option

---

**Document Version**: 1.1.0
**Author**: Claude
**Date**: 2025-12-06
**Status**: Draft
