/**
 * RAG Memory System
 *
 * Learns from approved reports to pre-fill future TOCs.
 * Captures TOC patterns across projects and organizations.
 *
 * Core functions:
 * - captureReportMemory: Store TOC from approved report
 * - mergeTocPatterns: Merge new TOC with existing memory
 * - generateTocWithMemory: Pre-fill TOC from memory
 */

import { ragDb } from '@/lib/db/rag-client';
import { reportMemory, reportTemplates } from '@/lib/db/rag-schema';
import type { TableOfContents, ApprovedToc } from '@/lib/db/rag-schema';
import { eq, and } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

// ============================================
// T072: captureReportMemory
// ============================================

interface CaptureMemoryParams {
    reportId: string;
    organizationId: string;
    reportType: string;
    discipline: string | null;
    tableOfContents: TableOfContents;
}

/**
 * Capture TOC from approved report into memory system
 *
 * If memory exists for this org/type/discipline:
 * - Merge new TOC with existing patterns
 * - Increment timesUsed counter
 *
 * If no memory exists:
 * - Create new memory record with initial TOC
 */
export async function captureReportMemory(params: CaptureMemoryParams): Promise<void> {
    const { reportId, organizationId, reportType, discipline, tableOfContents } = params;

    // Look up existing memory
    const existing = await ragDb.query.reportMemory.findFirst({
        where: and(
            eq(reportMemory.organizationId, organizationId),
            eq(reportMemory.reportType, reportType),
            eq(reportMemory.discipline, discipline || '')
        ),
    });

    if (existing) {
        // Merge with existing patterns
        const mergedToc = mergeTocPatterns(existing.approvedToc as ApprovedToc, tableOfContents);

        await ragDb
            .update(reportMemory)
            .set({
                approvedToc: mergedToc as any,
                timesUsed: (existing.timesUsed || 0) + 1,
                lastUsedAt: new Date(),
            })
            .where(eq(reportMemory.id, existing.id));
    } else {
        // Create new memory
        const initialToc = tableOfContentsToApprovedToc(tableOfContents);

        await ragDb.insert(reportMemory).values({
            id: uuidv4(),
            organizationId,
            reportType,
            discipline: discipline || '',
            approvedToc: initialToc as any,
            timesUsed: 1,
            lastUsedAt: new Date(),
        });
    }
}

// ============================================
// T073: mergeTocPatterns
// ============================================

/**
 * Merge new TOC with existing memory patterns
 *
 * Algorithm:
 * 1. Normalize section titles (lowercase, remove punctuation)
 * 2. Match sections by normalized title
 * 3. Increment frequency for matches
 * 4. Add new sections with frequency=1
 * 5. Sort by frequency (descending)
 * 6. Track title variants
 */
export function mergeTocPatterns(existing: ApprovedToc, newToc: TableOfContents): ApprovedToc {
    const sectionMap = new Map<string, (typeof existing.sections)[0]>();

    // Index existing sections by normalized title
    for (const section of existing.sections) {
        const normalized = normalizeTitle(section.title);
        sectionMap.set(normalized, section);
    }

    // Merge new sections
    for (const newSection of newToc.sections) {
        const normalized = normalizeTitle(newSection.title);
        const existingSection = sectionMap.get(normalized);

        if (existingSection) {
            // Section exists - increment frequency and track variant
            existingSection.frequency += 1;

            // Add variant if not already present
            if (!existingSection.variants.includes(newSection.title)) {
                existingSection.variants.push(newSection.title);
            }
        } else {
            // New section - add with frequency 1
            sectionMap.set(normalized, {
                title: newSection.title,
                level: newSection.level,
                frequency: 1,
                variants: [newSection.title],
            });
        }
    }

    // Convert map to array and sort by frequency (descending)
    const mergedSections = Array.from(sectionMap.values()).sort((a, b) => b.frequency - a.frequency);

    return {
        version: existing.version,
        sections: mergedSections,
    };
}

/**
 * Normalize title for matching
 * - Lowercase
 * - Remove punctuation
 * - Trim whitespace
 */
function normalizeTitle(title: string): string {
    return title
        .toLowerCase()
        .replace(/[^\w\s]/g, '') // Remove punctuation
        .trim();
}

/**
 * Convert TableOfContents to ApprovedToc
 * (initial conversion with frequency=1 for all sections)
 */
function tableOfContentsToApprovedToc(toc: TableOfContents): ApprovedToc {
    return {
        version: 1,
        sections: toc.sections.map((section) => ({
            title: section.title,
            level: section.level,
            frequency: 1,
            variants: [section.title],
        })),
    };
}

// ============================================
// T074: generateTocWithMemory
// ============================================

interface GenerateTocParams {
    organizationId: string;
    reportType: string;
    discipline: string | null;
    projectContext?: any; // Planning context for fallback generation
}

interface GenerateTocResult {
    toc: TableOfContents;
    fromMemory: boolean;
    timesUsed?: number;
}

/**
 * Generate TOC with memory pre-fill
 *
 * 1. Look up memory for org/type/discipline
 * 2. If found: Return TOC from memory (sorted by frequency)
 * 3. If not found: Fall back to AI generation
 */
export async function generateTocWithMemory(params: GenerateTocParams): Promise<GenerateTocResult> {
    const { organizationId, reportType, discipline } = params;

    // Look up memory
    const memory = await ragDb.query.reportMemory.findFirst({
        where: and(
            eq(reportMemory.organizationId, organizationId),
            eq(reportMemory.reportType, reportType),
            eq(reportMemory.discipline, discipline || '')
        ),
    });

    if (memory) {
        // Pre-fill from memory
        const approvedToc = memory.approvedToc as ApprovedToc;

        const toc: TableOfContents = {
            version: 1,
            source: 'memory',
            sections: approvedToc.sections.map((section, index) => ({
                id: `mem_s${index + 1}`,
                title: section.title,
                level: section.level,
                description: `Used ${section.frequency} times`,
            })),
        };

        return {
            toc,
            fromMemory: true,
            timesUsed: memory.timesUsed || 1,
        };
    }

    // No memory found - caller should fall back to AI generation
    return {
        toc: {
            version: 1,
            source: 'generated',
            sections: [],
        },
        fromMemory: false,
    };
}

// ============================================
// Utility: Fetch memory for display
// ============================================

export interface MemoryStats {
    exists: boolean;
    timesUsed: number;
    sectionCount: number;
    lastUsed: Date | null;
}

/**
 * Get memory statistics for a discipline
 * (useful for UI indicators)
 */
export async function getMemoryStats(
    organizationId: string,
    reportType: string,
    discipline: string | null
): Promise<MemoryStats> {
    const memory = await ragDb.query.reportMemory.findFirst({
        where: and(
            eq(reportMemory.organizationId, organizationId),
            eq(reportMemory.reportType, reportType),
            eq(reportMemory.discipline, discipline || '')
        ),
    });

    if (!memory) {
        return {
            exists: false,
            timesUsed: 0,
            sectionCount: 0,
            lastUsed: null,
        };
    }

    const approvedToc = memory.approvedToc as ApprovedToc;

    return {
        exists: true,
        timesUsed: memory.timesUsed || 1,
        sectionCount: approvedToc.sections.length,
        lastUsed: memory.lastUsedAt,
    };
}
