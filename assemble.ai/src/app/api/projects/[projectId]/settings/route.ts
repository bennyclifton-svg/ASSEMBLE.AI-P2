import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/index';
import { projects } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth/get-user';
import { eq, and } from 'drizzle-orm';

/**
 * GET /api/projects/[projectId]/settings
 * Get project settings including feature toggles
 */
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

        // Get project settings (ensuring it belongs to user's organization)
        const result = await db
            .select({
                drawingExtractionEnabled: projects.drawingExtractionEnabled,
            })
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

        return NextResponse.json({
            // Default to true if null
            drawingExtractionEnabled: result[0].drawingExtractionEnabled ?? true,
        });
    } catch (error) {
        console.error('Error fetching project settings:', error);
        return NextResponse.json(
            { error: 'Failed to fetch project settings' },
            { status: 500 }
        );
    }
}

/**
 * PATCH /api/projects/[projectId]/settings
 * Update project settings
 */
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
        const { drawingExtractionEnabled } = body;

        // Build update object with only provided fields
        const updateData: Record<string, unknown> = {
            updatedAt: new Date(),
        };

        if (drawingExtractionEnabled !== undefined) {
            if (typeof drawingExtractionEnabled !== 'boolean') {
                return NextResponse.json(
                    { error: 'drawingExtractionEnabled must be a boolean' },
                    { status: 400 }
                );
            }
            updateData.drawingExtractionEnabled = drawingExtractionEnabled;
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
            .returning({
                drawingExtractionEnabled: projects.drawingExtractionEnabled,
            });

        if (result.length === 0) {
            return NextResponse.json(
                { error: 'Project not found' },
                { status: 404 }
            );
        }

        return NextResponse.json({
            success: true,
            drawingExtractionEnabled: result[0].drawingExtractionEnabled ?? true,
        });
    } catch (error) {
        console.error('Error updating project settings:', error);
        return NextResponse.json(
            { error: 'Failed to update project settings' },
            { status: 500 }
        );
    }
}
