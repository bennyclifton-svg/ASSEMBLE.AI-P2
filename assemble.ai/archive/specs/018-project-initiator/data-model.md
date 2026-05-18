# Data Model: Project Initiator

**Feature**: 018-project-initiator
**Date**: 2025-12-20

## Data Model Summary

This document provides complete database schema documentation for the Project Initiator feature, including all affected tables, relationships, example data, and migration scripts.

---

## 1. Schema Overview

### Affected Tables

The Project Initiator feature populates data across 5 existing tables:

| Table | Purpose | New Columns | Modified Columns |
|-------|---------|-------------|------------------|
| `projects` | Store project type selection | None | `projectType` enum expansion |
| `projectObjectives` | Store generated objectives | None | None (existing schema) |
| `consultantDisciplines` | Auto-enable disciplines | None | `isEnabled`, `briefServices`, `briefDeliverables` |
| `programActivities` | Store generated program phases | None | None (existing schema) |
| `costLines` | Store generated cost plan | None | None (existing schema) |

**Key Insight**: No new tables required. Feature uses existing schema with enum expansion.

### Database Type

- **Development/Production**: PostgreSQL (via Docker)
- **Migration**: From SQLite to PostgreSQL (completed in spec.md plan)
- **ORM**: Drizzle ORM with prepared statements

---

## 2. Table Schemas

### 2.1 projects Table

**Purpose**: Store project type selection

**Schema** (from `src/lib/db/schema.ts` lines 81-97):
```typescript
export const projects = sqliteTable('projects', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  code: text('code'),
  status: text('status', { enum: ['active', 'archived', 'pending'] }).default('active'),
  organizationId: text('organization_id').references(() => organizations.id),
  currentReportMonth: text('current_report_month'),
  revision: text('revision').default('REV A'),
  currencyCode: text('currency_code').default('AUD'),
  showGst: integer('show_gst', { mode: 'boolean' }).default(false),

  // PROJECT INITIATOR FIELD
  projectType: text('project_type', {
    enum: [
      'due-diligence',
      'feasibility',
      'house',
      'apartments',
      'fitout',
      'industrial',
      'remediation',
      'townhouses',
      'seniors-living',
      'student-housing',
      'mixed-use',
      'hotel-accommodation'
    ]
  }),

  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text('updated_at').default(sql`CURRENT_TIMESTAMP`),
});
```

**Modified Fields**:
- `projectType`: Expanded enum from 5 types to 12 types (matches projectTypes-v2.json)

**Example Data**:
```sql
INSERT INTO projects (id, name, code, project_type, organization_id, status)
VALUES
  ('proj_001', 'Richmond Townhouses', 'RTH-001', 'townhouses', 'org_001', 'active'),
  ('proj_002', 'CBD Office Fitout', 'COF-002', 'fitout', 'org_001', 'active'),
  ('proj_003', 'Bondi Beach House', 'BBH-003', 'house', 'org_002', 'active');
```

**Null Handling**:
- `projectType` is nullable (NULL = "Not Set")
- Existing projects without type show "Project Type: Not Set" in UI
- Only populated when user runs Project Initiator wizard

---

### 2.2 projectObjectives Table

**Purpose**: Store 4 generated objectives (Functional, Quality, Budget, Program)

**Schema** (from `src/lib/db/schema.ts` lines 115-123):
```typescript
export const projectObjectives = sqliteTable('project_objectives', {
  id: text('id').primaryKey(),
  projectId: text('project_id').references(() => projects.id).notNull(),
  functional: text('functional'),  // Generated from objectivesTemplates.json
  quality: text('quality'),        // Generated from objectivesTemplates.json
  budget: text('budget'),          // Generated from objectivesTemplates.json
  program: text('program'),        // Generated from objectivesTemplates.json
  updatedAt: text('updated_at').default(sql`CURRENT_TIMESTAMP`),
});
```

**No Schema Changes**: Existing columns support Project Initiator

