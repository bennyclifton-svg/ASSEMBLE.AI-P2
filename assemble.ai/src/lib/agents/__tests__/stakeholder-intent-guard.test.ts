/**
 * @jest-environment node
 */

import { assertAddendumStakeholderMatchesLatestRequest } from '../stakeholder-intent-guard';

const structuralConsultant = {
    id: 'stakeholder-structural',
    name: 'Structural',
    stakeholderGroup: 'consultant',
    role: 'Structural Engineer',
    disciplineOrTrade: 'Structural',
};

const generalContractor = {
    id: 'stakeholder-general-contractor',
    name: 'General Contractor',
    stakeholderGroup: 'contractor',
    role: 'Builder',
    disciplineOrTrade: 'Construction',
};

const mechanicalConsultant = {
    id: 'stakeholder-mechanical',
    name: 'Mechanical',
    stakeholderGroup: 'consultant',
    role: 'Mechanical Engineer',
    disciplineOrTrade: 'Mechanical',
};

const structuralContractor = {
    id: 'stakeholder-structural-contractor',
    name: 'Structural Trade Contractor',
    stakeholderGroup: 'contractor',
    role: 'Trade Contractor',
    disciplineOrTrade: 'Structural',
};

describe('assertAddendumStakeholderMatchesLatestRequest', () => {
    it('blocks a stale structural consultant for a latest general-contractor addendum request', () => {
        expect(() =>
            assertAddendumStakeholderMatchesLatestRequest({
                latestUserMessage:
                    'Create an addendum to the general contractor, and attach the selected documents.',
                toolName: 'create_addendum',
                input: {
                    stakeholderId: 'stakeholder-structural',
                    content: 'Reports addendum',
                    documentIds: ['doc-1'],
                },
                stakeholder: structuralConsultant,
            })
        ).toThrow(/contractor recipient/);
    });

    it('allows a general contractor for a latest general-contractor addendum request', () => {
        expect(() =>
            assertAddendumStakeholderMatchesLatestRequest({
                latestUserMessage:
                    'Create an addendum to the general contractor, and attach the selected documents.',
                toolName: 'create_addendum',
                input: {
                    stakeholderId: 'stakeholder-general-contractor',
                    content: 'Reports addendum',
                    documentIds: ['doc-1'],
                },
                stakeholder: generalContractor,
            })
        ).not.toThrow();
    });

    it('blocks stale addendum content even when the recipient group is correct', () => {
        expect(() =>
            assertAddendumStakeholderMatchesLatestRequest({
                latestUserMessage:
                    'Create an addendum to the general contractor, and attach the selected documents.',
                toolName: 'create_addendum',
                input: {
                    stakeholderId: 'stakeholder-general-contractor',
                    content: 'Structural Update',
                    documentIds: ['doc-1'],
                },
                stakeholder: generalContractor,
            })
        ).toThrow(/stale discipline wording/);
    });

    it('blocks a trade-specific contractor for a latest general-contractor request', () => {
        expect(() =>
            assertAddendumStakeholderMatchesLatestRequest({
                latestUserMessage:
                    'Create an addendum to the general contractor, and attach the selected documents.',
                toolName: 'create_addendum',
                input: {
                    stakeholderId: 'stakeholder-structural-contractor',
                    content: 'Reports addendum',
                    documentIds: ['doc-1'],
                },
                stakeholder: structuralContractor,
            })
        ).toThrow(/general contractor/);
    });

    it('allows a matching structural consultant addendum request', () => {
        expect(() =>
            assertAddendumStakeholderMatchesLatestRequest({
                latestUserMessage:
                    'Create an addendum for the Structural consultant and attach the selected files.',
                toolName: 'create_addendum',
                input: {
                    stakeholderId: 'stakeholder-structural',
                    content: 'Structural Update',
                    documentIds: ['doc-1'],
                },
                stakeholder: structuralConsultant,
            })
        ).not.toThrow();
    });

    it('blocks the wrong consultant discipline for an explicit structural consultant request', () => {
        expect(() =>
            assertAddendumStakeholderMatchesLatestRequest({
                latestUserMessage:
                    'Create an addendum for the Structural consultant and attach the selected files.',
                toolName: 'create_addendum',
                input: {
                    stakeholderId: 'stakeholder-mechanical',
                    content: 'Consultant update',
                    documentIds: ['doc-1'],
                },
                stakeholder: mechanicalConsultant,
            })
        ).toThrow(/structural/);
    });
});
