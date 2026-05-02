/**
 * @jest-environment node
 */

import { buildIssueVariationPlan } from '../issue-variation';

describe('buildIssueVariationPlan', () => {
    it('accepts sparse PM-style variation workflow input with sensible defaults', () => {
        const plan = buildIssueVariationPlan({
            userGoal: 'Issue acoustic treatment variation',
            variation: {
                description: 'Extra acoustic treatment to meeting rooms',
                amountForecastCents: 1875000,
            },
            programActivityUpdate: {
                name: 'Meeting room fitout',
                endDate: '2026-05-05',
            },
            note: {
                content: 'Client requested extra acoustic treatment to meeting rooms.',
                type: 'variation',
            },
        });

        expect(plan.steps.map((step) => step.actionId)).toEqual([
            'finance.variations.create',
            'correspondence.note.create',
        ]);
        expect(plan.steps[0].input).toEqual(
            expect.objectContaining({
                category: 'Principal',
                status: 'Submitted',
                description: 'Extra acoustic treatment to meeting rooms',
                amountForecastCents: 1875000,
            })
        );
        expect(plan.steps[1].input).toEqual(
            expect.objectContaining({
                title: 'Variation - Extra acoustic treatment to meeting rooms',
                content: 'Client requested extra acoustic treatment to meeting rooms.',
                type: 'variation',
            })
        );
        expect(plan.assumptions).toContain(
            'Programme activity update was skipped because no resolved activity id was supplied.'
        );
    });

    it('creates a dependency-aware issue-variation plan over registered actions', () => {
        const plan = buildIssueVariationPlan({
            userGoal: 'Create a variation for additional excavation',
            evidence: ['Matched cost line CIV-02 Excavation'],
            assumptions: ['No programme delay was supplied'],
            variation: {
                category: 'Principal',
                description: 'Additional excavation',
                status: 'Forecast',
                costLineId: 'cost-line-1',
                amountForecastCents: 4000000,
            },
            costLineUpdate: {
                id: 'cost-line-1',
                budgetCents: 4000000,
            },
            note: {
                title: 'Variation - additional excavation',
                content: 'Record the additional excavation variation for review.',
                type: 'variation',
            },
        });

        expect(plan.workflowKey).toBe('issue-variation');
        expect(plan.steps.map((step) => step.actionId)).toEqual([
            'finance.variations.create',
            'finance.cost_plan.update_line',
            'correspondence.note.create',
        ]);
        expect(plan.steps[0].dependencyStepKeys).toEqual([]);
        expect(plan.steps[1].dependencyStepKeys).toEqual(['create_variation']);
        expect(plan.steps[2].dependencyStepKeys).toEqual([
            'create_variation',
            'update_cost_plan',
        ]);
        expect(plan.executionBrief).toContain('Additional excavation');
        expect(plan.executionBrief).toContain('$40,000');
        expect(plan.executionBrief).toContain('explicit approval controls');
    });

    it('does not create empty update steps when mappings are resolved only for linking', () => {
        const plan = buildIssueVariationPlan({
            userGoal: 'Issue acoustic treatment variation',
            evidence: [
                'Matched cost line Acoustic design + site testing',
                'Matched programme activity Meeting room fitout',
            ],
            variation: {
                category: 'Principal',
                description: 'Extra acoustic treatment to meeting rooms',
                status: 'Submitted',
                costLineId: 'cost-line-acoustic',
                amountApprovedCents: 1875000,
            },
            costLineUpdate: {
                id: 'cost-line-acoustic',
            },
            programActivityUpdate: {
                id: 'program-meeting-room-fitout',
            },
            note: {
                content:
                    'Client requested extra acoustic treatment to meeting rooms. Cost line: Acoustic design + site testing. Programme activity: Meeting room fitout.',
                type: 'variation',
            },
        });

        expect(plan.steps.map((step) => step.actionId)).toEqual([
            'finance.variations.create',
            'correspondence.note.create',
        ]);
        expect(plan.steps[0].input).toEqual(
            expect.objectContaining({
                costLineId: 'cost-line-acoustic',
                amountApprovedCents: 1875000,
            })
        );
        expect(plan.assumptions).toContain(
            'Cost line was resolved and linked on the variation; no base cost-plan row update was required.'
        );
        expect(plan.assumptions).toContain(
            'Programme activity was resolved for context, but no programme row update was supplied.'
        );
    });

    it('treats matched row labels as context rather than update fields', () => {
        const plan = buildIssueVariationPlan({
            userGoal:
                'Issue acoustic treatment variation and add a short project note linked to cost/programme context',
            evidence: ['Matched acoustic cost and programme rows'],
            variation: {
                category: 'Principal',
                description: 'Extra acoustic treatment to meeting rooms',
                status: 'Submitted',
                costLineId: 'cost-line-acoustic',
                amountApprovedCents: 1875000,
            },
            costLineUpdate: {
                id: 'cost-line-acoustic',
                section: 'CONSULTANTS',
                costCode: 'AC-01',
                activity: 'Acoustic design + site testing',
            },
            programActivityUpdate: {
                id: 'program-meeting-room-fitout',
                name: 'Meeting room fitout',
            },
        });

        expect(plan.steps.map((step) => step.actionId)).toEqual([
            'finance.variations.create',
            'correspondence.note.create',
        ]);
        expect(plan.steps[1].input).toEqual(
            expect.objectContaining({
                title: 'Variation - Extra acoustic treatment to meeting rooms',
                content: expect.stringContaining('Programme activity mapping: Meeting room fitout.'),
                type: 'variation',
                status: 'open',
            })
        );
        expect(plan.steps[1].input.content as string).toContain(
            'Cost line mapping: AC-01 - Acoustic design + site testing.'
        );
    });
});
