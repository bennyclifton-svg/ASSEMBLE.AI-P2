/**
 * AI-Powered Invoice Extraction Service
 * Feature 006 - Cost Planning Module (Task T140)
 *
 * Extracts structured invoice data from PDF documents using:
 * 1. LlamaParse/Unstructured/pdf-parse for document parsing
 * 2. Claude Haiku for intelligent data extraction
 */

import Anthropic from '@anthropic-ai/sdk';
import { parseDocument, type ParsedDocument } from '@/lib/rag/parsing';

// ============================================================================
// TYPES
// ============================================================================

export interface ExtractedInvoice {
  invoiceNumber: string;
  invoiceDate: string; // YYYY-MM-DD format
  amountCents: number;
  gstCents: number;
  description: string | null;
  companyName: string | null;
  poNumber: string | null;
  // Extraction metadata
  confidence: {
    overall: number; // 0-1
    fields: Record<string, number>;
  };
  rawText: string; // Original parsed content for debugging
}

export interface ExtractionResult {
  success: boolean;
  invoice: ExtractedInvoice | null;
  error?: string;
  parserUsed: ParsedDocument['metadata']['parser'];
}

// ============================================================================
// EXTRACTION PROMPT
// ============================================================================

const EXTRACTION_PROMPT = `You are an expert at extracting structured data from invoice documents.
Analyze the provided invoice text and extract the following information.

IMPORTANT:
- Convert ALL currency amounts to cents (multiply dollars by 100)
- For Australian invoices, GST is usually 10% of the base amount
- If GST is not explicitly stated, calculate it as amount / 11 (GST-inclusive) or set to 0
- Invoice date should be in YYYY-MM-DD format
- If a field cannot be determined, use null

Return ONLY a valid JSON object with this exact structure (no markdown, no explanation):

{
  "invoiceNumber": "string (the invoice number/ID)",
  "invoiceDate": "YYYY-MM-DD (invoice date)",
  "amountCents": number (total amount in cents, excluding GST),
  "gstCents": number (GST amount in cents),
  "description": "string or null (brief description of services/goods)",
  "companyName": "string or null (vendor/supplier company name)",
  "poNumber": "string or null (purchase order reference if present)",
  "confidence": {
    "overall": number (0-1, your confidence in the extraction),
    "fields": {
      "invoiceNumber": number (0-1),
      "invoiceDate": number (0-1),
      "amountCents": number (0-1),
      "gstCents": number (0-1),
      "companyName": number (0-1)
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
    throw new Error('ANTHROPIC_API_KEY environment variable is required for invoice extraction');
  }
  return new Anthropic();
}

// ============================================================================
// EXTRACTION FUNCTION
// ============================================================================

/**
 * Extract invoice data from a PDF file buffer
 */
export async function extractInvoiceFromPdf(
  fileBuffer: Buffer,
  filename: string
): Promise<ExtractionResult> {
  console.log(`[invoice-extract] Starting extraction for: ${filename}`);

  // Step 1: Try to parse the PDF with text extraction first
  let parsedDoc: ParsedDocument | null = null;
  let useNativePdf = false;

  try {
    parsedDoc = await parseDocument(fileBuffer, filename);
    console.log(`[invoice-extract] Parsed with ${parsedDoc.metadata.parser}, ${parsedDoc.content.length} chars`);

    // If no content was extracted, fall back to native PDF
    if (!parsedDoc.content || parsedDoc.content.trim().length === 0) {
      console.log('[invoice-extract] No text extracted, falling back to native PDF support');
      useNativePdf = true;
    }
  } catch (parseError) {
    console.warn('[invoice-extract] Parse failed, falling back to native PDF support:', parseError);
    useNativePdf = true;
  }

  // Step 2: Extract data with Claude
  try {
    const anthropic = getAnthropicClient();
    let response;
    let parserUsed: ParsedDocument['metadata']['parser'] = parsedDoc?.metadata.parser || 'text';

    if (useNativePdf) {
      // Use Claude's native PDF document support with Sonnet (better PDF support)
      console.log('[invoice-extract] Using Claude native PDF support for extraction...');
      parserUsed = 'text'; // We'll mark it as text since Claude handles it directly

      const base64Pdf = fileBuffer.toString('base64');
      try {
        response = await anthropic.messages.create({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1000,
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
        console.error('[invoice-extract] Native PDF API error:', pdfApiError?.message || pdfApiError);
        // If document type fails, try vision with PDF as base64 (some APIs support this)
        throw new Error(`PDF processing failed: ${pdfApiError?.message || 'Unable to process this PDF format'}`);
      }
    } else {
      // Use pre-extracted text content
      console.log('[invoice-extract] Calling Claude Haiku for extraction...');
      response = await anthropic.messages.create({
        model: 'claude-3-5-haiku-20241022',
        max_tokens: 1000,
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
      console.error('[invoice-extract] Failed to parse JSON response:', textContent.text);
      throw new Error('Invalid JSON response from extraction');
    }

    // Validate required fields
    if (!extractedData.invoiceNumber) {
      throw new Error('Could not extract invoice number');
    }

    // Build result
    const invoice: ExtractedInvoice = {
      invoiceNumber: String(extractedData.invoiceNumber),
      invoiceDate: extractedData.invoiceDate || new Date().toISOString().split('T')[0],
      amountCents: Math.round(Number(extractedData.amountCents) || 0),
      gstCents: Math.round(Number(extractedData.gstCents) || 0),
      description: extractedData.description || null,
      companyName: extractedData.companyName || null,
      poNumber: extractedData.poNumber || null,
      confidence: extractedData.confidence || {
        overall: 0.8,
        fields: {},
      },
      rawText: parsedDoc?.content?.substring(0, 2000) || '[PDF processed via native document support]',
    };

    console.log(`[invoice-extract] Successfully extracted: ${invoice.invoiceNumber}`);

    return {
      success: true,
      invoice,
      parserUsed,
    };
  } catch (extractError) {
    console.error('[invoice-extract] Extraction failed:', extractError);
    return {
      success: false,
      invoice: null,
      error: `Failed to extract data: ${extractError instanceof Error ? extractError.message : 'Unknown error'}`,
      parserUsed: parsedDoc?.metadata.parser || 'text',
    };
  }
}

/**
 * Extract invoice from already-parsed content (for testing or reprocessing)
 */
export async function extractInvoiceFromText(
  content: string
): Promise<Omit<ExtractionResult, 'parserUsed'>> {
  try {
    const anthropic = getAnthropicClient();
    const response = await anthropic.messages.create({
      model: 'claude-3-5-haiku-20241022',
      max_tokens: 1000,
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

    const invoice: ExtractedInvoice = {
      invoiceNumber: String(extractedData.invoiceNumber),
      invoiceDate: extractedData.invoiceDate || new Date().toISOString().split('T')[0],
      amountCents: Math.round(Number(extractedData.amountCents) || 0),
      gstCents: Math.round(Number(extractedData.gstCents) || 0),
      description: extractedData.description || null,
      companyName: extractedData.companyName || null,
      poNumber: extractedData.poNumber || null,
      confidence: extractedData.confidence || { overall: 0.8, fields: {} },
      rawText: content.substring(0, 2000),
    };

    return { success: true, invoice };
  } catch (error) {
    return {
      success: false,
      invoice: null,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
