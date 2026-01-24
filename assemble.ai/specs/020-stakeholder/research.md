# Research: Unified Stakeholder System

**Feature**: 020-stakeholder
**Researched**: 2026-01-21
**Status**: Complete

## Summary

Research confirms all technical context is well-defined. No NEEDS CLARIFICATION items remain. This document consolidates integration patterns, API contracts, and architectural decisions.

---

## 1. Profile API Integration

### Decision
Use existing Profile API endpoints via `/api/planning/{projectId}/profile` for stakeholder generation context.

### Rationale
- Profile API already exists and provides all required data (buildingClass, projectType, subclass, complexity)
- `fetchProfileExportData()` in `planning-context.ts:1120` returns structured profile data
- `getRecommendedDisciplines()` in `planning-context.ts:1031` provides discipline suggestions based on profile

### Alternatives Considered
1. **Direct DB query**: Rejected - duplicates logic already in planning-context.ts
2. **Separate profile service**: Rejected - over-engineering for current needs

### Implementation Notes
```typescript
// Stakeholder generation will call:
const profile = await fetchProfileExportData(projectId);
const recommendations = getRecommendedDisciplines(
  profile.buildingClass,
  profile.projectType,
  profile.subclass,
  profile.complexity
);
```

---

## 2. Existing Schema Analysis

### Current Tables

| Table | Purpose | Migration Path |
|-------|---------|----------------|
| `stakeholders` | Client contact list (simple) | Becomes group=Client stakeholders |
| `consultantDisciplines` | Consultant procurement tracking | Becomes group=Consultant stakeholders |
| `consultantStatuses` | 4-stage tender process | Migrates to `stakeholderTenderStatus` |
| `contractorTrades` | Contractor procurement tracking | Becomes group=Contractor stakeholders |
| `contractorStatuses` | 4-stage tender process | Migrates to `stakeholderTenderStatus` |
| `consultants` | Firm records | Links via `stakeholderFirm` FK |
| `contractors` | Firm records | Links via `stakeholderFirm` FK |

### Decision
Create new unified `projectStakeholders` table with `stakeholderGroup` enum. Retain existing tables during migration period with deprecation path.

### Rationale
- Clean break allows proper 4-group taxonomy
- Existing tables have inconsistent patterns (disciplines vs trades naming)
- Soft migration allows gradual transition without data loss

---

## 3. AI Generation Pattern Analysis

### Existing Pattern
Report generation in `planning-context.ts` uses template substitution:
```typescript
// Profile → Template variables → Claude API → Generated content
```

### Decision
Follow same pattern for stakeholder generation:
1. Fetch profile data using `fetchProfileExportData()`
2. Use `getRecommendedDisciplines()` for Consultant group seeding
3. Call Claude API with profile context for additional suggestions
4. Return structured stakeholder list

### Alternatives Considered
1. **Hardcoded lookup tables**: Rejected - misses project-specific nuances
2. **Full AI generation**: Rejected - unnecessary for well-defined consultant disciplines
3. **Hybrid (chosen)**: Use deterministic recommendations + AI for edge cases

---

## 4. Tender Status Pattern

### Decision
Create shared `stakeholderTenderStatus` table for Consultant/Contractor groups.

### Rationale
- Both groups use identical 4-stage process (Brief, Tender, Rec, Award)
- Existing `consultantStatuses` and `contractorStatuses` have identical schemas
- Unified table reduces duplication and simplifies queries

### Schema Pattern
```sql
CREATE TABLE stakeholder_tender_statuses (
  id TEXT PRIMARY KEY,
  stakeholder_id TEXT NOT NULL REFERENCES project_stakeholders(id),
  status_type TEXT NOT NULL, -- brief, tender, rec, award
  is_active BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMP,
  updated_at TIMESTAMP
);
```

---

## 5. Authority Submission Status

### Decision
Create separate `stakeholderSubmissionStatus` table for Authority group only.

### Rationale
- Authority workflow differs from tender process
- States: Pending, Submitted, Approved, Rejected
- No overlap with Consultant/Contractor tender stages

### Integration
Authority approval status will integrate with Planning section compliance indicators (FR-004 in spec).

---

## 6. Migration Strategy

### Decision
One-time migration triggered on first access to Stakeholders section.

### Algorithm
```
1. Check if project has new stakeholders table entries
2. If not, run migration:
   a. Copy stakeholders → projectStakeholders (group=Client)
   b. Copy consultantDisciplines → projectStakeholders (group=Consultant)
   c. Copy contractorTrades → projectStakeholders (group=Contractor)
   d. Copy consultantStatuses → stakeholderTenderStatuses
   e. Copy contractorStatuses → stakeholderTenderStatuses
   f. Link firms via stakeholderFirm FK
3. Mark project as migrated (flag in project record)
```

### Rollback
Existing tables not modified; migration creates new records only.

---

## 7. Cost Plan Integration

### Decision
Award stage completion creates/links Company record and updates Cost Plan line.

### Flow
```
User marks Award complete
  → Prompt: "Link to Cost Plan?"
  → If yes:
    → Create Company if not exists (from stakeholder firm details)
    → Link stakeholder.companyId to company.id
    → Update costLine with company reference
  → If no:
    → Just mark Award complete, no Cost Plan link
```

### Existing Pattern
Current `consultants.companyId` and `contractors.companyId` follow this pattern.

---

## 8. Component Structure Analysis

### Existing Patterns
- `src/components/dashboard/planning/` - Section components
- `ConsultantListSection.tsx` - List with inline edit
- `ContractorListSection.tsx` - List with inline edit
- `TenderProgressBar.tsx` - 4-stage progress indicator (reusable)

### Decision
New components in `src/components/stakeholders/`:
- `StakeholderSection.tsx` - Main container
- `StakeholderGroupNav.tsx` - Left panel with 4 groups
- `StakeholderTable.tsx` - Middle panel table
- `StakeholderRow.tsx` - Row with inline edit

### Reuse
- Existing `TenderProgressBar.tsx` can be reused for Consultant/Contractor tender status
- Existing inline edit patterns from `InlineEditField.tsx`

---

## 9. API Route Structure

### Decision
Follow existing Next.js App Router pattern:
```
/api/projects/[projectId]/stakeholders/          # GET, POST
/api/projects/[projectId]/stakeholders/[id]/     # GET, PUT, DELETE
/api/projects/[projectId]/stakeholders/generate/ # POST (AI generation)
/api/projects/[projectId]/stakeholders/migrate/  # POST (one-time migration)
```

### Rationale
Matches existing patterns in `/api/projects/[projectId]/cost-plan/` and `/api/projects/[projectId]/program/`.

---

## 10. Default Contractor Trades

### Decision
Provide default contractor trade list for new projects (addresses analysis-report.md C1 issue).

### List
Based on common Australian construction procurement:
- Demolition
- Structural Steel
- Concrete/Formwork
- Hydraulic
- Mechanical HVAC
- Electrical
- Fire Services
- Facade/Glazing
- Roofing
- Waterproofing
- Painting
- Flooring
- Joinery/Fitout
- Landscaping

### Implementation
Store in `src/lib/data/stakeholder-defaults.json` alongside `profile-templates.json`.

---

## Open Items

None - all technical context resolved.

---

## References

- [spec.md](./spec.md) - Feature specification
- [analysis-report.md](./analysis-report.md) - Specification analysis
- [planning-context.ts](../../src/lib/services/planning-context.ts) - Existing planning service
- [schema.ts](../../src/lib/db/schema.ts) - Current database schema
- [019-profiler/spec.md](../019-profiler/spec.md) - Profile module specification