**Example Data**:
```sql
INSERT INTO project_objectives (id, project_id, functional, quality, budget, program, updated_at)
VALUES (
  'obj_001',
  'proj_001',
  'Deliver a quality medium-scale residential townhouse development at 123 Richmond Street. Provide 3-4 bedrooms per dwelling including master suite, open plan living, double garage with EV provision. Design to maximise natural light, cross ventilation, and private outdoor areas for each dwelling.',
  'Achieve quality specification throughout. All materials from reputable suppliers with minimum 10-year warranties. Engage licensed builder with proven track record in quality residential construction.',
  'Target $3,200,000 total project budget (excluding GST). Construction cost: $2,400,000. Consultant fees: $320,000. Contingency: $160,000 (5%). Maintain budget within ±5% tolerance.',
  'Complete DA submission within 16 weeks. Achieve DA approval within 20 weeks (medium-rise housing code pathway). Commence construction within 28 weeks. Practical completion within 60 weeks from project start.',
  '2025-01-15 10:30:00'
);
```

**Text Length**:
- All objective fields are `text` (unlimited length in PostgreSQL)
- Typical length: 200-500 characters per objective
- User can edit before applying (may extend length)

**Relationship**:
```
projects (1) ──< (many) projectObjectives
```

---

### 2.3 consultantDisciplines Table

**Purpose**: Track enabled disciplines and store generated brief content

**Schema** (from `src/lib/db/schema.ts` lines 166-178):
```typescript
export const consultantDisciplines = sqliteTable('consultant_disciplines', {
  id: text('id').primaryKey(),
  projectId: text('project_id').references(() => projects.id).notNull(),
  disciplineName: text('discipline_name').notNull(),
  isEnabled: integer('is_enabled', { mode: 'boolean' }).default(false),  // SET BY INITIATOR
  order: integer('order').notNull(),

  // Brief fields (populated by Project Initiator)
  briefServices: text('brief_services'),       // Generated from consultantTemplates.json
  briefDeliverables: text('brief_deliverables'), // Generated from consultantTemplates.json
  briefFee: text('brief_fee'),
  briefProgram: text('brief_program'),

  updatedAt: text('updated_at').default(sql`CURRENT_TIMESTAMP`),
});
```

**Modified Fields**:
- `isEnabled`: Set to `true` for disciplines in `applicableProjectTypes` array
- `briefServices`: Markdown list of services (from `typicalServices` in template)
- `briefDeliverables`: Markdown list of deliverables by phase (from `deliverablesByPhase`)

**Example Data**:
```sql
-- Architect discipline (enabled by Project Initiator for "house" project)
INSERT INTO consultant_disciplines
  (id, project_id, discipline_name, is_enabled, brief_services, brief_deliverables, "order")
VALUES (
  'disc_001',
  'proj_003',
  'Architect',
  1, -- Enabled by Project Initiator
  '- Concept design and space planning
- Design development and documentation
- Town planning coordination
- Authority approvals coordination
- Contract administration',
  '**Concept Design**
- Site analysis and feasibility study
- Concept design sketches and 3D renders
- Preliminary planning assessment

**Design Development**
- Detailed design drawings (plans, elevations, sections)
- Interior design specification
- Materials and finishes schedule

**Documentation**
- Construction documentation (working drawings)
- Specifications
- BCA compliance report',
  1
);

-- Structural Engineer (enabled by Project Initiator for "house" project)
INSERT INTO consultant_disciplines
  (id, project_id, discipline_name, is_enabled, brief_services, brief_deliverables, "order")
VALUES (
  'disc_002',
  'proj_003',
  'Structural Engineer',
  1,
  '- Structural design and documentation
- Site inspections during construction
- Structural certification',
  '**Design Development**
- Structural calculations and sizing
- Foundation design

**Documentation**
- Structural drawings
- Structural specification
- Engineer''s certification',
  2
);

-- Quantity Surveyor (NOT enabled for "house" - not in applicableProjectTypes)
INSERT INTO consultant_disciplines
  (id, project_id, discipline_name, is_enabled, brief_services, brief_deliverables, "order")
VALUES (
  'disc_003',
  'proj_003',
  'Quantity Surveyor',
  0, -- Not auto-enabled (user can manually enable later)
  NULL,
  NULL,
  10
);
```

**Discipline Mapping Logic**:
```typescript
// From consultantTemplates.json
{
  "disciplines": {
    "Architect": {
      "applicableProjectTypes": ["all"], // Enabled for ALL project types
      "typicalServices": ["Concept design...", "Design development..."],
      "deliverablesByPhase": {
        "Concept Design": ["Site analysis", "Concept sketches"],
        "Design Development": ["Detailed drawings", "Materials schedule"]
      }
    },
    "Quantity Surveyor": {
      "applicableProjectTypes": ["apartments", "mixed-use", "commercial"], // NOT house
      "typicalServices": ["Cost planning", "Tender analysis"]
    }
  }
}
```

