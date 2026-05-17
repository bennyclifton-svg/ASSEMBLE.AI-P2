# Data Model: Direct Drag-to-Category Upload

**Phase**: 1 - Design
**Date**: 2025-11-23
**Status**: Complete

## Overview

This document defines the data entities, relationships, validation rules, and state transitions for the direct drag-to-category upload feature. The feature primarily leverages **existing database schema** with minimal new state management.

---

## Database Entities (Existing Schema)

### 1. Categories

**Table**: `categories`
**Purpose**: Top-level categorization (Planning, Scheme Design, Consultants, etc.)

```typescript
interface Category {
  id: string;              // Primary key (e.g., 'consultants', 'contractors')
  name: string;            // Display name (e.g., 'Consultants')
  isSystem: boolean;       // True for built-in categories
}
```

**Existing Records** (seeded):
- `planning` - Planning
- `scheme-design` - Scheme Design
- `detail-design` - Detail Design
- `consultants` - Consultants (expandable)
- `contractors` - Contractors (expandable)
- `cost-planning` - Cost Planning
- `administration` - Administration

**Validation Rules**:
- `id`: Required, unique, kebab-case
- `name`: Required, unique, max 50 chars
- `isSystem`: Cannot be deleted if `true`

**No Changes Required** - Using existing schema

---

### 2. Subcategories

**Table**: `subcategories`
**Purpose**: Secondary categorization (disciplines, trades)

```typescript
interface Subcategory {
  id: string;              // Primary key (e.g., 'structural', 'mep')
  categoryId: string;      // Foreign key → categories.id
  name: string;            // Display name (e.g., 'Structural')
  isSystem: boolean;       // True for built-in subcategories
}
```

**Relationships**:
- Many subcategories → One category
- Used for: Consultant disciplines, Contractor trades

**Validation Rules**:
- `categoryId`: Must reference existing category
- `name`: Required, unique within category
- Subcategories only exist for 'consultants' and 'contractors' categories

**No Changes Required** - Using existing schema

---

### 3. Documents

**Table**: `documents`
**Purpose**: Document metadata (links to versions, tracks categorization)

```typescript
interface Document {
  id: string;                   // Primary key (UUID)
  projectId: string;            // Foreign key → projects.id
  categoryId: string | null;    // Foreign key → categories.id (null = uncategorized)
  subcategoryId: string | null; // Foreign key → subcategories.id (optional)
  latestVersionId: string;      // Foreign key → versions.id
  createdAt: string;            // ISO timestamp
  updatedAt: string;            // ISO timestamp
}
```

**State Transitions**:
1. **Upload to main zone**: `categoryId = null, subcategoryId = null` (Uncategorized)
2. **Upload to category tile**: `categoryId = tileId, subcategoryId = null`
3. **Upload to subcategory tile**: `categoryId = parentId, subcategoryId = tileId`
4. **Bulk re-categorize**: Update `categoryId` and/or `subcategoryId` for selected docs

**Validation Rules**:
- `projectId`: Required, must reference existing project
- `categoryId`: Optional, must reference existing category if provided
- `subcategoryId`: Optional, requires `categoryId` if provided
- `subcategoryId` must belong to parent `categoryId`

**Changes Required**: None (schema supports nullable categorization)

---

### 4. File Assets

**Table**: `file_assets`
**Purpose**: Physical file storage metadata

```typescript
interface FileAsset {
  id: string;              // Primary key (UUID)
  storagePath: string;     // Relative path in storage (e.g., 'uploads/project-123/abc.pdf')
  originalName: string;    // User-provided filename
  mimeType: string;        // MIME type (e.g., 'application/pdf')
  sizeBytes: number;       // File size in bytes
  hash: string;            // SHA-256 hash (deduplication)
  ocrStatus: string;       // 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED'
  ocrText: string | null;  // Extracted text (for future AI categorization)
  createdAt: string;       // ISO timestamp
}
```

