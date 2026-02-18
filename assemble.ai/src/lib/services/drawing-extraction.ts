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
import { parseDocument } from '../rag/parsing';

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
 * Check if a value matches a known drawing number pattern
 * Used to validate filename extraction results against AI results
 */
function isKnownDrawingNumberPattern(value: string): boolean {
    return DRAWING_NUMBER_PATTERNS.some(pattern => pattern.test(value));
}

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
// NON-DRAWING DETECTION (SKIP API CALLS)
// ============================================================================

/**
 * Filename patterns that indicate a document is NOT a drawing
 * These files skip vision extraction entirely (saves API calls)
 */
const NON_DRAWING_FILENAME_PATTERNS: RegExp[] = [
    // Specifications
    /\bspec(ification)?s?\b/i,
    /\bsection\s*\d/i,
    // Reports and documents
    /\breport\b/i,
    /\bmanual\b/i,
    /\bguide\b/i,
    /\bstandard\b/i,
    // Schedules and matrices
    /\bschedule\b/i,
    /\bmatrix\b/i,
    /\bregister\b/i,
    // Administrative
    /\btransmittal\b/i,
    /\bcorrespondence\b/i,
    /\bletter\b/i,
    /\bminutes\b/i,
    /\bagenda\b/i,
    /\bcontract\b/i,
    /\bcertificate\b/i,
    /\bsubmittal\b/i,
    // Data sheets
    /\bdata\s*sheet\b/i,
    /\bcut\s*sheet\b/i,
];

/**
 * Check if filename indicates this is NOT a drawing
 * Returns true if the file should skip drawing extraction
 */
function isNonDrawingFilename(filename: string): boolean {
    const baseName = filename.replace(/\.[^/.]+$/, '').toLowerCase();
    return NON_DRAWING_FILENAME_PATTERNS.some(pattern => pattern.test(baseName));
}

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

    // Higher confidence when we have both a recognized drawing number pattern and a clean revision
    const hasStrongPattern = isKnownDrawingNumberPattern(drawingNumber);
    const hasCleanRevision = revision !== null && /^[A-Z]$/i.test(revision);
    const confidence = hasStrongPattern && hasCleanRevision ? 85
        : hasStrongPattern ? 80
        : 70;

    return {
        drawingNumber,
        drawingName,
        drawingRevision: revision,
        confidence,
        source: 'FILENAME',
    };
}

// ============================================================================
// AI EXTRACTION
// ============================================================================

/**
 * Extract drawing information using FAST hybrid approach:
 * 1. Always extract from filename (free, instant)
 * 2. Use vision-first for PDFs (single API call, no polling - FAST)
 * 3. Fall back to text extraction only if vision unavailable
 *
 * This approach bypasses LlamaParse which is slow (polling-based) and
 * overkill for simple title block extraction.
 */
export async function extractDrawingInfo(
    request: DrawingExtractionRequest
): Promise<DrawingExtractionResult> {
    const { fileBuffer, filename, mimeType } = request;

    // Step 0: Check if filename indicates this is NOT a drawing (skip API calls entirely)
    if (isNonDrawingFilename(filename)) {
        console.log(`[drawing-extraction] Skipping non-drawing file (filename pattern): ${filename}`);
        return {
            drawingNumber: null,
            drawingName: null,
            drawingRevision: null,
            confidence: 90,  // High confidence it's not a drawing
            source: 'FILENAME',
        };
    }

    // Step 1: Always extract from filename first (free, fast)
    const filenameResult = extractFromFilename(filename);
    console.log(`[drawing-extraction] Filename extraction: ${filenameResult?.drawingNumber || 'none'}, rev: ${filenameResult?.drawingRevision || 'none'}`);

    // Step 2: For PDFs, use VISION-FIRST approach (single API call, no polling)
    // This is much faster than LlamaParse which requires upload + polling + download
    if (mimeType === 'application/pdf') {
        console.log(`[drawing-extraction] Using fast vision extraction for: ${filename}`);

        try {
            const visionResult = await extractWithVision(fileBuffer, filename, mimeType);

            // Merge vision with filename result
            const merged = mergeExtractionResults(visionResult, filenameResult);
            console.log(`[drawing-extraction] Fast result for ${filename}: ${merged.drawingNumber || 'none'}, rev: ${merged.drawingRevision || 'none'} (confidence: ${merged.confidence}, source: ${merged.source})`);

            return merged;
        } catch (visionError) {
            console.error('[drawing-extraction] Vision extraction failed, falling back to text:', visionError);
            // Fall through to text-based extraction
        }
    }

    // Step 3: Text-based extraction (for non-PDFs or if vision failed)
    let aiResult: DrawingExtractionResult | null = null;

    try {
        console.log(`[drawing-extraction] Parsing document (text mode): ${filename}`);
        const parsed = await parseDocument(fileBuffer, filename);
        const documentText = parsed.content;

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
            console.log('[drawing-extraction] No/minimal text extracted, using filename only');
        }
    } catch (error) {
        console.error('[drawing-extraction] Text extraction/AI failed:', error);
    }

    // Step 4: Merge results
    const merged = aiResult
        ? mergeExtractionResults(aiResult, filenameResult)
        : (filenameResult || createEmptyResult('FILENAME'));

    console.log(`[drawing-extraction] Final result for ${filename}: ${merged.drawingNumber || 'none'}, rev: ${merged.drawingRevision || 'none'} (confidence: ${merged.confidence}, source: ${merged.source})`);

    return merged;
}