**Relationship**:
```
projects (1) ──< (many) consultantDisciplines
```

---

### 2.4 programActivities Table

**Purpose**: Store Gantt chart activities (2-tier parent/child hierarchy)

**Schema** (from `src/lib/db/schema.ts` lines 1049-1061):
```typescript
export const programActivities = sqliteTable('program_activities', {
  id: text('id').primaryKey(),
  projectId: text('project_id').references(() => projects.id).notNull(),
  parentId: text('parent_id'), // Self-reference for hierarchy
  name: text('name').notNull(),
  startDate: text('start_date'), // ISO date string (generated by initiator)
  endDate: text('end_date'),     // ISO date string (calculated from duration)
  collapsed: integer('collapsed', { mode: 'boolean' }).default(false),
  color: text('color'),          // Auto-assigned from muted palette
  sortOrder: integer('sort_order').notNull(),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text('updated_at').default(sql`CURRENT_TIMESTAMP`),
});
```

**No Schema Changes**: Existing columns support Project Initiator

**Example Data** (House project - 8 phases):
```sql
-- Parent: Concept Design (phase 1)
INSERT INTO program_activities (id, project_id, parent_id, name, start_date, end_date, color, sort_order)
VALUES (
  'act_001',
  'proj_003',
  NULL, -- Parent (no parentId)
  'Concept Design',
  '2025-02-01',
  '2025-03-01', -- 4 weeks (base) × 1.0 (medium scale) = 4 weeks
  '#94a3b8', -- Muted blue
  1
);

-- Child: Site Analysis (within Concept Design)
INSERT INTO program_activities (id, project_id, parent_id, name, start_date, end_date, color, sort_order)
VALUES (
  'act_002',
  'proj_003',
  'act_001', -- Child of Concept Design
  'Site Analysis',
  '2025-02-01',
  '2025-02-08', -- 1 week
  '#94a3b8',
  2
);

-- Parent: Design Development (phase 2)
INSERT INTO program_activities (id, project_id, parent_id, name, start_date, end_date, color, sort_order)
VALUES (
  'act_003',
  'proj_003',
  NULL,
  'Design Development',
  '2025-03-02', -- Starts day after Concept Design ends
  '2025-04-27', -- 8 weeks
  '#a78bfa', -- Muted purple
  3
);
```

**Duration Calculation Example**:
```
Phase: Construction Documentation
Base duration: 12 weeks (from programTemplates-v2.json)
Building scale: "medium" → 1.0x multiplier
Urgency: "standard" → 1.0x multiplier

Final duration = ceil(12 × 1.0 × 1.0) = 12 weeks

Start date: 2025-06-01
End date: 2025-06-01 + (12 × 7 days) = 2025-08-24
```

**Hierarchy Structure**:
- Parent activities: `parentId = NULL`
- Child activities: `parentId = {parent activity ID}`
- Max depth: 2 levels (industry standard for Gantt charts)

**Relationship**:
```
projects (1) ──< (many) programActivities
programActivities (1 parent) ──< (many children) programActivities
```

---

### 2.5 costLines Table

**Purpose**: Store budget line items (4 sections: FEES, CONSULTANTS, CONSTRUCTION, CONTINGENCY)

**Schema** (from `src/lib/db/schema.ts` lines 378-393):
```typescript
export const costLines = sqliteTable('cost_lines', {
  id: text('id').primaryKey(),
  projectId: text('project_id').references(() => projects.id).notNull(),
  disciplineId: text('discipline_id').references(() => consultantDisciplines.id),
  tradeId: text('trade_id').references(() => contractorTrades.id),
  section: text('section', {
    enum: ['FEES', 'CONSULTANTS', 'CONSTRUCTION', 'CONTINGENCY']
  }).notNull(),
  costCode: text('cost_code'),
  activity: text('activity').notNull(),         // Line item description
  reference: text('reference'),
  budgetCents: integer('budget_cents').default(0), // Generated by initiator
  approvedContractCents: integer('approved_contract_cents').default(0),
  sortOrder: integer('sort_order').notNull(),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text('updated_at').default(sql`CURRENT_TIMESTAMP`),
  deletedAt: text('deleted_at'),
});
```

