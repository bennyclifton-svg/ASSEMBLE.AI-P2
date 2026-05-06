import { randomUUID } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { and, asc, eq } from 'drizzle-orm';
import { db, programActivities, programActivityExpectedOutputs } from '@/lib/db';
import type { ProgramEvidenceType } from '@/types/program';

export const runtime = 'nodejs';

const EVIDENCE_TYPES = ['document', 'correspondence', 'database_record'] as const;

interface RouteParams {
    params: Promise<{ projectId: string; id: string }>;
}

async function activityExists(projectId: string, activityId: string): Promise<boolean> {
    const [activity] = await db
        .select({ id: programActivities.id })
        .from(programActivities)
        .where(and(eq(programActivities.projectId, projectId), eq(programActivities.id, activityId)))
        .limit(1);
    return Boolean(activity);
}

export async function GET(request: NextRequest, { params }: RouteParams) {
    try {
        const { projectId, id } = await params;
        if (!(await activityExists(projectId, id))) {
            return NextResponse.json({ error: 'Activity not found' }, { status: 404 });
        }

        const outputs = await db
            .select()
            .from(programActivityExpectedOutputs)
            .where(
                and(
                    eq(programActivityExpectedOutputs.projectId, projectId),
                    eq(programActivityExpectedOutputs.activityId, id)
                )
            )
            .orderBy(asc(programActivityExpectedOutputs.sortOrder));

        return NextResponse.json(outputs);
    } catch (error) {
        console.error('[GET expected outputs] Error:', error);
        return NextResponse.json({ error: 'Failed to fetch expected outputs' }, { status: 500 });
    }
}

export async function POST(request: NextRequest, { params }: RouteParams) {
    try {
        const { projectId, id } = await params;
        const body = await request.json();

        if (!(await activityExists(projectId, id))) {
            return NextResponse.json({ error: 'Activity not found' }, { status: 404 });
        }

        if (!body.label?.trim()) {
            return NextResponse.json({ error: 'label is required' }, { status: 400 });
        }

        const evidenceType = body.evidenceType ?? null;
        if (evidenceType && !EVIDENCE_TYPES.includes(evidenceType)) {
            return NextResponse.json({ error: 'Invalid evidence type' }, { status: 400 });
        }

        const [created] = await db
            .insert(programActivityExpectedOutputs)
            .values({
                id: randomUUID(),
                projectId,
                activityId: id,
                label: body.label.trim(),
                description: body.description?.trim() || null,
                evidenceType: evidenceType as ProgramEvidenceType | null,
                isRequired: body.isRequired ?? true,
                sortOrder: Number.isInteger(body.sortOrder) ? body.sortOrder : 0,
                createdAt: new Date(),
                updatedAt: new Date(),
            })
            .returning();

        return NextResponse.json(created, { status: 201 });
    } catch (error) {
        console.error('[POST expected outputs] Error:', error);
        return NextResponse.json({ error: 'Failed to create expected output' }, { status: 500 });
    }
}
