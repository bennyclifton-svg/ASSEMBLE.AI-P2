/**
 * @jest-environment node
 */

import { buildIssueVariationAssessmentRevisionPlan } from '../issue-variation-assessment-revision';

describe('buildIssueVariationAssessmentRevisionPlan', () => {
    it('updates the assessment artifact and drafts a revised response without creating another variation', () => {
        const plan = buildIssueVariationAssessmentRevisionPlan({
            userGoal: 'Revise the latent rock assessment with more geotech evaluation',
            inboundCorrespondenceId: 'in-rock-002',
            assessmentNoteId: 'note-assessment-1',
            revisionInstruction: 'Add more evaluation of the geotechnical report.',
            contractor: {
                name: 'ABC Constructions',
                email: 'contracts@abc.example',
            },
            variationDescription: 'Latent rock excavation',
            evidence: ['Geotechnical report GT-01', 'VO-004 Excavation Breakdown.pdf'],
            deliveryAssessment: {
                assessmentMode: 'deep_delivery',
                completeness: 'complete_enough',
                summary:
                    'The geotechnical report weakens the latent-condition argument because it identified possible sandstone floaters.',
                entitlement:
                    'Entitlement remains unresolved. The report may have put the contractor on notice of some rock risk, while SI-014 still needs clause review.',
                quantum:
                    'Quantum cannot be accepted without plant, labour, disposal, and measurement records.',
                programme:
                    'No critical-path impact is demonstrated by the current submission.',
                recommendation:
                    'Request further particulars and keep the variation Forecast pending contract review.',
                contractAssumption:
                    'Verify notice, latent condition, valuation, and EOT clauses against the executed contract.',
                documentsReviewed: ['Geotechnical report GT-01'],
                entitlementReasons: [
                    'GT-01 identified possible sandstone floaters before the claim.',
                    'The contractor has not explained why the encountered condition differs materially from tender information.',
                ],
                evidenceGaps: ['Marked-up geotechnical extract', 'Contemporaneous excavation records'],
                confidence: 0.72,
            },
            outboundCorrespondence: {
                draftType: 'assessment_response',
                toEmail: 'contracts@abc.example',
            },
        });

        expect(plan.workflowKey).toBe('issue-variation-assessment-revision');
        expect(plan.steps.map((step) => step.actionId)).toEqual([
            'correspondence.note.update',
            'correspondence.outbound_email.draft',
        ]);
        expect(plan.steps[0].input).toEqual(
            expect.objectContaining({
                id: 'note-assessment-1',
                title: 'Deep Delivery assessment - Latent rock excavation',
                type: 'variation',
                status: 'open',
            })
        );
        expect(plan.steps[0].input.content as string).toContain(
            'Revision request: Add more evaluation of the geotechnical report.'
        );
        expect(plan.steps[0].input.content as string).toContain('GT-01 identified possible sandstone floaters');
        expect(plan.steps[1].dependencyStepKeys).toEqual(['update_assessment_note']);
        expect(plan.steps[1].input).toEqual(
            expect.objectContaining({
                inboundCorrespondenceId: 'in-rock-002',
                draftType: 'assessment_response',
                toEmail: 'contracts@abc.example',
                deliveryTrace: expect.objectContaining({
                    workflowKey: 'issue-variation-assessment-revision',
                    draftingMode: 'llm_assisted_delivery_template',
                    llmUsed: true,
                    documentsReviewed: ['Geotechnical report GT-01'],
                    proposedActions: ['Update assessment note', 'Draft revised outbound response'],
                }),
            })
        );
        expect(plan.steps[1].input.bodyText as string).toContain('geotechnical report');
    });
});
