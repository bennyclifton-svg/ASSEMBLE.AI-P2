# Feature Specification: Project Initiator

**Feature Branch**: `018-project-initiator`
**Created**: 2024-12-20
**Status**: Draft

---

## Overview

An **opt-in feature** in the Planning panel that allows users to select a project type and answer quick questions to auto-populate objectives, disciplines, consultant services and deliverables, program phases and durations, and cost plan line items with budget estimates.

### Key Principles

- **Existing flow unchanged**: Create project with name/code → enter dashboard immediately
- **Opt-in**: Accessed from Planning → Details → "Project Type: Not Set"
- **Template-driven**: All content sourced from external JSON files (not hardcoded)

---

## Source Files

All templates and configuration data are maintained in external JSON files. These files are the **single source of truth** and should be copied to `src/lib/data/` during implementation.

| Source | Target | Purpose |
|--------|--------|---------|
| `Project Initiator/projectTypes.json` | `src/lib/data/project-types.json` | 12 project types with quick questions |
| `Project Initiator/objectivesTemplates.json` | `src/lib/data/objective-templates.json` | Objective templates with variable substitution |
| `Project Initiator/consultantTemplates.json` | `src/lib/data/consultant-templates.json` | Discipline mappings and deliverables |
| `Project Initiator/costPlanTemplates.json` | `src/lib/data/cost-plan-templates.json` | Benchmark rates and fee structures |
| `Project Initiator/programTemplates.json` | `src/lib/data/program-templates.json` | Phase structures and duration factors |

**Important**: These files will be updated over time. Implementation must read from these files at runtime, not embed content.

---

## User Flow

```
1. User creates project (name + code) → Dashboard

2. Planning Panel → Details Section → "Project Type: Not Set" [clickable]

3. Modal opens → Grid of 12 types from projectTypes.json
   - Filterable by 5 category pills
   - Each card: icon, name, description, budget range

4. User selects type → Quick questions appear (from projectTypes.json)
   - 2-4 questions per type
   - Single-select and multi-select supported
   - Skippable with defaults

5. Generate → Objectives created from objectivesTemplates.json
   - Variables substituted from answers
   - User reviews/edits before applying

6. Apply → Populates:
   - Objectives section (4 objectives)
   - Auto-enables disciplines in Consultant List (from consultantTemplates.json mappings)
   - Creates program phases and passes to Program module (from programTemplates.json)
   - Generates consultant services and deliverables for Procurement RFT Report
   - Generates cost plan summary and passes to Cost Planning module
```

---

## User Stories

### Story 1: Select Project Type (P1)

**Location**: Planning Panel → Details Section

**Acceptance**:
1. New projects show "Project Type: Not Set" as clickable field
2. Click opens modal with 12 types in grid layout
3. Category filter pills work (Pre-Development, Residential, Commercial, Industrial, Refurbishment)
4. Type cards display: icon, name, description, typicalBudgetRange
5. Selection proceeds to questions step

**Data Source**: `projectTypes.json` → `projectTypes[]`

---

### Story 2: Answer Quick Questions (P1)

**Acceptance**:
1. Questions loaded from selected type's `quickSetupQuestions[]`
2. Support `type: "single"` and `type: "multiple"`
3. Options display label, icon (if present), metadata (units, gfa, costPerSqm)
4. Skip button proceeds with first option as default
5. Answers stored for template variable substitution

**Data Source**: `projectTypes.json` → `projectTypes[].quickSetupQuestions[]`

---

### Story 3: Generate Objectives (P1)

**Acceptance**:
1. Load templates from `objectivesTemplates.json` for selected type
2. Substitute variables: `{{variable_name}}` → answer values
3. Apply conditional variations based on answer values
4. Display 4 objectives (functional, quality, budget, program) for review
5. User can edit before applying
6. Apply populates Planning → Objectives section

**Data Source**: `objectivesTemplates.json` → `objectivesTemplates[projectType]`

**Variables**: Sourced from:
- Quick question answers (e.g., `{{building_scale}}`, `{{market_segment}}`)
- Project details when available (e.g., `{{address}}`)
- Template defaults for missing values

---

### Story 4: Auto-Enable Disciplines (P2)

**Acceptance**:
1. On apply, read `applicableProjectTypes` for each discipline
2. Enable disciplines where selected type is in their applicable list
3. User can still manually enable/disable afterwards

