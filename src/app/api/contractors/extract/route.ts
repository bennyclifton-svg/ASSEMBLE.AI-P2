import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { extractText, calculateConfidence } from '@/lib/utils/text-extraction';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
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
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const textInput = formData.get('text') as string | null;

    let extractedText = '';

    // Extract text from file if provided
    if (file) {
      try {
        extractedText = await extractText(file);
      } catch (error) {
        return NextResponse.json(
          { error: 'Failed to extract text from file' },
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

    // Send to OpenAI for extraction
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: EXTRACTION_PROMPT,
        },
        {
          role: 'user',
          content: `Extract contractor information from this text:\n\n${extractedText}`,
        },
      ],
      temperature: 0.1,
    });

    const aiResponse = completion.choices[0]?.message?.content;
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
    return NextResponse.json(
      { error: 'Failed to extract contractor data' },
      { status: 500 }
    );
  }
}
