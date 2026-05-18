/**
 * @jest-environment node
 */

import design from '../specialists/design';

describe('design agent prompt', () => {
    it('trains lighting schedule answers to stay grounded in exact schedule rows', () => {
        const prompt = design.buildSystemPrompt({});

        expect(prompt).toContain(
            'Reference | Type | Location | Watts | Lumens | Supplier | Catalogue Reference | Source'
        );
        expect(prompt).toContain('Lighting schedules define fitting types/specifications');
        expect(prompt).toContain('Quantity not provided in the lighting schedule');
        expect(prompt).toContain('Do not invent common-area/apartment/external groupings');
        expect(prompt).toContain('LED strip lights, pendant lights, wall sconces, bollard lights');
        expect(prompt).toContain('Before calling record_rfi_response for a schedule-based RFI');
    });
});
