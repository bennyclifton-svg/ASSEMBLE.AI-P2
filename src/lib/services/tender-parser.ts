/**
 * T040-T043: Tender Parser Service
 * AI-Powered Tender Document Parsing for Evaluation Report
 * Feature 011 - Evaluation Report
 *
 * Extracts pricing line items from tender submission PDFs using:
 * 1. LlamaParse/Unstructured/pdf-parse for document parsing (T041)
 * 2. Claude API for intelligent pricing extraction (T042)
 * 3. Semantic matching to map amounts to evaluation rows (T043)
 */

import Anthropic from '@anthropic-ai/sdk';
import { parseDocument, type ParsedDocument } from '@/lib/rag/parsing';
import type { ParsedLineItem, TenderParseResult, EvaluationRow, TenderItemType } from '@/types/evaluation';

// ============================================================================
// TYPES
// ============================================================================

export interface TenderExtractionResult {
    success: boolean;
    items: ParsedLineItem[];
    filteredItems: ParsedLineItem[];  // Items that were filtered out (totals, unit rates)
    firmNameExtracted: string | null;
    overallConfidence: number;
    error?: string;
    parserUsed: ParsedDocument['metadata']['parser'];
    rawText: string;
}

export interface MappedTenderResult {
    success: boolean;
    firmId: string;
    mappedItems: Array<{
        rowId: string;
        description: string;
        amountCents: number;
        confidence: number;
    }>;
    unmappedItems: ParsedLineItem[];
    overallConfidence: number;
    error?: string;
}

// ============================================================================
// EXTRACTION PROMPT (T042)
// ============================================================================

const TENDER_EXTRACTION_PROMPT = `You are an expert at extracting pricing data from tender submission documents.
Analyze the provided tender document and extract ONLY specific deliverable-based pricing line items.

IMPORTANT CLASSIFICATION RULES:

1. INCLUDE as "deliverable" - Items representing specific project deliverables with fixed prices:
   - Design phases (e.g., "Schematic Design", "Detail Design for Tender (70%)")
   - Documentation deliverables (e.g., "Drawings Package", "Specifications")
   - Specific project activities (e.g., "Site Supervision - 10 visits", "Project Management")
   - Consultation services tied to deliverables
   - Attendance/meetings that are part of a fixed fee scope

2. EXCLUDE as "total" - Summary/aggregation rows:
   - Lines starting with "Total", "Sub-Total", "Subtotal", "Grand Total"
   - Lines ending with "Total" or "Fee (excl GST)" or "Fee (ex GST)"
   - Sum lines that aggregate other items

3. EXCLUDE as "unit_rate" - Variable pricing items:
   - Lines containing "Rate per", "Price per", "$/hour", "$/day", "$/visit", "$/meeting"
   - Per-unit rates (e.g., "Rate per site visit", "$X per meeting", "Hourly rate")
   - Time-based rates without fixed totals

IMPORTANT: Convert ALL currency amounts to cents (multiply dollars by 100).

Return ONLY a valid JSON object with this exact structure (no markdown, no explanation):

{
  "firmName": "string or null (company/tenderer name if found)",
  "items": [
    {
      "description": "string (the line item description)",
      "amountCents": number (amount in cents),
      "confidence": number (0-1, your confidence in this extraction),
      "itemType": "deliverable" | "total" | "unit_rate" | "allowance"
    }
  ],
  "overallConfidence": number (0-1, overall confidence in the extraction)
}

Examples:
- "Schematic Design For DA" -> itemType: "deliverable" (include)
- "Total Lump Sum Fee (excl GST)" -> itemType: "total" (exclude)
- "Rate per Site Visit" -> itemType: "unit_rate" (exclude)
- "Detail Design For Tender (70%) - Meetings" -> itemType: "deliverable" (include - fixed scope)
- "Sub-Total" -> itemType: "total" (exclude)

Document content:
`;

// ============================================================================
// POST-EXTRACTION FILTER (Conservative - Include When In Doubt)
// ============================================================================

// Excluded item types
const EXCLUDED_ITEM_TYPES: TenderItemType[] = ['total', 'unit_rate'];

// Patterns that indicate a total/summary row (case-insensitive)
const TOTAL_PATTERNS = [
    /^total\s/i,                    // Starts with "Total "
    /^sub-?total\s/i,               // Starts with "Sub-Total" or "Subtotal"
    /^grand\s*total/i,              // Starts with "Grand Total"
    /\stotal$/i,                    // Ends with " Total"
    /fee\s*\(excl?\s*gst\)$/i,      // Ends with "Fee (excl GST)" or "Fee (ex GST)"
    /lump\s*sum\s*fee/i,            // Contains "Lump Sum Fee"
    /^net\s+fee$/i,                 // "Net Fee"
];

