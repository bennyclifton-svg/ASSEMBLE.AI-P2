# Research: Direct Drag-to-Category Upload

**Phase**: 0 - Technical Research
**Date**: 2025-11-23
**Status**: Complete

## Overview

This document captures technical research findings and decisions for implementing the direct drag-to-category upload feature. All NEEDS CLARIFICATION items from the Technical Context have been resolved.

---

## Research Areas

### 1. Testing Framework Selection

**Decision**: Use Jest with React Testing Library + @testing-library/user-event for component tests

**Rationale**:
- Jest is the default testing framework for Next.js projects
- React Testing Library aligns with React 19 and promotes accessibility-focused testing
- @testing-library/user-event v14+ supports drag-and-drop simulation
- No additional setup required (Next.js includes Jest configuration via `next/jest`)

**Alternatives Considered**:
- **Vitest**: Faster, but requires migration from existing setup
- **Cypress/Playwright**: Better for E2E, but overkill for component-level drag-drop testing
- **Testing Library alone**: Insufficient without Jest test runner

**Implementation Notes**:
- Use `fireEvent.dragStart`, `fireEvent.drop` for drag-drop simulation
- Mock File API for file upload testing
- Use `screen.getByRole` for accessibility-first queries

---

### 2. Drag-and-Drop Implementation Strategy

**Decision**: Use react-dropzone for file drops, NOT @dnd-kit

**Rationale**:
- @dnd-kit is designed for **sortable lists and reordering** (current use: document table sorting)
- react-dropzone is purpose-built for **file upload zones** with built-in:
  - File validation (type, size)
  - Multiple file handling
  - Accessible keyboard support
  - Browser compatibility layer
- Mixing both libraries causes no conflict (different use cases)
- react-dropzone already used in existing UploadZone component

**Alternatives Considered**:
- **Native HTML5 Drag-and-Drop API**: Too low-level, browser inconsistencies, poor mobile support
- **@dnd-kit with custom file sensor**: Over-engineered for file uploads, no built-in validation
- **react-dnd**: Older library, larger bundle size, less active maintenance

**Implementation Notes**:
```tsx
import { useDropzone } from 'react-dropzone';

const { getRootProps, getInputProps, isDragActive } = useDropzone({
  onDrop: (files) => handleUpload(files, categoryId, subcategoryId),
  accept: { 'application/pdf': ['.pdf'], /* ... */ },
  maxSize: 20 * 1024 * 1024, // 20MB
  multiple: true,
});
```

---

### 3. Visual Feedback Patterns

**Decision**: Use Tailwind transitions + Radix UI Toast for feedback

**Rationale**:
- Existing codebase uses Tailwind CSS for all styling
- Radix Toast already integrated (`@radix-ui/react-toast`)
- Consistent with VS Code-inspired dark theme
- CSS transitions perform better than JS animations (GPU-accelerated)

**Visual States**:
1. **Idle**: Base tile appearance
2. **Hover** (drag over): Blue outline (`ring-2 ring-blue-500`), scale up (`scale-105`)
3. **Drop**: Brief flash animation, then reset
4. **Disabled** (no active subcategories): Opacity 50%, cursor not-allowed

**Animation Timing**:
- Hover transition: `transition-all duration-150 ease-in-out`
- Drop flash: `animate-pulse` (1 cycle)
- Toast duration: 3000ms (matches existing pattern)

**Alternatives Considered**:
- **Framer Motion**: Too heavy for simple hover states
- **CSS-in-JS (styled-components)**: Not used in codebase, would be inconsistent
- **Custom toast implementation**: Reinventing the wheel

---

### 4. Category Filtering Architecture

**Decision**: Client-side filtering with React hooks, server-side data from Planning Card

**Rationale**:
- Category/subcategory data is small (6-20 items)
- Planning Card already tracks active disciplines/trades in database
- Client-side filtering avoids extra API calls on every render
- Use SWR or React Query for stale-while-revalidate pattern

**Data Flow**:
1. Server: Fetch active disciplines from `consultantDisciplines` table
2. Server: Fetch active trades from `contractorTrades` table
3. Client: Filter category tiles based on active IDs
4. Client: Cache results to avoid re-filtering on re-render

