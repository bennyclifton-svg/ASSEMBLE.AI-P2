/**
 * @jest-environment node
 */

import { extractVariationTriageView } from '../view';

describe('extractVariationTriageView', () => {
    it('maps stored variation triage into the correspondence view shape', () => {
        const triage = extractVariationTriageView({
            variationTriage: {
                status: 'auto_triaged',
                classification: 'variation_claim',
                confidence: 0.86,
                completeness: 'missing_information',
                missingInformation: ['Cost breakdown'],
                candidateReasons: ['variation/claim language'],
                workflowRunId: 'workflow-1',
                trace: {
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
                        'Request particulars draft',
                    ],
                    documentsReviewed: [],
                },
                workflowInput: { should: 'not leak to the view' },
                facts: {
                    contractorName: 'ABC Constructions',
                    contractorEmail: 'contracts@example.com',
                    description: 'Latent rock excavation',
                    basis: 'latent condition / unforeseen site condition',
                    amountForecastCents: 4200000,
                    programmeImpactDays: 4,
                    requestedAction: 'please confirm',
                    evidenceReferences: ['VO-004.pdf'],
                    dateSubmitted: '2026-05-06',
                },
            },
        });

        expect(triage).toEqual({
            status: 'auto_triaged',
            classification: 'variation_claim',
            confidence: 0.86,
            completeness: 'missing_information',
            missingInformation: ['Cost breakdown'],
            candidateReasons: ['variation/claim language'],
            workflowRunId: 'workflow-1',
            facts: {
                contractorName: 'ABC Constructions',
                contractorEmail: 'contracts@example.com',
                description: 'Latent rock excavation',
                basis: 'latent condition / unforeseen site condition',
                amountForecastCents: 4200000,
                programmeImpactDays: 4,
                requestedAction: 'please confirm',
                evidenceReferences: ['VO-004.pdf'],
                dateSubmitted: '2026-05-06',
            },
            trace: {
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
                    'Request particulars draft',
                ],
                documentsReviewed: [],
            },
        });
    });

    it('adds a compact inferred provenance trace for older triage payloads', () => {
        const triage = extractVariationTriageView({
            variationTriage: {
                status: 'auto_triaged',
                classification: 'variation_claim',
                confidence: 0.92,
                completeness: 'complete_enough',
                workflowRunId: 'workflow-2',
                facts: {},
            },
        });

        expect(triage?.trace).toEqual({
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
    });

    it('ignores malformed or absent triage payloads', () => {
        expect(extractVariationTriageView(null)).toBeNull();
        expect(extractVariationTriageView({ variationTriage: { status: 'maybe' } })).toBeNull();
    });
});
