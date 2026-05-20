/**
 * Drawing Number Extraction Service
 * Feature: AI-powered extraction of drawing numbers, names, and revisions
 * from construction documents.
 *
 * Provider routing follows the 'extraction' feature group in /admin/models.
 * The text-mode call works on any provider via aiComplete(). The vision-mode
 * call uses Anthropic's native PDF `document` content block and is therefore
 * skipped automatically when the active provider isn't Anthropic — the caller
 * falls through to text-mode.
 *
 * Hybrid flow:
 * 1. Filename pattern matching (always runs - free, fast)
 * 2. Vision fallback for PDFs (Anthropic only; skipped otherwise)
 * 3. AI text extraction from parsed document content
 * 4. Merge results (AI primary, filename supplements missing fields)
 */

import Anthropic from '@anthropic-ai/sdk';
import { parseDocument } from '../rag/parsing';
import { aiComplete } from '../ai/client';
import { getProviderAndModelFor } from '../ai/registry';

// ============================================================================
// TYPES
// ============================================================================

export interface DrawingExtractionResult {
    drawingNumber: string | null;
    drawingName: string | null;
    drawingRevision: string | null;
    confidence: number;  // 0-100
    source: 'AI' | 'FILENAME' | 'VISION' | 'TEXT';
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
    // Document register numbers with spaced decimal sections: CC 02.3, CC 02.11
    /^[A-Z]{2,4}\s+\d{1,3}(?:\.\d{1,3}){1,3}[A-Z]?$/i,
    // Consultant/project prefix + discipline + sheet number: CC-A-102, ABC-AR-1001
    /^[A-Z]{2,4}-[A-Z]{1,2}-\d{2,4}[A-Z]?$/i,
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
    /^\[([A-Z]\d*|\d{1,2})\]$/i,        // [A], [C1], [04] - square bracket revisions
    /^\(([A-Z]\d*|\d{1,2})\)$/i,        // (A), (C1), (04) - parenthesis revisions
    /^Rev\.?\s*([A-Z]\d*|\d+)$/i,       // Rev A, Rev. 1, Rev C1
    /^([A-Z])$/,                         // Just A, B, C
    /^(\d{1,2})$/,                       // Just 1, 2, 3
    /^(P0?\d+)$/i,                       // P01, P1 (preliminary)
    /^(R\d+)$/i,                         // R1, R2 (revision)
    /^Issue\s*([A-Z]\d*|\d+)$/i,        // Issue A, Issue 1, Issue C1
    /^(C\d+)$/i,                         // C1, C2 (construction)
    /^(T\d+)$/i,                         // T1, T2 (tender)
    /^(C\d+)(CONSTRUCTION)?ISSUE$/i,     // C1CONSTRUCTIONISSUE
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
// LOCAL TITLE-BLOCK TEXT EXTRACTION
// ============================================================================

const TITLE_BLOCK_LABEL_PATTERN = /^(project|drawing\s+title|sheet\s+title|north\s+point|job\s+no|job\s+number|dwg\s+no|drawing\s+number|sheet\s+number|scale|sheet\s+scale|sheet\s+size|plot\s+date|issue|revision|drawn|checked|date|architect|services\s+consultant|project\s+manager|client)\s*:?$/i;

function isTitleBlockLabelLine(line: string): boolean {
    if (TITLE_BLOCK_LABEL_PATTERN.test(line)) return true;

    const id = normaliseIdentifier(line);
    return [
        'PROJECTTITLE',
        'DRAWINGTITLE',
        'SHEETTITLE',
        'SHEETNUMBERPLOTDATE',
        'ISSUESHEETSIZESHEETSCALE',
        'DRAWINGNUMBERSHEETNUMBER',
    ].includes(id);
}

function cleanPdfTextLine(line: string): string {
    return line
        .replace(/[\u0000-\u001F\u007F-\u009F]+/g, '')
        .replace(/\s+/g, ' ')
        .trim();
}

function normaliseIdentifier(value: string): string {
    return cleanPdfTextLine(value).toUpperCase().replace(/[^A-Z0-9]/g, '');
}

function normaliseTextLines(documentText: string): string[] {
    return documentText
        .split(/\r?\n/)
        .map(cleanPdfTextLine)
        .filter(Boolean);
}

function compactLinesText(lines: string[]): string {
    return lines.join('').toUpperCase().replace(/[^A-Z0-9]/g, '');
}

function hasDrawingTitleLabel(lines: string[]): boolean {
    return lines.some(line => /^(Drawing|Sheet)\s+Title\s*:?/i.test(line)) ||
        compactLinesText(lines).includes('DRAWINGTITLE') ||
        compactLinesText(lines).includes('SHEETTITLE');
}

function isClearlyNonDrawingText(documentText: string): boolean {
    const lines = normaliseTextLines(documentText);
    if (lines.length === 0 || hasDrawingTitleLabel(lines)) return false;

    const openingLines = lines.slice(0, 80);
    return openingLines.some(line =>
        /^Transmittal$/i.test(line) ||
        /^Distribution Register:?$/i.test(line) ||
        /^Reason For Issue:?/i.test(line) ||
        /^E=\s*Electronic$/i.test(line)
    );
}

function isIssueStatusLine(line: string): boolean {
    const upper = line.toUpperCase();
    return (
        /^(D&C\s+)?TENDER\s+ISSUE$/.test(upper) ||
        /^PRELIMINARY\s+ISSUE$/.test(upper) ||
        /^DESIGN\s+REVIEW$/.test(upper) ||
        /^ISSUED\s+FOR\b/.test(upper) ||
        /^FOR\s+(CONSTRUCTION|TENDER|INFORMATION|REVIEW|APPROVAL)\b/.test(upper) ||
        /^(CONSTRUCTION|TENDER|APPROVAL|DRAFT)\s+ISSUE$/.test(upper) ||
        /^[A-Z]\d+CONSTRUCTION\s+ISSUE$/.test(upper)
    );
}

function parseRevisionToken(line: string): string | null {
    const cleaned = cleanPdfTextLine(line);
    const explicitRevMatch = cleaned.match(/^Rev\.?\s+([A-Z]\d*|\d+)\b/i);
    if (explicitRevMatch) {
        return explicitRevMatch[1].toUpperCase();
    }

    const compact = cleaned.replace(/\s+/g, '');

    for (const revPattern of REVISION_PATTERNS) {
        const match = compact.match(revPattern);
        if (match) {
            return (match[1] || match[0]).toUpperCase();
        }
    }

    return null;
}

function isNonTitleCandidate(line: string, drawingNumber?: string | null, revision?: string | null): boolean {
    const upper = line.toUpperCase();
    const id = normaliseIdentifier(line);

    if (!line || line.length < 5 || line.length > 140) return true;
    if (isTitleBlockLabelLine(line)) return true;
    if (drawingNumber && id === normaliseIdentifier(drawingNumber)) return true;
    if (revision && id === normaliseIdentifier(revision)) return true;
    if (DRAWING_NUMBER_PATTERNS.some(pattern => pattern.test(line))) return true;
    if (REVISION_PATTERNS.some(pattern => pattern.test(line))) return true;
    if (isIssueStatusLine(line)) return true;
    if (/^\d+:\d+$/.test(line)) return true;
    if (/^\(?A\d\)?$/i.test(line)) return true;
    if (/^NORTH$/i.test(line)) return true;
    if (/^Rev\.?\s*Description\.?\s*Initial\.?\s*Date\.?$/i.test(line)) return true;
    if (/^\d{1,2}\/\d{1,2}\/\d{2,4}/.test(line)) return true;
    if (/\b(PH|FAX|A\.?B\.?N|A\.?C\.?N|EMAIL|WWW)\b/i.test(line)) return true;
    if (/@/.test(line)) return true;
    if (/^(PROJECT|ARCHITECT|CLIENT|SERVICE|SERVICES|DRAWING NUMBER|COORDINATED REFERENCE DRAWINGS)$/i.test(line)) return true;

    const letterCount = (upper.match(/[A-Z]/g) || []).length;
    return letterCount < 4;
}

function isLikelyDrawingTitle(line: string, drawingNumber?: string | null, revision?: string | null): boolean {
    if (isNonTitleCandidate(line, drawingNumber, revision)) return false;

    // Prefer drawing-like nouns, but allow concise discipline titles that may not
    // include one of these terms.
    if (hasDrawingTitleKeyword(line)) {
        return true;
    }

    return /^[A-Z0-9][A-Z0-9 &/().,'-]+$/i.test(line);
}

function hasDrawingTitleKeyword(line: string): boolean {
    return /\b(PLAN|DETAIL|SECTION|ELEVATION|SCHEDULE|LAYOUT|SERVICES|SCHEMATIC|SCHEMATICS|LEGEND|NOTES|HYDRAULIC|MECHANICAL|ELECTRICAL|STRUCTURAL|ARCHITECTURAL|CIVIL|FLOOR|ROOF|BASEMENT|LEVEL|COVER|SHEET|LIGHTING|POWER|COMMS)\b/i.test(line);
}

const COMPACT_TITLE_START_TOKENS = [
    'MECHANICALSERVICES',
    'HYDRAULICSERVICES',
    'ELECTRICALSERVICES',
    'STRUCTURALSERVICES',
    'ARCHITECTURALSERVICES',
    'FIRESERVICES',
    'STORMWATER',
    'BASEMENT',
    'GROUND',
    'LEVEL',
    'ROOF',
    'COVER',
    'DETAIL',
    'SEWER',
    'WATER',
    'GAS',
];

const COMPACT_TITLE_WORDS = [
    'ARCHITECTURAL',
    'ELECTRICAL',
    'MECHANICAL',
    'STRUCTURAL',
    'HYDRAULIC',
    'COMMUNICATION',
    'COMMUNICATIONS',
    'STORMWATER',
    'SERVICES',
    'SERVICE',
    'BASEMENT',
    'GROUND',
    'CARPARK',
    'SCHEMATICS',
    'SCHEMATIC',
    'EQUIPMENT',
    'SCHEDULE',
    'DETAILS',
    'DETAIL',
    'COVER',
    'SHEET',
    'LEGEND',
    'LEVEL',
    'ROOF',
    'FLOOR',
    'PLAN',
    'SEWER',
    'WATER',
    'FIRE',
    'GAS',
];

function splitCompactDrawingTitle(compactTitle: string): string | null {
    const words: string[] = [];
    let remaining = compactTitle;

    while (remaining.length > 0) {
        const numberMatch = remaining.match(/^\d+/);
        if (numberMatch) {
            words.push(numberMatch[0]);
            remaining = remaining.slice(numberMatch[0].length);
            continue;
        }

        const word = COMPACT_TITLE_WORDS.find(candidate => remaining.startsWith(candidate));
        if (!word) break;

        words.push(word);
        remaining = remaining.slice(word.length);
    }

    if (words.length < 2) return null;

    return words.join(' ');
}

function extractDrawingTitleFromCompactedText(
    lines: string[],
    drawingNumber: string,
): string | null {
    const compactText = compactLinesText(lines);
    const targetNumber = normaliseIdentifier(drawingNumber);
    const numberIndex = compactText.indexOf(targetNumber);

    if (numberIndex < 0) return null;

    const titleBlockPrefix = compactText.slice(Math.max(0, numberIndex - 140), numberIndex);
    const startIndex = COMPACT_TITLE_START_TOKENS
        .map(token => titleBlockPrefix.lastIndexOf(token))
        .find(index => index >= 0);

    if (startIndex === undefined) return null;

    const compactTitle = titleBlockPrefix.slice(startIndex);
    if (compactTitle.length < 8 || compactTitle.length > 80) return null;

    return splitCompactDrawingTitle(compactTitle);
}

function isPrecedingTitleMetadata(line: string): boolean {
    const id = normaliseIdentifier(line);

    return (
        /^\d{4,6}$/.test(id) ||
        /\b(NTS|MAY|JAN|FEB|MAR|APR|JUN|JUL|AUG|SEP|OCT|NOV|DEC)\b/i.test(line) ||
        /^[A-Z](\.[A-Z])+/.test(line)
    );
}

function extractDrawingTitleFromPrecedingLines(
    lines: string[],
    drawingNumber: string,
    revision?: string | null
): string | null {
    const targetNumber = normaliseIdentifier(drawingNumber);

    for (let i = 0; i < lines.length; i++) {
        if (normaliseIdentifier(lines[i]) !== targetNumber) continue;

        const titleLines: string[] = [];

        for (let j = i - 1; j >= Math.max(0, i - 14); j--) {
            const line = lines[j];

            if (isPrecedingTitleMetadata(line)) continue;

            if (!isNonTitleCandidate(line, drawingNumber, revision) && hasDrawingTitleKeyword(line)) {
                titleLines.unshift(line);
                continue;
            }

            if (titleLines.length > 0) break;
        }

        if (titleLines.length > 0) {
            return titleLines.join(' ');
        }
    }

    return null;
}

/**
 * Extract a drawing title from locally parsed PDF text.
 *
 * Some PDFs expose title-block text in a visual-order sequence rather than
 * directly after the "Drawing Title" label. In those cases the most reliable
 * local cue is the title-block cluster: scale -> drawing number -> revision ->
 * issue status -> drawing title.
 */
export function extractDrawingTitleFromText(
    documentText: string,
    drawingNumber?: string | null,
    revision?: string | null
): string | null {
    const lines = normaliseTextLines(documentText);
    if (lines.length === 0) return null;
    const titleLabelFound = hasDrawingTitleLabel(lines);

    for (let i = 0; i < lines.length; i++) {
        const inlineMatch = lines[i].match(/^(Drawing|Sheet)\s+Title\s*:?\s*(.+)$/i);
        if (inlineMatch?.[1]) {
            const candidate = cleanPdfTextLine(inlineMatch[2]);
            if (isLikelyDrawingTitle(candidate, drawingNumber, revision)) {
                return candidate;
            }
        }
    }

    if (!drawingNumber) {
        return null;
    }
    if (!titleLabelFound) return null;

    const precedingTitle = extractDrawingTitleFromPrecedingLines(lines, drawingNumber, revision);
    if (precedingTitle) return precedingTitle;

    const compactedTitle = extractDrawingTitleFromCompactedText(lines, drawingNumber);
    if (compactedTitle) return compactedTitle;

    const targetNumber = normaliseIdentifier(drawingNumber);
    const targetRevision = revision ? normaliseIdentifier(revision) : null;

    for (let i = 0; i < lines.length; i++) {
        const lineId = normaliseIdentifier(lines[i]);
        if (!lineId.includes(targetNumber)) continue;

        for (let j = i + 1; j < Math.min(lines.length, i + 12); j++) {
            const candidateId = normaliseIdentifier(lines[j]);
            if (targetRevision && candidateId === targetRevision) continue;
            if (isIssueStatusLine(lines[j])) continue;
            if (isTitleBlockLabelLine(lines[j])) continue;
            if (isLikelyDrawingTitle(lines[j], drawingNumber, revision)) {
                return lines[j];
            }
        }
    }

    for (let i = 0; i < lines.length; i++) {
        if (!/^(Drawing|Sheet)\s+Title\s*:?$/i.test(lines[i])) continue;

        for (let j = i + 1; j < Math.min(lines.length, i + 8); j++) {
            if (isTitleBlockLabelLine(lines[j])) continue;
            if (isLikelyDrawingTitle(lines[j], drawingNumber, revision)) {
                return lines[j];
            }
        }
    }

    return null;
}

export function extractDrawingNumberFromText(documentText: string): string | null {
    const lines = normaliseTextLines(documentText);

    for (const line of lines) {
        if (isKnownDrawingNumberPattern(line)) {
            return line.toUpperCase();
        }
    }

    return null;
}

export function extractDrawingRevisionFromText(
    documentText: string,
    drawingNumber?: string | null
): string | null {
    if (!drawingNumber) return null;

    const lines = normaliseTextLines(documentText);
    const targetNumber = normaliseIdentifier(drawingNumber);

    for (let i = 0; i < lines.length; i++) {
        if (normaliseIdentifier(lines[i]) !== targetNumber) continue;

        const beforeLines = lines.slice(Math.max(0, i - 14), i).reverse();
        const afterLines = lines.slice(i + 1, Math.min(lines.length, i + 8));
        const nearbyLines = [...afterLines, ...beforeLines];

        for (const line of nearbyLines) {
            if (!/^Rev\.?\s+/i.test(line)) continue;

            const revision = parseRevisionToken(line);
            if (revision) return revision;
        }

        for (const line of [...beforeLines, ...afterLines]) {
            if (/^NORTH$/i.test(line) || isTitleBlockLabelLine(line)) continue;

            const revision = parseRevisionToken(line);
            if (revision && !/^\d{1,2}$/.test(revision)) return revision;
        }

        for (const line of afterLines.slice(0, 3)) {
            if (/^NORTH$/i.test(line) || isTitleBlockLabelLine(line)) continue;

            const revision = parseRevisionToken(line);
            if (revision) return revision;
        }
    }

    for (const line of lines.slice(0, 80)) {
        if (!/^Rev\.?\s+/i.test(line)) continue;

        const revision = parseRevisionToken(line);
        if (revision) return revision;
    }

    return null;
}

// ============================================================================
// FILENAME EXTRACTION (FALLBACK)
// ============================================================================

/**
 * Pattern to detect revision suffix attached to drawing number
 * e.g., LT01[B] -> drawing: LT01, revision: B
 */
const ATTACHED_REVISION_PATTERN = /^(.+?)(\[([A-Z]\d*|\d{1,2})\]|\(([A-Z]\d*|\d{1,2})\))$/i;

function isFilenameSeparatorToken(part: string): boolean {
    return /^[-–—]+$/.test(part);
}

function buildFilenameDrawingName(parts: string[]): string | null {
    const cleanParts = [...parts];

    while (cleanParts.length > 0 && isFilenameSeparatorToken(cleanParts[0])) {
        cleanParts.shift();
    }
    while (cleanParts.length > 0 && isFilenameSeparatorToken(cleanParts[cleanParts.length - 1])) {
        cleanParts.pop();
    }

    if (cleanParts.length === 0) return null;

    let name = '';
    for (const part of cleanParts) {
        if (isFilenameSeparatorToken(part)) {
            if (name && !name.endsWith(' - ')) {
                name += ' - ';
            }
        } else {
            if (name && !name.endsWith(' - ')) {
                name += ' ';
            }
            name += part;
        }
    }

    return name.trim().replace(/\s+-\s+$/g, '') || null;
}

interface FilenameRegisterNumber {
    drawingNumber: string;
    prefix: string;
    number: string;
}

function extractRegisterNumberFromBaseName(baseName: string): FilenameRegisterNumber | null {
    const match = baseName.match(/^(?:\d{4,6}[\s_-]+)?([A-Z]{2,4})[\s_-]+(\d{1,3}(?:\.\d{1,3}){1,3}[A-Z]?)\b/i);
    if (!match) return null;

    const prefix = match[1].toUpperCase();
    const number = match[2];

    return {
        drawingNumber: `${prefix} ${number}`,
        prefix,
        number,
    };
}

function normaliseFilenameNumberPart(value: string): string {
    return value.toUpperCase().replace(/[^A-Z0-9.]/g, '');
}

function findRegisterNumberTokenSpan(
    parts: string[],
    registerNumber: FilenameRegisterNumber | null
): { start: number; end: number } | null {
    if (!registerNumber) return null;

    const prefix = normaliseFilenameNumberPart(registerNumber.prefix);
    const number = normaliseFilenameNumberPart(registerNumber.number);

    for (let index = 0; index < parts.length; index++) {
        const current = normaliseFilenameNumberPart(parts[index]);
        const next = parts[index + 1] ? normaliseFilenameNumberPart(parts[index + 1]) : null;

        if (current === prefix && next === number) {
            return { start: index, end: index + 1 };
        }

        if (current === `${prefix}${number}`) {
            return { start: index, end: index };
        }
    }

    return null;
}

function extractBracketedRevisionPart(part: string): string | null {
    if (!/^(\[[A-Z]\d*\]|\[\d{1,2}\]|\([A-Z]\d*\)|\(\d{1,2}\))$/i.test(part)) {
        return null;
    }

    return parseRevisionToken(part);
}

function findBracketedRevisionPart(parts: string[]): { index: number; revision: string } | null {
    for (let index = parts.length - 1; index >= 0; index--) {
        const revision = extractBracketedRevisionPart(parts[index]);
        if (revision) return { index, revision };
    }

    return null;
}

/**
 * Extract drawing number from filename as fallback
 */
export function extractFromFilename(filename: string): DrawingExtractionResult | null {
    // Remove extension
    let baseName = filename.replace(/\.[^/.]+$/, '');

    let drawingNumber: string | null = null;
    let revision: string | null = null;
    let drawingName: string | null = null;
    let revisionPartIndex: number | null = null;

    const shortFilenameMatch = baseName.match(/^([ASMEPL]\d{2,4})(?:[-~]|$)/i);
    if (shortFilenameMatch) {
        drawingNumber = shortFilenameMatch[1].toUpperCase();
    }

    // Extract explicit -(NN) revision suffix from end of filename FIRST
    // Pattern: "15123_S0012_Shoring_Details Sht 1-(04)" → revision "04"
    // This is a very common and highly reliable construction document naming convention
    const explicitRevMatch = baseName.match(/-\((\d{1,2})\)$/);
    if (explicitRevMatch) {
        revision = explicitRevMatch[1];
        // Strip from baseName so it doesn't interfere with other parsing
        baseName = baseName.replace(/-\((\d{1,2})\)$/, '');
        console.log(`[drawing-extraction] Extracted explicit filename revision: ${revision}`);
    }

    const registerNumber = extractRegisterNumberFromBaseName(baseName);
    if (!drawingNumber && registerNumber) {
        drawingNumber = registerNumber.drawingNumber;
    }

    // First pass: Find hyphenated drawing numbers directly in the filename
    // Patterns like CC-01, CC-11, AR-101, SK-001, etc.
    // Must check the full string BEFORE splitting (which would destroy hyphenated patterns)
    if (!drawingNumber) {
        for (const pattern of DRAWING_NUMBER_PATTERNS) {
            const match = baseName.match(new RegExp(pattern.source, 'gi'));
            if (match) {
                drawingNumber = match[0].toUpperCase();
                break;
            }
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

    // Only look for revision in parts if we didn't find an explicit -(NN) revision
    if (!revision) {
        const bracketedRevision = findBracketedRevisionPart(parts);
        if (bracketedRevision) {
            revision = bracketedRevision.revision;
            revisionPartIndex = bracketedRevision.index;
        }
    }

    if (!revision) {
        // Check for single letter revision at end FIRST (most common convention)
        // e.g., "1115 CC-11 LEVEL 08 E.pdf" -> revision "E"
        if (parts.length > 0) {
            const lastPart = parts[parts.length - 1];
            if (/^[A-Z]$/i.test(lastPart)) {
                revision = lastPart.toUpperCase();
                revisionPartIndex = parts.length - 1;
            }
        }

        // If no single letter at end, only treat the final token as a revision.
        // Tokens like "C1" can be a level name in "LEVEL C1 CARPARK PLAN".
        if (!revision) {
            const lastPart = parts[parts.length - 1];
            for (const revPattern of REVISION_PATTERNS) {
                const match = lastPart.match(revPattern);
                if (match) {
                    revision = match[1] || match[0];
                    revisionPartIndex = parts.length - 1;
                    break;
                }
            }
        }
    }

    // Extract drawing name from parts between drawing number and revision
    if (drawingNumber) {
        const registerNumberSpan = findRegisterNumberTokenSpan(parts, registerNumber);
        const drawingNumIndex = parts.findIndex(p =>
            p.toUpperCase() === drawingNumber ||
            p.toUpperCase().includes(drawingNumber!)
        );
        const nameStartIndex = registerNumberSpan
            ? registerNumberSpan.end + 1
            : drawingNumIndex + 1;

        if ((registerNumberSpan || drawingNumIndex >= 0) && nameStartIndex < parts.length) {
            const nameParts = parts
                .slice(nameStartIndex)
                .filter((_, offset) => nameStartIndex + offset !== revisionPartIndex);
            if (nameParts.length > 0) {
                drawingName = buildFilenameDrawingName(nameParts);
            }
        }
    }

    if (!drawingNumber) {
        return null;
    }

    // Higher confidence when we have both a recognized drawing number pattern and a clean revision
    const hasStrongPattern = isKnownDrawingNumberPattern(drawingNumber);
    const hasNumericRevision = revision !== null && /^\d+$/.test(revision);
    const hasCleanRevision = revision !== null && /^[A-Z]\d*$/i.test(revision);
    const confidence = hasStrongPattern && hasNumericRevision ? 90
        : hasStrongPattern && hasCleanRevision ? 85
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

    // Step 1: Always extract from filename first (free, fast)
    const filenameResult = extractFromFilename(filename);
    console.log(`[drawing-extraction] Filename extraction: ${filenameResult?.drawingNumber || 'none'}, rev: ${filenameResult?.drawingRevision || 'none'}`);

    // Step 2: Check if filename indicates this is NOT a drawing (skip API calls entirely),
    // but keep document-control metadata that was explicitly encoded in the filename.
    if (isNonDrawingFilename(filename)) {
        console.log(`[drawing-extraction] Skipping non-drawing file (filename pattern): ${filename}`);
        if (filenameResult) {
            return filenameResult;
        }

        return {
            drawingNumber: null,
            drawingName: null,
            drawingRevision: null,
            confidence: 90,  // High confidence it's not a drawing
            source: 'FILENAME',
        };
    }

    // Step 3: For PDFs, use VISION-FIRST approach (single API call, no polling)
    // This is much faster than LlamaParse which requires upload + polling + download
    if (mimeType === 'application/pdf') {
        console.log(`[drawing-extraction] Using fast vision extraction for: ${filename}`);

        try {
            const visionResult = await extractWithVision(fileBuffer, filename, mimeType);

            // Merge vision with filename result
            const merged = mergeExtractionResults(visionResult, filenameResult);
            const enriched = await enrichMissingDrawingNameFromLocalText(merged, fileBuffer, filename, mimeType);
            console.log(`[drawing-extraction] Fast result for ${filename}: ${enriched.drawingNumber || 'none'}, rev: ${enriched.drawingRevision || 'none'} (confidence: ${enriched.confidence}, source: ${enriched.source})`);

            return enriched;
        } catch (visionError) {
            console.error('[drawing-extraction] Vision extraction failed, falling back to text:', visionError);
            // Fall through to text-based extraction
        }
    }

    // Step 4: Text-based extraction (for non-PDFs or if vision failed)
    let aiResult: DrawingExtractionResult | null = null;

    try {
        console.log(`[drawing-extraction] Parsing document (text mode): ${filename}`);
        const parsed = await parseDocument(fileBuffer, filename);
        const documentText = parsed.content;

        // Only call AI if we have meaningful text content
        if (documentText && documentText.trim().length >= 50) {
            console.log(`[drawing-extraction] Calling AI for: ${filename}`);
            const prompt = buildExtractionPrompt(documentText, filename);

            const result = await aiComplete({
                featureGroup: 'extraction',
                maxTokens: 500,
                messages: [{ role: 'user', content: prompt }],
            });

            if (result.text) {
                aiResult = parseAIResponse(result.text);
                console.log(`[drawing-extraction] AI result (${result.provider}/${result.modelId}): ${aiResult.drawingNumber || 'none'} (confidence: ${aiResult.confidence})`);
            }
        } else {
            console.log('[drawing-extraction] No/minimal text extracted, using filename only');
        }
    } catch (error) {
        console.error('[drawing-extraction] Text extraction/AI failed:', error);
    }

    // Step 5: Merge results
    const merged = aiResult
        ? mergeExtractionResults(aiResult, filenameResult)
        : (filenameResult || createEmptyResult('FILENAME'));
    const enriched = await enrichMissingDrawingNameFromLocalText(merged, fileBuffer, filename, mimeType);

    console.log(`[drawing-extraction] Final result for ${filename}: ${enriched.drawingNumber || 'none'}, rev: ${enriched.drawingRevision || 'none'} (confidence: ${enriched.confidence}, source: ${enriched.source})`);

    return enriched;
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

3. REVISION: Extract the revision from the document content, specifically from the title block area.
   - Revisions are typically NUMERIC INTEGERS: 01, 02, 03, 04, 05 (sometimes without leading zero: 1, 2, 3).
   - They can also be letters (A, B, C) or prefixed (P01, R1, Rev 2) - extract whatever is shown.
   - If a revision table/history exists, extract the LATEST (highest/most recent) revision number.
   - Do NOT use issue statuses (RG, IFC, FC) as revisions.

Respond in this exact JSON format:
{
  "isDrawing": true or false,
  "drawingNumber": "A-101" or null,
  "drawingName": "Floor Plan Level 1" or null,
  "drawingRevision": "05" or null,
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

async function extractLocalDocumentText(
    fileBuffer: Buffer,
    filename: string,
    mimeType: string
): Promise<string | null> {
    const ext = filename.toLowerCase().split('.').pop() || '';
    const isPdf = mimeType === 'application/pdf' || ext === 'pdf';

    if (isPdf) {
        const { default: pdf } = await import('pdf-parse');
        const result = await pdf(fileBuffer);
        return result.text || null;
    }

    if (mimeType.startsWith('text/') || ['txt', 'md', 'csv'].includes(ext)) {
        return fileBuffer.toString('utf-8');
    }

    return null;
}

async function enrichMissingDrawingNameFromLocalText(
    result: DrawingExtractionResult,
    fileBuffer: Buffer,
    filename: string,
    mimeType: string
): Promise<DrawingExtractionResult> {
    // Respect a confident AI/VISION "not a drawing" verdict. Without this guard,
    // a null drawingNumber falls through to extractDrawingNumberFromText() below,
    // which scans raw PDF text and synthesizes a drawing number from any token
    // matching the regex — producing hallucinated entries for reports, planning
    // documents, etc.
    if (
        (result.source === 'AI' || result.source === 'VISION') &&
        result.drawingNumber === null &&
        result.confidence >= 70
    ) {
        return result;
    }

    const existingNameLooksLikeRevision = result.drawingName
        ? parseRevisionToken(result.drawingName) !== null
        : false;

    try {
        const localText = await extractLocalDocumentText(fileBuffer, filename, mimeType);
        if (!localText) return result;

        if (result.source === 'FILENAME' && isClearlyNonDrawingText(localText)) {
            console.log(`[drawing-extraction] Local text classified as non-drawing: ${filename}`);
            return {
                drawingNumber: null,
                drawingName: null,
                drawingRevision: null,
                confidence: 90,
                source: 'TEXT',
            };
        }

        const drawingNumber = result.drawingNumber || extractDrawingNumberFromText(localText);
        if (!drawingNumber) return result;

        const drawingName = extractDrawingTitleFromText(
            localText,
            drawingNumber,
            result.drawingRevision
        );
        const drawingRevision = extractDrawingRevisionFromText(
            localText,
            drawingNumber
        ) || result.drawingRevision;

        const shouldReplaceDrawingName =
            !result.drawingName ||
            existingNameLooksLikeRevision ||
            (drawingName !== null && hasDrawingTitleKeyword(drawingName));

        const nextDrawingName = shouldReplaceDrawingName
            ? drawingName || (existingNameLooksLikeRevision ? null : result.drawingName)
            : result.drawingName;

        if (
            drawingNumber === result.drawingNumber &&
            nextDrawingName === result.drawingName &&
            drawingRevision === result.drawingRevision
        ) {
            return result;
        }

        if (drawingName && shouldReplaceDrawingName && drawingName !== result.drawingName) {
            console.log(`[drawing-extraction] Local title-block fallback: ${filename} -> "${drawingName}"`);
        }

        return {
            ...result,
            drawingNumber,
            drawingName: nextDrawingName,
            drawingRevision,
            confidence: Math.max(result.confidence, 88),
            source: result.source === 'FILENAME' ? 'TEXT' : result.source,
        };
    } catch (error) {
        console.warn(`[drawing-extraction] Local title-block fallback failed for ${filename}:`, error);
        return result;
    }
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
  - A = revision letter (but the title block revision is more authoritative)

The drawing number in the filename (e.g., CC-46, CC-08, H-101) is almost always correct.
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
3. REVISION: Extract the revision from the TITLE BLOCK of the drawing, NOT from the filename.
   - Look for the revision in the title block area (usually bottom-right corner).
   - Common locations: revision triangle, revision box, revision table, or "REV" field in the title block.
   - Revisions are typically NUMERIC INTEGERS: 01, 02, 03, 04, 05, etc. (sometimes without leading zero: 1, 2, 3).
   - They can also be letters (A, B, C) or prefixed (P01, R1, Rev 2) - extract whatever is shown.
   - If a revision table/history exists, extract the LATEST (highest/most recent) revision number.
   - Do NOT use issue statuses like RG (Regulatory), IFC (Issued for Construction), FC (For Construction) as revisions.
   - Do NOT use the filename letter as the revision - always read it from the title block.

Respond in this exact JSON format:
{
  "isDrawing": true or false,
  "drawingNumber": "CC-46" or null,
  "drawingName": "Wet Areas - Sheet 1" or null,
  "drawingRevision": "05" or null,
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
    const { provider, modelId } = await getProviderAndModelFor('extraction');

    // Vision-mode uses Anthropic's native PDF `document` content block. Non-Anthropic
    // providers don't have an equivalent surface, so we skip vision and let the caller
    // fall through to text-mode (parseDocument → aiComplete).
    if (provider !== 'anthropic') {
        throw new Error(`Vision extraction unavailable for provider "${provider}" — falling through to text-mode`);
    }

    console.log(`[drawing-extraction] Vision fallback for: ${filename} (${modelId})`);
    const anthropic = new Anthropic();

    // Determine media type for the document
    const mediaType = mimeType === 'application/pdf' ? 'application/pdf' : 'application/pdf';

    const message = await anthropic.messages.create({
        model: modelId,
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
 * - Revision priority:
 *   1. Filename NUMERIC revision (from -(NN) pattern) - highest reliability, always wins
 *   2. AI/Vision revision - reads from title block, generally reliable
 *   3. Filename letter revision - fallback only (single letter at end of filename)
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

    // Filename numeric revision (from -(NN) suffix) is the most reliable source
    // These are explicitly encoded in the filename by document control systems
    const filenameHasNumericRevision = filenameResult.drawingRevision &&
        /^\d+$/.test(filenameResult.drawingRevision);

    // Determine best revision:
    // 1. Filename numeric (-(NN) pattern) always wins - most reliable
    // 2. AI/Vision result - reads from title block
    // 3. Filename letter/other - fallback
    let bestRevision: string | null;
    if (filenameHasNumericRevision) {
        bestRevision = filenameResult.drawingRevision;
    } else {
        bestRevision = primaryResult.drawingRevision || filenameResult.drawingRevision;
    }

    const merged: DrawingExtractionResult = {
        // Drawing number: prefer filename when it has a recognized pattern
        drawingNumber: filenameHasStrongDrawingNumber
            ? filenameResult.drawingNumber
            : (primaryResult.drawingNumber || filenameResult.drawingNumber),
        // Drawing name: prefer AI (reads full descriptive title from title block)
        drawingName: primaryResult.drawingName || filenameResult.drawingName,
        // Revision: use priority logic above
        drawingRevision: bestRevision,
        confidence: primaryResult.confidence,
        source: primaryResult.source,
    };

    // Log when filename overrides AI
    if (filenameHasStrongDrawingNumber && primaryResult.drawingNumber &&
        primaryResult.drawingNumber !== filenameResult.drawingNumber) {
        console.log(`[drawing-extraction] Filename drawing number override: AI="${primaryResult.drawingNumber}" -> Filename="${filenameResult.drawingNumber}"`);
    }
    if (filenameHasNumericRevision && primaryResult.drawingRevision &&
        primaryResult.drawingRevision !== filenameResult.drawingRevision) {
        console.log(`[drawing-extraction] Filename numeric revision override: AI="${primaryResult.drawingRevision}" -> Filename="${filenameResult.drawingRevision}"`);
    }

    // Boost confidence when filename corroborates AI results
    if (filenameHasStrongDrawingNumber || filenameHasNumericRevision) {
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
