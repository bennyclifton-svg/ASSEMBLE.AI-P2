# RFT NEW Feature Specification

**Feature ID**: 004-procurement-rft-new
**Created**: 2025-12-12
**Status**: Draft
**Parent Feature**: 004-procurement

## Overview

RFT NEW is the internal code name for the comprehensive Request for Tender report within the Procurement Cards. **The user-facing display name is simply "RFT"**. It replicates the Addendum reporting structure while incorporating project planning data (objectives, staging, risks) and cost plan information specific to each discipline or trade.

## Feature Location

- **Position**: Within Procurement Cards, located **ABOVE** the Addendum section
- **Scope**: Available for both Consultant disciplines and Contractor trades
- **Context**: Per-discipline/per-trade reporting (similar to Addendum)

## User Requirements

### Core Functionality

1. **Report Structure**
   - One RFT NEW report per discipline/trade (not multiple numbered reports)
   - Report is automatically created when the discipline/trade tab is opened
   - Reports are specific to the active discipline or trade tab

2. **Tab Interface**
   - **SHORT Tab**: Fully functional report generation with multiple sections
   - **LONG Tab**: Placeholder for future implementation
   - No numbered tabs, just SHORT and LONG tabs

3. **Report Export**
   - Export to PDF format
   - Export to Word (DOCX) format
   - Filename format: `RFT [Discipline].pdf/docx`

## SHORT Tab Content Structure

The SHORT tab generates a comprehensive report with the following sections:

### 1. Project Information Table
A header table displaying:
- **Project Name**: From project details
- **Address**: From project details
- **Document**: "RFT [Discipline Name]" (e.g., "RFT Fire Services")

### 2. Objectives Section
**Heading**: "Objectives"

Table displaying planning objectives with the following rows:
- **Functional**: Content from Planning Objectives → Functional
- **Quality**: Content from Planning Objectives → Quality
- **Budget**: Content from Planning Objectives → Budget
- **Program**: Content from Planning Objectives → Program

### 3. Staging Section
**Heading**: "Staging"

Displays staging information from the Planning Card in table format.

### 4. Risk Section
**Heading**: "Risk"

Table displaying risks from the Planning Card with their mitigation strategies.

### 5. Brief Section
**Heading**: "Brief"

Table with the following rows, where each cell is an editable text area with autosave functionality:
- **Service**: Brief services content for the discipline/trade (**updates** `consultant_disciplines.brief_services` or `contractor_trades.scope_works`)
- **Deliverables**: Deliverables content (**updates** `consultant_disciplines.brief_deliverables` or `contractor_trades.scope_deliverables`)

**Note**: The values are fetched from and saved to the respective consultant/contractor endpoints.

### 6. Fee Section
**Heading**: "Fee"

Table listing all Cost Plan line items that match the current discipline. Columns include:
- **Description**: Sourced from `cost_lines.activity`
- **Amount (Excl. GST)**: Empty column for consultant/contractor to nominate fee

**Filtering Logic**: Only show cost plan items where `disciplineId` matches the current discipline OR `tradeId` matches the current trade.

### 7. Transmittal Section
**Heading**: "Transmittal"

Same functionality as Addendum transmittal:
- Save selected documents to the transmittal
- Load previously saved transmittal documents
- Display document schedule with:
  - Document name
  - Category
  - Version number
  - Upload date

## Database Schema

### Table: `rft_new`

