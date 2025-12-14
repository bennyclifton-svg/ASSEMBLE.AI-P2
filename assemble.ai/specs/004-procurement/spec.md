# Feature Specification: Procurement

**Branch**: `004-procurement`
**Date**: 2025-12-11
**Status**: Ready for Refinement
**Related Feature**: Planning Card (defines active Disciplines and Trades)

## Overview
A unified "Procurement" tab combining:
1. **Consultants** – filtered by Discipline (Architectural, Structural, MEP, etc.)
2. **Contractors** – filtered by Trade (Concrete, Electrical, Roofing, etc.)
3. **RFT Reports** – comprehensive Request For Tender documents per discipline/trade (see [rft-new-spec.md](./rft-new-spec.md))
4. **Addendum Reports** – Contract addenda documents with separate transmittals per discipline/trade

All support manual entry, edit, delete, and AI-assisted creation via drag & drop of emails, PDFs, business cards, or pasted text.

## User Stories (P1)

### Consultant/Contractor Management

**US-01** As a Project Manager, I want a unified "Procurement" tab that combines both consultant disciplines and contractor trades so that I can manage all procurement activities from a single location.

**US-02** As a Project Manager, I want to see discipline tabs (with briefcase icon) and trade tabs (with wrench icon) separated by a visual divider so that I can easily distinguish between consultants and contractors.

**US-03** As a Project Manager, I want to drag & drop an email, vCard, PDF, or business card image (or paste text) anywhere on the Firm card  so that the AI extracts and auto-populates a the firm card with Name/Company, Role/Trade, Email, Phone, Organization, etc., dramatically reducing data entry time.

**US-04** As a Project Manager, I want to manually add, edit, or delete Firm records with a clean card-based layout that scrolls horizontally when needed.

**US-05** As a Project Manager, I want to document the Brief for each consultant discipline (Services, Fee, Program) with inline editing so that I can capture engagement requirements before selecting firms.

**US-06** As a Project Manager, I want to document the Scope for each contractor trade (Works, Price, Program) with inline editing so that I can define package requirements before tendering.

**US-07** As a Project Manager, I want the Save/Load Transmittal and Sync to AI buttons organized in a dedicated section (no heading) so that document actions are clearly accessible.

**US-08** As a Project Manager, I want to generate comprehensive RFT reports inline within each discipline/trade tab. See [rft-new-spec.md](./rft-new-spec.md) for full specification.

**US-09** As a Project Manager, I want to define fee structure items for each consultant discipline (with drag-and-drop reordering) so that I can document pricing expectations before tendering.

**US-10** As a Project Manager, I want to define price structure items for each contractor trade (with drag-and-drop reordering) so that I can document budget line items for tender packages.

### Addendum Reports

**US-11** As a Project Manager, I want an "Addendum" section located directly below the RFT section in each discipline/trade tab so that I can create and manage contract addenda without navigating away.

**US-12** As a Project Manager, I want to create multiple addenda (Addendum 01, 02, 03...) using a tabbed interface where tab "01" shows the first addendum and clicking "+" creates subsequent addenda.

**US-13** As a Project Manager, I want each Addendum to have its own separate transmittal document set (independent from RFT transmittals) so that I can attach addendum-specific documents.

**US-14** As a Project Manager, I want to see "Save Transmittal" and "Load Transmittal" tiles on the right-hand side of the Addendum header so that I can manage addendum-specific documents.

**US-15** As a Project Manager, I want each Addendum report to display a formatted header table showing:
- Row 1: Project Name (from Planning Card)
- Row 2: Address (from Planning Card)
- Row 3: Addendum number (e.g., "Addendum 01")

**US-16** As a Project Manager, I want a rich text editor within each Addendum to enter addendum details (similar to the Brief/Services text editor) so that I can describe changes, clarifications, or additions to the contract.

**US-17** As a Project Manager, I want to see a formatted transmittal document schedule within the Addendum showing all documents saved to that addendum's transmittal.

**US-18** As a Project Manager, I want to save the Addendum manually or have it auto-save, with options to export to PDF or Word format.

## Functional Requirements

### Consultant/Contractor Management

| ID    | Requirement |
|------|------------|
| FR-001 | System MUST display a unified "Procurement" tab combining consultant disciplines and contractor trades as Tier 2 tabs |
| FR-002 | Tier 2 tabs MUST show disciplines (Briefcase icon, blue accent) and trades (Wrench icon, orange accent) with a visual separator between them |
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

### Addendum Reports

| ID    | Requirement |
|------|------------|
| FR-027 | System MUST display an "Addendum" section directly below the RFT section within each discipline/trade tab |
| FR-028 | Addendum section MUST have a tabbed interface with initial tab "01" and a "+" button to create additional addenda |
| FR-029 | Clicking "+" MUST create a new addendum tab with incrementing number (02, 03, etc.) |
| FR-030 | Each Addendum MUST have its own independent transmittal document set (separate from RFT transmittals) |
| FR-031 | Addendum header MUST display "Save Transmittal" and "Load Transmittal" tiles on the right-hand side |
| FR-032 | System MUST display a formatted project information table at the top of each Addendum with 3 rows: Project Name, Address, and Addendum number |
| FR-033 | Project Name row MUST pull data from the active project's Planning Card |
| FR-034 | Address row MUST pull data from the active project's Planning Card address field |
| FR-035 | Addendum number row MUST display the current addendum number (e.g., "Addendum 01", "Addendum 02") |
| FR-036 | System MUST provide a rich text editor below the project info table for entering addendum details |
| FR-037 | Rich text editor MUST support similar formatting to Brief/Services dialog (multi-line, basic formatting) |
| FR-038 | System MUST display a formatted transmittal document schedule below the text editor showing all documents in the addendum's transmittal |
| FR-039 | Transmittal schedule MUST show document name, revision, and date for each attached document |
| FR-040 | Addendum content MUST auto-save on blur (consistent with Brief/Scope fields) |
| FR-041 | System MUST provide export options for Addendum: PDF and Word format |
| FR-042 | Addendum export MUST include: project info table, addendum details text, and transmittal document schedule |
| FR-043 | System MUST persist all Addendum data to the database and survive page refresh/project reload |
| FR-044 | Addendum transmittals MUST be scoped to project + discipline/trade + addendum number to ensure independence |

