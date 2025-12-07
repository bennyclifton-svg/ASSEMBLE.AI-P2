# Tasks: Consultant & Contractor Cards

**Feature**: 004-consultant-contractor-cards
**Date**: 2025-11-23
**Status**: Phase 13 Complete - Only Duplicate Prevention Remaining (Phase 12)
**Last Updated**: 2025-12-07
**Implementation**: ~92% Complete

## Phase 1: Database Schema & API Foundation

### Database Schema
- [x] Create migration for `consultants` table
  - [x] Add all fields (id, projectId, companyName, contactPerson, discipline, email, phone, mobile, address, abn, notes, shortlisted)
  - [x] Add timestamps (createdAt, updatedAt)
  - [x] Add foreign key to projects table
- [x] Create migration for `contractors` table
  - [x] Add all fields (id, projectId, companyName, contactPerson, trade, email, phone, address, abn, notes, shortlisted)
  - [x] Add timestamps (createdAt, updatedAt)
  - [x] Add foreign key to projects table
- [x] Update schema.ts with new table definitions
- [x] Run migrations

### API Endpoints - Consultants
- [x] Create `src/app/api/consultants/firms/route.ts`
  - [x] Implement GET (list all for project)
  - [x] Implement POST (create new)
- [x] Create `src/app/api/consultants/firms/[id]/route.ts`
  - [x] Implement PUT (update)
  - [x] Implement DELETE (delete)
- [ ] Add duplicate check logic (email OR company+discipline) - **MISSING**
- [x] Test all endpoints

### API Endpoints - Contractors
- [x] Create `src/app/api/contractors/firms/route.ts`
  - [x] Implement GET (list all for project)
  - [x] Implement POST (create new)
- [x] Create `src/app/api/contractors/firms/[id]/route.ts`
  - [x] Implement PUT (update)
  - [x] Implement DELETE (delete)
- [ ] Add duplicate check logic (company+trade) - **MISSING**
- [x] Test all endpoints

---

## Phase 2: Consultant Gallery UI

### Custom Hooks
- [x] Create `src/lib/hooks/use-consultants.ts`
  - [x] Implement fetch consultants for project
  - [x] Implement add consultant mutation
  - [x] Implement update consultant mutation
  - [x] Implement delete consultant mutation
  - [x] Add optimistic updates
  - [x] Add toggleAward function for Cost Planning integration

### Components
- [x] Create `src/components/consultants/ConsultantGallery.tsx`
  - [x] Implement discipline sub-tabs (from active disciplines)
  - [x] Implement horizontal scrollable container
  - [x] Add "Add Consultant" button (dynamic empty cards)
  - [x] Add empty state for each discipline
  - [x] Add loading state
  - [x] Add Brief section (Services, Fee, Program)
  - [x] Add drag & drop extraction
- [x] Create `src/components/consultants/ConsultantForm.tsx`
  - [x] Create form fields (companyName, contactPerson, email, mobile, address, abn)
  - [ ] Add phone field to UI - **MISSING**
  - [ ] Add notes field to UI - **MISSING**
  - [x] Add field validation
  - [ ] Add duplicate warning display - **MISSING**
  - [x] Implement save/cancel actions
  - [x] Add shortlist toggle
  - [x] Add award toggle
- [x] Use dialog component for delete confirmation
  - [x] Design confirmation dialog
  - [x] Add delete action

### Integration
- [x] Update `ConsultantCard.tsx` to use `ConsultantGallery`
- [x] Test horizontal scrolling with multiple cards
- [x] Test responsive layout
- [x] Test all CRUD operations

---

## Phase 3: Contractor Gallery UI

### Custom Hooks
- [x] Create `src/lib/hooks/use-contractors.ts`
  - [x] Implement fetch contractors for project
  - [x] Implement add contractor mutation
  - [x] Implement update contractor mutation
  - [x] Implement delete contractor mutation
  - [x] Add optimistic updates
  - [x] Add toggleAward function for Cost Planning integration

