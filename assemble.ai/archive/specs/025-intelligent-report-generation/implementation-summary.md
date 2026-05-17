# Intelligent Report Generation: Implementation Summary

**Created**: 2026-01-27
**Status**: Design Complete, Ready for Implementation

---

## Overview

This document summarizes the design and implementation of the Intelligent Report Generation system, focusing on AI-powered content generation with structured inference rules.

### Core Principle

**Domain knowledge is embedded in structured JSON data, not in AI prompts or training.** The AI acts as a data interpreter and formatter, not a domain expert. This ensures consistency, maintainability, and auditability.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  LAYER 1: PROJECT DATA                                                      │
├─────────────────────────────────────────────────────────────────────────────┤
│  Project Details (lot/site)     │  Profiler (improvements)                  │
│  • project_name                 │  • building_class, subclass               │
│  • project_address              │  • project_type, region                   │
│  • jurisdiction                 │  • scale_data (GFA, storeys, etc.)        │
│  • lot_area_sqm                 │  • complexity (quality, heritage, etc.)   │
│                                 │  • work_scope (selected items)            │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  LAYER 2: INFERENCE ENGINE                                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│  inference-rules.json           │  inference-engine.ts                      │
│  • 33 rules defined             │  • evaluateCondition()                    │
│  • Condition → Inferred items   │  • resolveTemplate()                      │
│  • Priority & confidence        │  • formatRulesForPrompt()                 │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  LAYER 3: PROMPT TEMPLATES                                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│  objectives-prompts.ts                                                      │
│  • Generate prompt (Iteration 1): Short bullets, breadth check              │
│  • Polish prompt (Iteration 2): Expand with user edits preserved            │
│  • Stakeholder prompt: All 4 groups with reasons                            │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  LAYER 4: WORKFLOW ORCHESTRATION                                            │
├─────────────────────────────────────────────────────────────────────────────┤
│  objectives-workflow.ts         │  objectives-schema.ts                     │
│  • runGenerate()                │  • project_objectives table               │
│  • runPolish()                  │  • objective_generation_sessions table    │
│  • User edit functions          │  • Audit trail & snapshots                │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Files Created

| File | Purpose |
|------|---------|
| `src/lib/data/inference-rules.json` | 33 inference rules (objectives + stakeholders) |
| `src/lib/services/inference-engine.ts` | Rule evaluation and template resolution |
| `src/lib/prompts/objectives-prompts.ts` | AI prompt templates |
| `src/lib/services/objectives-generation.ts` | AI generation orchestration |
| `src/lib/services/objectives-workflow.ts` | Generate → Polish workflow state |
| `src/lib/db/objectives-schema.ts` | Database schema for objectives |
| `specs/.../inference-rules-research-prompt.md` | Handoff doc for expanding rules |

---

## Inference Rules

### Rule Categories

| Category | Count | Purpose |
|----------|-------|---------|
| Functional & Quality Objectives | 6 | What the building will be/have |
| Planning & Compliance Objectives | 7 | Regulatory requirements |
| Client Stakeholders | 3 | Owner, PM, Tenant |
| Authority Stakeholders | 5 | Council, Fire, Heritage, Transport, EPA |
| Consultant Stakeholders | 8 | Architect, Engineers, Specialists |
| Contractor Stakeholders | 4 | Main, Demolition, Civil, Facade |
| **Total** | **33** | |

### Rule Structure

```json
{
  "id": "opc-010",
  "description": "Heritage overlay requirements",
  "condition": {
    "profiler": {
      "complexity": { "heritage": "heritage_overlay" }
    }
  },
  "infer": [
    { "text": "Heritage consultant certification", "confidence": "high" },
    { "text": "Conservation management plan", "confidence": "high" }
  ],
  "priority": 85,
  "source": "inferred"
}
```

### Condition Operators

- `profiler.building_class` - Match building class
- `profiler.scale.storeys.min` - Numeric range
- `profiler.complexity.heritage` - Match complexity value
- `profiler.work_scope_includes` - Match any work scope item
- `and`, `or`, `not` - Logical operators

---

## Two-Iteration Workflow

### Iteration 1: Generate

- **Input**: Project data + matched inference rules
- **Output**: Very short bullet points (2-5 words)
- **Purpose**: Breadth check - "Is this on track?"
- **User actions**: Review, delete, add, edit

### Iteration 2: Polish