/**
 * Build the extraction prompt for Claude
 */
function buildExtractionPrompt(documentText: string, filename: string): string {
    // Take first 8000 chars to avoid token limits
    const truncatedText = documentText.substring(0, 8000);

    return `You are analyzing a construction project document to determine if it is a DRAWING and extract drawing information.

DOCUMENT CONTENT (first 8000 characters):
${truncatedText}

FILENAME: ${filename}

IMPORTANT - FILENAME CONVENTIONS:
Construction drawing filenames typically follow this pattern:
  [ProjectNumber] [DrawingNumber] [Description] [Revision].[ext]
For example: "1115 CC-46 WET AREAS A.pdf"
  - 1115 = project number (ignore this)
  - CC-46 = drawing number
  - WET AREAS = abbreviated description
  - A = revision letter
The drawing number in the filename (e.g., CC-46, CC-08, H-101) is almost always correct.
Do NOT confuse paper sizes (A1, A3), project numbers (1115), or issue statuses (RG, IFC) with drawing numbers or revisions.

STEP 1 - CLASSIFY THE DOCUMENT TYPE:
First, determine if this document is an actual DRAWING or a different document type.

DRAWINGS are technical/graphical documents with:
- A title block (usually bottom-right) containing drawing number, title, revision
- Visual content like floor plans, elevations, sections, details, diagrams
- Standard drawing number formats: A-101, S-201, M-301, SK-001, etc.

NOT DRAWINGS (return null values for these):
- Matrices, schedules, registers (e.g., "DA Responsibility Matrix", "Door Schedule")
- Reports, specifications, standards
- Correspondence, letters, transmittals
- Contracts, conditions, certificates
- Meeting minutes, agendas
- Tables of conditions or requirements (these contain reference numbers, NOT drawing numbers)
- Any document that is primarily tabular data or text without a drawing title block

IMPORTANT: Condition numbers (like "Condition 3", "A 141", "Item 5") in matrices/schedules are NOT drawing numbers.
Reference codes within document tables are NOT drawing numbers.
Only extract drawing information if this is genuinely a technical drawing.

STEP 2 - IF THIS IS A DRAWING, extract:

1. DRAWING NUMBER: The unique identifier for this drawing. Common formats include:
   - Discipline prefix + number: A-101, S-201, M-301, E-401, P-501
   - SK (sketch) drawings: SK-001, SK-100
   - DWG prefix: DWG-2024-001
   - Sheet numbers: Sheet 1, Sheet A1
   - Found in title block, header, or footer of the drawing

2. DRAWING NAME/TITLE: The descriptive name of the drawing (e.g., "Floor Plan - Level 1", "Structural Foundation Details")

3. REVISION: The revision indicator (A, B, 01, P01, Rev. 1, etc.)

Respond in this exact JSON format:
{
  "isDrawing": true or false,
  "drawingNumber": "A-101" or null,
  "drawingName": "Floor Plan Level 1" or null,
  "drawingRevision": "A" or null,
  "confidence": 85
}

If isDrawing is false, set drawingNumber, drawingName, and drawingRevision to null.

The confidence score (0-100) should reflect how certain you are:
- 90-100: Clearly a drawing with unambiguous information, OR clearly NOT a drawing
- 70-89: Likely correct but some ambiguity
- 50-69: Uncertain
- Below 50: Very uncertain

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

    // If AI determined this is NOT a drawing, return null values with high confidence
    if (result.isDrawing === false) {
        console.log('[drawing-extraction] AI classified document as NOT a drawing');
        return {
            drawingNumber: null,
            drawingName: null,
            drawingRevision: null,
            confidence: typeof result.confidence === 'number' ? result.confidence : 90,
            source: 'AI',
        };
    }

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
function buildVisionExtractionPrompt(filename: string): string {
    return `You are analyzing a construction project document. First determine if it is a DRAWING, then extract information if applicable.

FILENAME: ${filename}

IMPORTANT - FILENAME CONVENTIONS:
Construction drawing filenames typically follow this pattern:
  [ProjectNumber] [DrawingNumber] [Description] [Revision].[ext]
For example: "1115 CC-46 WET AREAS A.pdf"
  - 1115 = project number (ignore this)
  - CC-46 = drawing number (this is what goes in drawingNumber)
  - WET AREAS = abbreviated description
  - A = revision letter

The drawing number in the filename (e.g., CC-46, CC-08, H-101) is almost always correct.
The single letter at the end before the extension is almost always the revision.
Do NOT confuse these with:
  - Paper sizes (A1, A3) - these are NOT drawing numbers
  - Project numbers (1115, 1150) - these are NOT drawing numbers
  - Issue statuses (RG, IFC, FC) - these are NOT revision letters

STEP 1 - CLASSIFY THE DOCUMENT:

DRAWINGS have:
- A title block (usually bottom-right) with drawing number, title, revision
- Visual/graphical content: floor plans, elevations, sections, details, diagrams
- Standard drawing number formats: A-101, S-201, M-301, SK-001, CC-46

NOT DRAWINGS (return null values):
- Matrices, schedules, registers, tables (e.g., "DA Responsibility Matrix", "Door Schedule")
- Reports, specifications, correspondence, contracts
- Documents that are primarily text or tabular data without a drawing title block

IMPORTANT: Condition numbers, reference codes, or item numbers in tables are NOT drawing numbers.

STEP 2 - IF THIS IS A DRAWING, extract:

1. DRAWING NUMBER: The unique identifier. Use the drawing number from the filename if it matches a pattern like XX-NN (e.g., CC-46, H-101). Verify against the title block if possible.
2. DRAWING NAME/TITLE: The full descriptive name from the title block (e.g., "Floor Plan - Level 1", not the abbreviated filename version)
3. REVISION: The revision letter/number. Use the single letter at the end of the filename (before .pdf) as the revision. Do NOT use issue statuses like RG (Regulatory), IFC (Issued for Construction), FC (For Construction) as revisions.

Respond in this exact JSON format:
{
  "isDrawing": true or false,
  "drawingNumber": "CC-46" or null,
  "drawingName": "Wet Areas - Sheet 1" or null,
  "drawingRevision": "A" or null,
  "confidence": 85
}

If isDrawing is false, set drawingNumber, drawingName, and drawingRevision to null.

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
                        text: buildVisionExtractionPrompt(filename),
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

    // If AI determined this is NOT a drawing, return null values with high confidence
    if (result.isDrawing === false) {
        console.log('[drawing-extraction] Vision classified document as NOT a drawing');
        return {
            drawingNumber: null,
            drawingName: null,
            drawingRevision: null,
            confidence: typeof result.confidence === 'number' ? result.confidence : 90,
            source: 'VISION',
        };
    }

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
 *
 * Strategy:
 * - Drawing number: FILENAME takes priority when it matches a known pattern
 *   (AI/vision often confuses sheet sizes, project numbers, and reference codes with drawing numbers)
 * - Drawing name: AI/VISION takes priority (reads full descriptive title from title block)
 * - Revision: FILENAME takes priority when it has a clear single-letter revision
 *   (AI/vision often confuses issue statuses like RG/IFC with revision letters)
 */
function mergeExtractionResults(
    primaryResult: DrawingExtractionResult,
    filenameResult: DrawingExtractionResult | null
): DrawingExtractionResult {
    if (!filenameResult) return primaryResult;

    // Filename drawing number is very reliable when it matches a known pattern
    // AI/vision often picks up sheet sizes (A1), project numbers (1115), or
    // reference codes instead of the actual drawing number
    const filenameHasStrongDrawingNumber = filenameResult.drawingNumber &&
        isKnownDrawingNumberPattern(filenameResult.drawingNumber);

    // Filename revision is very reliable when it's a clean single letter at end
    // AI/vision often picks up issue statuses (RG=Regulatory, IFC=Issued for Construction)
    // instead of the actual revision letter
    const filenameHasStrongRevision = filenameResult.drawingRevision &&
        /^[A-Z]$/i.test(filenameResult.drawingRevision);

    const merged: DrawingExtractionResult = {
        // Drawing number: prefer filename when it has a recognized pattern
        drawingNumber: filenameHasStrongDrawingNumber
            ? filenameResult.drawingNumber
            : (primaryResult.drawingNumber || filenameResult.drawingNumber),
        // Drawing name: prefer AI (reads full descriptive title from title block)
        drawingName: primaryResult.drawingName || filenameResult.drawingName,
        // Revision: prefer filename when it has a clear single-letter revision
        drawingRevision: filenameHasStrongRevision
            ? filenameResult.drawingRevision
            : (primaryResult.drawingRevision || filenameResult.drawingRevision),
        confidence: primaryResult.confidence,
        source: primaryResult.source,
    };

    // Log when filename overrides AI
    if (filenameHasStrongDrawingNumber && primaryResult.drawingNumber &&
        primaryResult.drawingNumber !== filenameResult.drawingNumber) {
        console.log(`[drawing-extraction] Filename drawing number override: AI="${primaryResult.drawingNumber}" -> Filename="${filenameResult.drawingNumber}"`);
    }
    if (filenameHasStrongRevision && primaryResult.drawingRevision &&
        primaryResult.drawingRevision !== filenameResult.drawingRevision) {
        console.log(`[drawing-extraction] Filename revision override: AI="${primaryResult.drawingRevision}" -> Filename="${filenameResult.drawingRevision}"`);
    }

    // Boost confidence when filename corroborates AI results
    if (filenameHasStrongDrawingNumber || filenameHasStrongRevision) {
        merged.confidence = Math.max(merged.confidence, filenameResult.confidence);
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
    // Higher default concurrency since vision extraction is fast (single API call, no polling)
    const { concurrency = 5 } = options;
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
