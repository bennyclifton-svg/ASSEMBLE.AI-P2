# Quickstart Guide: Landing Page

**Branch**: `010-landing-page` | **Date**: 2024-12-08

## Overview

This guide provides essential implementation references for the landing page feature, including component patterns, database setup, and common workflows.

---

## Prerequisites

Ensure you have reviewed:
- [spec.md](./spec.md) - Feature specification
- [data-model.md](./data-model.md) - Database schema
- [contracts/](./contracts/) - API contracts

---

## 1. Database Migration

Run the migration to create auth and library tables:

```bash
# Generate migration from schema changes
npx drizzle-kit generate:sqlite

# Run migration
node scripts/run-migration-010.js
```

### Migration Script Template

```javascript
// scripts/run-migration-010.js
const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const dbPath = path.join(__dirname, '../data/assemble.db');
const db = new Database(dbPath);

const migration = fs.readFileSync(
  path.join(__dirname, '../drizzle/010_landing_page.sql'),
  'utf-8'
);

db.exec(migration);
console.log('Migration 010 complete');
```

---

## 2. Authentication Setup

### Password Utilities

```typescript
// src/lib/auth/password.ts
import bcrypt from 'bcryptjs';

const SALT_ROUNDS = 12;

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}
```

### Session Management

```typescript
// src/lib/auth/session.ts
import { randomBytes, createHash } from 'crypto';
import { cookies } from 'next/headers';

const SESSION_COOKIE = 'session';
const SESSION_DURATION = 24 * 60 * 60; // 24 hours in seconds

export function generateSessionToken(): string {
  return randomBytes(32).toString('base64url');
}

export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export async function setSessionCookie(token: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: SESSION_DURATION,
    path: '/',
  });
}

export async function clearSessionCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}

export async function getSessionToken(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get(SESSION_COOKIE)?.value ?? null;
}
```

### Rate Limiting

```typescript
// src/lib/auth/rate-limit.ts
interface LoginAttempt {
  attempts: number;
  lockedUntil: number | null;
}

const MAX_ATTEMPTS = 5;
const LOCKOUT_DURATION = 15 * 60 * 1000; // 15 minutes

// In-memory cache (backed by database)
const attemptCache = new Map<string, LoginAttempt>();

export function checkRateLimit(email: string): {
  allowed: boolean;
  retryAfter?: number;
} {
  const attempt = attemptCache.get(email.toLowerCase());

  if (!attempt) {
    return { allowed: true };
  }

  if (attempt.lockedUntil && Date.now() < attempt.lockedUntil) {
    return {
      allowed: false,
      retryAfter: Math.ceil((attempt.lockedUntil - Date.now()) / 1000),
    };
  }

  return { allowed: true };
}

export function recordFailedAttempt(email: string): void {
  const key = email.toLowerCase();
  const attempt = attemptCache.get(key) ?? { attempts: 0, lockedUntil: null };

  attempt.attempts += 1;

  if (attempt.attempts >= MAX_ATTEMPTS) {
    attempt.lockedUntil = Date.now() + LOCKOUT_DURATION;
  }

  attemptCache.set(key, attempt);
  // TODO: Persist to database for durability
}

export function clearAttempts(email: string): void {
  attemptCache.delete(email.toLowerCase());
}
```

---

## 3. Middleware Configuration

```typescript
// src/middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  const sessionToken = request.cookies.get('session')?.value;
  const { pathname } = request.nextUrl;

  // Public routes
  const publicRoutes = ['/login', '/register'];
  const isPublicRoute = publicRoutes.some(route => pathname.startsWith(route));

  // API routes handle their own auth
  const isApiRoute = pathname.startsWith('/api');

  if (isApiRoute) {
    return NextResponse.next();
  }

  // Redirect unauthenticated users to login
  if (!sessionToken && !isPublicRoute) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Redirect authenticated users away from auth pages
  if (sessionToken && isPublicRoute) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
```

---

## 4. Component Patterns

### Knowledge Library Repository (Fork Pattern)

```typescript
// src/components/libraries/KnowledgeLibraryRepository.tsx
'use client';

import { KNOWLEDGE_LIBRARY_TYPES } from '@/lib/constants/libraries';
import { LibraryUploadTiles } from './LibraryUploadTiles';
import { LibraryDocumentList } from './LibraryDocumentList';

interface Props {
  organizationId: string;
}

export function KnowledgeLibraryRepository({ organizationId }: Props) {
  const [selectedLibrary, setSelectedLibrary] = useState<string | null>(null);

  // Reuse existing DocumentRepository layout pattern
  return (
    <div className="flex flex-col h-full">
      <LibraryUploadTiles
        libraries={KNOWLEDGE_LIBRARY_TYPES}
        selectedLibrary={selectedLibrary}
        onSelect={setSelectedLibrary}
        organizationId={organizationId}
      />

      {selectedLibrary && (
        <LibraryDocumentList
          libraryType={selectedLibrary}
          organizationId={organizationId}
        />
      )}
    </div>
  );
}
```

### Library Types Constant

```typescript
// src/lib/constants/libraries.ts
export const KNOWLEDGE_LIBRARY_TYPES = [
  { id: 'due-diligence', name: 'Due Diligence', color: '#ce9178' },
  { id: 'house', name: 'House', color: '#4ec9b0' },
  { id: 'apartments', name: 'Apartments', color: '#569cd6' },
  { id: 'fitout', name: 'Fitout', color: '#dcdcaa' },
  { id: 'industrial', name: 'Industrial', color: '#c586c0' },
  { id: 'remediation', name: 'Remediation', color: '#9cdcfe' },
] as const;

export type LibraryType = typeof KNOWLEDGE_LIBRARY_TYPES[number]['id'];
```

