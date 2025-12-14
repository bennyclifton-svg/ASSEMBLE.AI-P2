# Feature Specification: TRR Report

**Feature Branch**: `012-trr-report`
**Created**: 2025-12-13
**Status**: Draft
**Parent Feature**: 004-procurement
**Input**: User description: "Create TRR report in Procurement section with SHORT and LONG tabs for assembling a Tender Recommendation Report"

## Overview

The TRR (Tender Recommendation Report) is a new report type within the Procurement section, located directly below the EVALUATION report. It enables Project Managers to quickly assemble a tender recommendation report by incorporating project planning data, data from other reports (RFT, Addendum, and Evaluation), and is specific to each discipline or trade. The report can be exported to PDF and Word in a clean, well-formatted document.

## User Scenarios & Testing

### User Story 1 - View TRR Report Structure (Priority: P1)

As a Project Manager, I want to open the TRR section in a discipline/trade tab and see the complete report structure with all sections populated from existing project data, so that I can quickly assemble a tender recommendation without re-entering information.

**Why this priority**: This is the core functionality - the report must aggregate data from multiple sources to provide value.

**Independent Test**: Can be fully tested by opening a discipline/trade tab with existing RFT, Addendum, and Evaluation data and verifying all sections display the correct information.

**Acceptance Scenarios**:

1. **Given** a discipline has RFT data, **When** I open the TRR section, **Then** I see the Header Table with Project Name, Address, Document title, and Date
2. **Given** Addenda exist for the discipline, **When** I view the Addendum Table section, **Then** I see a table listing each addendum with its number, date, and summary
3. **Given** Evaluation data exists with price tables, **When** I view the Evaluation Price section, **Then** I see the same tables displayed in the Evaluation report

---

### User Story 2 - Edit Editable Text Sections (Priority: P1)

As a Project Manager, I want to enter custom text in the Executive Summary, Clarifications, and Recommendation sections, so that I can provide narrative context and my professional recommendation.

**Why this priority**: Essential for the report to have meaningful narrative content beyond aggregated data.

**Independent Test**: Can be fully tested by entering text in each editable section and verifying it persists and appears in exports.

**Acceptance Scenarios**:

1. **Given** the TRR section is open, **When** I click the Executive Summary text area, **Then** I can enter and format text with the same editor used in Brief/Services sections
2. **Given** I enter text in the Clarifications section, **When** I click away, **Then** the text auto-saves
3. **Given** I have entered text in all three editable sections, **When** I export to PDF, **Then** all entered text appears in the exported document

---

### User Story 3 - View Tender Process Table (Priority: P1)

As a Project Manager, I want to see a Tender Process table showing all firms in the discipline/trade gallery with visual highlighting for shortlisted firms, so that I can document which firms participated in the tender process.

**Why this priority**: Critical for tender documentation - shows the tender process history.

**Independent Test**: Can be fully tested by viewing the Tender Process table and verifying it lists all firms with correct shortlist highlighting.

**Acceptance Scenarios**:

1. **Given** 5 firms exist for a discipline with 3 shortlisted, **When** I view the Tender Process table, **Then** all 5 firms are listed and the 3 shortlisted firms are highlighted with a star icon (same icon used in Firm Card)
2. **Given** the RFT has a date, **When** I view the Tender Process table, **Then** the RFT issue date is displayed in the last column for each firm row, with a clickable calendar date picker allowing per-firm date override (to handle late tender releases)
3. **Given** a firm received the tender invitation, **When** I view the Tender Process table, **Then** that firm shows the star indicator


---

### User Story 4 - Export TRR Report (Priority: P1)

As a Project Manager, I want to export the complete TRR report to PDF or Word format, so that I can share it with stakeholders and include it in official documentation.

**Why this priority**: The primary output of this feature - without export, the report cannot be used externally.

**Independent Test**: Can be fully tested by populating all sections and exporting to both PDF and Word, verifying all content appears correctly formatted.

**Acceptance Scenarios**:

1. **Given** all TRR sections have data, **When** I click Export PDF, **Then** a professionally formatted PDF downloads with all sections in the correct order
2. **Given** I export to Word, **When** I open the document, **Then** it is editable and maintains the same structure as the PDF
3. **Given** the Header Table includes Date, **When** I export, **Then** the Date appears on the same row as Document title, aligned to the right

