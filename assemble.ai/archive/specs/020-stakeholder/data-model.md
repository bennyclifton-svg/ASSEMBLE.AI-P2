# Data Model: Unified Stakeholder System

**Feature**: 020-stakeholder
**Version**: 1.0
**Created**: 2026-01-21

---

## Entity Relationship Diagram

```
┌─────────────────┐     ┌────────────────────────┐     ┌──────────────────────────┐
│    projects     │1───*│  project_stakeholders  │*───1│       companies          │
└─────────────────┘     └────────────────────────┘     └──────────────────────────┘
                                    │
                                    │ 1
                                    │
                       ┌────────────┴────────────┐
                       │                         │
                       ▼                         ▼
        ┌──────────────────────────┐  ┌─────────────────────────────┐
        │ stakeholder_tender_status│  │ stakeholder_submission_status│
        │ (Consultant/Contractor)  │  │      (Authority only)        │
        └──────────────────────────┘  └─────────────────────────────┘
```

---

## Tables

### 1. project_stakeholders

Main unified stakeholder table replacing separate consultant/contractor lists.

```sql
CREATE TABLE project_stakeholders (
  -- Primary Key
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),

  -- Foreign Keys
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  company_id TEXT REFERENCES companies(id) ON DELETE SET NULL,

  -- Classification
  stakeholder_group TEXT NOT NULL CHECK (stakeholder_group IN ('client', 'authority', 'consultant', 'contractor')),

  -- Core Fields
  name TEXT NOT NULL,                    -- Display name (discipline/trade name for Consultant/Contractor)
  role TEXT,                             -- Role for Client, submission type for Authority
  organization TEXT,                     -- Organization/firm name

  -- Contact Info
  contact_name TEXT,                     -- Primary contact person
  contact_email TEXT,
  contact_phone TEXT,

  -- Group-Specific: Consultant/Contractor
  discipline_or_trade TEXT,              -- Normalized discipline/trade identifier
  is_enabled BOOLEAN DEFAULT TRUE,       -- Active in current tender
  brief_services TEXT,                   -- Scope of services (Consultant)
  brief_fee TEXT,                        -- Fee basis (Consultant)
  brief_program TEXT,                    -- Program requirements (Consultant)
  scope_works TEXT,                      -- Scope of works (Contractor)
  scope_price TEXT,                      -- Price basis (Contractor)
  scope_program TEXT,                    -- Program requirements (Contractor)

  -- Group-Specific: Authority
  submission_ref TEXT,                   -- Reference number for submissions
  submission_type TEXT,                  -- DA, CC, BA, etc.

  -- Metadata
  sort_order INTEGER DEFAULT 0,
  notes TEXT,

  -- Timestamps
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  deleted_at TEXT                        -- Soft delete
);

-- Indexes
CREATE INDEX idx_stakeholders_project ON project_stakeholders(project_id);
CREATE INDEX idx_stakeholders_group ON project_stakeholders(project_id, stakeholder_group);
CREATE INDEX idx_stakeholders_company ON project_stakeholders(company_id);
CREATE INDEX idx_stakeholders_active ON project_stakeholders(project_id, is_enabled) WHERE deleted_at IS NULL;
```

### 2. stakeholder_tender_statuses

Tracks 4-stage tender process for Consultant and Contractor groups.

```sql
CREATE TABLE stakeholder_tender_statuses (
  -- Primary Key
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),

  -- Foreign Key
  stakeholder_id TEXT NOT NULL REFERENCES project_stakeholders(id) ON DELETE CASCADE,

  -- Status Type
  status_type TEXT NOT NULL CHECK (status_type IN ('brief', 'tender', 'rec', 'award')),

  -- State
  is_active BOOLEAN DEFAULT FALSE,       -- Currently at this stage
  is_complete BOOLEAN DEFAULT FALSE,     -- Stage completed
  completed_at TEXT,

  -- Timestamps
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),

  -- Unique constraint: one record per stakeholder per status type
  UNIQUE(stakeholder_id, status_type)
);

-- Index for status queries
CREATE INDEX idx_tender_statuses_stakeholder ON stakeholder_tender_statuses(stakeholder_id);
CREATE INDEX idx_tender_statuses_type ON stakeholder_tender_statuses(status_type, is_active);
```

