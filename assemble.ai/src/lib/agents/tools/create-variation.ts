/**
 * create_variation - action-backed compatibility export.
 */

import '@/lib/actions/definitions/create-variation';
import type { CreateVariationInput } from '@/lib/actions/definitions/create-variation';
import { getActionByToolName } from '@/lib/actions/registry';
import { actionToAgentTool } from './action-adapter';
import { getTool, registerTool, type AgentToolDefinition } from './catalog';

const action = getActionByToolName('create_variation');
if (!action) throw new Error('create_variation action is not registered');

if (!getTool('create_variation')) {
    registerTool(actionToAgentTool(action));
}

const createVariationTool = getTool('create_variation')! as AgentToolDefinition<CreateVariationInput>;

export { createVariationTool };
