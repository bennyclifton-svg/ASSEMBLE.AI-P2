# Research: Landing Page

**Branch**: `010-landing-page` | **Date**: 2024-12-08

## Overview

This document captures research decisions for implementing authentication, session management, and Knowledge Library integration for the landing page feature.

---

## Authentication Approach

### Decision: Custom Authentication (not NextAuth)

### Rationale
- **Simplicity**: Single-tenant, single-role system doesn't need NextAuth's complexity
- **Control**: Direct control over session management and rate limiting
- **Consistency**: Matches existing API route patterns in the codebase
- **Dependencies**: Avoids adding another major dependency (NextAuth.js)

### Alternatives Considered
| Alternative | Rejected Because |
|-------------|------------------|
| NextAuth.js | Overkill for single-tenant, adds complexity, OAuth not needed initially |
| Passport.js | Express-oriented, doesn't fit Next.js App Router pattern |
| Auth0/Clerk | External service dependency, cost, overkill for MVP |

---

## Password Hashing

### Decision: bcrypt (via `bcryptjs` package)

### Rationale
- **Industry Standard**: bcrypt is well-tested and widely used
- **Pure JavaScript**: `bcryptjs` works without native bindings (better for Vercel deployment)
- **Cost Factor**: Configurable work factor for future-proofing (use cost 12)
- **No Edge Runtime Issues**: Works in Node.js runtime without issues

### Alternatives Considered
| Alternative | Rejected Because |
|-------------|------------------|
| scrypt | More complex, less common in JS ecosystem |
| argon2 | Native bindings required, deployment complications |
| PBKDF2 | Less resistant to GPU attacks than bcrypt |

### Implementation Note
```typescript
// Use bcryptjs (not bcrypt) for pure JS implementation
import bcrypt from 'bcryptjs';

const SALT_ROUNDS = 12;

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}
```

---

## Session Management

### Decision: Database Sessions with Secure Cookies

### Rationale
- **Revocability**: Can invalidate sessions server-side (logout, security events)
- **Simplicity**: SQLite already in use, no additional infrastructure
- **Security**: Session tokens stored server-side, only ID in cookie
- **Consistency**: Matches single-tenant model (no need for stateless JWT scaling)

### Alternatives Considered
| Alternative | Rejected Because |
|-------------|------------------|
| JWT (stateless) | Cannot revoke tokens, larger cookie size, overkill for single-tenant |
| Redis sessions | Additional infrastructure, unnecessary for scale |
| Memory sessions | Not persistent across restarts, not production-ready |

### Session Token Strategy
- Generate 32-byte random token using `crypto.randomBytes()`
- Store hash of token in database (not plain token)
- Set HTTP-only, Secure, SameSite=Strict cookie
- 24-hour expiry with sliding window on activity

---

## Rate Limiting

### Decision: In-Memory Rate Limiter with Fallback to Database

### Rationale
- **Simplicity**: No Redis dependency for MVP
- **Effectiveness**: 5 attempts / 15 minutes per email is sufficient protection
- **Fallback**: Store attempts in SQLite for persistence across restarts
- **Scalability**: Can migrate to Redis later if needed

### Alternatives Considered
| Alternative | Rejected Because |
|-------------|------------------|
| Redis-based | Additional infrastructure, overkill for single-tenant |
| IP-based only | Doesn't protect against distributed attacks on single email |
| CAPTCHA | Poor UX for small firm users, adds complexity |

### Implementation Approach
```typescript
interface LoginAttempt {
  email: string;
  attempts: number;
  lockedUntil: number | null;
}

// In-memory cache with SQLite backup
const attemptCache = new Map<string, LoginAttempt>();

export function checkRateLimit(email: string): { allowed: boolean; retryAfter?: number } {
  const attempt = attemptCache.get(email);
  if (!attempt) return { allowed: true };

  if (attempt.lockedUntil && Date.now() < attempt.lockedUntil) {
    return { allowed: false, retryAfter: Math.ceil((attempt.lockedUntil - Date.now()) / 1000) };
  }

  return { allowed: true };
}
```

---

## Knowledge Library Component Reuse

### Decision: Fork and Adapt Existing Components

### Rationale
- **Code Efficiency**: ~80% of DocumentRepository logic is reusable
- **UX Consistency**: Same drag-drop, tile, and list patterns
- **Maintenance**: Shared base behavior reduces bugs

### Components to Fork

| Original | Forked As | Key Changes |
|----------|-----------|-------------|
| `DocumentRepository` | `KnowledgeLibraryRepository` | Replace `projectId` prop with `organizationId`, use static library types |
| `CategoryUploadTiles` | `LibraryUploadTiles` | Replace `useActiveCategories` hook with static `KNOWLEDGE_LIBRARY_TYPES` |
| `CategorizedList` | `LibraryDocumentList` | Query `/api/libraries/[type]/documents` instead of project documents |
| `CategoryTile` | *Reuse directly* | Pass library data in same shape as category data |

### Shared Interfaces
```typescript
// Both categories and libraries use this shape
interface TileData {
  id: string;
  name: string;
  color: string;
  hasSubcategories?: boolean;
}
```

---

## Middleware Strategy

### Decision: Next.js Middleware for Auth Protection

### Rationale
- **Edge Performance**: Runs at edge, fast redirect for unauthenticated users
- **Centralized**: Single place for auth logic
- **Pattern**: Standard Next.js approach

### Protected Routes
```typescript
// middleware.ts
export const config = {
  matcher: [
    // Protect all routes except auth pages and API
    '/((?!login|register|api/auth|_next/static|_next/image|favicon.ico).*)',
  ],
};
```

### Auth Flow
1. Middleware checks for session cookie
2. If no cookie → redirect to `/login`
3. If cookie exists → validate session in database
4. If session valid → allow request
5. If session invalid/expired → clear cookie, redirect to `/login`

---

## Default Settings Storage

### Decision: Store in Organization Record (JSON Column)

### Rationale
- **Simplicity**: No additional table needed
- **Flexibility**: JSON allows schema evolution without migrations
- **Single-Tenant**: One organization = one settings object

### Schema Addition
```typescript
// In organizations table
defaultSettings: text('default_settings').default('{}'), // JSON string

interface DefaultSettings {
  enabledConsultantDisciplines?: string[];
  enabledContractorTrades?: string[];
  // Future: default cost line templates, etc.
}
```

---

## Summary of Technology Decisions

| Area | Decision | Package/Approach |
|------|----------|------------------|
| Auth Framework | Custom implementation | Next.js API routes + middleware |
| Password Hashing | bcrypt | `bcryptjs` (pure JS) |
| Session Storage | Database sessions | SQLite (existing) |
| Session Tokens | Random + hash | `crypto.randomBytes()` |
| Rate Limiting | In-memory + DB backup | Custom implementation |
| Component Reuse | Fork DocumentRepository | ~80% code reuse |
| Route Protection | Next.js Middleware | Edge runtime |
| Default Settings | JSON column | Organization table |

---

## Dependencies to Add

```json
{
  "dependencies": {
    "bcryptjs": "^2.4.3"
  },
  "devDependencies": {
    "@types/bcryptjs": "^2.4.6"
  }
}
```

---

## Open Questions (Resolved)

All technical questions have been resolved. No NEEDS CLARIFICATION items remain.
