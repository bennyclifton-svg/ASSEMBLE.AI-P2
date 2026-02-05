/**
 * Discipline Mapping Utilities (Feature 018 - Phase 10)
 * Filter and enable consultant disciplines based on project type
 */

import type {
  ProjectTypeId,
  ConsultantTemplatesData,
  ConsultantDiscipline,
} from '@/lib/types/project-initiator';

/**
 * Get list of discipline names that should be enabled for a given project type
 *
 * @param projectType - The selected project type (e.g., 'house', 'apartments')
 * @param templatesData - Consultant templates data loaded from JSON
 * @returns Array of discipline names that are applicable for this project type
 *
 * @example
 * ```ts
 * const consultantTemplates = await import('@/lib/data/consultant-templates.json');
 * const enabledDisciplines = getEnabledDisciplines('house', consultantTemplates);
 * // Returns: ['Architect', 'Structural', ...]
 * ```
 */
export function getEnabledDisciplines(
  projectType: ProjectTypeId,
  templatesData: ConsultantTemplatesData
): string[] {
  const enabledDisciplines: string[] = [];

  // Iterate through all disciplines in the template
  for (const [disciplineKey, discipline] of Object.entries(templatesData.disciplines)) {
    // Check if discipline is applicable to this project type
    // A discipline is applicable if:
    // 1. applicableProjectTypes includes "all", OR
    // 2. applicableProjectTypes includes the specific project type
    const isApplicable =
      discipline.applicableProjectTypes.includes('all' as ProjectTypeId) ||
      discipline.applicableProjectTypes.includes(projectType);

    if (isApplicable) {
      // Use name for the discipline name
      enabledDisciplines.push(discipline.name);
    }
  }

  return enabledDisciplines;
}

/**
 * Get full discipline details for disciplines applicable to a project type
 *
 * @param projectType - The selected project type
 * @param templatesData - Consultant templates data loaded from JSON
 * @returns Map of discipline names to their full details
 *
 * @example
 * ```ts
 * const consultantTemplates = await import('@/lib/data/consultant-templates.json');
 * const disciplines = getApplicableDisciplines('apartments', consultantTemplates);
 * // Returns: Map { 'Architect' => {...}, 'Structural' => {...}, ... }
 * ```
 */
export function getApplicableDisciplines(
  projectType: ProjectTypeId,
  templatesData: ConsultantTemplatesData
): Map<string, ConsultantDiscipline> {
  const applicableDisciplines = new Map<string, ConsultantDiscipline>();

  for (const [disciplineKey, discipline] of Object.entries(templatesData.disciplines)) {
    const isApplicable =
      discipline.applicableProjectTypes.includes('all' as ProjectTypeId) ||
      discipline.applicableProjectTypes.includes(projectType);

    if (isApplicable) {
      applicableDisciplines.set(discipline.name, discipline);
    }
  }

  return applicableDisciplines;
}

/**
 * Check if a specific discipline is applicable to a project type
 *
 * @param disciplineName - The display name of the discipline
 * @param projectType - The project type to check against
 * @param templatesData - Consultant templates data
 * @returns true if the discipline is applicable, false otherwise
 */
export function isDisciplineApplicable(
  disciplineName: string,
  projectType: ProjectTypeId,
  templatesData: ConsultantTemplatesData
): boolean {
  // Find the discipline by name
  const discipline = Object.values(templatesData.disciplines).find(
    d => d.name === disciplineName
  );

  if (!discipline) {
    return false;
  }

  return (
    discipline.applicableProjectTypes.includes('all' as ProjectTypeId) ||
    discipline.applicableProjectTypes.includes(projectType)
  );
}