### Components
- [x] Create `src/components/contractors/ContractorGallery.tsx`
  - [x] Implement trade sub-tabs (from active trades)
  - [x] Implement horizontal scrollable container
  - [x] Add "Add Contractor" button (dynamic empty cards)
  - [x] Add empty state for each trade
  - [x] Add loading state
  - [x] Add Scope section (Works, Price, Program)
  - [x] Add drag & drop extraction
- [x] Create `src/components/contractors/ContractorForm.tsx`
  - [x] Create form fields (companyName, contactPerson, email, mobile, address, abn)
  - [ ] Add phone field to UI - **MISSING**
  - [ ] Add notes field to UI - **MISSING**
  - [x] Add field validation
  - [ ] Add duplicate warning display - **MISSING**
  - [x] Implement save/cancel actions
  - [x] Add shortlist toggle
  - [x] Add award toggle
- [x] Use dialog component for delete confirmation
  - [x] Design confirmation dialog
  - [x] Add delete action

### Integration
- [x] Update `ConsultantCard.tsx` to use `ContractorGallery`
- [x] Test horizontal scrolling with multiple cards
- [x] Test responsive layout
- [x] Test all CRUD operations

---

## Phase 4: Manual CRUD Operations

### Add Functionality
- [ ] Implement "Add Consultant" button click handler
- [ ] Show ConsultantForm modal/inline
- [ ] Validate required fields (companyName, discipline, email)
- [ ] Call duplicate check API before save
- [ ] Handle duplicate warning (show modal with options)
- [ ] Save to database via API
- [ ] Refresh gallery after successful add
- [ ] Repeat for Contractors

### Edit Functionality
- [ ] Implement edit button click on ConsultantFirmCard
- [ ] Switch card to inline edit mode
- [ ] Pre-fill form with existing data
- [ ] Validate changes
- [ ] Call duplicate check API (excluding current record)
- [ ] Save changes via API
- [ ] Exit edit mode and refresh
- [ ] Repeat for Contractors

### Delete Functionality
- [ ] Implement delete button click on card
- [ ] Show DeleteConfirmModal
- [ ] Call DELETE API endpoint
- [ ] Remove card from gallery (optimistic update)
- [ ] Verify empty tab remains visible
- [ ] Repeat for Contractors

---

## Phase 5: AI-Assisted Data Extraction

### File Upload Infrastructure
- [x] Create file upload utility for consultants/contractors
- [x] Support PDF, images (JPG, PNG), text files
- [x] Add drag & drop zone to gallery
- [ ] Add paste text handler (not implemented - out of scope)
- [ ] Support email files (.msg, .eml) (not implemented - requires additional libraries)

### OCR & Text Extraction
- [x] Install OCR library (Tesseract.js)
- [x] Create text extraction utility for images
- [x] Create PDF text extraction utility (pdf-parse with dynamic import)
- [x] Create text file reader
- [ ] Test extraction accuracy on sample files (pending OpenAI API key setup)

### AI Integration
- [x] Create `src/app/api/consultants/extract/route.ts`
  - [x] Accept file upload or text input
  - [x] Extract text from file
  - [x] Send to OpenAI API with extraction prompt
  - [x] Parse AI response
  - [x] Calculate confidence score
  - [x] Return structured data + confidence
- [x] Create `src/app/api/contractors/extract/route.ts`
  - [x] Same as above but for contractors
- [x] Add OpenAI API key to environment variables (.env.local created)
- [ ] Test with real business cards/emails (pending user to add API key)

### UI Integration
- [x] Add drag & drop overlay to ConsultantGallery
- [x] Show extraction progress indicator
- [x] Pre-fill ConsultantForm with extracted data
- [x] Show confidence warning if < 70%
- [x] Allow user to review and edit before save (auto-save after 1 second)
- [x] Repeat for ContractorGallery

