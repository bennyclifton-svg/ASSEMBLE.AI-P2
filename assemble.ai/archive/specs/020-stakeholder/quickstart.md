# Quickstart: Unified Stakeholder System

**Feature**: 020-stakeholder
**Estimated Time**: 2-3 sprints
**Dependencies**: 019-profiler (Profile API)

---

## Overview

The Unified Stakeholder System consolidates project contacts into 4 groups:
- **Client** - Project owners, decision-makers
- **Authority** - Regulatory bodies (Council, certifiers)
- **Consultant** - Design team disciplines (Architect, Engineer, etc.)
- **Contractor** - Trade packages (Structural, Electrical, etc.)

Each group has specialized workflows:
- Client: Simple contact management
- Authority: Submission tracking (Pending → Submitted → Approved)
- Consultant/Contractor: 4-stage tender process (Brief → Tender → Rec → Award)

---

## Getting Started

### 1. Database Setup

Run the migration to create new tables:

```bash
cd assemble.ai
npx drizzle-kit generate:sqlite --name add-stakeholder-tables
npx drizzle-kit push:sqlite
```

### 2. Core Files to Create

```
src/
├── lib/
│   ├── db/
│   │   └── stakeholder-schema.ts       # Drizzle schema (copy from data-model.md)
│   └── services/
│       └── stakeholder-service.ts      # Business logic
├── app/
│   └── api/
│       └── projects/
│           └── [projectId]/
│               └── stakeholders/
│                   ├── route.ts        # GET, POST
│                   ├── [stakeholderId]/
│                   │   └── route.ts    # GET, PUT, DELETE
│                   ├── generate/
│                   │   └── route.ts    # POST
│                   └── migrate/
│                       └── route.ts    # POST
├── components/
│   └── stakeholders/
│       ├── StakeholderSection.tsx
│       ├── StakeholderGroupNav.tsx
│       ├── StakeholderTable.tsx
│       └── StakeholderRow.tsx
└── types/
    └── stakeholder.ts                  # Type definitions (copy from data-model.md)
```

---

## Implementation Order

### Phase 1: Data Layer (Sprint 1)

1. **Create schema file** (`stakeholder-schema.ts`)
   - Copy Drizzle schema from data-model.md
   - Run migration

2. **Create types file** (`stakeholder.ts`)
   - Copy TypeScript interfaces from data-model.md

3. **Create service file** (`stakeholder-service.ts`)
   ```typescript
   // Key functions to implement:
   export async function listStakeholders(projectId: string, group?: StakeholderGroup)
   export async function getStakeholder(id: string)
   export async function createStakeholder(projectId: string, data: CreateStakeholderRequest)
   export async function updateStakeholder(id: string, data: UpdateStakeholderRequest)
   export async function deleteStakeholder(id: string) // soft delete
   export async function updateTenderStatus(stakeholderId: string, data: UpdateTenderStatusRequest)
   export async function updateSubmissionStatus(stakeholderId: string, data: UpdateSubmissionStatusRequest)
   ```

4. **Create API routes**
   - Follow existing patterns in `/api/projects/[projectId]/cost-plan/`

### Phase 2: UI Components (Sprint 2)

1. **Create StakeholderSection.tsx** (main container)
   ```tsx
   // Layout: Two-panel (left nav with counts + main content with collapsible tables)
   <div className="flex h-full">
     <StakeholderGroupNav counts={counts} />
     <div className="flex-1 flex flex-col gap-4 overflow-auto p-4">
       {groups.map(group => (
         <StakeholderGroupSection
           key={group}
           group={group}
           stakeholders={stakeholdersByGroup[group]}
           expanded={expandedGroups.has(group)}
           onToggle={() => toggleGroup(group)}
         />
       ))}
     </div>
   </div>
   ```

2. **Create StakeholderGroupNav.tsx**
   - Fixed list showing all 4 groups (always visible, not collapsible)
   - Count badge next to each group name (team size indicator)
   - Provides at-a-glance view of assembled team size

3. **Create StakeholderGroupSection.tsx**
   - Collapsible header with group name
   - Chevron icon for expand/collapse state
   - Renders StakeholderTable when expanded

4. **Create StakeholderTable.tsx**
   - Reuse existing table patterns from ConsultantListSection
   - Group-specific columns (Discipline for Consultant, Trade for Contractor, etc.)

5. **Create StakeholderRow.tsx**
   - Inline editing (reuse InlineEditField pattern)
   - TenderProgressBar for Consultant/Contractor
   - Status badge for Authority

### Phase 3: Generation & Migration (Sprint 2-3)

1. **Create stakeholder-generation.ts**
   ```typescript
   // Uses existing getRecommendedDisciplines from planning-context.ts
   export async function generateStakeholders(projectId: string): Promise<GeneratedStakeholder[]> {
     const profile = await fetchProfileExportData(projectId);
     if (!profile) throw new Error('Profile required for generation');

     const disciplines = getRecommendedDisciplines(
       profile.buildingClass,
       profile.projectType,
       profile.subclass,
       profile.complexity
     );

     // Map to stakeholders
     return disciplines.map(d => ({
       stakeholderGroup: 'consultant',
       name: d.name,
       disciplineOrTrade: d.name,
       reason: d.reason,
     }));
   }
   ```

