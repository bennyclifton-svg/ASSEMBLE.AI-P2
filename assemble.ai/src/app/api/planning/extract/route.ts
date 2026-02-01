import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { extractText, calculateProjectDetailsConfidence } from '@/lib/utils/text-extraction';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const EXTRACTION_PROMPT = `You are an AI assistant that extracts project/building information from text.
This may be from a planning document, development application, email, or other source.

Extract the following fields if present:
- projectName: The project or building name
- buildingClass: Building classification (e.g., Class 1a, Class 2, Commercial, Residential, Mixed Use)
- address: Site/project address
- legalAddress: Legal property description (e.g., Lot 1 DP 123456, or similar land title reference)
- zoning: Zoning classification (e.g., R2, R3, B4, IN1, SP2, or full name like "Low Density Residential")
- jurisdiction: Local council or authority name (e.g., City of Sydney, North Sydney Council)
- lotArea: Land area in square meters (number only, no units)
- numberOfStories: Number of building stories/levels (number only)

Return ONLY a valid JSON object with these fields. If a field is not found, omit it from the response.
Do not include any explanation or markdown formatting, just the raw JSON object.

Example response:
{
  "projectName": "Riverside Mixed Use Development",
  "buildingClass": "Class 2",
  "address": "123 Main Street, Sydney NSW 2000",
  "legalAddress": "Lot 1 DP 654321",
  "zoning": "B4 Mixed Use",
  "jurisdiction": "City of Sydney",
  "lotArea": 1250,
  "numberOfStories": 8
}`;

// POST /api/planning/extract
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
      max_tokens: 1024,
      system: EXTRACTION_PROMPT,
      messages: [
        {
          role: 'user',
          content: `Extract project/building information from this text:\n\n${extractedText}`,
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
      let cleanedResponse = aiResponse
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .trim();

      // Extract JSON object from response - handle cases where AI adds extra text
      const jsonStartIndex = cleanedResponse.indexOf('{');
      const jsonEndIndex = cleanedResponse.lastIndexOf('}');

      if (jsonStartIndex !== -1 && jsonEndIndex !== -1 && jsonEndIndex > jsonStartIndex) {
        cleanedResponse = cleanedResponse.substring(jsonStartIndex, jsonEndIndex + 1);
      }

      extractedData = JSON.parse(cleanedResponse);
    } catch (error) {
      console.error('Failed to parse AI response:', aiResponse);
      return NextResponse.json(
        { error: 'Failed to parse AI response' },
        { status: 500 }
      );
    }

    // Calculate confidence score
    const confidence = calculateProjectDetailsConfidence(extractedData);

    return NextResponse.json({
      data: extractedData,
      confidence,
      originalText: extractedText.substring(0, 500) + (extractedText.length > 500 ? '...' : ''),
    });
  } catch (error) {
    console.error('Error in project details extraction:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: `Failed to extract project details: ${errorMessage}` },
      { status: 500 }
    );
  }
}
