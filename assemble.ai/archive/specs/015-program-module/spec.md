# Program Module Specification

**Feature**: 015-program-module
**Date**: 2025-12-16
**Status**: Draft - Pending Approval

---

## Overview

Interactive Gantt-chart table for project scheduling. New tab alongside Procurement and Cost Planning in the dashboard.

---

## Core Features

### 1. Layout

| Element | Description |
|---------|-------------|
| Column 1 | Activity names (hierarchical: parent/child) |
| Header Row | Months with week columns underneath |
| Cells | Clickable grid for duration/milestone allocation |
| Today Marker | Vertical line fixed to current date |
| Zoom Toggle | Switch between Week view and Month view |

### 2. Activity Management

- **Add/Delete** rows via context menu or toolbar
- **2-tier hierarchy**: Parent activities containing child activities
- **Tab/Shift+Tab**: Indent (make child) / Outdent (make parent)
- **Collapse/Expand**: Click chevron on parent to show/hide children
- **Reorder** via drag handle
- **Auto-color**: Muted palette auto-assigned per parent group
- **Quick Templates**: Preset activity structures (see Templates section)

### 3. Bar Interactions

| Action | Result |
|--------|--------|
| Drag bar edge horizontally | Extend/shrink duration |
| Click+drag bar body | Move entire bar (reposition start/end) |
| Shift+drag | Fine adjustment (snap to day within week) |
| Double-click cell | Add named milestone (diamond marker) |

### 4. Dependencies

Three dependency types supported:

| Type | Abbreviation | Behavior |
|------|--------------|----------|
| Finish-to-Start | FS | B starts when A finishes |
| Start-to-Start | SS | B starts when A starts |
| Finish-to-Finish | FF | B finishes when A finishes |

**Creating Dependencies:**
- Drag from arrow handle on bar edge to another bar
- Visual connector line drawn between bars
- Right-click connector to delete

### 5. AI Schedule Parsing

Drag & drop file onto table to extract activities and dates:

| Format | Parsing Approach |
|--------|------------------|
| Excel (.xlsx) | Column detection for task/start/end |
| PDF | AI extraction via Claude |
| Word (.docx) | Table/list parsing via Claude |

Extracted data populates activities with start/end dates. User reviews before confirming.

### 6. Quick Templates

Preset activity structures for common project phases:

| Template | Activities |
|----------|------------|
| **Design Phase** | Concept Design, Schematic Design, Design Development, Documentation |
| **Tender Phase** | Tender Preparation, Tender Period, Tender Evaluation, Contract Award |
| **Construction Phase** | Mobilization, Structure, Fitout, Commissioning, Defects |
| **Consultant Engagement** | Brief, EOI, RFP, Evaluation, Appointment |

- Select template from dropdown
- Inserts as parent with children
- User adjusts dates after insertion

### 7. Export

| Format | Content |
|--------|---------|
| PDF | Gantt chart image with activity list, current view |

---

## Data Model

```
program_activities
├── id: string (UUID)
├── projectId: string (FK → projects)
├── parentId: string | null (FK → program_activities, for children)
├── name: string
├── startDate: date | null
├── endDate: date | null
├── collapsed: boolean (default false, for parents)
├── color: string (auto-assigned)
├── sortOrder: number
├── createdAt: timestamp
├── updatedAt: timestamp

program_dependencies
├── id: string (UUID)
├── projectId: string (FK → projects)
├── fromActivityId: string (FK → program_activities)
├── toActivityId: string (FK → program_activities)
├── type: enum ('FS' | 'SS' | 'FF')

program_milestones
├── id: string (UUID)
├── activityId: string (FK → program_activities)
├── name: string
├── date: date
├── sortOrder: number
```

---

## UI Components

```
src/components/program/
├── ProgramPanel.tsx          # Main container (tab content)
├── ProgramToolbar.tsx        # Add, template dropdown, zoom toggle, export
├── ProgramTable.tsx          # Gantt table grid
├── ProgramRow.tsx            # Single activity row (indent, chevron, name)
├── ProgramCell.tsx           # Week/month cell
├── ProgramBar.tsx            # Duration bar (draggable, resizable)
├── BarHandles.tsx            # Arrow handles for dependency creation
├── MilestoneMarker.tsx       # Diamond milestone icon
├── DependencyConnector.tsx   # SVG path for FS/SS/FF lines
├── ActivityForm.tsx          # Add/edit activity modal
├── MilestoneForm.tsx         # Add/edit milestone modal
├── TemplateMenu.tsx          # Quick template insertion dropdown
└── ProgramDropZone.tsx       # Drag & drop parsing overlay
```

---

