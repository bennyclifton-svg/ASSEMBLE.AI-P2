import { NextRequest, NextResponse } from 'next/server';
import { eq, and } from 'drizzle-orm';
import { aiComplete } from '@/lib/ai/client';
import { extractText } from '@/lib/utils/text-extraction';
import { db } from '@/lib/db';
import { projectObjectives } from '@/lib/db/objectives-schema';
import { getCurrentUser } from '@/lib/auth/get-user';

const EXTRACTION_PROMPT = `You are an AI assistant that extracts project objectives from text.
This may be from a project brief, planning document, email, or other source.

Extract the following objective categories if present:
- functional: Functional objectives - what the building/project needs to do, operational requirements, space needs, user requirements. Return as an array of short bullet strings.
- quality: Quality objectives - design quality, sustainability, materials, finishes, standards to meet. Return as an array of short bullet strings.
- planning: Planning objectives - planning approvals, DA/CDC requirements, council conditions, environmental compliance. Return as an array of short bullet strings.
- compliance: Compliance objectives - building codes (NCC/BCA), Australian Standards, certifications (BASIX, NatHERS, fire engineering). Return as an array of short bullet strings.

Each array should contain concise bullet strings (2-10 words each).
If objectives for a category are not found, omit that field or use an empty array.

Return ONLY a valid JSON object with these fields. Do not include any explanation or markdown formatting, just the raw JSON object.

Example response:
{
  "functional": ["50 residential apartments", "Ground floor retail", "Minimum 2 lifts", "Accessible bathrooms on all floors"],
  "quality": ["5-star Green Star rating", "High-quality facade", "Natural stone cladding"],
  "planning": ["DA approval required", "SEPP65 design quality principles", "Environmental impact assessment"],
  "compliance": ["NCC 2022 compliance", "BASIX certificate required", "Fire engineering report"]
}`;

/**
 * Calculate confidence score for objectives extraction
 */
function calculateObjectivesConfidence(extractedData: any): number {
  const fields = ['functional', 'quality', 'planning', 'compliance'];

  let score = 0;
  let maxScore = 0;

  fields.forEach((field) => {
    maxScore += 25;
    const val = extractedData[field];
    if (Array.isArray(val) && val.length > 2) {
      score += 25;
    } else if (Array.isArray(val) && val.length > 0) {
      score += 15;
    } else if (val && String(val).trim().length > 10) {
      score += 25;
    } else if (val && String(val).trim()) {
      score += 15;
    }
  });

  return Math.round((score / maxScore) * 100);
}

// POST /api/planning/extract-objectives
export async function POST(request: NextRequest) {
  try {
    const authResult = await getCurrentUser();
    if (!authResult.user) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    // Check for API key first
    if (!process.env.ANTHROPIC_API_KEY) {
      console.error('ANTHROPIC_API_KEY is not configured');
      return NextResponse.json(
        { error: 'AI extraction is not configured. Please set ANTHROPIC_API_KEY.' },
        { status: 500 }
      );
    }

    const contentType = request.headers.get('content-type') || '';
    let extractedText = '';
    let projectId: string | null = null;

    // Handle FormData (file upload) or JSON (text input)
    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      const file = formData.get('file') as File | null;
      const textInput = formData.get('text') as string | null;
      projectId = formData.get('projectId') as string | null;

      if (file) {
        try {
          console.log(`Extracting text from file: ${file.name}, type: ${file.type}, size: ${file.size}`);
          extractedText = await extractText(file);
          console.log(`Extracted ${extractedText.length} characters from file`);
        } catch (error) {
          console.error('Text extraction failed:', error);
          return NextResponse.json(
            { error: `Failed to extract text from file: ${error instanceof Error ? error.message : 'Unknown error'}` },
            { status: 400 }
          );
        }
      } else if (textInput) {
        extractedText = textInput;
      }
    } else if (contentType.includes('application/json')) {
      const body = await request.json();
      extractedText = body.text || '';
      projectId = body.projectId || null;
    }

    if (!extractedText.trim()) {
      return NextResponse.json(
        { error: 'No text found in the provided input' },
        { status: 400 }
      );
    }

    // Send to AI for extraction
    const { text: aiResponse } = await aiComplete({
      featureGroup: 'text_extraction',
      maxTokens: 2048,
      system: EXTRACTION_PROMPT,
      messages: [
        {
          role: 'user',
          content: `Extract project objectives from this text:\n\n${extractedText}`,
        },
      ],
    });

    if (!aiResponse) {
      return NextResponse.json(
        { error: 'No response from AI' },
        { status: 500 }
      );
    }

    // Parse AI response
    let extractedData: {
      functional?: string[];
      quality?: string[];
      planning?: string[];
      compliance?: string[];
    };
    try {
      // Remove markdown code blocks if present
      const cleanedResponse = aiResponse
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .trim();
      extractedData = JSON.parse(cleanedResponse);
    } catch (error) {
      console.error('Failed to parse AI response:', aiResponse);
      return NextResponse.json(
        { error: 'Failed to parse AI response' },
        { status: 500 }
      );
    }

    // Calculate confidence score
    const confidence = calculateObjectivesConfidence(extractedData);

    // If projectId provided, persist rows into projectObjectives
    let persistedCount = 0;
    if (projectId) {
      try {
        const sectionMap: Array<{ key: keyof typeof extractedData; type: 'functional' | 'quality' | 'planning' | 'compliance' }> = [
          { key: 'functional', type: 'functional' },
          { key: 'quality', type: 'quality' },
          { key: 'planning', type: 'planning' },
          { key: 'compliance', type: 'compliance' },
        ];

        for (const { key, type } of sectionMap) {
          const bullets = extractedData[key];
          if (!bullets || !Array.isArray(bullets) || bullets.length === 0) continue;

          // Soft-delete existing rows for this project+type
          await db
            .update(projectObjectives)
            .set({ isDeleted: true, updatedAt: new Date() })
            .where(
              and(
                eq(projectObjectives.projectId, projectId),
                eq(projectObjectives.objectiveType, type),
                eq(projectObjectives.isDeleted, false)
              )
            );

          // Insert one row per bullet
          const toInsert = bullets
            .filter(b => typeof b === 'string' && b.trim().length > 0)
            .map((text, idx) => ({
              projectId: projectId as string,
              objectiveType: type,
              text: text.trim(),
              source: 'explicit' as const,
              status: 'draft' as const,
              sortOrder: idx,
            }));

          if (toInsert.length > 0) {
            await db.insert(projectObjectives).values(toInsert);
            persistedCount += toInsert.length;
          }
        }

        console.log(`[extract-objectives] Persisted ${persistedCount} rows for project ${projectId}`);
      } catch (dbError) {
        // Non-fatal: log but still return extraction results
        console.error('[extract-objectives] Failed to persist rows:', dbError);
      }
    }

    return NextResponse.json({
      data: extractedData,
      confidence,
      originalText: extractedText.substring(0, 500) + (extractedText.length > 500 ? '...' : ''),
      ...(projectId ? { persistedCount } : {}),
    });
  } catch (error) {
    console.error('Error in objectives extraction:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: `Failed to extract objectives: ${errorMessage}` },
      { status: 500 }
    );
  }
}