**No Schema Changes**: Existing columns support Project Initiator

**Example Data** (House project - 250 sqm, "quality" specification):
```sql
-- FEES Section
INSERT INTO cost_lines (id, project_id, section, activity, budget_cents, sort_order)
VALUES
  ('cost_001', 'proj_003', 'FEES', 'Development Application Fees', 50000000, 1),    -- $50,000
  ('cost_002', 'proj_003', 'FEES', 'Building Approval Fees', 25000000, 2),         -- $25,000
  ('cost_003', 'proj_003', 'FEES', 'Section 7.11 Contributions', 35000000, 3);     -- $35,000

-- CONSULTANTS Section (linked to disciplines)
INSERT INTO cost_lines (id, project_id, section, activity, discipline_id, budget_cents, sort_order)
VALUES
  ('cost_004', 'proj_003', 'CONSULTANTS', 'Architectural Services', 'disc_001', 7500000, 10),  -- $75,000 (250 sqm × $250/sqm × 1.2 quality)
  ('cost_005', 'proj_003', 'CONSULTANTS', 'Structural Engineering', 'disc_002', 2500000, 11),  -- $25,000
  ('cost_006', 'proj_003', 'CONSULTANTS', 'Town Planning', NULL, 1800000, 12);                 -- $18,000

-- CONSTRUCTION Section
INSERT INTO cost_lines (id, project_id, section, activity, budget_cents, sort_order)
VALUES
  ('cost_007', 'proj_003', 'CONSTRUCTION', 'Building Works', 91000000, 20),        -- $910,000 (250 sqm × $2,800/sqm × 1.3 quality)
  ('cost_008', 'proj_003', 'CONSTRUCTION', 'Landscaping', 7500000, 21),           -- $75,000
  ('cost_009', 'proj_003', 'CONSTRUCTION', 'Services (Hydraulic, Electrical)', 12000000, 22); -- $120,000

-- CONTINGENCY Section (calculated as % of construction)
INSERT INTO cost_lines (id, project_id, section, activity, budget_cents, sort_order)
VALUES
  ('cost_010', 'proj_003', 'CONTINGENCY', 'Design Contingency (5%)', 5525000, 30),     -- $55,250 (5% of $1,105,000)
  ('cost_011', 'proj_003', 'CONTINGENCY', 'Construction Contingency (5%)', 5525000, 31); -- $55,250
```

**Budget Totals** (for validation):
```sql
SELECT
  section,
  SUM(budget_cents) / 100 AS total_dollars
FROM cost_lines
WHERE project_id = 'proj_003' AND deleted_at IS NULL
GROUP BY section
ORDER BY
  CASE section
    WHEN 'FEES' THEN 1
    WHEN 'CONSULTANTS' THEN 2
    WHEN 'CONSTRUCTION' THEN 3
    WHEN 'CONTINGENCY' THEN 4
  END;

-- Expected result:
-- FEES:          $110,000
-- CONSULTANTS:   $118,500
-- CONSTRUCTION:  $1,105,000
-- CONTINGENCY:   $110,500
-- TOTAL:         $1,444,000
```

**Currency Format**:
- All amounts stored in cents (integer) to avoid floating point errors
- Display conversion: `budgetCents / 100`
- Input parsing: `parseFloat(userInput) * 100`

**Relationship**:
```
projects (1) ──< (many) costLines
consultantDisciplines (1) ──< (many) costLines (CONSULTANTS section)
contractorTrades (1) ──< (many) costLines (CONSTRUCTION section)
```

---

## 3. Relationships Diagram

