/**
 * update_variation - action-backed compatibility export.
 */

import '@/lib/actions/definitions/update-variation';
import type { UpdateVariationInput } from '@/lib/actions/definitions/update-variation';
import { getActionByToolName } from '@/lib/actions/registry';
import { actionToAgentTool } from './action-adapter';
import { getTool, registerTool, type AgentToolDefinition } from './catalog';

const action = getActionByToolName('update_variation');
if (!action) throw new Error('update_variation action is not registered');

if (!getTool('update_variation')) {
    registerTool(actionToAgentTool(action));
}

const updateVariationTool = getTool('update_variation')! as AgentToolDefinition<UpdateVariationInput>;

export { updateVariationTool };