### Technical Fixes Applied
- [x] Fixed pdf-parse import error using dynamic import for CommonJS module
- [x] Fixed drop zone to appear only on first empty card (not all cards)
- [x] Created text-extraction utility with confidence scoring
- [x] Documentation created (AI-EXTRACTION-IMPLEMENTATION.md)

---

## Phase 6: Duplicate Prevention

### Backend Logic
- [ ] Implement `checkDuplicateConsultant` function
  - [ ] Check email match
  - [ ] Check company name + discipline match
  - [ ] Return existing record if found
- [ ] Implement `checkDuplicateContractor` function
  - [ ] Check company name + trade match
  - [ ] Return existing record if found
- [ ] Add duplicate check to POST endpoints
- [ ] Add duplicate check to PUT endpoints (exclude current record)

### UI Components
- [ ] Create `DuplicateWarningModal.tsx`
  - [ ] Show existing record details
  - [ ] Add "Use Existing" button
  - [ ] Add "Create Anyway" button
  - [ ] Add "Merge" button (optional)
- [ ] Integrate modal into add/edit flows
- [ ] Test duplicate detection scenarios

---

## Phase 7: Testing & Polish

### Manual Testing
- [ ] Add consultant for each active discipline
- [ ] Add contractor for each active trade
- [ ] Edit consultant details and verify save
- [ ] Edit contractor details and verify save
- [ ] Delete consultant and verify removal
- [ ] Delete contractor and verify removal
- [ ] Refresh page and verify data persists
- [ ] Test duplicate prevention (email match)
- [ ] Test duplicate prevention (company + discipline/trade match)
- [ ] Verify empty tabs remain visible after deleting last card

### AI Extraction Testing
- [ ] Upload 10 PDF business cards
- [ ] Upload 10 image business cards
- [ ] Upload 10 email files
- [ ] Paste 10 text samples
- [ ] Calculate extraction accuracy (target ≥ 90%)
- [ ] Test low confidence warning (< 70%)
- [ ] Verify extracted data is editable

### Edge Cases
- [ ] Delete last card in discipline - verify tab remains
- [ ] Try to add consultant to disabled discipline - verify error
- [ ] Test horizontal scroll with 15+ cards
- [ ] Test responsive layout on tablet (1024px)
- [ ] Test touch scrolling on mobile
- [ ] Test with very long company names
- [ ] Test with missing optional fields
- [ ] Test with special characters in names

### Performance
- [ ] Test with 100+ consultants
- [ ] Test with 100+ contractors
- [ ] Verify smooth scrolling
- [ ] Check API response times
- [ ] Optimize if needed

### Accessibility
- [ ] Test keyboard navigation
- [ ] Verify screen reader compatibility
- [ ] Check color contrast ratios
- [ ] Test with browser zoom (200%)

---

## Documentation

- [ ] Update README with new feature
- [ ] Document API endpoints
- [ ] Add inline code comments
- [ ] Create user guide for AI extraction
- [ ] Document duplicate prevention logic

---

## Deployment Checklist

- [ ] Run all migrations on staging
- [ ] Test feature on staging environment
- [ ] Verify OpenAI API key is set in production
- [ ] Run performance tests
- [ ] Get user acceptance sign-off
- [ ] Deploy to production
- [ ] Monitor for errors in first 24 hours

---

## Phase 8: UI Refactor - Brief/Scope Sections & Layout

### Database Schema
- [x] Add migration for Brief fields on `consultant_disciplines` table
  - [x] Add `brief_services` TEXT column
  - [x] Add `brief_fee` TEXT column
  - [x] Add `brief_program` TEXT column
- [x] Add migration for Scope fields on `contractor_trades` table
  - [x] Add `scope_works` TEXT column
  - [x] Add `scope_price` TEXT column
  - [x] Add `scope_program` TEXT column
- [x] Update `schema.ts` with new columns
- [x] Run migration

