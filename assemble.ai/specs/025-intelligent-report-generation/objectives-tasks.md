# Objectives Two-Iteration Workflow: Implementation Tasks

**Created:** 2026-01-28
**Status:** In Progress

---

## Goal

Implement two-iteration objectives generation with inference engine integration:
- **Iteration 1 (Generate):** Short 2-5 word bullets with inference rule suggestions
- **Iteration 2 (Polish):** Expand to 10-15 words with standards references

---

## Files to Modify

| File | Purpose |
|------|---------|
| `src/app/api/projects/[projectId]/objectives/generate/route.ts` | Add inference engine + short bullet prompt |
| `src/app/api/projects/[projectId]/objectives/polish/route.ts` | Update expansion prompt |

## Reference Files (Read Only)

| File | Purpose |
|------|---------|
| `src/lib/data/inference-rules.json` | 33 inference rules for objectives + stakeholders |
| `src/lib/services/inference-engine.ts` | Rule evaluation: `evaluateRules()`, `formatRulesForPrompt()` |
| `src/lib/db/pg-schema.ts` | `projectProfiles` table with profiler data |

---

## Tasks

### Task 1: Update Generate Route - Import Inference Engine
**File:** `src/app/api/projects/[projectId]/objectives/generate/route.ts`
**Status:** [x] Complete

Add imports:
```typescript
import { evaluateRules, formatRulesForPrompt, type ProjectData } from '@/lib/services/inference-engine';
```

---

### Task 2: Update Generate Route - Build ProjectData
**File:** `src/app/api/projects/[projectId]/objectives/generate/route.ts`
**Status:** [x] Complete

After parsing profile data (~line 74), create ProjectData object:
```typescript
const projectData: ProjectData = {
  projectDetails: {
    projectName: 'Project', // Can fetch from projects table if needed
    jurisdiction: profile.jurisdiction || undefined,
  },
  profiler: {
    buildingClass,
    subclass,
    projectType,
    scaleData,
    complexity,
    workScope,
  }
};
```

---

### Task 3: Update Generate Route - Evaluate Inference Rules
**File:** `src/app/api/projects/[projectId]/objectives/generate/route.ts`
**Status:** [x] Complete

After building projectData, evaluate rules for each section:
```typescript
// Evaluate inference rules
const functionalRules = evaluateRules('objectives_functional_quality', projectData);
const planningRules = evaluateRules('objectives_planning_compliance', projectData);

// Format for prompt
const functionalRulesFormatted = formatRulesForPrompt(functionalRules, { includeConfidence: true });
const planningRulesFormatted = formatRulesForPrompt(planningRules, { includeConfidence: true });
```

---

### Task 4: Update Generate Route - New Short Bullet Prompt
**File:** `src/app/api/projects/[projectId]/objectives/generate/route.ts`
**Status:** [x] Complete

Replace prompt (lines 150-182) with iteration 1 prompt:
```typescript
const prompt = `You are an expert construction project manager in Australia.

PROJECT PROFILE:
- Building Class: ${buildingClass}
- Project Type: ${projectType}
- Subclass: ${subclass.join(', ')}
- Scale: ${JSON.stringify(scaleData)}
- Complexity: ${JSON.stringify(complexity)}
${hasSpecificScope ? `- Work Scope: ${workScopeLabels.join(', ')}` : ''}

SUGGESTED ITEMS FROM PROJECT ANALYSIS:
${generateFunctional ? `\n## Functional & Quality\n${functionalRulesFormatted || '(No specific rules matched)'}` : ''}
${generatePlanning ? `\n## Planning & Compliance\n${planningRulesFormatted || '(No specific rules matched)'}` : ''}
${workScopeConstraint}

INSTRUCTIONS - ITERATION 1:
Generate SHORT bullet points only (2-5 words each).
1. Include ALL suggested items from the project analysis above
2. Add other relevant objectives for this ${buildingClass} ${projectType} project
3. Group by category using **Headers** (e.g., **Design Requirements**, **Quality Standards**)
4. Each bullet: 2-5 words MAXIMUM (e.g., "NCC compliance", "Fire safety provisions")
5. NO prose, NO sentences, NO detailed explanations
6. Output 8-15 bullets per section
7. User will review these short bullets before the Polish step expands them

Respond in JSON format:
${responseFormat}`;
```

---

### Task 5: Update Polish Route - New Expansion Prompt
**File:** `src/app/api/projects/[projectId]/objectives/polish/route.ts`
**Status:** [x] Complete

Replace prompt (lines 111-129) with iteration 2 prompt:
```typescript
const prompt = `You are an expert construction project manager and technical writer in Australia.

${profileContext}

OBJECTIVES TO EXPAND:

${contentToPolish}

INSTRUCTIONS - ITERATION 2:
Expand each short bullet point to 10-15 words.
1. Add specific Australian standards references where relevant (NCC 2022, BCA, AS standards)
2. Make objectives measurable where possible (quantities, percentages, ratings)
3. PRESERVE the user's structure - keep all headers and bullet order
4. PRESERVE any edits the user made - do not change user-modified items
5. Keep language professional and concise
6. Do NOT add new categories or objectives not present in the input
7. Do NOT remove any items

Respond in JSON format:
${responseFormat}`;
```

---

### Task 6: Test - Generate Short Bullets
**Status:** [ ] Pending

1. Open project with complete profiler
2. Navigate to Objectives section
3. Click Generate
4. Verify output has 2-5 word bullets
5. Verify inference rule items appear

---

### Task 7: Test - Polish Expansion
**Status:** [ ] Pending

1. After Generate, click Polish
2. Verify bullets expanded to 10-15 words
3. Verify standards references added
4. Verify structure preserved

---

### Task 8: Test - Work Scope Constraint
**Status:** [ ] Pending

1. Set project type to "refurb"
2. Select specific work scope items
3. Generate objectives
4. Verify only selected scope items appear

---

## Progress Log

| Date | Task | Status | Notes |
|------|------|--------|-------|
| 2026-01-28 | Planning | Complete | Tasks documented |
| 2026-01-28 | Task 1-5 | Complete | Inference engine integrated, prompts updated |
| | Task 6 | In Progress | Testing short bullet generation |
| | Task 7 | Pending | |
| | Task 8 | Pending | |