```
┌──────────────────┐
│   organizations  │
└────────┬─────────┘
         │ 1:N
         │
┌────────▼─────────┐
│     projects     │◄────────────────────────────────────────┐
│                  │                                         │
│  projectType ───┼─── Enum: 12 types                       │
│  (nullable)      │     - due-diligence                     │
└────────┬─────────┘     - feasibility                       │
         │               - house                             │
         │               - apartments                         │
         │               - townhouses                         │
         │               - fitout                            │
         │               - industrial                         │
         │ 1:N           - remediation                       │
         ├───────────────- seniors-living                    │
         │               - student-housing                    │
         │               - mixed-use                          │
         │               - hotel-accommodation                │
         │                                                    │
         │                                                    │
    ┌────▼───────────────────────┐                          │
    │  projectObjectives (1:1)   │                          │
    ├────────────────────────────┤                          │
    │  functional                │ ◄─── Generated           │
    │  quality                   │      from templates      │
    │  budget                    │                          │
    │  program                   │                          │
    └────────────────────────────┘                          │
                                                             │
    ┌────▼───────────────────────┐                          │
    │  consultantDisciplines     │                          │
    ├────────────────────────────┤                          │
    │  disciplineName            │                          │
    │  isEnabled ────────────────┼─── Set by initiator      │
    │  briefServices ────────────┼─── Generated             │
    │  briefDeliverables ────────┼─── Generated             │
    └────┬───────────────────────┘                          │
         │ 1:N                                               │
         │                                                   │
    ┌────▼───────────────────────┐                          │
    │  costLines                 │                          │
    ├────────────────────────────┤                          │
    │  section (FEES, etc.)      │                          │
    │  activity                  │ ◄─── Generated           │
    │  budgetCents ──────────────┼───  from benchmark rates │
    │  disciplineId (FK) ────────┘                          │
    └────────────────────────────┘                          │
                                                             │
    ┌────────────────────────────┐                          │
    │  programActivities         │                          │
    ├────────────────────────────┤                          │
    │  parentId (self-FK)        │ ◄─── 2-tier hierarchy    │
    │  name                      │                          │
    │  startDate ────────────────┼─── Calculated from       │
    │  endDate ──────────────────┼─── duration factors      │
    └────────────────────────────┘                          │
                                                             │
                                    Template JSON Files      │
                                    ┌────────────────────┐  │
                                    │ project-types.json │  │
                                    │ objectives-*.json  ├──┘
                                    │ consultant-*.json  │
                                    │ program-*.json     │
                                    │ cost-plan-*.json   │
                                    └────────────────────┘
```

---

## 4. Enum Values

### 4.1 Project Type Enum

**Column**: `projects.projectType`

**Values** (12 types from projectTypes-v2.json):
```typescript
export const PROJECT_TYPES = [
  'due-diligence',      // Pre-Development
  'feasibility',        // Pre-Development
  'house',              // Residential
  'apartments',         // Residential
  'townhouses',         // Residential
  'fitout',             // Commercial
  'industrial',         // Industrial
  'remediation',        // Industrial
  'seniors-living',     // Residential
  'student-housing',    // Residential
  'mixed-use',          // Commercial
  'hotel-accommodation' // Commercial
] as const;

export type ProjectType = typeof PROJECT_TYPES[number];
```

**Category Mapping**:
```typescript
export const PROJECT_TYPE_CATEGORIES = {
  'Pre-Development': ['due-diligence', 'feasibility'],
  'Residential': ['house', 'apartments', 'townhouses', 'seniors-living', 'student-housing'],
  'Commercial': ['fitout', 'mixed-use', 'hotel-accommodation'],
  'Industrial': ['industrial', 'remediation']
};
```

### 4.2 Cost Line Section Enum

**Column**: `costLines.section`

**Values** (4 sections):
```typescript
export const COST_SECTIONS = [
  'FEES',         // Professional fees, authority fees, insurances
  'CONSULTANTS',  // Consultant fees (one line per discipline)
  'CONSTRUCTION', // Building works, landscaping, services
  'CONTINGENCY'   // Design and construction contingencies
] as const;

export type CostSection = typeof COST_SECTIONS[number];
```

---

## 5. SQL Migration Scripts

### 5.1 Migration 0021: Expand projectType Enum

**File**: `scripts/run-migration-0021.js`

