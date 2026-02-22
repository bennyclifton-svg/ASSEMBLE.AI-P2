import { NextRequest, NextResponse } from 'next/server';
import { db, coachingMessages } from '@/lib/db';
import { eq, and } from 'drizzle-orm';

/**
 * PATCH /api/projects/[projectId]/coaching/conversations/[conversationId]/messages
 * Toggle isSaved or isPinned on a message.
 * Body: { messageId: string, isSaved?: boolean, isPinned?: boolean }
 */
export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ projectId: string; conversationId: string }> }
) {
    try {
        const { conversationId } = await params;
        const body = await request.json();
        const { messageId, isSaved, isPinned } = body;

        if (!messageId) {
            return NextResponse.json(
                { error: 'messageId is required' },
                { status: 400 }
            );
        }

        const [message] = await db
            .select()
            .from(coachingMessages)
            .where(
                and(
                    eq(coachingMessages.id, messageId),
                    eq(coachingMessages.conversationId, conversationId)
                )
            );

        if (!message) {
            return NextResponse.json(
                { error: 'Message not found' },
                { status: 404 }
            );
        }

        const updates: Record<string, boolean> = {};
        if (typeof isSaved === 'boolean') updates.isSaved = isSaved;
        if (typeof isPinned === 'boolean') updates.isPinned = isPinned;

        if (Object.keys(updates).length === 0) {
            return NextResponse.json(
                { error: 'At least one of isSaved or isPinned is required' },
                { status: 400 }
            );
        }

        await db
            .update(coachingMessages)
            .set(updates)
            .where(eq(coachingMessages.id, messageId));

        const [updated] = await db
            .select()
            .from(coachingMessages)
            .where(eq(coachingMessages.id, messageId));

        return NextResponse.json({
            ...updated,
            sources: updated.sources ? JSON.parse(updated.sources) : null,
            relatedChecklistItems: updated.relatedChecklistItems
                ? JSON.parse(updated.relatedChecklistItems)
                : null,
        });
    } catch (error) {
        console.error('Error updating message:', error);
        return NextResponse.json(
            { error: 'Failed to update message' },
            { status: 500 }
        );
    }
}
