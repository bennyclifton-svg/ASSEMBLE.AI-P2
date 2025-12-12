# API Contracts: Projects (Landing Page)

**Branch**: `010-landing-page` | **Date**: 2024-12-08

## Overview

Project listing and creation endpoints for the Project Register panel. These complement existing project endpoints by providing landing page-specific views.

---

## GET /api/projects

Returns all projects accessible to the current user.

### Request

**Headers**:
- `Cookie: session=<token>`

**Query Parameters**:
- `status`: Filter by status (`active`, `archived`, `all`) - default: `active`
- `sort`: Sort field (`name`, `updatedAt`, `createdAt`, `stage`) - default: `updatedAt`
- `order`: Sort order (`asc`, `desc`) - default: `desc`

### Response

**Success (200 OK)**:
```typescript
interface ProjectsResponse {
  projects: ProjectSummary[];
  total: number;
}

interface ProjectSummary {
  id: string;
  name: string;
  stage: ProjectStage | null;
  status: 'active' | 'archived';
  documentCount: number;
  createdAt: number;    // Unix timestamp
  updatedAt: number;    // Unix timestamp
}

type ProjectStage =
  | 'concept'
  | 'schematic'
  | 'design-development'
  | 'documentation'
  | 'tender'
  | 'construction'
  | 'completion';
```

**Example**:
```json
{
  "projects": [
    {
      "id": "proj_abc123",
      "name": "Commercial Tower - Sydney CBD",
      "stage": "design-development",
      "status": "active",
      "documentCount": 47,
      "createdAt": 1733500000,
      "updatedAt": 1733644800
    },
    {
      "id": "proj_def456",
      "name": "Residential Complex - Parramatta",
      "stage": "schematic",
      "status": "active",
      "documentCount": 23,
      "createdAt": 1733400000,
      "updatedAt": 1733640000
    }
  ],
  "total": 2
}
```

### Error Responses

| Status | Code | Description |
|--------|------|-------------|
| 401 | `UNAUTHORIZED` | No valid session |

---

## POST /api/projects

Creates a new project.

### Request

**Headers**:
- `Content-Type: application/json`
- `Cookie: session=<token>`

```typescript
interface CreateProjectRequest {
  name: string;           // 1-200 characters
  description?: string;   // Optional, up to 2000 characters
  stage?: ProjectStage;   // Optional, defaults to 'concept'
}
```

**Example**:
```json
{
  "name": "New Mixed-Use Development",
  "description": "15-story mixed-use building in North Sydney",
  "stage": "concept"
}
```

### Response

**Success (201 Created)**:
```typescript
interface CreateProjectResponse {
  project: {
    id: string;
    name: string;
    description: string | null;
    stage: ProjectStage;
    status: 'active';
    createdAt: number;
    updatedAt: number;
  };
}
```

**Example**:
```json
{
  "project": {
    "id": "proj_ghi789",
    "name": "New Mixed-Use Development",
    "description": "15-story mixed-use building in North Sydney",
    "stage": "concept",
    "status": "active",
    "createdAt": 1733645000,
    "updatedAt": 1733645000
  }
}
```

### Default Settings Applied

When a project is created, organization default settings are applied:

```typescript
// Applied from organization.defaultSettings
{
  enabledConsultantDisciplines: string[];  // Copied to project
  enabledContractorTrades: string[];       // Copied to project
}
```

### Error Responses

| Status | Code | Description |
|--------|------|-------------|
| 400 | `INVALID_NAME` | Name empty or exceeds 200 characters |
| 400 | `INVALID_DESCRIPTION` | Description exceeds 2000 characters |
| 400 | `INVALID_STAGE` | Unknown project stage |
| 401 | `UNAUTHORIZED` | No valid session |

---

## PATCH /api/projects/[id]/archive

Archives a project (soft delete).

### Request

**URL Parameters**:
- `id`: Project ID

**Headers**:
- `Cookie: session=<token>`

No request body required.

### Response

**Success (200 OK)**:
```typescript
interface ArchiveProjectResponse {
  project: {
    id: string;
    name: string;
    status: 'archived';
    updatedAt: number;
  };
}
```

**Example**:
```json
{
  "project": {
    "id": "proj_abc123",
    "name": "Commercial Tower - Sydney CBD",
    "status": "archived",
    "updatedAt": 1733645100
  }
}
```

### Error Responses

| Status | Code | Description |
|--------|------|-------------|
| 401 | `UNAUTHORIZED` | No valid session |
| 404 | `PROJECT_NOT_FOUND` | Project does not exist |

---

## PATCH /api/projects/[id]/restore

Restores an archived project.

### Request

**URL Parameters**:
- `id`: Project ID

**Headers**:
- `Cookie: session=<token>`

No request body required.

### Response

**Success (200 OK)**:
```typescript
interface RestoreProjectResponse {
  project: {
    id: string;
    name: string;
    status: 'active';
    updatedAt: number;
  };
}
```

### Error Responses

| Status | Code | Description |
|--------|------|-------------|
| 401 | `UNAUTHORIZED` | No valid session |
| 404 | `PROJECT_NOT_FOUND` | Project does not exist |

---

## Project Stages Reference

| Stage | Display Name | Description |
|-------|--------------|-------------|
| `concept` | Concept | Initial project concept and feasibility |
| `schematic` | Schematic Design | High-level design exploration |
| `design-development` | Design Development | Detailed design refinement |
| `documentation` | Documentation | Construction documentation |
| `tender` | Tender | Procurement and bidding |
| `construction` | Construction | Active construction phase |
| `completion` | Completion | Project handover and close-out |
