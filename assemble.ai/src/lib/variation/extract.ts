/**
 * AI-Powered Variation Extraction Service
 * Feature 006 - Cost Planning Module
 *
 * Extracts structured variation data from PDF documents using:
 * 1. LlamaParse/Unstructured/pdf-parse for document parsing
 * 2. Claude Haiku for intelligent data extraction
 */

import Anthropic from '@anthropic-ai/sdk';
import { parseDocument, type ParsedDocument } from '@/lib/rag/parsing';

// ============================================================================
// TYPES
// ============================================================================

export type VariationCategory = 'Principal' | 'Contractor' | 'Lessor Works';

export interface ExtractedVariation {
  variationNumber: string | null;
  description: string;
  amountCents: number;
  category: VariationCategory;
  dateSubmitted: string | null; // YYYY-MM-DD format
  requestedBy: string | null;
  costLineReference: string | null; // Reference to help match cost line
  // Extraction metadata
  confidence: {
    overall: number; // 0-1
    fields: Record<string, number>;
  };
  rawText: string; // Original parsed content for debugging
}

export interface ExtractionResult {
  success: boolean;
  variation: ExtractedVariation | null;
  error?: string;
  parserUsed: ParsedDocument['metadata']['parser'];
}

// ============================================================================
// EXTRACTION PROMPT
// ============================================================================

const EXTRACTION_PROMPT = `You are an expert at extracting structured data from construction variation/change order documents.
Analyze the provided document text and extract the following information.

IMPORTANT:
- Convert ALL currency amounts to cents (multiply dollars by 100)
- This is a construction project variation/change order document
- Date should be in YYYY-MM-DD format
- If a field cannot be determined, use null
- For category, determine based on context:
  - "Principal" (PV): Changes requested by the client/owner
  - "Contractor" (CV): Changes from the contractor
  - "Lessor Works" (LV): Changes related to tenant/lessor requirements
- Look for variation numbers in formats like: PV-001, CV-002, VAR-001, VO-001, etc.
- costLineReference should be any budget item, trade, or discipline this variation relates to

Return ONLY a valid JSON object with this exact structure (no markdown, no explanation):

{
  "variationNumber": "string or null (variation/change order number)",
  "description": "string (description of the variation scope)",
  "amountCents": number (variation amount in cents),
  "category": "Principal" | "Contractor" | "Lessor Works",
  "dateSubmitted": "YYYY-MM-DD or null (submission date)",
  "requestedBy": "string or null (company/person who requested)",
  "costLineReference": "string or null (related budget item, trade, or discipline)",
  "confidence": {
    "overall": number (0-1, your confidence in the extraction),
    "fields": {
      "variationNumber": number (0-1),
      "description": number (0-1),
      "amountCents": number (0-1),
      "category": number (0-1),
      "dateSubmitted": number (0-1)
    }
  }
}

Document content:
`;

// ============================================================================
// ANTHROPIC CLIENT
// ============================================================================

function getAnthropicClient(): Anthropic {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error('ANTHROPIC_API_KEY environment variable is required for variation extraction');
  }
  return new Anthropic();
}

// ============================================================================
// EXTRACTION FUNCTION
// ============================================================================

/**
 * Extract variation data from a PDF file buffer
 */