2. **Create stakeholder-migration.ts**
   - See migration SQL in data-model.md
   - Run once per project on first access

---

## Key Integration Points

### With Profile (019-profiler)

```typescript
import { fetchProfileExportData, getRecommendedDisciplines } from '@/lib/services/planning-context';

// In stakeholder generation:
const profile = await fetchProfileExportData(projectId);
const recommendations = getRecommendedDisciplines(...);
```

### With Cost Plan (existing)

```typescript
// On Award completion:
async function handleAwardComplete(stakeholderId: string) {
  const stakeholder = await getStakeholder(stakeholderId);

  // Create Company if needed
  let companyId = stakeholder.companyId;
  if (!companyId && stakeholder.organization) {
    const company = await createCompany({
      name: stakeholder.organization,
      email: stakeholder.contactEmail,
    });
    companyId = company.id;
  }

  // Update stakeholder with company link
  await updateStakeholder(stakeholderId, { companyId });

  // Prompt user to link to Cost Plan
  // (handled in UI)
}
```

### With Planning Section

The StakeholderSection replaces existing ConsultantListSection and ContractorListSection:

```tsx
// In Planning page layout:
<LeftNavigation>
  <NavItem label="Project Details" />
  <NavItem label="Profile" />
  <NavItem label="Objectives" />
  <NavItem label="Stakeholders" /> {/* NEW - replaces Consultants/Contractors */}
</LeftNavigation>
```

---

## Testing Checklist

### Unit Tests

- [ ] `listStakeholders` returns correct data by group
- [ ] `createStakeholder` validates required fields
- [ ] `updateTenderStatus` enforces stage order
- [ ] `updateSubmissionStatus` validates transitions
- [ ] `generateStakeholders` uses profile data correctly
- [ ] `migrateStakeholders` handles all legacy tables

### Integration Tests

- [ ] API routes return correct responses
- [ ] Tender status updates in correct order
- [ ] Award completion triggers Cost Plan integration
- [ ] Authority submission status syncs with Planning indicators

### E2E Tests

- [ ] User can navigate between stakeholder groups
- [ ] User can add/edit/delete stakeholders
- [ ] User can progress tender stages
- [ ] User can update submission status
- [ ] AI generation populates stakeholder list

---

## Default Data

Create `src/lib/data/stakeholder-defaults.json`:

```json
{
  "consultantDisciplines": [
    "Architect",
    "Structural Engineer",
    "Civil Engineer",
    "Mechanical Engineer",
    "Electrical Engineer",
    "Hydraulic Engineer",
    "Fire Engineer",
    "Acoustic Consultant",
    "ESD Consultant",
    "Landscape Architect"
  ],
  "contractorTrades": [
    "Demolition",
    "Structural Steel",
    "Concrete/Formwork",
    "Hydraulic",
    "Mechanical HVAC",
    "Electrical",
    "Fire Services",
    "Facade/Glazing",
    "Roofing",
    "Waterproofing",
    "Painting",
    "Flooring",
    "Joinery/Fitout",
    "Landscaping"
  ],
  "authorities": {
    "NSW": ["Local Council", "Certifier (PCA)", "Fire & Rescue NSW", "SafeWork NSW"],
    "VIC": ["Local Council", "VBA", "CFA/MFB", "WorkSafe VIC"],
    "QLD": ["Local Council", "Building Certifier", "QFES", "Workplace H&S QLD"]
  }
}
```

---

## Common Patterns

### Inline Edit Field

```tsx
// Reuse from existing InlineEditField.tsx
<InlineEditField
  value={stakeholder.name}
  onSave={(value) => updateStakeholder(stakeholder.id, { name: value })}
  placeholder="Enter name..."
/>
```

### Tender Progress Bar

```tsx
// Reuse from existing TenderProgressBar.tsx
<TenderProgressBar
  statuses={stakeholder.tenderStatuses}
  onStageClick={(stage) => handleStageUpdate(stakeholder.id, stage)}
/>
```

### Status Badge

```tsx
// For Authority submission status
const statusColors = {
  pending: 'bg-gray-100 text-gray-700',
  submitted: 'bg-blue-100 text-blue-700',
  approved: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700',
  withdrawn: 'bg-yellow-100 text-yellow-700',
};

<span className={`px-2 py-1 rounded-full text-xs ${statusColors[status]}`}>
  {status}
</span>
```

---

## Deprecation Notes

After migration, the following tables become read-only:
- `stakeholders` (old simple list)
- `consultantDisciplines`
- `contractorTrades`
- `consultantStatuses`
- `contractorStatuses`

These can be dropped in a future release after all projects are migrated.
