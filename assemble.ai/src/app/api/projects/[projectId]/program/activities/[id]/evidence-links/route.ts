import { randomUUID } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { and, desc, eq } from 'drizzle-orm';
import {
    db,
    programActivities,
    programActivityEvidenceLinks,
    programActivityExpectedOutputs,
} from '@/lib/db';
import type { ProgramEvidenceLinkStatus, ProgramEvidenceType } from '@/types/program';

export const runtime = 'nodejs';

const EVIDENCE_TYPES = ['document', 'correspondence', 'database_record'] as const;
const LINK_STATUSES = ['candidate', 'confirmed', 'rejected'] as const;

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

async function expectedOutputBelongsToActivity(args: {
    projectId: string;
    activityId: string;
    expectedOutputId: string;
}): Promise<boolean> {
    const [output] = await db
        .select({ id: programActivityExpectedOutputs.id })
        .from(programActivityExpectedOutputs)
        .where(
            and(
                eq(programActivityExpectedOutputs.projectId, args.projectId),
                eq(programActivityExpectedOutputs.activityId, args.activityId),
                eq(programActivityExpectedOutputs.id, args.expectedOutputId)
            )
        )
        .limit(1);
    return Boolean(output);
}

export async function GET(request: NextRequest, { params }: RouteParams) {
    try {
        const { projectId, id } = await params;
        if (!(await activityExists(projectId, id))) {
            return NextResponse.json({ error: 'Activity not found' }, { status: 404 });
        }

        const links = await db
            .select()
            .from(programActivityEvidenceLinks)
            .where(
                and(
                    eq(programActivityEvidenceLinks.projectId, projectId),
                    eq(programActivityEvidenceLinks.activityId, id)
                )
            )
            .orderBy(desc(programActivityEvidenceLinks.createdAt));

        return NextResponse.json(links);
    } catch (error) {
        console.error('[GET evidence links] Error:', error);
        return NextResponse.json({ error: 'Failed to fetch evidence links' }, { status: 500 });
    }
}

export async function POST(request: NextRequest, { params }: RouteParams) {
    try {
        const { projectId, id } = await params;
        const body = await request.json();

        if (!(await activityExists(projectId, id))) {
            return NextResponse.json({ error: 'Activity not found' }, { status: 404 });
        }

        if (!EVIDENCE_TYPES.includes(body.evidenceType)) {
            return NextResponse.json({ error: 'Invalid evidence type' }, { status: 400 });
        }

        if (!body.evidenceId?.trim()) {
            return NextResponse.json({ error: 'evidenceId is required' }, { status: 400 });
        }

        const status = body.status ?? 'candidate';
        if (!LINK_STATUSES.includes(status)) {
            return NextResponse.json({ error: 'Invalid link status' }, { status: 400 });
        }

        if (
            body.expectedOutputId &&
            !(await expectedOutputBelongsToActivity({
                projectId,
                activityId: id,
                expectedOutputId: body.expectedOutputId,
            }))
        ) {
            return NextResponse.json({ error: 'Expected output not found' }, { status: 404 });
        }

        const [created] = await db
            .insert(programActivityEvidenceLinks)
            .values({
                id: randomUUID(),
                projectId,
                activityId: id,
                expectedOutputId: body.expectedOutputId || null,
                evidenceType: body.evidenceType as ProgramEvidenceType,
                evidenceId: body.evidenceId.trim(),
                databaseEntityType: body.databaseEntityType?.trim() || null,
                status: status as ProgramEvidenceLinkStatus,
                confidence: Number.isInteger(body.confidence) ? body.confidence : null,
                note: body.note?.trim() || null,
                linkedBy: body.linkedBy?.trim() || 'system',
                createdAt: new Date(),
                updatedAt: new Date(),
            })
            .returning();

        return NextResponse.json(created, { status: 201 });
    } catch (error) {
        console.error('[POST evidence links] Error:', error);
        return NextResponse.json({ error: 'Failed to create evidence link' }, { status: 500 });
    }
}
