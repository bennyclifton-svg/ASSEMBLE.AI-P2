# Data Model: Evaluation Non-Price

**Feature**: 013-evaluation-non-price
**Created**: 2025-12-13
**Status**: Draft

## Overview

This document defines the database schema for the Evaluation Non-Price feature. The design extends the existing evaluation schema (Feature 011) with new tables for qualitative criteria assessment.

## Entity Relationship Diagram

```
┌─────────────────────┐
│    evaluations      │ (existing - Feature 011)
│─────────────────────│
│ id                  │
│ projectId           │
│ disciplineId        │
│ tradeId             │
└─────────┬───────────┘
          │
          │ 1:7 (fixed 7 criteria per evaluation)
          ▼
┌─────────────────────────────┐
│ evaluation_non_price_criteria│ (NEW)
│─────────────────────────────│
│ id (PK)                     │
│ evaluationId (FK)           │
│ criteriaKey (enum)          │
│ criteriaLabel               │
│ orderIndex                  │
└─────────┬───────────────────┘
          │
          │ 1:N (one cell per firm)
          ▼
┌─────────────────────────────┐
│ evaluation_non_price_cells  │ (NEW)
│─────────────────────────────│
│ id (PK)                     │
│ criteriaId (FK)             │
│ firmId                      │
│ firmType                    │
│ extractedContent            │
│ qualityRating               │
│ userEditedContent           │
│ userEditedRating            │
│ source                      │
│ confidence                  │
│ sourceChunks                │
│ sourceSubmissionId (FK)     │
└─────────────────────────────┘
          │
          │ N:1 (optional audit trail link)
          ▼
┌─────────────────────┐
│ tender_submissions  │ (existing - Feature 011)
│─────────────────────│
│ id                  │
│ evaluationId        │
│ firmId, firmType    │
│ filename            │
│ parsedAt            │
│ rawExtractedItems   │
└─────────────────────┘
```

## Table Definitions

### evaluation_non_price_criteria

Stores the 7 fixed evaluation criteria for each evaluation context.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | TEXT | PRIMARY KEY | UUID identifier |
| `evaluationId` | TEXT | FK → evaluations.id, CASCADE DELETE | Parent evaluation |
| `criteriaKey` | TEXT | NOT NULL, ENUM | One of: methodology, program, personnel, experience, health_safety, insurance, departures |
| `criteriaLabel` | TEXT | NOT NULL | Display label (e.g., "Methodology", "Health & Safety") |
| `orderIndex` | INTEGER | NOT NULL | Display order (0-6) |
| `createdAt` | TEXT | DEFAULT CURRENT_TIMESTAMP | Creation timestamp |

**Indexes:**
- `idx_non_price_criteria_evaluation` on `evaluationId`
- UNIQUE constraint on `(evaluationId, criteriaKey)`

**Notes:**
- Auto-created when evaluation is first accessed on NON-PRICE tab
- Fixed 7 criteria per evaluation (not user-configurable)
- Order is fixed: Methodology(0), Program(1), Personnel(2), Experience(3), Health & Safety(4), Insurance(5), Departures(6)

### evaluation_non_price_cells

Stores content and ratings for each criterion-firm combination.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | TEXT | PRIMARY KEY | UUID identifier |
| `criteriaId` | TEXT | FK → evaluation_non_price_criteria.id, CASCADE DELETE | Parent criterion |
| `firmId` | TEXT | NOT NULL | ID of consultant or contractor |
| `firmType` | TEXT | NOT NULL, ENUM | 'consultant' or 'contractor' |
| `extractedContent` | TEXT | NULLABLE | AI-extracted text passage |
| `qualityRating` | TEXT | NULLABLE, ENUM | AI-assigned rating: 'good', 'average', 'poor' |
| `userEditedContent` | TEXT | NULLABLE | User override of extracted content |
| `userEditedRating` | TEXT | NULLABLE, ENUM | User override of rating: 'good', 'average', 'poor' |
| `source` | TEXT | NOT NULL, DEFAULT 'manual' | Content origin: 'manual' or 'ai' |
| `confidence` | INTEGER | NULLABLE | AI confidence score 0-100 |
| `sourceChunks` | TEXT | NULLABLE | JSON array of source document chunk IDs |
| `sourceSubmissionId` | TEXT | FK → tender_submissions.id, NULLABLE | Link to parse session |
| `createdAt` | TEXT | DEFAULT CURRENT_TIMESTAMP | Creation timestamp |
| `updatedAt` | TEXT | DEFAULT CURRENT_TIMESTAMP | Last update timestamp |

