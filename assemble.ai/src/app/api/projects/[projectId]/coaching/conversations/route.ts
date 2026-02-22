import { NextRequest, NextResponse } from 'next/server';
import { db, coachingConversations, coachingMessages } from '@/lib/db';
import { eq, and, desc } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

/**
 * GET /api/projects/[projectId]/coaching/conversations
 * List conversations for a project, optionally filtered by module.
 */
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ projectId: string }> }
) {
    try {
        const { projectId } = await params;
        const { searchParams } = new URL(request.url);
        const module = searchParams.get('module');

        let conditions = eq(coachingConversations.projectId, projectId);
        if (module) {
            conditions = and(conditions, eq(coachingConversations.module, module))!;
        }

        const conversations = await db
            .select()
            .from(coachingConversations)
            .where(conditions)
            .orderBy(desc(coachingConversations.updatedAt));

        // Get message counts for each conversation
        const result = await Promise.all(
            conversations.map(async (conv) => {
                const messages = await db
                    .select()
                    .from(coachingMessages)
                    .where(eq(coachingMessages.conversationId, conv.id));
                return {
                    ...conv,
                    messageCount: messages.length,
                };
            })
        );

        return NextResponse.json(result);
    } catch (error) {
        console.error('Error fetching coaching conversations:', error);
        return NextResponse.json(
            { error: 'Failed to fetch conversations' },
            { status: 500 }
        );
    }
}

/**
 * POST /api/projects/[projectId]/coaching/conversations
 * Create a new conversation thread.
 * Body: { module: string, title?: string }
 */
export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ projectId: string }> }
) {
    try {
        const { projectId } = await params;
        const body = await request.json();
        const { module, title } = body;

        if (!module) {
            return NextResponse.json(
                { error: 'module is required' },
                { status: 400 }
            );
        }

        const id = uuidv4();
        const now = new Date().toISOString();

        await db.insert(coachingConversations).values({
            id,
            projectId,
            module,
            title: title || null,
            createdAt: now,
            updatedAt: now,
        });

        const [created] = await db
            .select()
            .from(coachingConversations)
            .where(eq(coachingConversations.id, id));

        return NextResponse.json(created, { status: 201 });
    } catch (error) {
        console.error('Error creating conversation:', error);
        return NextResponse.json(
            { error: 'Failed to create conversation' },
            { status: 500 }
        );
    }
}
