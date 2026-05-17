# API Contracts: Knowledge Libraries

**Branch**: `010-landing-page` | **Date**: 2024-12-08

## Overview

Knowledge Library endpoints for managing organization-wide document collections. Libraries are shared across all projects and integrate with the RAG embedding system.

---

## Library Types

| ID | Display Name | Color |
|----|--------------|-------|
| `due-diligence` | Due Diligence | #ce9178 |
| `house` | House | #4ec9b0 |
| `apartments` | Apartments | #569cd6 |
| `fitout` | Fitout | #dcdcaa |
| `industrial` | Industrial | #c586c0 |
| `remediation` | Remediation | #9cdcfe |

---

## GET /api/libraries

Returns all knowledge libraries for the current organization.

### Request

**Headers**:
- `Cookie: session=<token>`

### Response

**Success (200 OK)**:
```typescript
interface LibrariesResponse {
  libraries: Library[];
}

interface Library {
  id: string;
  type: LibraryType;
  name: string;           // Display name
  color: string;          // Hex color for UI
  documentCount: number;  // Number of documents
  updatedAt: number;      // Unix timestamp of last change
}

type LibraryType =
  | 'due-diligence'
  | 'house'
  | 'apartments'
  | 'fitout'
  | 'industrial'
  | 'remediation';
```

**Example**:
```json
{
  "libraries": [
    {
      "id": "lib_abc123",
      "type": "due-diligence",
      "name": "Due Diligence",
      "color": "#ce9178",
      "documentCount": 15,
      "updatedAt": 1733644800
    },
    {
      "id": "lib_def456",
      "type": "house",
      "name": "House",
      "color": "#4ec9b0",
      "documentCount": 8,
      "updatedAt": 1733640000
    }
  ]
}
```

### Error Responses

| Status | Code | Description |
|--------|------|-------------|
| 401 | `UNAUTHORIZED` | No valid session |

---

## GET /api/libraries/[type]/documents

Returns all documents in a specific library.

### Request

**URL Parameters**:
- `type`: Library type (e.g., `due-diligence`, `house`)

**Query Parameters**:
- `sort`: Sort field (`name`, `addedAt`, `size`) - default: `addedAt`
- `order`: Sort order (`asc`, `desc`) - default: `desc`

**Headers**:
- `Cookie: session=<token>`

### Response

**Success (200 OK)**:
```typescript
interface LibraryDocumentsResponse {
  library: {
    id: string;
    type: LibraryType;
    name: string;
  };
  documents: LibraryDocument[];
}

interface LibraryDocument {
  id: string;
  fileAssetId: string;
  filename: string;
  mimeType: string;
  size: number;           // Bytes
  addedAt: number;        // Unix timestamp
  addedBy: {
    id: string;
    displayName: string;
  } | null;               // Null if user deleted
  syncStatus: SyncStatus;
}

type SyncStatus =
  | 'pending'     // Not yet synced to RAG
  | 'processing'  // Currently being embedded
  | 'synced'      // Embeddings complete
  | 'failed';     // Sync failed
```

**Example**:
```json
{
  "library": {
    "id": "lib_abc123",
    "type": "due-diligence",
    "name": "Due Diligence"
  },
  "documents": [
    {
      "id": "ldoc_111",
      "fileAssetId": "fa_aaa",
      "filename": "Due Diligence Checklist.pdf",
      "mimeType": "application/pdf",
      "size": 245760,
      "addedAt": 1733644800,
      "addedBy": {
        "id": "usr_abc123",
        "displayName": "John Smith"
      },
      "syncStatus": "synced"
    },
    {
      "id": "ldoc_222",
      "fileAssetId": "fa_bbb",
      "filename": "Site Assessment Template.docx",
      "mimeType": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "size": 51200,
      "addedAt": 1733640000,
      "addedBy": null,
      "syncStatus": "pending"
    }
  ]
}
```

### Error Responses

| Status | Code | Description |
|--------|------|-------------|
| 401 | `UNAUTHORIZED` | No valid session |
| 404 | `LIBRARY_NOT_FOUND` | Invalid library type |

---

## POST /api/libraries/[type]/documents

Uploads documents to a library.

### Request

**URL Parameters**:
- `type`: Library type (e.g., `due-diligence`, `house`)

**Headers**:
- `Content-Type: multipart/form-data`
- `Cookie: session=<token>`

**Form Data**:
- `files`: One or more files (multiple allowed)