// Patterns that indicate a unit rate (case-insensitive)
const UNIT_RATE_PATTERNS = [
    /rate\s+per\s/i,                // "Rate per ..."
    /price\s+per\s/i,               // "Price per ..."
    /\$[\d,]+\s*\/\s*(hr|hour|day|visit|meeting)/i,  // "$X/hour" format
    /per\s+(hour|day|week|month|visit|meeting|occurrence)/i,  // "per hour", etc.
    /hourly\s+rate/i,               // "Hourly rate"
    /daily\s+rate/i,                // "Daily rate"
];

interface FilterResult {
    included: ParsedLineItem[];
    filtered: ParsedLineItem[];
}

/**
 * Post-extraction safety filter for tender line items
 * Uses conservative approach: INCLUDE when in doubt, user will delete if needed
 * Only EXCLUDE when we're confident it's a total or unit rate
 */
export function filterLineItems(items: ParsedLineItem[]): FilterResult {
    const included: ParsedLineItem[] = [];
    const filtered: ParsedLineItem[] = [];

    for (const item of items) {
        const description = item.description;
        let shouldFilter = false;
        let filterReason: string | undefined;

        // Check 1: Trust Claude's classification for excluded types
        if (item.itemType && EXCLUDED_ITEM_TYPES.includes(item.itemType)) {
            shouldFilter = true;
            filterReason = `AI classified as ${item.itemType}`;
        }

        // Check 2: Pattern-based total detection (safety net)
        if (!shouldFilter) {
            for (const pattern of TOTAL_PATTERNS) {
                if (pattern.test(description)) {
                    // Exception: "Total Station Survey" should be included (it's a survey type)
                    if (/total\s+station/i.test(description)) {
                        continue; // Skip this pattern, not a summary row
                    }
                    shouldFilter = true;
                    filterReason = `Matches total pattern: ${pattern.source}`;
                    break;
                }
            }
        }

        // Check 3: Pattern-based unit rate detection (safety net)
        if (!shouldFilter) {
            for (const pattern of UNIT_RATE_PATTERNS) {
                if (pattern.test(description)) {
                    shouldFilter = true;
                    filterReason = `Matches unit rate pattern: ${pattern.source}`;
                    break;
                }
            }
        }

        if (shouldFilter) {
            filtered.push({
                ...item,
                isFiltered: true,
                filterReason,
            });
            console.log(`[tender-parser] FILTERED: "${item.description}" - Reason: ${filterReason}`);
        } else {
            included.push({
                ...item,
                isFiltered: false,
            });
        }
    }

    console.log(`[tender-parser] Filter results: ${included.length} included, ${filtered.length} filtered`);
    return { included, filtered };
}

// ============================================================================
// ANTHROPIC CLIENT
// ============================================================================

function getAnthropicClient(): Anthropic {
    if (!process.env.ANTHROPIC_API_KEY) {
        throw new Error('ANTHROPIC_API_KEY environment variable is not set');
    }
    return new Anthropic();
}

// ============================================================================
// T041: PDF TEXT EXTRACTION
// ============================================================================

/**
 * Extract text content from a PDF tender document
 */
export async function extractTenderText(
    fileBuffer: Buffer,
    filename: string
): Promise<{ content: string; parser: ParsedDocument['metadata']['parser'] }> {
    console.log(`[tender-parser] Starting text extraction for: ${filename}`);

    const parsedDoc = await parseDocument(fileBuffer, filename);
    console.log(`[tender-parser] Parsed with ${parsedDoc.metadata.parser}, ${parsedDoc.content.length} chars`);

    return {
        content: parsedDoc.content,
        parser: parsedDoc.metadata.parser,
    };
}

// ============================================================================
// T042: CLAUDE API EXTRACTION
// ============================================================================

/**
 * Extract pricing line items from tender document using Claude API
 */
