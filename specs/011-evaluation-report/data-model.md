# Data Model: Evaluation Report

**Feature**: 011-evaluation-report
**Date**: 2025-12-12

## Entity Overview

```
┌─────────────────┐     ┌─────────────────────┐     ┌─────────────────────┐
│   evaluations   │────<│  evaluation_rows    │────<│  evaluation_cells   │
│                 │     │                     │     │                     │
│ projectId       │     │ evaluationId        │     │ rowId               │
│ disciplineId?   │     │ tableType           │     │ firmId              │
│ tradeId?        │     │ description         │     │ amountCents         │
│                 │     │ orderIndex          │     │ source              │
│                 │     │ isSystemRow         │     │ confidence          │
└─────────────────┘     └─────────────────────┘     └─────────────────────┘
        │                                                    │
        │                                                    │
        └────────────────────────────────────────────────────┘
                              │
                    ┌─────────┴─────────┐
                    │   consultants /   │
                    │   contractors     │
                    │   (existing)      │
                    └───────────────────┘
```

## Entities

### 1. Evaluation

One evaluation record per discipline/trade per project. Follows the same pattern as `rft_new`.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | TEXT | PK | UUID |
| projectId | TEXT | FK → projects.id, NOT NULL | Parent project |
| disciplineId | TEXT | FK → consultant_disciplines.id, NULL | For consultant evaluation |
| tradeId | TEXT | FK → contractor_trades.id, NULL | For contractor evaluation |
| createdAt | TEXT | DEFAULT CURRENT_TIMESTAMP | Creation timestamp |
| updatedAt | TEXT | DEFAULT CURRENT_TIMESTAMP | Last update timestamp |

**Constraint**: Exactly one of `disciplineId` or `tradeId` must be non-null.

**Drizzle Schema**:
```typescript
export const evaluations = sqliteTable('evaluations', {
    id: text('id').primaryKey(),
    projectId: text('project_id').references(() => projects.id).notNull(),
    disciplineId: text('discipline_id').references(() => consultantDisciplines.id),
    tradeId: text('trade_id').references(() => contractorTrades.id),
    createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text('updated_at').default(sql`CURRENT_TIMESTAMP`),
});
```

---

### 2. Evaluation Row

Rows within evaluation tables. Supports two table types: Initial Price and Adds & Subs.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | TEXT | PK | UUID |
| evaluationId | TEXT | FK → evaluations.id, NOT NULL, CASCADE DELETE | Parent evaluation |
| tableType | TEXT | ENUM('initial_price', 'adds_subs'), NOT NULL | Which table this row belongs to |
| description | TEXT | NOT NULL | Line item description |
| orderIndex | INTEGER | NOT NULL | Display order within table |
| isSystemRow | BOOLEAN | DEFAULT false | True for subtotal/total rows (not editable) |
| costLineId | TEXT | FK → cost_lines.id, NULL | Link to source cost line (for Initial Price) |
| createdAt | TEXT | DEFAULT CURRENT_TIMESTAMP | Creation timestamp |

**Drizzle Schema**:
```typescript
export const evaluationRows = sqliteTable('evaluation_rows', {
    id: text('id').primaryKey(),
    evaluationId: text('evaluation_id')
        .references(() => evaluations.id, { onDelete: 'cascade' })
        .notNull(),
    tableType: text('table_type', { enum: ['initial_price', 'adds_subs'] }).notNull(),
    description: text('description').notNull(),
    orderIndex: integer('order_index').notNull(),
    isSystemRow: integer('is_system_row', { mode: 'boolean' }).default(false),
    costLineId: text('cost_line_id').references(() => costLines.id),
    createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
});
```

---

### 3. Evaluation Cell

