/**
 * Drawing Number Extraction Service
 * Feature: AI-powered extraction of drawing numbers, names, and revisions
 * from construction documents.
 *
 * Uses hybrid extraction strategy with Claude Haiku for cost efficiency:
 * 1. Filename pattern matching (always runs - free, fast)
 * 2. AI text extraction from document content
 * 3. Merge results (AI primary, filename supplements missing fields)
 * 4. Vision fallback for low confidence (analyzes PDF as document)
 */

import Anthropic from '@anthropic-ai/sdk';
import { parseDocument } from '@/lib/rag/parsing';

// ============================================================================
// TYPES
// ============================================================================

export interface DrawingExtractionResult {
    drawingNumber: string | null;
    drawingName: string | null;
    drawingRevision: string | null;
    confidence: number;  // 0-100
    source: 'AI' | 'FILENAME' | 'VISION';
}

export interface DrawingExtractionRequest {
    fileBuffer: Buffer;
    filename: string;
    mimeType: string;
}

// ============================================================================
// PATTERN DEFINITIONS
// ============================================================================

/**
 * Common construction drawing number patterns
 * Discipline prefixes: A (Arch), S (Struct), M (Mech), E (Elec), P (Plumb), L (Landscape)
 */
const DRAWING_NUMBER_PATTERNS: RegExp[] = [
    // Generic two-letter prefix with hyphen and number: CC-11, AB-01, XY-123
    // This catches consultant codes, custom prefixes, etc.
    /^[A-Z]{2}-\d{1,3}$/i,
    // Standard discipline prefix patterns: A-101, S-201, M-301
    /^([ASMEPL]|AR|ST|ME|EL|PL|LA|CV|SK|DWG)-?\d{2,4}[A-Z]?$/i,
    // Extended patterns with multiple number groups: A-101-01, DWG-2024-001
    /^[A-Z]{1,4}-\d{2,4}(-\d{2,4})?[A-Z]?$/i,
    // Sheet suffix pattern: A101-S01
    /^[A-Z]{1,3}\d{2,4}-[A-Z]\d{2}$/i,
    // Simple pattern without dash: A101, S201 (3-4 digits)
    /^[A-Z]{1,2}\d{3,4}[A-Z]?$/i,
    // Two-letter prefix with 2 digits: LT01, LT02, DA01, SK01
    // Common for layout/detail drawings with shorter numbering
    /^[A-Z]{2}\d{2}$/i,
    // Sheet number patterns: Sheet 1, Sheet A1
    /^Sheet\s+[A-Z]?\d+$/i,
];

/**
 * Patterns that match project number prefixes that should be stripped
 * These are typically 4-6 digit numbers at the start of a drawing number
 */
const PROJECT_PREFIX_PATTERNS: RegExp[] = [
    // Project number followed by underscore and drawing number: 15123_S0203 -> S0203
    /^\d{4,6}[_-]([A-Z]{1,3}\d{2,4}[A-Z]?)$/i,
    // Project number followed by hyphen and drawing number: 15123-A101 -> A101
    /^\d{4,6}-([A-Z]{1,4}-?\d{2,4}[A-Z]?)$/i,
];

/**
 * Normalize drawing number by stripping project prefixes
 * AI extraction often includes project numbers, but we only want the drawing number
 */
function normalizeDrawingNumber(drawingNumber: string | null): string | null {
    if (!drawingNumber) return null;

    // Try each project prefix pattern
    for (const pattern of PROJECT_PREFIX_PATTERNS) {
        const match = drawingNumber.match(pattern);
        if (match && match[1]) {
            console.log(`[drawing-extraction] Normalized drawing number: ${drawingNumber} -> ${match[1]}`);
            return match[1].toUpperCase();
        }
    }

    return drawingNumber;
}

/**
 * Common revision patterns
 */