---

### User Story 5 - Manage Attachments/Transmittal (Priority: P2)

As a Project Manager, I want to attach documents to the TRR report using the same transmittal functionality as other reports, so that I can include supporting documentation.

**Why this priority**: Enhances the report but builds on existing transmittal patterns.

**Independent Test**: Can be fully tested by saving documents to the TRR transmittal and verifying they appear in the Attachments section.

**Acceptance Scenarios**:

1. **Given** documents are selected in the document repository, **When** I click Save Transmittal in the TRR section, **Then** those documents are saved to the TRR's transmittal
2. **Given** a TRR has saved transmittal documents, **When** I view the Attachments section, **Then** I see a table listing all attached documents with name, revision, and date
3. **Given** I export to PDF, **When** the export completes, **Then** the Attachments table is included in the document

---

### User Story 6 - Switch Between SHORT and LONG Tabs (Priority: P2)

As a Project Manager, I want to switch between SHORT and LONG tabs in the TRR section, so that I can generate either a concise summary report or a comprehensive detailed report.

**Why this priority**: Provides flexibility but SHORT tab delivers core value. The LONG format will use RAG from the knowledge libraries and is reserved for future implementation.

**Independent Test**: Can be fully tested by switching between tabs and verifying different content is displayed.

**Acceptance Scenarios**:

1. **Given** the TRR section is open, **When** I click the SHORT tab, **Then** the concise report format is displayed
2. **Given** I am on the SHORT tab, **When** I click the LONG tab, **Then** a placeholder message indicates future implementation (LONG will draw on parsed source documents via RAG)
3. **Given** I switch tabs multiple times, **When** I return to SHORT, **Then** any entered text (Executive Summary, etc.) is preserved

---

### Edge Cases

- What happens when no RFT exists for the discipline/trade? (Show empty/placeholder for RFT-related sections with message "RFT not created")
- How does system handle disciplines/trades with no firms? (Show Tender Process table with "No firms added" message)
- What if Evaluation data doesn't exist? (Show Evaluation Price section with "No evaluation data" message)
- Maximum number of addenda to display? (Display all addenda)
- What if RFT date is not set? (Display empty cell)

## Requirements

### Functional Requirements

#### Report Location and Structure

| ID | Requirement |
|----|-------------|
| FR-001 | System MUST display a "TRR" section directly below the EVALUATION section in each discipline/trade tab |
| FR-002 | TRR section MUST match the styling of RFT, Addendum, and Evaluation sections (FileText icon, blue highlight, collapsible triangle, dark theme) |
| FR-003 | TRR section MUST have two tabs: SHORT and LONG |
| FR-004 | LONG tab MUST display placeholder content "Coming in future release" |
| FR-005 | System MUST provide Export PDF and Export Word buttons consistent with other report sections |

#### SHORT Tab - Header Table

| ID | Requirement |
|----|-------------|
| FR-006 | SHORT tab MUST display a Header Table at the top with the following rows: Project Name (from Planning Card), Address (from Planning Card), and a row containing Document title ("TRR [Discipline Name]") on the left and Date on the right |
| FR-007 | Date field MUST display the current date or a user-selected date |
| FR-008 | Header Table styling MUST match RFT and Addendum header tables |

#### SHORT Tab - Executive Summary

| ID | Requirement |
|----|-------------|
| FR-009 | System MUST display an "Executive Summary" section with heading below the Header Table |
| FR-010 | Executive Summary MUST provide a rich text editor for user input |
| FR-011 | Rich text editor MUST match the styling of Brief/Services text editors (multi-line, basic formatting) |
| FR-012 | Executive Summary content MUST auto-save on blur |

#### SHORT Tab - Tender Process Table

| ID | Requirement |
|----|-------------|
| FR-013 | System MUST display a "Tender Process" section with heading |
| FR-014 | Tender Process MUST display a table listing all firms in the discipline/trade gallery |
| FR-015 | Table MUST include columns: Company Name, Contact, Shortlisted (star icon indicator), Tender Received (date field) |
| FR-016 | Shortlisted firms MUST be visually highlighted with star icon (same icon used in Firm Card) |
| FR-017 | Table MUST display the RFT issue date in the last column for each firm row, with clickable calendar date picker allowing per-firm date override |
| FR-018 | System MUST add a "Date" field to the RFT report header if not already present |