Amount values for each firm at each row position.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | TEXT | PK | UUID |
| rowId | TEXT | FK → evaluation_rows.id, NOT NULL, CASCADE DELETE | Parent row |
| firmId | TEXT | NOT NULL | ID of consultant or contractor firm |
| firmType | TEXT | ENUM('consultant', 'contractor'), NOT NULL | Type of firm |
| amountCents | INTEGER | DEFAULT 0 | Amount in cents (for precision) |
| source | TEXT | ENUM('manual', 'ai'), DEFAULT 'manual' | How value was populated |
| confidence | INTEGER | NULL | AI confidence score (0-100), null for manual |
| createdAt | TEXT | DEFAULT CURRENT_TIMESTAMP | Creation timestamp |
| updatedAt | TEXT | DEFAULT CURRENT_TIMESTAMP | Last update timestamp |

**Drizzle Schema**:
```typescript
export const evaluationCells = sqliteTable('evaluation_cells', {
    id: text('id').primaryKey(),
    rowId: text('row_id')
        .references(() => evaluationRows.id, { onDelete: 'cascade' })
        .notNull(),
    firmId: text('firm_id').notNull(),
    firmType: text('firm_type', { enum: ['consultant', 'contractor'] }).notNull(),
    amountCents: integer('amount_cents').default(0),
    source: text('source', { enum: ['manual', 'ai'] }).default('manual'),
    confidence: integer('confidence'),
    createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text('updated_at').default(sql`CURRENT_TIMESTAMP`),
});
```

---

## Relations

```typescript
// Evaluation Relations
export const evaluationsRelations = relations(evaluations, ({ one, many }) => ({
    project: one(projects, {
        fields: [evaluations.projectId],
        references: [projects.id],
    }),
    discipline: one(consultantDisciplines, {
        fields: [evaluations.disciplineId],
        references: [consultantDisciplines.id],
    }),
    trade: one(contractorTrades, {
        fields: [evaluations.tradeId],
        references: [contractorTrades.id],
    }),
    rows: many(evaluationRows),
}));

// Evaluation Row Relations
export const evaluationRowsRelations = relations(evaluationRows, ({ one, many }) => ({
    evaluation: one(evaluations, {
        fields: [evaluationRows.evaluationId],
        references: [evaluations.id],
    }),
    costLine: one(costLines, {
        fields: [evaluationRows.costLineId],
        references: [costLines.id],
    }),
    cells: many(evaluationCells),
}));

// Evaluation Cell Relations
export const evaluationCellsRelations = relations(evaluationCells, ({ one }) => ({
    row: one(evaluationRows, {
        fields: [evaluationCells.rowId],
        references: [evaluationRows.id],
    }),
}));
```

---

## Queries

### Get Evaluation with All Data

```typescript
const evaluation = await db.query.evaluations.findFirst({
    where: and(
        eq(evaluations.projectId, projectId),
        eq(evaluations.disciplineId, disciplineId) // or tradeId
    ),
    with: {
        rows: {
            orderBy: [asc(evaluationRows.tableType), asc(evaluationRows.orderIndex)],
            with: {
                cells: true,
            },
        },
    },
});
```

### Initialize Evaluation from Cost Lines

```typescript
// When first opening PRICE tab, create evaluation with rows from cost_lines
async function initializeEvaluation(
    projectId: string,
    disciplineId: string | null,
    tradeId: string | null
) {
    // 1. Create evaluation record
    const evalId = nanoid();
    await db.insert(evaluations).values({
        id: evalId,
        projectId,
        disciplineId,
        tradeId,
    });

    // 2. Get cost lines for this discipline/trade
    const costLineQuery = disciplineId
        ? eq(costLines.disciplineId, disciplineId)
        : eq(costLines.tradeId, tradeId);

    const lines = await db.query.costLines.findMany({
        where: and(eq(costLines.projectId, projectId), costLineQuery),
    });

    // 3. Create Initial Price rows from cost lines
    const initialPriceRows = lines.map((line, i) => ({
        id: nanoid(),
        evaluationId: evalId,
        tableType: 'initial_price' as const,
        description: line.activity,
        orderIndex: i,
        costLineId: line.id,
    }));

    // 4. Create 3 default Adds & Subs rows
    const addSubsRows = [1, 2, 3].map((n, i) => ({
        id: nanoid(),
        evaluationId: evalId,
        tableType: 'adds_subs' as const,
        description: `${n}.`,
        orderIndex: i,
    }));

    await db.insert(evaluationRows).values([...initialPriceRows, ...addSubsRows]);

    return evalId;
}
```

