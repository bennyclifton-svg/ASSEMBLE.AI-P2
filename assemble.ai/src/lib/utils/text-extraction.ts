import Tesseract from 'tesseract.js';

/**
 * Extract text from an image file using Tesseract OCR
 */
export async function extractTextFromImage(file: File | Buffer): Promise<string> {
  try {
    const result = await Tesseract.recognize(file, 'eng', {
      logger: (m) => console.log(m),
    });
    return result.data.text;
  } catch (error) {
    console.error('OCR extraction failed:', error);
    throw new Error('Failed to extract text from image');
  }
}

/**
 * Extract text from a PDF file
 */
export async function extractTextFromPDF(buffer: Buffer): Promise<string> {
  try {
    // Dynamic import for CommonJS module
    const pdfParse = (await import('pdf-parse')).default;
    const data = await pdfParse(buffer);
    return data.text;
  } catch (error) {
    console.error('PDF extraction failed:', error);
    throw new Error('Failed to extract text from PDF');
  }
}

/**
 * Extract text from various file types
 */
export async function extractText(file: File): Promise<string> {
  const fileType = file.type;

  if (fileType === 'application/pdf') {
    const buffer = Buffer.from(await file.arrayBuffer());
    return extractTextFromPDF(buffer);
  }

  if (fileType.startsWith('image/')) {
    return extractTextFromImage(file);
  }

  // For text files, just read directly
  if (fileType.startsWith('text/')) {
    return await file.text();
  }

  throw new Error(`Unsupported file type: ${fileType}`);
}

/**
 * Calculate confidence score based on extracted fields
 */
export function calculateConfidence(extractedData: any): number {
  const requiredFields = ['companyName', 'email'];
  const optionalFields = ['contactPerson', 'mobile', 'address', 'abn'];

  let score = 0;
  let maxScore = 0;

  // Required fields are worth more
  requiredFields.forEach((field) => {
    maxScore += 50;
    if (extractedData[field] && extractedData[field].trim()) {
      score += 50;
    }
  });

  // Optional fields add extra confidence
  optionalFields.forEach((field) => {
    maxScore += 12.5;
    if (extractedData[field] && extractedData[field].trim()) {
      score += 12.5;
    }
  });

  return Math.round((score / maxScore) * 100);
}
