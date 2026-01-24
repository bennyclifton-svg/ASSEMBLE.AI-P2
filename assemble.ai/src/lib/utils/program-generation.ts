/**
 * Program Phase Generation Utility
 * Feature: 018-project-initiator / Phase 11
 *
 * Generates program activities with calculated durations based on project type
 * and user-provided answers (building scale, urgency, etc.).
 */

import programTemplatesData from '@/lib/data/program-templates.json';
import { v4 as uuidv4 } from 'uuid';

import type { MasterStageId } from '@/lib/types/project-initiator';

// Type definitions
interface ProgramActivity {
  id: string;
  name: string;
  startDate: string; // ISO date
  endDate: string; // ISO date
  parentId: string | null;
  sortOrder: number;
  masterStage?: MasterStageId | null;  // NEW: Links to one of 5 master stages
  color?: string;
}

interface PhaseActivity {
  id: string;
  name: string;
  standardPhase: string;
  masterStage?: MasterStageId;  // NEW: Links to one of 5 master stages
  duration: {
    weeks: number;
    range?: { min: number; max: number };
    variable?: string;
    notes?: string;
  };
  canOverlapPrevious: boolean;
  overlapWeeks?: number;
  milestones?: Array<{ name: string; critical: boolean }>;
  activities?: string[];
  optional?: boolean;
  parallelWith?: string[];
}

interface DurationFactor {
  description: string;
  factors: {
    [key: string]: {
      factor: number;
      notes: string;
    };
  };
}

type ProjectType =
  | 'due-diligence'
  | 'feasibility'
  | 'house'
  | 'apartments'
  | 'townhouses'
  | 'fitout'
  | 'industrial'
  | 'remediation'
  | 'seniors-living'
  | 'student-housing'
  | 'mixed-use'
  | 'hotel-accommodation';

/**
 * Calculate adjusted duration by applying multiplicative factors from answers
 *
 * @param baseDurationWeeks - Base duration from template
 * @param variableKey - The variable key that affects duration (e.g., "building_scale", "urgency")
 * @param answers - User's question answers
 * @returns Adjusted duration in weeks (rounded up)
 *
 * @example
 * calculateDuration(12, "building_scale", { building_scale: "small" })
 * // Returns: 7 weeks (12 * 0.6 = 7.2, rounded to 7)
 */
export function calculateDuration(
  baseDurationWeeks: number,
  variableKey: string | undefined,
  answers: Record<string, string | string[]>
): number {
  if (!variableKey) {
    return Math.ceil(baseDurationWeeks);
  }

  const durationFactors = programTemplatesData.programTemplates.durationFactors as Record<
    string,
    DurationFactor
  >;

  const factorSet = durationFactors[variableKey];
  if (!factorSet) {
    // No duration factors for this variable, return base duration
    return Math.ceil(baseDurationWeeks);
  }

  const answerValue = answers[variableKey];
  if (!answerValue || typeof answerValue !== 'string') {
    // No answer provided for this variable, return base duration
    return Math.ceil(baseDurationWeeks);
  }

  const multiplier = factorSet.factors[answerValue]?.factor ?? 1.0;
  return Math.ceil(baseDurationWeeks * multiplier);
}

/**
 * Add weeks to a date
 *
 * @param date - Starting date
 * @param weeks - Number of weeks to add
 * @returns New date
 */
function addWeeks(date: Date, weeks: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + weeks * 7);
  return result;
}

/**
 * Format date as ISO string (YYYY-MM-DD)
 *
 * @param date - Date to format
 * @returns ISO date string
 */
function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

/**
 * Generate program phases and activities for a project
 *
 * Creates a 2-tier parent/child activity structure based on project type
 * and user answers. Applies duration factors to calculate realistic timelines.
 *
 * @param projectType - The selected project type (e.g., "house", "apartments")
 * @param answers - User's question answers (building_scale, urgency, etc.)
 * @param startDate - Project start date (defaults to today)
 * @returns Array of program activities ready for database insertion
 *
 * @example
 * const activities = generateProgramPhases(
 *   "house",
 *   { building_scale: "medium", approval_path: "standard_da" },
 *   new Date()
 * );
 * // Returns 30-40 activities with parent/child hierarchy
 */
