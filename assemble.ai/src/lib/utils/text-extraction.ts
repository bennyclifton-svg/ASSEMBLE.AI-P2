import Tesseract from 'tesseract.js';
import mammoth from 'mammoth';

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
 * Extract text from a Word document (.docx)
 */
export async function extractTextFromDocx(buffer: Buffer): Promise<string> {
  try {
    const result = await mammoth.extractRawText({ buffer });
    return result.value;
  } catch (error) {
    console.error('DOCX extraction failed:', error);
    throw new Error('Failed to extract text from Word document');
  }
}

/**
 * Extract text from various file types
 */
export async function extractText(file: File): Promise<string> {
  const fileType = file.type;
  const fileName = file.name.toLowerCase();

  if (fileType === 'application/pdf') {
    const buffer = Buffer.from(await file.arrayBuffer());
    return extractTextFromPDF(buffer);
  }

  // Word documents (.docx)
  if (fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      fileName.endsWith('.docx')) {
    const buffer = Buffer.from(await file.arrayBuffer());
    return extractTextFromDocx(buffer);
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
 * Calculate confidence score based on extracted fields (for firm extraction)
 */
export function calculateConfidence(extractedData: any): number {
  const requiredFields = ['companyName', 'email'];
  const optionalFields = ['contactPerson', 'mobile', 'address', 'abn'];

  let score = 0;
  let maxScore = 0;

  // Required fields are worth more
  requiredFields.forEach((field) => {
    maxScore += 50;
    if (extractedData[field] && String(extractedData[field]).trim()) {
      score += 50;
    }
  });

  // Optional fields add extra confidence
  optionalFields.forEach((field) => {
    maxScore += 12.5;
    if (extractedData[field] && String(extractedData[field]).trim()) {
      score += 12.5;
    }
  });

  return Math.round((score / maxScore) * 100);
}

/**
 * Calculate confidence score for project details extraction
 */
export function calculateProjectDetailsConfidence(extractedData: any): number {
  const importantFields = ['projectName', 'address'];
  const optionalFields = ['buildingClass', 'legalAddress', 'zoning', 'jurisdiction', 'lotArea', 'numberOfStories'];

  let score = 0;
  let maxScore = 0;

  // Important fields are worth more
  importantFields.forEach((field) => {
    maxScore += 30;
    if (extractedData[field] && String(extractedData[field]).trim()) {
      score += 30;
    }
  });

  // Optional fields add extra confidence
  optionalFields.forEach((field) => {
    maxScore += 10;
    if (extractedData[field] !== undefined && extractedData[field] !== null && String(extractedData[field]).trim()) {
      score += 10;
    }
  });

  return Math.round((score / maxScore) * 100);
}
