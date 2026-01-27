/**
 * Objectives Workflow Service
 * Manages Generate → Edit → Polish state transitions
 */

import { eq, and } from 'drizzle-orm';
import { db } from '@/lib/db';
import {
  projectObjectives,
  objectiveGenerationSessions,
  type ObjectiveType,
  type ObjectiveSource,
  type ObjectiveStatus,
  type GeneratedItemsJson,
  type MatchedRulesJson
} from '@/lib/db/objectives-schema';
import {
  generateObjectives,
  polishObjectives,
  type GeneratedObjectives,
  type PolishedObjectives
} from './objectives-generation';
import { evaluateRules, type ProjectData, type MatchedRule } from './inference-engine';

// Types
export interface ObjectiveItem {
  id: string;
  text: string;
  textPolished?: string;
  source: ObjectiveSource;
  category?: string;
  status: ObjectiveStatus;
  isDeleted: boolean;
  ruleId?: string;
}

export interface WorkflowState {
  projectId: string;
  objectiveType: ObjectiveType;
  currentIteration: number; // 0 = not started, 1 = generated, 2 = polished
  objectives: ObjectiveItem[];
  canGenerate: boolean;
  canPolish: boolean;
}

// Get current workflow state
export async function getWorkflowState(
  projectId: string,
  objectiveType: ObjectiveType
): Promise<WorkflowState> {
  // Get existing objectives
  const existing = await db
    .select()
    .from(projectObjectives)
    .where(
      and(
        eq(projectObjectives.projectId, projectId),
        eq(projectObjectives.objectiveType, objectiveType)
      )
    )
    .orderBy(projectObjectives.sortOrder);

  // Get latest session
  const sessions = await db
    .select()
    .from(objectiveGenerationSessions)
    .where(
      and(
        eq(objectiveGenerationSessions.projectId, projectId),
        eq(objectiveGenerationSessions.objectiveType, objectiveType)
      )
    )
    .orderBy(objectiveGenerationSessions.iteration);

  const latestIteration = sessions.length > 0
    ? Math.max(...sessions.map(s => s.iteration))
    : 0;

  const objectives: ObjectiveItem[] = existing.map(o => ({
    id: o.id,
    text: o.text,
    textPolished: o.textPolished || undefined,
    source: o.source as ObjectiveSource,
    category: o.category || undefined,
    status: o.status as ObjectiveStatus,
    isDeleted: o.isDeleted || false,
    ruleId: o.ruleId || undefined
  }));

  return {
    projectId,
    objectiveType,
    currentIteration: latestIteration,
    objectives,
    canGenerate: latestIteration === 0, // Can only generate if not started
    canPolish: latestIteration === 1 && objectives.some(o => !o.isDeleted) // Can polish after generate
  };
}

// Step 1: Generate (Iteration 1)
export async function runGenerate(
  projectId: string,
  objectiveType: ObjectiveType,
  projectData: ProjectData,
  aiClient: { generate: (prompt: string) => Promise<string> }
): Promise<WorkflowState> {
  // Get matched rules for audit
  const contentType = objectiveType === 'functional_quality'
    ? 'objectives_functional_quality'
    : 'objectives_planning_compliance';
  const matchedRules = evaluateRules(contentType, projectData);

  // Generate via AI
  const generated = await generateObjectives(projectData, objectiveType, aiClient);

  // Clear existing objectives for this type
  await db
    .delete(projectObjectives)
    .where(
      and(
        eq(projectObjectives.projectId, projectId),
        eq(projectObjectives.objectiveType, objectiveType)
      )
    );

  // Insert new objectives
  const toInsert: typeof projectObjectives.$inferInsert[] = [];
  let sortOrder = 0;

  // Explicit items
  for (const text of generated.explicit) {
    const matchingRule = findMatchingRule(matchedRules, text, 'explicit');
    toInsert.push({
      projectId,
      objectiveType,
      source: 'explicit',
      text,
      status: 'draft',
      sortOrder: sortOrder++,
      ruleId: matchingRule?.id,
      confidence: matchingRule ? 'high' : undefined
    });
  }

  // Inferred items
  for (const text of generated.inferred) {
    const matchingRule = findMatchingRule(matchedRules, text, 'inferred');
    toInsert.push({
      projectId,
      objectiveType,
      source: 'inferred',
      text,
      status: 'draft',
      sortOrder: sortOrder++,
      ruleId: matchingRule?.id,
      confidence: matchingRule?.infer[0] && 'confidence' in matchingRule.infer[0]
        ? (matchingRule.infer[0] as { confidence: string }).confidence
        : undefined
    });
  }

  // AI-added items
  for (const text of generated.ai_added) {
    toInsert.push({
      projectId,
      objectiveType,
      source: 'ai_added',
      text,
      status: 'draft',
      sortOrder: sortOrder++
    });
  }

  if (toInsert.length > 0) {
    await db.insert(projectObjectives).values(toInsert);
  }

  // Record session
  await db.insert(objectiveGenerationSessions).values({
    projectId,
    objectiveType,
    iteration: 1,
    profilerSnapshot: projectData.profiler as unknown as Record<string, unknown>,
    matchedRules: {
      ruleIds: matchedRules.map(r => r.id),
      resolvedItems: matchedRules.flatMap(r =>
        r.resolvedItems.map(i => ({
          ruleId: r.id,
          text: 'text' in i ? i.text : '',
          source: r.source
        }))
      )
    } as MatchedRulesJson,
    generatedItems: generated as unknown as Record<string, unknown>
  });

  return getWorkflowState(projectId, objectiveType);
}

