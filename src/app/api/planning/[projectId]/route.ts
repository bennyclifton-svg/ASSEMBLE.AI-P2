import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import {
    projectDetails,
    projectObjectives,
    projectStages,
    risks,
    stakeholders
} from '@/lib/db';
import { eq } from 'drizzle-orm';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ projectId: string }> }
) {
    try {
        const { projectId } = await params;

        // Fetch all planning data for the project
        const [details] = await db.select().from(projectDetails).where(eq(projectDetails.projectId, projectId));
        const [objectives] = await db.select().from(projectObjectives).where(eq(projectObjectives.projectId, projectId));
        const stages = await db.select().from(projectStages).where(eq(projectStages.projectId, projectId));
        const projectRisks = await db.select().from(risks).where(eq(risks.projectId, projectId));
        const projectStakeholders = await db.select().from(stakeholders).where(eq(stakeholders.projectId, projectId));

        return NextResponse.json({
            details: details || null,
            objectives: objectives || null,
            stages,
            risks: projectRisks,
            stakeholders: projectStakeholders,
        });
    } catch (error) {
        console.error('Error fetching planning data:', error);
        return NextResponse.json(
            { error: 'Failed to fetch planning data' },
            { status: 500 }
        );
    }
}