#### SHORT Tab - Addendum Table

| ID | Requirement |
|----|-------------|
| FR-019 | System MUST display an "Addendum Table" section with heading |
| FR-020 | Addendum Table MUST list all addenda for the discipline/trade with columns: Addendum Number, Summary, Date |
| FR-021 | Summary MUST be extracted from or linked to the addendum content (first 100 characters or user-defined summary) |
| FR-022 | System MUST add a "Date" field to the Addendum report header if not already present |
| FR-023 | If no addenda exist, display "No addenda issued" message |

#### SHORT Tab - Evaluation Price

| ID | Requirement |
|----|-------------|
| FR-024 | System MUST display an "Evaluation Price" section with heading |
| FR-025 | Evaluation Price MUST display the same tables as configured in the Evaluation report PRICE tab |
| FR-026 | Tables MUST be read-only in the TRR view (editing done in Evaluation section) |
| FR-027 | If no evaluation data exists, display "No price evaluation completed" message |

#### SHORT Tab - Evaluation Non-Price

| ID | Requirement |
|----|-------------|
| FR-028 | System MUST display an "Evaluation Non-Price" section with heading |
| FR-029 | Section MUST display placeholder content "Non-price evaluation not yet implemented" until NON-PRICE tab is built in Evaluation |
| FR-030 | When NON-PRICE evaluation exists, display that data in read-only format |

#### SHORT Tab - Clarifications

| ID | Requirement |
|----|-------------|
| FR-031 | System MUST display a "Clarifications" section with heading |
| FR-032 | Clarifications MUST provide a rich text editor for user input |
| FR-033 | Rich text editor MUST match the styling of other text editors in the system |
| FR-034 | Clarifications content MUST auto-save on blur |

#### SHORT Tab - Recommendation

| ID | Requirement |
|----|-------------|
| FR-035 | System MUST display a "Recommendation" section with heading |
| FR-036 | Recommendation MUST provide a rich text editor for user input |
| FR-037 | Rich text editor MUST match the styling of other text editors in the system |
| FR-038 | Recommendation content MUST auto-save on blur |

#### SHORT Tab - Attachments

| ID | Requirement |
|----|-------------|
| FR-039 | System MUST display an "Attachments" section with heading |
| FR-040 | Attachments MUST display a table of documents saved to the TRR transmittal |
| FR-041 | Table MUST include columns: Document Name, Revision, Date |
| FR-042 | Save/Load Transmittal buttons MUST appear in the TRR section header (matching other report sections) |
| FR-043 | Transmittal MUST be independent from RFT, Addendum, and Evaluation transmittals |

#### Data Persistence

| ID | Requirement |
|----|-------------|
| FR-044 | System MUST persist all TRR editable content (Executive Summary, Clarifications, Recommendation, Date) to database |
| FR-045 | System MUST auto-save changes with debounce (consistent with other sections) |
| FR-046 | System MUST load persisted data when TRR section is opened |

#### Export

| ID | Requirement |
|----|-------------|
| FR-047 | PDF export MUST include all sections in order: Header Table, Executive Summary, Tender Process, Addendum Table, Evaluation Price, Evaluation Non-Price, Clarifications, Recommendation, Attachments |
| FR-048 | Word export MUST produce an editable document with the same structure as PDF |
| FR-049 | Export filename MUST follow format: `TRR [Discipline Name].pdf/docx` |

### Key Entities

- **TRR**: One TRR report per discipline/trade per project (similar to RFT NEW and Evaluation)
  - id, projectId, disciplineId/tradeId, executiveSummary, clarifications, recommendation, reportDate, createdAt, updatedAt

- **TRRTransmittal**: Documents attached to a TRR report
  - id, trrId, documentId, addedAt

## Success Criteria

### Measurable Outcomes

- **SC-001**: Users can view a complete TRR report with all aggregated data in under 3 seconds
- **SC-002**: Users can enter and save Executive Summary, Clarifications, and Recommendation text in under 2 minutes total
- **SC-003**: 100% of data from RFT, Addendum, and Evaluation is correctly displayed in TRR when those reports exist
- **SC-004**: Export to PDF produces a professionally formatted document that matches the on-screen layout
- **SC-005**: Export to Word produces an editable document that can be modified in Microsoft Word
- **SC-006**: 100% of entered data persists correctly after page refresh
- **SC-007**: TRR section appears in the correct location (below Evaluation, above nothing) in the discipline/trade tab

