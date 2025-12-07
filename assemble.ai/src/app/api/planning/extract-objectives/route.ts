import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { extractText } from '@/lib/utils/text-extraction';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const EXTRACTION_PROMPT = `You are an AI assistant that extracts project objectives from text.
This may be from a project brief, planning document, email, or other source.

Extract the following objective categories if present:
- functional: Functional objectives - what the building/project needs to do, operational requirements, space needs, user requirements
- quality: Quality objectives - design quality, sustainability, materials, finishes, standards to meet
- budget: Budget objectives - cost targets, budget constraints, value engineering requirements
- program: Program objectives - timeline, key milestones, delivery dates, phasing requirements

Each field should contain a concise summary of the relevant objectives found in the text.
If objectives for a category are not found, omit that field.

Return ONLY a valid JSON object with these fields. Do not include any explanation or markdown formatting, just the raw JSON object.

Example response:
{
  "functional": "Provide 50 residential apartments with ground floor retail. Minimum 2 lifts, accessible bathrooms on all floors.",
  "quality": "Achieve 5-star Green Star rating. High-quality facade with natural stone cladding. Comply with SEPP65 design quality principles.",
  "budget": "Target construction cost of $45M. Maximize GFA within planning envelope. Value engineering required for structure.",
  "program": "DA lodgement by March 2025. Construction start Q4 2025. Practical completion December 2027."
}`;

/**
 * Calculate confidence score for objectives extraction
 */
function calculateObjectivesConfidence(extractedData: any): number {
  const fields = ['functional', 'quality', 'budget', 'program'];

  let score = 0;
  let maxScore = 0;

  fields.forEach((field) => {
    maxScore += 25;
    if (extractedData[field] && String(extractedData[field]).trim().length > 10) {
      score += 25;
    } else if (extractedData[field] && String(extractedData[field]).trim()) {
      score += 15; // Partial credit for short content
    }
  });

  return Math.round((score / maxScore) * 100);
}

// POST /api/planning/extract-objectives
export async function POST(request: NextRequest) {
  try {
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

    // Handle FormData (file upload) or JSON (text input)
    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      const file = formData.get('file') as File | null;
      const textInput = formData.get('text') as string | null;

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
    }

    if (!extractedText.trim()) {
      return NextResponse.json(
        { error: 'No text found in the provided input' },
        { status: 400 }
      );
    }

    // Send to Anthropic for extraction
    const message = await anthropic.messages.create({
      model: 'claude-3-5-haiku-latest',
      max_tokens: 2048,
      system: EXTRACTION_PROMPT,
      messages: [
        {
          role: 'user',
          content: `Extract project objectives from this text:\n\n${extractedText}`,
        },
      ],
    });

    const aiResponse = message.content[0]?.type === 'text' ? message.content[0].text : null;
    if (!aiResponse) {
      return NextResponse.json(
        { error: 'No response from AI' },
        { status: 500 }
      );
    }

    // Parse AI response
    let extractedData;
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

    return NextResponse.json({
      data: extractedData,
      confidence,
      originalText: extractedText.substring(0, 500) + (extractedText.length > 500 ? '...' : ''),
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
