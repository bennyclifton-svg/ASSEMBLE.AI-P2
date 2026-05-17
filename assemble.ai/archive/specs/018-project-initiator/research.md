# Research: Project Initiator

**Feature**: 018-project-initiator
**Date**: 2025-12-20

## Research Summary

This document captures technical research and decisions for implementing the template-driven project initialization system.

---

## 1. Template Substitution Patterns

### Decision: Regex-Based String Replacement with Mustache-Style Syntax

**Rationale**:
- Simple `{{variable_name}}` syntax familiar to developers
- Regex replacement is performant and type-safe in TypeScript
- No external template library dependencies required
- Supports fallback values for missing variables

**Alternatives Considered**:

| Approach | Rejected Because |
|----------|------------------|
| Handlebars.js | Unnecessary dependency, overkill for simple substitution |
| Template literals | Requires eval(), security risk with user input |
| String.prototype.replace callbacks | Less readable, same performance as regex |
| Custom parser | Over-engineering, regex is sufficient |

**Implementation Pattern**:
```typescript
function substituteVariables(
  template: string,
  answers: Record<string, string | string[]>,
  projectDetails?: Record<string, any>
): string {
  return template.replace(/\{\{(\w+)(?::([^}]+))?\}\}/g, (match, key, defaultValue) => {
    // Priority: answers > projectDetails > defaultValue > placeholder
    const value = answers[key] || projectDetails?.[key] || defaultValue;

    if (Array.isArray(value)) {
      return value.join(', '); // Multi-select joins with comma
    }

    return value || `[${key}]`; // Fallback to placeholder
  });
}
```

**Variable Syntax Examples**:
```
{{building_scale}}           → Simple substitution
{{nathers_rating:8}}         → With default value (8)
{{address}}                  → From project details
{{scope_list}}               → Multi-select (joins array)
```

**Edge Cases Handled**:
- Missing variables: Display `[variable_name]` placeholder in preview
- Array values (multi-select): Join with `", "` separator
- Nested objects: Not supported (flat key structure only)
- Default values: Optional `:default` syntax (e.g., `{{rating:5}}`)

---

## 2. Conditional Logic Implementation (Variations Mechanism)

### Decision: Nested Object Variations by Question Answer

**Rationale**:
- Enables context-specific objective text based on user answers
- Clean JSON structure without complex templating logic
- Single source of truth (no code changes needed for new variations)
- Supports deep variations (multiple condition layers)

**Template Structure**:
```typescript
interface ObjectiveTemplate {
  functional: string;
  quality: string;
  budget: string;
  program: string;
  variations?: {
    [questionKey: string]: {  // e.g., "purpose"
      [answerValue: string]: Partial<ObjectiveTemplate>;  // e.g., "acquisition"
    }
  }
}
```

**Example from objectivesTemplates-v2.json**:
```json
{
  "due-diligence": {
    "functional": {
      "template": "Complete a comprehensive assessment...",
      "variations": {
        "purpose": {
          "acquisition": "Support the acquisition decision by identifying material risks...",
          "disposal": "Prepare the asset for sale by identifying issues that may impact value...",
          "capex": "Develop a prioritised capital works program..."
        }
      }
    }
  }
}
```

**Processing Logic**:
```typescript
function applyVariations(
  baseTemplate: ObjectiveTemplate,
  answers: Record<string, string | string[]>
): ObjectiveTemplate {
  let result = { ...baseTemplate };

  if (baseTemplate.variations) {
    for (const [questionKey, valueMap] of Object.entries(baseTemplate.variations)) {
      const answerValue = answers[questionKey];

      // Apply variation if answer matches
      if (answerValue && valueMap[answerValue]) {
        result = { ...result, ...valueMap[answerValue] };
      }
    }
  }

  return result;
}
```

**Variation Precedence**:
1. Base template text
2. First-level variation (e.g., `purpose`)
3. Second-level variation (e.g., `quality_level` within `purpose`)
4. Later variations override earlier ones

**Alternatives Considered**:

