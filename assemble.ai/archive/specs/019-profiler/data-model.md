# Data Model: Profiler Module

**Phase 1 Output** | **Date**: 2026-01-21

---

## 1. Entity Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           PROFILER DATA MODEL                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────────┐         ┌───────────────────┐                             │
│  │   projects   │ 1 ──── 1│  projectProfiles  │                             │
│  │   (existing) │         │       (new)       │                             │
│  └──────────────┘         └───────────────────┘                             │
│         │                          │                                         │
│         │ 1                        │ 1                                       │
│         │                          ▼                                         │
│         │                 ┌────────────────────┐                             │
│         └─────────────────│ profilerObjectives │                             │
│                     1 ─── │       (new)        │                             │
│                           └────────────────────┘                             │
│                                                                              │
│                           ┌────────────────────┐                             │
│                           │  profilePatterns   │  (AI Learning - Aggregate) │
│                           │       (new)        │                             │
│                           └────────────────────┘                             │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Entity: projectProfiles

**Purpose**: Stores the project profile selection (Class/Type/Subclass/Scale/Complexity)

### 2.1 Schema Definition

```typescript
// Drizzle schema - src/lib/db/pg-schema.ts

import { pgTable, text, jsonb, timestamp, index, uniqueIndex } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { projects } from './schema';

export const projectProfiles = pgTable('project_profiles', {
  id: text('id').primaryKey().$defaultFn(() => `prof_${nanoid()}`),
  projectId: text('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),

  // Core selections
  buildingClass: text('building_class').notNull(),
  projectType: text('project_type').notNull(),
  subclass: jsonb('subclass').notNull().$type<string[]>().default([]),
  subclassOther: text('subclass_other').array(),

  // Profile data
  scaleData: jsonb('scale_data').notNull().$type<Record<string, number>>().default({}),
  complexity: jsonb('complexity').notNull().$type<Record<string, string>>().default({}),

  // Metadata
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  projectIdIdx: uniqueIndex('project_profiles_project_id_idx').on(table.projectId),
  classTypeIdx: index('project_profiles_class_type_idx').on(table.buildingClass, table.projectType),
  subclassIdx: index('project_profiles_subclass_idx').using('gin', table.subclass),
}));

export const projectProfilesRelations = relations(projectProfiles, ({ one }) => ({
  project: one(projects, {
    fields: [projectProfiles.projectId],
    references: [projects.id],
  }),
}));
```

### 2.2 Field Specifications

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `id` | TEXT | Yes | Auto-generated `prof_` prefix |
| `projectId` | TEXT | Yes | Must exist in projects table |
| `buildingClass` | TEXT | Yes | Enum: residential, commercial, industrial, institution, mixed, infrastructure |
| `projectType` | TEXT | Yes | Enum: refurb, extend, new, remediation, advisory |
| `subclass` | JSONB | Yes | Array of strings, min 1 item |
| `subclassOther` | TEXT[] | No | Free text when "other" selected |
| `scaleData` | JSONB | Yes | Object with numeric values |
| `complexity` | JSONB | Yes | Object with dimension selections |
| `createdAt` | TIMESTAMP | Yes | Auto-set on create |
| `updatedAt` | TIMESTAMP | Yes | Auto-set on create/update |

### 2.3 Enum Values

```typescript
// Building Class options
export const BUILDING_CLASSES = [
  'residential',
  'commercial',
  'industrial',
  'institution',
  'mixed',
  'infrastructure'
] as const;

// Project Type options
export const PROJECT_TYPES = [
  'refurb',
  'extend',
  'new',
  'remediation',
  'advisory'
] as const;

// Complexity dimensions vary by class - see profile-templates.json
```

### 2.4 Example Data

```json
{
  "id": "prof_abc123xyz",
  "projectId": "proj_xyz789",
  "buildingClass": "residential",
  "projectType": "new",
  "subclass": ["aged_care_9c"],
  "subclassOther": null,
  "scaleData": {
    "beds": 120,
    "dementia_beds": 30,
    "gfa_sqm": 8400,
    "gfa_per_bed": 70,
    "households": 8,
    "beds_per_household": 15
  },
  "complexity": {
    "care_level": "mixed",
    "accommodation_model": "household",
    "dementia_design": "secure_wing",
    "clinical_facilities": "allied_health",
    "back_of_house": "central_kitchen"
  },
  "createdAt": "2026-01-21T10:30:00Z",
  "updatedAt": "2026-01-21T10:30:00Z"
}
```

