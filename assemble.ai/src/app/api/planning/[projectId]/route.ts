import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import {
    projects,
    projectDetails,
    projectObjectives,
    projectStages,
    risks,
    stakeholders,
    projectProfiles
} from '@/lib/db';
import { eq } from 'drizzle-orm';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ projectId: string }> }
) {
    try {
        const { projectId } = await params;

        // Fetch all planning data for the project
        const [project] = await db.select().from(projects).where(eq(projects.id, projectId));
        const [details] = await db.select().from(projectDetails).where(eq(projectDetails.projectId, projectId));
        const [objectives] = await db.select().from(projectObjectives).where(eq(projectObjectives.projectId, projectId));
        const stages = await db.select().from(projectStages).where(eq(projectStages.projectId, projectId));
        const projectRisks = await db.select().from(risks).where(eq(risks.projectId, projectId));
        const projectStakeholders = await db.select().from(stakeholders).where(eq(stakeholders.projectId, projectId));
        const [profile] = await db.select().from(projectProfiles).where(eq(projectProfiles.projectId, projectId));

        // Parse JSON fields in profile if they exist
        const parsedProfile = profile ? {
            ...profile,
            subclass: typeof profile.subclass === 'string' ? JSON.parse(profile.subclass) : profile.subclass,
            subclassOther: profile.subclassOther ? (typeof profile.subclassOther === 'string' ? JSON.parse(profile.subclassOther) : profile.subclassOther) : null,
            scaleData: typeof profile.scaleData === 'string' ? JSON.parse(profile.scaleData) : profile.scaleData,
            complexity: typeof profile.complexity === 'string' ? JSON.parse(profile.complexity) : profile.complexity,
        } : null;

        return NextResponse.json({
            details: {
                ...details,
                projectName: details?.projectName || project?.name || '',
                projectType: project?.projectType || null,
            },
            objectives: objectives || null,
            stages,
            risks: projectRisks,
            stakeholders: projectStakeholders,
            profile: parsedProfile,
        });
    } catch (error) {
        console.error('Error fetching planning data:', error);
        return NextResponse.json(
            { error: 'Failed to fetch planning data' },
            { status: 500 }
        );
    }
}
