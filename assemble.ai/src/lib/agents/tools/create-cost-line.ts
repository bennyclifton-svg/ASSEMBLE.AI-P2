/**
 * create_cost_line - action-backed compatibility export.
 */

import '@/lib/actions/definitions/create-cost-line';
import type { CreateCostLineInput } from '@/lib/actions/definitions/create-cost-line';
import { getActionByToolName } from '@/lib/actions/registry';
import { actionToAgentTool } from './action-adapter';
import { getTool, registerTool, type AgentToolDefinition } from './catalog';

const action = getActionByToolName('create_cost_line');
if (!action) throw new Error('create_cost_line action is not registered');

if (!getTool('create_cost_line')) {
    registerTool(actionToAgentTool(action));
}

const createCostLineTool = getTool('create_cost_line')! as AgentToolDefinition<CreateCostLineInput>;

export { createCostLineTool };
