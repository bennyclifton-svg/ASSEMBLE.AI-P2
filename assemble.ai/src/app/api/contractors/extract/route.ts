import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { extractText, calculateConfidence } from '@/lib/utils/text-extraction';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const EXTRACTION_PROMPT = `You are an AI assistant that extracts contractor/firm information from text.
Extract the following fields if present:
- companyName: The company or firm name
- contactPerson: The contact person's full name
- trade: The trade/specialty (e.g., Concrete, Masonry, Carpentry, Plumbing, Electrical, HVAC, Painting, etc.)
- email: Email address
- mobile: Mobile/phone number (use "mobile" field, not "phone")
- address: Physical address
- abn: ABN (Australian Business Number)

Return ONLY a valid JSON object with these fields. If a field is not found, omit it from the response.
Do not include any explanation or markdown formatting, just the raw JSON object.

Example response:
{
  "companyName": "ABC Concrete Contractors",
  "contactPerson": "Jane Doe",
  "trade": "Concrete",
  "email": "jane@abcconcrete.com.au",
  "mobile": "0412 345 678",
  "address": "Unit 5, 123 Industrial Dr, Smithfield NSW 2164",
  "abn": "98 765 432 109"
}`;

// POST /api/contractors/extract
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

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const textInput = formData.get('text') as string | null;

    let extractedText = '';

    // Extract text from file if provided
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
    } else {
      return NextResponse.json(
        { error: 'Either file or text input is required' },
        { status: 400 }
      );
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
          content: `Extract contractor information from this text:\n\n${extractedText}`,
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
    const confidence = calculateConfidence(extractedData);

    return NextResponse.json({
      data: extractedData,
      confidence,
      originalText: extractedText,
    });
  } catch (error) {
    console.error('Error in contractor extraction:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: `Failed to extract contractor data: ${errorMessage}` },
      { status: 500 }
    );
  }
}