---

## 3. Entity: profilerObjectives

**Purpose**: Stores AI-generated and user-edited objectives with source tracking

### 3.1 Schema Definition

```typescript
// Drizzle schema - src/lib/db/pg-schema.ts

export const profilerObjectives = pgTable('profiler_objectives', {
  id: text('id').primaryKey().$defaultFn(() => `obj_${nanoid()}`),
  projectId: text('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),

  // Objectives content with source tracking
  functionalQuality: jsonb('functional_quality').notNull().$type<ObjectiveContent>(),
  planningCompliance: jsonb('planning_compliance').notNull().$type<ObjectiveContent>(),

  // Context snapshot
  profileContext: jsonb('profile_context').$type<ProfileContext>(),

  // Timestamps
  generatedAt: timestamp('generated_at'),
  polishedAt: timestamp('polished_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  projectIdIdx: uniqueIndex('profiler_objectives_project_id_idx').on(table.projectId),
}));

export const profilerObjectivesRelations = relations(profilerObjectives, ({ one }) => ({
  project: one(projects, {
    fields: [profilerObjectives.projectId],
    references: [projects.id],
  }),
}));
```

### 3.2 TypeScript Types

```typescript
// src/types/profiler.ts

export type ObjectiveSource = 'manual' | 'ai_generated' | 'ai_polished';

export interface ObjectiveContent {
  content: string;
  source: ObjectiveSource;
  originalAi: string | null;
  editHistory: string[] | null;
}

export interface ProfileContext {
  buildingClass: string;
  projectType: string;
  subclass: string[];
  scale: Record<string, number>;
  complexity: Record<string, string>;
}

export interface ProfilerObjectives {
  id: string;
  projectId: string;
  functionalQuality: ObjectiveContent;
  planningCompliance: ObjectiveContent;
  profileContext: ProfileContext | null;
  generatedAt: Date | null;
  polishedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}
```

### 3.3 Example Data

```json
{
  "id": "obj_def456uvw",
  "projectId": "proj_xyz789",
  "functionalQuality": {
    "content": "Deliver a 120-bed residential aged care facility with household model accommodation...",
    "source": "ai_polished",
    "originalAi": "Deliver a residential aged care facility comprising 120 beds...",
    "editHistory": [
      "Added emphasis on dementia design requirements",
      "Specified household model preference"
    ]
  },
  "planningCompliance": {
    "content": "Achieve Development Approval under the standard DA pathway...",
    "source": "ai_generated",
    "originalAi": null,
    "editHistory": null
  },
  "profileContext": {
    "buildingClass": "residential",
    "projectType": "new",
    "subclass": ["aged_care_9c"],
    "scale": { "beds": 120, "dementia_beds": 30 },
    "complexity": { "care_level": "mixed", "accommodation_model": "household" }
  },
  "generatedAt": "2026-01-21T10:31:00Z",
  "polishedAt": "2026-01-21T10:35:00Z",
  "createdAt": "2026-01-21T10:31:00Z",
  "updatedAt": "2026-01-21T10:35:00Z"
}
```

---

## 4. Entity: profilePatterns

**Purpose**: Aggregate, anonymous storage for AI learning patterns

### 4.1 Schema Definition

```typescript
// Drizzle schema - src/lib/db/pg-schema.ts

export const profilePatterns = pgTable('profile_patterns', {
  id: text('id').primaryKey().$defaultFn(() => `pat_${nanoid()}`),

  // Pattern context
  buildingClass: text('building_class').notNull(),
  projectType: text('project_type').notNull(),

  // Pattern data
  patternType: text('pattern_type').notNull(), // 'subclass_other', 'objective_theme', 'polish_edit'
  patternValue: text('pattern_value').notNull(),

  // Aggregation
  occurrenceCount: integer('occurrence_count').default(1).notNull(),
  lastSeen: timestamp('last_seen').defaultNow().notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  uniquePatternIdx: uniqueIndex('profile_patterns_unique_idx')
    .on(table.buildingClass, table.projectType, table.patternType, table.patternValue),
}));
```

