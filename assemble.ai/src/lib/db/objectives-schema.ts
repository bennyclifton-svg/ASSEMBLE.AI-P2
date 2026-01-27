/**
 * Objectives Schema
 * Tracks generated objectives and user edits across iterations
 */

import { pgTable, text, timestamp, jsonb, integer, boolean } from 'drizzle-orm/pg-core';
import { projects } from './pg-schema';

// Objective Types
export type ObjectiveType = 'functional_quality' | 'planning_compliance';
export type ObjectiveSource = 'explicit' | 'inferred' | 'ai_added' | 'user_added';
export type ObjectiveStatus = 'draft' | 'polished' | 'approved';

// Main objectives table - stores individual objective items
export const projectObjectives = pgTable('project_objectives', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  projectId: text('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),

  // Classification
  objectiveType: text('objective_type').notNull().$type<ObjectiveType>(),
  source: text('source').notNull().$type<ObjectiveSource>(),

  // Content
  text: text('text').notNull(),
  textPolished: text('text_polished'), // Expanded version after Polish
  category: text('category'), // Optional grouping

  // State
  status: text('status').notNull().$type<ObjectiveStatus>().default('draft'),
  isDeleted: boolean('is_deleted').default(false), // Soft delete for tracking
  sortOrder: integer('sort_order').default(0),

  // Metadata
  ruleId: text('rule_id'), // Which inference rule generated this (null if user-added)
  confidence: text('confidence'), // high/medium/low from rule

  // Timestamps
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
});

// Generation sessions - tracks each Generate/Polish cycle
export const objectiveGenerationSessions = pgTable('objective_generation_sessions', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  projectId: text('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),

  // Type
  objectiveType: text('objective_type').notNull().$type<ObjectiveType>(),
  iteration: integer('iteration').notNull(), // 1 = Generate, 2 = Polish

  // Input snapshot (for debugging/auditing)
  profilerSnapshot: jsonb('profiler_snapshot'), // Profiler state at generation time
  matchedRules: jsonb('matched_rules'), // Which rules matched

  // Output
  generatedItems: jsonb('generated_items'), // Raw AI response

  // Timestamps
  createdAt: timestamp('created_at').defaultNow()
});

// Types for JSONB fields
export interface GeneratedItemsJson {
  explicit: string[];
  inferred: string[];
  ai_added?: string[];
  user_added?: string[];
}

export interface MatchedRulesJson {
  ruleIds: string[];
  resolvedItems: { ruleId: string; text: string; source: string }[];
}