```javascript
/**
 * Migration 0021: Expand projectType enum to support 12 project types
 * Feature: 018-project-initiator
 * Date: 2025-01-15
 */

const { drizzle } = require('drizzle-orm/postgres-js');
const postgres = require('postgres');
const { sql } = require('drizzle-orm');

async function up() {
  const connectionString = process.env.DATABASE_URL;
  const client = postgres(connectionString);
  const db = drizzle(client);

  console.log('Migration 0021: Expanding projectType enum...');

  // PostgreSQL: Alter enum type to add new values
  await db.execute(sql`
    ALTER TYPE project_type_enum ADD VALUE IF NOT EXISTS 'due-diligence';
    ALTER TYPE project_type_enum ADD VALUE IF NOT EXISTS 'feasibility';
    ALTER TYPE project_type_enum ADD VALUE IF NOT EXISTS 'townhouses';
    ALTER TYPE project_type_enum ADD VALUE IF NOT EXISTS 'seniors-living';
    ALTER TYPE project_type_enum ADD VALUE IF NOT EXISTS 'student-housing';
    ALTER TYPE project_type_enum ADD VALUE IF NOT EXISTS 'mixed-use';
    ALTER TYPE project_type_enum ADD VALUE IF NOT EXISTS 'hotel-accommodation';
  `);

  console.log('✅ Migration 0021 complete');
  await client.end();
}

async function down() {
  console.log('⚠️  Migration 0021 rollback not supported (cannot remove enum values in PostgreSQL)');
  console.log('   Enum values are additive only. Rollback would require recreating the enum type.');
}

// Run migration
up().catch((error) => {
  console.error('❌ Migration 0021 failed:', error);
  process.exit(1);
});
```

**PostgreSQL Enum Handling**:
- `ALTER TYPE ... ADD VALUE` is safe (additive only)
- Cannot remove enum values (would break existing data)
- Rollback requires dropping and recreating type (destructive)

### 5.2 Migration 0022: Add Indexes for Performance

**File**: `scripts/run-migration-0022.js`

```javascript
/**
 * Migration 0022: Add indexes for Project Initiator queries
 * Feature: 018-project-initiator
 * Date: 2025-01-15
 */

const { drizzle } = require('drizzle-orm/postgres-js');
const postgres = require('postgres');
const { sql } = require('drizzle-orm');

async function up() {
  const connectionString = process.env.DATABASE_URL;
  const client = postgres(connectionString);
  const db = drizzle(client);

  console.log('Migration 0022: Adding indexes...');

  // Index for filtering projects by type
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS idx_projects_project_type
    ON projects(project_type)
    WHERE project_type IS NOT NULL;
  `);

  // Index for loading disciplines by project
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS idx_consultant_disciplines_project_enabled
    ON consultant_disciplines(project_id, is_enabled);
  `);

  // Index for loading program activities by project (with hierarchy)
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS idx_program_activities_project_parent
    ON program_activities(project_id, parent_id, sort_order);
  `);

  // Index for loading cost lines by project and section
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS idx_cost_lines_project_section
    ON cost_lines(project_id, section, sort_order)
    WHERE deleted_at IS NULL;
  `);

  console.log('✅ Migration 0022 complete');
  await client.end();
}

async function down() {
  const connectionString = process.env.DATABASE_URL;
  const client = postgres(connectionString);
  const db = drizzle(client);

  console.log('Rolling back Migration 0022...');

  await db.execute(sql`DROP INDEX IF EXISTS idx_projects_project_type;`);
  await db.execute(sql`DROP INDEX IF EXISTS idx_consultant_disciplines_project_enabled;`);
  await db.execute(sql`DROP INDEX IF EXISTS idx_program_activities_project_parent;`);
  await db.execute(sql`DROP INDEX IF EXISTS idx_cost_lines_project_section;`);

  console.log('✅ Migration 0022 rollback complete');
  await client.end();
}

// Run migration
up().catch((error) => {
  console.error('❌ Migration 0022 failed:', error);
  process.exit(1);
});
```

---

## 6. Data Flow Diagram

### Initialization Flow