| Approach | Rejected Because |
|----------|------------------|
| Conditional tags `{{#if purpose=acquisition}}...{{/if}}` | Requires template parser, complex syntax |
| Multiple template files per variation | File explosion, hard to maintain |
| JavaScript expressions in templates | Security risk, hard to validate |
| Database-stored logic | Over-engineering, loses single source of truth |

---

## 3. Duration Factor Formulas for Program Phase Generation

### Decision: Multiplicative Duration Factors with Question-Based Lookup

**Rationale**:
- Different project scales and urgencies affect timeline linearly
- Base durations from template, multipliers from question answers
- Supports multiple factors (scale × urgency × complexity)
- Round up to ensure realistic timelines

**Duration Factor Structure**:
```typescript
interface DurationFactor {
  question_key: string;      // e.g., "building_scale", "urgency"
  value_multipliers: {
    [answerValue: string]: number;  // e.g., "small": 0.6, "large": 1.3
  };
}
```

**Example from programTemplates-v2.json**:
```json
{
  "house": {
    "durationFactors": {
      "building_scale": {
        "small": 0.6,
        "medium": 1.0,
        "large": 1.3,
        "luxury": 1.8
      },
      "urgency": {
        "urgent": 0.5,
        "standard": 1.0,
        "comprehensive": 2.0
      }
    },
    "phases": [
      {
        "name": "Concept Design",
        "duration": { "weeks": 4 }
      }
    ]
  }
}
```

**Calculation Formula**:
```typescript
function calculateDuration(
  baseDurationWeeks: number,
  factors: DurationFactor[],
  answers: Record<string, string>
): number {
  let multiplier = 1.0;

  for (const factor of factors) {
    const answerValue = answers[factor.question_key];
    if (answerValue && factor.value_multipliers[answerValue]) {
      multiplier *= factor.value_multipliers[answerValue];
    }
  }

  // Round up to ensure realistic durations (no 1.3 weeks, round to 2)
  return Math.ceil(baseDurationWeeks * multiplier);
}
```

**Example Calculation**:
```
Base duration: 4 weeks (Concept Design)
Building scale: "large" → 1.3x multiplier
Urgency: "standard" → 1.0x multiplier

Final duration = ceil(4 × 1.3 × 1.0) = ceil(5.2) = 6 weeks
```

**Date Calculation**:
```typescript
function calculatePhaseEndDate(
  startDate: Date,
  durationWeeks: number
): Date {
  const endDate = new Date(startDate);
  endDate.setDate(endDate.getDate() + (durationWeeks * 7));
  return endDate;
}

// Sequential phases
let currentStartDate = projectStartDate || new Date();

for (const phase of phases) {
  const duration = calculateDuration(phase.duration.weeks, factors, answers);
  const endDate = calculatePhaseEndDate(currentStartDate, duration);

  activities.push({
    name: phase.name,
    startDate: currentStartDate.toISOString(),
    endDate: endDate.toISOString(),
    sortOrder: phase.order
  });

  // Next phase starts when current ends
  currentStartDate = new Date(endDate);
  currentStartDate.setDate(currentStartDate.getDate() + 1);
}
```

**Alternatives Considered**:

| Approach | Rejected Because |
|----------|------------------|
| Additive factors (+2 weeks, +4 weeks) | Non-linear scaling, doesn't work for all project sizes |
| Fixed durations per type | No flexibility for project variations |
| AI-generated durations | Unpredictable, hard to validate, no user control |
| Calendar day calculation | Week-based is standard in construction industry |

---

## 4. Budget Calculation Formulas from Benchmark Rates

### Decision: Multi-Basis Calculation (GFA, Units, Fixed) with Metadata

**Rationale**:
- Different cost items have different calculation bases
- GFA (Gross Floor Area) for area-based costs
- Units for per-dwelling costs
- Fixed amounts for flat fees
- All calculations in cents to avoid floating point errors

**Benchmark Rate Structure**:
```typescript
interface BenchmarkRate {
  project_type: string;
  calculation_basis: 'gfa' | 'units' | 'fixed';
  rate_per_unit_cents?: number;  // For GFA or units
  fixed_amount_cents?: number;   // For fixed fees
  section: 'FEES' | 'CONSULTANTS' | 'CONSTRUCTION' | 'CONTINGENCY';
  activity: string;
  costCode?: string;
}
```