export async function extractPricingFromTender(
    fileBuffer: Buffer,
    filename: string
): Promise<TenderExtractionResult> {
    console.log(`[tender-parser] Starting pricing extraction for: ${filename}`);

    // Step 1: Parse the PDF (T041)
    let content: string;
    let parser: ParsedDocument['metadata']['parser'];

    try {
        const extracted = await extractTenderText(fileBuffer, filename);
        content = extracted.content;
        parser = extracted.parser;
    } catch (parseError) {
        console.error('[tender-parser] Parse failed:', parseError);
        return {
            success: false,
            items: [],
            filteredItems: [],
            firmNameExtracted: null,
            overallConfidence: 0,
            error: `Failed to parse document: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`,
            parserUsed: 'text',
            rawText: '',
        };
    }

    // Step 2: Extract pricing with Claude (T042)
    try {
        console.log('[tender-parser] Calling Claude for pricing extraction...');
        console.log(`[tender-parser] PDF text preview (first 500 chars):\n${content.substring(0, 500)}\n...`);

        // Check if content is empty or too short
        if (!content || content.trim().length < 50) {
            console.error('[tender-parser] PDF content is empty or too short. Length:', content?.length || 0);
            return {
                success: false,
                items: [],
                filteredItems: [],
                firmNameExtracted: null,
                overallConfidence: 0,
                error: 'Failed to extract text from PDF. The document may be scanned/image-based or protected.',
                parserUsed: parser,
                rawText: content || '',
            };
        }

        const anthropic = getAnthropicClient();
        const response = await anthropic.messages.create({
            model: 'claude-haiku-4-5-20251001',
            max_tokens: 2000,
            messages: [
                {
                    role: 'user',
                    content: TENDER_EXTRACTION_PROMPT + content,
                },
            ],
        });

        // Extract text content from response
        const textContent = response.content.find((c) => c.type === 'text');
        if (!textContent || textContent.type !== 'text') {
            throw new Error('No text response from Claude');
        }

        // Parse JSON response
        let extractedData: {
            firmName: string | null;
            items: Array<{ description: string; amountCents: number; confidence: number; itemType?: TenderItemType }>;
            overallConfidence: number;
        };

        try {
            // Clean up response - extract JSON from markdown code blocks or raw JSON
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

            console.log('[tender-parser] Cleaned JSON to parse:', jsonText.substring(0, 200));
            extractedData = JSON.parse(jsonText);
        } catch (jsonError) {
            console.error('[tender-parser] Failed to parse JSON response:', textContent.text);
            throw new Error('Invalid JSON response from extraction');
        }

        // Build raw items with AI classification
        const rawItems: ParsedLineItem[] = extractedData.items.map((item) => ({
            description: item.description,
            amountCents: Math.round(Number(item.amountCents) || 0),
            confidence: Number(item.confidence) || 0.5,
            itemType: item.itemType || 'deliverable', // Default to deliverable if not specified
        }));

        console.log(`[tender-parser] Extracted ${rawItems.length} raw line items from PDF`);

        // Apply post-extraction filter (conservative - include when in doubt)
        const { included: items, filtered: filteredItems } = filterLineItems(rawItems);

        console.log(`[tender-parser] After filtering: ${items.length} included, ${filteredItems.length} filtered`);
        items.forEach((item, i) => {
            console.log(`[tender-parser]   ${i + 1}. [${item.itemType}] "${item.description}" = $${item.amountCents / 100}`);
        });

        if (filteredItems.length > 0) {
            console.log(`[tender-parser] Filtered out (totals/unit rates):`);
            filteredItems.forEach((item, i) => {
                console.log(`[tender-parser]   ${i + 1}. "${item.description}" - ${item.filterReason}`);
            });
        }

        return {
            success: true,
            items,
            filteredItems,
            firmNameExtracted: extractedData.firmName,
            overallConfidence: extractedData.overallConfidence || 0.8,
            parserUsed: parser,
            rawText: content.substring(0, 3000), // Keep first 3000 chars for debugging
        };
    } catch (extractError) {
        console.error('[tender-parser] Extraction failed:', extractError);
        return {
            success: false,
            items: [],
            filteredItems: [],
            firmNameExtracted: null,
            overallConfidence: 0,
            error: `Failed to extract pricing: ${extractError instanceof Error ? extractError.message : 'Unknown error'}`,
            parserUsed: parser,
            rawText: content.substring(0, 3000),
        };
    }
}

// ============================================================================
// T043: LINE ITEM MAPPING (SEMANTIC MATCHING)
// ============================================================================

/**
 * Calculate similarity score between two strings using word overlap
 * Uses a hybrid approach that works well for both short and long descriptions:
 * 1. Partial word matching (e.g., "earth" matches "earthworks")
 * 2. Coverage-based scoring (what % of the shorter description is covered)
 */
function calculateSimilarity(str1: string, str2: string): number {
    const normalize = (s: string) =>
        s.toLowerCase()
            .replace(/[^a-z0-9\s]/g, '')
            .split(/\s+/)
            .filter((w) => w.length > 2);

    const words1 = normalize(str1);
    const words2 = normalize(str2);

    if (words1.length === 0 || words2.length === 0) return 0;

    // Count matches using partial word matching (prefix/substring)
    const countMatches = (source: string[], target: string[]): number => {
        let matches = 0;
        for (const word of source) {
            // Check for exact match or partial match (word is prefix/contained in target word)
            const hasMatch = target.some(
                (t) => t === word || t.startsWith(word) || word.startsWith(t) || t.includes(word) || word.includes(t)
            );
            if (hasMatch) matches++;
        }
        return matches;
    };

    // Calculate coverage from both directions
    const matches1to2 = countMatches(words1, words2);
    const matches2to1 = countMatches(words2, words1);

    // Use the perspective of the shorter string (evaluation row descriptions are often short)
    const shorter = words1.length <= words2.length ? words1 : words2;
    const longer = words1.length > words2.length ? words1 : words2;
    const matchesFromShorter = countMatches(shorter, longer);

    // Primary score: what % of the shorter description is covered?
    const coverageScore = matchesFromShorter / shorter.length;

    // Secondary score: traditional Jaccard for tie-breaking
    const union = new Set([...words1, ...words2]).size;
    const jaccardScore = Math.max(matches1to2, matches2to1) / union;

    // Weighted combination: favor coverage score (works better for short descriptions)
    return coverageScore * 0.7 + jaccardScore * 0.3;
}

