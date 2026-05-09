import { render, screen, waitFor } from '@testing-library/react';
import { CorrespondencePanel } from '../CorrespondencePanel';

describe('CorrespondencePanel layout', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        global.fetch = jest.fn().mockResolvedValue({
            ok: true,
            json: async () => ({
                inbox: {
                    projectId: 'project-1',
                    localPart: 'project-1',
                    emailAddress: 'project-1@inbound.test',
                },
                correspondence: [
                    {
                        id: 'correspondence-1',
                        threadId: 'thread-1',
                        subject: 'Variation claim VO-MECH-017',
                        normalizedSubject: 'variation claim vo-mech-017',
                        fromName: 'ABC Constructions Pty Ltd',
                        fromEmail: 'contracts@abc.example',
                        toEmails: ['project-1@inbound.test'],
                        ccEmails: [],
                        bodyText: Array.from({ length: 40 }, (_, index) =>
                            `Long correspondence line ${index + 1}`
                        ).join('\n'),
                        correspondenceType: 'contractor_correspondence',
                        classificationStatus: 'suggested',
                        receivedAt: '2026-05-07T09:13:00.000Z',
                        sentAt: '2026-05-07T09:13:00.000Z',
                        attachmentCount: 0,
                        attachments: [],
                        variationTriage: null,
                    },
                ],
            }),
        }) as jest.Mock;
    });

    it('keeps the selected mail body in its own scroll region', async () => {
        render(<CorrespondencePanel projectId="project-1" />);

        await waitFor(() => {
            expect(screen.getByTestId('correspondence-body-scroll-region')).toBeInTheDocument();
        });

        expect(screen.getByTestId('correspondence-detail-pane')).toHaveClass(
            'min-h-0',
            'overflow-hidden'
        );
        expect(screen.getByTestId('correspondence-body-scroll-region')).toHaveClass(
            'min-h-0',
            'flex-1',
            'overflow-y-auto'
        );
    });
});
