/**
 * AI Coaching Q&A API
 * POST /api/ai/coaching-qa
 *
 * Takes a user question + module context, calls Context Orchestrator,
 * generates a coaching answer with source attribution.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/get-user';
import { db, coachingConversations, coachingMessages } from '@/lib/db';
import { eq, asc } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import Anthropic from '@anthropic-ai/sdk';
import { assembleContext } from '@/lib/context/orchestrator';
import { BASE_SYSTEM_PROMPT } from '@/lib/prompts/system-prompts';
import { COACHING_SYSTEM_LAYER } from '@/lib/prompts/system-prompts';

interface CoachingQARequest {
    projectId: string;
    question: string;
    module: string;
    conversationId?: string;
}

export async function POST(req: NextRequest) {
    try {
        const authResult = await getCurrentUser();
        if (!authResult.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body: CoachingQARequest = await req.json();
        const { projectId, question, module, conversationId } = body;

        if (!projectId || !question || !module) {
            return NextResponse.json(
                { error: 'projectId, question, and module are required' },
                { status: 400 }
            );
        }

        // Create or get conversation thread
        let threadId = conversationId;
        if (!threadId) {
            threadId = uuidv4();
            const now = new Date().toISOString();
            await db.insert(coachingConversations).values({
                id: threadId,
                projectId,
                module,
                title: question.length > 60 ? question.slice(0, 57) + '...' : question,
                createdAt: now,
                updatedAt: now,
            });
        }

        // Save user message
        const userMessageId = uuidv4();
        await db.insert(coachingMessages).values({
            id: userMessageId,
            conversationId: threadId,
            role: 'user',
            content: question,
            createdAt: new Date().toISOString(),
        });

        // Get previous messages for context (last 3 pairs)
        const previousMessages = await db
            .select()
            .from(coachingMessages)
            .where(eq(coachingMessages.conversationId, threadId))
            .orderBy(asc(coachingMessages.createdAt));

        const recentMessages = previousMessages.slice(-6);

        // Assemble project context via orchestrator
        const context = await assembleContext({
            projectId,
            task: question,
            contextType: 'coaching-qa',
            sectionKey: module,
        });

        // Build system prompt
        const systemPrompt = `${BASE_SYSTEM_PROMPT}\n${COACHING_SYSTEM_LAYER}`;

        // Build messages array with conversation history
        const messages: { role: 'user' | 'assistant'; content: string }[] = [];
        for (const msg of recentMessages) {
            if (msg.id === userMessageId) continue; // Skip the one we just inserted
            messages.push({
                role: msg.role as 'user' | 'assistant',
                content: msg.content,
            });
        }

        // Add current question with context
        const contextBlock = [
            context.projectSummary && `## Project Summary\n${context.projectSummary}`,
            context.moduleContext && `## Module Data\n${context.moduleContext}`,
            context.knowledgeContext && `## Knowledge Base\n${context.knowledgeContext}`,
            context.ragContext && `## Project Documents\n${context.ragContext}`,
        ]
            .filter(Boolean)
            .join('\n\n');

        messages.push({
            role: 'user',
            content: `${contextBlock ? `${contextBlock}\n\n---\n\n` : ''}## Question\n${question}\n\nProvide a specific, data-grounded answer. At the end of your response, add a "Sources:" section listing what data you referenced.`,
        });

        // Call Claude API
        const anthropic = new Anthropic();
        const response = await anthropic.messages.create({
            model: 'claude-sonnet-4-20250514',
            max_tokens: 1500,
            system: systemPrompt,
            messages,
        });

        const textContent = response.content.find((c) => c.type === 'text');
        if (!textContent || textContent.type !== 'text') {
            throw new Error('No text response from AI');
        }

        const answer = textContent.text;
        const tokensUsed = response.usage.input_tokens + response.usage.output_tokens;

        // Parse sources from the answer (best-effort extraction)
        const sources = extractSources(answer, module);

        // Generate follow-up suggestions
        const suggestedFollowups = generateFollowupSuggestions(question, module);

        // Save assistant message
        const assistantMessageId = uuidv4();
        await db.insert(coachingMessages).values({
            id: assistantMessageId,
            conversationId: threadId,
            role: 'assistant',
            content: answer,
            sources: JSON.stringify(sources),
            suggestedFollowups,
            tokensUsed,
            createdAt: new Date().toISOString(),
        });

        // Update conversation timestamp
        await db
            .update(coachingConversations)
            .set({ updatedAt: new Date().toISOString() })
            .where(eq(coachingConversations.id, threadId));

        return NextResponse.json({
            answer,
            sources,
            suggestedFollowups,
            conversationId: threadId,
            messageId: assistantMessageId,
            tokensUsed,
        });
    } catch (error) {
        console.error('[ai/coaching-qa] Error:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Internal server error' },
            { status: 500 }
        );
    }
}

function extractSources(answer: string, module: string) {
    const sources: { type: string; name: string; detail: string }[] = [];

    // Check for explicit "Sources:" section in the answer
    const sourcesMatch = answer.match(/Sources?:?\s*\n([\s\S]*?)$/i);
    if (sourcesMatch) {
        const lines = sourcesMatch[1].split('\n').filter((l) => l.trim());
        for (const line of lines) {
            const clean = line.replace(/^[-·•*]\s*/, '').trim();
            if (clean) {
                sources.push({
                    type: inferSourceType(clean),
                    name: clean.split('(')[0].trim(),
                    detail: clean,
                });
            }
        }
    }

    // Fallback: always attribute the module
    if (sources.length === 0) {
        sources.push({
            type: 'module_data',
            name: `${module.replace('_', ' ')} data`,
            detail: `Based on project ${module.replace('_', ' ')} data`,
        });
    }

    return sources;
}

function inferSourceType(text: string): string {
    const lower = text.toLowerCase();
    if (lower.includes('cost plan') || lower.includes('budget') || lower.includes('program') || lower.includes('procurement'))
        return 'module_data';
    if (lower.includes('guide') || lower.includes('domain') || lower.includes('knowledge'))
        return 'knowledge_domain';
    if (lower.includes('document') || lower.includes('report') || lower.includes('submission'))
        return 'rag_document';
    if (lower.includes('profile') || lower.includes('class') || lower.includes('project type'))
        return 'project_profile';
    return 'module_data';
}

function generateFollowupSuggestions(question: string, module: string): string[] {
    const lower = question.toLowerCase();
    const suggestions: string[] = [];

    if (module === 'cost_plan') {
        if (lower.includes('contingency')) {
            suggestions.push('How does my contingency drawdown compare to project progress?');
            suggestions.push('Which cost lines have the highest variance?');
        } else if (lower.includes('budget') || lower.includes('cost')) {
            suggestions.push('What contingency percentage is appropriate for this project?');
            suggestions.push('Which line items are at risk of overrun?');
        } else {
            suggestions.push('How does my budget compare to benchmarks?');
            suggestions.push('Are there any cost lines I should review?');
        }
    } else if (module === 'procurement') {
        suggestions.push('What should I include in the evaluation criteria?');
        suggestions.push('Are there any procurement risks I should address?');
    } else if (module === 'program') {
        suggestions.push('Is my timeline realistic for this project type?');
        suggestions.push('What milestones am I missing?');
    } else {
        suggestions.push('What should I focus on next?');
        suggestions.push('Are there any risks I should be aware of?');
    }

    return suggestions.slice(0, 3);
}