const REVISION_PATTERNS: RegExp[] = [
    /^\[([A-Z])\]$/i,                    // [A], [B], [C] - square bracket revisions
    /^\(([A-Z])\)$/i,                    // (A), (B), (C) - parenthesis letter revisions
    /^Rev\.?\s*([A-Z]|\d+)$/i,          // Rev A, Rev. 1
    /^([A-Z])$/,                         // Just A, B, C
    /^(\d{1,2})$/,                       // Just 1, 2, 3
    /^P0?(\d+)$/i,                       // P01, P1 (preliminary)
    /^R(\d+)$/i,                         // R1, R2 (revision)
    /^Issue\s*([A-Z]|\d+)$/i,           // Issue A, Issue 1
    /^C(\d+)$/i,                         // C1, C2 (construction)
    /^T(\d+)$/i,                         // T1, T2 (tender)
    /^\((\d{1,2})\)$/,                   // (01), (04) - common in construction docs
];

// ============================================================================
// FILENAME EXTRACTION (FALLBACK)
// ============================================================================

/**
 * Pattern to detect revision suffix attached to drawing number
 * e.g., LT01[B] -> drawing: LT01, revision: B
 */
const ATTACHED_REVISION_PATTERN = /^(.+?)(\[([A-Z])\]|\(([A-Z])\))$/i;

/**
 * Extract drawing number from filename as fallback
 */
export function extractFromFilename(filename: string): DrawingExtractionResult | null {
    // Remove extension
    const baseName = filename.replace(/\.[^/.]+$/, '');

    let drawingNumber: string | null = null;
    let revision: string | null = null;
    let drawingName: string | null = null;

    // First pass: Find hyphenated drawing numbers directly in the filename
    // Patterns like CC-01, CC-11, AR-101, SK-001, etc.
    // Must check the full string BEFORE splitting (which would destroy hyphenated patterns)
    for (const pattern of DRAWING_NUMBER_PATTERNS) {
        const match = baseName.match(new RegExp(pattern.source, 'gi'));
        if (match) {
            drawingNumber = match[0].toUpperCase();
            break;
        }
    }

    // Split by spaces and underscores only (preserve hyphens within tokens)
    let parts = baseName.split(/[_\s]+/).filter(Boolean);

    // Pre-process parts to split attached revisions (e.g., LT01[B] -> LT01, [B])
    parts = parts.flatMap(part => {
        const attachedMatch = part.match(ATTACHED_REVISION_PATTERN);
        if (attachedMatch) {
            const basePart = attachedMatch[1];
            const revisionSuffix = attachedMatch[2]; // [B] or (B)
            return [basePart, revisionSuffix];
        }
        return [part];
    });

    // Second pass: If no hyphenated match found, look in individual parts
    if (!drawingNumber) {
        for (const part of parts) {
            if (drawingNumber) break;
            for (const pattern of DRAWING_NUMBER_PATTERNS) {
                if (pattern.test(part)) {
                    drawingNumber = part.toUpperCase();
                    break;
                }
            }
        }
    }

    // Check for single letter revision at end FIRST (most common convention)
    // e.g., "1115 CC-11 LEVEL 08 E.pdf" -> revision "E"
    if (parts.length > 0) {
        const lastPart = parts[parts.length - 1];
        if (/^[A-Z]$/i.test(lastPart)) {
            revision = lastPart.toUpperCase();
        }
    }

    // If no single letter at end, look for revision patterns in parts
    if (!revision) {
        for (const part of parts) {
            for (const revPattern of REVISION_PATTERNS) {
                const match = part.match(revPattern);
                if (match) {
                    revision = match[1] || match[0];
                    break;
                }
            }
            if (revision) break;
        }
    }

    // Extract drawing name from parts between drawing number and revision
    if (drawingNumber) {
        const drawingNumIndex = parts.findIndex(p =>
            p.toUpperCase() === drawingNumber ||
            p.toUpperCase().includes(drawingNumber!)
        );
        if (drawingNumIndex >= 0 && drawingNumIndex < parts.length - 1) {
            // Check if last part is a revision (handles [C], (C), or just C)
            const lastPart = parts[parts.length - 1];
            const lastPartIsRevision = revision && (
                lastPart.toUpperCase() === revision ||
                lastPart.toUpperCase() === `[${revision}]` ||
                lastPart.toUpperCase() === `(${revision})`
            );
            const endIndex = lastPartIsRevision ? parts.length - 1 : parts.length;
            const nameParts = parts.slice(drawingNumIndex + 1, endIndex);
            if (nameParts.length > 0) {
                drawingName = nameParts.join(' ');
            }
        }
    }

    if (!drawingNumber) {
        return null;
    }

    return {
        drawingNumber,
        drawingName,
        drawingRevision: revision,
        confidence: 70,
        source: 'FILENAME',
    };
}

