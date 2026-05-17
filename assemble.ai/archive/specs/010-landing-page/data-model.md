# Data Model: Landing Page

**Branch**: `010-landing-page` | **Date**: 2024-12-08

## Overview

This document defines the data model extensions required for the landing page feature, including authentication entities and knowledge library storage.

---

## Entity Relationship Diagram

```
┌─────────────────┐       ┌─────────────────┐
│   Organization  │───────│      User       │
│                 │ 1   * │                 │
│  id             │       │  id             │
│  name           │       │  email          │
│  defaultSettings│       │  passwordHash   │
│  createdAt      │       │  displayName    │
│  updatedAt      │       │  organizationId │
└─────────────────┘       │  createdAt      │
        │                 │  updatedAt      │
        │                 └────────┬────────┘
        │                          │
        │ 1                      * │
        ▼                          ▼
┌─────────────────┐       ┌─────────────────┐
│ KnowledgeLibrary│       │     Session     │
│                 │       │                 │
│  id             │       │  id             │
│  organizationId │       │  userId         │
│  type           │       │  tokenHash      │
│  documentCount  │       │  expiresAt      │
│  createdAt      │       │  createdAt      │
│  updatedAt      │       └─────────────────┘
└────────┬────────┘
         │
         │ 1
         ▼
┌─────────────────┐       ┌─────────────────┐
│ LibraryDocument │───────│    FileAsset    │
│                 │ *   1 │   (existing)    │
│  id             │       │                 │
│  libraryId      │       │  id             │
│  fileAssetId    │       │  filename       │
│  addedAt        │       │  ...            │
│  addedBy        │       └─────────────────┘
└─────────────────┘

┌─────────────────┐
│  LoginAttempt   │
│                 │
│  id             │
│  email          │
│  attempts       │
│  lockedUntil    │
│  updatedAt      │
└─────────────────┘
```

---

## Entities

### Organization

Represents a tenant/company using the system. Initially 1:1 with the first user who registers.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | TEXT | PK, UUID | Unique identifier |
| `name` | TEXT | NOT NULL | Organization/company name |
| `defaultSettings` | TEXT | DEFAULT '{}' | JSON string of default configuration |
| `createdAt` | INTEGER | NOT NULL | Unix timestamp |
| `updatedAt` | INTEGER | NOT NULL | Unix timestamp |

**Default Settings Schema**:
```typescript
interface DefaultSettings {
  enabledConsultantDisciplines?: string[];  // IDs of disciplines to enable by default
  enabledContractorTrades?: string[];       // IDs of trades to enable by default
}
```

---

### User

Represents an authenticated user of the system.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | TEXT | PK, UUID | Unique identifier |
| `email` | TEXT | NOT NULL, UNIQUE | Email address (login identifier) |
| `passwordHash` | TEXT | NOT NULL | bcrypt hash of password |
| `displayName` | TEXT | NOT NULL | User's display name |
| `organizationId` | TEXT | FK → organizations.id | Parent organization |
| `createdAt` | INTEGER | NOT NULL | Unix timestamp |
| `updatedAt` | INTEGER | NOT NULL | Unix timestamp |

**Validation Rules**:
- Email must be valid format (RFC 5322)
- Email must be unique across all organizations
- Password must be minimum 8 characters before hashing
- Display name must be 1-100 characters

---

### Session

Tracks active user sessions for authentication.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | TEXT | PK, UUID | Unique identifier |
| `userId` | TEXT | FK → users.id, NOT NULL | User who owns session |
| `tokenHash` | TEXT | NOT NULL, UNIQUE | SHA-256 hash of session token |
| `expiresAt` | INTEGER | NOT NULL | Unix timestamp when session expires |
| `createdAt` | INTEGER | NOT NULL | Unix timestamp |

**Session Lifecycle**:
- Created on successful login
- Token returned to client, hash stored in DB
- Expires after 24 hours of inactivity
- Deleted on logout or expiration
- Sliding expiration: updated on each authenticated request

---

### LoginAttempt