export async function extractVariationFromPdf(
  fileBuffer: Buffer,
  filename: string
): Promise<ExtractionResult> {
  console.log(`[variation-extract] Starting extraction for: ${filename}`);

  // Step 1: Try to parse the PDF with text extraction first
  let parsedDoc: ParsedDocument | null = null;
  let useNativePdf = false;

  try {
    parsedDoc = await parseDocument(fileBuffer, filename);
    console.log(`[variation-extract] Parsed with ${parsedDoc.metadata.parser}, ${parsedDoc.content.length} chars`);

    // If no content was extracted, fall back to native PDF
    if (!parsedDoc.content || parsedDoc.content.trim().length === 0) {
      console.log('[variation-extract] No text extracted, falling back to native PDF support');
      useNativePdf = true;
    }
  } catch (parseError) {
    console.warn('[variation-extract] Parse failed, falling back to native PDF support:', parseError);
    useNativePdf = true;
  }

  // Step 2: Extract data with Claude
  try {
    const anthropic = getAnthropicClient();
    let response;
    let parserUsed: ParsedDocument['metadata']['parser'] = parsedDoc?.metadata.parser || 'text';

    if (useNativePdf) {
      // Use Claude's native PDF document support with Sonnet (better PDF support)
      console.log('[variation-extract] Using Claude native PDF support for extraction...');
      parserUsed = 'text';

      const base64Pdf = fileBuffer.toString('base64');
      try {
        response = await anthropic.messages.create({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1500,
          messages: [
            {
              role: 'user',
              content: [
                {
                  type: 'document',
                  source: {
                    type: 'base64',
                    media_type: 'application/pdf',
                    data: base64Pdf,
                  },
                },
                {
                  type: 'text',
                  text: EXTRACTION_PROMPT,
                },
              ],
            },
          ],
        });
      } catch (pdfApiError: any) {
        console.error('[variation-extract] Native PDF API error:', pdfApiError?.message || pdfApiError);
        throw new Error(`PDF processing failed: ${pdfApiError?.message || 'Unable to process this PDF format'}`);
      }
    } else {
      // Use pre-extracted text content
      console.log('[variation-extract] Calling Claude Haiku for extraction...');
      response = await anthropic.messages.create({
        model: 'claude-3-5-haiku-20241022',
        max_tokens: 1500,
        messages: [
          {
            role: 'user',
            content: EXTRACTION_PROMPT + parsedDoc!.content,
          },
        ],
      });
    }

    // Extract text content from response
    const textContent = response.content.find((c) => c.type === 'text');
    if (!textContent || textContent.type !== 'text') {
      throw new Error('No text response from Claude');
    }

    // Parse JSON response
    let extractedData: any;
    try {
      // Clean up response - remove any markdown code blocks if present
      let jsonText = textContent.text.trim();
      if (jsonText.startsWith('```')) {
        jsonText = jsonText.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
      }
      extractedData = JSON.parse(jsonText);
    } catch (jsonError) {
      console.error('[variation-extract] Failed to parse JSON response:', textContent.text);
      throw new Error('Invalid JSON response from extraction');
    }

    // Validate required fields
    if (!extractedData.description) {
      throw new Error('Could not extract variation description');
    }

    // Validate and normalize category
    const validCategories: VariationCategory[] = ['Principal', 'Contractor', 'Lessor Works'];
    let category: VariationCategory = 'Principal'; // default
    if (extractedData.category && validCategories.includes(extractedData.category)) {
      category = extractedData.category;
    }

    // Build result
    const variation: ExtractedVariation = {
      variationNumber: extractedData.variationNumber || null,
      description: String(extractedData.description),
      amountCents: Math.round(Number(extractedData.amountCents) || 0),
      category,
      dateSubmitted: extractedData.dateSubmitted || null,
      requestedBy: extractedData.requestedBy || null,
      costLineReference: extractedData.costLineReference || null,
      confidence: extractedData.confidence || {
        overall: 0.8,
        fields: {},
      },
      rawText: parsedDoc?.content?.substring(0, 2000) || '[PDF processed via native document support]',
    };

    console.log(`[variation-extract] Successfully extracted: ${variation.variationNumber || 'No number'} - ${variation.description.substring(0, 50)}...`);

    return {
      success: true,
      variation,
      parserUsed,
    };
  } catch (extractError) {
    console.error('[variation-extract] Extraction failed:', extractError);
    return {
      success: false,
      variation: null,
      error: `Failed to extract data: ${extractError instanceof Error ? extractError.message : 'Unknown error'}`,
      parserUsed: parsedDoc?.metadata.parser || 'text',
    };
  }
}

/**
 * Extract variation from already-parsed content (for testing or reprocessing)
 */
export async function extractVariationFromText(
  content: string
): Promise<Omit<ExtractionResult, 'parserUsed'>> {
  try {
    const anthropic = getAnthropicClient();
    const response = await anthropic.messages.create({
      model: 'claude-3-5-haiku-20241022',
      max_tokens: 1500,
      messages: [
        {
          role: 'user',
          content: EXTRACTION_PROMPT + content,
        },
      ],
    });

    const textContent = response.content.find((c) => c.type === 'text');
    if (!textContent || textContent.type !== 'text') {
      throw new Error('No text response from Claude');
    }

    let jsonText = textContent.text.trim();
    if (jsonText.startsWith('```')) {
      jsonText = jsonText.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
    }
    const extractedData = JSON.parse(jsonText);

    const validCategories: VariationCategory[] = ['Principal', 'Contractor', 'Lessor Works'];
    let category: VariationCategory = 'Principal';
    if (extractedData.category && validCategories.includes(extractedData.category)) {
      category = extractedData.category;
    }

    const variation: ExtractedVariation = {
      variationNumber: extractedData.variationNumber || null,
      description: String(extractedData.description),
      amountCents: Math.round(Number(extractedData.amountCents) || 0),
      category,
      dateSubmitted: extractedData.dateSubmitted || null,
      requestedBy: extractedData.requestedBy || null,
      costLineReference: extractedData.costLineReference || null,
      confidence: extractedData.confidence || { overall: 0.8, fields: {} },
      rawText: content.substring(0, 2000),
    };

    return { success: true, variation };
  } catch (error) {
    return {
      success: false,
      variation: null,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
