# API Contracts: Users

**Branch**: `010-landing-page` | **Date**: 2024-12-08

## Overview

User profile management endpoints for viewing and updating user information.

---

## PATCH /api/users/me

Updates the current user's profile information.

### Request

```typescript
interface UpdateUserRequest {
  displayName?: string;  // 1-100 characters
  password?: {
    current: string;     // Current password for verification
    new: string;         // Minimum 8 characters
  };
}
```

**Headers**:
- `Content-Type: application/json`
- `Cookie: session=<token>`

**Example - Update Display Name**:
```json
{
  "displayName": "John A. Smith"
}
```

**Example - Change Password**:
```json
{
  "password": {
    "current": "oldpassword123",
    "new": "newpassword456"
  }
}
```

### Response

**Success (200 OK)**:
```typescript
interface UpdateUserResponse {
  user: {
    id: string;
    email: string;
    displayName: string;
    updatedAt: number;  // Unix timestamp
  };
}
```

**Example**:
```json
{
  "user": {
    "id": "usr_abc123",
    "email": "user@example.com",
    "displayName": "John A. Smith",
    "updatedAt": 1733644900
  }
}
```

### Error Responses

| Status | Code | Description |
|--------|------|-------------|
| 400 | `INVALID_NAME` | Display name empty or exceeds 100 characters |
| 400 | `INVALID_PASSWORD` | New password does not meet requirements |
| 401 | `UNAUTHORIZED` | No valid session |
| 401 | `WRONG_PASSWORD` | Current password incorrect (for password change) |

**Error Format**:
```typescript
interface ErrorResponse {
  error: {
    code: string;
    message: string;
    field?: string;
  };
}
```

---

## PATCH /api/users/me/organization

Updates the organization's default settings (organization admin only).

### Request

```typescript
interface UpdateOrganizationRequest {
  name?: string;  // 1-100 characters
  defaultSettings?: {
    enabledConsultantDisciplines?: string[];  // IDs from consultant disciplines
    enabledContractorTrades?: string[];       // IDs from contractor trades
  };
}
```

**Headers**:
- `Content-Type: application/json`
- `Cookie: session=<token>`

**Example**:
```json
{
  "name": "Smith Construction Ltd",
  "defaultSettings": {
    "enabledConsultantDisciplines": ["structural", "mechanical", "electrical"],
    "enabledContractorTrades": ["concrete", "steel"]
  }
}
```

### Response

**Success (200 OK)**:
```typescript
interface UpdateOrganizationResponse {
  organization: {
    id: string;
    name: string;
    defaultSettings: DefaultSettings;
    updatedAt: number;
  };
}

interface DefaultSettings {
  enabledConsultantDisciplines?: string[];
  enabledContractorTrades?: string[];
}
```

**Example**:
```json
{
  "organization": {
    "id": "org_xyz789",
    "name": "Smith Construction Ltd",
    "defaultSettings": {
      "enabledConsultantDisciplines": ["structural", "mechanical", "electrical"],
      "enabledContractorTrades": ["concrete", "steel"]
    },
    "updatedAt": 1733645000
  }
}
```

### Error Responses

| Status | Code | Description |
|--------|------|-------------|
| 400 | `INVALID_NAME` | Organization name empty or too long |
| 400 | `INVALID_DISCIPLINE` | Unknown discipline ID in settings |
| 400 | `INVALID_TRADE` | Unknown trade ID in settings |
| 401 | `UNAUTHORIZED` | No valid session |

---

## Validation Rules

### Display Name
- Minimum: 1 character
- Maximum: 100 characters
- Allowed: Letters, numbers, spaces, hyphens, apostrophes

### Password
- Minimum: 8 characters
- No maximum (hashed anyway)
- Recommended: Mix of letters, numbers, symbols

### Organization Name
- Minimum: 1 character
- Maximum: 100 characters
- Allowed: Letters, numbers, spaces, common punctuation
