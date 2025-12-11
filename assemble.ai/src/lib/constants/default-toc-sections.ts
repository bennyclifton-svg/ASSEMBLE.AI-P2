/**
 * Default TOC Sections Configuration
 *
 * Defines the 7 fixed sections that are linked to Planning Card data.
 * These sections have a linked indicator icon to show data connection.
 */

import type { TocSection } from '@/lib/langgraph/state';

export const DEFAULT_TOC_SECTION_IDS = {
  PROJECT_DETAILS: 'project-details',
  PROJECT_OBJECTIVES: 'project-objectives',
  PROJECT_STAGING: 'project-staging',
  PROJECT_RISKS: 'project-risks',
  CONSULTANT_BRIEF: 'consultant-brief',
  CONTRACTOR_SCOPE: 'contractor-scope',
  CONSULTANT_FEE: 'consultant-fee',
  CONTRACTOR_PRICE: 'contractor-price',
  TRANSMITTAL: 'transmittal',
} as const;

export type DefaultTocSectionId = typeof DEFAULT_TOC_SECTION_IDS[keyof typeof DEFAULT_TOC_SECTION_IDS];

export interface LinkedTocSection extends TocSection {
  linkedTo?: string;
}

/**
 * Returns the default 7-section TOC structure based on context type.
 * @param contextType - 'discipline' for consultants, 'trade' for contractors
 * @param hasTransmittal - Whether to include transmittal section
 */
export function getDefaultTocSections(
  contextType: 'discipline' | 'trade',
  hasTransmittal: boolean = true
): LinkedTocSection[] {
  const sections: LinkedTocSection[] = [
    {
      id: DEFAULT_TOC_SECTION_IDS.PROJECT_DETAILS,
      title: 'Project Details',
      level: 1,
      linkedTo: 'planning.details',
    },
    {
      id: DEFAULT_TOC_SECTION_IDS.PROJECT_OBJECTIVES,
      title: 'Project Objectives',
      level: 1,
      linkedTo: 'planning.objectives',
    },
    {
      id: DEFAULT_TOC_SECTION_IDS.PROJECT_STAGING,
      title: 'Project Staging',
      level: 1,
      linkedTo: 'planning.stages',
    },
    {
      id: DEFAULT_TOC_SECTION_IDS.PROJECT_RISKS,
      title: 'Project Risks',
      level: 1,
      linkedTo: 'planning.risks',
    },
  ];

  if (contextType === 'discipline') {
    sections.push(
      {
        id: DEFAULT_TOC_SECTION_IDS.CONSULTANT_BRIEF,
        title: 'Consultant Brief',
        level: 1,
        linkedTo: 'discipline.brief',
      },
      {
        id: DEFAULT_TOC_SECTION_IDS.CONSULTANT_FEE,
        title: 'Consultant Fee',
        level: 1,
        linkedTo: 'discipline.feeStructure',
      }
    );
  } else {
    sections.push(
      {
        id: DEFAULT_TOC_SECTION_IDS.CONTRACTOR_SCOPE,
        title: 'Contractor Scope',
        level: 1,
        linkedTo: 'trade.scope',
      },
      {
        id: DEFAULT_TOC_SECTION_IDS.CONTRACTOR_PRICE,
        title: 'Contractor Price',
        level: 1,
        linkedTo: 'trade.priceStructure',
      }
    );
  }

  if (hasTransmittal) {
    sections.push({
      id: DEFAULT_TOC_SECTION_IDS.TRANSMITTAL,
      title: 'Transmittal',
      level: 1,
      linkedTo: 'transmittal',
    });
  }

  return sections;
}

/**
 * Check if a section ID is one of the default linked sections
 */
export function isLinkedSection(sectionId: string): boolean {
  return Object.values(DEFAULT_TOC_SECTION_IDS).includes(sectionId as DefaultTocSectionId);
}

/**
 * Get the data source description for a linked section
 */
export function getLinkedSectionSource(sectionId: string): string | undefined {
  const sources: Record<string, string> = {
    [DEFAULT_TOC_SECTION_IDS.PROJECT_DETAILS]: 'Planning Card › Details',
    [DEFAULT_TOC_SECTION_IDS.PROJECT_OBJECTIVES]: 'Planning Card › Objectives',
    [DEFAULT_TOC_SECTION_IDS.PROJECT_STAGING]: 'Planning Card › Staging',
    [DEFAULT_TOC_SECTION_IDS.PROJECT_RISKS]: 'Planning Card › Risks',
    [DEFAULT_TOC_SECTION_IDS.CONSULTANT_BRIEF]: 'Discipline › Brief',
    [DEFAULT_TOC_SECTION_IDS.CONTRACTOR_SCOPE]: 'Trade › Scope',
    [DEFAULT_TOC_SECTION_IDS.CONSULTANT_FEE]: 'Discipline › Fee Structure',
    [DEFAULT_TOC_SECTION_IDS.CONTRACTOR_PRICE]: 'Trade › Price Structure',
    [DEFAULT_TOC_SECTION_IDS.TRANSMITTAL]: 'Transmittal Documents',
  };
  return sources[sectionId];
}
