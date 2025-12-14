# Feature Specification: Evaluation Report

**Feature Branch**: `011-evaluation-report`
**Created**: 2025-12-12
**Status**: Draft
**Parent Feature**: 004-procurement
**Input**: User description: "Create Evaluation report in Procurement section with PRICE and NON-PRICE tabs for tender evaluation with AI-powered document parsing"

## Overview

The EVALUATION report is a new report type within the Procurement section, located directly below the ADDENDUM report. It enables Project Managers to evaluate tender submissions from short-listed firms by comparing their pricing proposals side-by-side using FortuneSheet tables with automatic document parsing capabilities.

## User Scenarios & Testing

### User Story 1 - View Price Evaluation Tables (Priority: P1)

As a Project Manager, I want to open the PRICE tab and see two FortuneSheet tables with short-listed firms displayed as columns side-by-side, so that I can compare their pricing proposals at a glance.

**Why this priority**: This is the core functionality - without the tables, no evaluation can occur.

**Independent Test**: Can be fully tested by opening a discipline/trade tab with short-listed firms and clicking the PRICE tab to verify tables render with correct firm columns.

**Acceptance Scenarios**:

1. **Given** a discipline has 3 short-listed firms, **When** I click the PRICE tab in the Evaluation section, **Then** I see Table 1 (Initial Price) with 3 firm columns plus a Description column
2. **Given** the Cost Plan has 5 line items for the current discipline, **When** the PRICE tab loads, **Then** Table 1 displays those 5 line items as rows with amounts empty
3. **Given** no firms are short-listed, **When** I open the PRICE tab, **Then** I see an empty state message prompting me to short-list firms first

---

### User Story 2 - Manual Table Editing (Priority: P1)

As a Project Manager, I want to manually add, delete, and edit rows in both tables, and manually enter amounts for each firm, so that I can customize the evaluation criteria and input data as needed.

**Why this priority**: Essential for flexibility - not all evaluations will use AI parsing.

**Independent Test**: Can be fully tested by adding a row, entering values, deleting a row, and verifying sub-totals update.

**Acceptance Scenarios**:

1. **Given** Table 1 is displayed, **When** I click "Add Row", **Then** a new empty row appears at the bottom of the table
2. **Given** a row exists in either table, **When** I right-click and select "Delete Row", **Then** the row is removed and totals recalculate
3. **Given** I enter an amount in a firm's cell, **When** I press Enter or click away, **Then** the sub-total for that table updates automatically
4. **Given** I modify amounts in both tables, **When** I view the Grand Total row, **Then** it reflects the sum of both table sub-totals for each firm

---

### User Story 3 - Individual Tender Document Parsing (Priority: P2)

As a Project Manager, I want to drag and drop a tenderer's PDF submission onto their column, so that the system automatically extracts pricing data and maps amounts to the correct line items.

**Why this priority**: Significantly reduces manual data entry; high value but builds on P1 foundation.

**Independent Test**: Can be fully tested by dropping a sample PDF onto a firm column and verifying amounts are extracted and mapped.

**Acceptance Scenarios**:

1. **Given** Table 1 is displayed with firm columns, **When** I drag a PDF over a specific firm's column, **Then** a visual drop zone highlights that column
2. **Given** I drop a valid tender PDF onto a firm column, **When** parsing completes, **Then** extracted amounts appear in the corresponding cells with a visual indicator (e.g., blue highlight) AND the PDF is automatically uploaded to the active Consultant/Discipline or Contractor/Trade category in the document repository
3. **Given** the AI cannot confidently map a line item, **When** parsing completes, **Then** that cell shows a warning indicator and the user can manually adjust
4. **Given** I drop an invalid file type, **When** the drop occurs, **Then** an error message explains accepted formats (PDF only)

---

### User Story 4 - Bulk Tender Evaluation (Priority: P2)

As a Project Manager, I want to click a single button to evaluate all tender submissions simultaneously, so that all short-listed firms' amounts are populated at once without individual drag-and-drop.

**Why this priority**: Efficiency feature for evaluating many tenders quickly.

**Independent Test**: Can be fully tested by clicking "Evaluate All" button and verifying all firm columns are populated from their respective documents.

**Acceptance Scenarios**:

1. **Given** multiple short-listed firms exist, **When** I click "Evaluate All Submissions", **Then** a modal shows progress for each firm's document parsing
2. **Given** tender documents are saved in the Consultant/Discipline or Contractor/Trade category in the document repository, **When** bulk evaluation runs, **Then** the system parses each PDF and uses AI to identify which firm each submission belongs to, populating the corresponding firm columns with extracted amounts
3. **Given** the AI cannot match a PDF to any short-listed firm, **When** bulk evaluation runs, **Then** that document is flagged for manual review with extracted amounts shown separately
4. **Given** parsing completes for all firms, **When** results are displayed, **Then** I can manually adjust any values that were incorrectly mapped

