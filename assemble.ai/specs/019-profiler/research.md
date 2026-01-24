# Research: Profiler Module

**Phase 0 Output** | **Date**: 2026-01-21

---

## 1. Technology Decisions

### 1.1 Markdown Editor

**Decision**: Use native `<textarea>` with lightweight markdown preview

**Rationale**:
- CODE-006 requires 0 new runtime dependencies
- SimpleMarkdownEditor.tsx must be <50 lines
- Basic formatting (bold, italic, bullets) sufficient for objectives

**Alternatives Considered**:
| Option | Rejected Because |
|--------|------------------|
| react-markdown | New dependency, overkill for objectives |
| TipTap | Heavy (500KB+), violates CODE-006 |
| Slate | Complex API, maintenance burden |
| Monaco | Editor bloat, not markdown-focused |

**Implementation Approach**:
```typescript
// SimpleMarkdownEditor.tsx - ~40 lines
// Use textarea for input, dangerouslySetInnerHTML for preview
// Parse: **bold**, *italic*, - bullets, # headers
// Debounced preview update (300ms)
```

### 1.2 Multi-Select for Mixed Class

**Decision**: Use existing shadcn/ui Combobox with multi-select mode

**Rationale**:
- Already in the stack (no new deps)
- Supports tagging UX pattern
- Keyboard accessible

**Implementation**:
```typescript
// SubclassSelector.tsx
// Props: multiSelect: boolean (true for Mixed class only)
// Selected items shown as chips/tags
// Max 4 selections for Mixed (practical limit)
```

### 1.3 Dynamic Form Fields

**Decision**: Data-driven from profile-templates.json

**Rationale**:
- Adding new subclass = JSON update only
- No component changes for new building types
- Aligns with CODE-002 (data-driven UI)

**Template Structure**:
```json
{
  "buildingClasses": {
    "residential": {
      "scaleFields": {
        "default": [...],
        "aged_care_9c": [...]  // Subclass-specific overrides
      }
    }
  }
}
```

---

## 2. Data Model Decisions

### 2.1 Subclass Storage

**Decision**: JSONB array for subclass, even for single-select classes

**Rationale**:
- Consistent API for all classes
- Future-proofs if other classes need multi-select
- Simpler query patterns

**Schema**:
```sql
subclass JSONB NOT NULL DEFAULT '[]'::jsonb,
-- Single: ["office"]
-- Mixed: ["residential", "retail", "hotel"]
```

### 2.2 Complexity Storage

**Decision**: JSONB object with dimension keys

**Rationale**:
- Multi-dimensional complexity (5-6 dimensions per class)
- Each dimension has different options
- Easy to extend without migrations

**Schema**:
```sql
complexity JSONB NOT NULL DEFAULT '{}'::jsonb,
-- Example for Commercial Hotel:
-- {
--   "star_rating": "5_star",
--   "brand": "hard_brand",
--   "fb_complexity": "multiple_outlets",
--   "meeting_events": "ballroom",
--   "wellness": "pool_gym"
-- }
```

### 2.3 Objectives Source Tracking

**Decision**: Enum-like string in JSONB, not PostgreSQL enum

**Rationale**:
- Adding new sources doesn't require migration
- 3 current sources: 'manual', 'ai_generated', 'ai_polished'
- May add 'template' or 'imported' later

**Schema**:
```sql
functional_quality JSONB NOT NULL,
-- {
--   "content": "...",
--   "source": "ai_generated",
--   "originalAi": "...",
--   "editHistory": ["edit1", "edit2"]
-- }
```

---

## 3. AI Integration Decisions

### 3.1 Objectives Generation

**Decision**: Template substitution + optional LLM polish

**Rationale**:
- Fast generation (<3s requirement)
- Predictable outputs
- LLM only for polish (optional enhancement)

**Approach**:
1. **Generate**: Pure template substitution
   - Load template for Class × Type
   - Replace `{{variables}}` with Profile data
   - No LLM call needed

2. **Polish**: LLM enhancement
   - Send: template output + user edits + profile context
   - Return: refined version
   - 5s timeout, fallback to user text on failure

### 3.2 Smart Defaults Logic

**Decision**: Client-side rules engine, not ML model

**Rationale**:
- Deterministic, explainable
- No latency from API calls
- Rules from Rawlinsons 2025 benchmarks

**Example Rules**:
```typescript
// When hotel rooms entered, suggest star rating
if (subclass === 'hotel' && scale.rooms) {
  if (scale.rooms < 80) suggest('star_rating', '3_star', 'Budget hotels typically <80 rooms');
  if (scale.rooms >= 80 && scale.rooms <= 150) suggest('star_rating', '4_star');
  if (scale.rooms > 150) suggest('star_rating', '5_star', 'Luxury viable at 150+ rooms');
}
```

### 3.3 Complexity Score Calculation

**Decision**: Weighted sum of factors (client-side)

**Rationale**:
- Real-time update (<100ms)
- Transparent factors shown to user
- No API call needed

