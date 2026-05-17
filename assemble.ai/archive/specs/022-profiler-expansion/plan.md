# Profiler Expansion Implementation Plan

## Overview

This plan outlines the implementation approach for expanding the Profiler module from 6 building classes (47 subclasses) to 8 building classes (110+ subclasses), including multi-region support for AU, NZ, UK, and US markets.

## Implementation Approach

### Strategy: Incremental Data-First

The expansion is primarily a **data configuration exercise**. The existing Profiler UI architecture (from 019-profiler) is designed to be data-driven, meaning most changes can be achieved by updating `profile-templates.json` without modifying React components.

**Key Principle:** Update JSON templates first, then add supporting UI enhancements as needed.

---

## Phase Breakdown

### Week 1-2: Phase 1 - Expand Existing Building Classes (+32 subclasses)

**Approach:**
1. Update `profile-templates.json` with all new subclasses for existing building classes
2. Add scale fields and complexity options for each new subclass
3. Update ConsultantPreview mappings
4. Test in UI without code changes

**Files to Modify:**
- `src/lib/data/profile-templates.json` (PRIMARY)
- `src/components/profiler/ConsultantPreview.tsx` (consultant mappings)

**Validation:**
- Load profiler UI, verify all new subclasses appear
- Select each subclass, verify scale fields render
- Verify complexity options are appropriate

---

### Week 3: Phase 2 - Agricultural/Rural Building Class

**Approach:**
1. Add new "agricultural" building class to JSON
2. Update TypeScript enums and database schema
3. Add icon support in ProfileSection

**Files to Modify:**
- `src/lib/data/profile-templates.json`
- `src/types/profiler.ts` - add 'agricultural' to BUILDING_CLASSES
- `src/lib/db/schema.ts` - update buildingClass enum
- `src/lib/db/pg-schema.ts` - update PostgreSQL enum
- `src/components/profiler/ProfileSection.tsx` - add tractor icon

**Database Migration:**
```sql
-- Add agricultural to buildingClass enum (PostgreSQL)
ALTER TYPE building_class ADD VALUE 'agricultural';
```

---

### Week 4: Phase 3 - Defense/Secure Building Class

**Approach:**
1. Add new "defense_secure" building class to JSON
2. Update TypeScript enums and database schema
3. Add icon support in ProfileSection
4. Add security-focused complexity dimensions

**Files to Modify:**
- `src/lib/data/profile-templates.json`
- `src/types/profiler.ts` - add 'defense_secure' to BUILDING_CLASSES
- `src/lib/db/schema.ts` - update buildingClass enum
- `src/lib/db/pg-schema.ts` - update PostgreSQL enum
- `src/components/profiler/ProfileSection.tsx` - add shield icon

**Database Migration:**
```sql
-- Add defense_secure to buildingClass enum (PostgreSQL)
ALTER TYPE building_class ADD VALUE 'defense_secure';
```

---

### Week 5: Phase 4 - Work Scope Expansion (NEW & ADVISORY)

**Approach:**
1. Add comprehensive work scope definitions for NEW project type
2. Add comprehensive work scope definitions for ADVISORY project type
3. Link work scope items to consultant disciplines
4. Update WorkScopeSelector component if needed

**Files to Modify:**
- `src/lib/data/profile-templates.json` - add workScopeOptions.new and workScopeOptions.advisory
- `src/components/profiler/WorkScopeSelector.tsx` - update UI if needed

**Testing:**
- Create project with type="new", verify work scope items appear
- Create project with type="advisory", verify work scope items appear
- Verify consultant derivation from work scope selections

---

### Week 6: Phase 5-6 - Global Complexity & Risk Flags

**Approach:**
1. Add universal complexity dimensions to default options
2. Add new risk flag definitions
3. Update ComplexityScore component for new dimension multipliers
4. Update RiskFlags component with trigger logic

**Files to Modify:**
- `src/lib/data/profile-templates.json` - add global complexity options
- `src/components/profiler/ComplexityScore.tsx` - add new multipliers
- `src/components/profiler/RiskFlags.tsx` - add trigger conditions

---

### Week 7: Phase 7 - Marine/Coastal Expansion

**Approach:**
1. Add 10 marine/coastal subclasses to infrastructure
2. Add scale fields and complexity options
3. Update consultant mappings

