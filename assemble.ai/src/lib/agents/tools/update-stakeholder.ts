/**
 * update_stakeholder - action-backed compatibility export.
 */

import '@/lib/actions/definitions/update-stakeholder';
import { getActionByToolName } from '@/lib/actions/registry';
import { actionToAgentTool } from './action-adapter';
import { getTool, registerTool } from './catalog';

const action = getActionByToolName('update_stakeholder');
if (!action) throw new Error('update_stakeholder action is not registered');

if (!getTool('update_stakeholder')) {
    registerTool(actionToAgentTool(action));
}

const updateStakeholderTool = getTool('update_stakeholder');
if (!updateStakeholderTool) throw new Error('update_stakeholder tool is not registered');

export { updateStakeholderTool };
