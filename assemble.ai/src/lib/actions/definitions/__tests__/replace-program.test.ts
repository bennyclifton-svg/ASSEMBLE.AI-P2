/**
 * @jest-environment node
 */

jest.mock('@/lib/db', () => ({ db: {} }));

import { replaceProgramAction } from '../replace-program';

describe('program.replace action', () => {
    it('uses the friendly replace_program tool name', () => {
        expect(replaceProgramAction.toolName).toBe('replace_program');
    });

    it('accepts a complete replacement activity list', () => {
        const parsed = replaceProgramAction.inputSchema.parse({
            activities: [
                {
                    name: 'Planning approvals',
                    startDate: '2026-05-01',
                    endDate: '2026-06-30',
                    masterStage: 'schematic_design',
                },
                {
                    name: 'Construction',
                    startDate: '2026-07-01',
                    endDate: '2027-02-28',
                    masterStage: 'delivery',
                },
            ],
        });

        expect(parsed.activities).toHaveLength(2);
    });

    it('rejects empty replacement programmes', () => {
        expect(() => replaceProgramAction.inputSchema.parse({ activities: [] })).toThrow();
    });

    it('rejects activity start dates after end dates', () => {
        expect(() =>
            replaceProgramAction.inputSchema.parse({
                activities: [
                    {
                        name: 'Planning approvals',
                        startDate: '2026-07-01',
                        endDate: '2026-06-30',
                    },
                ],
            })
        ).toThrow(/Start date cannot be after end date/);
    });
});