/**
 * Map extracted line items to evaluation rows using semantic matching
 */
export function mapItemsToRows(
    extractedItems: ParsedLineItem[],
    evaluationRows: EvaluationRow[],
    firmId: string
): MappedTenderResult {
    console.log(`[tender-parser] Mapping ${extractedItems.length} items to ${evaluationRows.length} rows`);
    console.log(`[tender-parser] Evaluation rows:`, evaluationRows.map(r => r.description));

    const mappedItems: MappedTenderResult['mappedItems'] = [];
    const unmappedItems: ParsedLineItem[] = [];
    const usedRowIds = new Set<string>();

    // Similarity threshold for matching (25% - lowered to handle short descriptions)
    const SIMILARITY_THRESHOLD = 0.25;

    for (const item of extractedItems) {
        let bestMatch: { row: EvaluationRow; score: number } | null = null;

        console.log(`[tender-parser] Trying to match: "${item.description}" ($${item.amountCents / 100})`);

        // Find the best matching row that hasn't been used
        for (const row of evaluationRows) {
            if (usedRowIds.has(row.id)) continue;

            const score = calculateSimilarity(item.description, row.description);
            console.log(`[tender-parser]   -> "${row.description}" score: ${score.toFixed(3)}`);

            if (score > SIMILARITY_THRESHOLD && (!bestMatch || score > bestMatch.score)) {
                bestMatch = { row, score };
            }
        }

        if (bestMatch) {
            // Map to this row
            usedRowIds.add(bestMatch.row.id);
            mappedItems.push({
                rowId: bestMatch.row.id,
                description: bestMatch.row.description,
                amountCents: item.amountCents,
                confidence: item.confidence * bestMatch.score, // Combine confidences
            });

            // Store the matchedRowId for reference
            item.matchedRowId = bestMatch.row.id;

            console.log(
                `[tender-parser] Mapped "${item.description}" -> "${bestMatch.row.description}" (score: ${bestMatch.score.toFixed(2)})`
            );
        } else {
            // No match found
            unmappedItems.push(item);
            console.log(`[tender-parser] No match for "${item.description}"`);
        }
    }

    // Calculate overall confidence
    const overallConfidence =
        mappedItems.length > 0
            ? mappedItems.reduce((sum, item) => sum + item.confidence, 0) / mappedItems.length
            : 0;

    return {
        success: true,
        firmId,
        mappedItems,
        unmappedItems,
        overallConfidence,
    };
}

// ============================================================================
// MAIN EXPORT: Parse and Map Tender
// ============================================================================

/**
 * Parse a tender PDF and map extracted amounts to evaluation rows
 */
export async function parseTenderForEvaluation(
    fileBuffer: Buffer,
    filename: string,
    evaluationRows: EvaluationRow[],
    firmId: string
): Promise<TenderParseResult> {
    // Extract pricing from tender
    const extraction = await extractPricingFromTender(fileBuffer, filename);

    if (!extraction.success) {
        return {
            firmId,
            firmName: extraction.firmNameExtracted || undefined,
            items: [],
            filteredItems: [],
            overallConfidence: 0,
            errors: [extraction.error || 'Extraction failed'],
        };
    }

    // Map to evaluation rows
    const mapping = mapItemsToRows(extraction.items, evaluationRows, firmId);

    // Build final result
    const items: ParsedLineItem[] = mapping.mappedItems.map((item) => ({
        description: item.description,
        amountCents: item.amountCents,
        confidence: item.confidence,
        matchedRowId: item.rowId,
    }));

    // Include unmapped items without row mapping
    items.push(...mapping.unmappedItems);

    return {
        firmId,
        firmName: extraction.firmNameExtracted || undefined,
        items,
        filteredItems: extraction.filteredItems,  // Pass through filtered items for audit trail
        overallConfidence: mapping.overallConfidence,
        errors: mapping.unmappedItems.length > 0
            ? [`${mapping.unmappedItems.length} items could not be mapped`]
            : undefined,
    };
}