// ============================================================================
// AI EXTRACTION
// ============================================================================

/**
 * Extract drawing information using hybrid approach:
 * 1. Always extract from filename
 * 2. Try text-based AI extraction with Haiku
 * 3. Merge results (AI primary, filename supplements)
 * 4. If low confidence, try vision fallback
 */
export async function extractDrawingInfo(
    request: DrawingExtractionRequest
): Promise<DrawingExtractionResult> {
    const { fileBuffer, filename, mimeType } = request;

    // Step 1: Always extract from filename first (free, fast)
    const filenameResult = extractFromFilename(filename);
    console.log(`[drawing-extraction] Filename extraction: ${filenameResult?.drawingNumber || 'none'}, rev: ${filenameResult?.drawingRevision || 'none'}`);

    // Step 2: Try text-based AI extraction
    let aiResult: DrawingExtractionResult | null = null;
    let documentText: string | null = null;

    try {
        console.log(`[drawing-extraction] Parsing document: ${filename}`);
        const parsed = await parseDocument(fileBuffer, filename);
        documentText = parsed.content;

        // Only call AI if we have meaningful text content
        if (documentText && documentText.trim().length >= 50) {
            console.log(`[drawing-extraction] Calling AI for: ${filename}`);
            const anthropic = new Anthropic();
            const prompt = buildExtractionPrompt(documentText, filename);

            const message = await anthropic.messages.create({
                model: 'claude-haiku-4-5-20251001',  // Haiku for cost efficiency
                max_tokens: 500,
                messages: [{
                    role: 'user',
                    content: prompt,
                }],
            });

            const textContent = message.content.find(c => c.type === 'text');
            if (textContent && textContent.type === 'text') {
                aiResult = parseAIResponse(textContent.text);
                console.log(`[drawing-extraction] AI result: ${aiResult.drawingNumber || 'none'} (confidence: ${aiResult.confidence})`);
            }
        } else {
            console.log('[drawing-extraction] No/minimal text extracted, skipping AI text extraction');
        }
    } catch (error) {
        console.error('[drawing-extraction] Text extraction/AI failed:', error);
    }

    // Step 3: Merge AI result with filename result
    let merged = aiResult
        ? mergeExtractionResults(aiResult, filenameResult)
        : (filenameResult || createEmptyResult('FILENAME'));

    // Step 4: Vision fallback for low confidence or missing critical fields
    const needsVisionFallback =
        merged.confidence < 50 ||
        (!merged.drawingNumber && !merged.drawingRevision);

    if (needsVisionFallback && mimeType === 'application/pdf') {
        console.log(`[drawing-extraction] Low confidence (${merged.confidence}), trying vision fallback`);

        try {
            const visionResult = await extractWithVision(fileBuffer, filename, mimeType);

            // Use vision result if it's better
            if (visionResult.confidence > merged.confidence ||
                (visionResult.drawingNumber && !merged.drawingNumber)) {
                console.log(`[drawing-extraction] Vision improved result: ${visionResult.drawingNumber || 'none'} (confidence: ${visionResult.confidence})`);
                // Merge vision with filename too
                merged = mergeExtractionResults(visionResult, filenameResult);
            }
        } catch (visionError) {
            console.error('[drawing-extraction] Vision fallback failed:', visionError);
        }
    }

    console.log(`[drawing-extraction] Final result for ${filename}: ${merged.drawingNumber || 'none'}, rev: ${merged.drawingRevision || 'none'} (confidence: ${merged.confidence}, source: ${merged.source})`);

    return merged;
}

/**
 * Build the extraction prompt for Claude
 */