### 3. stakeholder_submission_statuses

Tracks approval workflow for Authority stakeholders.

```sql
CREATE TABLE stakeholder_submission_statuses (
  -- Primary Key
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),

  -- Foreign Key
  stakeholder_id TEXT NOT NULL REFERENCES project_stakeholders(id) ON DELETE CASCADE,

  -- Status
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'submitted', 'approved', 'rejected', 'withdrawn')),

  -- Submission Details
  submitted_at TEXT,
  submission_ref TEXT,                   -- External reference number
  response_due TEXT,                     -- Expected response date

  -- Response
  response_received_at TEXT,
  response_notes TEXT,

  -- Conditions (for conditional approvals)
  conditions TEXT,                       -- JSON array of conditions
  conditions_cleared BOOLEAN DEFAULT FALSE,

  -- Timestamps
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),

  -- One status record per Authority stakeholder
  UNIQUE(stakeholder_id)
);

-- Index
CREATE INDEX idx_submission_statuses_stakeholder ON stakeholder_submission_statuses(stakeholder_id);
CREATE INDEX idx_submission_statuses_status ON stakeholder_submission_statuses(status);
```

---

## Drizzle Schema (SQLite)

```typescript
// src/lib/db/stakeholder-schema.ts

import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
import { projects } from './schema';

// ============================================
// Stakeholder Group Enum
// ============================================

export const stakeholderGroupEnum = ['client', 'authority', 'consultant', 'contractor'] as const;
export type StakeholderGroup = typeof stakeholderGroupEnum[number];

// ============================================
// Project Stakeholders
// ============================================

export const projectStakeholders = sqliteTable('project_stakeholders', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  projectId: text('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  companyId: text('company_id').references(() => companies.id, { onDelete: 'set null' }),

  // Classification
  stakeholderGroup: text('stakeholder_group').notNull().$type<StakeholderGroup>(),

  // Core Fields
  name: text('name').notNull(),
  role: text('role'),
  organization: text('organization'),

  // Contact Info
  contactName: text('contact_name'),
  contactEmail: text('contact_email'),
  contactPhone: text('contact_phone'),

  // Consultant/Contractor specific
  disciplineOrTrade: text('discipline_or_trade'),
  isEnabled: integer('is_enabled', { mode: 'boolean' }).default(true),
  briefServices: text('brief_services'),
  briefFee: text('brief_fee'),
  briefProgram: text('brief_program'),
  scopeWorks: text('scope_works'),
  scopePrice: text('scope_price'),
  scopeProgram: text('scope_program'),

  // Authority specific
  submissionRef: text('submission_ref'),
  submissionType: text('submission_type'),

  // Metadata
  sortOrder: integer('sort_order').default(0),
  notes: text('notes'),

  // Timestamps
  createdAt: text('created_at').$defaultFn(() => new Date().toISOString()),
  updatedAt: text('updated_at').$defaultFn(() => new Date().toISOString()),
  deletedAt: text('deleted_at'),
});

// ============================================
// Tender Status Enum
// ============================================

export const tenderStatusTypeEnum = ['brief', 'tender', 'rec', 'award'] as const;
export type TenderStatusType = typeof tenderStatusTypeEnum[number];

// ============================================
// Stakeholder Tender Statuses
// ============================================

export const stakeholderTenderStatuses = sqliteTable('stakeholder_tender_statuses', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  stakeholderId: text('stakeholder_id').notNull().references(() => projectStakeholders.id, { onDelete: 'cascade' }),

  statusType: text('status_type').notNull().$type<TenderStatusType>(),
  isActive: integer('is_active', { mode: 'boolean' }).default(false),
  isComplete: integer('is_complete', { mode: 'boolean' }).default(false),
  completedAt: text('completed_at'),

  createdAt: text('created_at').$defaultFn(() => new Date().toISOString()),
  updatedAt: text('updated_at').$defaultFn(() => new Date().toISOString()),
});

// ============================================
// Submission Status Enum
// ============================================

export const submissionStatusEnum = ['pending', 'submitted', 'approved', 'rejected', 'withdrawn'] as const;
export type SubmissionStatus = typeof submissionStatusEnum[number];

// ============================================
// Stakeholder Submission Statuses
// ============================================

export const stakeholderSubmissionStatuses = sqliteTable('stakeholder_submission_statuses', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  stakeholderId: text('stakeholder_id').notNull().references(() => projectStakeholders.id, { onDelete: 'cascade' }),

  status: text('status').notNull().$type<SubmissionStatus>().default('pending'),

  submittedAt: text('submitted_at'),
  submissionRef: text('submission_ref'),
  responseDue: text('response_due'),

  responseReceivedAt: text('response_received_at'),
  responseNotes: text('response_notes'),

  conditions: text('conditions'), // JSON array
  conditionsCleared: integer('conditions_cleared', { mode: 'boolean' }).default(false),

  createdAt: text('created_at').$defaultFn(() => new Date().toISOString()),
  updatedAt: text('updated_at').$defaultFn(() => new Date().toISOString()),
});
```