**Indexes:**
- `idx_non_price_cells_criteria` on `criteriaId`
- `idx_non_price_cells_firm` on `(firmId, firmType)`
- UNIQUE constraint on `(criteriaId, firmId, firmType)`

**Notes:**
- Content precedence: `userEditedContent` > `extractedContent` for display
- Rating precedence: `userEditedRating` > `qualityRating` for display
- `sourceChunks` enables traceability to source document sections

## Criteria Key Enum

```typescript
export const NON_PRICE_CRITERIA_KEYS = [
    'methodology',
    'program',
    'personnel',
    'experience',
    'health_safety',
    'insurance',
    'departures',
] as const;

export type NonPriceCriteriaKey = typeof NON_PRICE_CRITERIA_KEYS[number];
```

## Quality Rating Enum

```typescript
export const QUALITY_RATINGS = ['good', 'average', 'poor'] as const;

export type QualityRating = typeof QUALITY_RATINGS[number];
```

## Drizzle Schema Definition

```typescript
// File: src/lib/db/schema.ts (additions)

import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';
import { evaluations, tenderSubmissions } from './schema';

// Non-Price Criteria (7 fixed rows per evaluation)
export const evaluationNonPriceCriteria = sqliteTable('evaluation_non_price_criteria', {
    id: text('id').primaryKey(),
    evaluationId: text('evaluation_id')
        .references(() => evaluations.id, { onDelete: 'cascade' })
        .notNull(),
    criteriaKey: text('criteria_key', {
        enum: ['methodology', 'program', 'personnel', 'experience', 'health_safety', 'insurance', 'departures']
    }).notNull(),
    criteriaLabel: text('criteria_label').notNull(),
    orderIndex: integer('order_index').notNull(),
    createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
});

// Non-Price Cells (one per criterion per firm)
export const evaluationNonPriceCells = sqliteTable('evaluation_non_price_cells', {
    id: text('id').primaryKey(),
    criteriaId: text('criteria_id')
        .references(() => evaluationNonPriceCriteria.id, { onDelete: 'cascade' })
        .notNull(),
    firmId: text('firm_id').notNull(),
    firmType: text('firm_type', { enum: ['consultant', 'contractor'] }).notNull(),
    // AI-extracted content
    extractedContent: text('extracted_content'),
    qualityRating: text('quality_rating', { enum: ['good', 'average', 'poor'] }),
    // User overrides
    userEditedContent: text('user_edited_content'),
    userEditedRating: text('user_edited_rating', { enum: ['good', 'average', 'poor'] }),
    // Metadata
    source: text('source', { enum: ['manual', 'ai'] }).default('manual'),
    confidence: integer('confidence'), // 0-100
    sourceChunks: text('source_chunks'), // JSON array
    sourceSubmissionId: text('source_submission_id').references(() => tenderSubmissions.id),
    createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text('updated_at').default(sql`CURRENT_TIMESTAMP`),
});

// Relations
export const evaluationNonPriceCriteriaRelations = relations(evaluationNonPriceCriteria, ({ one, many }) => ({
    evaluation: one(evaluations, {
        fields: [evaluationNonPriceCriteria.evaluationId],
        references: [evaluations.id],
    }),
    cells: many(evaluationNonPriceCells),
}));

export const evaluationNonPriceCellsRelations = relations(evaluationNonPriceCells, ({ one }) => ({
    criteria: one(evaluationNonPriceCriteria, {
        fields: [evaluationNonPriceCells.criteriaId],
        references: [evaluationNonPriceCriteria.id],
    }),
    tenderSubmission: one(tenderSubmissions, {
        fields: [evaluationNonPriceCells.sourceSubmissionId],
        references: [tenderSubmissions.id],
    }),
}));
```