function buildExtractionPrompt(documentText: string, filename: string): string {
    // Take first 8000 chars to avoid token limits
    const truncatedText = documentText.substring(0, 8000);

    return `You are analyzing a construction document to extract drawing information.

DOCUMENT CONTENT (first 8000 characters):
${truncatedText}

FILENAME: ${filename}

Extract the following information if present:

1. DRAWING NUMBER: The unique identifier for this drawing. Common formats include:
   - Discipline prefix + number: A-101, S-201, M-301, E-401, P-501
   - SK (sketch) drawings: SK-001, SK-100
   - DWG prefix: DWG-2024-001
   - Sheet numbers: Sheet 1, Sheet A1
   - May appear in title block, header, or footer of the document

2. DRAWING NAME/TITLE: The descriptive name of the drawing (e.g., "Floor Plan - Level 1", "Structural Foundation Details", "Electrical Single Line Diagram")

3. REVISION: The revision indicator. Common formats:
   - Letters: A, B, C
   - Numbers: 01, 02, 1, 2
   - Preliminary: P01, P02
   - With prefix: Rev A, Rev. 1, Issue B
   - May appear near drawing number or in revision block

Respond in this exact JSON format (use null for missing values):
{
  "drawingNumber": "A-101" or null,
  "drawingName": "Floor Plan Level 1" or null,
  "drawingRevision": "A" or null,
  "confidence": 85
}

The confidence score (0-100) should reflect how certain you are about the extraction accuracy:
- 90-100: Clear, unambiguous drawing information found
- 70-89: Likely correct but some ambiguity
- 50-69: Uncertain, making educated guess
- Below 50: Very uncertain or guessing

Only respond with the JSON, no other text.`;
}

/**
 * Parse the AI response JSON
 */
function parseAIResponse(text: string): DrawingExtractionResult {
    // Find JSON in response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
        throw new Error('No JSON found in AI response');
    }

    const result = JSON.parse(jsonMatch[0]);

    // Normalize drawing number to strip project prefixes
    const normalizedNumber = normalizeDrawingNumber(result.drawingNumber || null);

    return {
        drawingNumber: normalizedNumber,
        drawingName: result.drawingName || null,
        drawingRevision: result.drawingRevision || null,
        confidence: typeof result.confidence === 'number' ? result.confidence : 70,
        source: 'AI',
    };
}

/**
 * Create empty result
 */
function createEmptyResult(source: 'AI' | 'FILENAME' | 'VISION'): DrawingExtractionResult {
    return {
        drawingNumber: null,
        drawingName: null,
        drawingRevision: null,
        confidence: 0,
        source,
    };
}

// ============================================================================
// VISION EXTRACTION (FALLBACK FOR LOW CONFIDENCE)
// ============================================================================

/**
 * Build vision extraction prompt for PDF documents
 */
function buildVisionExtractionPrompt(): string {
    return `You are analyzing a construction drawing document. Look at the title block (usually in the bottom-right corner) to extract:

1. DRAWING NUMBER: The unique identifier (e.g., A-101, S-201, SK-001)
2. DRAWING NAME/TITLE: The descriptive name
3. REVISION: The revision indicator (e.g., A, B, 01, P01, Rev. 2)

Focus on the title block area which typically contains:
- Drawing number/sheet number
- Drawing title
- Revision block or revision indicator
- Date and scale information

Respond in this exact JSON format (use null for missing values):
{
  "drawingNumber": "A-101" or null,
  "drawingName": "Floor Plan Level 1" or null,
  "drawingRevision": "A" or null,
  "confidence": 85
}

Only respond with the JSON, no other text.`;
}

/**
 * Extract drawing information using vision (PDF as document)
 * Used as fallback when text extraction has low confidence
 */
