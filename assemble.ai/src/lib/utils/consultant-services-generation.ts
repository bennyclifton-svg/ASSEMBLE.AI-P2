/**
 * Consultant Services Generation Utility
 * Feature: 018-project-initiator Phase 13
 * Generates consultant services and deliverables for RFT Report
 */

import type {
  ProjectTypeId,
  ConsultantTemplatesData,
  ConsultantDiscipline,
} from '@/lib/types/project-initiator';

export interface ConsultantServicesOutput {
  disciplineName: string;
  briefServices: string; // Markdown formatted list of services
  briefDeliverables: string; // Markdown formatted deliverables by phase
}

export interface GenerateServicesParams {
  projectType: ProjectTypeId;
  templatesData: ConsultantTemplatesData;
}

/**
 * Generate services and deliverables for a specific discipline
 *
 * @param discipline - The consultant discipline from the template
 * @returns Object containing formatted services and deliverables markdown
 *
 * @example
 * ```ts
 * const discipline = templatesData.disciplines.architect;
 * const result = generateServicesForDiscipline(discipline);
 * // Returns:
 * // {
 * //   services: "- Site inspection and analysis\n- Preliminary massing studies\n...",
 * //   deliverables: "**feasibility**\n- Site analysis report\n\n**schematic_design**\n..."
 * // }
 * ```
 */
export function generateServicesForDiscipline(discipline: ConsultantDiscipline): {
  services: string;
  deliverables: string;
} {
  // Group services and deliverables by master stage
  const servicesByStage: Record<string, string[]> = {};
  const deliverablesByStage: Record<string, string[]> = {};

  if (discipline.phases) {
    for (const [phaseName, phaseData] of Object.entries(discipline.phases)) {
      // Use masterStage if available, otherwise fall back to phase name for backwards compatibility
      const stageName = phaseData.masterStage || phaseName;

      // Group services by master stage
      if (!servicesByStage[stageName]) {
        servicesByStage[stageName] = [];
      }
      if (phaseData.services && phaseData.services.length > 0) {
        servicesByStage[stageName].push(...phaseData.services);
      }

      // Group deliverables by master stage
      if (!deliverablesByStage[stageName]) {
        deliverablesByStage[stageName] = [];
      }
      if (phaseData.deliverables && phaseData.deliverables.length > 0) {
        deliverablesByStage[stageName].push(
          ...phaseData.deliverables.map(d => `- ${d.item}`)
        );
      }
    }
  }

  // Format services with stage headers (deduplicate within each stage)
  const servicesMarkdown = Object.entries(servicesByStage)
    .filter(([_, services]) => services.length > 0)
    .map(([stage, services]) => {
      const uniqueServices = [...new Set(services)];
      const stageName = formatPhaseName(stage);
      return `**${stageName}**\n${uniqueServices.map(s => `- ${s}`).join('\n')}`;
    })
    .join('\n\n');

  // Format deliverables with stage headers
  const deliverablesMarkdown = Object.entries(deliverablesByStage)
    .filter(([_, deliverables]) => deliverables.length > 0)
    .map(([stage, deliverables]) => {
      const stageName = formatPhaseName(stage);
      return `**${stageName}**\n${deliverables.join('\n')}`;
    })
    .join('\n\n');

  return {
    services: servicesMarkdown || '',
    deliverables: deliverablesMarkdown || '',
  };
}

/**
 * Format phase name for display (convert snake_case to Title Case)
 *
 * @param phaseName - Phase name in snake_case format
 * @returns Formatted phase name
 *
 * @example
 * formatPhaseName("schematic_design") // "Schematic Design"
 * formatPhaseName("town_planning") // "Town Planning"
 */
function formatPhaseName(phaseName: string): string {
  return phaseName
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Generate services and deliverables for all applicable disciplines based on project type
 *
 * @param params - Generation parameters including project type and template data
 * @returns Array of consultant services outputs for each applicable discipline
 *
 * @example
 * ```ts
 * const consultantTemplates = await import('@/lib/data/consultant-templates.json');
 * const services = generateServicesAndDeliverables({
 *   projectType: 'house',
 *   templatesData: consultantTemplates.consultantTemplates
 * });
 * // Returns array of services for Architect, Structural Engineer, etc.
 * ```
 */
export function generateServicesAndDeliverables(
  params: GenerateServicesParams
): ConsultantServicesOutput[] {
  const { projectType, templatesData } = params;
  const results: ConsultantServicesOutput[] = [];

  // Iterate through all disciplines in the template
  for (const [disciplineKey, discipline] of Object.entries(templatesData.disciplines)) {
    // Check if discipline is applicable to this project type
    const isApplicable =
      discipline.applicableProjectTypes.includes('all' as ProjectTypeId) ||
      discipline.applicableProjectTypes.includes(projectType);

    if (!isApplicable) {
      continue; // Skip non-applicable disciplines
    }

    // Generate services and deliverables for this discipline
    const { services, deliverables } = generateServicesForDiscipline(discipline);

    results.push({
      disciplineName: discipline.name,
      briefServices: services,
      briefDeliverables: deliverables,
    });
  }

  return results;
}

/**
 * Get services and deliverables for a specific discipline by name
 *
 * @param disciplineName - Name of the discipline (e.g., "Architect")
 * @param templatesData - Consultant templates data
 * @returns Services and deliverables for the discipline, or null if not found
 *
 * @example
 * ```ts
 * const result = getServicesForDiscipline("Architect", templatesData);
 * if (result) {
 *   console.log(result.services);
 *   console.log(result.deliverables);
 * }
 * ```
 */
export function getServicesForDiscipline(
  disciplineName: string,
  templatesData: ConsultantTemplatesData
): { services: string; deliverables: string } | null {
  // Find the discipline by name
  const discipline = Object.values(templatesData.disciplines).find(
    d => d.name === disciplineName
  );

  if (!discipline) {
    return null;
  }

  return generateServicesForDiscipline(discipline);
}
