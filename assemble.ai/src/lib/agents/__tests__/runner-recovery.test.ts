/**
 * @jest-environment node
 */

jest.mock('@/lib/db', () => ({ db: {} }));
jest.mock('../tools', () => ({}));
jest.mock('../events', () => ({ emitChatEvent: jest.fn() }));

import { shouldRecoverMissingInvoiceApproval } from '../runner';

describe('shouldRecoverMissingInvoiceApproval', () => {
    it('recovers when an invoice request claims approval but record_invoice was never called', () => {
        expect(
            shouldRecoverMissingInvoiceApproval({
                latestUserMessage: 'please add a new invoice allocated to DA fees for 15000',
                finalText: 'Invoice proposed and awaiting your approval. Please action the approval card.',
                usedToolNames: ['list_cost_lines'],
            })
        ).toBe(true);
    });

    it('does not recover once record_invoice was called', () => {
        expect(
            shouldRecoverMissingInvoiceApproval({
                latestUserMessage: 'please add a new invoice allocated to DA fees for 15000',
                finalText: 'Invoice proposed and awaiting your approval.',
                usedToolNames: ['list_cost_lines', 'record_invoice'],
            })
        ).toBe(false);
    });

    it('does not recover unrelated approval prose', () => {
        expect(
            shouldRecoverMissingInvoiceApproval({
                latestUserMessage: 'update the DA fee budget',
                finalText: 'Awaiting your approval.',
                usedToolNames: ['list_cost_lines'],
            })
        ).toBe(false);
    });
});
