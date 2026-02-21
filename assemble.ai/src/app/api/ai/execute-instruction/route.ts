/**
 * Execute Inline Instruction API
 * POST /api/ai/execute-instruction
 *
 * Intelligence Layer - Pillar 3: // Inline Instructions
 *
 * Executes a user's inline instruction (typed as "// [instruction]" in an editor)
 * by assembling project context and generating replacement content via Claude.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/get-user';
import { executeInstructionSchema } from '@/lib/validations/notes-meetings-reports-schema';
import { executeInlineInstruction } from '@/lib/services/inline-instruction-service';

export async function POST(req: NextRequest) {
  try {
    // Authenticate
    const authResult = await getCurrentUser();
    if (!authResult.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse and validate
    const body = await req.json();
    const validationResult = executeInstructionSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: validationResult.error.issues },
        { status: 400 }
      );
    }

    const request = validationResult.data;

    // Execute instruction
    const result = await executeInlineInstruction({
      projectId: request.projectId,
      instruction: request.instruction,
      contextType: request.contextType,
      contextId: request.contextId,
      sectionId: request.sectionId,
      existingContent: request.existingContent,
    });

    return NextResponse.json(result);

  } catch (error) {
    console.error('[ai/execute-instruction] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
