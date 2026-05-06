/**
 * @jest-environment node
 */

import { guardTenderFirmAgainstLatestRequest } from '../tender-firm-intent-guard';
import type { AgentMessage } from '../completion';

function user(content: string): AgentMessage {
    return { role: 'user', content };
}

const contactList = `1. Harbour Mechanical Services
Address: Level 3, 18 Kent Street, Sydney NSW 2000
Phone: 02 9188 4720
Email: tenders@harbourmechanical.com.au

2. Northline HVAC Contractors
Address: Unit 6, 42 Hume Road, Smithfield NSW 2164
Phone: 02 9725 3144
Email: estimating@northlinehvac.com.au`;

describe('guardTenderFirmAgainstLatestRequest', () => {
    it('allows follow-up firm lists to use the prior tender-panel context', () => {
        expect(() =>
            guardTenderFirmAgainstLatestRequest({
                latestUserMessage: contactList,
                toolName: 'add_tender_firms',
                input: {
                    firmType: 'consultant',
                    disciplineOrTrade: 'Mechanical',
                    firms: [
                        { companyName: 'Harbour Mechanical Services' },
                        { companyName: 'Northline HVAC Contractors' },
                    ],
                },
                history: [
                    user('add 3 firms to the Mechanical consultant tender.'),
                    { role: 'assistant', content: 'Please provide the names.' },
                    user(contactList),
                ],
            })
        ).not.toThrow();
    });

    it('blocks stale firm names that were reused from an older chat turn', () => {
        expect(() =>
            guardTenderFirmAgainstLatestRequest({
                latestUserMessage: contactList,
                toolName: 'add_tender_firms',
                input: {
                    firmType: 'consultant',
                    disciplineOrTrade: 'Mechanical',
                    firms: [{ companyName: 'Old Electrical Services' }],
                },
                history: [
                    user('add 3 firms to the Mechanical consultant tender.'),
                    { role: 'assistant', content: 'Please provide the names.' },
                    user(contactList),
                ],
            })
        ).toThrow(/firm names not present/);
    });

    it('blocks stale tender-panel type or discipline on follow-up lists', () => {
        expect(() =>
            guardTenderFirmAgainstLatestRequest({
                latestUserMessage: contactList,
                toolName: 'add_tender_firms',
                input: {
                    firmType: 'contractor',
                    disciplineOrTrade: 'Electrical',
                    firms: [{ companyName: 'Harbour Mechanical Services' }],
                },
                history: [
                    user('add 3 firms to the Mechanical consultant tender.'),
                    { role: 'assistant', content: 'Please provide the names.' },
                    user(contactList),
                ],
            })
        ).toThrow(/Mechanical consultant/);
    });

    it('lets the latest explicit panel request override older panel context', () => {
        expect(() =>
            guardTenderFirmAgainstLatestRequest({
                latestUserMessage: 'add 3 tenderers to the Mechanical contractor panel',
                toolName: 'add_tender_firms',
                input: {
                    firmType: 'consultant',
                    disciplineOrTrade: 'Mechanical',
                    firms: [{ companyName: 'Harbour Mechanical Services' }],
                },
                history: [
                    user('add 3 firms to the Electrical consultant tender.'),
                    { role: 'assistant', content: 'Please provide the names.' },
                    user('add 3 tenderers to the Mechanical contractor panel'),
                ],
            })
        ).toThrow(/Mechanical contractor/);
    });

    it('blocks stale firms when the latest explicit panel request does not name firms', () => {
        expect(() =>
            guardTenderFirmAgainstLatestRequest({
                latestUserMessage: 'add 3 firms to the Electrical consultant tender page',
                toolName: 'add_tender_firms',
                input: {
                    firmType: 'consultant',
                    disciplineOrTrade: 'Electrical',
                    firms: [
                        { companyName: 'Harbour Mechanical Services' },
                        { companyName: 'Northline HVAC Contractors' },
                        { companyName: 'Blue Ridge Mechanical' },
                    ],
                },
                history: [
                    user('add 3 firms to the Mechanical consultant tender.'),
                    user(contactList),
                    { role: 'assistant', content: 'I have put the proposed change in the approval card.' },
                    user('add 3 firms to the Electrical consultant tender page'),
                ],
            })
        ).toThrow(/does not supply those firm names/);
    });

    it('allows explicit firm names in the latest panel request', () => {
        expect(() =>
            guardTenderFirmAgainstLatestRequest({
                latestUserMessage:
                    'add Southern Grid Engineering Pty Ltd and Voltline Consulting Engineers to the Electrical consultant tender page',
                toolName: 'add_tender_firms',
                input: {
                    firmType: 'consultant',
                    disciplineOrTrade: 'Electrical',
                    firms: [
                        { companyName: 'Southern Grid Engineering Pty Ltd' },
                        { companyName: 'Voltline Consulting Engineers' },
                    ],
                },
                history: [
                    user('add Southern Grid Engineering Pty Ltd and Voltline Consulting Engineers to the Electrical consultant tender page'),
                ],
            })
        ).not.toThrow();
    });

    it('allows a latest request that explicitly reuses the same prior firms', () => {
        expect(() =>
            guardTenderFirmAgainstLatestRequest({
                latestUserMessage: 'add the same firms to the Electrical consultant tender page',
                toolName: 'add_tender_firms',
                input: {
                    firmType: 'consultant',
                    disciplineOrTrade: 'Electrical',
                    firms: [
                        { companyName: 'Harbour Mechanical Services' },
                        { companyName: 'Northline HVAC Contractors' },
                    ],
                },
                history: [
                    user('add 3 firms to the Mechanical consultant tender.'),
                    user(contactList),
                    user('add the same firms to the Electrical consultant tender page'),
                ],
            })
        ).not.toThrow();
    });

    it('asks for panel context when a firm list has no prior tender-panel request', () => {
        expect(() =>
            guardTenderFirmAgainstLatestRequest({
                latestUserMessage: contactList,
                toolName: 'add_tender_firms',
                input: {
                    firmType: 'consultant',
                    disciplineOrTrade: 'Mechanical',
                    firms: [{ companyName: 'Harbour Mechanical Services' }],
                },
                history: [user(contactList)],
            })
        ).toThrow(/no earlier tender-panel request/i);
    });

    it('handles orchestrator wrapper text by reading the original user request', () => {
        const wrappedLatest = `The Orchestrator routed this request to you as the Design Agent.

Routing note: this is tender-panel firm work.

Original user request:
${contactList}`;

        expect(() =>
            guardTenderFirmAgainstLatestRequest({
                latestUserMessage: wrappedLatest,
                toolName: 'add_tender_firms',
                input: {
                    firmType: 'consultant',
                    disciplineOrTrade: 'Mechanical',
                    firms: [{ companyName: 'Harbour Mechanical Services' }],
                },
                history: [
                    user('add 3 firms to the Mechanical consultant tender.'),
                    { role: 'assistant', content: 'Please provide the names.' },
                    user(wrappedLatest),
                ],
            })
        ).not.toThrow();
    });
});