## Data Model

### Consultant/Contractor (Existing)

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

### Addendum (New)

**Addendum**
- id (UUID)
- projectId (FK to projects)
- disciplineId (FK to consultant_disciplines, nullable)
- tradeId (FK to contractor_trades, nullable)
- addendumNumber (integer, e.g., 1, 2, 3)
- content (text - rich text content for addendum details)
- createdAt (timestamp)
- updatedAt (timestamp)

**AddendumTransmittal**
- id (UUID)
- addendumId (FK to Addendum)
- documentId (FK to documents)
- order (integer for display ordering)
- createdAt (timestamp)

Note: Addendum transmittals use the existing document repository but are scoped specifically to each addendum instance.

## Non-Functional & Edge Cases
- Cards should be responsive and remain usable on tablet (touch scrolling)
- Drag & drop zone should have clear visual affordance + tooltip
- If AI confidence < 70%, show warning and require manual review
- Deleting the last card in a discipline/trade keeps the empty tab visible
- Addendum tabs should show visual indicator when content exists
- Maximum 99 addenda per discipline/trade (01-99 numbering)
- Deleting an addendum should prompt for confirmation and cascade delete transmittal links

## Implemented UI Components

### Document Management Tiles (DisciplineRepoTiles)
Located within each discipline/trade tab, provides tile-based interface for:
1. **Sources Tiles (Blue)** - Save/Load project repos (document sets)
2. **Transmittal Tiles (Green)** - Save/Load transmittals with document counts
3. **Generation Mode Tiles** - Data Only (purple) and AI Assist (orange/gold)

### ~~Report Generation Section (ReportsSection)~~ - REMOVED
*Replaced by RFT NEW. See [rft-new-spec.md](./rft-new-spec.md) for the new RFT implementation.*

### Fee/Price Structure Management
- **FeeStructureSection** (Consultants): Drag-and-drop reorderable fee items with inline editing
- **PriceStructureSection** (Contractors): Drag-and-drop reorderable price items with inline editing
- Keyboard support (Enter to save, Escape to cancel)
- Auto-save with debounced updates

### Addendum Section (New)
Located directly below RFT section within each discipline/trade tab:

**Layout Structure:**
```
┌─────────────────────────────────────────────────────────────┐
│  ADDENDUM                          [Save Transmittal] [Load]│
├─────────────────────────────────────────────────────────────┤
│  [ 01 ] [ 02 ] [ + ]       [Save] [Export PDF] [Export Word]│  ← Addendum tabs + actions
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────────┐│
│  │ Project Name │ Riverstone Gateway Commercial Hub        ││  ← Project info table
│  ├──────────────┼──────────────────────────────────────────┤│
│  │ Address      │ 42-48 Station Street, Riverstone NSW 2765││
│  ├──────────────┼──────────────────────────────────────────┤│
│  │              │ Addendum 01                              ││
│  └─────────────────────────────────────────────────────────┘│
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────────┐│
│  │                                                         ││
│  │  [Rich text editor for Addendum details]                ││  ← Text editor
│  │                                                         ││
│  └─────────────────────────────────────────────────────────┘│
├─────────────────────────────────────────────────────────────┤
│  TRANSMITTAL DOCUMENT SCHEDULE                              │
│  ┌───────────────────────────────┬─────────┬───────────────┐│
│  │ Document                      │ Rev     │ Date          ││  ← Transmittal table
│  ├───────────────────────────────┼─────────┼───────────────┤│
│  │ Architectural_Drawings_Rev2   │ 2       │ 2025-12-10    ││
│  │ Specification_Section_01      │ 1       │ 2025-12-08    ││
│  └───────────────────────────────┴─────────┴───────────────┘│
└─────────────────────────────────────────────────────────────┘
```

**Key Features:**
- Tabbed interface: "01", "02", ... tabs with "+" to add new addenda
- Save/Export actions inline with tabs (right-aligned)
- Independent transmittal per addendum (not shared with RFT)
- Auto-save on blur with manual save option
- Export to PDF/Word with full document formatting

## Success Criteria

| ID   | Metric |
|------|-------|
| SC-001 | User can add a consultant/contractor (manual) in < 30 seconds |
| SC-002 | User can add a consultant/contractor via drag & drop + AI in < 15 seconds (after drop) |
| SC-003 | ≥ 90% field extraction accuracy on real-world emails/business cards (tested on 50 samples) |
| SC-004 | 100% of records persisted correctly after page reload |
| SC-005 | No duplicate records can be created accidentally |
| SC-006 | User can create a new Addendum in < 10 seconds (click +, enter content) |
| SC-007 | Addendum transmittal is independent from RFT transmittal (verified via different document sets) |
| SC-008 | Addendum export produces correctly formatted PDF/Word document |

## Out of Scope (for now)
- Bulk CSV import
- Integration with external directories (LinkedIn, Outlook)
- Sending tender packages (separate future feature)
- Addendum versioning/change tracking beyond separate numbered addenda

### Final Suggestion
Run a 30-minute refinement session with the team using this cleaned version — it will save days of back-and-forth during development.