Tracks failed login attempts for rate limiting.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | TEXT | PK, UUID | Unique identifier |
| `email` | TEXT | NOT NULL, UNIQUE | Email being rate-limited |
| `attempts` | INTEGER | NOT NULL, DEFAULT 0 | Failed attempt count |
| `lockedUntil` | INTEGER | NULL | Unix timestamp when lockout ends |
| `updatedAt` | INTEGER | NOT NULL | Unix timestamp |

**Rate Limiting Rules**:
- After 5 failed attempts → lock for 15 minutes
- Reset attempts on successful login
- Reset attempts after lockout expires

---

### KnowledgeLibrary

Represents a knowledge library (one per type per organization).

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | TEXT | PK, UUID | Unique identifier |
| `organizationId` | TEXT | FK → organizations.id | Parent organization |
| `type` | TEXT | NOT NULL | Library type enum |
| `documentCount` | INTEGER | NOT NULL, DEFAULT 0 | Denormalized count |
| `createdAt` | INTEGER | NOT NULL | Unix timestamp |
| `updatedAt` | INTEGER | NOT NULL | Unix timestamp |

**Type Enum Values**:
- `due-diligence`
- `house`
- `apartments`
- `fitout`
- `industrial`
- `remediation`

**Uniqueness**: UNIQUE(organizationId, type) - one library per type per org.

---

### LibraryDocument

Links documents (file assets) to knowledge libraries.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | TEXT | PK, UUID | Unique identifier |
| `libraryId` | TEXT | FK → knowledgeLibraries.id | Parent library |
| `fileAssetId` | TEXT | FK → fileAssets.id | Linked file |
| `addedAt` | INTEGER | NOT NULL | Unix timestamp |
| `addedBy` | TEXT | FK → users.id, NULL | User who added (nullable for migration) |

**Cascade Rules**:
- ON DELETE CASCADE from knowledgeLibraries
- ON DELETE SET NULL from users (preserve documents if user deleted)

---

## Drizzle Schema Definitions

```typescript
// src/lib/db/schema.ts additions

import { sqliteTable, text, integer, uniqueIndex } from 'drizzle-orm/sqlite-core';

// Organizations table
export const organizations = sqliteTable('organizations', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  defaultSettings: text('default_settings').default('{}'),
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
});

// Users table
export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  displayName: text('display_name').notNull(),
  organizationId: text('organization_id').references(() => organizations.id),
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
});

// Sessions table
export const sessions = sqliteTable('sessions', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  tokenHash: text('token_hash').notNull().unique(),
  expiresAt: integer('expires_at').notNull(),
  createdAt: integer('created_at').notNull(),
});

// Login attempts table (rate limiting)
export const loginAttempts = sqliteTable('login_attempts', {
  id: text('id').primaryKey(),
  email: text('email').notNull().unique(),
  attempts: integer('attempts').notNull().default(0),
  lockedUntil: integer('locked_until'),
  updatedAt: integer('updated_at').notNull(),
});

// Knowledge libraries table
export const knowledgeLibraries = sqliteTable('knowledge_libraries', {
  id: text('id').primaryKey(),
  organizationId: text('organization_id').notNull().references(() => organizations.id),
  type: text('type').notNull(), // 'due-diligence' | 'house' | 'apartments' | 'fitout' | 'industrial' | 'remediation'
  documentCount: integer('document_count').notNull().default(0),
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
}, (table) => ({
  orgTypeUnique: uniqueIndex('org_type_unique').on(table.organizationId, table.type),
}));

// Library documents table
export const libraryDocuments = sqliteTable('library_documents', {
  id: text('id').primaryKey(),
  libraryId: text('library_id').notNull().references(() => knowledgeLibraries.id, { onDelete: 'cascade' }),
  fileAssetId: text('file_asset_id').notNull().references(() => fileAssets.id),
  addedAt: integer('added_at').notNull(),
  addedBy: text('added_by').references(() => users.id, { onDelete: 'set null' }),
});
```

---

## Schema Modifications to Existing Tables

### Projects Table

