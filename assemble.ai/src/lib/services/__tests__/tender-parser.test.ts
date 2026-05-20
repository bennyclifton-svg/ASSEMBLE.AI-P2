import type { ParsedLineItem } from '@/types/evaluation';
import { aiComplete } from '@/lib/ai/client';
import { parseDocument } from '@/lib/rag/parsing';
import { extractPricingFromTender, parseTenderExtractionResponse } from '../tender-parser';
import { normaliseTenderLineItemTableType } from '../tender-parser-classification';

jest.mock('@/lib/ai/client', () => ({
    aiComplete: jest.fn(),
}));

jest.mock('@/lib/rag/parsing', () => ({
    parseDocument: jest.fn(),
}));

const mockAiComplete = aiComplete as jest.MockedFunction<typeof aiComplete>;
const mockParseDocument = parseDocument as jest.MockedFunction<typeof parseDocument>;

function item(partial: Partial<ParsedLineItem>): ParsedLineItem {
    return {
        description: partial.description ?? 'Schematic Design',
        amountCents: partial.amountCents ?? 10_000,
        confidence: partial.confidence ?? 0.9,
        itemType: partial.itemType ?? 'deliverable',
        ...partial,
    };
}

describe('tender parser classification', () => {
    it('honours explicit value management sections', () => {
        expect(normaliseTenderLineItemTableType(item({
            description: 'Rationalise car park exhaust zoning',
            sourceSection: 'Value Management Options',
            itemType: 'value_management',
            amountCents: -750_000,
        }))).toBe('value_management');
    });

    it('routes add/deduct commercial adjustments to adds and subs', () => {
        expect(normaliseTenderLineItemTableType(item({
            description: 'Add CFD modelling for basement ventilation if required',
            sourceSection: 'Commercial Adjustments',
            itemType: 'commercial_adjustment',
        }))).toBe('adds_subs');
    });

    it('keeps ordinary deliverables in the base price table', () => {
        expect(normaliseTenderLineItemTableType(item({
            description: 'Detail Design',
            sourceSection: 'Lump Sum Fee Breakdown',
            itemType: 'deliverable',
        }))).toBe('initial_price');
    });
});

describe('tender extraction response parsing', () => {
    it('parses a complete JSON object even when a markdown fence is not closed', () => {
        const parsed = parseTenderExtractionResponse(`\`\`\`json
{
  "firmName": "Rockbuild Developments Pty Ltd",
  "items": [
    {
      "description": "Allow for all provisions set out in the Minor Works Contract.",
      "amountCents": 7905700,
      "confidence": 0.95,
      "itemType": "deliverable",
      "tableType": "initial_price",
      "category": "base price",
      "sourceSection": "SCOPE & TENDER PRICE"
    }
  ],
  "overallConfidence": 0.95
}`);

        expect(parsed.firmName).toBe('Rockbuild Developments Pty Ltd');
        expect(parsed.items).toHaveLength(1);
        expect(parsed.items[0].amountCents).toBe(7905700);
    });

    it('reports an incomplete AI response instead of parsing a partial object', () => {
        expect(() => parseTenderExtractionResponse(`\`\`\`json
{
  "firmName": "Rockbuild Developments Pty Ltd",
  "items": [
    {
      "description": "Replace pump house with new structure",
      "amountCents": 1636000,
      "confidence": 0.95,
      "itemType": "deliverable",
      "tableType": "initial_price"`)).toThrow(/incomplete/i);
    });
});

describe('extractPricingFromTender', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockParseDocument.mockResolvedValue({
            content: 'Tender schedule with enough text for extraction. '.repeat(20),
            metadata: { parser: 'pdf-parse' },
        });
    });

    it('uses an expanded output budget for larger price schedules', async () => {
        mockAiComplete.mockResolvedValue({
            text: JSON.stringify({
                firmName: 'Rockbuild Developments Pty Ltd',
                items: [
                    {
                        description: 'Allow for all provisions set out in the Minor Works Contract.',
                        amountCents: 7905700,
                        confidence: 0.95,
                        itemType: 'deliverable',
                        tableType: 'initial_price',
                        category: 'base price',
                        sourceSection: 'SCOPE & TENDER PRICE',
                    },
                ],
                overallConfidence: 0.95,
            }),
            provider: 'anthropic',
            modelId: 'claude-sonnet-4-6',
        });

        const result = await extractPricingFromTender(Buffer.from('pdf'), 'tender.pdf');

        expect(result.success).toBe(true);
        expect(result.items).toHaveLength(1);
        expect(mockAiComplete).toHaveBeenCalledWith(expect.objectContaining({ maxTokens: 8000 }));
    });

    it('returns a helpful error when the model response is truncated', async () => {
        mockAiComplete.mockResolvedValue({
            text: `\`\`\`json
{
  "firmName": "Rockbuild Developments Pty Ltd",
  "items": [
    {
      "description": "Replace pump house with new structure",
      "amountCents": 1636000,
      "confidence": 0.95`,
            provider: 'anthropic',
            modelId: 'claude-sonnet-4-6',
        });

        const result = await extractPricingFromTender(Buffer.from('pdf'), 'tender.pdf');

        expect(result.success).toBe(false);
        expect(result.error).toMatch(/incomplete/i);
    });
});
