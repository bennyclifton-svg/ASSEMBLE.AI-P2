import { NextRequest, NextResponse } from 'next/server';
import { db, coachingConversations, coachingMessages } from '@/lib/db';
import { eq, and, asc } from 'drizzle-orm';

/**
 * GET /api/projects/[projectId]/coaching/conversations/[conversationId]
 * Get a conversation with its messages.
 */
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ projectId: string; conversationId: string }> }
) {
    try {
        const { projectId, conversationId } = await params;

        const [conversation] = await db
            .select()
            .from(coachingConversations)
            .where(
                and(
                    eq(coachingConversations.id, conversationId),
                    eq(coachingConversations.projectId, projectId)
                )
            );

        if (!conversation) {
            return NextResponse.json(
                { error: 'Conversation not found' },
                { status: 404 }
            );
        }

        const messages = await db
            .select()
            .from(coachingMessages)
            .where(eq(coachingMessages.conversationId, conversationId))
            .orderBy(asc(coachingMessages.createdAt));

        // Parse JSON fields
        const parsedMessages = messages.map((m) => ({
            ...m,
            sources: m.sources ? JSON.parse(m.sources) : null,
            relatedChecklistItems: m.relatedChecklistItems
                ? JSON.parse(m.relatedChecklistItems)
                : null,
        }));

        return NextResponse.json({
            ...conversation,
            messages: parsedMessages,
        });
    } catch (error) {
        console.error('Error fetching conversation:', error);
        return NextResponse.json(
            { error: 'Failed to fetch conversation' },
            { status: 500 }
        );
    }
}

/**
 * DELETE /api/projects/[projectId]/coaching/conversations/[conversationId]
 * Delete a conversation and its messages.
 */
export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ projectId: string; conversationId: string }> }
) {
    try {
        const { projectId, conversationId } = await params;

        const [conversation] = await db
            .select()
            .from(coachingConversations)
            .where(
                and(
                    eq(coachingConversations.id, conversationId),
                    eq(coachingConversations.projectId, projectId)
                )
            );

        if (!conversation) {
            return NextResponse.json(
                { error: 'Conversation not found' },
                { status: 404 }
            );
        }

        await db
            .delete(coachingConversations)
            .where(eq(coachingConversations.id, conversationId));

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error deleting conversation:', error);
        return NextResponse.json(
            { error: 'Failed to delete conversation' },
            { status: 500 }
        );
    }
}