**Example from costPlanTemplates-v2.json**:
```json
{
  "benchmarkRates": {
    "house": [
      {
        "section": "CONSULTANTS",
        "activity": "Architectural Services",
        "calculation_basis": "gfa",
        "rate_per_unit_cents": 25000,
        "quality_multipliers": {
          "standard": 1.0,
          "quality": 1.2,
          "luxury": 1.5
        }
      },
      {
        "section": "CONSTRUCTION",
        "activity": "Building Works",
        "calculation_basis": "gfa",
        "rate_per_unit_cents": 280000,
        "quality_multipliers": {
          "standard": 1.0,
          "quality": 1.3,
          "luxury": 1.8
        }
      },
      {
        "section": "FEES",
        "activity": "Development Application Fees",
        "calculation_basis": "fixed",
        "fixed_amount_cents": 500000
      }
    ]
  }
}
```

**Calculation Formula**:
```typescript
function calculateBudget(
  rate: BenchmarkRate,
  answers: Record<string, string>
): number {
  let baseCents = 0;

  // 1. Calculate base amount
  if (rate.calculation_basis === 'gfa' && rate.rate_per_unit_cents) {
    const gfa = parseFloat(answers.gfa || '0');
    baseCents = Math.round(gfa * rate.rate_per_unit_cents);
  }
  else if (rate.calculation_basis === 'units' && rate.rate_per_unit_cents) {
    const units = parseFloat(answers.number_of_units || '0');
    baseCents = Math.round(units * rate.rate_per_unit_cents);
  }
  else if (rate.calculation_basis === 'fixed' && rate.fixed_amount_cents) {
    baseCents = rate.fixed_amount_cents;
  }

  // 2. Apply quality/location multipliers
  let multiplier = 1.0;

  if (rate.quality_multipliers && answers.quality_level) {
    multiplier *= rate.quality_multipliers[answers.quality_level] || 1.0;
  }

  if (rate.location_multipliers && answers.location) {
    multiplier *= rate.location_multipliers[answers.location] || 1.0;
  }

  // 3. Apply contingency (for CONTINGENCY section)
  if (rate.section === 'CONTINGENCY' && rate.contingency_percentage) {
    // Contingency is % of total construction cost
    const constructionTotal = getTotalBySection('CONSTRUCTION');
    baseCents = Math.round(constructionTotal * rate.contingency_percentage / 100);
  }

  return Math.round(baseCents * multiplier);
}
```

**Example Calculation**:
```
Project: House
GFA: 250 sqm
Quality Level: "quality"

Architectural Services:
  Base rate: $250/sqm = 25000 cents/sqm
  Calculation: 250 sqm × 25000 = 6,250,000 cents
  Quality multiplier: 1.2x
  Final: 6,250,000 × 1.2 = 7,500,000 cents = $75,000

Building Works:
  Base rate: $2,800/sqm = 280000 cents/sqm
  Calculation: 250 sqm × 280000 = 70,000,000 cents
  Quality multiplier: 1.3x
  Final: 70,000,000 × 1.3 = 91,000,000 cents = $910,000
```

**Currency Handling**:
- All database storage in cents (integer)
- Display conversion: `cents / 100`
- Input parsing: `parseFloat(input) * 100`
- Prevents rounding errors (0.1 + 0.2 = 0.30000000000000004)

**Alternatives Considered**:

| Approach | Rejected Because |
|----------|------------------|
| Floating point dollars | Rounding errors accumulate in calculations |
| AI cost estimation | Unpredictable, requires training data, no transparency |
| External API (e.g., Cordell) | Dependency, cost, API rate limits |
| User manual entry only | Defeats purpose of automation |

---

## 5. JSON Schema Validation Approach

### Decision: Runtime Validation with TypeScript Type Guards

**Rationale**:
- Type safety at compile time (TypeScript interfaces)
- Runtime validation when loading JSON files
- Early error detection before initialization
- User-friendly error messages for malformed templates