## Assumptions

1. RFT, Addendum, and Evaluation features are already implemented and functional
2. Date fields will be added to RFT and Addendum report headers as part of this feature or as a prerequisite
3. The existing transmittal infrastructure can be reused for TRR attachments
4. Rich text editor component exists and can be reused from Brief/Services sections
5. Export utilities (pdf-enhanced.ts) can be extended for TRR-specific formatting
6. FortuneSheet tables in Evaluation can be rendered as read-only for display in TRR

## Dependencies

- Feature 004 (Procurement) - parent feature, provides discipline/trade tabs and section location
- Feature 004 RFT NEW - for RFT data (Header table, date)
- Feature 004 Addendum - for addendum data (number, date, content)
- Feature 011 (Evaluation Report) - for evaluation price data
- Existing export utilities (pdf-enhanced.ts, docx-enhanced.ts) - for PDF/Word export
- Document Repository - for transmittal/attachments functionality

## UI Layout Reference

```
+---------------------------------------------------------------------------+
|  TRR                                    [Save Transmittal] [Load Transmittal]
|  > (collapsed) / v (expanded)
+---------------------------------------------------------------------------+
|  [ SHORT ] [ LONG ]                        [Export PDF] [Export Word]
+---------------------------------------------------------------------------+
|
|  +-----------------------------------------------------------------------+
|  | Project Name  | Riverstone Gateway Commercial Hub                     |
|  +---------------+-------------------------------------------------------+
|  | Address       | 42-48 Station Street, Riverstone NSW 2765             |
|  +---------------+------------------------------------------+------------+
|  | Document      | TRR Fire Services                        | 13/12/2025 |
|  +---------------+------------------------------------------+------------+
|
|  EXECUTIVE SUMMARY
|  +-----------------------------------------------------------------------+
|  |                                                                       |
|  |  [Rich text editor - user enters summary here]                        |
|  |                                                                       |
|  +-----------------------------------------------------------------------+
|
|  TENDER PROCESS
|  +----------------+----------------+-------+------------+
|  | Company        | Contact        | Short | RFT Date   |
|  +----------------+----------------+-------+------------+
|  | Acme Corp      | John Smith     |  ★    | 01/12/2025 |  <- Star = shortlisted
|  | BuildCo        | Jane Doe       |  ★    | 01/12/2025 |  <- Star = shortlisted
|  | Construct Inc  | Bob Wilson     |       | 03/12/2025 |  <- Override date (late release)
|  +----------------+----------------+-------+------------+
|  Note: RFT Date is clickable calendar picker, defaults to RFT issue date
|
|  ADDENDUM TABLE
|  +-------------+------------------------------------------------+------------+
|  | Addendum #  | Summary                                        | Date       |
|  +-------------+------------------------------------------------+------------+
|  | 01          | Revised scope for mechanical works...          | 05/12/2025 |
|  | 02          | Clarification on electrical specifications...  | 10/12/2025 |
|  +-------------+------------------------------------------------+------------+
|
|  EVALUATION PRICE
|  +------------------+--------------+--------------+--------------+
|  | Description      | Acme Corp    | BuildCo      | Construct    |
|  +------------------+--------------+--------------+--------------+
|  | Design Fees      | $50,000      | $55,000      | $48,000      |
|  | Documentation    | $20,000      | $22,000      | $19,000      |
|  +------------------+--------------+--------------+--------------+
|  | SUB-TOTAL        | $70,000      | $77,000      | $67,000      |
|  +------------------+--------------+--------------+--------------+
|  | GRAND TOTAL      | $70,000      | $77,000      | $67,000      |
|  +==================+==============+==============+==============+
|
|  EVALUATION NON-PRICE
|  +-----------------------------------------------------------------------+
|  |  Non-price evaluation not yet implemented                             |
|  +-----------------------------------------------------------------------+
|
|  CLARIFICATIONS
|  +-----------------------------------------------------------------------+
|  |                                                                       |
|  |  [Rich text editor - user enters clarifications here]                 |
|  |                                                                       |
|  +-----------------------------------------------------------------------+
|
|  RECOMMENDATION
|  +-----------------------------------------------------------------------+
|  |                                                                       |
|  |  [Rich text editor - user enters recommendation here]                 |
|  |                                                                       |
|  +-----------------------------------------------------------------------+
|
|  ATTACHMENTS
|  +-----------------------------------------------+----------+------------+
|  | Document                                      | Rev      | Date       |
|  +-----------------------------------------------+----------+------------+
|  | Fire_Services_Tender_Submission_Acme.pdf      | 1        | 12/12/2025 |
|  | BuildCo_Fee_Proposal.pdf                      | 2        | 12/12/2025 |
|  +-----------------------------------------------+----------+------------+
|
+---------------------------------------------------------------------------+
```