**Implementation Pattern**:
```tsx
// New hook: src/lib/hooks/use-active-categories.ts
export function useActiveCategories(projectId: string) {
  const { data: disciplines } = useConsultantDisciplines(projectId);
  const { data: trades } = useContractorTrades(projectId);

  return useMemo(() => {
    return CATEGORIES.filter(cat => {
      if (cat.id === 'consultants') return disciplines?.length > 0;
      if (cat.id === 'contractors') return trades?.length > 0;
      return true; // Always show Planning, Scheme Design, etc.
    });
  }, [disciplines, trades]);
}
```

**Alternatives Considered**:
- **Server-side filtering with API endpoint**: Extra network call, latency
- **Global state (Zustand/Redux)**: Overkill for simple derived data
- **Props drilling**: Messy, error-prone

---

### 5. Tile Layout Responsiveness

**Decision**: Use CSS Grid with auto-fit and container queries

**Rationale**:
- CSS Grid provides automatic wrapping without JavaScript
- Container queries (`@container`) allow tiles to respond to parent width, not viewport
- Already using `@tailwindcss/container-queries` (available in Tailwind v4)
- Better performance than Flexbox for 2D layouts

**Layout Structure**:
```css
/* Row 1: Categories (6-8 tiles) */
grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
gap: 1rem;

/* Row 2: Subcategories (nested grid, indented) */
grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
gap: 0.75rem;
padding-left: 1rem; /* Visual indentation */
```

**Responsive Breakpoints** (via container queries):
- < 600px: 2 tiles per row, hide subcategory tiles (collapse to dropdown)
- 600-900px: 3-4 tiles per row
- \> 900px: 5-6 tiles per row

**Alternatives Considered**:
- **Flexbox**: Works, but requires manual row management for Row 2 indentation
- **Masonry layout**: Overcomplicated for uniform tile sizes
- **Media queries**: Less flexible than container queries for nested components

---

### 6. Bulk Re-Categorization UX

**Decision**: Multi-select with checkboxes + click (not drag) category tile

**Rationale**:
- Spec explicitly states "click on one of the category tiles" (Acceptance Scenario 3)
- Dragging selected rows to tiles is error-prone (accidental drops)
- Click pattern is more accessible (keyboard-friendly)
- Existing `selectedDocumentIds` state already tracks selection

**User Flow**:
1. User selects documents (Shift-click range, Cmd/Ctrl-click individual)
2. User clicks category tile → triggers `handleBulkCategorize`
3. Toast confirms: "12 files → Structural"
4. Selection clears, documents move in list

**Edge Cases**:
- Clicking tile with no selection → no action (ignore)
- Clicking tile while files are uploading → disable tile, show spinner
- Clicking parent tile (Consultants) with no subcategory → show toast "Select a specific discipline"

**Alternatives Considered**:
- **Drag selected rows to tile**: More complex, less accessible
- **Right-click context menu**: Not discoverable, requires extra click
- **Bulk action toolbar**: More UI clutter, requires permanent screen space

---

### 7. Performance Optimization

**Decision**: Debounce drag events, virtualize document list if >100 items

**Rationale**:
- `onDragOver` fires 10-30 times per second → throttle to 100ms
- Document list with 100+ items causes scroll jank → use `react-window`
- File upload progress uses `requestAnimationFrame` for smooth updates

**Throttling Pattern**:
```tsx
import { useMemo } from 'react';
import { throttle } from 'lodash'; // Or custom implementation

const handleDragOver = useMemo(
  () => throttle((e) => {
    e.preventDefault();
    setIsDragActive(true);
  }, 100),
  []
);
```

**Virtualization Threshold**:
- < 100 documents: Render all (simple)
- \>= 100 documents: Use `react-window` FixedSizeList
- Category grouping maintained in virtualized list

**Alternatives Considered**:
- **No optimization**: Acceptable for <100 items, fails at scale
- **Intersection Observer**: Good for infinite scroll, overkill here
- **React Server Components for list**: Not compatible with client-side drag-drop state

---

## Future Enhancements (Out of Scope)