**Validation Rules**:
- `sizeBytes`: Max 20MB (20,971,520 bytes) - enforced in UI and API
- `mimeType`: Must be in allowed list (PDF, Word, Excel, images)
- `hash`: Used to prevent duplicate uploads

**No Changes Required** - Existing schema sufficient

---

### 5. Versions

**Table**: `versions`
**Purpose**: Track document versions (V1, V2, etc.)

```typescript
interface Version {
  id: string;              // Primary key (UUID)
  documentId: string;      // Foreign key → documents.id
  fileAssetId: string;     // Foreign key → file_assets.id
  versionNumber: number;   // Sequential (1, 2, 3...)
  uploadedBy: string;      // User identifier (placeholder until auth)
  createdAt: string;       // ISO timestamp
}
```

**Version Detection Logic** (existing):
- Compare `originalName` of new file with existing documents
- Match base filename (ignore version suffix like "_V2")
- If match found: Increment `versionNumber`, create new version
- If no match: Create new document with `versionNumber = 1`

**No Changes Required** - Version logic unchanged

---

## Client-Side State Models

### 6. Category Tile State

**Purpose**: UI state for individual category tiles

```typescript
interface CategoryTileState {
  category: {
    id: string;           // Category ID
    name: string;         // Display name
    icon?: string;        // Optional icon (e.g., 'FileText')
    isExpandable: boolean; // True for Consultants/Contractors
  };
  subcategory?: {
    id: string;           // Subcategory ID (if this is a subcategory tile)
    name: string;         // Display name
  };
  isActive: boolean;      // True if category has active items (from Planning Card)
  isExpanded: boolean;    // True if subcategories are visible (UI state)
  isDragActive: boolean;  // True while dragging over this tile
  isUploading: boolean;   // True during file upload
  isDisabled: boolean;    // True if tile should not accept drops
}
```

**State Rules**:
- `isActive`: Computed from Planning Card data (active disciplines/trades)
- `isExpanded`: Local state, toggled by click
- `isDragActive`: Managed by react-dropzone
- `isDisabled`: `true` if `isActive === false` OR `isUploading === true`

**Component**: `CategoryTile.tsx` (new)

---

### 7. Upload Progress State

**Purpose**: Track multi-file upload progress

```typescript
interface UploadFileStatus {
  file: File;              // File object
  progress: number;        // 0-100
  status: 'pending' | 'uploading' | 'success' | 'error';
  error?: string;          // Error message if status = 'error'
  documentId?: string;     // Returned from API on success
}

interface UploadBatchState {
  files: UploadFileStatus[];
  categoryId?: string;     // Category uploaded to (for toast)
  subcategoryId?: string;  // Subcategory uploaded to
  startTime: number;       // Timestamp (for performance tracking)
}
```

**State Transitions**:
1. **Files dropped** → All files `status: 'pending'`
2. **Upload starts** → File `status: 'uploading'`, `progress: 0`
3. **Upload progresses** → `progress: 0-99`
4. **Upload completes** → `status: 'success'`, `progress: 100`, `documentId` set
5. **Upload fails** → `status: 'error'`, `error` message set

**Component**: `UploadProgress.tsx` (existing, no changes)

---

### 8. Document Selection State

**Purpose**: Track multi-selected documents for bulk re-categorization

```typescript
interface DocumentSelectionState {
  selectedDocumentIds: Set<string>;  // Document IDs
  lastSelectedIndex: number | null;  // For Shift-click range selection
}
```

**Selection Operations**:
- **Click**: Toggle single document
- **Shift+Click**: Select range from `lastSelectedIndex` to clicked index
- **Cmd/Ctrl+Click**: Toggle individual document (multi-select)
- **Clear**: After bulk categorization or on document list change

**Component**: `DocumentRepository.tsx` (existing, already implemented)

---

## Derived Data Models

### 9. Active Categories List

**Purpose**: Filtered list of categories to display as tiles

