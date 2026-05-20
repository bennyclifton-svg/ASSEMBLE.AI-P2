/**
 * T040-T043: Tender Parser Service
 * AI-Powered Tender Document Parsing for Evaluation Report
 * Feature 011 - Evaluation Report
 *
 * Extracts pricing line items from tender submission PDFs using:
 * 1. LlamaParse/Unstructured/pdf-parse for document parsing (T041)
 * 2. The configured extraction AI provider for intelligent pricing extraction (T042)
 * 3. Semantic matching to map amounts to evaluation rows (T043)
 */

import { aiComplete } from '@/lib/ai/client';
import { parseDocument, type ParsedDocument } from '@/lib/rag/parsing';
import {
    cleanOptionalText,
    normaliseTenderItemType,
    normaliseTenderLineItemTableType,
    normaliseVmOrigin,
    normaliseVmStatus,
} from './tender-parser-classification';
import type {
    EvaluationRow,
    EvaluationTableType,
    ParsedLineItem,
    TenderItemType,
    TenderParseResult,
    VmAdoptionStatus,
    VmOrigin,
} from '@/types/evaluation';

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

export interface TenderExtractionPayload {
    firmName: string | null;
    items: Array<{
        description: string;
        amountCents: number;
        confidence: number;
        itemType?: TenderItemType;
        tableType?: EvaluationTableType;
        category?: string;
        sourceSection?: string;
        vmAdoptionStatus?: VmAdoptionStatus;
        vmEmbeddedInBase?: boolean;
        vmOrigin?: VmOrigin;
    }>;
    overallConfidence: number;
}

// ============================================================================
// EXTRACTION PROMPT (T042)
// ============================================================================

const TENDER_EXTRACTION_MAX_TOKENS = 8000;

