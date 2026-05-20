import {
    extractDrawingInfo,
    extractDrawingRevisionFromText,
    extractDrawingTitleFromText,
    extractFromFilename,
} from '../drawing-extraction';

const mockMessagesCreate = jest.fn();
const mockPdfParse = jest.fn(async () => ({ text: '' }));
const mockAiComplete = jest.fn();
const mockGetProviderAndModelFor = jest.fn(async () => ({
    provider: 'anthropic' as const,
    modelId: 'claude-haiku-4-5-20251001',
}));

jest.mock('@anthropic-ai/sdk', () => ({
    __esModule: true,
    default: jest.fn().mockImplementation(() => ({
        messages: {
            create: mockMessagesCreate,
        },
    })),
}));

jest.mock('../../ai/client', () => ({
    aiComplete: (...args: unknown[]) => mockAiComplete(...args),
}));

jest.mock('../../ai/registry', () => ({
    getProviderAndModelFor: (...args: unknown[]) => mockGetProviderAndModelFor(...args),
}));

jest.mock('../../rag/parsing', () => ({
    parseDocument: jest.fn(async () => ({ content: '' })),
}));

jest.mock('pdf-parse', () => ({
    __esModule: true,
    default: mockPdfParse,
}));

describe('drawing extraction', () => {
    beforeEach(() => {
        mockMessagesCreate.mockReset();
        mockPdfParse.mockReset();
        mockPdfParse.mockResolvedValue({ text: '' });
        mockAiComplete.mockReset();
        mockGetProviderAndModelFor.mockReset();
        mockGetProviderAndModelFor.mockResolvedValue({
            provider: 'anthropic',
            modelId: 'claude-haiku-4-5-20251001',
        });
    });

    it('extracts filename drawing number and revision without inventing a title', () => {
        expect(extractFromFilename('H-108 [C].pdf')).toMatchObject({
            drawingNumber: 'H-108',
            drawingName: null,
            drawingRevision: 'C',
            confidence: 85,
            source: 'FILENAME',
        });
    });

    it('treats tender issue suffixes as revisions rather than drawing names', () => {
        expect(extractFromFilename('11049  E011 T1.pdf')).toMatchObject({
            drawingNumber: 'E011',
            drawingName: null,
            drawingRevision: 'T1',
            source: 'FILENAME',
        });
    });

    it('extracts prefixed discipline drawing numbers from architectural filenames', () => {
        expect(extractFromFilename('CC-A-102 GA LEVEL L1 PLAN.pdf')).toMatchObject({
            drawingNumber: 'CC-A-102',
            drawingName: 'GA LEVEL L1 PLAN',
            drawingRevision: null,
            source: 'FILENAME',
        });

        expect(extractFromFilename('CC-A-101 GA LEVEL L0 (GROUND) PLAN.pdf')).toMatchObject({
            drawingNumber: 'CC-A-101',
            drawingName: 'GA LEVEL L0 (GROUND) PLAN',
            drawingRevision: null,
            source: 'FILENAME',
        });

        expect(extractFromFilename('CC-A-100 GA LEVEL C1 CARPARK PLAN.pdf')).toMatchObject({
            drawingNumber: 'CC-A-100',
            drawingName: 'GA LEVEL C1 CARPARK PLAN',
            drawingRevision: null,
            source: 'FILENAME',
        });
    });

    it('extracts bracketed construction revisions without leaking separators into filename titles', () => {
        expect(extractFromFilename('E03 - ELECTRICAL - LEVEL L1 - LIGHTING LAYOUT - [C1].pdf')).toMatchObject({
            drawingNumber: 'E03',
            drawingName: 'ELECTRICAL - LEVEL L1 - LIGHTING LAYOUT',
            drawingRevision: 'C1',
            source: 'FILENAME',
        });
    });

    it('extracts document register numbers from spaced decimal filenames', () => {
        expect(extractFromFilename('CC 02.3 Site & Sediment Control Plan [E].pdf')).toMatchObject({
            drawingNumber: 'CC 02.3',
            drawingName: 'Site & Sediment Control Plan',
            drawingRevision: 'E',
            source: 'FILENAME',
        });

        expect(extractFromFilename('CC 02.11 Stormwater Management Plan [E].pdf')).toMatchObject({
            drawingNumber: 'CC 02.11',
            drawingName: 'Stormwater Management Plan',
            drawingRevision: 'E',
            source: 'FILENAME',
        });
    });

    it('keeps trailing filename qualifiers while removing bracketed revisions', () => {
        expect(extractFromFilename('CC 02.5 Site Plan Amenities Block 2 [E] - MU.pdf')).toMatchObject({
            drawingNumber: 'CC 02.5',
            drawingName: 'Site Plan Amenities Block 2 - MU',
            drawingRevision: 'E',
            source: 'FILENAME',
        });
    });

    it('keeps filename register metadata for non-drawing document types', async () => {
        const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => undefined);

        try {
            await expect(extractDrawingInfo({
                fileBuffer: Buffer.from('Specification text'),
                filename: 'CC 02.2 Specification E.pdf',
                mimeType: 'application/pdf',
            })).resolves.toMatchObject({
                drawingNumber: 'CC 02.2',
                drawingName: 'Specification',
                drawingRevision: 'E',
                source: 'FILENAME',
            });
        } finally {
            consoleLogSpy.mockRestore();
        }
    });

    it('skips Anthropic vision for non-anthropic providers and uses aiComplete text-mode', async () => {
        mockGetProviderAndModelFor.mockResolvedValue({ provider: 'openai', modelId: 'gpt-4.1-mini' });
        const { parseDocument } = jest.requireMock('../../rag/parsing') as { parseDocument: jest.Mock };
        parseDocument.mockResolvedValueOnce({
            content: 'TITLE BLOCK: Drawing CC-A-201 Rev D Floor Plan Level 2. '.repeat(5),
        });
        mockAiComplete.mockResolvedValueOnce({
            text: JSON.stringify({
                isDrawing: true,
                drawingNumber: 'CC-A-201',
                drawingName: 'Floor Plan Level 2',
                drawingRevision: 'D',
                confidence: 88,
            }),
            provider: 'openai',
            modelId: 'gpt-4.1-mini',
        });
        const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => undefined);
        const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);

        try {
            const result = await extractDrawingInfo({
                fileBuffer: Buffer.from('%PDF-1.4'),
                filename: 'CC-A-201 FLOOR PLAN LEVEL 2.pdf',
                mimeType: 'application/pdf',
            });

            expect(mockMessagesCreate).not.toHaveBeenCalled();
            expect(mockAiComplete).toHaveBeenCalledWith(expect.objectContaining({
                featureGroup: 'extraction',
            }));
            expect(result.drawingNumber).toBe('CC-A-201');
        } finally {
            consoleLogSpy.mockRestore();
            consoleErrorSpy.mockRestore();
        }
    });

    it('falls back to filename metadata when pdf vision extraction fails', async () => {
        mockMessagesCreate.mockRejectedValueOnce(new Error('vision unavailable'));
        const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
        const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => undefined);

        try {
            await expect(extractDrawingInfo({
                fileBuffer: Buffer.from('%PDF-1.4'),
                filename: 'CC-A-102 GA LEVEL L1 PLAN.pdf',
                mimeType: 'application/pdf',
            })).resolves.toMatchObject({
                drawingNumber: 'CC-A-102',
                drawingName: 'GA LEVEL L1 PLAN',
                drawingRevision: null,
                confidence: 80,
                source: 'FILENAME',
            });
        } finally {
            consoleErrorSpy.mockRestore();
            consoleLogSpy.mockRestore();
        }
    });

    it('extracts electrical sheet title, sheet number, and issue from local title block text', async () => {
        const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => undefined);
        const sheetText = `
ISSUE
SHEET NUMBERPLOT DATE
SHEET TITLE
ISSUESHEET SIZESHEET SCALE
ELECTRICAL ENGINEERARCHITECT
C1
C1CONSTRUCTION ISSUE
ELECTRICAL SERVICES
LEVEL L0 GROUND - LIGHTING LAYOUT
E02
Project Title:
Drawing Title:
`;
        mockPdfParse.mockResolvedValueOnce({ text: sheetText });

        try {
            await expect(extractDrawingInfo({
                fileBuffer: Buffer.from('%PDF-1.4'),
                filename: 'E02-EL~1.PDF',
                mimeType: 'text/plain',
            })).resolves.toMatchObject({
                drawingNumber: 'E02',
                drawingName: 'ELECTRICAL SERVICES LEVEL L0 GROUND - LIGHTING LAYOUT',
                drawingRevision: 'C1',
                confidence: 88,
                source: 'TEXT',
            });
        } finally {
            consoleLogSpy.mockRestore();
        }
    });

    it('combines multi-line electrical cover sheet titles from local title block text', async () => {
        const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => undefined);
        const sheetText = `
ISSUE
SHEET NUMBERPLOT DATE
SHEET TITLE
ISSUESHEET SIZESHEET SCALE
C1
C1CONSTRUCTION ISSUE
ELECTRICAL SERVICES
COVER SHEET
NTS
E00
JW BUILDING
`;

        try {
            await expect(extractDrawingInfo({
                fileBuffer: Buffer.from(sheetText),
                filename: 'E00 - ELECTRICAL - COVER SHEET - [C1].txt',
                mimeType: 'text/plain',
            })).resolves.toMatchObject({
                drawingNumber: 'E00',
                drawingName: 'ELECTRICAL SERVICES COVER SHEET',
                drawingRevision: 'C1',
                confidence: 88,
                source: 'TEXT',
            });
        } finally {
            consoleLogSpy.mockRestore();
        }
    });

    it('prefers a real sheet title over a weaker filename-derived electrical title', async () => {
        const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => undefined);
        const sheetText = `
ISSUE
SHEET NUMBERPLOT DATE
SHEET TITLE
ISSUESHEET SIZESHEET SCALE
C1
C1CONSTRUCTION ISSUE
ELECTRICAL SERVICES
LEVEL L1 - LIGHTING LAYOUT
E03
`;

        try {
            await expect(extractDrawingInfo({
                fileBuffer: Buffer.from(sheetText),
                filename: 'E03 - ELECTRICAL - LEVEL L1 - LIGHTING LAYOUT - [C1].txt',
                mimeType: 'text/plain',
            })).resolves.toMatchObject({
                drawingNumber: 'E03',
                drawingName: 'ELECTRICAL SERVICES LEVEL L1 - LIGHTING LAYOUT',
                drawingRevision: 'C1',
                confidence: 88,
                source: 'TEXT',
            });
        } finally {
            consoleLogSpy.mockRestore();
        }
    });

    it('keeps a filename title when local text only supplies the missing revision', async () => {
        const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => undefined);

        try {
            await expect(extractDrawingInfo({
                fileBuffer: Buffer.from(`
Drawing Title:
JW BUILDING
Dwg No:
CC-A-102
C
`),
                filename: 'CC-A-102 GA LEVEL L1 PLAN.txt',
                mimeType: 'text/plain',
            })).resolves.toMatchObject({
                drawingNumber: 'CC-A-102',
                drawingName: 'GA LEVEL L1 PLAN',
                drawingRevision: 'C',
                confidence: 88,
                source: 'TEXT',
            });
        } finally {
            consoleLogSpy.mockRestore();
        }
    });

    it('extracts architectural revisions from dated revision table rows', () => {
        const text = `
Drawing No:
Drawing Title:
ISSUE FOR CONSTRUCTION
DATEREVISIONNOTES
22
_
009
DRAWING TITLE
CC-A-102
CC2 ISSUE FOR CONSTRUCTION
REV A 06.11.2023
DRAWING NUMBER
`;

        expect(extractDrawingRevisionFromText(text, 'CC-A-102')).toBe('A');
    });

    it('extracts an explicit revision row even when the drawing number is not in parsed text', () => {
        expect(extractDrawingRevisionFromText('REV A 06.11.2023', 'CC-A-000')).toBe('A');
    });

    it('finds a title in pdf-parse title-block order after drawing number and issue status', () => {
        const text = `
Drawing Title:
North Point:
Job No:
Dwg No:
Scale:
Issue:
20150041(A1)
Project:
RESIDENTIAL UNIT DEVELOPMENT
74-76 Kitchener Parade,
Bankstown
1:100
H-108
C
D&C TENDER ISSUE
LEVEL 6 HYDRAULIC SERVICES PLAN
A
04/06/15PRELIMINARY ISSUE
`;

        expect(extractDrawingTitleFromText(text, 'H-108', 'C')).toBe(
            'LEVEL 6 HYDRAULIC SERVICES PLAN'
        );
    });

    it('uses an inline Drawing Title value when the PDF text keeps label and value together', () => {
        const text = `
Project: Example
Drawing Title: Roof Hydraulic Services Plan
Dwg No: H-120
Issue: C
`;

        expect(extractDrawingTitleFromText(text, 'H-120', 'C')).toBe(
            'Roof Hydraulic Services Plan'
        );
    });

    it('does not infer a drawing title from non-drawing transmittal text', () => {
        const text = `
Transmittal
Re:74-76 Kitchener Parade, Bankstown
From:Rod Ware
File:20150041 HT01.xlsx
Distribution Register:
Reason For Issue:P= Paper
DR-Design Review
TI-Tender Issue
JJ Marino & Associates
`;

        expect(extractDrawingTitleFromText(text, 'HT01', null)).toBeNull();
    });

    it('extracts a title from compacted mechanical title-block text', () => {
        const text = `
Project
Drawing Title
North Point
Job No
Scale
Dwg No
Issue
M
E
C
H
A
N
I
C
A
L
S
E
R
V
I
C
E
S
L
E
V
E
L
2
M
-
2
0
4
Residential Unit Development
`;

        expect(extractDrawingTitleFromText(text, 'M-204', 'B')).toBe(
            'MECHANICAL SERVICES LEVEL 2'
        );
    });

    it('extracts an electrical title that appears before drawing number in visual order', () => {
        const text = `
DWA DESIGN WORKSHOP
AUSTRALIA
RESIDENTIAL DEVELOPMENT
74-76 KITCHENER PDE,
BANKSTOWN NSW
ELECTRICAL SERVICES
COMMUNICATION SCHEMATICS
S.Y.G.T.NTS@A1MAY. '15
11049
E011
P1
NORTH
Drawn
Checked
Scale
Date
Job Number
Drawing Number
Revision
Project
Drawing Title
`;

        expect(extractDrawingTitleFromText(text, 'E011', 'P1')).toBe(
            'ELECTRICAL SERVICES COMMUNICATION SCHEMATICS'
        );
        expect(extractDrawingRevisionFromText(text, 'E011')).toBe('P1');
    });

    it('preserves electrical level ranges from line-based title text', () => {
        const text = `
DWA DESIGN WORKSHOP
AUSTRALIA
RESIDENTIAL DEVELOPMENT
74-76 KITCHENER PDE,
BANKSTOWN NSW
ELECTRICAL SERVICES
LEVEL 2 - 6
ELECTRICAL LAYOUT
S.Y.G.T.1:100@A1MAY. '15
11049
E200
T1
NORTH
Drawn
Checked
Scale
Date
Job Number
Drawing Number
Revision
Project
Drawing Title
`;

        expect(extractDrawingTitleFromText(text, 'E200', 'T1')).toBe(
            'ELECTRICAL SERVICES LEVEL 2 - 6 ELECTRICAL LAYOUT'
        );
    });

    it('keeps legend and notes as part of an electrical title', () => {
        const text = `
RESIDENTIAL DEVELOPMENT
ELECTRICAL SERVICES
LEGEND AND NOTES
S.Y.G.T.NTS@A1MAY. '15
11049
E001
T1
Project
Drawing Title
`;

        expect(extractDrawingTitleFromText(text, 'E001', 'T1')).toBe(
            'ELECTRICAL SERVICES LEGEND AND NOTES'
        );
    });
});
