import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/index';
import { projects } from '@/lib/db';
import {
    isAccessDenied,
    requireProjectReadAccess,
    requireWritableProjectAccess,
} from '@/lib/auth/project-access';
import { eq, and } from 'drizzle-orm';

export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ projectId: string }> }
) {
    try {
        const { projectId } = await params;

        const access = await requireWritableProjectAccess(projectId);
        if (isAccessDenied(access)) return access.response;

        const body = await request.json();
        const { name, code, status } = body;

        // Build update object with only provided fields
        const updateData: Record<string, unknown> = {
            updatedAt: new Date(),
        };

        if (name !== undefined) {
            if (typeof name !== 'string' || name.trim() === '') {
                return NextResponse.json(
                    { error: 'Project name cannot be empty' },
                    { status: 400 }
                );
            }
            updateData.name = name.trim();
        }

        if (code !== undefined) {
            updateData.code = code?.trim() || '';
        }

        if (status !== undefined) {
            if (!['active', 'pending', 'archived'].includes(status)) {
                return NextResponse.json(
                    { error: 'Invalid status value' },
                    { status: 400 }
                );
            }
            updateData.status = status;
        }

        // Update project (ensuring it belongs to user's organization)
        const result = await db
            .update(projects)
            .set(updateData)
            .where(
                and(
                    eq(projects.id, projectId),
                    eq(projects.organizationId, access.organizationId)
                )
            )
            .returning();

        if (result.length === 0) {
            return NextResponse.json(
                { error: 'Project not found' },
                { status: 404 }
            );
        }

        return NextResponse.json(result[0]);
    } catch (error) {
        console.error('Error updating project:', error);
        return NextResponse.json(
            { error: 'Failed to update project' },
            { status: 500 }
        );
    }
}

export async function GET(
    _request: NextRequest,
    { params }: { params: Promise<{ projectId: string }> }
) {
    try {
        const { projectId } = await params;

        const access = await requireProjectReadAccess(projectId);
        if (isAccessDenied(access)) return access.response;

        // Get project (ensuring it belongs to user's organization)
        const result = await db
            .select()
            .from(projects)
            .where(
                and(
                    eq(projects.id, projectId),
                    eq(projects.organizationId, access.organizationId)
                )
            );

        if (result.length === 0) {
            return NextResponse.json(
                { error: 'Project not found' },
                { status: 404 }
            );
        }

        return NextResponse.json(result[0]);
    } catch (error) {
        console.error('Error fetching project:', error);
        return NextResponse.json(
            { error: 'Failed to fetch project' },
            { status: 500 }
        );
    }
}