export function generateProgramPhases(
  projectType: ProjectType,
  answers: Record<string, string | string[]>,
  startDate?: Date
): ProgramActivity[] {
  const phaseStructures = programTemplatesData.programTemplates.phaseStructures as Record<
    string,
    { totalTypicalWeeks: { min: number; max: number }; phases: PhaseActivity[] }
  >;

  const structure = phaseStructures[projectType];
  if (!structure) {
    throw new Error(`No program template found for project type: ${projectType}`);
  }

  const activities: ProgramActivity[] = [];
  let currentDate = startDate ? new Date(startDate) : new Date();
  let sortOrder = 0;

  // Color palette (muted tones)
  const colors = [
    '#94a3b8', // Slate
    '#a78bfa', // Purple
    '#60a5fa', // Blue
    '#34d399', // Green
    '#fbbf24', // Yellow
    '#fb923c', // Orange
    '#f472b6', // Pink
    '#a3e635', // Lime
  ];

  structure.phases.forEach((phase, phaseIndex) => {
    // Skip optional phases (e.g., modular construction option)
    if (phase.optional) {
      return;
    }

    // Calculate phase duration
    const durationWeeks = calculateDuration(
      phase.duration.weeks,
      phase.duration.variable,
      answers
    );

    // Handle overlap with previous phase
    let phaseStartDate = new Date(currentDate);
    if (phase.canOverlapPrevious && phase.overlapWeeks && phaseIndex > 0) {
      // Start earlier (overlap with previous phase)
      phaseStartDate = addWeeks(currentDate, -phase.overlapWeeks);
    }

    const phaseEndDate = addWeeks(phaseStartDate, durationWeeks);

    // Create parent activity (phase)
    const parentId = uuidv4();
    const parentColor = colors[phaseIndex % colors.length];

    activities.push({
      id: parentId,
      name: phase.name,
      startDate: formatDate(phaseStartDate),
      endDate: formatDate(phaseEndDate),
      parentId: null,
      sortOrder: sortOrder++,
      masterStage: phase.masterStage || null,  // NEW: Include master stage
      color: parentColor,
    });

    // Create child activities
    if (phase.activities && phase.activities.length > 0) {
      const activityDuration = durationWeeks / phase.activities.length;
      let activityStartDate = new Date(phaseStartDate);

      phase.activities.forEach((activityName) => {
        const activityEndDate = addWeeks(activityStartDate, activityDuration);

        activities.push({
          id: uuidv4(),
          name: activityName,
          startDate: formatDate(activityStartDate),
          endDate: formatDate(activityEndDate),
          parentId: parentId,
          sortOrder: sortOrder++,
          masterStage: phase.masterStage || null,  // NEW: Include master stage
          color: parentColor,
        });

        activityStartDate = new Date(activityEndDate);
      });
    }

    // Create milestone activities (if specified)
    if (phase.milestones && phase.milestones.length > 0) {
      // Add critical milestones as child activities with 1-day duration
      const criticalMilestones = phase.milestones.filter((m) => m.critical);
      if (criticalMilestones.length > 0) {
        const milestoneSpacing = durationWeeks / (criticalMilestones.length + 1);
        let milestoneDate = new Date(phaseStartDate);

        criticalMilestones.forEach((milestone, idx) => {
          milestoneDate = addWeeks(phaseStartDate, milestoneSpacing * (idx + 1));

          activities.push({
            id: uuidv4(),
            name: `🎯 ${milestone.name}`,
            startDate: formatDate(milestoneDate),
            endDate: formatDate(milestoneDate), // Same day (milestone)
            parentId: parentId,
            sortOrder: sortOrder++,
            masterStage: phase.masterStage || null,  // NEW: Include master stage
            color: parentColor,
          });
        });
      }
    }

    // Update current date for next phase (unless overlap)
    if (!phase.canOverlapPrevious || !phase.overlapWeeks) {
      currentDate = new Date(phaseEndDate);
    } else {
      // For overlapping phases, advance by (duration - overlap)
      const netDuration = durationWeeks - (phase.overlapWeeks || 0);
      currentDate = addWeeks(currentDate, netDuration);
    }
  });

  return activities;
}

/**
 * Get total typical duration for a project type
 *
 * @param projectType - The selected project type
 * @returns Typical duration range in weeks
 */
export function getTypicalDuration(projectType: ProjectType): { min: number; max: number } {
  const phaseStructures = programTemplatesData.programTemplates.phaseStructures as Record<
    string,
    { totalTypicalWeeks: { min: number; max: number } }
  >;

  const structure = phaseStructures[projectType];
  if (!structure) {
    throw new Error(`No program template found for project type: ${projectType}`);
  }

  return structure.totalTypicalWeeks;
}
