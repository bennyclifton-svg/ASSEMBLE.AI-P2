# Feature Specification: Evaluation Non-Price

**Feature Branch**: `013-evaluation-non-price`
**Created**: 2025-12-13
**Status**: ✅ Complete
**Parent Feature**: 011-evaluation-report
**Input**: User description: "Create NON-PRICE tab for Evaluation Report with qualitative assessment table using AI-powered semantic extraction from tender PDFs"

## Overview

The NON-PRICE tab is a qualitative evaluation component within the Evaluation Report section. It enables Project Managers to assess tender submissions against 7 fixed non-price criteria by extracting and summarizing relevant content from tender PDFs using AI-powered semantic matching. Each criterion displays text excerpts with quality ratings (Good/Average/Poor) for side-by-side firm comparison.

## User Scenarios & Testing

### User Story 1 - View Non-Price Evaluation Table (Priority: P1)

As a Project Manager, I want to open the NON-PRICE tab and see a table with 7 evaluation criteria as rows and shortlisted firms as columns, so that I can compare qualitative aspects of each tender submission.

**Why this priority**: Core functionality - without the table structure, no non-price evaluation can occur.

**Independent Test**: Can be fully tested by opening a discipline/trade tab with shortlisted firms and clicking the NON-PRICE tab to verify the table renders with correct criteria rows and firm columns.

**Acceptance Scenarios**:

1. **Given** a discipline has 3 shortlisted firms, **When** I click the NON-PRICE tab in the Evaluation section, **Then** I see a table with 7 criteria rows (Methodology, Program, Personnel, Experience, Health & Safety, Insurance, Departures) and 3 firm columns
2. **Given** no firms are shortlisted, **When** I open the NON-PRICE tab, **Then** I see an empty state message prompting me to shortlist firms first
3. **Given** I view the table, **When** I look at the first column, **Then** I see the 7 fixed criteria labels with brief descriptions

---

### User Story 2 - Manual Content Entry (Priority: P1)

As a Project Manager, I want to manually enter text content and quality ratings for each firm-criterion cell, so that I can record my assessment findings without requiring AI assistance.

**Why this priority**: Essential fallback - manual entry must work independently of AI parsing.

**Independent Test**: Can be fully tested by clicking a cell, entering text, selecting a rating, and verifying the content persists after page refresh.

**Acceptance Scenarios**:

1. **Given** a cell is empty, **When** I view it, **Then** I see 3 rating buttons (Good/Average/Poor) always visible and a placeholder for content
2. **Given** I click "Good" rating button, **When** the click completes, **Then** the rating saves instantly and the button highlights green
3. **Given** I click the content area, **When** the click completes, **Then** an inline textarea appears for editing
4. **Given** I type content and blur/press Enter, **When** the save completes, **Then** my content displays and persists

---

### User Story 3 - AI-Powered Single Tender Extraction (Priority: P2)

As a Project Manager, I want to drag and drop a tender PDF onto a firm column, so that the system automatically extracts relevant content for each criterion and suggests quality ratings.

**Why this priority**: High-value automation - significantly reduces manual data entry time.

**Independent Test**: Can be fully tested by dropping a tender PDF onto a firm column and verifying all 7 criteria cells are populated with extracted excerpts and ratings.

**Acceptance Scenarios**:

1. **Given** the NON-PRICE table is displayed, **When** I drag a PDF over a firm column header, **Then** a visual drop zone highlights that column
2. **Given** I drop a valid tender PDF onto a firm column, **When** parsing completes, **Then** all 7 criteria cells for that firm show AI-extracted content with quality ratings and a sparkle icon indicator AND the PDF is automatically uploaded to the Document Repository under the Consultant category and Discipline or Trade subcategory
3. **Given** the AI extracts content for "Methodology", **When** I view the cell, **Then** I see a 2-4 sentence summary of the tenderer's methodology approach
4. **Given** the AI cannot find relevant content for a criterion, **When** parsing completes, **Then** that cell shows "No relevant content found" with a "Poor" rating and low confidence warning
5. **Given** I drop an invalid file type, **When** the drop occurs, **Then** an error message explains only PDF files are accepted