**Accepted File Types**:
- PDF: `application/pdf`
- DOCX: `application/vnd.openxmlformats-officedocument.wordprocessingml.document`
- XLSX: `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`
- PNG: `image/png`
- JPEG: `image/jpeg`
- Text: `text/plain`

**Size Limits**:
- Maximum file size: 50MB
- Maximum files per request: 10

### Response

**Success (201 Created)**:
```typescript
interface UploadDocumentsResponse {
  documents: {
    id: string;
    filename: string;
    size: number;
    status: 'uploaded' | 'duplicate';
  }[];
  library: {
    id: string;
    documentCount: number;  // Updated count
  };
}
```

**Example**:
```json
{
  "documents": [
    {
      "id": "ldoc_333",
      "filename": "New Assessment.pdf",
      "size": 102400,
      "status": "uploaded"
    },
    {
      "id": "ldoc_111",
      "filename": "Due Diligence Checklist.pdf",
      "size": 245760,
      "status": "duplicate"
    }
  ],
  "library": {
    "id": "lib_abc123",
    "documentCount": 16
  }
}
```

### Error Responses

| Status | Code | Description |
|--------|------|-------------|
| 400 | `INVALID_FILE_TYPE` | File type not supported |
| 400 | `FILE_TOO_LARGE` | File exceeds 50MB limit |
| 400 | `TOO_MANY_FILES` | More than 10 files in request |
| 401 | `UNAUTHORIZED` | No valid session |
| 404 | `LIBRARY_NOT_FOUND` | Invalid library type |

---

## DELETE /api/libraries/[type]/documents

Deletes documents from a library.

### Request

**URL Parameters**:
- `type`: Library type

**Headers**:
- `Content-Type: application/json`
- `Cookie: session=<token>`

**Body**:
```typescript
interface DeleteDocumentsRequest {
  documentIds: string[];  // IDs of documents to delete
}
```

**Example**:
```json
{
  "documentIds": ["ldoc_111", "ldoc_222"]
}
```

### Response

**Success (200 OK)**:
```typescript
interface DeleteDocumentsResponse {
  deleted: string[];  // IDs of deleted documents
  library: {
    id: string;
    documentCount: number;  // Updated count
  };
}
```

**Example**:
```json
{
  "deleted": ["ldoc_111", "ldoc_222"],
  "library": {
    "id": "lib_abc123",
    "documentCount": 13
  }
}
```

### Error Responses

| Status | Code | Description |
|--------|------|-------------|
| 400 | `INVALID_IDS` | Empty or malformed document IDs |
| 401 | `UNAUTHORIZED` | No valid session |
| 404 | `LIBRARY_NOT_FOUND` | Invalid library type |
| 404 | `DOCUMENTS_NOT_FOUND` | One or more document IDs not found |

---

## POST /api/libraries/[type]/sync

Queues library documents for RAG embedding.

### Request

**URL Parameters**:
- `type`: Library type

**Headers**:
- `Content-Type: application/json`
- `Cookie: session=<token>`

**Body** (optional):
```typescript
interface SyncRequest {
  documentIds?: string[];  // Specific documents (omit for all pending)
  force?: boolean;         // Re-sync already synced documents
}
```

**Example - Sync All Pending**:
```json
{}
```

**Example - Sync Specific Documents**:
```json
{
  "documentIds": ["ldoc_111", "ldoc_222"],
  "force": true
}
```

### Response

**Success (202 Accepted)**:
```typescript
interface SyncResponse {
  queued: number;        // Documents added to queue
  documentIds: string[]; // IDs of queued documents
  estimatedTime: number; // Estimated seconds to complete
}
```

**Example**:
```json
{
  "queued": 5,
  "documentIds": ["ldoc_111", "ldoc_222", "ldoc_333", "ldoc_444", "ldoc_555"],
  "estimatedTime": 120
}
```

### Error Responses

| Status | Code | Description |
|--------|------|-------------|
| 401 | `UNAUTHORIZED` | No valid session |
| 404 | `LIBRARY_NOT_FOUND` | Invalid library type |
| 409 | `SYNC_IN_PROGRESS` | Library already has a sync in progress |

---

## Sync Status Webhook (Internal)

Documents progress through sync statuses:

```
pending → processing → synced
                   └→ failed
```

The RAG system updates document status via internal API:

```typescript
// Internal endpoint (not exposed to clients)
// POST /api/internal/documents/[id]/sync-status
interface SyncStatusUpdate {
  status: 'processing' | 'synced' | 'failed';
  error?: string;  // Error message if failed
}
```