### Project Register Component

```typescript
// src/components/dashboard/ProjectRegister.tsx
'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

interface ProjectSummary {
  id: string;
  name: string;
  stage: string | null;
  updatedAt: number;
}

interface Props {
  projects: ProjectSummary[];
  onCreateProject: () => Promise<string>;
}

export function ProjectRegister({ projects, onCreateProject }: Props) {
  const router = useRouter();
  const [creating, setCreating] = useState(false);

  const handleCreate = async () => {
    setCreating(true);
    try {
      const projectId = await onCreateProject();
      router.push(`/projects/${projectId}`);
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#252526]">
      <div className="flex items-center justify-between p-3 border-b border-[#3e3e42]">
        <h2 className="text-sm font-medium text-[#cccccc]">Projects</h2>
        <button
          onClick={handleCreate}
          disabled={creating}
          className="px-2 py-1 text-xs bg-[#0e639c] hover:bg-[#1177bb] rounded"
        >
          {creating ? 'Creating...' : 'New Project'}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {projects.length === 0 ? (
          <div className="p-4 text-center text-[#808080]">
            <p>No projects yet</p>
            <button onClick={handleCreate} className="mt-2 text-[#569cd6]">
              Create your first project
            </button>
          </div>
        ) : (
          <ul className="divide-y divide-[#3e3e42]">
            {projects.map(project => (
              <li key={project.id}>
                <button
                  onClick={() => router.push(`/projects/${project.id}`)}
                  className="w-full p-3 text-left hover:bg-[#2a2d2e] transition-colors"
                >
                  <div className="text-sm text-[#cccccc]">{project.name}</div>
                  <div className="text-xs text-[#808080] mt-1">
                    {project.stage && <span>{formatStage(project.stage)} • </span>}
                    Updated {formatRelativeTime(project.updatedAt)}
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function formatStage(stage: string): string {
  return stage.split('-').map(w => w[0].toUpperCase() + w.slice(1)).join(' ');
}

function formatRelativeTime(timestamp: number): string {
  const diff = Date.now() - timestamp * 1000;
  const hours = Math.floor(diff / 3600000);
  if (hours < 1) return 'just now';
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}
```

---

## 5. Landing Page Layout

```typescript
// src/app/(dashboard)/page.tsx
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from 'react-resizable-panels';
import { ProjectRegister } from '@/components/dashboard/ProjectRegister';
import { SettingsPanel } from '@/components/dashboard/SettingsPanel';
import { KnowledgeLibraryRepository } from '@/components/libraries/KnowledgeLibraryRepository';
import { getSession } from '@/lib/auth/session';
import { getProjects } from '@/lib/api/projects';
import { redirect } from 'next/navigation';

export default async function LandingPage() {
  const session = await getSession();
  if (!session) redirect('/login');

  const projects = await getProjects(session.organizationId);

  return (
    <div className="h-screen bg-[#1e1e1e]">
      <ResizablePanelGroup direction="horizontal">
        {/* Left Panel - Project Register (20%) */}
        <ResizablePanel defaultSize={20} minSize={15} maxSize={30}>
          <ProjectRegister projects={projects} />
        </ResizablePanel>

        <ResizableHandle className="w-1 bg-[#3e3e42]" />

        {/* Center Panel - Settings & Profile (55%) */}
        <ResizablePanel defaultSize={55} minSize={40}>
          <SettingsPanel user={session.user} organization={session.organization} />
        </ResizablePanel>

        <ResizableHandle className="w-1 bg-[#3e3e42]" />

        {/* Right Panel - Knowledge Libraries (25%) */}
        <ResizablePanel defaultSize={25} minSize={20} maxSize={35}>
          <KnowledgeLibraryRepository organizationId={session.organizationId} />
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}
```

---

## 6. Testing Checklist

### Unit Tests

- [ ] `password.test.ts` - Hash and verify functions
- [ ] `rate-limit.test.ts` - Attempt tracking and lockout
- [ ] `session.test.ts` - Token generation and hashing
- [ ] `library-types.test.ts` - Constants validation

### Integration Tests

- [ ] `login.test.ts` - Full login flow
- [ ] `register.test.ts` - Registration with org creation
- [ ] `library-upload.test.ts` - Document upload to libraries
- [ ] `project-list.test.ts` - Project listing and navigation

### E2E Tests

- [ ] Unauthenticated redirect to login
- [ ] Login → landing page → project navigation
- [ ] Library document upload via drag-drop
- [ ] Profile update persistence

---

## 7. Common Workflows

### New User Registration Flow

```
1. User visits /register
2. Submits email, password, display name
3. Backend:
   a. Validates input
   b. Hashes password
   c. Creates organization (auto-named)
   d. Creates user linked to organization
   e. Creates session
   f. Creates 6 empty knowledge libraries
   g. Sets session cookie
4. Redirect to / (landing page)
```

### Login Flow

```
1. User visits /login
2. Submits email, password
3. Backend:
   a. Checks rate limit for email
   b. Finds user by email
   c. Verifies password hash
   d. Clears rate limit attempts
   e. Creates session
   f. Sets session cookie
4. Redirect to / or ?redirect param
```

### Library Document Upload

```
1. User drags files to library tile
2. Frontend:
   a. Validates file types
   b. Shows upload progress
3. POST /api/libraries/[type]/documents
4. Backend:
   a. Validates session
   b. Stores files (FileAsset)
   c. Creates LibraryDocument records
   d. Updates library documentCount
5. Returns uploaded document IDs
6. UI refreshes document list
```

---

## 8. Dependencies

Add to `package.json`:

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

Install:

```bash
npm install bcryptjs
npm install -D @types/bcryptjs
```
