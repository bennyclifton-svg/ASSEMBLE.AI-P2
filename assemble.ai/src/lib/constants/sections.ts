/**
 * Section Constants for Notes, Meetings & Reports Module
 * Feature: 021-notes-meetings-reports
 *
 * This module provides predefined section templates for meeting agendas
 * and report contents.
 */

import type { StakeholderGroup } from '@/types/stakeholder';

// ============================================================================
// STANDARD AGENDA SECTIONS (8 items)
// ============================================================================

/**
 * Standard Meeting Agenda Sections
 * Used when agendaType is 'standard'
 */
export const STANDARD_AGENDA_SECTIONS = [
  { key: 'brief', label: 'Brief', sortOrder: 0 },
  { key: 'procurement', label: 'Procurement', sortOrder: 1 },
  { key: 'planning_authorities', label: 'Planning & Authorities', sortOrder: 2 },
  { key: 'design', label: 'Design', sortOrder: 3 },
  { key: 'construction', label: 'Construction', sortOrder: 4 },
  { key: 'cost_planning', label: 'Cost Planning', sortOrder: 5 },
  { key: 'programme', label: 'Programme', sortOrder: 6 },
  { key: 'other', label: 'Other', sortOrder: 7 },
] as const;

// ============================================================================
// STANDARD CONTENTS SECTIONS (9 items)
// ============================================================================

/**
 * Standard Report Contents Sections
 * Used when contentsType is 'standard'
 * Note: Reports have 'Summary' instead of 'Brief'
 */
export const STANDARD_CONTENTS_SECTIONS = [
  { key: 'summary', label: 'Summary', sortOrder: 0 },
  { key: 'procurement', label: 'Procurement', sortOrder: 1 },
  { key: 'planning_authorities', label: 'Planning & Authorities', sortOrder: 2 },
  { key: 'design', label: 'Design', sortOrder: 3 },
  { key: 'construction', label: 'Construction', sortOrder: 4 },
  { key: 'cost_planning', label: 'Cost Planning', sortOrder: 5 },
  { key: 'programme', label: 'Programme', sortOrder: 6 },
  { key: 'other', label: 'Other', sortOrder: 7 },
] as const;

// ============================================================================
// DETAILED SECTION STAKEHOLDER MAPPING
// ============================================================================

/**
 * Sections that should have stakeholder sub-headings in "detailed" mode
 *
 * For each key, the value is an array of stakeholder groups that will
 * generate sub-sections under that parent section.
 *
 * Example: 'procurement' will generate sub-headings for each
 * consultant and contractor stakeholder in the project.
 */
export const DETAILED_SECTION_STAKEHOLDER_MAPPING = {
  /** Sub-headings for consultants + contractors */
  procurement: ['consultant', 'contractor'] as const,
  /** Sub-headings for authorities */
  planning_authorities: ['authority'] as const,
  /** Sub-headings for consultant disciplines */
  design: ['consultant'] as const,
} as const;

/**
 * Fixed sub-sections for Cost Planning in detailed mode
 * These are always added regardless of stakeholders
 */
export const COST_PLANNING_SUB_SECTIONS = [
  { key: 'cost_planning_summary', label: 'Summary', sortOrder: 0 },
  { key: 'cost_planning_provisional_sums', label: 'Provisional Sums', sortOrder: 1 },
  { key: 'cost_planning_variations', label: 'Variations', sortOrder: 2 },
] as const;

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type StandardAgendaSection = typeof STANDARD_AGENDA_SECTIONS[number];
export type StandardContentsSection = typeof STANDARD_CONTENTS_SECTIONS[number];
export type DetailedSectionKey = keyof typeof DETAILED_SECTION_STAKEHOLDER_MAPPING;
export type CostPlanningSubSection = typeof COST_PLANNING_SUB_SECTIONS[number];

export type SectionKey =
  | StandardAgendaSection['key']
  | StandardContentsSection['key']
  | CostPlanningSubSection['key'];

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get the section definition by key
 */
export function getSectionByKey(key: string): StandardAgendaSection | StandardContentsSection | undefined {
  return STANDARD_AGENDA_SECTIONS.find(s => s.key === key)
    ?? STANDARD_CONTENTS_SECTIONS.find(s => s.key === key);
}

/**
 * Check if a section key should have stakeholder sub-headings in detailed mode
 */
export function hasDetailedSubSections(sectionKey: string): boolean {
  return sectionKey in DETAILED_SECTION_STAKEHOLDER_MAPPING;
}

/**
 * Get the stakeholder groups that generate sub-sections for a given section key
 */
export function getStakeholderGroupsForSection(sectionKey: string): readonly StakeholderGroup[] {
  if (sectionKey in DETAILED_SECTION_STAKEHOLDER_MAPPING) {
    return DETAILED_SECTION_STAKEHOLDER_MAPPING[sectionKey as DetailedSectionKey];
  }
  return [];
}

/**
 * Check if a section key is the cost planning section
 */
export function isCostPlanningSection(sectionKey: string): boolean {
  return sectionKey === 'cost_planning';
}

/**
 * Get the label for a section key
 */
export function getSectionLabel(sectionKey: string): string {
  const section = getSectionByKey(sectionKey);
  if (section) return section.label;

  // Check cost planning sub-sections
  const costSection = COST_PLANNING_SUB_SECTIONS.find(s => s.key === sectionKey);
  if (costSection) return costSection.label;

  // Convert key to readable label as fallback
  return sectionKey
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Generate a unique section key for stakeholder-based sub-sections
 */
export function generateStakeholderSectionKey(parentKey: string, stakeholderId: string): string {
  return `${parentKey}_stakeholder_${stakeholderId}`;
}