## Migration Script

```sql
-- File: drizzle/0024_non_price_evaluation.sql

-- Non-Price Criteria table
CREATE TABLE IF NOT EXISTS evaluation_non_price_criteria (
    id TEXT PRIMARY KEY,
    evaluation_id TEXT NOT NULL REFERENCES evaluations(id) ON DELETE CASCADE,
    criteria_key TEXT NOT NULL CHECK (criteria_key IN ('methodology', 'program', 'personnel', 'experience', 'health_safety', 'insurance', 'departures')),
    criteria_label TEXT NOT NULL,
    order_index INTEGER NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (evaluation_id, criteria_key)
);

CREATE INDEX IF NOT EXISTS idx_non_price_criteria_evaluation ON evaluation_non_price_criteria(evaluation_id);

-- Non-Price Cells table
CREATE TABLE IF NOT EXISTS evaluation_non_price_cells (
    id TEXT PRIMARY KEY,
    criteria_id TEXT NOT NULL REFERENCES evaluation_non_price_criteria(id) ON DELETE CASCADE,
    firm_id TEXT NOT NULL,
    firm_type TEXT NOT NULL CHECK (firm_type IN ('consultant', 'contractor')),
    extracted_content TEXT,
    quality_rating TEXT CHECK (quality_rating IN ('good', 'average', 'poor')),
    user_edited_content TEXT,
    user_edited_rating TEXT CHECK (user_edited_rating IN ('good', 'average', 'poor')),
    source TEXT NOT NULL DEFAULT 'manual' CHECK (source IN ('manual', 'ai')),
    confidence INTEGER CHECK (confidence >= 0 AND confidence <= 100),
    source_chunks TEXT,
    source_submission_id TEXT REFERENCES tender_submissions(id),
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (criteria_id, firm_id, firm_type)
);

CREATE INDEX IF NOT EXISTS idx_non_price_cells_criteria ON evaluation_non_price_cells(criteria_id);
CREATE INDEX IF NOT EXISTS idx_non_price_cells_firm ON evaluation_non_price_cells(firm_id, firm_type);
```

## TypeScript Types

```typescript
// File: src/types/evaluation.ts (additions)

export type NonPriceCriteriaKey =
    | 'methodology'
    | 'program'
    | 'personnel'
    | 'experience'
    | 'health_safety'
    | 'insurance'
    | 'departures';

export type QualityRating = 'good' | 'average' | 'poor';

export interface NonPriceCriteriaDefinition {
    key: NonPriceCriteriaKey;
    label: string;
    description: string;
    searchQuery: string; // For semantic search
}

export interface EvaluationNonPriceCriteria {
    id: string;
    evaluationId: string;
    criteriaKey: NonPriceCriteriaKey;
    criteriaLabel: string;
    orderIndex: number;
    createdAt: string;
}

export interface EvaluationNonPriceCell {
    id: string;
    criteriaId: string;
    firmId: string;
    firmType: 'consultant' | 'contractor';
    // AI content
    extractedContent: string | null;
    qualityRating: QualityRating | null;
    // User overrides
    userEditedContent: string | null;
    userEditedRating: QualityRating | null;
    // Metadata
    source: 'manual' | 'ai';
    confidence: number | null;
    sourceChunks: string[] | null; // Parsed from JSON
    sourceSubmissionId: string | null;
    createdAt: string;
    updatedAt: string;
}

export interface NonPriceExtractionResult {
    criteriaKey: NonPriceCriteriaKey;
    summary: string;
    rating: QualityRating;
    confidence: number;
    keyPoints: string[];
    sourceChunks: string[];
}

export interface NonPriceEvaluationData {
    evaluation: Evaluation;
    criteria: EvaluationNonPriceCriteria[];
    cells: EvaluationNonPriceCell[];
    firms: EvaluationFirm[];
}
```

