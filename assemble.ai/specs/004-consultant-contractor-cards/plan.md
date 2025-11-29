# Implementation Plan: Consultant & Contractor Cards

**Feature**: 004-consultant-contractor-cards  
**Date**: 2025-11-23  
**Status**: Planning

## Overview

Implement two horizontal card gallery sections for managing Consultants and Contractors with:
- Discipline/Trade-based tab filtering (synced with Planning Card)
- Manual CRUD operations (Add, Edit, Delete)
- AI-assisted data extraction from drag & drop files
- Duplicate prevention and data persistence

## Current State

**Already Implemented:**
- ✅ Basic `ConsultantCard` component with Consultants/Contractors tabs
- ✅ Integration with `useConsultantDisciplines` and `useContractorTrades` hooks
- ✅ Display of enabled disciplines and trades count
- ✅ Planning Card integration for active disciplines/trades

**Needs Implementation:**
- ❌ Database schema for consultants and contractors
- ❌ API endpoints for CRUD operations
- ❌ Horizontal card gallery UI
- ❌ Discipline/Trade sub-tabs
- ❌ Manual add/edit/delete functionality
- ❌ AI-assisted data extraction
- ❌ Duplicate prevention logic

---

## Phase 1: Database Schema & API Foundation

### Database Schema

#### [NEW] `consultants` Table
```typescript
{
  id: string (UUID)
  projectId: string (FK → projects.id)
  companyName: string
  contactPerson: string | null
  discipline: string (matches consultant_disciplines.disciplineName)
  email: string
  phone: string | null
  mobile: string | null
  address: string | null
  abn: string | null
  notes: string | null
  shortlisted: boolean (default: false)
  createdAt: timestamp
  updatedAt: timestamp
}
```

#### [NEW] `contractors` Table
```typescript
{
  id: string (UUID)
  projectId: string (FK → projects.id)
  companyName: string
  contactPerson: string | null
  trade: string (matches contractor_trades.tradeName)
  email: string
  phone: string | null
  address: string | null
  abn: string | null
  notes: string | null
  shortlisted: boolean (default: false)
  createdAt: timestamp
  updatedAt: timestamp
}
```

### API Endpoints

#### Consultants
- `GET /api/consultants?projectId=X` - List all consultants for project
- `POST /api/consultants` - Create new consultant
- `PUT /api/consultants/[id]` - Update consultant
- `DELETE /api/consultants/[id]` - Delete consultant
- `POST /api/consultants/extract` - AI extraction from file/text

#### Contractors
- `GET /api/contractors?projectId=X` - List all contractors for project
- `POST /api/contractors` - Create new contractor
- `PUT /api/contractors/[id]` - Update contractor
- `DELETE /api/contractors/[id]` - Delete contractor
- `POST /api/contractors/extract` - AI extraction from file/text

---

## Phase 2: Consultant Gallery UI

### Components to Create

#### `ConsultantGallery.tsx`
- Horizontal scrollable card container
- Discipline sub-tabs (from active disciplines)
- "Add Consultant" button
- Empty state for each discipline

#### `ConsultantFirmCard.tsx`
- Card layout with firm details
- Inline edit mode
- Delete button with confirmation
- Shortlist toggle
- Drag & drop zone overlay

#### `ConsultantForm.tsx`
- Modal/inline form for add/edit
- Field validation
- Duplicate detection warning

### Layout Structure
```
ConsultantCard
├── Main Tabs: [Consultants | Contractors]
└── Consultants Tab
    ├── Discipline Sub-tabs: [Architectural | Structural | MEP | ...]
    └── For each discipline:
        ├── Horizontal scrollable card gallery
        ├── ConsultantFirmCard × N
        └── "Add Consultant" button
```

---

## Phase 3: Contractor Gallery UI

### Components to Create

#### `ContractorGallery.tsx`
- Horizontal scrollable card container
- Trade sub-tabs (from active trades)
- "Add Contractor" button
- Empty state for each trade

#### `ContractorFirmCard.tsx`
- Card layout with firm details
- Inline edit mode
- Delete button with confirmation
- Shortlist toggle
- Drag & drop zone overlay

#### `ContractorForm.tsx`
- Modal/inline form for add/edit
- Field validation
- Duplicate detection warning

---

## Phase 4: Manual CRUD Operations

### Add Functionality
1. Click "Add Consultant/Contractor" button
2. Show inline form or modal
3. Validate required fields (companyName, discipline/trade, email)
4. Check for duplicates (FR-006, FR-007)
5. Save to database
6. Refresh gallery

### Edit Functionality
1. Click edit icon on card
2. Switch card to edit mode (inline)
3. Update fields
4. Validate and check duplicates
5. Save changes
6. Exit edit mode

### Delete Functionality
1. Click delete icon on card
2. Show confirmation modal
3. Delete from database
4. Remove card from gallery
5. Keep empty tab visible (FR-009)

