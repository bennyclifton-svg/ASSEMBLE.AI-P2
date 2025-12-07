# Feature Specification: Consultant & Contractor Cards

**Branch**: `004-consultant-contractor-cards`  
**Date**: 2025-11-23  
**Status**: Ready for Refinement  
**Related Feature**: Planning Card (defines active Disciplines and Trades)

## Overview
Two separate but similar horizontal card galleries:
1. **Consultants** – filtered by Discipline (Architectural, Structural, MEP, etc.)
2. **Contractors** – filtered by Trade (Concrete, Electrical, Roofing, etc.)

Both support manual entry, edit, delete, and AI-assisted creation via drag & drop of emails, PDFs, business cards, or pasted text.

## User Stories (P1)

**US-01** As a Project Manager, I want discipline tabs at the top of the Consultant section so that I can instantly filter and view only Firms for the active disciplines defined in the Planning Card.

**US-02** As a Project Manager, I want trade tabs at the top of the Contractors section so that I can instantly filter Firms by their trade/specialty.

**US-03** As a Project Manager, I want to drag & drop an email, vCard, PDF, or business card image (or paste text) anywhere on the Firm card  so that the AI extracts and auto-populates a the firm card with Name/Company, Role/Trade, Email, Phone, Organization, etc., dramatically reducing data entry time.

**US-04** As a Project Manager, I want to manually add, edit, or delete Firm records with a clean card-based layout that scrolls horizontally when needed.

**US-05** As a Project Manager, I want to document the Brief for each consultant discipline (Services, Fee, Program) with inline editing so that I can capture engagement requirements before selecting firms.

**US-06** As a Project Manager, I want to document the Scope for each contractor trade (Works, Price, Program) with inline editing so that I can define package requirements before tendering.

**US-07** As a Project Manager, I want the Save/Load Transmittal and Sync to AI buttons organized in a dedicated section (no heading) so that document actions are clearly accessible.

**US-08** As a Project Manager, I want to generate tender request reports inline within each discipline/trade tab with two modes (Data Only using planning card data, or AI Assisted using RAG) so that I can quickly produce documentation without leaving the consultant/contractor context.

**US-09** As a Project Manager, I want to define fee structure items for each consultant discipline (with drag-and-drop reordering) so that I can document pricing expectations before tendering.

**US-10** As a Project Manager, I want to define price structure items for each contractor trade (with drag-and-drop reordering) so that I can document budget line items for tender packages.

## Functional Requirements

| ID    | Requirement |
|------|------------|
| FR-001 | System MUST display Firms as horizontal, scrollable cards grouped/filtered by Discipline tabs (tabs = active disciplines from Planning Card) |
| FR-002 | System MUST display Firms as horizontal, scrollable cards grouped/filtered by Trade tabs (tabs = only active trades as selected in the Planning Card do not show empty tabs for trades that are not active) |
| FR-003 | System MUST allow drag & drop of files (PDF, images, .msg, .eml) or pasted text → AI parses and suggests a new card (user confirms/edits before save) |
| FR-004 | System MUST support manual "Add Firm" button that creates a blank editable card at the end of the current tab |
| FR-005 | System MUST allow inline editing and deletion of any card (with confirmation on delete) |
| FR-006 | System MUST prevent duplicate consultants with the same email OR same company name + discipline (user warning + option to merge) |
| FR-007 | System MUST prevent duplicate contractors with the same company name + trade |
| FR-008 | All data MUST be persisted to the database and survive page refresh/project reload |
| FR-009 | Empty tabs (no Firm cards in a discipline/trade) MUST still be visible if the discipline/trade is active in the Planning Card |
| FR-010 | System MUST display a "Brief" section for consultant disciplines with 3 inline-editable text fields: Services, Fee, Program |
| FR-011 | System MUST display a "Scope" section for contractor trades with 3 inline-editable text fields: Works, Price, Program |
| FR-012 | Brief/Scope text fields MUST be full-width with 5-6 rows height |
| FR-013 | Brief/Scope fields MUST auto-save on blur (same behavior as Planning Card objectives) |
| FR-014 | System MUST display a "Firms" section heading above the horizontal firm cards |
| FR-015 | Buttons section (Save Transmittal, Load Transmittal, Sync to AI) MUST appear above Brief/Scope with no heading |
| FR-016 | First discipline/trade tab MUST be selected by default when enabled disciplines/trades exist |
| FR-017 | System MUST display an "Award" toggle on each firm card (next to Shortlisted). When toggled ON, the firm's company is added to the companies master list if not already present, and the firm is linked via companyId FK |
| FR-018 | Awarded companies from consultant/contractor cards MUST be available in the Cost Planning module autocomplete for invoices and cost tracking |
| FR-019 | Award toggle MUST be disabled until the firm card is saved (has an id) |
| FR-020 | When Award is toggled OFF, the companyId link MUST be preserved (company may have associated invoices) but awarded flag is set to false |
| FR-021 | System MUST provide visual tile-based UI for document management: Sources (blue), Transmittals (green), Generation Modes (purple/orange) |
| FR-022 | System MUST support inline report generation within each discipline/trade tab with lifecycle states: draft, toc_pending, generating, complete, failed |
| FR-023 | System MUST offer two report generation modes: Data Only (template-based using planning card data) and AI Assisted (RAG-enabled with synced documents) |
| FR-024 | System MUST allow users to define fee structure items for consultant disciplines with drag-and-drop reordering and inline editing |
| FR-025 | System MUST allow users to define price structure items for contractor trades with drag-and-drop reordering and inline editing |
| FR-026 | System MUST support drag & drop extraction on ANY empty firm card, not just the first one |