const TENDER_EXTRACTION_PROMPT = `You are an expert at extracting pricing data from tender submission documents.
Analyze the provided tender document and extract priced rows for a tender evaluation sheet.

The evaluation sheet has three table types:

1. "initial_price" - the tenderer's base fee / price schedule.
   Include fixed-sum deliverables such as Schematic Design, Detail Design, CC Documentation, Contract Administration, Tender Assistance, commissioning attendance, or fixed allowances.

2. "adds_subs" - commercial adjustments that should normalise the tenders.
   Include add/deduct rows, exclusions that need pricing, qualifications with stated values, additional services, "if required" items, formal report additions, peer review workshops, missing-scope allowances, and other priced items that change the comparable tender price.

3. "value_management" - tenderer-proposed VM / value engineering / alternative-scope options.
   Include priced options that could reduce or change scope after evaluation. Use negative amountCents for savings or credits, positive amountCents for extra-cost VM options. These rows should default to vmAdoptionStatus "tbd" because the PM decides whether to adopt them.

EXCLUDE as "total" - summary/aggregation rows:
- Lines starting with "Total", "Sub-Total", "Subtotal", "Grand Total"
- Lines ending with "Total" or "Fee (excl GST)" or "Fee (ex GST)"
- Sum lines that aggregate other items

EXCLUDE as "unit_rate" - variable rate rows without a fixed total:
- "Rate per", "Price per", "$/hour", "$/day", "$/visit", "$/meeting"
- Time-based rates without fixed totals

IMPORTANT:
- Convert ALL currency amounts to cents (multiply dollars by 100).
- Return the row's own amount only. Do not return subtotals or grand totals.
- Keep the tenderer's wording where possible, but remove numbering/table noise.
- If a row appears under a Value Management or VM heading, tableType must be "value_management".
- If a row appears under Adds & Subs, Commercial Adjustments, Normalisation, Exclusions, Qualifications, or Clarifications with a fixed price, tableType must be "adds_subs".
- Return compact JSON. Do not use markdown fences, comments, or explanatory text.
- To keep long price schedules within the response limit, include vmAdoptionStatus, vmEmbeddedInBase, and vmOrigin only for rows where tableType is "value_management".

Return ONLY a valid JSON object with this exact structure:

{
  "firmName": "string or null (company/tenderer name if found)",
  "items": [
    {
      "description": "string (the line item description)",
      "amountCents": number (amount in cents, can be negative for savings/deductions),
      "confidence": number (0-1, your confidence in this extraction),
      "itemType": "deliverable" | "commercial_adjustment" | "value_management" | "total" | "unit_rate" | "allowance",
      "tableType": "initial_price" | "adds_subs" | "value_management",
      "category": "short category such as base price, scope gap, exclusion, qualification, value management, allowance",
      "sourceSection": "heading or section where the row was found",
      "vmAdoptionStatus": "tbd (value_management rows only)",
      "vmEmbeddedInBase": false,
      "vmOrigin": "tenderer_proposed (value_management rows only)"
    }
  ],
  "overallConfidence": number (0-1, overall confidence in the extraction)
}

Examples:
- "Schematic Design" -> itemType: "deliverable", tableType: "initial_price" (include)
- "Tender Assistance" -> itemType: "deliverable", tableType: "initial_price" (include)
- "Total Lump Sum Fee (excl GST)" -> itemType: "total" (exclude)
- "Rate per Site Visit" -> itemType: "unit_rate" (exclude)
- "Include formal natural ventilation report suitable for client issue" -> itemType: "commercial_adjustment", tableType: "adds_subs" (include)
- "Add CFD modelling for basement ventilation if required" -> itemType: "commercial_adjustment", tableType: "adds_subs" (include)
- "VM-01: Rationalise car park exhaust zoning" -> itemType: "value_management", tableType: "value_management" (include)
- "Value management saving - mixed-mode ventilation strategy" -> itemType: "value_management", tableType: "value_management" (include as a negative amount)
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
// EXTRACTION RESPONSE PARSING
// ============================================================================

const INCOMPLETE_EXTRACTION_RESPONSE_MESSAGE =
    'AI extraction response was incomplete. The pricing schedule likely exceeded the model output limit. ' +
    'Retry the extraction; if it still fails, split the tender submission into a smaller file.';

function extractTenderExtractionJson(responseText: string): string {
    const start = responseText.indexOf('{');
    if (start === -1) {
        throw new Error('Invalid JSON response from extraction');
    }

    let depth = 0;
    let inString = false;
    let escaped = false;

    for (let i = start; i < responseText.length; i++) {
        const char = responseText[i];

        if (inString) {
            if (escaped) {
                escaped = false;
            } else if (char === '\\') {
                escaped = true;
            } else if (char === '"') {
                inString = false;
            }
            continue;
        }

        if (char === '"') {
            inString = true;
            continue;
        }

        if (char === '{') {
            depth++;
        } else if (char === '}') {
            depth--;
            if (depth === 0) {
                return responseText.slice(start, i + 1);
            }
        }
    }

    throw new Error(INCOMPLETE_EXTRACTION_RESPONSE_MESSAGE);
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function parseTenderExtractionJson(jsonText: string): TenderExtractionPayload {
    let parsed: unknown;
    try {
        parsed = JSON.parse(jsonText);
    } catch {
        throw new Error('Invalid JSON response from extraction');
    }

    if (!isRecord(parsed) || !Array.isArray(parsed.items)) {
        throw new Error('Invalid JSON response from extraction');
    }

    return parsed as unknown as TenderExtractionPayload;
}

export function parseTenderExtractionResponse(responseText: string): TenderExtractionPayload {
    return parseTenderExtractionJson(extractTenderExtractionJson(responseText));
}

// ============================================================================
// ERROR NORMALISATION
// ============================================================================

function normaliseAiExtractionError(error: unknown): string {
    const message = error instanceof Error ? error.message : String(error);

    if (/credit balance is too low/i.test(message)) {
        return (
            'The configured AI extraction provider rejected the request because its credit balance is too low. ' +
            'Top up that provider, or switch the Extraction model in Admin > Models to an available OpenAI/OpenRouter model.'
        );
    }

    return message;
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
        console.log('[tender-parser] Calling configured extraction AI for pricing extraction...');
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

        const response = await aiComplete({
            featureGroup: 'extraction',
            maxTokens: TENDER_EXTRACTION_MAX_TOKENS,
            temperature: 0,
            messages: [
                {
                    role: 'user',
                    content: TENDER_EXTRACTION_PROMPT + content,
                },
            ],
        });

        // Parse JSON response
        let extractedData: TenderExtractionPayload;

        try {
            const jsonText = extractTenderExtractionJson(response.text);
            console.log('[tender-parser] Cleaned JSON to parse:', jsonText.substring(0, 200));
            extractedData = parseTenderExtractionJson(jsonText);
        } catch (jsonError) {
            const message = jsonError instanceof Error ? jsonError.message : 'Invalid JSON response from extraction';
            console.error('[tender-parser] Failed to parse JSON response:', {
                message,
                responseLength: response.text.length,
                preview: response.text.substring(0, 2000),
            });
            throw new Error(message);
        }

        // Build raw items with AI classification
        const rawItems: ParsedLineItem[] = extractedData.items.map((item) => {
            const parsed: ParsedLineItem = {
                description: item.description,
                amountCents: Math.round(Number(item.amountCents) || 0),
                confidence: Number(item.confidence) || 0.5,
                itemType: normaliseTenderItemType(item.itemType),
                tableType: item.tableType,
                category: cleanOptionalText(item.category),
                sourceSection: cleanOptionalText(item.sourceSection),
            };
            const tableType = normaliseTenderLineItemTableType(parsed);

            return {
                ...parsed,
                tableType,
                vmAdoptionStatus: tableType === 'value_management' ? normaliseVmStatus(item.vmAdoptionStatus) : undefined,
                vmEmbeddedInBase: tableType === 'value_management' ? Boolean(item.vmEmbeddedInBase) : undefined,
                vmOrigin: tableType === 'value_management' ? normaliseVmOrigin(item.vmOrigin) : undefined,
            };
        });

        console.log(`[tender-parser] Extracted ${rawItems.length} raw line items from PDF`);

        // Apply post-extraction filter (conservative - include when in doubt)
        const { included: items, filtered: filteredItems } = filterLineItems(rawItems);

        console.log(`[tender-parser] After filtering: ${items.length} included, ${filteredItems.length} filtered`);
        items.forEach((item, i) => {
            console.log(`[tender-parser]   ${i + 1}. [${item.tableType}/${item.itemType}] "${item.description}" = $${item.amountCents / 100}`);
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
        const normalisedError = normaliseAiExtractionError(extractError);
        return {
            success: false,
            items: [],
            filteredItems: [],
            firmNameExtracted: null,
            overallConfidence: 0,
            error: `Failed to extract pricing: ${normalisedError}`,
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
            const combinedConfidence = item.confidence * bestMatch.score;
            usedRowIds.add(bestMatch.row.id);
            mappedItems.push({
                rowId: bestMatch.row.id,
                description: bestMatch.row.description,
                amountCents: item.amountCents,
                confidence: combinedConfidence, // Combine confidences
            });

            // Store the matchedRowId for reference
            item.matchedRowId = bestMatch.row.id;
            item.confidence = combinedConfidence;

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

    const tableTypes: EvaluationTableType[] = ['initial_price', 'adds_subs', 'value_management'];
    const mappings = tableTypes.map((tableType) => {
        const itemsForTable = extraction.items.filter((item) => normaliseTenderLineItemTableType(item) === tableType);
        const rowsForTable = evaluationRows.filter((row) => row.tableType === tableType);
        return mapItemsToRows(itemsForTable, rowsForTable, firmId);
    });

    const items = extraction.items;
    const unmappedItems = items.filter((item) => !item.matchedRowId);
    const mappedConfidence = mappings.flatMap((mapping) => mapping.mappedItems.map((item) => item.confidence));
    const overallConfidence = mappedConfidence.length > 0
        ? mappedConfidence.reduce((sum, confidence) => sum + confidence, 0) / mappedConfidence.length
        : extraction.overallConfidence;

    return {
        firmId,
        firmName: extraction.firmNameExtracted || undefined,
        items,
        filteredItems: extraction.filteredItems,  // Pass through filtered items for audit trail
        overallConfidence,
        errors: unmappedItems.length > 0
            ? [`${unmappedItems.length} items could not be mapped`]
            : undefined,
    };
}