**Files to Modify:**
- `src/lib/data/profile-templates.json`
- `src/components/profiler/ConsultantPreview.tsx`

---

### Week 8: Phase 8 - Aviation Expansion

**Approach:**
1. Add 10 aviation subclasses to infrastructure
2. Add scale fields and complexity options
3. Update consultant mappings

**Files to Modify:**
- `src/lib/data/profile-templates.json`
- `src/components/profiler/ConsultantPreview.tsx`

---

### Week 9: Phase 9 - Telecommunications Expansion

**Approach:**
1. Add 10 telecommunications subclasses to infrastructure
2. Add scale fields and complexity options
3. Update consultant mappings

**Files to Modify:**
- `src/lib/data/profile-templates.json`
- `src/components/profiler/ConsultantPreview.tsx`

---

### Week 10-11: Phase 10 - Multi-Region Support

**Approach:**
1. Add regionConfig to profile-templates.json
2. Add buildingCodeMappings for AU, NZ, UK, US
3. Add region-specific approval pathways
4. Add cost benchmarks per region
5. Update database schema for region column
6. Add region selector UI
7. Update ContextChips for region-aware display

**Files to Modify:**
- `src/lib/data/profile-templates.json`
- `src/lib/db/schema.ts`
- `src/lib/db/pg-schema.ts`
- `src/components/profiler/ProfileSection.tsx` - add region selector
- `src/components/profiler/ContextChips.tsx` - region-aware building codes

**Database Migration:**
```sql
-- Add region column
ALTER TABLE project_profiles ADD COLUMN region TEXT DEFAULT 'AU';
ALTER TABLE project_profiles ADD CONSTRAINT region_check CHECK (region IN ('AU', 'NZ', 'UK', 'US'));
CREATE INDEX idx_profiles_region ON project_profiles(region);
```

**UI Additions:**
- Region selector dropdown in project setup (before profile configuration)
- Region flag/badge display
- Currency formatting based on region
- Imperial unit conversion for US market

---

## Risk Mitigation

### Risk 1: JSON Template Size
**Risk:** profile-templates.json becomes too large to maintain
**Mitigation:** Consider splitting into separate files per building class if >500KB

### Risk 2: Enum Migration Failures
**Risk:** PostgreSQL enum additions fail in production
**Mitigation:** Test migrations in staging; use string types if enum updates problematic

### Risk 3: UI Performance with Many Options
**Risk:** Dropdowns with 100+ options become slow
**Mitigation:** Implement virtualized lists if needed; lazy-load subclass options

### Risk 4: Multi-Region Complexity
**Risk:** Region-specific logic spreads throughout codebase
**Mitigation:** Centralize region handling in a single utility/hook; use region context

---

## Dependencies

### External Dependencies (None Required)
All changes can be implemented with existing dependencies.

### Internal Dependencies
- Requires completed 019-profiler implementation
- Uses existing profile-templates.json structure
- Uses existing profiler component architecture

---

## Rollout Strategy

### Phase 1 Rollout (Week 2)
- Deploy expanded subclasses for existing building classes
- Monitor for any UI issues or performance degradation

### Phase 2-3 Rollout (Week 4)
- Deploy new building classes (Agricultural, Defense/Secure)
- Communicate new options to users

### Phase 4-6 Rollout (Week 6)
- Deploy work scope expansion and complexity updates
- Deploy new risk flags

### Phase 7-9 Rollout (Week 9)
- Deploy sector expansions (Marine, Aviation, Telecom)

### Phase 10 Rollout (Week 11)
- Deploy multi-region support
- Default all existing projects to AU region
- Allow region selection for new projects

---

## Success Metrics

| Metric | Week 6 Target | Week 11 Target |
|--------|---------------|----------------|
| Building Classes | 8 | 8 |
| Total Subclasses | 80+ | 110+ |
| Work Scope Coverage | NEW, ADVISORY added | 100% project types |
| Risk Flags | 15 | 15 |
| Region Support | AU only | AU, NZ, UK, US |

---

## Post-Implementation

### Documentation
- Update user documentation with new building classes
- Add region selection guide
- Update consultant discipline mappings documentation

### Training
- Brief support team on new building classes
- Provide examples of new subclass configurations

### Monitoring
- Track usage of new subclasses
- Monitor for "Other" selections (potential new subclass needs)
- Track region distribution of new projects
