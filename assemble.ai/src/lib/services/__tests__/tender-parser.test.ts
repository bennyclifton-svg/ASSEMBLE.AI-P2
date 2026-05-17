import type { ParsedLineItem } from '@/types/evaluation';
import { normaliseTenderLineItemTableType } from '../tender-parser-classification';

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
