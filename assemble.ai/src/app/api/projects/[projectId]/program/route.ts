import { NextRequest, NextResponse } from 'next/server';
import {
    db,
    programActivities,
    programActivityEvidenceLinks,
    programActivityExpectedOutputs,
    programDependencies,
    programMilestones,
} from '@/lib/db';
import { eq, asc, inArray } from 'drizzle-orm';
import type { ProgramData } from '@/types/program';

// GET /api/projects/[projectId]/program - List all program data
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ projectId: string }> }
) {
    try {
        const { projectId } = await params;

        // Fetch all activities for the project
        const activities = await db
            .select()
            .from(programActivities)
            .where(eq(programActivities.projectId, projectId))
            .orderBy(asc(programActivities.sortOrder));

        // Fetch all dependencies for the project
        const dependencies = await db
            .select()
            .from(programDependencies)
            .where(eq(programDependencies.projectId, projectId));

        // Fetch all milestones for activities in this project
        const activityIds = activities.map((a) => a.id);
        let milestones: typeof programMilestones.$inferSelect[] = [];
        let expectedOutputs: typeof programActivityExpectedOutputs.$inferSelect[] = [];
        let evidenceLinks: typeof programActivityEvidenceLinks.$inferSelect[] = [];

        if (activityIds.length > 0) {
            milestones = await db
                .select()
                .from(programMilestones)
                .where(inArray(programMilestones.activityId, activityIds));

            expectedOutputs = await db
                .select()
                .from(programActivityExpectedOutputs)
                .where(inArray(programActivityExpectedOutputs.activityId, activityIds))
                .orderBy(asc(programActivityExpectedOutputs.sortOrder));

            evidenceLinks = await db
                .select()
                .from(programActivityEvidenceLinks)
                .where(inArray(programActivityEvidenceLinks.activityId, activityIds));
        }

        const expectedOutputsByActivity = new Map<string, typeof expectedOutputs>();
        for (const output of expectedOutputs) {
            const current = expectedOutputsByActivity.get(output.activityId) || [];
            current.push(output);
            expectedOutputsByActivity.set(output.activityId, current);
        }

        const evidenceLinksByActivity = new Map<string, typeof evidenceLinks>();
        for (const link of evidenceLinks) {
            const current = evidenceLinksByActivity.get(link.activityId) || [];
            current.push(link);
            evidenceLinksByActivity.set(link.activityId, current);
        }

        const data: ProgramData = {
            activities: activities.map((a) => ({
                id: a.id,
                projectId: a.projectId,
                parentId: a.parentId,
                name: a.name,
                startDate: a.startDate,
                endDate: a.endDate,
                collapsed: a.collapsed ?? false,
                color: a.color,
                sortOrder: a.sortOrder,
                createdAt: a.createdAt instanceof Date ? a.createdAt.toISOString() : (a.createdAt || new Date().toISOString()),
                updatedAt: a.updatedAt instanceof Date ? a.updatedAt.toISOString() : (a.updatedAt || new Date().toISOString()),
                expectedOutputs: (expectedOutputsByActivity.get(a.id) || []).map((output) => ({
                    id: output.id,
                    projectId: output.projectId,
                    activityId: output.activityId,
                    label: output.label,
                    description: output.description,
                    evidenceType: output.evidenceType,
                    isRequired: output.isRequired,
                    sortOrder: output.sortOrder,
                    createdAt: output.createdAt instanceof Date ? output.createdAt.toISOString() : (output.createdAt || new Date().toISOString()),
                    updatedAt: output.updatedAt instanceof Date ? output.updatedAt.toISOString() : (output.updatedAt || new Date().toISOString()),
                })),
                evidenceLinks: (evidenceLinksByActivity.get(a.id) || []).map((link) => ({
                    id: link.id,
                    projectId: link.projectId,
                    activityId: link.activityId,
                    expectedOutputId: link.expectedOutputId,
                    evidenceType: link.evidenceType,
                    evidenceId: link.evidenceId,
                    databaseEntityType: link.databaseEntityType,
                    status: link.status,
                    confidence: link.confidence,
                    note: link.note,
                    linkedBy: link.linkedBy,
                    createdAt: link.createdAt instanceof Date ? link.createdAt.toISOString() : (link.createdAt || new Date().toISOString()),
                    updatedAt: link.updatedAt instanceof Date ? link.updatedAt.toISOString() : (link.updatedAt || new Date().toISOString()),
                })),
            })),
            dependencies: dependencies.map((d) => ({
                id: d.id,
                projectId: d.projectId,
                fromActivityId: d.fromActivityId,
                toActivityId: d.toActivityId,
                type: d.type as 'FS' | 'SS' | 'FF',
                createdAt: d.createdAt instanceof Date ? d.createdAt.toISOString() : (d.createdAt || new Date().toISOString()),
            })),
            milestones: milestones.map((m) => ({
                id: m.id,
                activityId: m.activityId,
                name: m.name,
                date: m.date,
                sortOrder: m.sortOrder,
                createdAt: m.createdAt instanceof Date ? m.createdAt.toISOString() : (m.createdAt || new Date().toISOString()),
            })),
        };

        return NextResponse.json(data);
    } catch (error) {
        console.error('Error fetching program data:', error);
        return NextResponse.json(
            { error: 'Failed to fetch program data' },
            { status: 500 }
        );
    }
}
