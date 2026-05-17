/**
 * create_meeting - action-backed compatibility export.
 */

import '@/lib/actions/definitions/create-meeting';
import type { CreateMeetingInput } from '@/lib/actions/definitions/create-meeting';
import { getActionByToolName } from '@/lib/actions/registry';
import { actionToAgentTool } from './action-adapter';
import { getTool, registerTool, type AgentToolDefinition } from './catalog';

const action = getActionByToolName('create_meeting');
if (!action) throw new Error('create_meeting action is not registered');

if (!getTool('create_meeting')) {
    registerTool(actionToAgentTool(action));
}

const createMeetingTool = getTool('create_meeting')! as AgentToolDefinition<CreateMeetingInput>;

export { createMeetingTool };