---

### User Story 4 - Quality Rating Display (Priority: P1)

As a Project Manager, I want to see color-coded quality ratings (Good/Average/Poor) for each cell, so that I can quickly scan and compare firm assessments across criteria.

**Why this priority**: Essential UX - visual differentiation is core to the comparison purpose.

**Independent Test**: Can be fully tested by viewing cells with different ratings and verifying correct badge colors.

**Acceptance Scenarios**:

1. **Given** a cell has "Good" rating, **When** I view it, **Then** I see a green badge labeled "Good"
2. **Given** a cell has "Average" rating, **When** I view it, **Then** I see a yellow/amber badge labeled "Average"
3. **Given** a cell has "Poor" rating, **When** I view it, **Then** I see a red badge labeled "Poor"
4. **Given** AI-extracted content has low confidence (<70%), **When** I view the cell, **Then** I see a warning indicator suggesting manual review

---

### User Story 5 - Override AI Extractions (Priority: P2)

As a Project Manager, I want to edit AI-extracted content and change quality ratings, so that I can correct inaccuracies or add my own assessment.

**Why this priority**: Critical for accuracy - AI suggestions must be editable.

**Independent Test**: Can be fully tested by editing an AI-populated cell and verifying the user's changes persist and override the AI values.

**Acceptance Scenarios**:

1. **Given** a cell contains AI-extracted content, **When** I click to edit, **Then** the modal shows the AI content which I can modify
2. **Given** I change the rating from "Good" to "Average", **When** I save, **Then** the new rating displays and is marked as user-edited
3. **Given** I have overridden AI content, **When** I re-parse the same tender PDF, **Then** my manual edits are preserved (not overwritten)

---

### User Story 6 - Departures Detection (Priority: P2)

As a Project Manager, I want the AI to specifically identify significant contract departures from tender requirements, so that I can assess compliance risks.

**Why this priority**: Specialized criterion requiring different extraction logic.

**Independent Test**: Can be fully tested by parsing a tender with known departures and verifying they are identified in the Departures row.

**Acceptance Scenarios**:

1. **Given** a tender contains explicit exclusions ("We exclude..."), **When** AI parses for Departures, **Then** those exclusions are listed in the summary
2. **Given** a tender contains qualifications ("Subject to..."), **When** AI parses for Departures, **Then** those conditions are identified
3. **Given** a tender proposes amendments to contract terms, **When** AI parses for Departures, **Then** those amendments are flagged
4. **Given** no departures are found, **When** AI parses, **Then** the cell shows "No significant departures identified" with "Good" rating

---

### User Story 7 - Data Persistence (Priority: P2)

As a Project Manager, I want my non-price evaluation data to be saved automatically, so that I can return to it later without losing my work.

**Why this priority**: Essential for multi-session evaluations.

**Independent Test**: Can be fully tested by entering data, refreshing the page, and verifying all content persists.

**Acceptance Scenarios**:

1. **Given** I enter or edit cell content, **When** I click save in the modal, **Then** the data auto-saves immediately
2. **Given** I navigate away from the NON-PRICE tab, **When** I return, **Then** all entered/extracted content is preserved
3. **Given** AI-parsed values exist, **When** I manually edit them, **Then** my edits persist as the primary values

---

### Edge Cases

- What happens when a firm is un-shortlisted after non-price data exists? (Data preserved, column hidden)
- How does system handle very long tender PDFs (50+ pages)? (Progress indicator; 120 second timeout with retry)
- What if tender PDF has no content matching a criterion? (Show "No relevant content found" with Poor rating)
- Maximum number of shortlisted firms? (Limit to 6 for side-by-side; beyond 6, horizontal scrolling)
- What happens when AI confidence is very low? (Show warning icon; suggest manual review)

## Requirements

### Functional Requirements

#### Table Structure

