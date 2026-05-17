/**
 * record_invoice - action-backed compatibility export.
 */

import '@/lib/actions/definitions/record-invoice';
import { getActionByToolName } from '@/lib/actions/registry';
import {
    normalizeRecordInvoiceInput,
    type NormalizedRecordInvoiceInput,
    type RecordInvoiceInput,
} from '@/lib/actions/definitions/record-invoice';
import { parseActionInput } from '@/lib/actions/dispatch';
import { actionToAgentTool } from './action-adapter';
import { getTool, registerTool, type AgentToolDefinition } from './catalog';

const action = getActionByToolName('record_invoice');
if (!action) throw new Error('record_invoice action is not registered');

if (!getTool('record_invoice')) {
    const actionTool = actionToAgentTool(action);
    const recordInvoiceToolWithDerivedDates: AgentToolDefinition<NormalizedRecordInvoiceInput> = {
        ...actionTool,
        validate(input: unknown) {
            return normalizeRecordInvoiceInput(parseActionInput(action, input) as RecordInvoiceInput);
        },
    };
    registerTool(recordInvoiceToolWithDerivedDates);
}

const recordInvoiceTool = getTool('record_invoice')! as AgentToolDefinition<NormalizedRecordInvoiceInput>;

export { recordInvoiceTool };
