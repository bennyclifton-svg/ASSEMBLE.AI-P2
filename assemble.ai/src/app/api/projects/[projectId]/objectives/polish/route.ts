/**
 * Objectives Polish API
 * Polish/improve user-written objectives using AI
 * Feature: 019-profiler
 */

import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { profilerObjectives, projectProfiles } from '@/lib/db/pg-schema';
import Anthropic from '@anthropic-ai/sdk';
import { trackPolishEdit, identifyEditPatterns } from '@/lib/services/pattern-learning';

const anthropic = new Anthropic();

type ObjectiveSection = 'functionalQuality' | 'planningCompliance';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const { projectId } = await params;
    const body = await request.json();

    // Support both old format (both sections) and new format (single section)
    const section = body.section as ObjectiveSection | undefined;
    const content = body.content as string | undefined;

    // Legacy support for old format
    const functionalQualityUser = body.functionalQualityUser as string | undefined;
    const planningComplianceUser = body.planningComplianceUser as string | undefined;

    // Determine what to polish
    let polishFunctional = false;
    let polishPlanning = false;
    let functionalContent = '';
    let planningContent = '';

    if (section && content) {
      // New single-section format
      if (section === 'functionalQuality') {
        polishFunctional = true;
        functionalContent = content;
      } else {
        polishPlanning = true;
        planningContent = content;
      }
    } else if (functionalQualityUser || planningComplianceUser) {
      // Legacy format
      if (functionalQualityUser) {
        polishFunctional = true;
        functionalContent = functionalQualityUser;
      }
      if (planningComplianceUser) {
        polishPlanning = true;
        planningContent = planningComplianceUser;
      }
    } else {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: 'No content provided to polish' } },
        { status: 400 }
      );
    }

    // Optionally fetch profile for context
    const [profile] = await db
      .select()
      .from(projectProfiles)
      .where(eq(projectProfiles.projectId, projectId))
      .limit(1);

    let profileContext = '';
    if (profile) {
      const buildingClass = profile.buildingClass;
      const projectType = profile.projectType;
      const subclass = JSON.parse(profile.subclass || '[]');
      const scaleData = JSON.parse(profile.scaleData || '{}');
      profileContext = `
Project Context:
- Building Class: ${buildingClass}
- Project Type: ${projectType}
- Subclass: ${subclass.join(', ')}
- Scale: ${JSON.stringify(scaleData)}
`;
    }

    // Build prompt based on what sections need polishing
    const polishBoth = polishFunctional && polishPlanning;

    const contentToPolish = polishBoth
      ? `Functional & Quality:\n${functionalContent}\n\nPlanning & Compliance:\n${planningContent}`
      : polishFunctional
      ? `Functional & Quality:\n${functionalContent}`
      : `Planning & Compliance:\n${planningContent}`;

    const responseFormat = polishBoth
      ? `{
  "functionalQualityPolished": "polished functional and quality objectives",
  "planningCompliancePolished": "polished planning and compliance objectives"
}`
      : polishFunctional
      ? `{
  "polished": "polished functional and quality objectives"
}`
      : `{
  "polished": "polished planning and compliance objectives"
}`;

    // Use AI to polish the content
    const prompt = `You are an expert construction project manager and technical writer in Australia. Polish and improve the following project objectives while preserving the original intent and key information.

${profileContext}

CURRENT OBJECTIVES TO POLISH:

${contentToPolish}

INSTRUCTIONS:
1. Convert content to clear headings with concise bullet points
2. Improve clarity and professional tone while keeping text brief
3. Add relevant technical details and standards references as specific bullets (NCC/BCA, Australian Standards)
4. Make objectives specific and measurable
5. Preserve all original key information and intent
6. Use formal but concise language suitable for tender documentation
7. Remove redundant words and combine related points

Respond in JSON format:
${responseFormat}`;

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      messages: [{ role: 'user', content: prompt }],
    });

    // Extract text from response
    const textContent = response.content.find(c => c.type === 'text');
    if (!textContent || textContent.type !== 'text') {
      throw new Error('No text response from AI');
    }

    // Parse JSON from response
    let polished: { polished?: string; functionalQualityPolished?: string; planningCompliancePolished?: string };
    try {
      // Extract JSON from response (handle markdown code blocks)
      let jsonText = textContent.text;
      const jsonMatch = jsonText.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (jsonMatch) {
        jsonText = jsonMatch[1];
      }
      polished = JSON.parse(jsonText.trim());
    } catch (e) {
      console.error('Failed to parse AI response:', e);
      // Fallback to original content
      polished = {};
      if (polishFunctional) polished.polished = functionalContent;
      if (polishPlanning) polished.polished = planningContent;
    }

    // Normalize response for single-section format
    const functionalPolished = polished.functionalQualityPolished || (polishFunctional && !polishPlanning ? polished.polished : undefined);
    const planningPolished = polished.planningCompliancePolished || (polishPlanning && !polishFunctional ? polished.polished : undefined);

    // Fetch existing objectives for edit history
    const [existing] = await db
      .select()
      .from(profilerObjectives)
      .where(eq(profilerObjectives.projectId, projectId))
      .limit(1);

    // Build updated objectives with edit history
    let existingFunctional: any = null;
    let existingPlanning: any = null;

    if (existing) {
      existingFunctional = existing.functionalQuality ? JSON.parse(existing.functionalQuality) : null;
      existingPlanning = existing.planningCompliance ? JSON.parse(existing.planningCompliance) : null;
    }

    const objectivesData: Record<string, any> = {
      polishedAt: new Date(),
      updatedAt: new Date(),
    };

    if (functionalPolished) {
      objectivesData.functionalQuality = JSON.stringify({
        content: functionalPolished,
        source: 'ai_polished',
        originalAi: existingFunctional?.originalAi || null,
        editHistory: existingFunctional?.content
          ? [...(existingFunctional.editHistory || []), existingFunctional.content]
          : null,
      });
    }

    if (planningPolished) {
      objectivesData.planningCompliance = JSON.stringify({
        content: planningPolished,
        source: 'ai_polished',
        originalAi: existingPlanning?.originalAi || null,
        editHistory: existingPlanning?.content
          ? [...(existingPlanning.editHistory || []), existingPlanning.content]
          : null,
      });
    }

    if (existing) {
      await db
        .update(profilerObjectives)
        .set(objectivesData)
        .where(eq(profilerObjectives.projectId, projectId));
    } else {
      await db.insert(profilerObjectives).values({
        id: crypto.randomUUID(),
        projectId,
        ...objectivesData,
      });
    }

    // Pattern Learning (T058): Track polish edits for template improvement
    // Non-blocking - runs in background
    if (profile?.buildingClass && profile?.projectType) {
      const buildingClass = profile.buildingClass;
      const projectType = profile.projectType;

      // Analyze edits from original to polished for functional quality
      if (functionalPolished && functionalContent) {
        const functionalEdits = identifyEditPatterns(
          functionalContent,
          functionalPolished
        );
        for (const edit of functionalEdits) {
          trackPolishEdit(buildingClass, projectType, edit.type, edit.context)
            .catch(err => console.error('[pattern-learning] polish tracking error:', err));
        }
      }

      // Analyze edits from original to polished for planning compliance
      if (planningPolished && planningContent) {
        const planningEdits = identifyEditPatterns(
          planningContent,
          planningPolished
        );
        for (const edit of planningEdits) {
          trackPolishEdit(buildingClass, projectType, edit.type, edit.context)
            .catch(err => console.error('[pattern-learning] polish tracking error:', err));
        }
      }
    }

    // Return appropriate response based on request format
    if (section) {
      // New single-section format
      return NextResponse.json({
        success: true,
        data: {
          polished: functionalPolished || planningPolished,
          polishedAt: new Date().toISOString(),
        },
      });
    }

    // Legacy format
    return NextResponse.json({
      success: true,
      data: {
        functionalQualityPolished: functionalPolished,
        planningCompliancePolished: planningPolished,
        polishedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('Failed to polish objectives:', error);
    return NextResponse.json(
      { success: false, error: { code: 'POLISH_ERROR', message: 'Failed to polish objectives' } },
      { status: 500 }
    );
  }
}
