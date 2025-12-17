import { NextRequest, NextResponse } from 'next/server';
import { db, programDependencies } from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';

// POST /api/projects/[projectId]/program/dependencies - Create dependency
export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ projectId: string }> }
) {
    try {
        const { projectId } = await params;
        const body = await request.json();
        const { fromActivityId, toActivityId, type } = body;

        if (!fromActivityId || !toActivityId || !type) {
            return NextResponse.json(
                { error: 'fromActivityId, toActivityId, and type are required' },
                { status: 400 }
            );
        }

        if (!['FS', 'SS', 'FF'].includes(type)) {
            return NextResponse.json(
                { error: 'type must be FS, SS, or FF' },
                { status: 400 }
            );
        }

        if (fromActivityId === toActivityId) {
            return NextResponse.json(
                { error: 'Cannot create dependency to self' },
                { status: 400 }
            );
        }

        const id = uuidv4();

        await db.insert(programDependencies).values({
            id,
            projectId,
            fromActivityId,
            toActivityId,
            type,
        });

        return NextResponse.json({
            id,
            projectId,
            fromActivityId,
            toActivityId,
            type,
            createdAt: new Date().toISOString(),
        }, { status: 201 });
    } catch (error) {
        console.error('Error creating dependency:', error);
        return NextResponse.json(
            { error: 'Failed to create dependency' },
            { status: 500 }
        );
    }
}