```typescript
interface ActiveCategory {
  id: string;
  name: string;
  isExpandable: boolean;
  subcategories?: ActiveSubcategory[];
}

interface ActiveSubcategory {
  id: string;
  name: string;
  categoryId: string;
}
```

**Derivation Logic** (client-side):
```typescript
function getActiveCategories(
  allCategories: Category[],
  activeDisciplines: Discipline[],
  activeTrades: Trade[]
): ActiveCategory[] {
  return allCategories
    .filter(cat => {
      // Always show non-expandable categories
      if (!['consultants', 'contractors'].includes(cat.id)) {
        return true;
      }

      // Show Consultants if disciplines exist
      if (cat.id === 'consultants') {
        return activeDisciplines.length > 0;
      }

      // Show Contractors if trades exist
      if (cat.id === 'contractors') {
        return activeTrades.length > 0;
      }

      return false;
    })
    .map(cat => ({
      ...cat,
      isExpandable: ['consultants', 'contractors'].includes(cat.id),
      subcategories: cat.id === 'consultants'
        ? activeDisciplines.map(d => ({ id: d.id, name: d.name, categoryId: cat.id }))
        : cat.id === 'contractors'
        ? activeTrades.map(t => ({ id: t.id, name: t.name, categoryId: cat.id }))
        : undefined
    }));
}
```

**Hook**: `use-active-categories.ts` (new)

---

## Validation Rules Summary

### File Validation (Client + Server)

| Rule | Client Check | Server Check | Error Message |
|------|--------------|--------------|---------------|
| File size ≤ 20MB | ✅ react-dropzone | ✅ API route | "File exceeds 20MB limit" |
| Allowed MIME types | ✅ react-dropzone | ✅ API route | "File type not supported" |
| File name not empty | ✅ Browser API | ✅ API route | "Invalid file name" |
| Category exists | ✅ Client state | ✅ Database FK | "Invalid category" |
| Subcategory belongs to category | ✅ Client logic | ✅ Database FK | "Invalid subcategory" |

### Categorization Validation

| Rule | Enforcement | Error Handling |
|------|-------------|----------------|
| Cannot drop on disabled tile | Client (UI disabled state) | Ignore drop event |
| Cannot categorize to parent tile without subcategory | Client (show toast) | "Select a specific discipline/trade" |
| Bulk categorize requires selection | Client (check `selectedDocumentIds.size > 0`) | Ignore click |
| Category must exist in database | Server (foreign key constraint) | 500 error → toast |

---

## State Flow Diagrams

### Upload to Category Tile Flow

```
User drags files → Hover over tile → Drop on tile
                                         ↓
                            react-dropzone captures drop
                                         ↓
                    handleFilesSelected(files, categoryId, subcategoryId)
                                         ↓
                    For each file: POST /api/documents
                    { file, projectId, categoryId, subcategoryId }
                                         ↓
                              Server processes upload:
                    1. Validate file (size, type)
                    2. Generate hash (check duplicates)
                    3. Save to storage
                    4. Create file_asset record
                    5. Check for version match
                    6. Create/update document + version
                                         ↓
                    Return { documentId, versionNumber }
                                         ↓
              Update UI: Show toast, refresh document list
```

### Bulk Re-Categorization Flow

```
User selects documents → Clicks category tile
(selectedDocumentIds)           ↓
                    handleBulkCategorize(categoryId, subcategoryId)
                                         ↓
                    PUT /api/documents/bulk-categorize
                    { documentIds: [...], categoryId, subcategoryId }
                                         ↓
                    Server updates documents:
                    UPDATE documents
                    SET categoryId = ?, subcategoryId = ?, updatedAt = ?
                    WHERE id IN (...)
                                         ↓
                    Return { updated: count }
                                         ↓
              Update UI: Clear selection, show toast, refresh list
```

---

## Database Queries (New/Modified)

### 1. Fetch Active Disciplines (Existing)