**Validation Strategy**:
```typescript
// Type definition
interface ProjectType {
  id: string;
  name: string;
  icon: string;
  category: string;
  description: string;
  quickSetupQuestions: QuickSetupQuestion[];
}

// Runtime validator
function validateProjectTypes(data: unknown): ProjectType[] {
  if (!Array.isArray(data)) {
    throw new Error('Invalid project types: expected array');
  }

  for (let i = 0; i < data.length; i++) {
    const item = data[i];

    // Required fields
    if (!item.id || typeof item.id !== 'string') {
      throw new Error(`Invalid project type at index ${i}: missing or invalid 'id'`);
    }
    if (!item.name || typeof item.name !== 'string') {
      throw new Error(`Invalid project type at index ${i}: missing or invalid 'name'`);
    }
    if (!item.category || typeof item.category !== 'string') {
      throw new Error(`Invalid project type at index ${i}: missing or invalid 'category'`);
    }
    if (!Array.isArray(item.quickSetupQuestions)) {
      throw new Error(`Invalid project type '${item.id}': quickSetupQuestions must be array`);
    }
  }

  return data as ProjectType[];
}
```

**Loading Pattern**:
```typescript
export async function loadProjectTypes(): Promise<ProjectType[]> {
  try {
    const data = await import('@/lib/data/project-types.json');
    const validated = validateProjectTypes(data.projectTypes.types);
    return validated;
  } catch (error) {
    console.error('Failed to load project types:', error);
    throw new Error(
      'Template configuration error. Please contact support.',
      { cause: error }
    );
  }
}
```

**Validation Levels**:

| Level | What's Validated | When |
|-------|------------------|------|
| TypeScript compilation | Interface conformance | Build time |
| JSON parsing | Valid JSON syntax | Load time |
| Schema validation | Required fields, types | Load time |
| Business logic | Valid enum values, ranges | Initialization time |

**Alternatives Considered**:

| Approach | Rejected Because |
|----------|------------------|
| Zod schema validation | Additional dependency, learning curve |
| JSON Schema + Ajv | Complex setup, overkill for internal templates |
| No validation | Silent failures, hard to debug |
| Schema validation in CI | Doesn't catch runtime issues in production |

---

## 6. Error Handling Patterns

### Decision: Layered Error Handling with User-Friendly Messages

**Rationale**:
- Different error types require different handling
- User shouldn't see stack traces or technical jargon
- Errors should be logged for debugging but displayed gracefully
- Partial failures should allow retry without data loss

**Error Handling Layers**:

```typescript
// 1. File Loading Errors
try {
  const data = await import('@/lib/data/project-types.json');
} catch (error) {
  // User message: "Template data unavailable. Please contact support."
  // Log: Full error with stack trace
  logger.error('Failed to load project types', { error, path: 'project-types.json' });
  toast.error('Template data unavailable. Please contact support.');
  return;
}

// 2. Validation Errors
try {
  validateProjectTypes(data);
} catch (error) {
  // User message: "Configuration error. Please contact support."
  // Log: Validation failure details
  logger.error('Project types validation failed', { error, data });
  toast.error('Configuration error. Please contact support.');
  return;
}

// 3. Template Substitution Errors (non-critical)
const result = substituteVariables(template, answers);
if (result.includes('[')) {
  // User message: Shows placeholder in preview (e.g., "[address]")
  // Log: Warning about missing variable
  logger.warn('Template has missing variables', { template, missing: extractMissing(result) });
  // User can still proceed - they see the placeholder
}

// 4. API Initialization Errors (critical)
try {
  await initializeProject({ projectType, objectives, answers });
  toast.success('Project initialized successfully');
} catch (error) {
  // User message: "Initialization failed. Please try again."
  // Log: Full error context
  logger.error('Project initialization failed', {
    error,
    projectId,
    projectType,
    answers
  });
  toast.error('Initialization failed. Please try again.');
  // Transaction automatically rolled back (PostgreSQL)
}
```

**Fallback Behavior Table**:

