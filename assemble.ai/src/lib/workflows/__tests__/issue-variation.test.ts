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
                status: 'Forecast',
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
            userGoal: 'Create a variation for additional excavation and update the cost plan budget',
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

    it('rejects Submitted because variation register statuses are limited to four values', () => {
        expect(() =>
            buildIssueVariationPlan({
                variation: {
                    description: 'Extra hydrants',
                    status: 'Submitted' as never,
                    amountForecastCents: 77700,
                },
            })
        ).toThrow(/Invalid option/);
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
                status: 'Approved',
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

    it('does not turn an approved variation into a cost-line approved-contract update', () => {
        const plan = buildIssueVariationPlan({
            userGoal:
                'Add a variation for 6 additional fire hydrants to first aid rooms, $666, approved today. Cost line Fire Services.',
            evidence: ['Matched cost line Fire Services - 3.12 - Fire services + fire engineering'],
            variation: {
                category: 'Contractor',
                description: 'Variation for 6 additional fire hydrants to first aid rooms.',
                status: 'Approved',
                costLineId: 'cost-line-fire',
                amountApprovedCents: 66600,
                dateApproved: '2026-05-03',
            },
            costLineUpdate: {
                id: 'cost-line-fire',
                costCode: '3.12',
                activity: 'Fire services + fire engineering',
                approvedContractCents: 66600,
            },
            note: {
                title: 'Fire services variation',
                content:
                    'Approved variation for 6 additional fire hydrants linked to Fire services + fire engineering.',
                type: 'variation',
            },
        });

        expect(plan.steps.map((step) => step.actionId)).toEqual([
            'finance.variations.create',
            'correspondence.note.create',
        ]);
        expect(plan.steps[0].input).toEqual(
            expect.objectContaining({
                status: 'Approved',
                costLineId: 'cost-line-fire',
                amountApprovedCents: 66600,
            })
        );
        expect(plan.assumptions).toContain(
            'Cost-plan monetary update was skipped because the request only linked the variation to the cost line; variation amounts are tracked on the variation register.'
        );
    });

    it('links the variation when the resolved cost line is supplied as cost context', () => {
        const plan = buildIssueVariationPlan({
            userGoal: 'Issue air conditioning variation',
            evidence: ['Matched cost line 3.11 Mechanical services (HVAC)'],
            variation: {
                category: 'Principal',
                description: 'Extra air conditioning to meeting rooms',
                status: 'Forecast',
                amountForecastCents: 999900,
            },
            costLineUpdate: {
                id: 'cost-line-hvac',
                costCode: '3.11',
                activity: 'Mechanical services',
                reference: 'HVAC',
            },
        });

        expect(plan.steps.map((step) => step.actionId)).toEqual([
            'finance.variations.create',
            'correspondence.note.create',
        ]);
        expect(plan.steps[0].input).toEqual(
            expect.objectContaining({
                costLineId: 'cost-line-hvac',
                description: 'Extra air conditioning to meeting rooms',
                amountForecastCents: 999900,
            })
        );
        expect(plan.steps[1].input.content as string).toContain(
            'Cost line mapping: 3.11 - Mechanical services - HVAC.'
        );
        expect(plan.assumptions).toContain(
            'Cost line was resolved and linked on the variation; no base cost-plan row update was required.'
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
                status: 'Approved',
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

    it('adds request-particulars outbound correspondence for incomplete inbound contractor claims', () => {
        const plan = buildIssueVariationPlan({
            inboundCorrespondenceId: 'in-001',
            contractor: {
                name: 'ABC Constructions',
                email: 'contracts@abc.example',
            },
            missingInformation: ['Claimed amount or supporting cost breakdown'],
            deliveryAssessment: {
                completeness: 'missing_information',
                summary: 'Contractor claim needs further particulars before assessment.',
                missingInformation: ['Claimed amount or supporting cost breakdown'],
            },
            variation: {
                category: 'Contractor',
                description: 'Additional excavation due to latent rock',
                status: 'Forecast',
                requestedBy: 'ABC Constructions',
            },
            outboundCorrespondence: {
                draftType: 'request_particulars',
                toEmail: 'contracts@abc.example',
            },
        });

        expect(plan.steps.map((step) => step.actionId)).toEqual([
            'finance.variations.create',
            'correspondence.note.create',
            'correspondence.outbound_email.draft',
        ]);
        expect(plan.steps[0].input).toEqual(
            expect.objectContaining({
                category: 'Contractor',
                status: 'Forecast',
            })
        );
        expect(plan.steps[2].input).toEqual(
            expect.objectContaining({
                inboundCorrespondenceId: 'in-001',
                draftType: 'request_particulars',
                toEmail: 'contracts@abc.example',
                markAsSentInAssemble: true,
            })
        );
        expect(plan.steps[2].dependencyStepKeys).toEqual(['create_variation', 'create_note']);
        expect(plan.steps[2].input.bodyText as string).toContain('Before the claim can be assessed');
    });

    it('adds assessment-response outbound correspondence for complete-enough inbound claims', () => {
        const plan = buildIssueVariationPlan({
            inboundCorrespondenceId: 'in-002',
            contractor: {
                name: 'ABC Constructions',
                email: 'contracts@abc.example',
            },
            deliveryAssessment: {
                completeness: 'complete_enough',
                summary: 'Claim is complete enough for preliminary assessment.',
                entitlement: 'Potential latent condition claim.',
                quantum: 'Claimed amount $42,000.',
            },
            variation: {
                category: 'Contractor',
                description: 'Latent rock excavation',
                status: 'Forecast',
                amountForecastCents: 4200000,
            },
            outboundCorrespondence: {
                draftType: 'assessment_response',
                toEmail: 'contracts@abc.example',
            },
        });

        expect(plan.steps.map((step) => step.actionId)).toEqual([
            'finance.variations.create',
            'correspondence.note.create',
            'correspondence.outbound_email.draft',
        ]);
        expect(plan.steps[2].input).toEqual(
            expect.objectContaining({
                draftType: 'assessment_response',
                deliveryAssessmentSummary: expect.stringContaining('Claim is complete enough'),
            })
        );
        expect(plan.steps[2].input.bodyText as string).toContain('registered as a Forecast variation');
    });

    it('formats a deep Delivery assessment as a reviewable artifact with traceable context', () => {
        const plan = buildIssueVariationPlan({
            inboundCorrespondenceId: 'in-rock-002',
            contractor: {
                name: 'ABC Constructions',
                email: 'contracts@abc.example',
            },
            evidence: [
                'Inbound correspondence in-rock-002',
                'Geotechnical report GT-01 notes possible sandstone floaters.',
                'Superintendent instruction SI-014 directed excavation to continue.',
            ],
            deliveryAssessment: {
                assessmentMode: 'deep_delivery',
                completeness: 'complete_enough',
                summary:
                    'ABC Constructions submitted a latent rock excavation claim with cost support but limited programme evidence.',
                entitlement:
                    'Entitlement is arguable but not accepted. The geotechnical report appears to flag some ground risk while SI-014 may support a directed-work pathway.',
                quantum:
                    'The claimed amount is priced, but plant hours, disposal dockets, and subcontractor records should be reconciled before quantum is accepted.',
                programme:
                    'The four-day programme impact is not yet supported by a critical-path narrative or contemporaneous delay records.',
                recommendation:
                    'Register as Forecast, request programme substantiation, and reserve all rights on entitlement, quantum, and time.',
                contractAssumption:
                    'Verify latent condition, notice, valuation, and EOT clauses against the executed contract and special conditions.',
                documentsReviewed: [
                    'Geotechnical report GT-01',
                    'Superintendent instruction SI-014',
                    'VO-004 Excavation Breakdown.pdf',
                ],
                knowledgeReferences: ['Standard-form variation and latent condition administration'],
                entitlementReasons: [
                    'SI-014 may evidence a direction to proceed with the excavation.',
                    'GT-01 may also have warned tenderers about possible rock conditions.',
                ],
                quantumReasons: [
                    'The cost breakdown gives a headline value but does not prove plant hours or disposal quantities.',
                ],
                programmeReasons: [
                    'The claim states four days but does not identify critical-path effect.',
                ],
                evidenceGaps: [
                    'Daily excavation records',
                    'Plant and labour dockets',
                    'Delay fragnet or critical-path narrative',
                ],
                confidence: 0.68,
            },
            variation: {
                category: 'Contractor',
                description: 'Latent rock excavation',
                status: 'Forecast',
                amountForecastCents: 4200000,
                requestedBy: 'ABC Constructions',
            },
            outboundCorrespondence: {
                draftType: 'assessment_response',
                toEmail: 'contracts@abc.example',
            },
        });

        const noteStep = plan.steps.find((step) => step.stepKey === 'create_note');
        const outboundStep = plan.steps.find((step) => step.stepKey === 'draft_outbound_correspondence');

        expect(noteStep?.input).toEqual(
            expect.objectContaining({
                title: 'Deep Delivery assessment - Latent rock excavation',
                type: 'variation',
                status: 'open',
            })
        );
        expect(noteStep?.input.content as string).toContain('## Entitlement');
        expect(noteStep?.input.content as string).toContain('Geotechnical report GT-01');
        expect(noteStep?.input.content as string).toContain('## Evidence Gaps');
        expect(outboundStep?.input.bodyText as string).toContain(
            'Our preliminary assessment is that entitlement remains under review'
        );
        expect(outboundStep?.input.bodyText as string).toContain('critical-path narrative');
        expect(outboundStep?.input.deliveryTrace).toEqual(
            expect.objectContaining({
                workflowKey: 'issue-variation',
                draftingMode: 'llm_assisted_delivery_template',
                llmUsed: true,
                knowledgeLibraryUsed: true,
                approvalRequired: true,
                documentsReviewed: [
                    'Geotechnical report GT-01',
                    'Superintendent instruction SI-014',
                    'VO-004 Excavation Breakdown.pdf',
                ],
            })
        );
    });
});
