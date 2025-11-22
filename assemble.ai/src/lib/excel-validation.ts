import ExcelJS from 'exceljs';

export async function validateExcelFile(buffer: Buffer): Promise<{ isValid: boolean; error?: string }> {
    try {
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.load(buffer as any);

        if (workbook.worksheets.length === 0) {
            return { isValid: false, error: 'Excel file contains no worksheets.' };
        }

        // Basic FortuneSheet compatibility check:
        // FortuneSheet generally expects standard cell data.
        // We can add more specific checks here if needed, e.g., checking for unsupported features.
        // For now, just being able to parse it is a good first step.

        return { isValid: true };
    } catch (error) {
        console.error('Excel validation error:', error);
        return { isValid: false, error: 'Invalid or corrupted Excel file.' };
    }
}