---

## TypeScript Interfaces

```typescript
// src/types/stakeholder.ts

export type StakeholderGroup = 'client' | 'authority' | 'consultant' | 'contractor';
export type TenderStatusType = 'brief' | 'tender' | 'rec' | 'award';
export type SubmissionStatus = 'pending' | 'submitted' | 'approved' | 'rejected' | 'withdrawn';

// ============================================
// Core Stakeholder Types
// ============================================

export interface Stakeholder {
  id: string;
  projectId: string;
  companyId?: string;
  stakeholderGroup: StakeholderGroup;

  // Core
  name: string;
  role?: string;
  organization?: string;

  // Contact
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;

  // Consultant/Contractor
  disciplineOrTrade?: string;
  isEnabled: boolean;
  briefServices?: string;
  briefFee?: string;
  briefProgram?: string;
  scopeWorks?: string;
  scopePrice?: string;
  scopeProgram?: string;

  // Authority
  submissionRef?: string;
  submissionType?: string;

  // Metadata
  sortOrder: number;
  notes?: string;

  // Timestamps
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
}

// ============================================
// Status Types
// ============================================

export interface TenderStatus {
  id: string;
  stakeholderId: string;
  statusType: TenderStatusType;
  isActive: boolean;
  isComplete: boolean;
  completedAt?: string;
}

export interface SubmissionStatusRecord {
  id: string;
  stakeholderId: string;
  status: SubmissionStatus;
  submittedAt?: string;
  submissionRef?: string;
  responseDue?: string;
  responseReceivedAt?: string;
  responseNotes?: string;
  conditions?: string[];
  conditionsCleared: boolean;
}

// ============================================
// Combined View Types
// ============================================

export interface StakeholderWithTenderStatus extends Stakeholder {
  tenderStatuses: TenderStatus[];
}

export interface StakeholderWithSubmissionStatus extends Stakeholder {
  submissionStatus?: SubmissionStatusRecord;
}

// Union type for stakeholders with their appropriate status
export type StakeholderWithStatus =
  | (Stakeholder & { stakeholderGroup: 'client' })
  | (StakeholderWithSubmissionStatus & { stakeholderGroup: 'authority' })
  | (StakeholderWithTenderStatus & { stakeholderGroup: 'consultant' | 'contractor' });

// ============================================
// API Request/Response Types
// ============================================

export interface CreateStakeholderRequest {
  stakeholderGroup: StakeholderGroup;
  name: string;
  role?: string;
  organization?: string;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  disciplineOrTrade?: string;
  isEnabled?: boolean;
  notes?: string;
}

export interface UpdateStakeholderRequest {
  name?: string;
  role?: string;
  organization?: string;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  isEnabled?: boolean;
  briefServices?: string;
  briefFee?: string;
  briefProgram?: string;
  scopeWorks?: string;
  scopePrice?: string;
  scopeProgram?: string;
  notes?: string;
}

export interface UpdateTenderStatusRequest {
  statusType: TenderStatusType;
  isActive?: boolean;
  isComplete?: boolean;
}

export interface UpdateSubmissionStatusRequest {
  status: SubmissionStatus;
  submissionRef?: string;
  responseDue?: string;
  responseNotes?: string;
  conditions?: string[];
  conditionsCleared?: boolean;
}

// ============================================
// Generation Types
// ============================================

export interface GenerateStakeholdersRequest {
  groups?: StakeholderGroup[]; // Which groups to generate (default: all)
  includeAuthorities?: boolean; // Include regulatory authorities
  includeContractors?: boolean; // Include default trades
}

export interface GeneratedStakeholder {
  stakeholderGroup: StakeholderGroup;
  name: string;
  role?: string;
  disciplineOrTrade?: string;
  reason: string; // Why this stakeholder was suggested
}

export interface GenerateStakeholdersResponse {
  generated: GeneratedStakeholder[];
  profileContext: {
    buildingClass: string;
    projectType: string;
    subclass: string[];
    complexityScore: number;
  };
}
```

