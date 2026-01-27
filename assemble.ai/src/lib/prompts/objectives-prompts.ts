/**
 * Prompt Templates for Objectives Generation
 */

export interface ObjectivesPromptContext {
  objectiveType: 'functional_quality' | 'planning_compliance';
  projectName: string;
  projectAddress: string;
  jurisdiction: string;
  buildingClass: string;
  buildingCodeLabel: string;
  projectType: string;
  subclass: string[];
  scaleDataFormatted: string;
  complexityFormatted: string;
  explicitRules: string;
  inferredRules: string;
}

export interface PolishPromptContext extends ObjectivesPromptContext {
  originalObjectives: string;
  userEditedObjectives: string;
}

// Iteration 1: Generate
export function buildObjectivesGeneratePrompt(ctx: ObjectivesPromptContext): string {
  const typeLabel = ctx.objectiveType === 'functional_quality'
    ? 'Functional & Quality'
    : 'Planning & Compliance';

  return `# Role
You are a senior project manager with deep expertise in construction procurement, cost planning, and project delivery in the Australian development industry.

# Task
Generate ${typeLabel} objectives for this project.
This is Iteration 1: Output very short bullet points (2-5 words each).
The user will review and edit before the Polish step.

# Project Details
- Project: ${ctx.projectName}
- Address: ${ctx.projectAddress}
- Jurisdiction: ${ctx.jurisdiction}

# Profiler Summary
- Building Class: ${ctx.buildingClass} (${ctx.buildingCodeLabel})
- Project Type: ${ctx.projectType}
- Subclass: ${ctx.subclass.join(', ')}
- Scale: ${ctx.scaleDataFormatted}
- Complexity: ${ctx.complexityFormatted}

# Matched Requirements

## From User Selections (Explicit)
${ctx.explicitRules || '(None)'}

## Recommended for This Project (Inferred)
${ctx.inferredRules || '(None)'}

# Instructions
1. Include ALL explicit items (user confirmed these)
2. Include inferred items where confidence is high or medium
3. Add other relevant objectives based on the project profile
4. Keep each bullet to 2-5 words maximum
5. Mark your additions with source "ai_added"

# Output Format
Return valid JSON only, no markdown:
{
  "explicit": ["item1", "item2"],
  "inferred": ["item1", "item2"],
  "ai_added": ["item1", "item2"]
}`;
}

// Iteration 2: Polish
export function buildObjectivesPolishPrompt(ctx: PolishPromptContext): string {
  const typeLabel = ctx.objectiveType === 'functional_quality'
    ? 'Functional & Quality'
    : 'Planning & Compliance';

  return `# Role
You are a senior project manager with deep expertise in construction procurement, cost planning, and project delivery in the Australian development industry.

# Task
Polish the ${typeLabel} objectives based on user edits.
This is Iteration 2: Expand slightly while preserving user intent.

# Project Context
- Project: ${ctx.projectName}
- Building: ${ctx.buildingClass} ${ctx.projectType}

# Original Generated Objectives
${ctx.originalObjectives}

# User's Edited Version
${ctx.userEditedObjectives}

# Instructions
1. PRESERVE all user additions exactly as written
2. REMOVE any items the user deleted (do not re-add them)
3. EXPAND remaining items slightly (10-15 words max, still concise)
4. Maintain professional, factual tone
5. Do not add new items unless directly implied by user additions

# Output Format
Return valid JSON only:
{
  "explicit": ["expanded item1", "expanded item2"],
  "inferred": ["expanded item1", "expanded item2"],
  "user_added": ["expanded item1", "expanded item2"]
}`;
}

// Stakeholder Generation
export interface StakeholderPromptContext {
  projectSummary: string;
  workScopeItems: string;
  clientRules: string;
  authorityRules: string;
  consultantRules: string;
  contractorRules: string;
}

export function buildStakeholderGeneratePrompt(ctx: StakeholderPromptContext): string {
  return `# Role
You are a senior project manager with deep expertise in construction procurement, cost planning, and project delivery in the Australian development industry.

# Task
Generate the stakeholder list for this project.
Suggest relevant stakeholders across all 4 groups.

# Project Context
${ctx.projectSummary}

# Work Scope Selected
${ctx.workScopeItems || '(None specified)'}

# Stakeholders from Rules

## Client
${ctx.clientRules || '(None matched)'}

## Authority
${ctx.authorityRules || '(None matched)'}

## Consultant
${ctx.consultantRules || '(None matched)'}

## Contractor
${ctx.contractorRules || '(None matched)'}

# Instructions
1. Include ALL stakeholders from the rules above
2. Add consultants from work scope not already listed
3. Infer additional stakeholders based on project size and type
4. For additions beyond rules, provide a brief reason
5. Output concise: name, subgroup, and reason only

# Output Format
Return valid JSON:
{
  "client": [{ "name": "...", "subgroup": "...", "reason": "...", "source": "rule" }],
  "authority": [{ "name": "...", "subgroup": "...", "reason": "...", "source": "rule" }],
  "consultant": [{ "name": "...", "subgroup": "...", "reason": "...", "source": "rule" }],
  "contractor": [{ "name": "...", "subgroup": "...", "reason": "...", "source": "rule" }]
}

Sources can be: "rule", "work_scope", or "inferred"`;
}
