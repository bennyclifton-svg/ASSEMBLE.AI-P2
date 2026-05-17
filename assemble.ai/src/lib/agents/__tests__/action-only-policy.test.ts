/**
 * @jest-environment node
 */

jest.mock('@/lib/db', () => ({ db: {} }));
jest.mock('@/lib/rag/retrieval', () => ({ retrieve: jest.fn(), retrieveFromDomains: jest.fn() }));
jest.mock('@/lib/agents/events', () => ({ emitChatEvent: jest.fn() }));
jest.mock('@/lib/agents/project-events', () => ({ emitProjectEvent: jest.fn() }));
jest.mock('uuid', () => ({ v4: () => 'test-id' }));

import '@/lib/agents/tools';
import { getActionByToolName } from '@/lib/actions/registry';
import { listToolDefinitions } from '../tools/catalog';
import { LEGACY_MUTATING_TOOL_EXEMPTIONS } from '../tools/legacy-mutating-tool-exemptions';

describe('agent action-only mutation policy', () => {
    it('requires mutating agent tools to be action-backed or explicitly exempted', () => {
        const violations = listToolDefinitions()
            .filter((tool) => tool.mutating)
            .filter((tool) => !tool.actionBacked)
            .filter((tool) => !LEGACY_MUTATING_TOOL_EXEMPTIONS[tool.spec.name])
            .map((tool) => tool.spec.name)
            .sort();

        expect(violations).toEqual([]);
    });

    it('keeps action-backed agent tools connected to registered actions', () => {
        const mismatches = listToolDefinitions()
            .filter((tool) => Boolean(tool.actionBacked))
            .map((tool) => ({
                actionId: tool.actionBacked?.actionId,
                registeredActionId: getActionByToolName(tool.spec.name)?.id,
                toolName: tool.spec.name,
            }))
            .filter((tool) => tool.actionId !== tool.registeredActionId);

        expect(mismatches).toEqual([]);
    });

    it('keeps legacy exemptions current and specific', () => {
        const toolsByName = new Map(listToolDefinitions().map((tool) => [tool.spec.name, tool]));
        const exemptionProblems = Object.entries(LEGACY_MUTATING_TOOL_EXEMPTIONS)
            .map(([toolName, exemption]) => {
                const tool = toolsByName.get(toolName);
                if (!tool) return `${toolName}: exemption references an unregistered tool`;
                if (!tool.mutating) return `${toolName}: exemption references a non-mutating tool`;
                if (tool.actionBacked) return `${toolName}: action-backed tools should not need exemptions`;
                if (!exemption.reason.trim()) return `${toolName}: missing exemption reason`;
                if (!exemption.migrationTarget.trim()) return `${toolName}: missing migration target`;
                return null;
            })
            .filter((problem): problem is string => Boolean(problem));

        expect(exemptionProblems).toEqual([]);
    });
});