| ID | Requirement |
|----|-------------|
| FR-001 | NON-PRICE tab MUST display a table with 7 fixed criteria rows in order: Methodology, Program, Personnel, Experience, Health & Safety, Insurance, Departures |
| FR-002 | Table MUST display one column per shortlisted firm, plus a "Criteria" label column |
| FR-003 | Criteria column MUST display the criterion name and brief description tooltip |
| FR-004 | Table MUST use custom implementation (not FortuneSheet) to support text content with variable row heights |

#### Cell Content & Display

| ID | Requirement |
|----|-------------|
| FR-005 | Each cell MUST display extracted/entered text content (max 200 words visible, expandable) |
| FR-006 | Each cell MUST display a quality rating badge (Good=green, Average=yellow, Poor=red) |
| FR-007 | AI-populated cells MUST show a sparkle icon to indicate AI-generated content |
| FR-008 | Low confidence cells (<70%) MUST show a warning indicator |
| FR-009 | Cell content MUST be editable inline when clicked (textarea appears in place) |

#### Inline Editing

| ID | Requirement |
|----|-------------|
| FR-010 | Each cell MUST display rating buttons (Good/Average/Poor) always visible at bottom of cell |
| FR-011 | Users MUST be able to change rating with single click on rating button (instant save) |
| FR-012 | Users MUST be able to click content area to edit text inline (textarea appears in place) |
| FR-013 | Content changes MUST save on blur or Enter key |
| FR-014 | Manual edits MUST be tracked separately from AI extractions (userEditedContent, userEditedRating) |

#### AI Extraction - Single Document

| ID | Requirement |
|----|-------------|
| FR-015 | System MUST allow drag-and-drop of PDF files onto firm column headers |
| FR-016 | System MUST provide visual feedback (drop zone highlight) when dragging over a firm column |
| FR-017 | System MUST parse dropped PDF using semantic search + Claude AI to extract relevant passages for each criterion AND automatically upload the PDF to the Document Repository under the Consultant category and Discipline or Trade subcategory |
| FR-018 | For each criterion, system MUST generate a 2-4 sentence summary (100-200 words max) |
| FR-019 | For each criterion, system MUST assign a quality rating (Good/Average/Poor) based on content completeness |
| FR-020 | System MUST store extraction confidence (0-100) for each criterion cell |
| FR-021 | System MUST preserve source chunk references for traceability |
| FR-022 | Parsing MUST complete within 120 seconds or show timeout with retry option |

#### Departures Detection

| ID | Requirement |
|----|-------------|
| FR-023 | Departures criterion MUST use specialized extraction logic to identify: exclusions, qualifications, amendments, non-compliance, alternative proposals |
| FR-024 | Departures summary MUST list specific departures found (not just general assessment) |
| FR-025 | If no departures found, system MUST indicate "No significant departures identified" |

#### Data Persistence

| ID | Requirement |
|----|-------------|
| FR-026 | System MUST persist all non-price data (criteria, cells, ratings, source info) to database |
| FR-027 | System MUST auto-save on modal close/confirm |
| FR-028 | System MUST load persisted data when NON-PRICE tab is opened |
| FR-029 | Manual edits MUST override AI values and persist as primary content |
| FR-030 | System MUST track source of each cell: 'manual' or 'ai' |

### Key Entities

- **EvaluationNonPriceCriteria**: 7 fixed criteria per evaluation (one-to-many from Evaluation)
- **EvaluationNonPriceCell**: One cell per criterion per firm, containing extracted content, quality rating, confidence, and source tracking
- **TenderSubmission**: Reuse existing audit record for tender parse sessions

## Success Criteria

### Measurable Outcomes

- **SC-001**: Users can open NON-PRICE tab and see table with criteria and firms in under 2 seconds
- **SC-002**: Users can manually enter content and ratings for all 7 criteria × 4 firms in under 15 minutes
- **SC-003**: AI document parsing extracts relevant content for at least 5 of 7 criteria on standard tender submissions
- **SC-004**: AI extraction for single tender (all 7 criteria) completes in under 60 seconds
- **SC-005**: 100% of entered/extracted data persists correctly after page refresh
- **SC-006**: Quality ratings are visually distinguishable at a glance (color-coded badges)
- **SC-007**: Users can override any AI-extracted content and rating