```
┌───────────────────┐
│  User Selects     │
│  Project Type     │
│  (e.g., "house")  │
└────────┬──────────┘
         │
         ▼
┌─────────────────────┐
│  Answers Questions  │
│  - building_scale   │
│  - quality_level    │
│  - gfa             │
└────────┬────────────┘
         │
         ▼
┌──────────────────────────┐
│  Generate Objectives     │◄──── objectivesTemplates-v2.json
│  - Substitute variables  │
│  - Apply variations      │
└────────┬─────────────────┘
         │
         ▼
┌──────────────────────────┐
│  User Reviews & Edits    │
│  (Optional)              │
└────────┬─────────────────┘
         │
         ▼
┌──────────────────────────┐
│  Apply → Initialize      │
│  (Single Transaction)    │
└────────┬─────────────────┘
         │
         ├─────────────────────────┐
         │                         │
         ▼                         ▼
┌────────────────┐      ┌────────────────────┐
│  UPDATE        │      │  INSERT            │
│  projects      │      │  projectObjectives │
│  SET           │      │  VALUES (...)      │
│  project_type  │      └────────────────────┘
└────────────────┘               │
         │                       │
         ▼                       ▼
┌─────────────────────────────────────────────┐
│  Enable Disciplines                         │◄──── consultantTemplates.json
│  UPDATE consultant_disciplines              │
│  SET is_enabled = TRUE                      │
│  WHERE discipline_name IN (...)             │
└─────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────┐
│  Generate Program Phases                    │◄──── programTemplates-v2.json
│  INSERT INTO program_activities             │
│  VALUES (parent activities + children)      │
│  - Calculate start/end dates                │
│  - Apply duration factors                   │
└─────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────┐
│  Generate Cost Plan                         │◄──── costPlanTemplates-v2.json
│  INSERT INTO cost_lines                     │
│  VALUES (FEES, CONSULTANTS, etc.)           │
│  - Calculate budgets from GFA/rates         │
│  - Apply quality multipliers                │
└─────────────────────────────────────────────┘
         │
         ▼
┌──────────────────────────┐
│  Transaction COMMIT      │
│  All changes persisted   │
└──────────────────────────┘
         │
         ▼
┌──────────────────────────┐
│  Return Success          │
│  Close Modal             │
│  Refresh Planning Panel  │
└──────────────────────────┘
```

**Error Handling**: If ANY step fails, entire transaction rolls back (ACID compliance).

---

## 7. Example Queries

### 7.1 Load Project with Initialization Status

```sql
SELECT
  p.id,
  p.name,
  p.code,
  p.project_type,
  CASE
    WHEN p.project_type IS NULL THEN 'Not Set'
    ELSE pt.name  -- Lookup name from projectTypes.json in application
  END AS project_type_display,
  EXISTS(SELECT 1 FROM project_objectives WHERE project_id = p.id) AS has_objectives,
  (SELECT COUNT(*) FROM consultant_disciplines WHERE project_id = p.id AND is_enabled = 1) AS enabled_disciplines_count,
  (SELECT COUNT(*) FROM program_activities WHERE project_id = p.id) AS program_activities_count,
  (SELECT COUNT(*) FROM cost_lines WHERE project_id = p.id AND deleted_at IS NULL) AS cost_lines_count
FROM projects p
WHERE p.id = 'proj_003';
```

**Expected Result**:
```
id       | proj_003
name     | Bondi Beach House
code     | BBH-003
project_type | house
project_type_display | House
has_objectives | true
enabled_disciplines_count | 8
program_activities_count | 24
cost_lines_count | 15
```

### 7.2 Load Enabled Disciplines for Project

```sql
SELECT
  cd.discipline_name,
  cd.is_enabled,
  cd.brief_services,
  cd.brief_deliverables,
  cl.budget_cents / 100 AS budget_dollars
FROM consultant_disciplines cd
LEFT JOIN cost_lines cl ON cl.discipline_id = cd.id AND cl.section = 'CONSULTANTS'
WHERE cd.project_id = 'proj_003'
  AND cd.is_enabled = 1
ORDER BY cd."order";
```

### 7.3 Load Program Activities (Gantt Data)

```sql
WITH RECURSIVE activity_tree AS (
  -- Parent activities (level 1)
  SELECT
    id,
    project_id,
    parent_id,
    name,
    start_date,
    end_date,
    color,
    sort_order,
    1 AS level
  FROM program_activities
  WHERE project_id = 'proj_003' AND parent_id IS NULL

  UNION ALL

  -- Child activities (level 2)
  SELECT
    pa.id,
    pa.project_id,
    pa.parent_id,
    pa.name,
    pa.start_date,
    pa.end_date,
    pa.color,
    pa.sort_order,
    at.level + 1
  FROM program_activities pa
  INNER JOIN activity_tree at ON pa.parent_id = at.id
)
SELECT * FROM activity_tree
ORDER BY sort_order;
```

### 7.4 Cost Plan Summary by Section

