import type { ObjectiveType } from '@/lib/db/objectives-schema';

export const OBJECTIVE_SECTION_ORDER: ObjectiveType[] = [
  'planning',
  'functional',
  'quality',
  'compliance',
];

type ObjectiveLike = {
  id?: string | null;
  text?: string | null;
};

export type GroupedObjectiveLike = Partial<Record<ObjectiveType, ObjectiveLike[]>>;

export interface BriefRegenerationPlan {
  hasExistingObjectives: boolean;
  sectionsToGenerate: ObjectiveType[];
  sectionsToPolish: ObjectiveType[];
}

function hasRows(rows: ObjectiveLike[] | undefined): boolean {
  return Array.isArray(rows) && rows.length > 0;
}

export function planBriefRegeneration(grouped: GroupedObjectiveLike): BriefRegenerationPlan {
  const sectionsWithRows = OBJECTIVE_SECTION_ORDER.filter((section) => hasRows(grouped[section]));
  const hasExistingObjectives = sectionsWithRows.length > 0;

  if (!hasExistingObjectives) {
    return {
      hasExistingObjectives: false,
      sectionsToGenerate: OBJECTIVE_SECTION_ORDER,
      sectionsToPolish: [],
    };
  }

  return {
    hasExistingObjectives: true,
    sectionsToGenerate: OBJECTIVE_SECTION_ORDER.filter((section) => !hasRows(grouped[section])),
    sectionsToPolish: sectionsWithRows,
  };
}