## Database Schema

### Table: `trr`

```sql
CREATE TABLE trr (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL REFERENCES projects(id),
    discipline_id TEXT REFERENCES consultant_disciplines(id),
    trade_id TEXT REFERENCES contractor_trades(id),
    executive_summary TEXT,
    clarifications TEXT,
    recommendation TEXT,
    report_date TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,

    CHECK (
        (discipline_id IS NOT NULL AND trade_id IS NULL) OR
        (discipline_id IS NULL AND trade_id IS NOT NULL)
    ),
    UNIQUE (project_id, discipline_id),
    UNIQUE (project_id, trade_id)
);
```

### Table: `trr_transmittals`

```sql
CREATE TABLE trr_transmittals (
    id TEXT PRIMARY KEY,
    trr_id TEXT NOT NULL REFERENCES trr(id) ON DELETE CASCADE,
    document_id TEXT NOT NULL REFERENCES documents(id),
    added_at TEXT DEFAULT CURRENT_TIMESTAMP
);
```

### Schema Updates Required

**RFT NEW Table** - Add date field:
```sql
ALTER TABLE rft_new ADD COLUMN rft_date TEXT;
```

**Addendum Table** - Add date field:
```sql
ALTER TABLE addenda ADD COLUMN addendum_date TEXT;
```

## API Routes

### GET `/api/trr`
**Query Parameters**:
- `projectId` (required)
- `disciplineId` (optional - for consultants)
- `tradeId` (optional - for contractors)

**Response**: Single TRR object (creates one if it doesn't exist - get-or-create pattern)

### PUT `/api/trr/[id]`
**Body**:
```json
{
    "executiveSummary": "text",
    "clarifications": "text",
    "recommendation": "text",
    "reportDate": "2025-12-13"
}
```

### POST `/api/trr/[id]/export`
**Body**:
```json
{
    "format": "pdf" | "docx"
}
```

### GET `/api/trr/[id]/transmittal`
Get all documents in the transmittal for this TRR.

### POST `/api/trr/[id]/transmittal`
**Body**:
```json
{
    "documentIds": ["uuid1", "uuid2", ...]
}
```

## Implementation Notes

1. **Data Aggregation**: TRR aggregates data from multiple sources:
   - Header Table: Project details + current date
   - Tender Process: Consultants/Contractors for the discipline/trade
   - Addendum Table: All addenda for the discipline/trade
   - Evaluation Price: Evaluation tables for the discipline/trade

2. **Read-Only Sections**: Tender Process, Addendum Table, and Evaluation Price sections display data but cannot be edited in the TRR view. Users must edit in the source sections (Firms gallery, Addendum section, Evaluation section).

3. **Editable Sections**: Executive Summary, Clarifications, and Recommendation are free-form text entry specific to the TRR.

4. **Date Requirements**: This feature requires adding Date fields to RFT and Addendum headers. This should be implemented as part of this feature or as a prerequisite task.

## Out of Scope

- LONG tab implementation (placeholder for future)
- NON-PRICE evaluation display (depends on Evaluation NON-PRICE tab implementation)
- Automated recommendation generation
- Multi-language support
- Version history for TRR content
- Approval workflow

## Notes

- TRR follows the same collapsible section pattern as RFT, Addendum, and Evaluation
- The report is designed to be assembled quickly by aggregating existing data
- Export formatting should prioritize professional appearance for client-facing documents
- The SHORT tab provides a concise tender recommendation; LONG tab reserved for detailed analysis