### API Updates
- [x] Update `PUT /api/consultants/disciplines/[id]` to handle Brief fields
- [x] Update `PUT /api/contractors/trades/[id]` to handle Scope fields
- [x] Update hooks to include Brief/Scope data in fetch responses

### UI Components
- [x] Modify `InlineEditField.tsx` - add `rows` prop for textarea height
- [x] Modify `ConsultantGallery.tsx`:
  - [x] Add Brief section with Services, Fee, Program fields
  - [x] Add "Firms" section heading
  - [x] Use InlineEditField with rows={6}
- [x] Modify `ContractorGallery.tsx`:
  - [x] Add Scope section with Works, Price, Program fields
  - [x] Add "Firms" section heading
  - [x] Use InlineEditField with rows={6}
- [x] Refactor `ConsultantCard.tsx`:
  - [x] Remove header title
  - [x] Move buttons into TabsContent (after discipline/trade tabs)
  - [x] Stack Save/Load vertically, Sync to AI beside them
  - [x] Select first discipline/trade by default

### Testing
- [ ] Verify Brief fields save and persist for each discipline
- [ ] Verify Scope fields save and persist for each trade
- [ ] Test inline editing with auto-save (blur triggers save)
- [ ] Test first tab selection on load
- [ ] Verify button layout matches design

---

## Phase 9: Award Toggle - Link Firms to Cost Planning

**Purpose**: Add "Award" toggle to Firm Cards that links awarded consultants/contractors to the companies master list, making them available in the Cost Planning module.

### Database Schema
- [x] Create migration `drizzle/0010_award_toggle.sql`
  - [x] Add `awarded` INTEGER DEFAULT 0 to consultants table
  - [x] Add `company_id` TEXT REFERENCES companies(id) to consultants table
  - [x] Add `awarded` INTEGER DEFAULT 0 to contractors table
  - [x] Add `company_id` TEXT REFERENCES companies(id) to contractors table
  - [x] Create performance indexes
- [x] Update `schema.ts` with new columns and relations
- [x] Create and run migration runner script

### API Endpoints
- [x] Create `POST /api/cost-companies/find-or-create`
  - [x] Find company by name (case-insensitive)
  - [x] Create new company if not found
  - [x] Return company record with id
- [x] Update `POST /api/consultants/firms` to handle `awarded`, `companyId`
- [x] Update `PUT /api/consultants/firms/[id]` to handle `awarded`, `companyId`
- [x] Update `POST /api/contractors/firms` to handle `awarded`, `companyId`
- [x] Update `PUT /api/contractors/firms/[id]` to handle `awarded`, `companyId`

### Hook Layer
- [x] Update `use-consultants.ts`
  - [x] Add `awarded`, `companyId` to interface
  - [x] Add `toggleAward(id, awarded)` function
  - [x] Implement find-or-create logic for awarding
- [x] Update `use-contractors.ts`
  - [x] Add `awarded`, `companyId` to interface
  - [x] Add `toggleAward(id, awarded)` function
  - [x] Implement find-or-create logic for awarding

### UI Components
- [x] Update `ConsultantForm.tsx`
  - [x] Add Award toggle next to Shortlisted
  - [x] Add "Awarded" badge indicator (green)
  - [x] Award toggle disabled until card is saved
  - [x] Add `onAwardChange` prop
- [x] Update `ContractorForm.tsx`
  - [x] Add Award toggle next to Shortlisted
  - [x] Add "Awarded" badge indicator (green)
  - [x] Award toggle disabled until card is saved
  - [x] Add `onAwardChange` prop
- [x] Update `ConsultantGallery.tsx`
  - [x] Add `handleAwardChange` handler
  - [x] Pass `onAwardChange` prop to ConsultantForm
  - [x] Show toast on success/failure
- [x] Update `ContractorGallery.tsx`
  - [x] Add `handleAwardChange` handler
  - [x] Pass `onAwardChange` prop to ContractorForm
  - [x] Show toast on success/failure

