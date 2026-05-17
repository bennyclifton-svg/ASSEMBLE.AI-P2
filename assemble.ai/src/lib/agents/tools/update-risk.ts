/**
 * update_risk - action-backed compatibility export.
 */

import '@/lib/actions/definitions/update-risk';
import type { UpdateRiskInput } from '@/lib/actions/definitions/update-risk';
import { getActionByToolName } from '@/lib/actions/registry';
import { actionToAgentTool } from './action-adapter';
import { getTool, registerTool, type AgentToolDefinition } from './catalog';

const action = getActionByToolName('update_risk');
if (!action) throw new Error('update_risk action is not registered');

if (!getTool('update_risk')) {
    registerTool(actionToAgentTool(action));
}

const updateRiskTool = getTool('update_risk')! as AgentToolDefinition<UpdateRiskInput>;

export { updateRiskTool };
