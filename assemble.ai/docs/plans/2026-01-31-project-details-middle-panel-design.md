# Project Details Middle Panel Design

## Overview

Refactor the Project Details section to move detailed fields from the left navigation to the middle panel, keeping only the Project Name in the left nav with expand/collapse arrows.

## Current State

- Left nav shows all project details: Project Name, Address, Lot Area, Zoning, Legal Address, Jurisdiction
- Upload icon in top-right corner for PDF drop/parsing
- All fields are inline-editable with auto-save

## Design

### Left Nav (Collapsed State)

- **Header:** "PROJECT NAME" label with expand arrows (Maximize2/Minimize2 icons)
- **Content:** Only the project name value (e.g., "Mosaic Apartments")
- **Removed:** Upload icon, all other fields (Address, Lot Area, Zoning, Legal Address, Jurisdiction)
- **Behavior:** Clicking expand arrows sets Project Details as active section, displaying full details in middle panel

### Middle Panel (Expanded State)

**Header row:**
- "Project Details" title on left
- Small upload icon (Upload from lucide-react) on right

**Form fields (all editable):**
1. Project Name
2. Address (multi-line textarea)
3. Lot Area (with m² unit)
4. Zoning
5. Legal Address
6. Jurisdiction

**Field behavior (unchanged from current):**
- Auto-save on blur (150ms delay)
- Success indicator: spinner during save, checkmark on success
- Enter to save, Escape to cancel

**Drag-drop behavior:**
- Entire panel is a drop target
- On drag-over: semi-transparent overlay with "Drop to extract project details"
- On drop: calls `/api/planning/extract` endpoint
- Shows extraction spinner, populates fields with parsed data
- Toast notification with confidence level

### Integration

**Active section tracking:**
- Project Details joins existing active section system (alongside Project Profile, Objectives)
- Minimize2 icon when active, Maximize2 when collapsed
- Clicking another section's arrows switches away from Project Details

**Props pattern:**
- `isActive: boolean` - whether this section is currently displayed in middle panel
- `onToggle: () => void` - callback when expand arrows clicked

## File Changes

### Modify: `src/components/dashboard/planning/DetailsSection.tsx`
- Strip down to show only Project Name + expand arrows
- Add `isActive` and `onToggle` props
- Remove upload icon from header
- Remove all fields except Project Name

### Create: `src/components/dashboard/planning/ProjectDetailsPanel.tsx`
- Full form with all editable fields
- Drag-drop logic (moved from DetailsSection)
- Upload icon in header
- Full-panel drop target with overlay

### Modify: Parent layout component
- Add Project Details to active section switch logic
- Render ProjectDetailsPanel when Project Details is active

## No Changes Required

- API endpoints (`/api/planning/extract`, `/api/planning/{projectId}/details`)
- Data fetching/state management
- Field validation logic
