import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { NotesPanel } from '../NotesPanel';
import type { Note, NoteType } from '@/types/notes-meetings-reports';
import { useNoteMutations, useNotes } from '@/lib/hooks/use-notes';
import { useUiPreferences } from '@/lib/hooks/use-ui-preferences';

jest.mock('@/lib/hooks/use-ui-preferences', () => ({
    useUiPreferences: jest.fn(),
}));

jest.mock('@/lib/hooks/use-notes', () => ({
    useNotes: jest.fn(),
    useNoteMutations: jest.fn(),
    useNoteDropUpload: jest.fn(() => ({
        isUploading: false,
        uploadProgress: null,
        isDragOver: false,
        getRootProps: () => ({}),
        getInputProps: () => ({}),
    })),
    useNoteTransmittal: jest.fn(() => ({
        documents: [],
        isLoading: false,
        error: null,
        saveTransmittal: jest.fn(),
        refetch: jest.fn(),
    })),
}));

const mockUseNotes = useNotes as jest.MockedFunction<typeof useNotes>;
const mockUseNoteMutations = useNoteMutations as jest.MockedFunction<typeof useNoteMutations>;
const mockUseUiPreferences = useUiPreferences as jest.MockedFunction<typeof useUiPreferences>;

const waitForBlankShellAutosaveWindow = () => new Promise((resolve) => setTimeout(resolve, 650));

function note(overrides: Partial<Note> & { id: string; type: NoteType }): Note & { transmittalCount: number } {
    return {
        id: overrides.id,
        projectId: 'project-1',
        organizationId: 'org-1',
        title: 'Existing record',
        content: null,
        isStarred: false,
        color: 'blue',
        type: overrides.type,
        status: 'open',
        noteDate: null,
        reportingPeriodStart: null,
        reportingPeriodEnd: null,
        createdAt: '2026-05-09T00:00:00.000Z',
        updatedAt: '2026-05-09T00:00:00.000Z',
        deletedAt: null,
        transmittalCount: 0,
        ...overrides,
    };
}

describe('NotesPanel', () => {
    const createNote = jest.fn();
    const updateNote = jest.fn();
    const deleteNote = jest.fn();
    const copyNote = jest.fn();
    const toggleStar = jest.fn();
    const updatePreferences = jest.fn();

    beforeEach(() => {
        jest.clearAllMocks();

        mockUseUiPreferences.mockReturnValue({
            preferences: {},
            updatePreferences,
            isLoading: false,
        });

        mockUseNotes.mockReturnValue({
            notes: [
                note({ id: 'review-1', type: 'review', title: 'Design review' }),
                note({ id: 'note-1', type: 'note', title: 'General note' }),
            ],
            total: 2,
            isLoading: false,
            error: null,
            refetch: jest.fn(),
        });

        createNote.mockResolvedValue(note({ id: 'created-1', type: 'review', title: 'New Record' }));
        updateNote.mockResolvedValue(note({ id: 'updated-1', type: 'review', title: 'Updated record' }));
        copyNote.mockResolvedValue(note({ id: 'copied-1', type: 'review', title: 'Copied record' }));

        mockUseNoteMutations.mockReturnValue({
            createNote,
            updateNote,
            deleteNote,
            copyNote,
            toggleStar,
        });
    });

    it('creates a new record with the currently filtered type', async () => {
        render(<NotesPanel projectId="project-1" projectName="Demo Project" />);

        fireEvent.click(screen.getByRole('button', { name: /^review\s+1$/i }));
        fireEvent.click(screen.getAllByRole('button', { name: /^new record$/i })[0]);

        await waitFor(() => {
            expect(createNote).toHaveBeenCalledWith(
                expect.objectContaining({
                    projectId: 'project-1',
                    type: 'review',
                    color: 'purple',
                })
            );
        });
    });

    it('deselects the active record on a second plain click', async () => {
        render(<NotesPanel projectId="project-1" projectName="Demo Project" />);

        expect(screen.queryByText('Record type')).not.toBeInTheDocument();
        expect(screen.getByText('Records / Note')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /^short$/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /^long$/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /^refresh record content$/i })).toBeInTheDocument();
        expect(screen.getByRole('heading', { name: /^new record$/i })).toBeInTheDocument();
        expect(screen.getByText("No documents attached. Click 'Save' to select documents from the repository.")).toBeInTheDocument();
        await waitForBlankShellAutosaveWindow();
        expect(createNote).not.toHaveBeenCalled();

        const reviewRow = screen.getByText('Design review').closest('tr');
        expect(reviewRow).not.toBeNull();

        fireEvent.click(reviewRow as HTMLElement);

        await waitFor(() => {
            expect(reviewRow).toHaveAttribute('aria-selected', 'true');
        });
        expect(screen.getByText('Records / Review')).toBeInTheDocument();

        fireEvent.click(reviewRow as HTMLElement);

        await waitFor(() => {
            expect(reviewRow).toHaveAttribute('aria-selected', 'false');
        });
        expect(screen.queryByText('Record type')).not.toBeInTheDocument();
        expect(screen.getByRole('heading', { name: /^new record$/i })).toBeInTheDocument();
        await waitForBlankShellAutosaveWindow();
        expect(reviewRow).toHaveAttribute('aria-selected', 'false');
        expect(createNote).not.toHaveBeenCalled();
    });

    it('reclassifies selected records when Ctrl-clicking a different type', async () => {
        render(<NotesPanel projectId="project-1" projectName="Demo Project" />);

        const reviewRow = screen.getByText('Design review').closest('tr');
        expect(reviewRow).not.toBeNull();

        fireEvent.click(reviewRow as HTMLElement);
        fireEvent.click(screen.getByRole('button', { name: /^RFI\s+0$/i }), { ctrlKey: true });

        await waitFor(() => {
            expect(updateNote).toHaveBeenCalledWith('review-1', {
                type: 'rfi',
                color: 'pink',
            });
        });
        expect(updateNote).toHaveBeenCalledTimes(1);
    });
});