```sql
SELECT
  section,
  COUNT(*) AS line_count,
  SUM(budget_cents) / 100 AS total_budget_dollars
FROM cost_lines
WHERE project_id = 'proj_003'
  AND deleted_at IS NULL
GROUP BY section
ORDER BY
  CASE section
    WHEN 'FEES' THEN 1
    WHEN 'CONSULTANTS' THEN 2
    WHEN 'CONSTRUCTION' THEN 3
    WHEN 'CONTINGENCY' THEN 4
  END;
```

**Expected Result**:
```
section       | line_count | total_budget_dollars
FEES          | 3          | 110000.00
CONSULTANTS   | 8          | 118500.00
CONSTRUCTION  | 6          | 1105000.00
CONTINGENCY   | 2          | 110500.00
```

---

## 8. Constraints and Validation

### 8.1 Database Constraints

```sql
-- Foreign key constraints (enforced by Drizzle schema)
ALTER TABLE project_objectives
  ADD CONSTRAINT fk_objectives_project
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE;

ALTER TABLE consultant_disciplines
  ADD CONSTRAINT fk_disciplines_project
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE;

ALTER TABLE program_activities
  ADD CONSTRAINT fk_activities_project
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE;

ALTER TABLE cost_lines
  ADD CONSTRAINT fk_cost_lines_project
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE;

-- Check constraint: budgetCents must be non-negative
ALTER TABLE cost_lines
  ADD CONSTRAINT chk_budget_non_negative
  CHECK (budget_cents >= 0);

-- Unique constraint: One objectives record per project
CREATE UNIQUE INDEX idx_project_objectives_unique
  ON project_objectives(project_id);
```

### 8.2 Application-Level Validation

**Validate Before Initialization**:
```typescript
function validateInitializationRequest(data: InitializationRequest): ValidationResult {
  const errors: string[] = [];

  // Required fields
  if (!data.projectType) {
    errors.push('Project type is required');
  }

  if (!data.projectId) {
    errors.push('Project ID is required');
  }

  // Objectives validation
  if (!data.objectives.functional || data.objectives.functional.trim().length === 0) {
    errors.push('Functional objective cannot be empty');
  }

  if (!data.objectives.quality || data.objectives.quality.trim().length === 0) {
    errors.push('Quality objective cannot be empty');
  }

  // Answers validation
  if (!data.answers || Object.keys(data.answers).length === 0) {
    errors.push('Question answers are required');
  }

  // Budget validation (if GFA-based project)
  if (data.answers.gfa) {
    const gfa = parseFloat(data.answers.gfa);
    if (isNaN(gfa) || gfa <= 0) {
      errors.push('GFA must be a positive number');
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}
```

---

## 9. Performance Considerations

### 9.1 Index Coverage

**Query**: Load all initialization data for a project
```sql
SELECT * FROM projects WHERE id = ?;                           -- PK index
SELECT * FROM project_objectives WHERE project_id = ?;         -- FK index
SELECT * FROM consultant_disciplines WHERE project_id = ?;     -- Composite index (project_id, is_enabled)
SELECT * FROM program_activities WHERE project_id = ?;         -- Composite index (project_id, parent_id, sort_order)
SELECT * FROM cost_lines WHERE project_id = ? AND deleted_at IS NULL; -- Composite index (project_id, section, sort_order)
```

**Total Indexes**: 5 (all covered by Migration 0022)

### 9.2 Estimated Row Counts

| Table | Rows per Project | Total (100 Projects) |
|-------|------------------|----------------------|
| projects | 1 | 100 |
| projectObjectives | 1 | 100 |
| consultantDisciplines | 15 | 1,500 |
| programActivities | 20-50 | 3,500 |
| costLines | 15-30 | 2,250 |

**Storage Estimate**: ~500 KB per project (with indexes)

---

## 10. Data Model Changelog

| Version | Date | Change |
|---------|------|--------|
| 1.0 | 2025-01-15 | Initial schema (existing tables, no changes) |
| 1.1 | 2025-01-15 | Expand `projects.projectType` enum from 5 to 12 types |
| 1.2 | 2025-01-15 | Add performance indexes (Migration 0022) |

**Future Considerations**:
- Add `templateVersion` column to track which template version was used
- Add `initializedAt` timestamp to projects table
- Add `lastModifiedBy` for audit trail
- Consider soft delete for disciplines (instead of toggling `isEnabled`)
