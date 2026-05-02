/**
 * Section Generation Service
 * Feature 021 - Notes, Meetings & Reports
 *
 * Provides functions to generate standard and detailed agenda/contents sections
 * for meetings and reports.
 */

import { db } from '@/lib/db';
import { projectStakeholders } from '@/lib/db';
import { eq, and, isNull, inArray } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import {
    STANDARD_AGENDA_SECTIONS,
    STANDARD_CONTENTS_SECTIONS,
    DETAILED_SECTION_STAKEHOLDER_MAPPING,
    COST_PLANNING_SUB_SECTIONS,
    generateStakeholderSectionKey,
} from '@/lib/constants/sections';
import type { MeetingAgendaType, ReportContentsType } from '@/types/notes-meetings-reports';

// ============================================================================
// TYPES
// ============================================================================

export interface GeneratedSection {
    id: string;
    sectionKey: string;
    sectionLabel: string;
    content: string | null;
    sortOrder: number;
    parentSectionId: string | null;
    stakeholderId: string | null;
}

export type GeneratedSectionWithChildren = GeneratedSection & {
    childSections: GeneratedSection[];
};

export interface MeetingSectionInsert {
    id: string;
    meetingId: string;
    sectionKey: string;
    sectionLabel: string;
    content: string | null;
    sortOrder: number;
    parentSectionId: string | null;
    stakeholderId: string | null;
    createdAt: string;
    updatedAt: string;
}

export interface ReportSectionInsert {
    id: string;
    reportId: string;
    sectionKey: string;
    sectionLabel: string;
    content: string | null;
    sortOrder: number;
    parentSectionId: string | null;
    stakeholderId: string | null;
    createdAt: string;
    updatedAt: string;
}

interface StakeholderInfo {
    id: string;
    name: string;
    stakeholderGroup: string;
    disciplineOrTrade: string | null;
    organization: string | null;
}

// ============================================================================
// STANDARD SECTIONS GENERATION
// ============================================================================

/**
 * Generate standard agenda sections (8 fixed items)
 * Used for meeting agendaType = 'standard'
 */
export function generateStandardAgendaSections(): GeneratedSection[] {
    return STANDARD_AGENDA_SECTIONS.map((section) => ({
        id: uuidv4(),
        sectionKey: section.key,
        sectionLabel: section.label,
        content: null,
        sortOrder: section.sortOrder,
        parentSectionId: null,
        stakeholderId: null,
    }));
}

/**
 * Generate standard contents sections (9 fixed items)
 * Used for report contentsType = 'standard'
 */
export function generateStandardContentsSections(): GeneratedSection[] {
    return STANDARD_CONTENTS_SECTIONS.map((section) => ({
        id: uuidv4(),
        sectionKey: section.key,
        sectionLabel: section.label,
        content: null,
        sortOrder: section.sortOrder,
        parentSectionId: null,
        stakeholderId: null,
    }));
}

// ============================================================================
// DETAILED SECTIONS GENERATION
// ============================================================================

/**
 * Generate detailed agenda sections with stakeholder sub-headings
 * Used for meeting agendaType = 'detailed'
 *
 * Structure:
 * - Brief
 * - Procurement
 *   - [Consultant 1 name]
 *   - [Consultant 2 name]
 *   - [Contractor 1 name]
 * - Planning & Authorities
 *   - [Authority 1 name]
 * - Design
 *   - [Consultant 1 discipline]
 * - Construction
 * - Cost Planning
 *   - Summary
 *   - Provisional Sums
 *   - Variations
 * - Programme
 * - Other
 */
export async function generateDetailedAgendaSections(projectId: string): Promise<GeneratedSection[]> {
    // Fetch project stakeholders
    const stakeholders = await db
        .select()
        .from(projectStakeholders)
        .where(
            and(
                eq(projectStakeholders.projectId, projectId),
                isNull(projectStakeholders.deletedAt)
            )
        );

    return generateDetailedSections(STANDARD_AGENDA_SECTIONS as unknown as Array<{ key: string; label: string; sortOrder: number }>, stakeholders);
}

/**
 * Generate detailed contents sections with stakeholder sub-headings
 * Used for report contentsType = 'detailed'
 */
export async function generateDetailedContentsSections(projectId: string): Promise<GeneratedSection[]> {
    // Fetch project stakeholders
    const stakeholders = await db
        .select()
        .from(projectStakeholders)
        .where(
            and(
                eq(projectStakeholders.projectId, projectId),
                isNull(projectStakeholders.deletedAt)
            )
        );

    return generateDetailedSections(STANDARD_CONTENTS_SECTIONS as unknown as Array<{ key: string; label: string; sortOrder: number }>, stakeholders);
}

/**
 * Generate detailed sections with stakeholder sub-headings
 * Internal helper function
 */