---

## Validation Rules

### project_stakeholders

| Field | Rule | Error Message |
|-------|------|---------------|
| name | Required, 1-200 chars | "Stakeholder name is required" |
| stakeholderGroup | Must be valid enum | "Invalid stakeholder group" |
| contactEmail | Valid email if provided | "Invalid email format" |
| contactPhone | Valid phone if provided | "Invalid phone format" |
| sortOrder | Integer >= 0 | "Sort order must be non-negative" |

### stakeholder_tender_statuses

| Field | Rule | Error Message |
|-------|------|---------------|
| statusType | Must be valid enum | "Invalid tender status type" |
| stakeholderId | Must exist | "Stakeholder not found" |
| isComplete | isActive must be false when complete | "Cannot be active and complete" |

### stakeholder_submission_statuses

| Field | Rule | Error Message |
|-------|------|---------------|
| status | Must be valid enum | "Invalid submission status" |
| responseDue | Valid date string | "Invalid date format" |
| conditions | Valid JSON array | "Invalid conditions format" |

---

## State Transitions

### Tender Status Flow

```
┌────────────┐    ┌────────────┐    ┌────────────┐    ┌────────────┐
│   Brief    │───▶│   Tender   │───▶│    Rec     │───▶│   Award    │
│  (Stage 1) │    │  (Stage 2) │    │  (Stage 3) │    │  (Stage 4) │
└────────────┘    └────────────┘    └────────────┘    └────────────┘

States per stage:
- inactive (not started)
- active (in progress)
- complete (finished)

Rules:
- Only one stage can be active at a time
- Stages must complete in order (no skipping)
- Award completion triggers Cost Plan integration prompt
```

### Submission Status Flow

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   Pending   │───▶│  Submitted  │───▶│  Approved   │
└─────────────┘    └─────────────┘    │  Rejected   │
                          │           │  Withdrawn  │
                          ▼           └─────────────┘
                   (can return to
                    Pending if
                    resubmission
                    required)
```

---

## Relationships

| From | To | Cardinality | Description |
|------|-----|-------------|-------------|
| projects | project_stakeholders | 1:N | Project has many stakeholders |
| project_stakeholders | companies | N:1 | Stakeholder may link to company |
| project_stakeholders | stakeholder_tender_statuses | 1:4 | One status per stage |
| project_stakeholders | stakeholder_submission_statuses | 1:1 | One submission status |

---

## Migration from Legacy Tables

### consultantDisciplines → project_stakeholders

```sql
INSERT INTO project_stakeholders (
  id, project_id, stakeholder_group, name, discipline_or_trade,
  is_enabled, brief_services, brief_fee, brief_program, sort_order
)
SELECT
  id, project_id, 'consultant', discipline_name, discipline_name,
  is_enabled, brief_services, brief_fee, brief_program,
  ROW_NUMBER() OVER (ORDER BY discipline_name)
FROM consultant_disciplines;
```

### contractorTrades → project_stakeholders

```sql
INSERT INTO project_stakeholders (
  id, project_id, stakeholder_group, name, discipline_or_trade,
  is_enabled, scope_works, scope_price, scope_program, sort_order
)
SELECT
  id, project_id, 'contractor', trade_name, trade_name,
  is_enabled, scope_works, scope_price, scope_program,
  ROW_NUMBER() OVER (ORDER BY "order")
FROM contractor_trades;
```

### stakeholders → project_stakeholders

```sql
INSERT INTO project_stakeholders (
  id, project_id, stakeholder_group, name, role, organization,
  contact_email, contact_phone, sort_order
)
SELECT
  id, project_id, 'client', name, role, organization,
  email, phone, "order"
FROM stakeholders;
```
