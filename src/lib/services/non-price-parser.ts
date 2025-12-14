/**
 * Feature 013: Non-Price Parser Service
 * AI-Powered Tender Document Parsing for Non-Price Evaluation
 * T021-T028: Semantic extraction of qualitative criteria from tender PDFs
 *
 * Extracts content for 7 fixed criteria:
 * - Methodology, Program, Personnel, Experience
 * - Health & Safety, Insurance, Departures
 */

import Anthropic from '@anthropic-ai/sdk';
import { parseDocument } from '@/lib/rag/parsing';
import { NON_PRICE_CRITERIA, CRITERIA_PROMPTS } from '@/lib/constants/non-price-criteria';
import type {
    NonPriceCriteriaKey,
    NonPriceExtractionResult,
    QualityRating,
} from '@/types/evaluation';

// ============================================================================
// TYPES
// ============================================================================

export interface NonPriceParseResult {
    success: boolean;
    results: NonPriceExtractionResult[];
    overallConfidence: number;
    error?: string;
}

// ============================================================================
// ANTHROPIC CLIENT
// ============================================================================

const anthropic = new Anthropic();

// ============================================================================
// EXTRACTION PROMPT
// ============================================================================

const SYSTEM_PROMPT = `You are an expert at analyzing tender submissions for construction and professional services projects.
Your task is to extract and assess qualitative criteria from tender documents.

For each criterion, you will:
1. Extract relevant content from the tender document
2. Summarize the key points in 2-4 sentences (100-200 words max)
3. Assign a quality rating: "good", "average", or "poor"
4. Provide a confidence score (0-100) for your extraction
5. List 2-4 key points as bullet items

IMPORTANT: Return ONLY a valid JSON object. No markdown, no explanation, just the JSON.`;

function buildExtractionPrompt(criteriaKey: NonPriceCriteriaKey, documentContent: string): string {
    const criteria = NON_PRICE_CRITERIA.find(c => c.key === criteriaKey);
    const criteriaPrompt = CRITERIA_PROMPTS[criteriaKey];

    return `Analyze the following tender document and extract content for the "${criteria?.label}" criterion.

${criteriaPrompt}

Return a JSON object with this exact structure:
{
    "criteriaKey": "${criteriaKey}",
    "summary": "2-4 sentence summary of the tenderer's ${criteria?.label?.toLowerCase() || criteriaKey}",
    "rating": "good" | "average" | "poor",
    "confidence": 0-100,
    "keyPoints": ["point 1", "point 2", "point 3"],
    "sourceChunks": ["relevant excerpt 1", "relevant excerpt 2"]
}

If no relevant content is found, return:
{
    "criteriaKey": "${criteriaKey}",
    "summary": "No relevant content found for ${criteria?.label?.toLowerCase() || criteriaKey} in the tender submission.",
    "rating": "poor",
    "confidence": 20,
    "keyPoints": [],
    "sourceChunks": []
}

TENDER DOCUMENT:
${documentContent}`;
}

// ============================================================================
// EXTRACTION FUNCTIONS
// ============================================================================

/**
 * Extract content for a single criterion using Claude
 */
async function extractCriterion(
    criteriaKey: NonPriceCriteriaKey,
    documentContent: string
): Promise<NonPriceExtractionResult> {
    const prompt = buildExtractionPrompt(criteriaKey, documentContent);

    try {
        const response = await anthropic.messages.create({
            model: 'claude-haiku-4-5-20251001',
            max_tokens: 1500,
            system: SYSTEM_PROMPT,
            messages: [
                {
                    role: 'user',
                    content: prompt,
                },
            ],
        });

        // Extract text content from response
        const textContent = response.content.find((c) => c.type === 'text');
        if (!textContent || textContent.type !== 'text') {
            throw new Error('No text response from Claude');
        }

        // Parse JSON response
        let jsonText = textContent.text.trim();

        // Try to extract JSON from markdown code block first
        const codeBlockMatch = jsonText.match(/```(?:json)?\s*([\s\S]*?)```/);
        if (codeBlockMatch) {
            jsonText = codeBlockMatch[1].trim();
        }

        // If still not valid JSON, try to find JSON object in the text
        if (!jsonText.startsWith('{')) {
            const jsonMatch = jsonText.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                jsonText = jsonMatch[0];
            }
        }

        const extracted = JSON.parse(jsonText);

        // Validate and normalize the response
        return {
            criteriaKey,
            summary: extracted.summary || 'No content extracted',
            rating: validateRating(extracted.rating),
            confidence: Math.min(100, Math.max(0, Number(extracted.confidence) || 50)),
            keyPoints: Array.isArray(extracted.keyPoints) ? extracted.keyPoints : [],
            sourceChunks: Array.isArray(extracted.sourceChunks) ? extracted.sourceChunks : [],
        };
    } catch (error) {
        console.error(`[non-price-parser] Error extracting ${criteriaKey}:`, error);

        // Return a default "not found" result on error
        const criteria = NON_PRICE_CRITERIA.find(c => c.key === criteriaKey);
        return {
            criteriaKey,
            summary: `Failed to extract ${criteria?.label || criteriaKey} from the tender submission.`,
            rating: 'poor',
            confidence: 0,
            keyPoints: [],
            sourceChunks: [],
        };
    }
}

/**
 * Validate and normalize quality rating
 */
function validateRating(rating: unknown): QualityRating {
    if (rating === 'good' || rating === 'average' || rating === 'poor') {
        return rating;
    }
    // Default to average if invalid
    return 'average';
}

// ============================================================================
// MAIN EXPORT
// ============================================================================

/**
 * Parse a tender PDF and extract content for all 7 non-price criteria
 * T021-T028: Full extraction pipeline
 */
export async function parseNonPriceTender(
    fileBuffer: Buffer,
    filename: string
): Promise<NonPriceParseResult> {
    console.log(`[non-price-parser] Starting extraction for: ${filename}`);

    // Step 1: Parse the PDF document
    let documentContent: string;

    try {
        const parsedDoc = await parseDocument(fileBuffer, filename);
        documentContent = parsedDoc.content;
        console.log(`[non-price-parser] Parsed document with ${parsedDoc.metadata.parser}, ${documentContent.length} chars`);

        if (!documentContent || documentContent.trim().length < 100) {
            return {
                success: false,
                results: [],
                overallConfidence: 0,
                error: 'Failed to extract text from PDF. The document may be scanned/image-based or protected.',
            };
        }
    } catch (parseError) {
        console.error('[non-price-parser] PDF parsing failed:', parseError);
        return {
            success: false,
            results: [],
            overallConfidence: 0,
            error: `Failed to parse document: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`,
        };
    }

    // Step 2: Extract content for each criterion
    // Limit document content to avoid token limits (approx 50k chars = 12k tokens)
    const truncatedContent = documentContent.substring(0, 50000);

    const results: NonPriceExtractionResult[] = [];
    let totalConfidence = 0;

    // Extract all criteria (could be parallelized but doing sequentially for simplicity)
    for (const criteria of NON_PRICE_CRITERIA) {
        console.log(`[non-price-parser] Extracting criterion: ${criteria.key}`);

        const result = await extractCriterion(criteria.key, truncatedContent);
        results.push(result);
        totalConfidence += result.confidence;

        console.log(`[non-price-parser] ${criteria.key}: rating=${result.rating}, confidence=${result.confidence}`);
    }

    const overallConfidence = totalConfidence / results.length;

    console.log(`[non-price-parser] Extraction complete. Overall confidence: ${overallConfidence.toFixed(1)}`);

    return {
        success: true,
        results,
        overallConfidence,
    };
}
