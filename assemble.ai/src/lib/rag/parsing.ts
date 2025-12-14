/**
 * T014: Document Parsing Module
 * LlamaParse (primary) + Unstructured (fallback) + pdf-parse (local fallback)
 */

export interface ParsedDocument {
    content: string;
    metadata: {
        pageCount?: number;
        title?: string;
        parser: 'llamaparse' | 'unstructured' | 'pdf-parse' | 'text';
    };
}

/**
 * Parse document using LlamaParse (primary)
 */
async function parseWithLlamaParse(
    fileBuffer: Buffer,
    filename: string
): Promise<ParsedDocument> {
    const apiKey = process.env.LLAMA_CLOUD_API_KEY;
    if (!apiKey) {
        throw new Error('LLAMA_CLOUD_API_KEY environment variable is required');
    }

    // Create form data for file upload
    const formData = new FormData();
    formData.append('file', new Blob([fileBuffer]), filename);

    // Upload file to LlamaParse
    const uploadResponse = await fetch('https://api.cloud.llamaindex.ai/api/parsing/upload', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${apiKey}`,
        },
        body: formData,
    });

    if (!uploadResponse.ok) {
        const error = await uploadResponse.text();
        throw new Error(`LlamaParse upload error: ${uploadResponse.status} - ${error}`);
    }

    const uploadData = await uploadResponse.json();
    const jobId = uploadData.id;

    // Poll for completion
    let result = null;
    const maxAttempts = 60; // 5 minutes with 5-second intervals

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
        await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds

        const statusResponse = await fetch(
            `https://api.cloud.llamaindex.ai/api/parsing/job/${jobId}`,
            {
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                },
            }
        );

        if (!statusResponse.ok) {
            continue;
        }

        const statusData = await statusResponse.json();

        if (statusData.status === 'SUCCESS') {
            result = statusData;
            break;
        } else if (statusData.status === 'ERROR') {
            throw new Error(`LlamaParse job failed: ${statusData.error || 'Unknown error'}`);
        }
        // Continue polling if PENDING
    }

    if (!result) {
        throw new Error('LlamaParse job timed out');
    }

    // Get the parsed result as markdown
    const resultResponse = await fetch(
        `https://api.cloud.llamaindex.ai/api/parsing/job/${jobId}/result/markdown`,
        {
            headers: {
                'Authorization': `Bearer ${apiKey}`,
            },
        }
    );

    if (!resultResponse.ok) {
        const error = await resultResponse.text();
        throw new Error(`LlamaParse result error: ${resultResponse.status} - ${error}`);
    }

    const markdownContent = await resultResponse.text();

    return {
        content: markdownContent,
        metadata: {
            pageCount: result.num_pages,
            title: filename,
            parser: 'llamaparse',
        },
    };
}

/**
 * Parse document using Unstructured (fallback)
 */
async function parseWithUnstructured(
    fileBuffer: Buffer,
    filename: string
): Promise<ParsedDocument> {
    const apiKey = process.env.UNSTRUCTURED_API_KEY;
    if (!apiKey) {
        throw new Error('UNSTRUCTURED_API_KEY environment variable is required');
    }

    const formData = new FormData();
    formData.append('files', new Blob([fileBuffer]), filename);

    const response = await fetch('https://api.unstructured.io/general/v0/general', {
        method: 'POST',
        headers: {
            'unstructured-api-key': apiKey,
        },
        body: formData,
    });

    if (!response.ok) {
        const error = await response.text();
        throw new Error(`Unstructured API error: ${response.status} - ${error}`);
    }

    const elements = await response.json();

    // Convert elements to markdown
    const markdownParts: string[] = [];

    for (const element of elements) {
        const text = element.text || '';
        const type = element.type || 'NarrativeText';

        switch (type) {
            case 'Title':
                markdownParts.push(`# ${text}\n`);
                break;
            case 'Header':
                markdownParts.push(`## ${text}\n`);
                break;
            case 'ListItem':
                markdownParts.push(`- ${text}\n`);
                break;
            case 'Table':
                markdownParts.push(`\n${text}\n`);
                break;
            default:
                markdownParts.push(`${text}\n\n`);
        }
    }

    return {
        content: markdownParts.join(''),
        metadata: {
            title: filename,
            parser: 'unstructured',
        },
    };
}