### 4.2 Pattern Types

| Type | Description | Example |
|------|-------------|---------|
| `subclass_other` | Custom subclass entries | "Modular Construction", "Passive House" |
| `objective_theme` | Common manual objective themes | "sustainability", "accessibility" |
| `polish_edit` | Frequent polish refinements | "added timeline", "specified budget" |

### 4.3 Example Data

```json
{
  "id": "pat_ghi789rst",
  "buildingClass": "residential",
  "projectType": "new",
  "patternType": "subclass_other",
  "patternValue": "Modular Construction",
  "occurrenceCount": 7,
  "lastSeen": "2026-01-21T10:30:00Z",
  "createdAt": "2026-01-15T08:00:00Z"
}
```

---

## 5. Validation Rules

### 5.1 Profile Validation

```typescript
// src/lib/validation/profile.ts

import { z } from 'zod';
import { BUILDING_CLASSES, PROJECT_TYPES } from './constants';

export const profileSchema = z.object({
  buildingClass: z.enum(BUILDING_CLASSES),
  projectType: z.enum(PROJECT_TYPES),
  subclass: z.array(z.string()).min(1, 'At least one subclass required'),
  subclassOther: z.array(z.string()).optional(),
  scaleData: z.record(z.number().positive()).refine(
    (data) => Object.keys(data).length >= 1,
    'At least one scale metric required'
  ),
  complexity: z.record(z.string()),
});

// Mixed class allows multiple subclasses
export const mixedClassSchema = profileSchema.extend({
  subclass: z.array(z.string()).min(1).max(4, 'Maximum 4 subclasses for Mixed'),
});
```

### 5.2 Objectives Validation

```typescript
// src/lib/validation/objectives.ts

import { z } from 'zod';

export const objectiveContentSchema = z.object({
  content: z.string().min(10, 'Content too short'),
  source: z.enum(['manual', 'ai_generated', 'ai_polished']),
  originalAi: z.string().nullable(),
  editHistory: z.array(z.string()).nullable(),
});

export const objectivesSchema = z.object({
  functionalQuality: objectiveContentSchema,
  planningCompliance: objectiveContentSchema,
});
```

### 5.3 Scale Field Validation Rules

| Field | Min | Max | Notes |
|-------|-----|-----|-------|
| `beds` | 1 | 500 | Aged care beds |
| `dementia_beds` | 0 | beds | Cannot exceed total beds |
| `gfa_sqm` | 50 | 500000 | Square meters |
| `gfa_per_bed` | 30 | 150 | Must be realistic range |
| `units` | 1 | 1000 | Residential units |
| `levels` | 1 | 100 | Storeys |
| `rooms` | 1 | 2000 | Hotel rooms |
| `nla_sqm` | 100 | 200000 | Net lettable area |

---

## 6. State Transitions

### 6.1 Profile States

```
┌─────────────────────────────────────────────────────────────────┐
│                      PROFILE STATE MACHINE                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│   ┌──────────┐    select     ┌───────────────┐                  │
│   │  Empty   │──────────────▶│ Class+Type    │                  │
│   │          │               │   Selected    │                  │
│   └──────────┘               └───────┬───────┘                  │
│                                      │ select                    │
│                                      ▼                           │
│                              ┌───────────────┐                  │
│                              │   Subclass    │                  │
│                              │   Selected    │                  │
│                              └───────┬───────┘                  │
│                                      │ enter                     │
│                                      ▼                           │
│                              ┌───────────────┐                  │
│                              │    Scale      │                  │
│                              │   Entered     │                  │
│                              └───────┬───────┘                  │
│                                      │ select                    │
│                                      ▼                           │
│                              ┌───────────────┐    save          │
│                              │  Complexity   │─────────────▶ DB │
│                              │   Selected    │                  │
│                              └───────────────┘                  │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 6.2 Objectives States

```
┌─────────────────────────────────────────────────────────────────┐
│                    OBJECTIVES STATE MACHINE                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│   ┌──────────┐    [Manual]    ┌───────────────┐                 │
│   │  Empty   │───────────────▶│    Manual     │                 │
│   │          │                │    Entry      │                 │
│   └────┬─────┘                └───────┬───────┘                 │
│        │ [Generate]                   │ save                     │
│        ▼                              ▼                          │
│   ┌──────────────┐    edit    ┌───────────────┐                 │
│   │ AI Generated │────────────▶│    Edited     │                │
│   │              │            │               │                 │
│   └──────────────┘            └───────┬───────┘                 │
│                                       │ [Polish]                 │
│                                       ▼                          │
│                               ┌───────────────┐                 │
│                               │  AI Polished  │                 │
│                               │               │                 │
│                               └───────────────┘                 │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 7. Indexes

