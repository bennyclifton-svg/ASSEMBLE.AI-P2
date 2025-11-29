# Tasks: Consultant & Contractor Cards

**Feature**: 004-consultant-contractor-cards
**Date**: 2025-11-23
**Status**: Phase 5 Complete (AI Extraction) - Pending User Testing
**Last Updated**: 2025-11-23

## Phase 1: Database Schema & API Foundation

### Database Schema
- [ ] Create migration for `consultants` table
  - [ ] Add all fields (id, projectId, companyName, contactPerson, discipline, email, phone, mobile, address, abn, notes, shortlisted)
  - [ ] Add timestamps (createdAt, updatedAt)
  - [ ] Add foreign key to projects table
- [ ] Create migration for `contractors` table
  - [ ] Add all fields (id, projectId, companyName, contactPerson, trade, email, phone, address, abn, notes, shortlisted)
  - [ ] Add timestamps (createdAt, updatedAt)
  - [ ] Add foreign key to projects table
- [ ] Update schema.ts with new table definitions
- [ ] Run migrations

### API Endpoints - Consultants
- [ ] Create `src/app/api/consultants/route.ts`
  - [ ] Implement GET (list all for project)
  - [ ] Implement POST (create new)
- [ ] Create `src/app/api/consultants/[id]/route.ts`
  - [ ] Implement PUT (update)
  - [ ] Implement DELETE (delete)
- [ ] Add duplicate check logic (email OR company+discipline)
- [ ] Test all endpoints with Postman/Thunder Client

### API Endpoints - Contractors
- [ ] Create `src/app/api/contractors/route.ts`
  - [ ] Implement GET (list all for project)
  - [ ] Implement POST (create new)
- [ ] Create `src/app/api/contractors/[id]/route.ts`
  - [ ] Implement PUT (update)
  - [ ] Implement DELETE (delete)
- [ ] Add duplicate check logic (company+trade)
- [ ] Test all endpoints with Postman/Thunder Client

---

## Phase 2: Consultant Gallery UI

### Custom Hooks
- [ ] Create `src/lib/hooks/use-consultants.ts`
  - [ ] Implement fetch consultants for project
  - [ ] Implement add consultant mutation
  - [ ] Implement update consultant mutation
  - [ ] Implement delete consultant mutation
  - [ ] Add optimistic updates

### Components
- [ ] Create `src/components/consultants/ConsultantGallery.tsx`
  - [ ] Implement discipline sub-tabs (from active disciplines)
  - [ ] Implement horizontal scrollable container
  - [ ] Add "Add Consultant" button
  - [ ] Add empty state for each discipline
  - [ ] Add loading state
- [ ] Create `src/components/consultants/ConsultantFirmCard.tsx`
  - [ ] Design card layout (company name, contact, email, phone, etc.)
  - [ ] Add edit/delete action buttons
  - [ ] Add shortlist toggle
  - [ ] Implement inline edit mode
  - [ ] Add hover effects
- [ ] Create `src/components/consultants/ConsultantForm.tsx`
  - [ ] Create form fields (all consultant fields)
  - [ ] Add field validation
  - [ ] Add duplicate warning display
  - [ ] Implement save/cancel actions
- [ ] Create `src/components/consultants/DeleteConfirmModal.tsx`
  - [ ] Design confirmation dialog
  - [ ] Add delete action

### Integration
- [ ] Update `ConsultantCard.tsx` to use `ConsultantGallery`
- [ ] Test horizontal scrolling with multiple cards
- [ ] Test responsive layout
- [ ] Test all CRUD operations

---

## Phase 3: Contractor Gallery UI

### Custom Hooks
- [ ] Create `src/lib/hooks/use-contractors.ts`
  - [ ] Implement fetch contractors for project
  - [ ] Implement add contractor mutation
  - [ ] Implement update contractor mutation
  - [ ] Implement delete contractor mutation
  - [ ] Add optimistic updates

### Components
- [ ] Create `src/components/contractors/ContractorGallery.tsx`
  - [ ] Implement trade sub-tabs (from active trades)
  - [ ] Implement horizontal scrollable container
  - [ ] Add "Add Contractor" button
  - [ ] Add empty state for each trade
  - [ ] Add loading state
- [ ] Create `src/components/contractors/ContractorFirmCard.tsx`
  - [ ] Design card layout (company name, contact, email, phone, etc.)
  - [ ] Add edit/delete action buttons
  - [ ] Add shortlist toggle
  - [ ] Implement inline edit mode
  - [ ] Add hover effects
- [ ] Create `src/components/contractors/ContractorForm.tsx`
  - [ ] Create form fields (all contractor fields)
  - [ ] Add field validation
  - [ ] Add duplicate warning display
  - [ ] Implement save/cancel actions
- [ ] Create `src/components/contractors/DeleteConfirmModal.tsx`
  - [ ] Design confirmation dialog
  - [ ] Add delete action

### Integration
- [ ] Update `ConsultantCard.tsx` to use `ContractorGallery`
- [ ] Test horizontal scrolling with multiple cards
- [ ] Test responsive layout
- [ ] Test all CRUD operations

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