### AI-Suggested Categorization
- Use OCR text (already extracted in `file_assets.ocr_text`) to suggest category
- Pattern matching: "Structural drawings" → Consultants/Structural
- Machine learning: Train model on historical categorizations
- **Estimated Effort**: 2-3 weeks (separate feature)

### Mobile/Touch Support
- react-dropzone supports mobile file pickers, but drag-drop requires touch API
- Consider native file input fallback for mobile
- **Estimated Effort**: 1 week (UX redesign for small screens)

### Category Tile Customization
- User-defined colors per category
- Custom icons for disciplines
- Tile reordering
- **Estimated Effort**: 1 week (UI + persistence)

---

## Testing Strategy

### Unit Tests (Jest + React Testing Library)

**Coverage Requirements**: >80% line coverage

**Test Files**:
1. `CategoryTile.test.tsx`:
   - Renders tile with correct label
   - Shows hover state on drag over
   - Calls onDrop with files when dropped
   - Disables tile when disabled prop true
   - Shows spinner during upload

2. `CategoryUploadTiles.test.tsx`:
   - Filters tiles based on active categories
   - Expands/collapses subcategory tiles
   - Renders Row 2 subcategories when expanded
   - Hides inactive categories

3. `use-active-categories.test.ts`:
   - Returns only active categories
   - Includes parent categories (Planning, etc.)
   - Filters Consultants/Contractors based on active disciplines/trades

**Mock Strategy**:
- Mock `fetch` for API calls
- Mock `useDropzone` return values
- Mock file objects: `new File(['content'], 'test.pdf', { type: 'application/pdf' })`

### Integration Tests

**Test File**: `drag-to-category.test.tsx`

**Scenarios**:
1. **Happy path**: Drag 5 files to "Structural" tile → files appear with correct category
2. **Bulk re-categorize**: Select 10 uncategorized files, click "MEP" tile → files move
3. **Disabled tile**: Attempt drop on disabled tile → no action, no error
4. **Upload error**: Drop files, server returns 500 → toast shows error

**Test Environment**:
- Use MSW (Mock Service Worker) for API mocking
- Test against actual DocumentRepository component
- Verify DOM updates after async operations

### Manual Testing Checklist

- [ ] Drop 50 files on tile → completes in <12 seconds
- [ ] Hover feedback appears within 100ms
- [ ] Toast shows correct file count and category name
- [ ] Uncategorized files appear at top of list
- [ ] Multi-select with Shift-click works
- [ ] Category tiles update when Planning Card changes
- [ ] Works in Chrome, Firefox, Safari, Edge
- [ ] Keyboard navigation (Tab, Enter) works on tiles

---

## Dependencies to Add

None. All required libraries already in `package.json`:
- `react-dropzone`: ^14.3.8 ✅
- `@radix-ui/react-toast`: ^1.2.15 ✅
- `tailwindcss`: ^4 ✅

**Dev Dependencies to Add** (for testing):
```json
{
  "@testing-library/react": "^14.0.0",
  "@testing-library/jest-dom": "^6.1.0",
  "@testing-library/user-event": "^14.5.0",
  "jest-environment-jsdom": "^29.7.0",
  "msw": "^2.0.0"
}
```

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| react-dropzone conflicts with @dnd-kit | Low | Medium | Different use cases, no DOM overlap |
| Large batch uploads timeout | Medium | High | Implement progress tracking, chunked uploads |
| Category filter out of sync with DB | Low | Medium | Use SWR revalidation on Planning Card update |
| Mobile drag-drop doesn't work | High | Low | Provide file input fallback for mobile |
| Performance degradation with 200+ documents | Medium | Medium | Implement virtualization threshold at 100 items |

---

## Resolved Clarifications

### From Technical Context

✅ **Testing Framework**: Jest with React Testing Library (confirmed)
✅ **Drag-Drop Library**: react-dropzone for file uploads (confirmed)
✅ **Visual Feedback**: Tailwind transitions + Radix Toast (confirmed)
✅ **Category Filtering**: Client-side with server-fetched data (confirmed)
✅ **Responsive Strategy**: CSS Grid with container queries (confirmed)

**Phase 0 Complete** - Ready to proceed to Phase 1 (Design)
