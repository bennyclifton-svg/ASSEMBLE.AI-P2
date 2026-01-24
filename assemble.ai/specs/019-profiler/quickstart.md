# Quickstart: Profiler Module Implementation

**Phase 1 Output** | **Date**: 2026-01-21

---

## Prerequisites

Before starting implementation, ensure you have:

- [ ] Read [spec.md](./spec.md) - Full feature specification
- [ ] Read [plan.md](./plan.md) - Implementation phases and requirements
- [ ] Read [data-model.md](./data-model.md) - Entity schemas and relationships
- [ ] Read [research.md](./research.md) - Technology decisions
- [ ] Reviewed [contracts/](./contracts/) - API specifications

---

## Quick Reference

### Key Files to Create

| File | Lines | Purpose |
|------|-------|---------|
| `src/components/profiler/ProfilerLayout.tsx` | <100 | Main layout component |
| `src/components/profiler/LeftNavigation.tsx` | ~80 | 4-section navigation |
| `src/components/profiler/ClassTypeSelector.tsx` | ~60 | 2-column class/type picker |
| `src/components/profiler/SubclassSelector.tsx` | ~100 | Multi-select for Mixed class |
| `src/components/profiler/ScaleInputs.tsx` | ~80 | Dynamic scale fields |
| `src/components/profiler/ComplexitySelector.tsx` | ~100 | Multi-dimensional selector |
| `src/components/profiler/ObjectivesSection.tsx` | ~120 | Generate/Manual/Polish modes |
| `src/components/profiler/SimpleMarkdownEditor.tsx` | <50 | Lightweight editor |
| `src/lib/data/profile-templates.json` | ~2000 | All templates data |

**Target**: <2000 total lines (excluding templates)

---

## Step 1: Database Setup

### 1.1 Create Migration

```bash
# Generate migration
cd assemble.ai
npx drizzle-kit generate:pg --name create_profiler_tables
```

### 1.2 Add Schema to pg-schema.ts

```typescript
// src/lib/db/pg-schema.ts

// Add imports
import { integer } from 'drizzle-orm/pg-core';

// Add tables (see data-model.md for full schema)
export const projectProfiles = pgTable('project_profiles', {
  // ... schema from data-model.md
});

export const profilerObjectives = pgTable('profiler_objectives', {
  // ... schema from data-model.md
});

export const profilePatterns = pgTable('profile_patterns', {
  // ... schema from data-model.md
});
```

### 1.3 Run Migration

```bash
npx drizzle-kit push:pg
```

---

## Step 2: Create Templates

### 2.1 Profile Templates Structure

Create `src/lib/data/profile-templates.json`:

```json
{
  "metadata": {
    "version": "1.0",
    "structure": "class → type → subclass → scale → complexity"
  },
  "buildingClasses": {
    "residential": {
      "label": "Residential",
      "icon": "home",
      "subclasses": [
        { "value": "house", "label": "House (Class 1a)" },
        { "value": "apartments", "label": "Apartments (Class 2)" },
        // ... see spec.md §3.2 for full list
      ],
      "scaleFields": {
        "default": [
          { "key": "levels", "label": "Levels", "type": "integer", "min": 1 }
        ],
        "aged_care_9c": [
          { "key": "beds", "label": "Total Beds", "type": "integer", "min": 1, "placeholder": "60-150" }
          // ... see spec.md §7.1 for full list
        ]
      },
      "complexityOptions": {
        "default": [...],
        "aged_care_9c": {
          "care_level": [...],
          "accommodation_model": [...]
        }
      }
    }
    // ... repeat for commercial, industrial, institution, mixed, infrastructure
  },
  "projectTypes": [
    { "value": "refurb", "label": "Refurb" },
    { "value": "extend", "label": "Extend" },
    { "value": "new", "label": "New" },
    { "value": "remediation", "label": "Remediation" },
    { "value": "advisory", "label": "Advisory" }
  ]
}
```

---

## Step 3: Create Core Components

### 3.1 ProfilerLayout.tsx (<100 lines)

```tsx
// src/components/profiler/ProfilerLayout.tsx
'use client';

import { useState } from 'react';
import { LeftNavigation } from './LeftNavigation';
import { ProfileSection } from './ProfileSection';
import { ObjectivesSection } from './ObjectivesSection';

type Section = 'details' | 'profile' | 'objectives' | 'stakeholders';

interface ProfilerLayoutProps {
  projectId: string;
}

export function ProfilerLayout({ projectId }: ProfilerLayoutProps) {
  const [activeSection, setActiveSection] = useState<Section>('profile');

  return (
    <div className="flex h-full">
      {/* Left Navigation (200-280px) */}
      <LeftNavigation
        activeSection={activeSection}
        onSectionChange={setActiveSection}
      />

      {/* Middle Panel */}
      <div className="flex-1 flex flex-col">
        {/* Tab Headers (dimmed during profiler) */}
        <div className="flex border-b opacity-50 pointer-events-none">
          <button className="px-4 py-2">Procurement</button>
          <button className="px-4 py-2">Cost Planning</button>
          <button className="px-4 py-2">Programme</button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-auto p-6">
          {activeSection === 'profile' && <ProfileSection projectId={projectId} />}
          {activeSection === 'objectives' && <ObjectivesSection projectId={projectId} />}
        </div>
      </div>
    </div>
  );
}
```

