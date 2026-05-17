/**
 * create_risk - action-backed compatibility export.
 */

import '@/lib/actions/definitions/create-risk';
import type { CreateRiskInput } from '@/lib/actions/definitions/create-risk';
import { getActionByToolName } from '@/lib/actions/registry';
import { actionToAgentTool } from './action-adapter';
import { getTool, registerTool, type AgentToolDefinition } from './catalog';

const action = getActionByToolName('create_risk');
if (!action) throw new Error('create_risk action is not registered');

if (!getTool('create_risk')) {
    registerTool(actionToAgentTool(action));
}

const createRiskTool = getTool('create_risk')! as AgentToolDefinition<CreateRiskInput>;

export { createRiskTool };