---

### User Story 5 - Automatic Calculations (Priority: P1)

As a Project Manager, I want sub-totals and grand totals to calculate automatically, so that I can instantly see the total price for each firm.

**Why this priority**: Core evaluation requirement - comparing total prices is the primary use case.

**Independent Test**: Can be fully tested by entering values and verifying calculations update in real-time.

**Acceptance Scenarios**:

1. **Given** Table 1 has line items with amounts, **When** I view the Sub-Total row, **Then** it shows the sum of all amounts in that table for each firm
2. **Given** Table 2 has adds/subs entries, **When** I view the Sub-Total row, **Then** additions show as positive and deductions show as negative
3. **Given** both tables have values, **When** I view the Grand Total row, **Then** it shows Table 1 Sub-Total + Table 2 Sub-Total for each firm
4. **Given** I delete a row, **When** the row is removed, **Then** all sub-totals and grand total immediately recalculate

---

### User Story 6 - Data Persistence (Priority: P2)

As a Project Manager, I want my evaluation data to be saved automatically, so that I can return to it later without losing my work.

**Why this priority**: Important for multi-session evaluations but builds on core table functionality.

**Independent Test**: Can be fully tested by entering data, refreshing the page, and verifying data persists.

**Acceptance Scenarios**:

1. **Given** I enter amounts in the evaluation tables, **When** I navigate away and return, **Then** all entered amounts are preserved
2. **Given** I add or delete rows, **When** I return later, **Then** the table structure (rows) is preserved
3. **Given** AI-parsed values exist, **When** I manually adjust them, **Then** my adjustments persist (not the original AI values)

---

### User Story 7 - Full Price Schedule with Merge & Edit (Priority: P1)

As a Project Manager, I want to see the complete price schedule from tender submissions (not just matched items), be able to merge duplicate rows, and edit descriptions, so that I can build an accurate and complete comparison table.

**Why this priority**: Critical for accurate tender evaluation - incomplete price schedules can lead to incorrect vendor selection.

**Independent Test**: Can be tested by dropping a PDF with 10 line items onto a firm column when only 3 evaluation rows exist, verifying all 10 items appear (3 matched + 7 new rows), then merging two similar rows and editing a description.

**Acceptance Scenarios**:

1. **Given** an evaluation with 3 existing rows and a tender PDF with 10 line items, **When** I drop the PDF onto a firm column, **Then** AI maps 3 items to existing rows AND creates 7 new rows for unmapped items (full price schedule preserved)
2. **Given** an empty evaluation (no pre-populated rows), **When** I drop a tender PDF, **Then** AI creates new rows for ALL extracted line items
3. **Given** I want to merge duplicate rows, **When** I select 2+ rows using Shift+Click (range) or Ctrl+Click (toggle), **Then** a "Merge Selected (N)" button appears in the table header
4. **Given** I click "Merge Selected", **When** the merge dialog opens, **Then** I see the selected rows, their summed amounts per firm, and can edit the merged description
5. **Given** I confirm the merge, **When** processing completes, **Then** the selected rows are replaced with a single row containing summed amounts and the new description
6. **Given** I want to improve an AI-generated description, **When** I click on the description cell, **Then** I can edit it inline and it saves automatically
7. **Given** a row was created by AI parsing, **When** I view the table, **Then** that row has a visual indicator (sparkle icon) distinguishing it from cost-plan-sourced rows

---

### Edge Cases

- What happens when a firm is un-shortlisted after evaluation data exists? (Data preserved, column remains visible)
- How does system handle very long tender PDFs (50+ pages)? (Show progress indicator; timeout after 60 seconds with retry option)
- What if two line items in the PDF have the same description? (Map to first match; highlight for user review)
- Maximum number of short-listed firms? (Limit to 6 for side-by-side display; beyond 6, horizontal scrolling enabled)

## Requirements

### Functional Requirements

#### Report Structure

| ID | Requirement |
|----|-------------|
| FR-001 | System MUST display an "EVALUATION" section directly below the Addendum section in each discipline/trade tab |
| FR-002 | EVALUATION section MUST match the styling of RFT and Addendum sections (FileText icon, blue highlight, collapsible triangle, dark theme) |
| FR-003 | EVALUATION section MUST have two tabs: PRICE and NON-PRICE |
| FR-004 | NON-PRICE tab MUST display placeholder content "Coming in future release" |
| FR-005 | System MUST provide Export PDF, Export Word, and Export Excel buttons consistent with other report sections |

#### PRICE Tab - Table Structure

