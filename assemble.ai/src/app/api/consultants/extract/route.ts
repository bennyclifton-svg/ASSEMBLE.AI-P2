import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { extractText, calculateConfidence } from '@/lib/utils/text-extraction';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const EXTRACTION_PROMPT = `You are an AI assistant that extracts consultant/firm information from text.
Extract the following fields if present:
- companyName: The company or firm name
- contactPerson: The contact person's full name
- discipline: The discipline/specialty (e.g., Architectural, Structural, Mechanical, Electrical, Civil, etc.)
- email: Email address
- mobile: Mobile/phone number
- address: Physical address
- abn: ABN (Australian Business Number)

Return ONLY a valid JSON object with these fields. If a field is not found, omit it from the response.
Do not include any explanation or markdown formatting, just the raw JSON object.

Example response:
{
  "companyName": "Arup",
  "contactPerson": "John Smith",
  "discipline": "Structural",
  "email": "john.smith@arup.com",
  "mobile": "0412 345 678",
  "address": "Level 10, 201 Kent Street, Sydney NSW 2000",
  "abn": "12 345 678 901"
}`;

// POST /api/consultants/extract
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
          content: `Extract consultant information from this text:\n\n${extractedText}`,
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
    console.error('Error in consultant extraction:', error);
    return NextResponse.json(
      { error: 'Failed to extract consultant data' },
      { status: 500 }
    );
  }
}