```sql
CREATE TABLE rft_new (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL REFERENCES projects(id),
    discipline_id TEXT REFERENCES consultant_disciplines(id),
    trade_id TEXT REFERENCES contractor_trades(id),
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

**Notes**:
- Either `discipline_id` OR `trade_id` must be set (not both)
- Only ONE RFT NEW per project+discipline or project+trade combination (enforced by UNIQUE constraints)
- Unlike Addendum, RFT NEW does not store editable content (it's generated from other sources)

### Table: `rft_new_transmittals`

```sql
CREATE TABLE rft_new_transmittals (
    id TEXT PRIMARY KEY,
    rft_new_id TEXT NOT NULL REFERENCES rft_new(id) ON DELETE CASCADE,
    document_id TEXT NOT NULL REFERENCES documents(id),
    added_at TEXT DEFAULT CURRENT_TIMESTAMP
);
```

## API Routes

### GET `/api/rft-new`
**Query Parameters**:
- `projectId` (required)
- `disciplineId` (optional - for consultants)
- `tradeId` (optional - for contractors)

**Response**: Single RFT NEW object (creates one if it doesn't exist)
```json
{
    "id": "uuid",
    "projectId": "uuid",
    "disciplineId": "uuid",
    "tradeId": null,
    "transmittalCount": 5,
    "createdAt": "2025-12-12T...",
    "updatedAt": "2025-12-12T..."
}
```

**Notes**: This endpoint implements a "get-or-create" pattern. If no RFT NEW exists for the given project+discipline/trade, it creates one automatically.

### POST `/api/rft-new/[id]/export`
**Body**:
```json
{
    "format": "pdf" | "docx"
}
```

**Response**: File download (PDF or DOCX)

### GET `/api/rft-new/[id]/transmittal`
Get all documents in the transmittal for this RFT NEW.

### POST `/api/rft-new/[id]/transmittal`
**Body**:
```json
{
    "documentIds": ["uuid1", "uuid2", ...]
}
```

Save documents to the transmittal.

## Component Structure

### Components to Create

1. **`RFTNewSection.tsx`**
   - Main container component
   - Collapsible section with header
   - SHORT and LONG tabs (no numbered tabs)
   - Export buttons (PDF/Word)
   - Save/Load transmittal buttons
   - Automatically gets or creates the RFT NEW record

2. **`RFTNewShortTab.tsx`**
   - Renders all sections of the SHORT report:
     - Project info table
     - Objectives table
     - Staging table
     - Risk table
     - Brief table
     - Fee table
     - Transmittal schedule

3. **`RFTNewTransmittalSchedule.tsx`**
   - Reuse or adapt `AddendumTransmittalSchedule` component
   - Display documents in the transmittal

### Hooks to Create

1. **`use-rft-new.ts`**
   - Simplified compared to `use-addenda.ts` (no create/delete, just get-or-create)
   - Functions:
     - `getRftNew()` - get or create the RFT NEW record
     - `refetch()`

2. **`use-rft-new-transmittal.ts`**
   - Similar to `use-addendum-transmittal.ts`
   - Functions:
     - `saveTransmittal(documentIds)`
     - `loadTransmittal()`
     - `hasTransmittal`
     - `documentCount`

## Integration Points

### ConsultantGallery.tsx
Add RFTNewSection **above** AddendumSection:

```tsx
{disciplineId && (
    <>
        <RFTNewSection
            projectId={projectId}
            disciplineId={disciplineId}
            disciplineName={discipline}
            selectedDocumentIds={selectedDocumentIds}
            onLoadTransmittal={onSetSelectedDocumentIds}
            onSaveTransmittal={() => selectedDocumentIds}
        />

        <AddendumSection
            projectId={projectId}
            disciplineId={disciplineId}
            disciplineName={discipline}
            selectedDocumentIds={selectedDocumentIds}
            onLoadTransmittal={onSetSelectedDocumentIds}
            onSaveTransmittal={() => selectedDocumentIds}
        />
    </>
)}
```

### ContractorGallery.tsx
Similar integration with `tradeId` instead of `disciplineId`.

## Data Sources

The SHORT tab aggregates data from multiple sources:

| Section | Data Source | API/Table |
|---------|-------------|-----------|
| Project Info | Project details | `/api/planning/[projectId]/details` |
| Objectives | Planning objectives | `planning_objectives` table |
| Staging | Project staging | `project_staging` table (if exists) or project details |
| Risk | Planning risks | `planning_risks` table |
| Brief | Discipline/Trade brief | `consultant_disciplines` (services/deliverables) or `contractor_trades` (works/deliverables) |
| Fee | Cost plan lines | `cost_lines` (Activity only) filtered by discipline/trade |
| Transmittal | Saved documents | `rft_new_transmittals` + `documents` + `versions` |

## Export Functionality

### PDF Export
Use the existing PDF generation infrastructure (similar to Addendum export):
- Render all sections in a formatted layout
- Include tables with proper styling
- Add page breaks between major sections
- Header: Project name, Document title
- Footer: Page numbers, generation date

### DOCX Export
Use similar structure to PDF but generate Word-compatible format:
- Use tables for structured data
- Preserve formatting
- Allow for post-export editing

## UI/UX Considerations

### Visual Hierarchy
1. **Section Header**: "RFT NEW" with file icon (blue highlight color `#4fc1ff`)
2. **Action Buttons**: Save/Load transmittal, Export PDF/Word
3. **Tab Interface**: Two tabs - SHORT and LONG (no numbered tabs, no delete/create buttons)
4. **Content Area**: Collapsed by default, expands on interaction