**Algorithm**:
```typescript
const FACTOR_WEIGHTS = {
  heritage_listed: 2.0,
  live_operations: 1.5,
  state_significant: 1.5,
  multi_stakeholder: 1.2,
  transfer_structure: 0.5,
  // ... etc
};

function calculateComplexityScore(complexity: Record<string, string>): number {
  return Object.entries(complexity)
    .reduce((score, [key, value]) => score + (FACTOR_WEIGHTS[value] || 0), 1);
}
```

---

## 4. UX Decisions

### 4.1 Progressive Disclosure Order

**Decision**: Class → Type → Subclass → Scale → Complexity

**Rationale**:
- Each step constrains the next
- Most important decisions first
- Cognitive load reduced by showing only relevant options

**Flow**:
```
Step 1: Class (6 options) + Type (5 options) - 2 clicks
Step 2: Subclass (5-8 options based on Class) - 1 click
Step 3: Scale (4-6 fields based on Subclass) - 30-60 seconds
Step 4: Complexity (5-6 dimensions) - 20-40 seconds
```

### 4.2 Left Navigation Behavior

**Decision**: Always visible, sections enabled regardless of order

**Rationale**:
- Non-linear navigation (NAV-004)
- Users can jump to any section
- Completion indicators guide but don't block

**States**:
- Empty circle: Not started
- Partial fill: In progress (some data)
- Checkmark: Complete (all required fields)

### 4.3 Tab State During Profiler

**Decision**: Tabs visible but dimmed, clickable shows "Complete profile first" toast

**Rationale**:
- User knows other modules exist
- Not blocked, just guided
- Smooth transition when profile complete

---

## 5. Performance Decisions

### 5.1 Template Loading

**Decision**: Static import, tree-shaken by class

**Rationale**:
- No runtime fetch for templates
- Only load templates for selected class
- Bundle size manageable (~50KB total)

**Implementation**:
```typescript
// Lazy load per class
const templates = {
  residential: () => import('./templates/residential.json'),
  commercial: () => import('./templates/commercial.json'),
  // ...
};
```

### 5.2 Form State Management

**Decision**: React Hook Form with Zod validation

**Rationale**:
- Already in stack
- Excellent TypeScript support
- Handles dynamic fields well

**Structure**:
```typescript
const profileSchema = z.object({
  buildingClass: z.enum([...]),
  projectType: z.enum([...]),
  subclass: z.array(z.string()).min(1),
  scale: z.record(z.number()),
  complexity: z.record(z.string()),
});
```

### 5.3 API Response Caching

**Decision**: SWR for profile data, no cache for generation

**Rationale**:
- Profile data rarely changes (cache 5 min)
- Generation must be fresh each time
- Polish must be fresh each time

---

## 6. Integration Decisions

### 6.1 Cost Plan Integration

**Decision**: Complexity multipliers stored in Cost Plan context

**Rationale**:
- Cost Plan already has rate calculation logic
- Profile provides base complexity tier
- Integration via shared context, not direct coupling

**Data Flow**:
```
Profile → complexity → Cost Plan context → rate multipliers → line item costs
```

### 6.2 Programme Integration

**Decision**: Class + Type determines programme template

**Rationale**:
- Each building type has typical phase structure
- Profile selection auto-suggests phases
- User can override

**Mapping**:
```typescript
const PROGRAMME_TEMPLATES = {
  'residential_new': 'residential-new-build',
  'commercial_refurb': 'commercial-refurbishment',
  'institution_new': 'institution-new-build',
  // ...
};
```

### 6.3 Legacy Compatibility

**Decision**: Fallback to projectType if no profile exists

**Rationale**:
- Existing projects (018) use old 14-type system
- API checks for profile first, falls back to legacy
- No migration required for old projects

**Implementation**:
```typescript
async function getProjectContext(projectId: string) {
  const profile = await db.query.projectProfiles.findFirst({ where: eq(projectProfiles.projectId, projectId) });
  if (profile) return mapProfileToContext(profile);

  // Fallback to legacy
  const project = await db.query.projects.findFirst({ where: eq(projects.id, projectId) });
  return mapLegacyTypeToContext(project.projectType);
}
```

---

## 7. Resolved Clarifications

| Item | Resolution | Source |
|------|------------|--------|
| Markdown editor choice | Native textarea + preview | CODE-006 constraint |
| Multi-select UI | shadcn Combobox | Existing stack |
| Complexity storage | JSONB object | Multi-dimensional requirement |
| AI for generation | Template substitution | <3s requirement |
| Complexity score | Client-side calculation | <100ms requirement |
| Performance targets | All achievable with current stack | Spec §10.2 |

---

## 8. Risks Identified

| Risk | Mitigation |
|------|------------|
| Template JSON file grows large | Split by class, lazy load |
| Complexity rules become unwieldy | Extract to separate rules engine file |
| AI polish takes >5s | Timeout + fallback to original |
| Multi-select confuses users | Only enable for Mixed class |

---

**Phase 0 Complete** - Proceed to Phase 1: Data Model & Contracts