- **Input**: Original + user-edited objectives
- **Output**: Expanded text (10-15 words, still concise)
- **Purpose**: Refine with user direction captured
- **Rules**: Preserve user additions, remove user deletions, don't re-add

### Visual Differentiation

- **Explicit items** (from profiler): One color
- **Inferred items** (from rules): Different color
- **User-added items**: Third color

---

## AI Persona

```
Senior project manager with deep expertise in construction procurement,
cost planning, and project delivery in the Australian development industry.
```

### Output Style

- Professional, formal, third person
- Australian English
- Factual only - no superlatives or subjective judgment
- Strictly use provided data - no hallucination
- Missing data: State "Nil to report"

---

## Database Schema

### project_objectives

| Column | Type | Purpose |
|--------|------|---------|
| id | text | Primary key |
| project_id | text | FK to projects |
| objective_type | text | functional_quality / planning_compliance |
| source | text | explicit / inferred / ai_added / user_added |
| text | text | Original generated text |
| text_polished | text | Expanded text after Polish |
| status | text | draft / polished / approved |
| is_deleted | boolean | Soft delete for tracking |
| rule_id | text | Which inference rule generated this |
| confidence | text | high / medium / low |

### objective_generation_sessions

| Column | Type | Purpose |
|--------|------|---------|
| id | text | Primary key |
| project_id | text | FK to projects |
| objective_type | text | functional_quality / planning_compliance |
| iteration | integer | 1 = Generate, 2 = Polish |
| profiler_snapshot | jsonb | Profiler state at generation time |
| matched_rules | jsonb | Which rules matched |
| generated_items | jsonb | Raw AI response |

---

## API Functions

### Workflow Management

```typescript
// Get current state
getWorkflowState(projectId, objectiveType) → WorkflowState

// Execute iterations
runGenerate(projectId, objectiveType, projectData, aiClient) → WorkflowState
runPolish(projectId, objectiveType, projectData, aiClient) → WorkflowState

// User edits
addObjective(projectId, objectiveType, text) → ObjectiveItem
deleteObjective(objectiveId) → void
updateObjectiveText(objectiveId, text) → void
restoreObjective(objectiveId) → void

// Finalization
approveObjectives(projectId, objectiveType) → void
resetWorkflow(projectId, objectiveType) → void
```

### Inference Engine

```typescript
// Evaluate rules
evaluateRules(contentType, projectData) → MatchedRule[]

// Convenience functions
getObjectivesFunctionalQuality(projectData) → MatchedRule[]
getObjectivesPlanningCompliance(projectData) → MatchedRule[]
getStakeholders(projectData) → { client, authority, consultant, contractor }

// Format for prompts
formatRulesForPrompt(rules, options) → string
```

---

## Content Types (19 Total)

From `workingtobedeleted` file:

| # | Area | Content Type |
|---|------|--------------|
| 1-2 | Planning | Objectives (Functional & Quality, Planning & Compliance) |
| 3 | Planning | Stakeholder List |
| 4-5 | Procurement | RFT (Services, Deliverables) |
| 6 | Procurement | Addendum |
| 7-9 | Procurement | TRR (Executive Summary, Clarifications, Recommendation) |
| 10-11 | Notes | Notes, Meetings |
| 12-19 | Reports | Summary, Procurement, Planning, Design, Construction, Cost, Programme, Other |

---

## Expansion Needed

### Rules to Add

See `inference-rules-research-prompt.md` for full checklist:

- Industrial, Institution, Infrastructure building classes
- Agricultural, Defense/Secure building classes
- Additional consultants (20+ disciplines)
- Additional contractors (20+ trades)
- NZ, UK, US regional equivalents

### Estimated Total Rules

- Current: 33
- Target: 200-300 for full coverage

---

## Next Steps

1. **Database migration**: Apply `objectives-schema.ts`
2. **UI components**: Build objectives panel with Generate/Polish buttons
3. **API routes**: Expose workflow functions
4. **Expand rules**: Use handoff doc to add rules for all building classes
5. **Testing**: Verify rules produce expected outputs

---

## Key Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Where is domain knowledge? | JSON files | Static, maintainable, auditable |
| AI role | Interpreter/formatter | Consistent, predictable |
| Iteration count | 2 (Generate → Polish) | Balance speed and quality |
| Edit tracking | Soft delete + audit trail | User can undo, system can learn |
| Rule evaluation | At generation time | Fresh data, no stale cache |
| Missing data handling | "Nil to report" | Transparent, no hidden gaps |