| Table | Index | Columns | Type | Purpose |
|-------|-------|---------|------|---------|
| project_profiles | project_id_idx | project_id | UNIQUE | 1:1 with project |
| project_profiles | class_type_idx | building_class, project_type | BTREE | AI learning queries |
| project_profiles | subclass_idx | subclass | GIN | Array contains queries |
| profiler_objectives | project_id_idx | project_id | UNIQUE | 1:1 with project |
| profile_patterns | unique_idx | building_class, project_type, pattern_type, pattern_value | UNIQUE | Upsert on match |

---

## 8. Migration Plan

### 8.1 Migration Script

```sql
-- Migration: 0001_create_profiler_tables.sql

-- 1. Create project_profiles table
CREATE TABLE project_profiles (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  building_class TEXT NOT NULL,
  project_type TEXT NOT NULL,
  subclass JSONB NOT NULL DEFAULT '[]'::jsonb,
  subclass_other TEXT[],
  scale_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  complexity JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL,
  CONSTRAINT project_profiles_project_id_unique UNIQUE (project_id)
);

CREATE INDEX project_profiles_class_type_idx ON project_profiles(building_class, project_type);
CREATE INDEX project_profiles_subclass_idx ON project_profiles USING GIN(subclass);

-- 2. Create profiler_objectives table
CREATE TABLE profiler_objectives (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  functional_quality JSONB NOT NULL,
  planning_compliance JSONB NOT NULL,
  profile_context JSONB,
  generated_at TIMESTAMP,
  polished_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL,
  CONSTRAINT profiler_objectives_project_id_unique UNIQUE (project_id)
);

-- 3. Create profile_patterns table (AI Learning)
CREATE TABLE profile_patterns (
  id TEXT PRIMARY KEY,
  building_class TEXT NOT NULL,
  project_type TEXT NOT NULL,
  pattern_type TEXT NOT NULL,
  pattern_value TEXT NOT NULL,
  occurrence_count INTEGER DEFAULT 1 NOT NULL,
  last_seen TIMESTAMP DEFAULT NOW() NOT NULL,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE UNIQUE INDEX profile_patterns_unique_idx
  ON profile_patterns(building_class, project_type, pattern_type, pattern_value);
```

### 8.2 Rollback Script

```sql
-- Rollback: 0001_create_profiler_tables.sql

DROP TABLE IF EXISTS profile_patterns;
DROP TABLE IF EXISTS profiler_objectives;
DROP TABLE IF EXISTS project_profiles;
```

---

## 9. Query Patterns

### 9.1 Common Queries

```typescript
// Get profile for project
const profile = await db.query.projectProfiles.findFirst({
  where: eq(projectProfiles.projectId, projectId),
});

// Get objectives for project
const objectives = await db.query.profilerObjectives.findFirst({
  where: eq(profilerObjectives.projectId, projectId),
});

// Upsert pattern for AI learning
await db.insert(profilePatterns)
  .values({
    id: `pat_${nanoid()}`,
    buildingClass,
    projectType,
    patternType,
    patternValue,
  })
  .onConflictDoUpdate({
    target: [
      profilePatterns.buildingClass,
      profilePatterns.projectType,
      profilePatterns.patternType,
      profilePatterns.patternValue,
    ],
    set: {
      occurrenceCount: sql`${profilePatterns.occurrenceCount} + 1`,
      lastSeen: sql`NOW()`,
    },
  });

// Get popular "other" subclasses for AI suggestions
const popularOthers = await db.query.profilePatterns.findMany({
  where: and(
    eq(profilePatterns.buildingClass, buildingClass),
    eq(profilePatterns.patternType, 'subclass_other'),
  ),
  orderBy: desc(profilePatterns.occurrenceCount),
  limit: 5,
});
```

---

**Phase 1 Data Model Complete** - Proceed to Contracts
