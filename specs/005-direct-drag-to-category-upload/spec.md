# Feature Specification: Direct Drag-to-Category Upload

**Feature Branch**: `005-direct-drag-to-category`  
**Created**: 2025-11-23  
**Updated**: 2025-11-26  
**Status**: Implemented  

## Overview

Allows users to drag files directly onto category tiles to upload and categorize in one action. Categories are displayed as colored tiles with expandable subcategories. Users can also bulk categorize existing documents by selecting them and clicking a category tile.

## User Scenarios

### User Story 1 - Direct Upload to Category (Priority: P1)

As a Project Manager, I want to drag files directly onto category tiles so they are uploaded and categorized in a single action.

**Acceptance Scenarios**:

1. **Given** the Documents screen is open, **When** I drag files onto a category/subcategory tile, **Then** files upload and appear in the repository with that category assigned.
2. **Given** I drag files onto the upload tile, **When** upload completes, **Then** files appear as "Uncategorized" in the document list.
3. **Given** files are selected in the repository, **When** I click a category tile, **Then** selected files are bulk categorized to that category/subcategory.

---

### User Story 2 - Active Categories Only (Priority: P1)

As a Project Manager, I want to see only active categories from the Planning Card, with expandable subcategories for Consultants and Contractors.

**Acceptance Scenarios**:

1. **Given** active disciplines/trades are defined in Planning Card, **When** I open Documents, **Then** only active category tiles are visible.
2. **Given** I click a category with subcategories (Consultants/Contractors), **Then** subcategory tiles appear below in a separate section.

---

### User Story 3 - Visual Feedback (Priority: P2)

As a user, I want visual feedback when dragging files and toast notifications on completion.

**Acceptance Scenarios**:

1. **Given** I drag files over a tile, **When** hovering, **Then** the tile shows visual feedback (color change, shadow).
2. **Given** I drop files on a tile, **When** upload completes, **Then** a toast appears showing count and category name.

## Requirements

### GUI Layout

- **GUI-001**: Upload tile and category tiles displayed in a single responsive grid
- **GUI-002**: Category tiles use colored backgrounds based on category (Planning, Scheme Design, etc.)
- **GUI-003**: Subcategory tiles appear in separate full-width sections below when parent category is expanded
- **GUI-004**: Subcategory sections include a label (e.g., "Consultants Subcategories")
- **GUI-005**: Subcategories have smaller height (h-14) vs categories (h-16)
- **GUI-006**: Upload tile has dashed border, categories have solid colored fills

### Functional Requirements

- **FR-001**: Category tiles accept drag-and-drop to upload and categorize files
- **FR-002**: Upload tile creates uncategorized documents (backward compatibility)
- **FR-003**: Active categories loaded via `useActiveCategories` hook from Planning Card
- **FR-004**: Clicking category tiles with subcategories toggles expansion
- **FR-005**: Clicking category tiles with selected documents performs bulk categorization
- **FR-006**: Visual feedback on hover and drop with toast notifications
- **FR-007**: Documents store `categoryId` and `subcategoryId` as strings with FK to categories/subcategories tables

### Data Model

- **Document**: `id`, `projectId`, `categoryId`, `subcategoryId`, `latestVersionId`
- **Category**: `id`, `name`, `isSystem`
- **Subcategory**: `id`, `categoryId`, `name`, `isSystem`

## Success Criteria

- **SC-001**: Upload and categorize 50 files in ≤ 12 seconds
- **SC-002**: Existing upload behavior remains functional (regression-free)
- **SC-003**: Bulk categorization completes in under 2 seconds for 50 files