### 3.2 LeftNavigation.tsx

```tsx
// src/components/profiler/LeftNavigation.tsx
'use client';

import { cn } from '@/lib/utils';

const SECTIONS = [
  { id: 'details', label: 'Project Details', icon: '📋' },
  { id: 'profile', label: 'Profile', icon: '🏗️' },
  { id: 'objectives', label: 'Objectives', icon: '🎯' },
  { id: 'stakeholders', label: 'Stakeholders', icon: '👥', disabled: true },
] as const;

interface LeftNavigationProps {
  activeSection: string;
  onSectionChange: (section: string) => void;
  completionStatus?: Record<string, boolean>;
}

export function LeftNavigation({
  activeSection,
  onSectionChange,
  completionStatus = {},
}: LeftNavigationProps) {
  return (
    <nav className="w-64 border-r bg-muted/30 p-4">
      <div className="space-y-2">
        {SECTIONS.map((section) => (
          <button
            key={section.id}
            onClick={() => !section.disabled && onSectionChange(section.id)}
            disabled={section.disabled}
            className={cn(
              'w-full flex items-center gap-3 px-3 py-2 rounded-md text-left',
              activeSection === section.id && 'bg-primary text-primary-foreground',
              section.disabled && 'opacity-50 cursor-not-allowed'
            )}
          >
            <span>{section.icon}</span>
            <span>{section.label}</span>
            {completionStatus[section.id] && (
              <span className="ml-auto">✓</span>
            )}
          </button>
        ))}
      </div>
    </nav>
  );
}
```

### 3.3 Key Component Patterns

**Data-Driven Selection (CODE-002)**:
```tsx
// Load options from templates, not hardcoded JSX
import templates from '@/lib/data/profile-templates.json';

const subclasses = templates.buildingClasses[buildingClass].subclasses;
```

**Progressive Disclosure (POWER-017)**:
```tsx
// Show complexity only after subclass selected
{subclass && <ComplexitySelector class={buildingClass} subclass={subclass} />}
```

**Multi-Select for Mixed Only (SUB-004)**:
```tsx
<SubclassSelector
  options={subclasses}
  multiSelect={buildingClass === 'mixed'}
  maxSelections={4}
/>
```

---

## Step 4: Create API Routes

### 4.1 Profile Save Endpoint

```typescript
// src/app/api/planning/[projectId]/profile/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { projectProfiles } from '@/lib/db/pg-schema';
import { profileSchema } from '@/lib/validation/profile';

export async function POST(
  request: NextRequest,
  { params }: { params: { projectId: string } }
) {
  const body = await request.json();

  // Validate input
  const parsed = profileSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({
      success: false,
      error: { code: 'VALIDATION_ERROR', details: parsed.error.errors }
    }, { status: 400 });
  }

  // Upsert profile
  const profile = await db.insert(projectProfiles)
    .values({
      projectId: params.projectId,
      ...parsed.data,
    })
    .onConflictDoUpdate({
      target: projectProfiles.projectId,
      set: {
        ...parsed.data,
        updatedAt: new Date(),
      },
    })
    .returning();

  return NextResponse.json({
    success: true,
    data: profile[0],
  });
}
```

### 4.2 Objectives Generate Endpoint

```typescript
// src/app/api/planning/[projectId]/objectives/generate/route.ts

export async function POST(
  request: NextRequest,
  { params }: { params: { projectId: string } }
) {
  const { profileId } = await request.json();

  // Load profile
  const profile = await db.query.projectProfiles.findFirst({
    where: eq(projectProfiles.id, profileId),
  });

  if (!profile) {
    return NextResponse.json({
      success: false,
      error: { code: 'NOT_FOUND', message: 'Profile not found' }
    }, { status: 404 });
  }

  // Generate objectives using template substitution
  const templates = await loadObjectiveTemplates();
  const template = templates.profiler.functionalQuality[profile.buildingClass][profile.projectType];

  const functionalQuality = substituteVariables(template, {
    subclass: profile.subclass[0],
    ...profile.scaleData,
    complexity: Object.values(profile.complexity).join(', '),
  });

  // ... similar for planningCompliance

  return NextResponse.json({
    success: true,
    data: {
      functionalQuality,
      planningCompliance,
      generatedAt: new Date().toISOString(),
    },
  });
}
```