## Data Model (Updated & Consistent)

**Consultant**
- id
- companyName (e.g. "Arup", "Jane Doe Consulting")
- contactPerson (optional)
- discipline (from Planning Card active list)
- email
- mobile (phone field exists in database but mobile is sufficient for UI)
- address
- abn
- notes
- shortlisted (toggle on/off)
- awarded (toggle on/off) - links to Cost Planning
- companyId (FK to companies master list) - set when awarded

**Contractor**
- id
- companyName
- trade (single select from the 21 master trades)
- contactPerson (optional)
- email
- mobile (phone field exists in database but mobile is sufficient for UI)
- address
- abn
- notes
- shortlisted (toggle on/off)
- awarded (toggle on/off) - links to Cost Planning
- companyId (FK to companies master list) - set when awarded

**ConsultantDiscipline** (extended)
- briefServices (text)
- briefFee (text)
- briefProgram (text)

**ContractorTrade** (extended)
- scopeWorks (text)
- scopePrice (text)
- scopeProgram (text)

**DisciplineFeeItem**
- id
- disciplineId (FK to consultant_disciplines)
- description (text)
- order (integer for drag-and-drop)

**ContractorTradeItem**
- id
- tradeId (FK to contractor_trades)
- description (text)
- order (integer for drag-and-drop)

## Non-Functional & Edge Cases
- Cards should be responsive and remain usable on tablet (touch scrolling)
- Drag & drop zone should have clear visual affordance + tooltip
- If AI confidence < 70%, show warning and require manual review
- Deleting the last card in a discipline/trade keeps the empty tab visible

## Implemented UI Components

### Document Management Tiles (DisciplineRepoTiles)
Located within each discipline/trade tab, provides tile-based interface for:
1. **Sources Tiles (Blue)** - Save/Load project repos (document sets)
2. **Transmittal Tiles (Green)** - Save/Load transmittals with document counts
3. **Generation Mode Tiles** - Data Only (purple) and AI Assist (orange/gold)

### Report Generation Section (ReportsSection)
Inline report generation within each discipline/trade tab:
- Report lifecycle: draft → toc_pending → generating → complete/failed
- Streaming progress updates during generation
- Smart Context Panel showing source documents
- Report history with delete capability
- Integrates with 007-RAG Integration Specification

### Fee/Price Structure Management
- **FeeStructureSection** (Consultants): Drag-and-drop reorderable fee items with inline editing
- **PriceStructureSection** (Contractors): Drag-and-drop reorderable price items with inline editing
- Keyboard support (Enter to save, Escape to cancel)
- Auto-save with debounced updates

## Success Criteria

| ID   | Metric |
|------|-------|
| SC-001 | User can add a consultant/contractor (manual) in < 30 seconds |
| SC-002 | User can add a consultant/contractor via drag & drop + AI in < 15 seconds (after drop) |
| SC-003 | ≥ 90% field extraction accuracy on real-world emails/business cards (tested on 50 samples) |
| SC-004 | 100% of records persisted correctly after page reload |
| SC-005 | No duplicate records can be created accidentally |

## Out of Scope (for now)
- Bulk CSV import
- Integration with external directories (LinkedIn, Outlook)
- Sending tender packages (separate future feature)

### Final Suggestion
Run a 30-minute refinement session with the team using this cleaned version — it will save days of back-and-forth during development.
