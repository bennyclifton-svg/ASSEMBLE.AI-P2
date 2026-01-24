# Quickstart Guide: Project Initiator

**Feature**: 018-project-initiator
**Date**: 2025-12-20

## Overview

This guide provides practical examples for developers implementing and extending the Project Initiator feature.

---

## Table of Contents

1. [Adding a New Project Type](#1-adding-a-new-project-type)
2. [Modifying Objective Templates](#2-modifying-objective-templates)
3. [Testing Template Substitution Locally](#3-testing-template-substitution-locally)
4. [Example Workflow: Type Selection → Initialization → Verification](#4-example-workflow)
5. [Common Troubleshooting Scenarios](#5-common-troubleshooting-scenarios)

---

## 1. Adding a New Project Type

### Scenario

You need to add a new project type: "Data Centre" for industrial projects.

### Steps

#### 1.1 Add to projectTypes-v2.json

**File**: `d:\assemble.ai P2\Project Initiator\projectTypes-v2.json`

```json
{
  "projectTypes": {
    "types": [
      // ... existing types ...
      {
        "id": "data-centre",
        "name": "Data Centre",
        "icon": "server",
        "category": "Industrial",
        "description": "Mission-critical data hosting and cloud infrastructure facilities",
        "defaultDuration": { "weeks": 104, "phases": ["Design", "Construction"] },
        "typicalBudgetRange": { "min": 50000000, "max": 500000000, "currency": "AUD" },
        "exclusions": ["IT equipment", "Telecommunications infrastructure", "Ongoing operations"],
        "quickSetupQuestions": [
          {
            "id": "location",
            "question": "Where is the data centre located?",
            "type": "single",
            "required": true,
            "options": [
              { "value": "sydney_cbd", "label": "Sydney CBD", "locationMultiplier": 1.20 },
              { "value": "sydney_metro", "label": "Sydney Metropolitan", "locationMultiplier": 1.00 },
              { "value": "sydney_outer", "label": "Sydney Outer", "locationMultiplier": 0.95 },
              { "value": "regional_nsw", "label": "Regional NSW", "locationMultiplier": 0.85 }
            ]
          },
          {
            "id": "tier_level",
            "question": "What is the target Tier certification?",
            "type": "single",
            "required": true,
            "options": [
              { "value": "tier_2", "label": "Tier II (99.741% uptime)", "costMultiplier": 1.0 },
              { "value": "tier_3", "label": "Tier III (99.982% uptime)", "costMultiplier": 1.3 },
              { "value": "tier_4", "label": "Tier IV (99.995% uptime)", "costMultiplier": 1.8 }
            ]
          },
          {
            "id": "capacity",
            "question": "What is the target IT load capacity?",
            "type": "single",
            "required": true,
            "options": [
              { "value": "small", "label": "< 5 MW", "durationMultiplier": 0.8 },
              { "value": "medium", "label": "5-20 MW", "durationMultiplier": 1.0 },
              { "value": "large", "label": "20-50 MW", "durationMultiplier": 1.4 },
              { "value": "hyperscale", "label": "> 50 MW", "durationMultiplier": 2.0 }
            ]
          },
          {
            "id": "certifications",
            "question": "Select all required certifications:",
            "type": "multiple",
            "required": false,
            "options": [
              { "value": "uptime_institute", "label": "Uptime Institute Tier Certification" },
              { "value": "leed", "label": "LEED Data Centre Certification" },
              { "value": "nabers", "label": "NABERS for Data Centres" },
              { "value": "iso27001", "label": "ISO 27001 (Information Security)" },
              { "value": "soc2", "label": "SOC 2 Compliance" }
            ]
          }
        ]
      }
    ]
  }
}
```

#### 1.2 Add Objective Template

**File**: `d:\assemble.ai P2\Project Initiator\objectivesTemplates-v2.json`

```json
{
  "objectivesTemplates": {
    "data-centre": {
      "functional": {
        "template": "Deliver a {{tier_level}} compliant data centre facility at {{address}} with {{capacity}} IT load capacity. Provide secure, resilient, and scalable infrastructure for mission-critical workloads. Design for {{certifications_list}} certifications. Include redundant power distribution (N+1 minimum), precision cooling systems, and physical security infrastructure.",
        "variations": {
          "tier_level": {
            "tier_2": "Deliver a Tier II (Basic Capacity) data centre with 99.741% uptime guarantee. Provide partial redundancy in power and cooling distribution paths.",
            "tier_3": "Deliver a Tier III (Concurrently Maintainable) data centre with 99.982% uptime guarantee. Provide dual power and cooling distribution paths with N+1 redundancy.",
            "tier_4": "Deliver a Tier IV (Fault Tolerant) data centre with 99.995% uptime guarantee. Provide fully redundant 2N architecture with compartmentalized fault tolerance."
          }
        }
      },
      "quality": {
        "template": "Engage specialist data centre consultants with proven track record in {{tier_level}} facilities. Electrical and mechanical systems to be designed by Chartered Engineers with data centre specialization. All critical systems to include factory acceptance testing (FAT) and site acceptance testing (SAT). Engage Tier Design Certification contractor for independent peer review. All materials to meet fire, seismic, and environmental specifications for data centre environments."
      },
      "budget": {
        "template": "Total project budget of ${{budget}} (excluding GST and IT equipment). Building shell and core: {{shell_core_cost}}. Electrical infrastructure (UPS, generators, switchgear): {{electrical_cost}}. Mechanical infrastructure (CRAC, chillers, cooling towers): {{mechanical_cost}}. Fire protection and security: {{fire_security_cost}}. Professional fees: {{consultant_fees}}. Contingency: 10% (given complexity and long-lead equipment). Achieve target PUE (Power Usage Effectiveness) of {{target_pue:1.3}} or better."
      },
      "program": {
        "template": "Complete detailed design within {{design_weeks}} weeks. Procure long-lead equipment (generators, UPS, chillers) within {{procurement_weeks}} weeks. Construction phase: {{construction_weeks}} weeks. Commissioning and testing: {{commissioning_weeks}} weeks. Achieve Tier certification prior to operational handover. Total program: {{total_weeks}} weeks from project start to operational readiness."
      }
    }
  }
}
```

#### 1.3 Add to Database Enum

**File**: `src/lib/db/schema.ts` (line 94)

```typescript
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
    'hotel-accommodation',
    'data-centre'  // ADD THIS LINE
  ]
}),
```

#### 1.4 Run Migration

**Create Migration File**: `scripts/run-migration-0023.js`

```javascript
const { drizzle } = require('drizzle-orm/postgres-js');
const postgres = require('postgres');
const { sql } = require('drizzle-orm');

async function up() {
  const connectionString = process.env.DATABASE_URL;
  const client = postgres(connectionString);
  const db = drizzle(client);

  console.log('Migration 0023: Adding data-centre to projectType enum...');

  await db.execute(sql`
    ALTER TYPE project_type_enum ADD VALUE IF NOT EXISTS 'data-centre';
  `);

  console.log('✅ Migration 0023 complete');
  await client.end();
}

up().catch((error) => {
  console.error('❌ Migration 0023 failed:', error);
  process.exit(1);
});
```

**Run Migration**:
```bash
node scripts/run-migration-0023.js
```

#### 1.5 Test

```bash
# 1. Verify JSON loads without errors
npm run dev

# 2. Navigate to Planning → Details → "Project Type: Not Set"
# 3. Filter by "Industrial" category
# 4. Verify "Data Centre" appears in grid
# 5. Select and answer questions
# 6. Verify objectives generate correctly
```

---

## 2. Modifying Objective Templates

### Scenario

You need to update the "House" functional objective to include accessibility requirements.

### Steps

#### 2.1 Locate Template

**File**: `d:\assemble.ai P2\Project Initiator\objectivesTemplates-v2.json`

Find the "house" section:
```json
{
  "house": {
    "functional": {
      "template": "Deliver a {{quality_level}} {{dwelling_size}} {{project_scope}} at {{address}}. {{bedroom_config}} {{special_requirements_text}} Design to maximise natural light, cross ventilation, and connection to outdoor living areas while ensuring privacy from neighbouring properties.",
      "bedroom_configs": {
        "small": "Provide 2-3 bedrooms...",
        "medium": "Provide 3-4 bedrooms...",
        "large": "Provide 4-5 bedrooms...",
        "luxury": "Provide 5+ bedrooms..."
      }
    }
  }
}
```

#### 2.2 Add Accessibility Text

Modify template to include accessibility:
```json
{
  "house": {
    "functional": {
      "template": "Deliver a {{quality_level}} {{dwelling_size}} {{project_scope}} at {{address}}. {{bedroom_config}} {{special_requirements_text}} {{accessibility_requirements}} Design to maximise natural light, cross ventilation, and connection to outdoor living areas while ensuring privacy from neighbouring properties.",
      "bedroom_configs": {
        // ... existing configs ...
      }
    },
    "sustainability": {
      "template": "{{ncc_compliance}} {{sustainability_target}} {{accessibility_text}} Incorporate all-electric design..."
    }
  }
}
```

#### 2.3 Add Common Placeholder

In the `common_placeholders` section:
```json
{
  "common_placeholders": {
    "accessibility": {
      "livable_silver": "Achieve Livable Housing Design Guidelines Silver level (NCC 2022 mandatory minimum) including step-free access, wider doorways, and accessible bathroom.",
      "livable_gold": "Achieve Livable Housing Design Guidelines Gold level with enhanced accessibility features including level entry, 1200mm circulation spaces, and accessible bedroom/bathroom on entry level.",
      "full_accessible": "Design for full accessibility compliance including wheelchair access throughout, lift provision (if multi-level), accessible kitchen, and adaptable fixtures."
    }
  }
}
```

#### 2.4 Update Question Options

In `projectTypes-v2.json`, add accessibility question to "house" type:
```json
{
  "id": "house",
  "quickSetupQuestions": [
    // ... existing questions ...
    {
      "id": "accessibility",
      "question": "What level of accessibility is required?",
      "type": "single",
      "required": false,
      "options": [
        { "value": "livable_silver", "label": "Livable Housing Silver (NCC Minimum)" },
        { "value": "livable_gold", "label": "Livable Housing Gold" },
        { "value": "full_accessible", "label": "Full Wheelchair Accessibility" }
      ]
    }
  ]
}
```

#### 2.5 Test Changes

```bash
# 1. Restart dev server to reload JSON
npm run dev

# 2. Create new project, select "House" type
# 3. Answer accessibility question
# 4. Verify functional objective includes accessibility text
# 5. Verify template substitution works correctly
```

**Example Output**:
```
Deliver a quality medium-scale house at 123 Main Street. Provide 3-4 bedrooms including master suite, open plan living, double garage with EV provision. Achieve Livable Housing Design Guidelines Gold level with enhanced accessibility features including level entry, 1200mm circulation spaces, and accessible bedroom/bathroom on entry level. Design to maximise natural light...
```

---

## 3. Testing Template Substitution Locally

### Scenario

You want to test variable substitution without running the full initialization flow.

### Setup Test File

**Create**: `src/lib/utils/__tests__/template-substitution.test.ts`

```typescript
import { describe, it, expect } from 'vitest';
import { substituteVariables, applyVariations } from '../template-substitution';

describe('Template Substitution', () => {
  it('replaces simple variables', () => {
    const template = 'Deliver a {{quality_level}} house at {{address}}.';
    const answers = {
      quality_level: 'luxury',
      address: '123 Beach Road, Bondi'
    };

    const result = substituteVariables(template, answers);

    expect(result).toBe('Deliver a luxury house at 123 Beach Road, Bondi.');
  });

  it('handles missing variables with placeholder', () => {
    const template = 'Budget: ${{budget}} at {{address}}.';
    const answers = {
      budget: '2000000'
    };

    const result = substituteVariables(template, answers);

    expect(result).toBe('Budget: $2000000 at [address].');
  });

  it('uses default values when provided', () => {
    const template = 'Target {{nathers_rating:8}}-star NatHERS rating.';
    const answers = {}; // No answer provided

    const result = substituteVariables(template, answers);

    expect(result).toBe('Target 8-star NatHERS rating.');
  });

  it('joins multi-select arrays', () => {
    const template = 'Required assessments: {{scope_list}}.';
    const answers = {
      scope_list: ['Structural', 'Building Services', 'Fire Safety']
    };

    const result = substituteVariables(template, answers);

    expect(result).toBe('Required assessments: Structural, Building Services, Fire Safety.');
  });

  it('applies conditional variations', () => {
    const template = {
      functional: 'Base functional text.',
      variations: {
        purpose: {
          acquisition: 'Acquisition-specific text.',
          disposal: 'Disposal-specific text.'
        }
      }
    };

    const answers = { purpose: 'acquisition' };
    const result = applyVariations(template, answers);

    expect(result.functional).toBe('Acquisition-specific text.');
  });

  it('handles nested variations', () => {
    const template = {
      functional: 'Base text.',
      variations: {
        purpose: {
          acquisition: {
            functional: 'Acquisition text.',
            variations: {
              urgency: {
                urgent: 'Urgent acquisition text.'
              }
            }
          }
        }
      }
    };

    const answers = { purpose: 'acquisition', urgency: 'urgent' };
    const result = applyVariations(template, answers);

    // First apply purpose variation, then urgency
    expect(result.functional).toContain('Urgent acquisition');
  });
});
```

### Run Tests

```bash
npm run test src/lib/utils/__tests__/template-substitution.test.ts
```

### Manual Testing in Browser Console

Open browser console in dev environment:

```javascript
// Load template substitution utility
const { substituteVariables } = await import('/src/lib/utils/template-substitution.ts');

// Test case 1: Simple substitution
const template1 = "Deliver a {{quality_level}} house at {{address}}.";
const answers1 = { quality_level: 'luxury', address: '123 Beach Rd' };
console.log(substituteVariables(template1, answers1));
// Output: "Deliver a luxury house at 123 Beach Rd."

// Test case 2: Missing variable
const template2 = "Budget: ${{budget}} at {{location}}.";
const answers2 = { budget: '2000000' };
console.log(substituteVariables(template2, answers2));
// Output: "Budget: $2000000 at [location]."

// Test case 3: Default value
const template3 = "Target {{rating:8}}-star rating.";
const answers3 = {};
console.log(substituteVariables(template3, answers3));
// Output: "Target 8-star rating."
```

---

## 4. Example Workflow

### Complete Flow: Type Selection → Initialization → Verification

#### Step 1: User Creates Project

```bash
# User clicks "New Project" in dashboard
POST /api/projects/create
{
  "name": "Bondi Beach House",
  "code": "BBH-001"
}

# Response
{
  "id": "proj_abc123",
  "name": "Bondi Beach House",
  "code": "BBH-001",
  "projectType": null  // Not set yet
}
```

#### Step 2: User Opens Project Initiator

```typescript
// User navigates to Planning → Details → clicks "Project Type: Not Set"
// Modal opens, loads project types

async function loadProjectTypes() {
  const data = await import('@/lib/data/project-types.json');
  return data.projectTypes.types;
}

// Display grid of 12 types, filtered by category
const types = await loadProjectTypes();
const residentialTypes = types.filter(t => t.category === 'Residential');

// User sees: House, Apartments, Townhouses, Seniors Living, Student Housing
```

#### Step 3: User Selects Type and Answers Questions

```typescript
// User selects "House"
const selectedType = types.find(t => t.id === 'house');

// Load questions
const questions = selectedType.quickSetupQuestions;

// User answers:
const answers = {
  location: 'sydney_metro',
  building_scale: 'medium',
  quality_level: 'quality',
  gfa: '250',
  dwelling_type: 'single_storey',
  project_scope: 'new_build'
};
```

#### Step 4: Generate Objectives Preview

```typescript
// Load objective template
const objectiveTemplates = await import('@/lib/data/objective-templates.json');
const template = objectiveTemplates.objectivesTemplates.house;

// Apply variations
const variedTemplate = applyVariations(template, answers);

// Substitute variables
const objectives = {
  functional: substituteVariables(variedTemplate.functional.template, answers, projectDetails),
  quality: substituteVariables(variedTemplate.quality.template, answers, projectDetails),
  budget: substituteVariables(variedTemplate.budget.template, answers, projectDetails),
  program: substituteVariables(variedTemplate.program.template, answers, projectDetails)
};

// User sees preview in modal:
console.log(objectives.functional);
// "Deliver a quality medium-scale house at 123 Beach Road. Provide 3-4 bedrooms..."

// User can edit before applying
```

#### Step 5: User Clicks "Apply" → Initialization

```typescript
// POST /api/planning/[projectId]/initialize
const response = await fetch(`/api/planning/${projectId}/initialize`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    projectType: 'house',
    answers,
    objectives
  })
});

// API route (server-side):
export async function POST(request: Request) {
  const { projectType, answers, objectives } = await request.json();
  const db = await getDb();

  try {
    await db.transaction(async (tx) => {
      // 1. Update project type
      await tx.update(projects)
        .set({ projectType })
        .where(eq(projects.id, projectId));

      // 2. Insert objectives
      await tx.insert(projectObjectives).values({
        id: createId(),
        projectId,
        functional: objectives.functional,
        quality: objectives.quality,
        budget: objectives.budget,
        program: objectives.program
      });

      // 3. Enable disciplines
      const enabledDisciplines = getEnabledDisciplines('house', consultantTemplates);
      for (const disciplineName of enabledDisciplines) {
        await tx.update(consultantDisciplines)
          .set({
            isEnabled: true,
            briefServices: getDisciplineServices(disciplineName),
            briefDeliverables: getDisciplineDeliverables(disciplineName)
          })
          .where(and(
            eq(consultantDisciplines.projectId, projectId),
            eq(consultantDisciplines.disciplineName, disciplineName)
          ));
      }

      // 4. Generate program phases
      const programPhases = generateProgramPhases('house', answers);
      await tx.insert(programActivities).values(programPhases);

      // 5. Generate cost plan
      const costPlan = generateCostPlan('house', answers);
      await tx.insert(costLines).values(costPlan);
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    // Transaction rolls back automatically
    console.error('Initialization failed:', error);
    return NextResponse.json({ error: 'Initialization failed' }, { status: 500 });
  }
}
```

#### Step 6: Verify Results

```typescript
// After initialization, verify data was created

// 1. Check project type set
const project = await db.query.projects.findFirst({
  where: eq(projects.id, projectId)
});
console.log(project.projectType); // "house"

// 2. Check objectives created
const objectives = await db.query.projectObjectives.findFirst({
  where: eq(projectObjectives.projectId, projectId)
});
console.log(objectives.functional.substring(0, 50)); // "Deliver a quality medium-scale house at 123 Beach..."

// 3. Check disciplines enabled
const disciplines = await db.query.consultantDisciplines.findMany({
  where: and(
    eq(consultantDisciplines.projectId, projectId),
    eq(consultantDisciplines.isEnabled, true)
  )
});
console.log(disciplines.map(d => d.disciplineName));
// ["Architect", "Structural Engineer", "Building Surveyor", "ESD Consultant", ...]

// 4. Check program activities created
const activities = await db.query.programActivities.findMany({
  where: eq(programActivities.projectId, projectId)
});
console.log(activities.length); // 24 activities (8 phases × 3 children avg)

// 5. Check cost plan created
const costs = await db.query.costLines.findMany({
  where: and(
    eq(costLines.projectId, projectId),
    isNull(costLines.deletedAt)
  )
});
console.log(costs.length); // 15 lines
console.log(costs.reduce((sum, c) => sum + c.budgetCents, 0) / 100); // $1,444,000
```

---

## 5. Common Troubleshooting Scenarios

### Issue 1: Template Variable Not Substituting

**Symptom**: Objective shows `[variable_name]` instead of value

**Possible Causes**:

1. **Variable name mismatch**
   ```typescript
   // Template uses: {{building_scale}}
   // Answers has: { buildingScale: 'medium' }  // Wrong! Underscore vs camelCase
   ```

   **Fix**: Ensure answer keys match template variable names exactly
   ```typescript
   const answers = { building_scale: 'medium' };  // Correct
   ```

2. **Question not marked required**
   ```json
   {
     "id": "building_scale",
     "required": false  // User skipped, no answer
   }
   ```

   **Fix**: Either make question required or provide default value
   ```typescript
   {{building_scale:medium}}  // Use :default syntax
   ```

3. **Answer not saved in state**
   ```typescript
   // Check React state
   console.log('Answers:', answers);
   // Should show: { building_scale: 'medium', ... }
   ```

### Issue 2: Variation Not Applying

**Symptom**: Expected variation text doesn't appear in objective

**Possible Causes**:

1. **Incorrect variation key**
   ```json
   "variations": {
     "project_purpose": {  // Wrong key
       "acquisition": "..."
     }
   }
   ```

   **Fix**: Match question ID exactly
   ```json
   "variations": {
     "purpose": {  // Match question id: "purpose"
       "acquisition": "..."
     }
   }
   ```

2. **Answer value doesn't match variation key**
   ```typescript
   // Answer: { purpose: 'Acquisition' }  // Capitalized
   // Variation key: "acquisition"        // Lowercase
   ```

   **Fix**: Ensure answer values match variation keys (case-sensitive)

3. **Variation not returning full object**
   ```json
   "variations": {
     "purpose": {
       "acquisition": "Just a string"  // Wrong! Should be object
     }
   }
   ```

   **Fix**: Return partial ObjectiveTemplate
   ```json
   "variations": {
     "purpose": {
       "acquisition": {
         "functional": "Acquisition-specific text"
       }
     }
   }
   ```

### Issue 3: Initialization Fails Partway

**Symptom**: Error message "Initialization failed", some data created but not all

**Diagnosis**:
```typescript
// Check which step failed
console.error('Initialization failed:', error);

// Common errors:
// - "Foreign key constraint failed" → Referenced entity doesn't exist
// - "Unique constraint violation" → Duplicate initialization attempt
// - "Column 'project_type' violates check constraint" → Invalid enum value
```

**Fix 1**: Ensure all referenced entities exist
```typescript
// Before initializing, verify project and disciplines exist
const project = await db.query.projects.findFirst({
  where: eq(projects.id, projectId)
});

if (!project) {
  throw new Error(`Project ${projectId} not found`);
}

const disciplines = await db.query.consultantDisciplines.findMany({
  where: eq(consultantDisciplines.projectId, projectId)
});

if (disciplines.length === 0) {
  throw new Error('No disciplines found for project');
}
```

**Fix 2**: Check for duplicate initialization
```typescript
// Check if objectives already exist
const existing = await db.query.projectObjectives.findFirst({
  where: eq(projectObjectives.projectId, projectId)
});

if (existing) {
  // Update instead of insert
  await tx.update(projectObjectives)
    .set({ functional, quality, budget, program })
    .where(eq(projectObjectives.projectId, projectId));
} else {
  await tx.insert(projectObjectives).values({ ... });
}
```

### Issue 4: Duration Calculation Incorrect

**Symptom**: Program phases have wrong dates or durations

**Diagnosis**:
```typescript
// Log duration calculation
function calculateDuration(base, factors, answers) {
  console.log('Base duration:', base);
  console.log('Factors:', factors);
  console.log('Answers:', answers);

  let multiplier = 1.0;
  for (const factor of factors) {
    const value = answers[factor.question_key];
    console.log(`Factor ${factor.question_key}: ${value} → ${factor.value_multipliers[value]}`);
    multiplier *= factor.value_multipliers[value] || 1.0;
  }

  const result = Math.ceil(base * multiplier);
  console.log('Final duration:', result);
  return result;
}
```

**Common Issues**:

1. **Missing duration factor in template**
   ```json
   // programTemplates.json missing durationFactors
   {
     "house": {
       // Missing: "durationFactors": { ... }
       "phases": [ ... ]
     }
   }
   ```

   **Fix**: Add duration factors to template

2. **Date calculation off by one**
   ```typescript
   // Wrong: Phases overlap
   currentStartDate = new Date(endDate);

   // Correct: Start next day
   currentStartDate = new Date(endDate);
   currentStartDate.setDate(currentStartDate.getDate() + 1);
   ```

### Issue 5: Cost Plan Totals Don't Match Expected Budget

**Symptom**: Cost plan sum doesn't equal budget from answers

**Diagnosis**:
```typescript
// Log budget calculations
function calculateBudget(rate, answers) {
  console.log('Rate:', rate);
  console.log('Answers:', answers);

  const gfa = parseFloat(answers.gfa || '0');
  console.log('GFA:', gfa);

  const baseCents = gfa * rate.rate_per_unit_cents;
  console.log('Base cents:', baseCents);

  const multiplier = rate.quality_multipliers?.[answers.quality_level] || 1.0;
  console.log('Quality multiplier:', multiplier);

  const finalCents = Math.round(baseCents * multiplier);
  console.log('Final cents:', finalCents);

  return finalCents;
}
```

**Common Issues**:

1. **Contingency calculated on wrong base**
   ```typescript
   // Wrong: Contingency on grand total
   const contingency = totalCents * 0.05;

   // Correct: Contingency on construction only
   const constructionTotal = costLines
     .filter(l => l.section === 'CONSTRUCTION')
     .reduce((sum, l) => sum + l.budgetCents, 0);
   const contingency = constructionTotal * 0.05;
   ```

2. **Forgetting to apply multipliers**
   ```typescript
   // Missing location multiplier
   const finalCents = baseCents * qualityMultiplier * locationMultiplier;
   ```

3. **Integer overflow (unlikely but possible)**
   ```typescript
   // For very large projects
   const MAX_SAFE_INTEGER = Number.MAX_SAFE_INTEGER; // 9,007,199,254,740,991
   if (baseCents > MAX_SAFE_INTEGER) {
     console.warn('Budget exceeds safe integer range');
   }
   ```

---

## Development Tips

### Tip 1: Hot Reload JSON Changes

JSON files are loaded dynamically - restart dev server to see changes:

```bash
# After editing JSON template
Ctrl+C  # Stop dev server
npm run dev  # Restart
```

### Tip 2: Use Type Safety

Generate TypeScript types from JSON:

```bash
# Install quicktype
npm install -g quicktype

# Generate types from JSON
quicktype -s json -o src/lib/types/project-types.ts Project Initiator/projectTypes-v2.json
```

### Tip 3: Validate JSON Before Committing

```bash
# Use jsonlint or jq
cat "Project Initiator/projectTypes-v2.json" | jq .
# If valid, no error. If invalid, shows line number.
```

### Tip 4: Debug Transactions in PostgreSQL

```sql
-- Enable query logging
ALTER DATABASE assemble_dev SET log_statement = 'all';

-- View active transactions
SELECT * FROM pg_stat_activity WHERE state = 'active';

-- Check for locks
SELECT * FROM pg_locks WHERE NOT granted;
```

### Tip 5: Mock Template Data for Tests

```typescript
// src/lib/utils/__tests__/mocks.ts
export const mockProjectType = {
  id: 'house',
  name: 'House',
  category: 'Residential',
  quickSetupQuestions: [
    {
      id: 'building_scale',
      question: 'What is the building scale?',
      type: 'single',
      options: [
        { value: 'small', label: 'Small' },
        { value: 'medium', label: 'Medium' }
      ]
    }
  ]
};

export const mockAnswers = {
  building_scale: 'medium',
  quality_level: 'quality',
  gfa: '250'
};

export const mockObjectiveTemplate = {
  functional: 'Deliver a {{quality_level}} {{building_scale}} house.',
  quality: 'High quality construction.',
  budget: 'Budget: ${{budget}}',
  program: 'Complete in {{weeks}} weeks.'
};
```

---

## Additional Resources

- **Spec**: `specs/018-project-initiator/spec.md` - Full feature specification
- **Plan**: `specs/018-project-initiator/plan.md` - Implementation architecture
- **Tasks**: `specs/018-project-initiator/tasks.md` - Task breakdown
- **Research**: `specs/018-project-initiator/research.md` - Technical decisions
- **Data Model**: `specs/018-project-initiator/data-model.md` - Schema documentation
- **Templates**: `Project Initiator/*.json` - Source template files

---

## Quick Reference

### File Paths

```
Source Templates:
  Project Initiator/projectTypes-v2.json
  Project Initiator/objectivesTemplates-v2.json
  Project Initiator/consultantTemplates-v3.json
  Project Initiator/programTemplates-v2.json
  Project Initiator/costPlanTemplates-v2.json

Copy To (during implementation):
  src/lib/data/project-types.json
  src/lib/data/objective-templates.json
  src/lib/data/consultant-templates.json
  src/lib/data/program-templates.json
  src/lib/data/cost-plan-templates.json

Utilities:
  src/lib/utils/template-substitution.ts
  src/lib/utils/discipline-mapping.ts
  src/lib/utils/program-generation.ts
  src/lib/utils/cost-plan-generation.ts

Components:
  src/components/dashboard/planning/ProjectTypeField.tsx
  src/components/dashboard/planning/ProjectInitiatorModal.tsx
  src/components/dashboard/planning/TypeSelectionStep.tsx
  src/components/dashboard/planning/QuestionsStep.tsx
  src/components/dashboard/planning/ObjectivesPreviewStep.tsx

API Routes:
  src/app/api/planning/[projectId]/project-type/route.ts
  src/app/api/planning/[projectId]/initialize/route.ts
```

### Common Commands

```bash
# Start dev server
npm run dev

# Run tests
npm run test

# Run migration
node scripts/run-migration-XXXX.js

# Validate JSON
cat "file.json" | jq .

# Check database
psql $DATABASE_URL -c "SELECT * FROM projects WHERE project_type IS NOT NULL;"
```