async function extractWithVision(
    fileBuffer: Buffer,
    filename: string,
    mimeType: string
): Promise<DrawingExtractionResult> {
    try {
        console.log(`[drawing-extraction] Vision fallback for: ${filename}`);
        const anthropic = new Anthropic();

        // Determine media type for the document
        const mediaType = mimeType === 'application/pdf' ? 'application/pdf' : 'application/pdf';

        const message = await anthropic.messages.create({
            model: 'claude-haiku-4-5-20251001',  // Haiku for cost efficiency
            max_tokens: 500,
            messages: [{
                role: 'user',
                content: [
                    {
                        type: 'document',
                        source: {
                            type: 'base64',
                            media_type: mediaType,
                            data: fileBuffer.toString('base64'),
                        },
                    },
                    {
                        type: 'text',
                        text: buildVisionExtractionPrompt(),
                    },
                ],
            }],
        });

        // Extract text response
        const textContent = message.content.find(c => c.type === 'text');
        if (!textContent || textContent.type !== 'text') {
            throw new Error('No text response from vision AI');
        }

        // Parse JSON response
        const result = parseVisionResponse(textContent.text);

        console.log(`[drawing-extraction] Vision result for ${filename}: ${result.drawingNumber || 'none'} (confidence: ${result.confidence})`);

        return result;
    } catch (error) {
        console.error('[drawing-extraction] Vision extraction failed:', error);
        return createEmptyResult('VISION');
    }
}

/**
 * Parse the vision AI response JSON
 */
function parseVisionResponse(text: string): DrawingExtractionResult {
    // Find JSON in response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
        throw new Error('No JSON found in vision AI response');
    }

    const result = JSON.parse(jsonMatch[0]);

    // Normalize drawing number to strip project prefixes
    const normalizedNumber = normalizeDrawingNumber(result.drawingNumber || null);

    return {
        drawingNumber: normalizedNumber,
        drawingName: result.drawingName || null,
        drawingRevision: result.drawingRevision || null,
        confidence: typeof result.confidence === 'number' ? result.confidence : 70,
        source: 'VISION',
    };
}

// ============================================================================
// RESULT HELPERS
// ============================================================================

/**
 * Merge AI/Vision result with filename result
 * AI/Vision takes priority, filename supplements missing fields
 */
function mergeExtractionResults(
    primaryResult: DrawingExtractionResult,
    filenameResult: DrawingExtractionResult | null
): DrawingExtractionResult {
    if (!filenameResult) return primaryResult;

    // Use primary result values, fall back to filename for missing fields
    const merged: DrawingExtractionResult = {
        drawingNumber: primaryResult.drawingNumber || filenameResult.drawingNumber,
        drawingName: primaryResult.drawingName || filenameResult.drawingName,
        drawingRevision: primaryResult.drawingRevision || filenameResult.drawingRevision,
        confidence: primaryResult.confidence,
        source: primaryResult.source,
    };

    // If we supplemented from filename, note it in logs and adjust confidence
    const supplementedFields: string[] = [];
    if (!primaryResult.drawingNumber && filenameResult.drawingNumber) {
        supplementedFields.push('drawingNumber');
    }
    if (!primaryResult.drawingRevision && filenameResult.drawingRevision) {
        supplementedFields.push('drawingRevision');
    }

    if (supplementedFields.length > 0) {
        console.log(`[drawing-extraction] Supplemented from filename: ${supplementedFields.join(', ')}`);
        // Blend confidence if we used filename data
        merged.confidence = Math.max(
            primaryResult.confidence,
            Math.round((primaryResult.confidence + filenameResult.confidence) / 2)
        );
    }

    return merged;
}

// ============================================================================
// BATCH EXTRACTION (for backfill)
// ============================================================================

/**
 * Extract drawing info from multiple documents
 * Useful for backfilling existing documents
 */
export async function extractDrawingInfoBatch(
    requests: DrawingExtractionRequest[],
    options: { concurrency?: number } = {}
): Promise<Map<string, DrawingExtractionResult>> {
    const { concurrency = 3 } = options;
    const results = new Map<string, DrawingExtractionResult>();

    // Process in batches
    for (let i = 0; i < requests.length; i += concurrency) {
        const batch = requests.slice(i, i + concurrency);
        const batchResults = await Promise.all(
            batch.map(async (req) => {
                try {
                    const result = await extractDrawingInfo(req);
                    return { filename: req.filename, result };
                } catch (error) {
                    console.error(`[drawing-extraction] Batch item failed: ${req.filename}`, error);
                    return { filename: req.filename, result: createEmptyResult('FILENAME') };
                }
            })
        );

        for (const { filename, result } of batchResults) {
            results.set(filename, result);
        }
    }

    return results;
}