function generateDetailedSections(
    baseSections: Array<{ key: string; label: string; sortOrder: number }>,
    stakeholders: StakeholderInfo[]
): GeneratedSection[] {
    const sections: GeneratedSection[] = [];
    let globalSortOrder = 0;

    for (const baseSection of baseSections) {
        // Create the parent section
        const parentId = uuidv4();
        sections.push({
            id: parentId,
            sectionKey: baseSection.key,
            sectionLabel: baseSection.label,
            content: null,
            sortOrder: globalSortOrder++,
            parentSectionId: null,
            stakeholderId: null,
        });

        // Check if this section should have stakeholder sub-headings
        const stakeholderGroups = DETAILED_SECTION_STAKEHOLDER_MAPPING[baseSection.key as keyof typeof DETAILED_SECTION_STAKEHOLDER_MAPPING];

        if (stakeholderGroups) {
            const groups = stakeholderGroups as readonly string[];
            // Filter stakeholders by the required groups
            const relevantStakeholders = stakeholders.filter(s =>
                groups.includes(s.stakeholderGroup)
            );

            // Create sub-sections for each relevant stakeholder
            for (const stakeholder of relevantStakeholders) {
                const subLabel = getStakeholderSubLabel(baseSection.key, stakeholder);
                sections.push({
                    id: uuidv4(),
                    sectionKey: generateStakeholderSectionKey(baseSection.key, stakeholder.id),
                    sectionLabel: subLabel,
                    content: null,
                    sortOrder: globalSortOrder++,
                    parentSectionId: parentId,
                    stakeholderId: stakeholder.id,
                });
            }
        }

        // Check if this is the cost planning section (has fixed sub-sections)
        if (baseSection.key === 'cost_planning') {
            for (const subSection of COST_PLANNING_SUB_SECTIONS) {
                sections.push({
                    id: uuidv4(),
                    sectionKey: subSection.key,
                    sectionLabel: subSection.label,
                    content: null,
                    sortOrder: globalSortOrder++,
                    parentSectionId: parentId,
                    stakeholderId: null,
                });
            }
        }
    }

    return sections;
}

/**
 * Get the display label for a stakeholder sub-section
 */
function getStakeholderSubLabel(sectionKey: string, stakeholder: StakeholderInfo): string {
    switch (sectionKey) {
        case 'procurement':
            // Show company/organization name
            return stakeholder.organization || stakeholder.name;

        case 'planning_authorities':
            // Show authority name
            return stakeholder.name;

        case 'design':
            // Show discipline if available, otherwise company name
            return stakeholder.disciplineOrTrade || stakeholder.organization || stakeholder.name;

        default:
            return stakeholder.name;
    }
}

// ============================================================================
// CUSTOM SECTIONS GENERATION
// ============================================================================

/**
 * Generate custom sections - starts with empty slate
 * User will add their own sections manually
 */
export function generateCustomSections(): GeneratedSection[] {
    // Return empty array - user will add sections manually
    return [];
}

// ============================================================================
// MAIN GENERATION FUNCTIONS
// ============================================================================

/**
 * Generate meeting agenda sections based on agenda type
 */
export async function generateMeetingAgendaSections(
    projectId: string,
    agendaType: MeetingAgendaType
): Promise<GeneratedSection[]> {
    switch (agendaType) {
        case 'standard':
            return generateStandardAgendaSections();

        case 'detailed':
            return await generateDetailedAgendaSections(projectId);

        case 'custom':
            return generateCustomSections();

        default:
            return generateStandardAgendaSections();
    }
}

/**
 * Generate report contents sections based on contents type
 */
export async function generateReportContentsSections(
    projectId: string,
    contentsType: ReportContentsType
): Promise<GeneratedSection[]> {
    switch (contentsType) {
        case 'standard':
            return generateStandardContentsSections();

        case 'detailed':
            return await generateDetailedContentsSections(projectId);

        case 'custom':
            return generateCustomSections();

        default:
            return generateStandardContentsSections();
    }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Add timestamps to generated sections for database insertion
 */
export function addTimestampsToSections(
    sections: GeneratedSection[],
    parentId: string,
    parentType: 'meeting' | 'report'
): Array<GeneratedSection & { meetingId?: string; reportId?: string; createdAt: string; updatedAt: string }> {
    const now = new Date().toISOString();

    return sections.map(section => ({
        ...section,
        ...(parentType === 'meeting' ? { meetingId: parentId } : { reportId: parentId }),
        createdAt: now,
        updatedAt: now,
    }));
}

export function toMeetingSectionRows(
    sections: GeneratedSection[],
    meetingId: string,
    now: string = new Date().toISOString()
): MeetingSectionInsert[] {
    return sections.map((section) => ({
        id: section.id,
        meetingId,
        sectionKey: section.sectionKey,
        sectionLabel: section.sectionLabel,
        content: section.content ?? null,
        sortOrder: section.sortOrder,
        parentSectionId: section.parentSectionId ?? null,
        stakeholderId: section.stakeholderId ?? null,
        createdAt: now,
        updatedAt: now,
    }));
}

export function toReportSectionRows(
    sections: GeneratedSection[],
    reportId: string,
    now: string = new Date().toISOString()
): ReportSectionInsert[] {
    return sections.map((section) => ({
        id: section.id,
        reportId,
        sectionKey: section.sectionKey,
        sectionLabel: section.sectionLabel,
        content: section.content ?? null,
        sortOrder: section.sortOrder,
        parentSectionId: section.parentSectionId ?? null,
        stakeholderId: section.stakeholderId ?? null,
        createdAt: now,
        updatedAt: now,
    }));
}

export function splitParentAndChildSections<T extends { parentSectionId: string | null }>(
    sections: T[]
): { parentSections: T[]; childSections: T[] } {
    return {
        parentSections: sections.filter((section) => !section.parentSectionId),
        childSections: sections.filter((section) => Boolean(section.parentSectionId)),
    };
}

export function nestGeneratedSections(sections: GeneratedSection[]): GeneratedSectionWithChildren[] {
    const { parentSections, childSections } = splitParentAndChildSections(sections);
    return parentSections.map((parent) => ({
        ...parent,
        childSections: childSections.filter((child) => child.parentSectionId === parent.id),
    }));
}

/**
 * Validate section generation request
 */
export function validateAgendaType(agendaType: string): agendaType is MeetingAgendaType {
    return ['standard', 'detailed', 'custom'].includes(agendaType);
}

/**
 * Validate contents type for reports
 */
export function validateContentsType(contentsType: string): contentsType is ReportContentsType {
    return ['standard', 'detailed', 'custom'].includes(contentsType);
}