---

## Step 5: Testing Checklist

### Unit Tests

- [ ] Profile validation (all 6 classes)
- [ ] Multi-select validation for Mixed class
- [ ] Scale field validation (min/max bounds)
- [ ] Objectives source tracking

### Integration Tests

- [ ] Profile save API (<500ms)
- [ ] Objectives generate API (<3s)
- [ ] Objectives polish API (<5s)
- [ ] Legacy project fallback

### E2E Tests

- [ ] Complete profile workflow
- [ ] Manual objectives entry
- [ ] AI generation + edit + polish
- [ ] Mobile responsive at 768px

---

## Common Patterns

### Loading Templates by Class

```typescript
import templates from '@/lib/data/profile-templates.json';

function getTemplateForClass(buildingClass: string) {
  return templates.buildingClasses[buildingClass];
}

function getScaleFields(buildingClass: string, subclass: string) {
  const classTemplate = getTemplateForClass(buildingClass);
  return classTemplate.scaleFields[subclass] || classTemplate.scaleFields.default;
}
```

### Complexity Score Calculation

```typescript
const COMPLEXITY_WEIGHTS: Record<string, number> = {
  heritage_listed: 2.0,
  live_operations: 1.5,
  state_significant: 1.5,
  transfer_structure: 0.5,
  // ... see research.md for full list
};

function calculateComplexityScore(complexity: Record<string, string>): number {
  let score = 1; // Base score
  for (const [dimension, value] of Object.entries(complexity)) {
    score += COMPLEXITY_WEIGHTS[value] || 0;
  }
  return Math.min(10, score); // Cap at 10
}
```

### Context Chips Rendering

```typescript
interface ContextChip {
  icon: string;
  label: string;
  value: string;
}

function getContextChips(profile: Profile): ContextChip[] {
  const chips: ContextChip[] = [];

  // NCC class chip
  const nccClass = getNccClass(profile.subclass[0]);
  if (nccClass) {
    chips.push({ icon: '🏗️', label: 'NCC', value: nccClass });
  }

  // Cost range chip
  const costRange = getCostRange(profile);
  chips.push({ icon: '💰', label: 'Cost', value: costRange });

  // Timeline chip
  const timeline = getApprovalTimeline(profile);
  chips.push({ icon: '⏱️', label: 'Approval', value: timeline });

  return chips;
}
```

---

## File Checklist

### Phase 0: Foundation
- [ ] `src/lib/db/pg-schema.ts` - Add 3 new tables
- [ ] `src/lib/data/profile-templates.json` - All templates
- [ ] `src/components/profiler/ProfilerLayout.tsx`
- [ ] `src/components/profiler/LeftNavigation.tsx`

### Phase 1: Profile Section
- [ ] `src/components/profiler/ProfileSection.tsx`
- [ ] `src/components/profiler/ClassTypeSelector.tsx`
- [ ] `src/components/profiler/SubclassSelector.tsx`
- [ ] `src/components/profiler/ScaleInputs.tsx`
- [ ] `src/components/profiler/ComplexitySelector.tsx`
- [ ] `src/app/api/planning/[projectId]/profile/route.ts`

### Phase 2: Objectives Section
- [ ] `src/components/profiler/ObjectivesSection.tsx`
- [ ] `src/components/profiler/SimpleMarkdownEditor.tsx`
- [ ] `src/app/api/planning/[projectId]/objectives/route.ts`
- [ ] `src/app/api/planning/[projectId]/objectives/generate/route.ts`
- [ ] `src/app/api/planning/[projectId]/objectives/polish/route.ts`

### Phase 3: Power Features
- [ ] `src/components/profiler/PowerFeatures/ContextChips.tsx`
- [ ] `src/components/profiler/PowerFeatures/ComplexityScore.tsx`
- [ ] `src/components/profiler/PowerFeatures/RiskFlags.tsx`
- [ ] `src/components/profiler/PowerFeatures/ConsultantPreview.tsx`
- [ ] `src/components/profiler/PowerFeatures/MarketContext.tsx`

### Final
- [ ] `src/components/profiler/index.ts` - Exports
- [ ] Deprecation comment in `src/components/project-wizard/`

---

## Ready to Implement

You now have everything needed:
1. **plan.md** - 151 requirements in 6 phases
2. **research.md** - All technology decisions resolved
3. **data-model.md** - Complete database schema
4. **contracts/** - OpenAPI specs for all endpoints
5. **quickstart.md** - This file with implementation patterns

Run `/speckit.tasks` to generate the task list for execution.