### Data Migration
- [x] Create `scripts/migrate-existing-firms.js`
  - [x] Find unlinked consultants/contractors
  - [x] Find or create matching companies
  - [x] Set companyId and awarded=true

### Testing
- [ ] Toggle Award ON for a consultant - verify company created
- [ ] Toggle Award OFF - verify companyId preserved
- [ ] Award same company from different project - verify reuses existing
- [ ] Verify awarded company appears in Cost Planning autocomplete
- [ ] Test Award toggle disabled on unsaved cards
- [ ] Test error handling and UI reversion

---

## Phase 10: Bonus Features (Report Generation & Document Management)

**Status**: COMPLETE (implemented beyond spec requirements)

### Document Management Tiles (DisciplineRepoTiles)
- [x] Create `src/components/documents/DisciplineRepoTiles.tsx` (392 lines)
  - [x] Implement Sources tiles (blue) - Save/Load project repos
  - [x] Implement Transmittal tiles (green) - Save/Load transmittals
  - [x] Implement Generation Mode tiles (purple/orange)
  - [x] Show document counts on tiles
  - [x] Conditional rendering based on selection state
  - [x] Visual color-coding and hover effects

### Report Generation System
- [x] Create `src/components/reports/ReportsSection.tsx` (286 lines)
  - [x] Inline report generation within discipline/trade tabs
  - [x] Report lifecycle management (draft, toc_pending, generating, complete, failed)
  - [x] Report history display with delete capability
- [x] Create `src/components/reports/ReportGenerator.tsx`
  - [x] Two generation modes: Data Only and AI Assisted
  - [x] Streaming progress updates
  - [x] Mode selection persistence per discipline/trade
- [x] Create `src/components/reports/SmartContextPanel.tsx`
  - [x] Source document visibility during generation
- [x] Create `src/components/reports/SectionViewer.tsx`
  - [x] Report content display
- [x] Create `src/components/reports/TocEditor.tsx`
  - [x] Table of contents editing

### Report Generation Hooks
- [x] Create `src/lib/hooks/use-report-stream.ts`
  - [x] Streaming report generation with progress tracking
- [x] Create `src/lib/hooks/use-report-generation.ts`
  - [x] Report generation state management
- [x] Create `src/lib/hooks/use-report-lock.ts`
  - [x] Prevent concurrent generation conflicts

### Transmittal Integration
- [x] Create `src/lib/hooks/use-transmittal.ts`
  - [x] One transmittal per discipline/trade (upsert behavior)
  - [x] Save selection from DocumentRepository
  - [x] Load transmittal documents back to selection
- [x] Integrate with 007-RAG specification
  - [x] Transmittal appendix in reports
  - [x] Document count tracking

---

## Phase 11: Fee & Price Structure Management

**Status**: COMPLETE (bonus feature)

### Database Schema
- [x] Create `disciplineFeeItems` table (schema.ts lines 212-220)
  - [x] Fields: id, disciplineId, description, order
- [x] Create `contractorTradeItems` table (schema.ts lines 222-230)
  - [x] Fields: id, tradeId, description, order

### API Endpoints
- [x] Create `src/app/api/consultants/disciplines/[id]/fee-items/route.ts`
  - [x] GET (list fee items for discipline)
  - [x] POST (create fee item)
  - [x] PUT (update fee item)
  - [x] DELETE (delete fee item)
- [x] Create `src/app/api/contractors/trades/[id]/price-items/route.ts`
  - [x] GET (list price items for trade)
  - [x] POST (create price item)
  - [x] PUT (update price item)
  - [x] DELETE (delete price item)

### Hooks
- [x] Create `src/lib/hooks/use-discipline-fee-items.ts`
  - [x] Fetch fee items
  - [x] Add/update/delete fee items
  - [x] Reorder items (drag-and-drop)
- [x] Create `src/lib/hooks/use-trade-price-items.ts`
  - [x] Fetch price items
  - [x] Add/update/delete price items
  - [x] Reorder items (drag-and-drop)