| Error Scenario | User Experience | Technical Handling |
|----------------|-----------------|-------------------|
| JSON file missing | Toast: "Template data unavailable. Contact support." | Log error, disable wizard, return to Details |
| JSON parse error | Toast: "Configuration error. Contact support." | Log error with file path, disable wizard |
| Missing template variable | Display `[variable_name]` in preview | Substitute with placeholder, allow user to proceed |
| Invalid question answer | Highlight field, "Please select an option" | Prevent advancing to next step |
| API endpoint 500 error | Toast: "Failed to initialize. Please try again." | Rollback transaction, preserve modal state |
| Network timeout | Toast: "Request timed out. Please check connection." | Retry with exponential backoff |
| Partial initialization | Toast: "Initialization incomplete. Some data missing." | Log which step failed, allow retry |

**PostgreSQL Transaction Rollback**:
```typescript
// All initialization steps wrapped in single transaction
export async function POST(request: Request) {
  const db = await getDb();

  try {
    await db.transaction(async (tx) => {
      // Step 1: Update project type
      await tx.update(projects).set({ projectType }).where(eq(projects.id, projectId));

      // Step 2: Save objectives
      await tx.insert(projectObjectives).values({ projectId, ...objectives });

      // Step 3: Enable disciplines
      for (const discipline of enabledDisciplines) {
        await tx.update(consultantDisciplines)
          .set({ isEnabled: true })
          .where(and(
            eq(consultantDisciplines.projectId, projectId),
            eq(consultantDisciplines.disciplineName, discipline)
          ));
      }

      // Step 4: Create program activities
      await tx.insert(programActivities).values(generatedActivities);

      // Step 5: Create cost lines
      await tx.insert(costLines).values(generatedCostLines);
    });

    return NextResponse.json({ success: true });

  } catch (error) {
    // Transaction automatically rolls back - ALL changes reverted
    // User can safely retry without duplicate data
    logger.error('Initialization failed, transaction rolled back', { error, projectId });
    return NextResponse.json(
      { error: 'Initialization failed. No changes were made.' },
      { status: 500 }
    );
  }
}
```

**Advantages of PostgreSQL for Transactions**:
- ACID compliance guarantees atomicity
- Better isolation levels than SQLite (prevents concurrent access issues)
- More robust constraint validation
- Row-level locking prevents race conditions
- Transaction log for recovery if needed

---

## Research Conclusions

### Key Decisions Summary

| Area | Decision | Rationale |
|------|----------|-----------|
| Template Substitution | Regex-based `{{variable}}` | Simple, performant, no dependencies |
| Conditional Logic | Nested object variations | Clean JSON structure, maintainable |
| Duration Calculation | Multiplicative factors | Linear scaling, realistic timelines |
| Budget Calculation | Multi-basis (GFA/Units/Fixed) in cents | Industry-standard, no rounding errors |
| JSON Validation | Runtime type guards | Type safety + runtime safety |
| Error Handling | Layered with user-friendly messages | Graceful degradation, debuggable |
| Database | PostgreSQL transactions | ACID compliance, robust rollback |

### Performance Characteristics

| Operation | Expected Time | Optimization Strategy |
|-----------|---------------|----------------------|
| Template loading | < 100ms | Dynamic import, browser caching |
| Variable substitution | < 10ms per objective | Regex is O(n), pre-compile if needed |
| Duration calculation | < 5ms per phase | Simple arithmetic, no external calls |
| Budget calculation | < 20ms for full cost plan | Batch calculations, memoize rates |
| JSON validation | < 50ms | Lazy validation, cache results |
| Total initialization | < 2 seconds | Transaction-based, parallel API calls |

### Security Considerations

1. **Template Injection**: Templates are static JSON files (no user input), no risk
2. **XSS Prevention**: All variables sanitized before rendering (React automatic escaping)
3. **SQL Injection**: Drizzle ORM parameterized queries, no raw SQL
4. **File Access**: Templates served from known paths only (no user path input)
5. **Transaction Integrity**: PostgreSQL prevents partial writes on failure

### Future Research Areas

1. **Template Versioning**: How to migrate projects when templates change?
2. **AI Refinement**: Can GPT-4 improve generated objectives based on project context?
3. **Template Inheritance**: Should project types inherit from base templates?
4. **Localization**: How to support multiple jurisdictions (NSW vs VIC vs QLD)?
5. **Custom Templates**: Should users be able to create custom project types?

These areas are out of scope for Phase 1 but should be considered for future iterations.
