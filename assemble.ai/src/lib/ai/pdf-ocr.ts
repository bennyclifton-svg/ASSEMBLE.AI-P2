/**
 * PDF text extraction with Tesseract OCR fallback.
 *
 * Stage 1: pdf-parse — extracts the text layer (fast, zero system deps, covers
 *          all digitally-created PDFs).
 * Stage 2: pdftoppm + tesseract.js — renders each PDF page to a 200 DPI PNG
 *          then OCR-reads it. Handles scanned / image-only PDFs.
 *
 * System requirement for stage 2 (production Dockerfile):
 *   RUN apk add --no-cache poppler-utils
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs/promises';
import * as os from 'os';
import * as path from 'path';

const execAsync = promisify(exec);

const MIN_TEXT_CHARS = 50; // below this → treat as "no text layer"

/**
 * Extract text from a PDF buffer.
 *
 * Tries the embedded text layer first; if the PDF is scanned/image-only,
 * falls back to OCR via pdftoppm + tesseract.js.
 *
 * Throws if neither stage can produce text (e.g. poppler not installed in dev).
 */
export async function pdfToText(buffer: Buffer): Promise<string> {
    // Stage 1: text layer
    try {
        // pdf-parse is CommonJS — require() avoids ESM interop issues
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const pdfParse = require('pdf-parse') as (b: Buffer) => Promise<{ text: string }>;
        const result = await pdfParse(buffer);
        if (result.text && result.text.trim().length >= MIN_TEXT_CHARS) {
            return result.text;
        }
    } catch {
        // corrupt PDF or missing module — fall through to OCR
    }

    // Stage 2: OCR
    return runTesseractOcr(buffer);
}

async function runTesseractOcr(buffer: Buffer): Promise<string> {
    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'foundry-ocr-'));
    const pdfPath = path.join(tmpDir, 'input.pdf');
    const pagePrefix = path.join(tmpDir, 'pg');

    try {
        await fs.writeFile(pdfPath, buffer);

        // pdftoppm converts each page to a PNG at 200 DPI.
        // Output files: <pagePrefix>-1.png, <pagePrefix>-2.png, …
        try {
            await execAsync(`pdftoppm -r 200 -png "${pdfPath}" "${pagePrefix}"`);
        } catch (err: any) {
            const msg: string = err?.message ?? '';
            if (err?.code === 127 || /not found|not recognized|cannot find/i.test(msg)) {
                throw new Error(
                    'poppler-utils (pdftoppm) is not installed. ' +
                    'For production, add "apk add --no-cache poppler-utils" to the Dockerfile runner stage. ' +
                    'For scanned PDFs in dev, either install poppler locally or switch document_extraction to Anthropic in Admin → Models.'
                );
            }
            throw new Error(`PDF → image conversion failed: ${msg}`);
        }

        // Collect generated page files in page order
        const allFiles = await fs.readdir(tmpDir);
        const pageFiles = allFiles
            .filter(f => f.startsWith('pg') && f.endsWith('.png'))
            .sort()
            .map(f => path.join(tmpDir, f));

        if (pageFiles.length === 0) {
            throw new Error('pdftoppm produced no output pages — the PDF may be corrupted or empty.');
        }

        // OCR each page image with tesseract.js (pure-JS, no system binary needed)
        const { createWorker } = await import('tesseract.js');
        const worker = await createWorker('eng');
        try {
            const pageTexts: string[] = [];
            for (const pageFile of pageFiles) {
                const { data: { text } } = await worker.recognize(pageFile);
                const trimmed = text.trim();
                if (trimmed) pageTexts.push(trimmed);
            }
            return pageTexts.join('\n\n');
        } finally {
            await worker.terminate();
        }
    } finally {
        // Always clean up temp files
        await fs.rm(tmpDir, { recursive: true, force: true }).catch(() => {});
    }
}