### UI Components
- [x] Create `src/components/consultants/FeeStructureSection.tsx` (284 lines)
  - [x] Drag-and-drop reordering
  - [x] Inline editing with keyboard support (Enter/Escape)
  - [x] Add/delete fee items
  - [x] Real-time validation
- [x] Create `src/components/contractors/PriceStructureSection.tsx`
  - [x] Same features as FeeStructureSection for contractors

---

## Phase 12: Missing Features (PRIORITY)

**Status**: NOT STARTED - Critical for FR-006, FR-007 compliance

### Duplicate Prevention Logic
- [ ] Implement `checkDuplicateConsultant` in `src/app/api/consultants/firms/route.ts`
  - [ ] Check email match (case-insensitive)
  - [ ] Check company name + discipline match
  - [ ] Return 409 status with existing record data
- [ ] Implement `checkDuplicateContractor` in `src/app/api/contractors/firms/route.ts`
  - [ ] Check company name + trade match
  - [ ] Return 409 status with existing record data
- [ ] Add duplicate check to PUT endpoints (exclude current record by ID)

### Duplicate Warning Modal
- [ ] Create `src/components/consultants/DuplicateWarningModal.tsx`
  - [ ] Show existing record details (company, email, discipline)
  - [ ] Add "Use Existing" button (cancel and highlight existing)
  - [ ] Add "Create Anyway" button (override duplicate check)
  - [ ] Add "Merge" button (optional - update existing with new data)
- [ ] Integrate modal into ConsultantGallery add/edit flows
- [ ] Create equivalent modal for ContractorGallery
- [ ] Test duplicate detection scenarios

### Missing Form Fields
- [x] ~~Add phone field to `ConsultantForm.tsx`~~ - **NOT NEEDED** (mobile field is sufficient)
- [x] Add notes field to `ConsultantForm.tsx`
  - [x] Add Label and Textarea for notes (rows={4})
  - [x] Update formData state to include notes
  - [x] Verify persistence to database
- [x] ~~Add phone field to `ContractorForm.tsx`~~ - **NOT NEEDED** (mobile field is sufficient)
- [x] Add notes field to `ContractorForm.tsx`
  - [x] Add Label and Textarea for notes (rows={4})
  - [x] Update formData state to include notes
  - [x] Notes already supported in API

---

## Phase 13: Bug Fixes (PRIORITY)

**Status**: ✅ COMPLETE (2025-12-07)

### Drag & Drop on All Empty Cards
**Bug Fixed**: Drag & drop only worked on first empty card - now works on ALL empty cards

**Completed Fix**:
- [x] Update `ConsultantGallery.tsx`
  - [x] Removed `isFirstEmpty` check on line 307
  - [x] Allow `onDragOver` on ALL empty cards (where `!card.consultant`)
  - [ ] Test drag & drop works on any empty card position (pending manual test)
- [x] Update `ContractorGallery.tsx`
  - [x] Removed `isFirstEmpty` check on line 311
  - [x] Allow `onDragOver` on ALL empty cards (where `!card.contractor`)
  - [ ] Test drag & drop works on any empty card position (pending manual test)

**Code Change Applied** (ConsultantGallery.tsx:307 & ContractorGallery.tsx:311):
```typescript
// BEFORE:
const isFirstEmpty = !card.consultant && index === cards.findIndex(c => !c.consultant);
onDragOver={isFirstEmpty ? handleDragOver : undefined}

// AFTER:
const isEmpty = !card.consultant;
onDragOver={isEmpty ? handleDragOver : undefined}
```

### Extraction Auto-Save Behavior (Consider)
**Current Behavior**: Auto-saves immediately after extraction without user review
**Spec FR-003**: "user confirms/edits before save"

**Options**:
- [ ] Option A: Keep current behavior (faster UX, user can edit after save)
- [ ] Option B: Revert to confirmation flow (matches spec exactly)
- [ ] Decision: User to decide

---