| ID | Requirement |
|----|-------------|
| FR-006 | PRICE tab MUST display Table 1 titled "Initial Price" using FortuneSheet |
| FR-007 | PRICE tab MUST display Table 2 titled "Adds & Subs" using FortuneSheet below Table 1 |
| FR-008 | Both tables MUST display columns: Description (first column) + one column per short-listed firm |
| FR-009 | Table 1 MUST pre-populate Description column with cost_lines filtered by current discipline/trade (matching RFT Fee section logic) |
| FR-010 | Table 2 MUST display 3 empty rows by default (numbered 1, 2, 3 in Description column) |
| FR-011 | Amount cells for all firms MUST be empty initially (no pre-populated values) |
| FR-012 | System MUST display firm company name in the column header |

#### Table Editing

**Note**: Table editing UI/UX should follow the styling patterns established in the Cost Plan module (Feature 006) for consistency.

| ID | Requirement |
|----|-------------|
| FR-013 | Users MUST be able to add new rows to both Table 1 and Table 2 |
| FR-014 | Users MUST be able to delete rows from both tables (except header and total rows) |
| FR-015 | Users MUST be able to edit any cell except calculated cells (sub-totals, grand total) |
| FR-016 | Users MUST be able to edit the Description column for custom line items |
| FR-017 | System MUST support currency formatting for amount cells ($#,##0) |

#### Calculations

| ID | Requirement |
|----|-------------|
| FR-018 | System MUST automatically calculate Sub-Total row for each table (sum of all amount rows per firm) |
| FR-019 | System MUST automatically calculate Grand Total row (Table 1 Sub-Total + Table 2 Sub-Total per firm) |
| FR-020 | Calculations MUST update in real-time as values change |
| FR-021 | Table 2 Sub-Total MUST treat positive values as additions and negative values as deductions |

#### Document Parsing - Individual

| ID | Requirement |
|----|-------------|
| FR-022 | System MUST allow drag-and-drop of PDF files onto individual firm columns |
| FR-023 | System MUST provide visual feedback (drop zone highlight) when dragging over a firm column |
| FR-024 | System MUST parse dropped PDF using AI to extract pricing line items and amounts |
| FR-025 | System MUST attempt to map extracted amounts to existing line item descriptions |
| FR-026 | System MUST highlight cells populated via AI extraction (blue border or background) |
| FR-027 | System MUST show confidence indicator for low-confidence mappings (< 70%) |
| FR-028 | System MUST allow user to manually override any AI-populated value |

#### Document Parsing - Bulk

| ID | Requirement |
|----|-------------|
| FR-029 | System MUST provide "Evaluate All Submissions" button in the PRICE tab header; users can click this button multiple times to re-evaluate (e.g., after uploading new PDFs) |
| FR-030 | Bulk evaluation MUST look up tender documents from the Consultant/Discipline or Contractor/Trade categories in the document repository; AI parses each PDF to identify and assign to the correct firm |
| FR-031 | System MUST show progress modal during bulk evaluation with per-firm status |
| FR-032 | System MUST handle missing tender documents gracefully (skip firm, show indicator) |
| FR-033 | Bulk evaluation MUST run parsing for all firms simultaneously (parallel processing) |

#### Data Persistence

| ID | Requirement |
|----|-------------|
| FR-034 | System MUST persist all evaluation data (row structure, descriptions, amounts) to database |
| FR-035 | System MUST auto-save changes (debounced, similar to other sections) |
| FR-036 | System MUST load persisted data when PRICE tab is opened |
| FR-037 | Manual edits MUST override AI-parsed values and persist as the new value |

#### Full Price Schedule - Auto-Create Unmapped Rows

| ID | Requirement |
|----|-------------|
| FR-038 | System MUST create new evaluation rows for ALL unmapped items from tender parsing (not discard them) |
| FR-039 | System MUST track tender parse sessions in `tender_submissions` table for audit trail |
| FR-040 | System MUST mark AI-created rows with `source: 'ai_parsed'` to distinguish from cost-plan rows |
| FR-041 | System MUST display visual indicator (sparkle icon) for AI-generated rows in the table |
| FR-042 | Both empty evaluations and pre-populated evaluations MUST work: empty creates all rows from PDF, pre-populated maps then creates remaining |

#### Row Merge Feature

| ID | Requirement |
|----|-------------|
| FR-043 | System MUST support multi-row selection using Click (single), Shift+Click (range), Ctrl+Click (toggle) - same as Document Repository |
| FR-044 | Selected rows MUST show visual highlight (background color change) |
| FR-045 | System MUST display "Merge Selected (N)" button in table header when 2+ rows are selected |
| FR-046 | Merge operation MUST sum amounts for each firm across all selected rows |
| FR-047 | Merge operation MUST delete original rows and create single merged row |
| FR-048 | Merge dialog MUST allow user to edit the merged row description before confirming |
| FR-049 | System MUST provide merge API endpoint POST `/api/evaluation/.../rows/merge` |

#### Description Editing

| ID | Requirement |
|----|-------------|
| FR-050 | Users MUST be able to edit row descriptions by clicking on the description cell |
| FR-051 | Description edits MUST auto-save with debounce (same as amount edits) |
| FR-052 | System MUST provide PATCH endpoint for description updates |

### Key Entities

- **Evaluation**: One evaluation per discipline/trade per project (similar to RFT NEW)
- **EvaluationTable**: Two tables per evaluation (Initial Price, Adds & Subs)
- **EvaluationRow**: Row data with description, order, and source tracking (`source: 'cost_plan' | 'ai_parsed' | 'manual'`, `sourceSubmissionId`)
- **EvaluationCell**: Amount values per firm per row (firmId, amount, source: 'manual' | 'ai', confidence)
- **TenderSubmission**: Audit record of each tender parse session (evaluationId, firmId, filename, parsedAt, parserUsed, confidence)

## Success Criteria

### Measurable Outcomes

- **SC-001**: Users can open PRICE tab and see tables with short-listed firms in under 2 seconds
- **SC-002**: Users can manually enter and compare pricing for 4 firms in under 5 minutes
- **SC-003**: AI document parsing achieves 80% or higher accuracy on standard tender submission formats
- **SC-004**: Bulk evaluation of 5 tender documents completes in under 30 seconds
- **SC-005**: Sub-totals and grand totals update within 100ms of any value change
- **SC-006**: 100% of entered data persists correctly after page refresh
- **SC-007**: Users can export evaluation to PDF/Word/Excel with all tables and calculations intact

## Assumptions

1. Short-listed firms are already marked via the existing "Shortlisted" toggle on Firm cards
2. Tender PDF documents follow standard formats with clear line item/amount structure
3. Cost Plan line items (cost_lines) exist and are properly filtered by disciplineId/tradeId
4. The existing RAG/document parsing infrastructure (from feature 007) can be extended for tender extraction
5. FortuneSheet supports the required column-based layout with merged cells for headers
6. Maximum practical limit of 6 short-listed firms for side-by-side comparison (UI constraint)

## Out of Scope

- NON-PRICE tab functionality (separate future specification)
- Weighted scoring or ranking algorithms
- Tender document upload workflow (uses existing document repository)
- Email notifications to tenderers
- Audit trail of evaluation changes
- Multi-user concurrent editing

## Dependencies

- Feature 004 (Procurement) - for short-listed firm data and section location
- Feature 006 (Cost Planning) - for cost_lines data source and table editing styling reference
- Feature 007 (RAG Integration) - for document parsing infrastructure
- FortuneSheet library - for spreadsheet functionality
- Existing export utilities (pdf-enhanced.ts) - for PDF/Word/Excel export
- Document Repository - for Consultant/Discipline and Contractor/Trade category structure

## UI Layout Reference

```
+---------------------------------------------------------------------------+
|  EVALUATION                             [Save Transmittal] [Load Transmittal]
|  > (collapsed) / v (expanded)
+---------------------------------------------------------------------------+
|  [ PRICE ] [ NON-PRICE ]    [Evaluate All] [Export PDF] [Export Word] [Export Excel]
+---------------------------------------------------------------------------+
|
|  TABLE 1: INITIAL PRICE
|  +------------------+--------------+--------------+--------------+
|  | Description      | Firm A       | Firm B       | Firm C       |
|  +------------------+--------------+--------------+--------------+
|  | Design Fees      | $            | $            | $            |
|  | Documentation    | $            | $            | $            |
|  | Site Supervision | $            | $            | $            |
|  | [+ Add Row]      |              |              |              |
|  +------------------+--------------+--------------+--------------+
|  | SUB-TOTAL        | $0           | $0           | $0           |
|  +------------------+--------------+--------------+--------------+
|
|  TABLE 2: ADDS & SUBS
|  +------------------+--------------+--------------+--------------+
|  | Description      | Firm A       | Firm B       | Firm C       |
|  +------------------+--------------+--------------+--------------+
|  | 1.               | $            | $            | $            |
|  | 2.               | $            | $            | $            |
|  | 3.               | $            | $            | $            |
|  | [+ Add Row]      |              |              |              |
|  +------------------+--------------+--------------+--------------+
|  | SUB-TOTAL        | $0           | $0           | $0           |
|  +------------------+--------------+--------------+--------------+
|
|  +==================+==============+==============+==============+
|  | GRAND TOTAL      | $0           | $0           | $0           |
|  +==================+==============+==============+==============+
|
|  Drag & drop tender PDF onto a firm column to auto-populate amounts
|
+---------------------------------------------------------------------------+
```

## Notes

- This feature extends the Procurement section's reporting capabilities
- The EVALUATION report follows the same collapsible section pattern as RFT and Addendum
- AI parsing leverages existing RAG infrastructure but with tender-specific extraction prompts
- FortuneSheet configuration should match the Cost Plan module's styling