## Default Criteria Configuration

```typescript
// File: src/lib/constants/non-price-criteria.ts

export const NON_PRICE_CRITERIA: NonPriceCriteriaDefinition[] = [
    {
        key: 'methodology',
        label: 'Methodology',
        description: 'Approach to delivering the work',
        searchQuery: 'methodology approach deliver work execution plan implementation strategy',
    },
    {
        key: 'program',
        label: 'Program',
        description: 'Schedule, timeline, milestones',
        searchQuery: 'program schedule timeline milestones key dates delivery phases duration',
    },
    {
        key: 'personnel',
        label: 'Personnel',
        description: 'Key staff, qualifications, team structure',
        searchQuery: 'personnel key staff team qualifications experience CVs project manager',
    },
    {
        key: 'experience',
        label: 'Experience',
        description: 'Relevant project history',
        searchQuery: 'experience similar projects portfolio track record references case studies',
    },
    {
        key: 'health_safety',
        label: 'Health & Safety',
        description: 'Safety policies, certifications',
        searchQuery: 'health safety WHS OH&S certification policies safe work method statement',
    },
    {
        key: 'insurance',
        label: 'Insurance',
        description: 'Coverage types, limits',
        searchQuery: 'insurance public liability professional indemnity workers compensation coverage',
    },
    {
        key: 'departures',
        label: 'Departures',
        description: 'Significant deviations from tender requirements',
        searchQuery: 'departures deviations exclusions qualifications conditions amendments variations',
    },
];
```

## Data Flow

### Read Flow (GET)

1. Fetch evaluation by projectId + contextType + contextId
2. If criteria don't exist, auto-create 7 criteria rows
3. Fetch all cells for the evaluation's criteria
4. Return structured data with criteria and cells per firm

### Write Flow (PUT - Manual Edit)

1. Find or create cell for (criteriaId, firmId, firmType)
2. Update `userEditedContent` and/or `userEditedRating`
3. Set `source` = 'manual' if no AI content exists
4. Update `updatedAt` timestamp

### Parse Flow (POST - AI Extraction)

1. Parse tender PDF → text chunks
2. For each criterion:
   - Embed criterion search query
   - Find top matching chunks via cosine similarity
   - Rerank candidates
   - Send top chunks to Claude for summarization
   - Receive summary + rating + confidence
3. For each criterion result:
   - Find or create cell for (criteriaId, firmId, firmType)
   - Set `extractedContent`, `qualityRating`, `confidence`, `sourceChunks`
   - Set `source` = 'ai'
   - Do NOT overwrite `userEditedContent` / `userEditedRating` if they exist
4. Create tender_submissions audit record

## Display Logic

```typescript
// Helper to get displayed content/rating (user edits take precedence)

function getDisplayContent(cell: EvaluationNonPriceCell): string | null {
    return cell.userEditedContent ?? cell.extractedContent;
}

function getDisplayRating(cell: EvaluationNonPriceCell): QualityRating | null {
    return cell.userEditedRating ?? cell.qualityRating;
}

function isUserEdited(cell: EvaluationNonPriceCell): boolean {
    return cell.userEditedContent !== null || cell.userEditedRating !== null;
}

function isAIGenerated(cell: EvaluationNonPriceCell): boolean {
    return cell.source === 'ai' && cell.extractedContent !== null;
}

function isLowConfidence(cell: EvaluationNonPriceCell): boolean {
    return cell.confidence !== null && cell.confidence < 70;
}
```
