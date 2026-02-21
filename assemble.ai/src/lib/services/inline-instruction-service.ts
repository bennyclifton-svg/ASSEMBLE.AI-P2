/**
 * Inline Instruction Service
 * Intelligence Layer - Pillar 3: // Inline Instructions
 *
 * Executes user inline instructions by assembling project context
 * via the Context Orchestrator and calling Claude for content generation.
 */

import Anthropic from '@anthropic-ai/sdk';
import { assembleContext } from '@/lib/context/orchestrator';
import { buildSystemPrompt } from '@/lib/prompts/system-prompts';

interface ExecuteInstructionParams {
  projectId: string;
  instruction: string;
  contextType: 'note' | 'meeting' | 'report';
  contextId: string;
  sectionId?: string;
  existingContent?: string;
}

interface ExecuteInstructionResult {
  content: string;
  sourcesUsed: {
    ragChunks: number;
    knowledgeDomains: string[];
  };
}

/**
 * Clean up AI-generated content by removing excessive blank lines
 */
function cleanupFormatting(content: string): string {
  return content
    .split('\n')
    .map(line => line.trim())
    .filter(line => {
      if (line === '') return true;
      if (/^[•\-*]\s*$/.test(line)) return false;
      return true;
    })
    .join('\n')
    .replace(/\n{2,}/g, '\n\n')
    .trim();
}

export async function executeInlineInstruction(
  params: ExecuteInstructionParams
): Promise<ExecuteInstructionResult> {
  const {
    projectId,
    instruction,
    contextType,
    sectionId,
    existingContent,
  } = params;

  // Assemble context via the unified orchestrator
  const assembled = await assembleContext({
    projectId,
    contextType: 'inline-instruction',
    sectionKey: sectionId,
    task: instruction,
  });

  // Build context string from assembled parts
  const contextParts: string[] = [];

  if (existingContent?.trim()) {
    contextParts.push(`## Surrounding Editor Content\n${existingContent}`);
  }

  if (assembled.projectSummary) {
    contextParts.push(assembled.projectSummary);
  }

  if (assembled.moduleContext) {
    contextParts.push(assembled.moduleContext);
  }

  if (assembled.ragContext) {
    contextParts.push(assembled.ragContext);
  }

  if (assembled.crossModuleInsights) {
    contextParts.push(assembled.crossModuleInsights);
  }

  const contextString = contextParts.join('\n\n---\n\n');

  // Build system prompt
  const systemPrompt = buildSystemPrompt('inline-instruction');

  // Build user message
  const userMessage = `## Inline Instruction
${instruction}

## Context Type
${contextType}${sectionId ? ` (section: ${sectionId})` : ''}

## Available Context
${contextString || 'No additional context available. Execute the instruction based on professional best practices.'}

Execute the instruction above. Return ONLY the replacement content as HTML. Do not include the original "//" instruction in your output.`;

  // Call Claude
  const anthropic = new Anthropic();
  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1500,
    system: systemPrompt,
    messages: [{ role: 'user', content: userMessage }],
  });

  const textContent = message.content.find(c => c.type === 'text');
  if (!textContent || textContent.type !== 'text') {
    throw new Error('No text response from AI');
  }

  return {
    content: cleanupFormatting(textContent.text),
    sourcesUsed: {
      ragChunks: assembled.metadata.modulesFetched.includes('ragDocuments') ? 1 : 0,
      knowledgeDomains: [],
    },
  };
}
