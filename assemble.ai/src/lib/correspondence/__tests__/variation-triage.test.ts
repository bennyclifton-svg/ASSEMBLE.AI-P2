/**
 * @jest-environment node
 */

import { classifyInboundVariationClaim } from '../variation-triage';

describe('classifyInboundVariationClaim', () => {
    it('auto-triages a complete-enough contractor variation claim', () => {
        const triage = classifyInboundVariationClaim({
            inboundCorrespondenceId: 'in-001',
            subject: 'Variation claim - latent rock excavation',
            fromName: 'ABC Constructions Pty Ltd',
            fromEmail: 'contracts@abcconstructions.com.au',
            receivedAt: '2026-05-06T10:00:00+10:00',
            attachmentNames: ['VO-004 Excavation Breakdown.pdf'],
            bodyText:
                'We submit a variation claim for latent condition rock excavation. Claimed amount is $42,000 plus 4 working days. Please confirm instruction so works can proceed.',
        });

        expect(triage.status).toBe('auto_triaged');
        expect(triage.classification).toBe('variation_claim');
        expect(triage.completeness).toBe('complete_enough');
        expect(triage.facts.amountForecastCents).toBe(4200000);
        expect(triage.facts.programmeImpactDays).toBe(4);
        expect(triage.trace).toEqual({
            source: 'inbound_email',
            trigger: 'auto_triage',
            agentName: 'delivery',
            workflowKey: 'issue-variation',
            draftingMode: 'deterministic_delivery_lite_template',
            llmUsed: false,
            knowledgeLibraryUsed: false,
            approvalRequired: true,
            proposedActions: [
                'Forecast variation',
                'Variation note',
                'Assessment response draft',
            ],
            documentsReviewed: [],
        });
        expect(triage.workflowInput).toEqual(
            expect.objectContaining({
                inboundCorrespondenceId: 'in-001',
                variation: expect.objectContaining({
                    category: 'Contractor',
                    status: 'Forecast',
                    amountForecastCents: 4200000,
                }),
                outboundCorrespondence: expect.objectContaining({
                    draftType: 'assessment_response',
                    toEmail: 'contracts@abcconstructions.com.au',
                }),
            })
        );
    });

    it('auto-triages an incomplete claim into the request-particulars branch', () => {
        const triage = classifyInboundVariationClaim({
            inboundCorrespondenceId: 'in-002',
            subject: 'Variation claim - additional excavation',
            fromName: 'ABC Constructions Pty Ltd',
            fromEmail: 'contracts@abcconstructions.com.au',
            receivedAt: '2026-05-06T10:00:00+10:00',
            bodyText:
                'We claim a variation for additional excavation due to latent rock. Please confirm instruction.',
        });

        expect(triage.status).toBe('auto_triaged');
        expect(triage.completeness).toBe('missing_information');
        expect(triage.missingInformation).toContain('Claimed amount or supporting cost breakdown');
        expect(triage.missingInformation).toContain(
            'Supporting evidence, attachment, drawing, site record, or specification reference'
        );
        expect(triage.workflowInput?.variation).toEqual(
            expect.objectContaining({
                category: 'Contractor',
                status: 'Forecast',
            })
        );
        expect(triage.workflowInput?.outboundCorrespondence).toEqual(
            expect.objectContaining({ draftType: 'request_particulars' })
        );
    });

    it('does not auto-triage ordinary administrative email', () => {
        const triage = classifyInboundVariationClaim({
            subject: 'Thursday site meeting time',
            fromName: 'Site Admin',
            fromEmail: 'admin@example.com',
            bodyText: 'Can we move the site meeting to 11am?',
        });

        expect(triage.status).toBe('not_candidate');
        expect(triage.classification).toBe('other');
        expect(triage.workflowInput).toBeUndefined();
    });

    it('keeps high-signal non-contractor claims out of auto-triage', () => {
        const triage = classifyInboundVariationClaim({
            subject: 'Variation claim - latent rock excavation',
            fromName: 'Client PM',
            fromEmail: 'pm@client.example.com',
            receivedAt: '2026-05-06T10:00:00+10:00',
            attachmentNames: ['VO-004 Excavation Breakdown.pdf'],
            bodyText:
                'We submit a variation claim for latent condition rock excavation. Claimed amount is $42,000 plus 4 working days. Please confirm instruction so works can proceed.',
        });

        expect(triage.status).toBe('needs_classification');
        expect(triage.classification).toBe('variation_claim');
        expect(triage.trace).toEqual(
            expect.objectContaining({
                workflowKey: null,
                draftingMode: 'none',
                approvalRequired: false,
                proposedActions: ['Manual review'],
            })
        );
        expect(triage.workflowInput).toBeUndefined();
    });
});
