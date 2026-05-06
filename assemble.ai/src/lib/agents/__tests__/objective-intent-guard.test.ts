/**
 * @jest-environment node
 */

import { guardProjectObjectivesAgainstLatestRequest } from '../objective-intent-guard';

describe('guardProjectObjectivesAgainstLatestRequest', () => {
    it('blocks stale objective text from an earlier explicit objective request', () => {
        expect(() =>
            guardProjectObjectivesAgainstLatestRequest({
                latestUserMessage:
                    'Specify induction cooktops, engineered timber flooring, full height tiles to wet areas, and curtains to the objectives.',
                toolName: 'set_project_objectives',
                input: {
                    mode: 'append',
                    functional: [
                        'Incorporate air conditioning systems to ensure thermal comfort and energy efficiency in accordance with NCC requirements.',
                    ],
                },
            })
        ).toThrow(/earlier chat turns/);
    });

    it('allows objective items that overlap the latest explicit request', () => {
        expect(() =>
            guardProjectObjectivesAgainstLatestRequest({
                latestUserMessage:
                    'Specify induction cooktops, engineered timber flooring, full height tiles to wet areas, and curtains to the objectives.',
                toolName: 'set_project_objectives',
                input: {
                    mode: 'append',
                    quality: [
                        'Specify induction cooktops in the kitchen finishes.',
                        'Use engineered timber flooring for durability and aesthetic appeal.',
                        'Use full height tiles in wet areas for improved water resistance.',
                        'Include curtains as window treatments to support privacy and light control.',
                    ],
                },
            })
        ).not.toThrow();
    });

    it('does not restrict open-ended objective generation requests', () => {
        expect(() =>
            guardProjectObjectivesAgainstLatestRequest({
                latestUserMessage: 'Populate the project objectives.',
                toolName: 'set_project_objectives',
                input: {
                    mode: 'replace',
                    functional: [
                        'Provide efficient apartment layouts with clear circulation and practical storage.',
                    ],
                    compliance: [
                        'Maintain compliance with NCC, planning controls, and relevant Australian Standards.',
                    ],
                },
            })
        ).not.toThrow();
    });

    it('ignores unrelated tools', () => {
        expect(() =>
            guardProjectObjectivesAgainstLatestRequest({
                latestUserMessage:
                    'Specify induction cooktops, engineered timber flooring, full height tiles to wet areas, and curtains to the objectives.',
                toolName: 'create_note',
                input: {
                    title: 'Air conditioning review',
                },
            })
        ).not.toThrow();
    });
});