**Data Source**: `consultantTemplates.json` → `consultantTemplates.disciplines[].applicableProjectTypes`

---

### Story 5: Create Program Phases (P2)

**Acceptance**:
1. Load phase structure from `programTemplates.json` for selected type
2. Create phases with default durations
3. Apply duration factors from answers (e.g., `building_scale` → 0.6x to 1.3x)
4. Include milestones and activities from template
5. Include start and end dates for Gantt chart construction (2-tier parent/child structure)
6. Pass generated program data to Program module (refer `015-program-module`)

**Data Source**: `programTemplates.json` → `phaseStructures[projectType]`

---

### Story 6: Generate Consultant Services & Deliverables (P2)

**Acceptance**:
1. Load deliverables by phase from `consultantTemplates.json` for enabled disciplines
2. Generate services list with phase-specific deliverables
3. Pass to Procurement RFT Report for inclusion in tender documentation

**Data Source**: `consultantTemplates.json` → `disciplines[].deliverablesByPhase`

---

### Story 7: Generate Cost Plan Summary (P2)

**Acceptance**:
1. Load benchmark rates from `costPlanTemplates.json` for selected type
2. Calculate preliminary budget based on project scale answers
3. Generate cost plan line items organized into 4 groups: Fees & Charges, Consultants, Construction, Contingency
4. Pass to Cost Planning module

**Data Source**: `costPlanTemplates.json` → `benchmarkRates`, `professionalFees`, `contingencyRates`

---

## Requirements

### Functional

| ID | Requirement |
|----|-------------|
| FR-001 | Display "Project Type: Not Set" for projects without type |
| FR-002 | Load project types from `project-types.json` at runtime |
| FR-003 | Support category filtering (5 categories) |
| FR-004 | Load questions dynamically from type's `quickSetupQuestions` |
| FR-005 | Support single and multiple selection question types |
| FR-006 | Load objective templates from `objective-templates.json` |
| FR-007 | Perform variable substitution using `{{variable}}` syntax |
| FR-008 | Support conditional template variations |
| FR-009 | Enable disciplines based on `applicableProjectTypes` mappings |
| FR-010 | Create program phases from `program-templates.json` |
| FR-011 | Existing project creation flow must remain unchanged |
| FR-012 | Pass program phases to Program module (015-program-module) |
| FR-013 | Generate consultant services/deliverables for Procurement RFT Report |
| FR-014 | Generate cost plan summary and pass to Cost Planning module |

### Data Model

Add one column to projects table:

```sql
ALTER TABLE projects ADD COLUMN project_type VARCHAR(50);
```

---

## Component Architecture

```
PlanningCard.tsx
└── DetailsSection.tsx (modified)
    └── ProjectTypeField.tsx (new)
        └── ProjectInitiatorModal.tsx (new)
            ├── TypeSelectionStep.tsx
            ├── QuestionsStep.tsx
            └── ObjectivesPreviewStep.tsx
```

---

## Implementation Notes

### Loading Data

```typescript
// Load at runtime, not compile time
const projectTypes = await import('@/lib/data/project-types.json');
const objectives = await import('@/lib/data/objective-templates.json');
```

### Variable Substitution

```typescript
function substituteVariables(template: string, answers: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => answers[key] || `[${key}]`);
}
```

### Discipline Mapping

```typescript
function getEnabledDisciplines(projectType: string, templates: ConsultantTemplates) {
  return Object.entries(templates.disciplines)
    .filter(([_, d]) => d.applicableProjectTypes.includes('all') || d.applicableProjectTypes.includes(projectType))
    .map(([key]) => key);
}
```

---

## Phases

### Phase 1: Core Flow
- Add projectType column
- Copy JSON files to `src/lib/data/`
- Build type picker modal
- Implement questions step
- Generate and apply objectives

### Phase 2: Downstream Integration
- Auto-enable disciplines
- Create program phases
- Display cost benchmarks (informational)

### Phase 3: Enhancement
- Drag-drop parsing for project details
- AI refinement of objectives

---

## Success Criteria

| Metric | Target |
|--------|--------|
| Time to set project type | < 30 seconds |
| Objectives accepted without edits | > 70% |
| Projects with type → have objectives | > 90% |
| Existing creation flow speed | Unchanged |

---

## Out of Scope

- Modifying existing project creation flow
- Address autocomplete
- AI refinement (Phase 3)
- Custom project type creation
- Cost calculations (display only)