Add `organizationId` for future multi-org support:

```typescript
// Add to projects table
organizationId: text('organization_id').references(() => organizations.id),
```

**Migration Strategy**:
1. Add nullable column
2. Create default organization
3. Update all existing projects to reference default org
4. Make column NOT NULL

---

## Indexes

| Table | Index | Columns | Purpose |
|-------|-------|---------|---------|
| `users` | `users_email_idx` | email | Fast login lookup |
| `sessions` | `sessions_token_idx` | tokenHash | Fast session validation |
| `sessions` | `sessions_user_idx` | userId | Find user's sessions for logout |
| `loginAttempts` | `login_attempts_email_idx` | email | Fast rate limit lookup |
| `knowledgeLibraries` | `org_type_unique` | organizationId, type | Ensure one library per type |
| `libraryDocuments` | `lib_docs_library_idx` | libraryId | Fast document listing |

---

## State Transitions

### Session States

```
                    ┌─────────────┐
         login      │             │
    ────────────────►   ACTIVE    │
                    │             │
                    └──────┬──────┘
                           │
           ┌───────────────┼───────────────┐
           │               │               │
           ▼               ▼               ▼
    ┌─────────────┐ ┌─────────────┐ ┌─────────────┐
    │   EXPIRED   │ │  LOGGED_OUT │ │  REVOKED    │
    │  (24h idle) │ │   (user)    │ │  (admin)    │
    └─────────────┘ └─────────────┘ └─────────────┘
```

### Rate Limit States

```
                    ┌─────────────┐
     first attempt  │             │
    ────────────────►   NORMAL    │◄──────────────┐
                    │ (attempts<5)│    successful │
                    └──────┬──────┘    login or   │
                           │           lockout    │
                           │           expires    │
                   5 failed│                      │
                   attempts│                      │
                           ▼                      │
                    ┌─────────────┐               │
                    │   LOCKED    │───────────────┘
                    │ (15 minutes)│
                    └─────────────┘
```

---

## Data Volume Estimates

| Entity | Expected Records | Growth Rate |
|--------|------------------|-------------|
| Organizations | 1 (single-tenant) | Static |
| Users | 1-5 | Slow (small firm) |
| Sessions | 1-10 active | Steady (one per device) |
| LoginAttempts | 0-10 | Transient (cleared on success) |
| KnowledgeLibraries | 6 (one per type) | Static |
| LibraryDocuments | 100-500 | Moderate (curated content) |

---

## Migration Script

```sql
-- Migration: 010_landing_page_auth_tables.sql

-- Organizations
CREATE TABLE IF NOT EXISTS organizations (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  default_settings TEXT DEFAULT '{}',
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

-- Users
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  display_name TEXT NOT NULL,
  organization_id TEXT REFERENCES organizations(id),
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS users_email_idx ON users(email);

-- Sessions
CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS sessions_token_idx ON sessions(token_hash);
CREATE INDEX IF NOT EXISTS sessions_user_idx ON sessions(user_id);

-- Login attempts (rate limiting)
CREATE TABLE IF NOT EXISTS login_attempts (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  attempts INTEGER NOT NULL DEFAULT 0,
  locked_until INTEGER,
  updated_at INTEGER NOT NULL
);

-- Knowledge libraries
CREATE TABLE IF NOT EXISTS knowledge_libraries (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES organizations(id),
  type TEXT NOT NULL,
  document_count INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  UNIQUE(organization_id, type)
);

-- Library documents
CREATE TABLE IF NOT EXISTS library_documents (
  id TEXT PRIMARY KEY,
  library_id TEXT NOT NULL REFERENCES knowledge_libraries(id) ON DELETE CASCADE,
  file_asset_id TEXT NOT NULL REFERENCES file_assets(id),
  added_at INTEGER NOT NULL,
  added_by TEXT REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS lib_docs_library_idx ON library_documents(library_id);

-- Add organization_id to projects (nullable for migration)
ALTER TABLE projects ADD COLUMN organization_id TEXT REFERENCES organizations(id);
```