## API Endpoints

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/projects/[projectId]/program` | List activities, dependencies, milestones |
| POST | `/api/projects/[projectId]/program/activities` | Create activity |
| PATCH | `/api/projects/[projectId]/program/activities/[id]` | Update activity |
| DELETE | `/api/projects/[projectId]/program/activities/[id]` | Delete activity |
| POST | `/api/projects/[projectId]/program/activities/[id]/milestones` | Add milestone |
| DELETE | `/api/projects/[projectId]/program/milestones/[id]` | Delete milestone |
| POST | `/api/projects/[projectId]/program/dependencies` | Create dependency |
| DELETE | `/api/projects/[projectId]/program/dependencies/[id]` | Delete dependency |
| POST | `/api/projects/[projectId]/program/parse` | AI parse uploaded file |
| POST | `/api/projects/[projectId]/program/reorder` | Reorder activities |
| POST | `/api/projects/[projectId]/program/template` | Insert template activities |
| GET | `/api/projects/[projectId]/program/export` | Export to PDF |

---

## Interactions Detail

### Creating Bar (Initial)
1. User drags horizontally across empty cells in a row
2. Bar appears spanning selected range
3. Activity's `startDate` and `endDate` saved

### Resizing Bar
1. User hovers bar edge (cursor changes to resize)
2. Drag edge left/right to extend/shrink
3. Snaps to week boundaries
4. Shift+drag for fine adjustment (day-level within week)

### Moving Bar
1. User clicks and drags bar body (not edge)
2. Bar moves horizontally, maintaining duration
3. Snaps to week boundaries
4. Shift+drag for fine adjustment

### Adding Milestone
1. User double-clicks cell within an activity row
2. Modal prompts for milestone name
3. Diamond marker appears at that date
4. Milestone saved to `program_milestones`

### Adding Dependency
1. User hovers bar to reveal arrow handles at edges
2. Drag from arrow handle to another bar
3. Drop on left edge = Start-to-Start (SS)
4. Drop on right edge = Finish-to-Finish (FF)
5. Drop on bar body = Finish-to-Start (FS, default)
6. Connector line drawn between bars

### Indent/Outdent
1. Select activity row
2. Press Tab to indent (becomes child of row above)
3. Press Shift+Tab to outdent (becomes top-level)
4. Or use toolbar buttons / context menu

### Collapse/Expand
1. Click chevron icon on parent row
2. Children hide/show
3. Collapsed state persisted

---

## Visual Design

- **Colors**: Auto-assigned from muted palette (6-8 colors cycling)
- **Bar Height**: ~60% of row height
- **Milestone**: Diamond shape, same color as parent bar
- **Today Line**: Dashed vertical line, subtle highlight
- **Dependency Line**: Curved SVG path, muted gray
- **Parent Rows**: Slightly darker background, bold text
- **Child Rows**: Indented 24px, normal weight

---

## Timeline Header

```
| Aug                    | Sep                    |
| 2  | 9  | 16 | 23 | 30 | 7  | 14 | 21 | 28 |
```

- Month spans calculated from week columns
- Week columns show start date of each week
- Viewport scrolls horizontally for long timelines
- Sticky first column (activity names)

---

## Scope Boundaries

### In Scope
- Activity CRUD with 2-tier hierarchy (parent/child)
- Tab/Shift+Tab for indent/outdent
- Collapse/expand parent activities
- Week view with month zoom option
- Duration bars via horizontal drag
- Move bars via click+drag body
- Resize bars via drag edge
- Shift+drag for fine day-level adjustment
- Named milestones via double-click
- Three dependency types (FS, SS, FF) via drag arrows
- AI parsing from Excel/PDF/Word
- Quick templates for common phases
- Auto-assigned colors
- Today marker (fixed)
- Horizontal scroll with sticky column
- Export to PDF

### Out of Scope (V1)
- Day-level view toggle
- % progress tracking
- Resource/assignee allocation
- Critical path calculation
- Baseline comparison
- Export to MS Project / Excel
- Start-to-Finish dependency type
- Lag/lead time on dependencies

---

## Acceptance Criteria

1. User can add parent activity, add child activities under it
2. User can Tab/Shift+Tab to indent/outdent activities
3. User can collapse/expand parent to hide/show children
4. User can toggle between Week and Month zoom
5. User can drag horizontally to create duration bar
6. User can drag bar body to move (reposition) bar
7. User can drag bar edge to resize duration
8. User can Shift+drag for fine (day-level) adjustment
9. User can double-click to add named milestone
10. User can drag arrow handles to create FS/SS/FF dependencies
11. User can insert quick template (Design, Tender, Construction, etc.)
12. Drag & drop Excel/PDF/Word extracts activities with dates
13. Timeline scrolls horizontally, activity column stays fixed
14. Today marker visible at current date
15. Colors auto-assigned per parent group
16. User can export current view to PDF
17. Data persists after page reload

---

**Awaiting Approval**