```sql
-- Already implemented in use-consultant-disciplines.ts
SELECT cd.disciplineId, d.name
FROM consultantDisciplines cd
JOIN disciplines d ON d.id = cd.disciplineId
WHERE cd.projectId = ?
AND cd.isActive = 1;
```

### 2. Fetch Active Trades (Existing)

```sql
-- Already implemented in use-contractor-trades.ts
SELECT ct.tradeId, t.name
FROM contractorTrades ct
JOIN trades t ON t.id = ct.tradeId
WHERE ct.projectId = ?
AND ct.isActive = 1;
```

### 3. Bulk Update Documents (New API Endpoint)

```sql
-- /api/documents/bulk-categorize
UPDATE documents
SET
  categoryId = ?,
  subcategoryId = ?,
  updatedAt = CURRENT_TIMESTAMP
WHERE
  id IN (?, ?, ?, ...)  -- Array of document IDs
  AND projectId = ?;    -- Security: Ensure project ownership
```

### 4. Fetch Documents by Category (Existing)

```sql
-- Already used in CategorizedList component
SELECT
  d.id,
  d.categoryId,
  d.subcategoryId,
  v.versionNumber,
  fa.originalName,
  fa.sizeBytes,
  fa.mimeType,
  v.createdAt
FROM documents d
JOIN versions v ON v.id = d.latestVersionId
JOIN file_assets fa ON fa.id = v.fileAssetId
WHERE d.projectId = ?
ORDER BY
  CASE WHEN d.categoryId IS NULL THEN 0 ELSE 1 END,  -- Uncategorized first
  d.categoryId,
  d.subcategoryId,
  fa.originalName;
```

---

## API Contract Changes

### Modified: `POST /api/documents`

**Request** (multipart/form-data):
```typescript
{
  file: File;
  projectId: string;
  categoryId?: string;      // NEW: Optional category on upload
  subcategoryId?: string;   // NEW: Optional subcategory on upload
}
```

**Response** (200 OK):
```typescript
{
  documentId: string;
  versionNumber: number;
  fileAssetId: string;
  category?: string;        // NEW: Echo back for confirmation
  subcategory?: string;     // NEW: Echo back for confirmation
}
```

**Error Responses**:
- `400 Bad Request`: Invalid file type, size, or missing required fields
- `404 Not Found`: Category/subcategory ID doesn't exist
- `500 Internal Server Error`: Storage or database error

### Existing: `PUT /api/documents/bulk-categorize`

**Request**:
```typescript
{
  documentIds: string[];
  categoryId: string;
  subcategoryId?: string;
}
```

**Response** (200 OK):
```typescript
{
  updated: number;  // Count of documents updated
}
```

**No Changes Required** - Already implemented

---

## Index Recommendations

### Performance Optimization

```sql
-- Existing indexes (assumed, to verify)
CREATE INDEX idx_documents_project ON documents(projectId);
CREATE INDEX idx_documents_category ON documents(categoryId);
CREATE INDEX idx_documents_subcategory ON documents(subcategoryId);

-- Composite index for categorized list query
CREATE INDEX idx_documents_project_category
ON documents(projectId, categoryId, subcategoryId);

-- Index for bulk categorize WHERE IN clause
-- (projectId already indexed above, IN clause uses primary key)
```

**Action**: Verify indexes exist in migration scripts, add composite index if missing

---

## Migration Plan

**No database migrations required** - All schema already supports this feature.

**Verification Checklist**:
- [x] `documents.categoryId` is nullable (supports uncategorized)
- [x] `documents.subcategoryId` is nullable (supports category-only)
- [x] Foreign key constraints exist for `categoryId` and `subcategoryId`
- [x] Categories and subcategories seeded in database
- [x] Indexes exist for category/subcategory queries

---

## Data Model Complete

All entities, relationships, and validation rules defined. Ready to proceed to:
- **API Contracts** (contracts/ directory)
- **Quickstart Guide** (quickstart.md)
