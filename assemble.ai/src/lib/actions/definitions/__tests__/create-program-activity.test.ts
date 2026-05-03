/**
 * @jest-environment node
 */

jest.mock('@/lib/db', () => ({ db: {} }));

import { createProgramActivityAction } from '../create-program-activity';
import type { ActionContext } from '../../types';

const ctx: ActionContext = {
    userId: 'user-1',
    organizationId: 'org-1',
    projectId: 'project-1',
    actorKind: 'agent',
    actorId: 'run-1',
    threadId: 'thread-1',
    runId: 'run-1',
};

describe('program.activity.create action', () => {
    it('uses the friendly create_program_activity tool name', () => {
        expect(createProgramActivityAction.toolName).toBe('create_program_activity');
    });

    it('previews a one-day programme activity', async () => {
        const proposal = await createProgramActivityAction.prepareProposal?.(ctx, {
            name: 'Council Pre-DA Meeting',
            startDate: '2026-06-10',
            endDate: '2026-06-10',
            masterStage: 'design_development',
        });

        expect(proposal?.proposedDiff.summary).toBe(
            'Create programme activity - Council Pre-DA Meeting'
        );
        expect(proposal?.proposedDiff.changes).toEqual(
            expect.arrayContaining([
                expect.objectContaining({ label: 'Name', after: 'Council Pre-DA Meeting' }),
                expect.objectContaining({ label: 'Start date', after: '2026-06-10' }),
                expect.objectContaining({ label: 'End date', after: '2026-06-10' }),
            ])
        );
    });

    it('rejects start dates after end dates', () => {
        expect(() =>
            createProgramActivityAction.inputSchema.parse({
                name: 'Council Pre-DA Meeting',
                startDate: '2026-06-11',
                endDate: '2026-06-10',
            })
        ).toThrow(/Start date cannot be after end date/);
    });
});