### Styling
- Match Addendum section styling
- Use VS Code dark theme colors
- Blue highlight for active elements
- Proper spacing between sections

### Interactions
- Clicking SHORT or LONG tab switches the view
- RFT NEW is automatically created when the discipline/trade is selected (no manual creation)
- Export buttons are always enabled (no need to select a report)

## Validation Rules

1. **Creation**:
   - Must have either disciplineId or tradeId (not both)
   - Must have valid projectId

2. **Transmittal**:
   - Can only add documents that belong to the same project
   - No duplicate documents in the same transmittal

3. **Export**:
   - Cannot export without selecting an RFT NEW
   - Must have valid data sources (project details, objectives, etc.)

## Migration Requirements

### Database Migration
Create migration script: `drizzle/0017_rft_new.sql`

```sql
-- Create rft_new table
CREATE TABLE IF NOT EXISTS rft_new (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL,
    discipline_id TEXT,
    trade_id TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (project_id) REFERENCES projects(id),
    FOREIGN KEY (discipline_id) REFERENCES consultant_disciplines(id),
    FOREIGN KEY (trade_id) REFERENCES contractor_trades(id),
    CHECK (
        (discipline_id IS NOT NULL AND trade_id IS NULL) OR
        (discipline_id IS NULL AND trade_id IS NOT NULL)
    ),
    UNIQUE (project_id, discipline_id),
    UNIQUE (project_id, trade_id)
);

-- Create rft_new_transmittals table
CREATE TABLE IF NOT EXISTS rft_new_transmittals (
    id TEXT PRIMARY KEY,
    rft_new_id TEXT NOT NULL,
    document_id TEXT NOT NULL,
    added_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (rft_new_id) REFERENCES rft_new(id) ON DELETE CASCADE,
    FOREIGN KEY (document_id) REFERENCES documents(id)
);
```

### Schema Updates
Update `src/lib/db/schema.ts` to include:
- `rftNew` table definition
- `rftNewTransmittals` table definition
- Relations definitions

## Success Criteria

1. One RFT NEW is automatically created per discipline/trade (no manual creation required)
2. SHORT and LONG tabs are clearly labeled (not numbered)
3. SHORT tab displays all required sections with accurate data
4. Users can save/load document transmittals
5. Export to PDF produces a well-formatted, professional document
6. Export to DOCX produces an editable document
7. RFT NEW section appears above Addendum in the UI
8. All data is correctly filtered by discipline/trade
9. UI matches the existing Addendum section styling
10. No Plus or Delete buttons (single report per discipline/trade)

## Future Enhancements (LONG Tab)

The LONG tab is reserved for future implementation and may include:
- Extended project information
- Detailed specifications
- Additional sections as requested
- Custom content editing capabilities

## Implementation Priority

### Phase 1 (High Priority)
1. Database schema and migration
2. API routes for CRUD operations
3. Basic RFTNewSection component
4. RFTNewTabs component
5. Integration into ConsultantGallery and ContractorGallery

### Phase 2 (Medium Priority)
1. SHORT tab content implementation
2. Data aggregation from planning objectives, risks, staging
3. Fee section with cost plan filtering
4. Transmittal functionality

### Phase 3 (Lower Priority)
1. PDF export functionality
2. DOCX export functionality
3. UI polish and refinements
4. Testing and bug fixes

## Dependencies

- Feature 003 (Planning Card) - for objectives, staging, risks
- Feature 006 (Cost Planning) - for fee section data
- Existing document management system - for transmittal functionality
- Export utilities (pdf-enhanced.ts) - for PDF generation

## Notes

- This feature does NOT replace the existing RFT feature
- User will delete the old RFT feature later
- RFT NEW focuses on brief, comprehensive reports
- Most content is dynamically generated, but the Brief section allows for manual editing and autosave.
