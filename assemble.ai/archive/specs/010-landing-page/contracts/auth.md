# API Contracts: Authentication

**Branch**: `010-landing-page` | **Date**: 2024-12-08

## Overview

Authentication endpoints for user login, registration, logout, and session validation.

---

## POST /api/auth/register

Creates a new user account and organization.

### Request

```typescript
interface RegisterRequest {
  email: string;        // Valid email format (RFC 5322)
  password: string;     // Minimum 8 characters
  displayName: string;  // 1-100 characters
}
```

**Headers**:
- `Content-Type: application/json`

**Example**:
```json
{
  "email": "user@example.com",
  "password": "securepassword123",
  "displayName": "John Smith"
}
```

### Response

**Success (201 Created)**:
```typescript
interface RegisterResponse {
  user: {
    id: string;
    email: string;
    displayName: string;
  };
  organization: {
    id: string;
    name: string;
  };
}
```

**Cookies Set**:
- `session`: HTTP-only, Secure, SameSite=Strict, 24-hour expiry

**Example**:
```json
{
  "user": {
    "id": "usr_abc123",
    "email": "user@example.com",
    "displayName": "John Smith"
  },
  "organization": {
    "id": "org_xyz789",
    "name": "John Smith's Organization"
  }
}
```

### Error Responses

| Status | Code | Description |
|--------|------|-------------|
| 400 | `INVALID_EMAIL` | Email format is invalid |
| 400 | `INVALID_PASSWORD` | Password does not meet requirements |
| 400 | `INVALID_NAME` | Display name is empty or too long |
| 409 | `EMAIL_EXISTS` | Email already registered |

**Error Format**:
```typescript
interface ErrorResponse {
  error: {
    code: string;
    message: string;
    field?: string;  // For validation errors
  };
}
```

---

## POST /api/auth/login

Authenticates a user and creates a session.

### Request

```typescript
interface LoginRequest {
  email: string;
  password: string;
}
```

**Headers**:
- `Content-Type: application/json`

**Example**:
```json
{
  "email": "user@example.com",
  "password": "securepassword123"
}
```

### Response

**Success (200 OK)**:
```typescript
interface LoginResponse {
  user: {
    id: string;
    email: string;
    displayName: string;
    organizationId: string;
  };
}
```

**Cookies Set**:
- `session`: HTTP-only, Secure, SameSite=Strict, 24-hour expiry

**Example**:
```json
{
  "user": {
    "id": "usr_abc123",
    "email": "user@example.com",
    "displayName": "John Smith",
    "organizationId": "org_xyz789"
  }
}
```

### Error Responses

| Status | Code | Description |
|--------|------|-------------|
| 401 | `INVALID_CREDENTIALS` | Email or password incorrect |
| 429 | `RATE_LIMITED` | Too many failed attempts |

**Rate Limited Response**:
```typescript
interface RateLimitedResponse {
  error: {
    code: 'RATE_LIMITED';
    message: string;
    retryAfter: number;  // Seconds until lockout expires
  };
}
```

---

## POST /api/auth/logout

Terminates the current session.

### Request

**Headers**:
- `Cookie: session=<token>`

No request body required.

### Response

**Success (200 OK)**:
```json
{
  "success": true
}
```

**Cookies Cleared**:
- `session`: Set to empty with immediate expiry

### Error Responses

| Status | Code | Description |
|--------|------|-------------|
| 401 | `UNAUTHORIZED` | No valid session |

---

## GET /api/auth/me

Returns the current authenticated user's information.

### Request

**Headers**:
- `Cookie: session=<token>`

### Response

**Success (200 OK)**:
```typescript
interface MeResponse {
  user: {
    id: string;
    email: string;
    displayName: string;
    organizationId: string;
    createdAt: number;  // Unix timestamp
  };
  organization: {
    id: string;
    name: string;
    defaultSettings: DefaultSettings;
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
  "user": {
    "id": "usr_abc123",
    "email": "user@example.com",
    "displayName": "John Smith",
    "organizationId": "org_xyz789",
    "createdAt": 1733644800
  },
  "organization": {
    "id": "org_xyz789",
    "name": "Smith Construction",
    "defaultSettings": {
      "enabledConsultantDisciplines": ["structural", "mechanical"],
      "enabledContractorTrades": []
    }
  }
}
```

### Error Responses

| Status | Code | Description |
|--------|------|-------------|
| 401 | `UNAUTHORIZED` | No valid session or session expired |

---

## Session Cookie Specification

| Attribute | Value | Purpose |
|-----------|-------|---------|
| `HttpOnly` | true | Prevent JavaScript access |
| `Secure` | true (production) | HTTPS only |
| `SameSite` | Strict | CSRF protection |
| `Path` | / | Available to all routes |
| `Max-Age` | 86400 (24 hours) | Session duration |

**Token Format**:
- 32-byte random value, base64-encoded
- Stored in database as SHA-256 hash
- Sliding expiration: refreshed on each authenticated request