## Assumptions

1. Shortlisted firms are already marked via existing "Shortlisted" toggle on Firm cards
2. Tender PDF documents follow standard formats with discernible section headings for criteria
3. The existing RAG/embedding infrastructure (Voyage AI, BAAI/Cohere) is available and functional
4. LlamaParse/Unstructured/pdf-parse parsing chain is operational
5. Claude API is available for summarization and rating assignment
6. Maximum practical limit of 6 shortlisted firms for side-by-side comparison

## Out of Scope

- Numeric scoring or weighted calculations (purely qualitative assessment)
- Bulk "Evaluate All" functionality (future enhancement)
- Export to PDF/Word/Excel (handled by parent Evaluation Report feature)
- Custom criteria (fixed 7 criteria only)
- Multi-user concurrent editing

## Dependencies

- Feature 011 (Evaluation Report) - for parent section and tab structure
- Feature 007 (RAG Integration) - for PDF parsing, embedding, and semantic search infrastructure
- Voyage AI embeddings - for semantic similarity search
- Claude API - for summarization and quality rating
- BAAI/Cohere reranking - for relevance scoring
- Existing tender_submissions table - for audit trail

## UI Layout Reference

```
+---------------------------------------------------------------------------+
|  EVALUATION
|  > (collapsed) / v (expanded)
+---------------------------------------------------------------------------+
|  [ PRICE ] [ NON-PRICE ]                      [Export PDF] [Export Word]
+---------------------------------------------------------------------------+
|
|  ┌────────────────────┬──────────────────┬──────────────────┬─────────────┐
|  │ Criteria           │ Firm A           │ Firm B           │ Firm C      │
|  │                    │ [Drop PDF here]  │ [Drop PDF here]  │ [Drop...]   │
|  ├────────────────────┼──────────────────┼──────────────────┼─────────────┤
|  │ Methodology        │ [Text excerpt    │ [Text excerpt    │ [Text...]   │
|  │ Approach to work   │  2-4 sentences]  │  2-4 sentences]  │             │
|  │                    │ [Good ✓] ✨      │ [Average ~]      │ [Poor ✗]    │
|  ├────────────────────┼──────────────────┼──────────────────┼─────────────┤
|  │ Program            │ ...              │ ...              │ ...         │
|  │ Schedule/timeline  │                  │                  │             │
|  ├────────────────────┼──────────────────┼──────────────────┼─────────────┤
|  │ Personnel          │ ...              │ ...              │ ...         │
|  │ Team/qualifications│                  │                  │             │
|  ├────────────────────┼──────────────────┼──────────────────┼─────────────┤
|  │ Experience         │ ...              │ ...              │ ...         │
|  │ Project history    │                  │                  │             │
|  ├────────────────────┼──────────────────┼──────────────────┼─────────────┤
|  │ Health & Safety    │ ...              │ ...              │ ...         │
|  │ Safety policies    │                  │                  │             │
|  ├────────────────────┼──────────────────┼──────────────────┼─────────────┤
|  │ Insurance          │ ...              │ ...              │ ...         │
|  │ Coverage/limits    │                  │                  │             │
|  ├────────────────────┼──────────────────┼──────────────────┼─────────────┤
|  │ Departures         │ ...              │ ...              │ ...         │
|  │ Contract deviations│                  │                  │             │
|  └────────────────────┴──────────────────┴──────────────────┴─────────────┘
|
|  ✨ = AI-extracted    ⚠️ = Low confidence (manual review suggested)
|
+---------------------------------------------------------------------------+
```

## Notes

- This feature replaces the "Coming in future release" placeholder in the NON-PRICE tab
- Follows the same section styling as PRICE tab for visual consistency
- AI extraction leverages existing RAG infrastructure with criterion-specific prompts
- Table uses custom implementation (not FortuneSheet) due to text content requirements
- Quality ratings are advisory - users have final authority to override AI suggestions