### Update Cell Value

```typescript
async function updateCell(
    rowId: string,
    firmId: string,
    firmType: 'consultant' | 'contractor',
    amountCents: number,
    source: 'manual' | 'ai' = 'manual',
    confidence?: number
) {
    // Upsert pattern
    const existing = await db.query.evaluationCells.findFirst({
        where: and(
            eq(evaluationCells.rowId, rowId),
            eq(evaluationCells.firmId, firmId)
        ),
    });

    if (existing) {
        await db.update(evaluationCells)
            .set({ amountCents, source, confidence, updatedAt: new Date().toISOString() })
            .where(eq(evaluationCells.id, existing.id));
    } else {
        await db.insert(evaluationCells).values({
            id: nanoid(),
            rowId,
            firmId,
            firmType,
            amountCents,
            source,
            confidence,
        });
    }
}
```

---

## Migration Script

**File**: `drizzle/0020_evaluation.sql`

```sql
-- Evaluations table (one per discipline/trade per project)
CREATE TABLE IF NOT EXISTS evaluations (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL REFERENCES projects(id),
    discipline_id TEXT REFERENCES consultant_disciplines(id),
    trade_id TEXT REFERENCES contractor_trades(id),
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Index for efficient lookups
CREATE INDEX IF NOT EXISTS idx_evaluations_project ON evaluations(project_id);
CREATE INDEX IF NOT EXISTS idx_evaluations_discipline ON evaluations(discipline_id);
CREATE INDEX IF NOT EXISTS idx_evaluations_trade ON evaluations(trade_id);

-- Evaluation rows table
CREATE TABLE IF NOT EXISTS evaluation_rows (
    id TEXT PRIMARY KEY,
    evaluation_id TEXT NOT NULL REFERENCES evaluations(id) ON DELETE CASCADE,
    table_type TEXT NOT NULL CHECK(table_type IN ('initial_price', 'adds_subs')),
    description TEXT NOT NULL,
    order_index INTEGER NOT NULL,
    is_system_row INTEGER DEFAULT 0,
    cost_line_id TEXT REFERENCES cost_lines(id),
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_evaluation_rows_eval ON evaluation_rows(evaluation_id);

-- Evaluation cells table (amounts per firm per row)
CREATE TABLE IF NOT EXISTS evaluation_cells (
    id TEXT PRIMARY KEY,
    row_id TEXT NOT NULL REFERENCES evaluation_rows(id) ON DELETE CASCADE,
    firm_id TEXT NOT NULL,
    firm_type TEXT NOT NULL CHECK(firm_type IN ('consultant', 'contractor')),
    amount_cents INTEGER DEFAULT 0,
    source TEXT DEFAULT 'manual' CHECK(source IN ('manual', 'ai')),
    confidence INTEGER,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_evaluation_cells_row ON evaluation_cells(row_id);
CREATE INDEX IF NOT EXISTS idx_evaluation_cells_firm ON evaluation_cells(firm_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_evaluation_cells_row_firm ON evaluation_cells(row_id, firm_id);
```

---

## Validation Rules

1. **Evaluation uniqueness**: Only one evaluation per (projectId, disciplineId) or (projectId, tradeId) combination
2. **Context exclusivity**: Exactly one of `disciplineId` or `tradeId` must be non-null
3. **Row ordering**: `orderIndex` must be unique within (evaluationId, tableType)
4. **Cell uniqueness**: Only one cell per (rowId, firmId) combination
5. **Amount precision**: Amounts stored in cents (integer) to avoid floating-point issues
6. **Confidence range**: Must be 0-100 when source is 'ai', null when source is 'manual'