---

## Phase 5: AI-Assisted Data Extraction

### File Upload & Parsing

#### Supported Formats
- PDF (business cards, letterheads)
- Images (JPG, PNG - business cards)
- Email files (.msg, .eml)
- Plain text (pasted)

#### AI Extraction Flow
1. User drags file onto card gallery or pastes text
2. Upload file to server
3. Extract text using OCR/parser
4. Send to AI API (OpenAI/Anthropic) with prompt:
   ```
   Extract consultant/contractor information from this text:
   - Company Name
   - Contact Person
   - Email
   - Phone/Mobile
   - Address
   - ABN
   - Discipline/Trade (infer from context)
   
   Return JSON with confidence scores.
   ```
5. Parse AI response
6. If confidence < 70%, show warning
7. Pre-fill form with extracted data
8. User reviews and confirms/edits
9. Save to database

### AI Extraction Endpoint
```typescript
POST /api/consultants/extract
Body: {
  fileUrl?: string,
  text?: string,
  projectId: string
}
Response: {
  data: {
    companyName: string,
    contactPerson: string,
    email: string,
    phone: string,
    discipline: string,
    ...
  },
  confidence: number,
  warnings: string[]
}
```

---

## Phase 6: Duplicate Prevention

### Consultant Duplicate Logic (FR-006)
- Check: Same email OR (same companyName + same discipline)
- On match: Show warning modal with options:
  - "Use Existing" - Cancel add
  - "Create Anyway" - Override
  - "Merge" - Update existing with new data

### Contractor Duplicate Logic (FR-007)
- Check: Same companyName + same trade
- On match: Show same warning modal

### Implementation
```typescript
async function checkDuplicateConsultant(data) {
  const existing = await db.query.consultants.findFirst({
    where: or(
      eq(consultants.email, data.email),
      and(
        eq(consultants.companyName, data.companyName),
        eq(consultants.discipline, data.discipline)
      )
    )
  });
  return existing;
}
```

---

## Phase 7: Testing & Polish

### Manual Testing
- [ ] Add consultant manually for each discipline
- [ ] Add contractor manually for each trade
- [ ] Edit consultant/contractor details
- [ ] Delete consultant/contractor
- [ ] Verify data persists after page reload
- [ ] Test duplicate prevention (email match)
- [ ] Test duplicate prevention (company + discipline match)
- [ ] Test empty tab visibility

### AI Extraction Testing
- [ ] Upload PDF business card
- [ ] Upload image business card
- [ ] Upload email (.msg, .eml)
- [ ] Paste text
- [ ] Verify extraction accuracy ≥ 90%
- [ ] Test low confidence warning (< 70%)

### Edge Cases
- [ ] Delete last card in discipline - tab remains
- [ ] Add consultant to disabled discipline - should fail
- [ ] Horizontal scroll with 10+ cards
- [ ] Responsive layout on tablet
- [ ] Touch scrolling on mobile

---

## Technical Decisions

### Card Layout
- **Width**: Fixed 320px per card
- **Height**: Auto (min 200px)
- **Spacing**: 16px gap between cards
- **Scroll**: Horizontal overflow-x-auto with custom scrollbar

### Styling
- Follow existing dark theme (#252526, #1e1e1e, #3e3e42)
- Use VS Code-inspired colors
- Card hover: subtle border highlight
- Edit mode: blue border (#0e639c)

### State Management
- Use React Query for data fetching/caching
- Optimistic updates for add/edit/delete
- Local state for edit mode

### AI Integration
- Use OpenAI GPT-4 for extraction
- Fallback to manual entry if API fails
- Cache extraction results to avoid re-processing

---

## Success Criteria

- ✅ User can add consultant/contractor manually in < 30 seconds
- ✅ User can add via AI in < 15 seconds after drop
- ✅ ≥ 90% field extraction accuracy
- ✅ 100% data persistence after reload
- ✅ No accidental duplicates

---

## Dependencies

- OpenAI API key for AI extraction
- File upload/storage system (already exists)
- OCR library for image processing (Tesseract.js or similar)
- Email parser library (.msg, .eml)

---

## Out of Scope

- Bulk CSV import
- LinkedIn/Outlook integration
- Sending tender packages
- Contact history/notes timeline
- Document attachments per consultant/contractor

---

## Estimated Effort

- Phase 1 (DB + API): 4-6 hours
- Phase 2 (Consultant UI): 6-8 hours
- Phase 3 (Contractor UI): 4-6 hours (similar to Phase 2)
- Phase 4 (CRUD): 4-6 hours
- Phase 5 (AI Extraction): 8-10 hours
- Phase 6 (Duplicates): 2-3 hours
- Phase 7 (Testing): 4-6 hours

**Total**: 32-45 hours (~1 week)
