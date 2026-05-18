# Implementation Spec: Project Initialization Bug Fix

**Feature Branch**: `008-project-initialization`
**Created**: 2025-11-30
**Status**: Ready for Implementation
**Parent Spec**: [003-planning-card](../003-planning-card/spec.md) (FR-051 to FR-058, SC-022 to SC-024)
**Tasks**: [003-planning-card/tasks.md](../003-planning-card/tasks.md) (Phase 16: T099-T101)

## Problem Statement

**Bug**: Projects created via "Add New Project" only create a row in the `projects` table. The consultant disciplines, contractor trades, stages, and other planning data are never initialized, resulting in empty Planning/Consultant/Contractor lists.

**Root Cause**: The initialization endpoints exist (`POST /api/planning/[projectId]/consultants` and `POST /api/planning/[projectId]/contractors`) but are never called during project creation.

**Impact**: Users see empty consultant and contractor lists for new projects, breaking core functionality defined in [003-planning-card](../003-planning-card/spec.md).

## Clarifications (Session 2025-11-30)

| Question | Answer |
|----------|--------|
| When should planning data be initialized? | **Eager** - At project creation time |
| Default state for disciplines/trades? | **All disabled** - `isEnabled: false`, user toggles on |
| Handling partial initialization failure? | **Transaction rollback** - Atomic operation |
| What data to initialize? | **Full** - See [003 data-model](../003-planning-card/data-model.md#project-initialization) |
| Fix for existing projects? | **Migration script** - One-time backfill |

## Implementation

### File: `src/app/api/projects/route.ts`

Modify the POST handler to wrap project creation and initialization in a single transaction:

```typescript
// Note: better-sqlite3 is synchronous, so use sync transaction pattern
// Use .run() for inserts and .all() for returning queries

const result = db.transaction((tx) => {
    // 1. Create project
    const projectId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const newProject = { id: projectId, name: name.trim(), ... };
    tx.insert(projects).values(newProject).run();

    // 2. Initialize consultant disciplines (37) + statuses (148)
    const disciplineRecords = CONSULTANT_DISCIPLINES.map((d) => ({...}));
    const createdDisciplines = tx.insert(consultantDisciplines)
        .values(disciplineRecords).returning().all();

    const disciplineStatuses = createdDisciplines.flatMap((d) =>
        STATUS_TYPES.map((statusType) => ({...}))
    );
    tx.insert(consultantStatuses).values(disciplineStatuses).run();

    // 3. Initialize contractor trades (21) + statuses (84)
    // ... similar pattern ...

    // 4-6. Initialize stages, details, objectives
    // ... similar pattern ...

    return newProject;
});
```

**Key Implementation Notes:**
- better-sqlite3 is synchronous - do NOT use async/await in transactions
- Use `.run()` for INSERT without return values
- Use `.returning().all()` for INSERT with return values
- Transaction auto-commits on success, auto-rollbacks on error

### File: `scripts/migrate-project-initialization.js`

Migration script to backfill existing projects:

```javascript
// Run with: node scripts/migrate-project-initialization.js

import { db } from '../src/lib/db';
import { projects, consultantDisciplines, contractorTrades, projectStages } from '../src/lib/db/schema';
import { CONSULTANT_DISCIPLINES, CONTRACTOR_TRADES, STATUS_TYPES } from '../src/lib/constants/disciplines';
import { eq } from 'drizzle-orm';

async function migrateProjects() {
    const allProjects = await db.select().from(projects);
    console.log(`Found ${allProjects.length} projects to check`);

    for (const project of allProjects) {
        // Check if already initialized
        const existingDisciplines = await db
            .select()
            .from(consultantDisciplines)
            .where(eq(consultantDisciplines.projectId, project.id));

        if (existingDisciplines.length > 0) {
            console.log(`Skipping ${project.name} - already initialized`);
            continue;
        }

        console.log(`Initializing ${project.name}...`);

        await db.transaction(async (tx) => {
            // Same initialization logic as POST /api/projects
            // ... (disciplines, trades, stages, details, objectives)
        });

        console.log(`✓ Initialized ${project.name}`);
    }

    console.log('Migration complete');
}

migrateProjects().catch(console.error);
```

## Testing Checklist

| Test | Expected Result |
|------|-----------------|
| Create new project | 297 records created (37 disciplines + 148 statuses + 21 trades + 84 statuses + 5 stages + 1 details + 1 objectives) |
| View Planning Card after create | All sections display with default/empty states |
| Simulate DB failure mid-transaction | No partial data, project not created |
| Run migration on old project | Complete initialization |
| Run migration twice | No duplicates (idempotent) |

## References

- **Data Model**: [003-planning-card/data-model.md](../003-planning-card/data-model.md)
- **Requirements**: FR-051 to FR-058 in [003-planning-card/spec.md](../003-planning-card/spec.md)
- **Success Criteria**: SC-022 to SC-024 in [003-planning-card/spec.md](../003-planning-card/spec.md)
- **Tasks**: T099-T101 in [003-planning-card/tasks.md](../003-planning-card/tasks.md)