/**
 * Parse PDF locally using pdf-parse (no API required)
 */
async function parseWithPdfParse(
    fileBuffer: Buffer,
    filename: string
): Promise<ParsedDocument> {
    // Use require for pdf-parse as it's a CommonJS module
    const pdf = require('pdf-parse');

    console.log(`[parsing] pdf-parse: parsing ${filename}, buffer size: ${fileBuffer.length} bytes`);

    const result = await pdf(fileBuffer);

    console.log(`[parsing] pdf-parse result: ${result.numpages} pages, ${result.text?.length || 0} chars extracted`);
    if (result.text) {
        console.log(`[parsing] pdf-parse text preview (first 200 chars): ${result.text.substring(0, 200)}`);
    }

    // Warn if no text was extracted
    if (!result.text || result.text.trim().length === 0) {
        console.warn(`[parsing] pdf-parse: No text extracted from ${filename}. The PDF may be scanned/image-based.`);
    }

    return {
        content: result.text || '',
        metadata: {
            pageCount: result.numpages,
            title: result.info?.Title || filename,
            parser: 'pdf-parse',
        },
    };
}

/**
 * Parse text files directly
 */
function parseTextFile(
    fileBuffer: Buffer,
    filename: string
): ParsedDocument {
    return {
        content: fileBuffer.toString('utf-8'),
        metadata: {
            title: filename,
            parser: 'text',
        },
    };
}

/**
 * Parse document with fallback strategy
 * Tries: LlamaParse -> Unstructured -> pdf-parse (local) -> text
 */
export async function parseDocument(
    fileBuffer: Buffer,
    filename: string
): Promise<ParsedDocument> {
    const ext = filename.toLowerCase().split('.').pop() || '';
    const isPdf = ext === 'pdf';
    const isText = ['txt', 'md', 'csv', 'json'].includes(ext);

    // For text files, just read directly
    if (isText) {
        console.log(`[parsing] Parsing text file: ${filename}`);
        return parseTextFile(fileBuffer, filename);
    }

    // Try LlamaParse first (if API key is available)
    if (process.env.LLAMA_CLOUD_API_KEY) {
        try {
            console.log(`[parsing] Attempting LlamaParse for ${filename}`);
            const result = await parseWithLlamaParse(fileBuffer, filename);
            console.log(`[parsing] LlamaParse succeeded for ${filename}`);
            return result;
        } catch (llamaError) {
            console.warn(`[parsing] LlamaParse failed for ${filename}:`, llamaError);
        }
    }

    // Fallback to Unstructured (if API key is available)
    if (process.env.UNSTRUCTURED_API_KEY) {
        try {
            console.log(`[parsing] Attempting Unstructured for ${filename}`);
            const result = await parseWithUnstructured(fileBuffer, filename);
            console.log(`[parsing] Unstructured succeeded for ${filename}`);
            return result;
        } catch (unstructuredError) {
            console.warn(`[parsing] Unstructured failed for ${filename}:`, unstructuredError);
        }
    }

    // Fallback to local pdf-parse for PDFs
    if (isPdf) {
        try {
            console.log(`[parsing] Attempting local pdf-parse for ${filename}`);
            const result = await parseWithPdfParse(fileBuffer, filename);
            console.log(`[parsing] pdf-parse succeeded for ${filename} (${result.metadata.pageCount} pages)`);
            return result;
        } catch (pdfError) {
            console.error(`[parsing] pdf-parse failed for ${filename}:`, pdfError);
            throw new Error(`Failed to parse PDF ${filename}: ${pdfError}`);
        }
    }

    // For other file types without API keys
    throw new Error(`Cannot parse ${filename}: No parser available for .${ext} files (API keys not configured)`);
}
