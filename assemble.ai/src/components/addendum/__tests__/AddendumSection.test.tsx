import { act, render } from '@testing-library/react';
import { AddendumSection } from '../AddendumSection';
import { ADDENDUM_CREATED_EVENT } from '@/lib/chat/addendum-events';

const mockSetActiveAddendumId = jest.fn();
const mockSetExpanded = jest.fn();

jest.mock('@/lib/contexts/procurement-ui-context', () => ({
    useAddendumSectionUI: () => ({
        isExpanded: false,
        activeAddendumId: 'addendum-1',
        setExpanded: mockSetExpanded,
        setActiveAddendumId: mockSetActiveAddendumId,
    }),
}));

jest.mock('@/lib/hooks/use-addenda', () => ({
    useAddenda: () => ({
        addenda: [
            {
                id: 'addendum-1',
                projectId: 'project-1',
                stakeholderId: 'stakeholder-structural',
                addendumNumber: 1,
                content: 'Existing addendum',
                addendumDate: null,
                transmittalCount: 0,
                createdAt: '2026-05-03T00:00:00.000Z',
                updatedAt: '2026-05-03T00:00:00.000Z',
            },
            {
                id: 'addendum-2',
                projectId: 'project-1',
                stakeholderId: 'stakeholder-structural',
                addendumNumber: 2,
                content: 'Structural Update',
                addendumDate: null,
                transmittalCount: 36,
                createdAt: '2026-05-03T00:01:00.000Z',
                updatedAt: '2026-05-03T00:01:00.000Z',
            },
        ],
        isLoading: false,
        createAddendum: jest.fn(),
        updateContent: jest.fn(),
        updateDate: jest.fn(),
        deleteAddendum: jest.fn(),
    }),
}));

jest.mock('@/lib/hooks/use-addendum-transmittal', () => ({
    useAddendumTransmittal: () => ({
        transmittal: null,
        saveTransmittal: jest.fn(),
        loadTransmittal: jest.fn(() => []),
        hasTransmittal: false,
        documentCount: 0,
    }),
}));

jest.mock('../AddendumTabs', () => ({
    AddendumTabs: () => <div data-testid="addendum-tabs" />,
}));

jest.mock('../AddendumContent', () => ({
    AddendumContent: () => <div data-testid="addendum-content" />,
}));

jest.mock('../AddendumTransmittalSchedule', () => ({
    AddendumTransmittalSchedule: () => <div data-testid="addendum-transmittal" />,
}));

describe('AddendumSection', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('focuses a newly applied chat-created addendum for the matching stakeholder', () => {
        render(
            <AddendumSection
                projectId="project-1"
                stakeholderId="stakeholder-structural"
                stakeholderName="Structural"
            />
        );

        act(() => {
            window.dispatchEvent(
                new CustomEvent(ADDENDUM_CREATED_EVENT, {
                    detail: {
                        projectId: 'project-1',
                        stakeholderId: 'stakeholder-structural',
                        addendumId: 'addendum-2',
                    },
                })
            );
        });

        expect(mockSetActiveAddendumId).toHaveBeenCalledWith('addendum-2');
        expect(mockSetExpanded).toHaveBeenCalledWith(true);
    });

    it('ignores chat-created addenda for other stakeholders', () => {
        render(
            <AddendumSection
                projectId="project-1"
                stakeholderId="stakeholder-structural"
                stakeholderName="Structural"
            />
        );

        act(() => {
            window.dispatchEvent(
                new CustomEvent(ADDENDUM_CREATED_EVENT, {
                    detail: {
                        projectId: 'project-1',
                        stakeholderId: 'stakeholder-hydraulic',
                        addendumId: 'addendum-3',
                    },
                })
            );
        });

        expect(mockSetActiveAddendumId).not.toHaveBeenCalledWith('addendum-3');
    });
});