// User edits: Add objective
export async function addObjective(
  projectId: string,
  objectiveType: ObjectiveType,
  text: string
): Promise<ObjectiveItem> {
  // Get max sort order
  const existing = await db
    .select({ maxSort: projectObjectives.sortOrder })
    .from(projectObjectives)
    .where(
      and(
        eq(projectObjectives.projectId, projectId),
        eq(projectObjectives.objectiveType, objectiveType)
      )
    );

  const maxSort = Math.max(0, ...existing.map(e => e.maxSort || 0));

  const [inserted] = await db
    .insert(projectObjectives)
    .values({
      projectId,
      objectiveType,
      source: 'user_added',
      text,
      status: 'draft',
      sortOrder: maxSort + 1
    })
    .returning();

  return {
    id: inserted.id,
    text: inserted.text,
    source: inserted.source as ObjectiveSource,
    status: inserted.status as ObjectiveStatus,
    isDeleted: false
  };
}

// User edits: Delete objective (soft delete)
export async function deleteObjective(objectiveId: string): Promise<void> {
  await db
    .update(projectObjectives)
    .set({ isDeleted: true, updatedAt: new Date() })
    .where(eq(projectObjectives.id, objectiveId));
}

// User edits: Restore deleted objective
export async function restoreObjective(objectiveId: string): Promise<void> {
  await db
    .update(projectObjectives)
    .set({ isDeleted: false, updatedAt: new Date() })
    .where(eq(projectObjectives.id, objectiveId));
}

// User edits: Update objective text
export async function updateObjectiveText(
  objectiveId: string,
  text: string
): Promise<void> {
  await db
    .update(projectObjectives)
    .set({ text, updatedAt: new Date() })
    .where(eq(projectObjectives.id, objectiveId));
}

// Step 2: Polish (Iteration 2)
export async function runPolish(
  projectId: string,
  objectiveType: ObjectiveType,
  projectData: ProjectData,
  aiClient: { generate: (prompt: string) => Promise<string> }
): Promise<WorkflowState> {
  // Get current objectives (non-deleted)
  const current = await db
    .select()
    .from(projectObjectives)
    .where(
      and(
        eq(projectObjectives.projectId, projectId),
        eq(projectObjectives.objectiveType, objectiveType),
        eq(projectObjectives.isDeleted, false)
      )
    )
    .orderBy(projectObjectives.sortOrder);

  // Build original objectives (from session 1)
  const session1 = await db
    .select()
    .from(objectiveGenerationSessions)
    .where(
      and(
        eq(objectiveGenerationSessions.projectId, projectId),
        eq(objectiveGenerationSessions.objectiveType, objectiveType),
        eq(objectiveGenerationSessions.iteration, 1)
      )
    )
    .limit(1);

  const originalObjectives = session1[0]?.generatedItems as GeneratedItemsJson | undefined;

  if (!originalObjectives) {
    throw new Error('Cannot polish: no generation session found');
  }

  // Current user-edited list
  const userEditedObjectives = current.map(o => o.text);

  // Polish via AI
  const polished = await polishObjectives(
    projectData,
    objectiveType,
    originalObjectives as GeneratedObjectives,
    userEditedObjectives,
    aiClient
  );

  // Update objectives with polished text
  const allPolished = [
    ...polished.explicit,
    ...polished.inferred,
    ...polished.user_added
  ];

  for (let i = 0; i < current.length && i < allPolished.length; i++) {
    await db
      .update(projectObjectives)
      .set({
        textPolished: allPolished[i],
        status: 'polished',
        updatedAt: new Date()
      })
      .where(eq(projectObjectives.id, current[i].id));
  }

  // Record session
  await db.insert(objectiveGenerationSessions).values({
    projectId,
    objectiveType,
    iteration: 2,
    profilerSnapshot: projectData.profiler as unknown as Record<string, unknown>,
    generatedItems: polished as unknown as Record<string, unknown>
  });

  return getWorkflowState(projectId, objectiveType);
}

// Helper: Find which rule generated a text
function findMatchingRule(
  rules: MatchedRule[],
  text: string,
  source: 'explicit' | 'inferred'
): MatchedRule | undefined {
  return rules.find(r =>
    r.source === source &&
    r.resolvedItems.some(i => 'text' in i && i.text === text)
  );
}

// Approve objectives (finalize)
export async function approveObjectives(
  projectId: string,
  objectiveType: ObjectiveType
): Promise<void> {
  await db
    .update(projectObjectives)
    .set({ status: 'approved', updatedAt: new Date() })
    .where(
      and(
        eq(projectObjectives.projectId, projectId),
        eq(projectObjectives.objectiveType, objectiveType),
        eq(projectObjectives.isDeleted, false)
      )
    );
}

// Reset workflow (start over)
export async function resetWorkflow(
  projectId: string,
  objectiveType: ObjectiveType
): Promise<void> {
  await db
    .delete(projectObjectives)
    .where(
      and(
        eq(projectObjectives.projectId, projectId),
        eq(projectObjectives.objectiveType, objectiveType)
      )
    );

  await db
    .delete(objectiveGenerationSessions)
    .where(
      and(
        eq(objectiveGenerationSessions.projectId, projectId),
        eq(objectiveGenerationSessions.objectiveType, objectiveType)
      )
    );
}
