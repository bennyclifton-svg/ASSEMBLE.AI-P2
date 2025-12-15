import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/index';
import { projects } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth/get-user';
import { eq, and } from 'drizzle-orm';

export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ projectId: string }> }
) {
    try {
        const { projectId } = await params;

        // Get authenticated user
        const authResult = await getCurrentUser();
        if (!authResult.user) {
            return NextResponse.json({ error: authResult.error }, { status: authResult.status });
        }

        if (!authResult.user.organizationId) {
            return NextResponse.json(
                { error: 'User has no organization' },
                { status: 400 }
            );
        }

        const body = await request.json();
        const { name, code, status } = body;

        // Build update object with only provided fields
        const updateData: Record<string, string> = {
            updatedAt: new Date().toISOString(),
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
                    eq(projects.organizationId, authResult.user.organizationId)
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
    request: NextRequest,
    { params }: { params: Promise<{ projectId: string }> }
) {
    try {
        const { projectId } = await params;

        // Get authenticated user
        const authResult = await getCurrentUser();
        if (!authResult.user) {
            return NextResponse.json({ error: authResult.error }, { status: authResult.status });
        }

        if (!authResult.user.organizationId) {
            return NextResponse.json(
                { error: 'User has no organization' },
                { status: 400 }
            );
        }

        // Get project (ensuring it belongs to user's organization)
        const result = await db
            .select()
            .from(projects)
            .where(
                and(
                    eq(projects.id, projectId),
                    eq(projects.organizationId, authResult.user.organizationId)
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
