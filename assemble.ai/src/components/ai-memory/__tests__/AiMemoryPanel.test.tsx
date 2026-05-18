import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { AiMemoryPanel } from '../AiMemoryPanel';
import { useAiMemory, useAiMemoryMutations } from '@/lib/hooks/use-ai-memory';
import type { AiMemoryEntry } from '@/types/ai-memory';

jest.mock('@/lib/hooks/use-ai-memory', () => ({
    useAiMemory: jest.fn(),
    useAiMemoryMutations: jest.fn(),
}));

const mockUseAiMemory = useAiMemory as jest.MockedFunction<typeof useAiMemory>;
const mockUseAiMemoryMutations = useAiMemoryMutations as jest.MockedFunction<typeof useAiMemoryMutations>;

const createEntry = jest.fn();
const updateEntry = jest.fn();
const deleteEntry = jest.fn();

function memoryEntry(overrides: Partial<AiMemoryEntry> & { id: string; title: string }): AiMemoryEntry {
    return {
        id: overrides.id,
        projectId: 'project-1',
        organizationId: 'org-1',
        category: 'preference',
        title: overrides.title,
        content: 'Use concise commercial language.',
        status: 'active',
        source: 'manual',
        createdBy: 'user-1',
        updatedBy: 'user-1',
        createdAt: '2026-05-14T00:00:00.000Z',
        updatedAt: '2026-05-14T00:00:00.000Z',
        deletedAt: null,
        ...overrides,
    };
}

describe('AiMemoryPanel', () => {
    const entries = [
        memoryEntry({ id: 'memory-1', title: 'Reporting tone' }),
    ];

    beforeEach(() => {
        jest.clearAllMocks();

        mockUseAiMemory.mockReturnValue({
            entries,
            activeCount: 1,
            isLoading: false,
            error: null,
            refetch: jest.fn(),
        });
        createEntry.mockResolvedValue(memoryEntry({ id: 'memory-2', title: 'Preferred report voice' }));
        updateEntry.mockResolvedValue(memoryEntry({ id: 'memory-1', title: 'Updated tone' }));
        deleteEntry.mockResolvedValue(memoryEntry({
            id: 'memory-1',
            title: 'Reporting tone',
            status: 'inactive',
            deletedAt: '2026-05-14T01:00:00.000Z',
        }));
        mockUseAiMemoryMutations.mockReturnValue({
            createEntry,
            updateEntry,
            deleteEntry,
        });
    });

    test('renders memory entries with the advisory boundary', () => {
        render(<AiMemoryPanel projectId="project-1" projectName="Demo Project" />);

        expect(screen.getByText('AI Memory')).toBeInTheDocument();
        expect(screen.getAllByText('Reporting tone').length).toBeGreaterThan(0);
        expect(screen.getByText(/records and documents override memory/i)).toBeInTheDocument();
        expect(screen.getByText(/Do not use it as the source of truth/i)).toBeInTheDocument();
    });

    test('creates a new memory entry from the review form', async () => {
        render(<AiMemoryPanel projectId="project-1" projectName="Demo Project" />);

        fireEvent.click(screen.getByRole('button', { name: /new/i }));
        fireEvent.change(screen.getByLabelText('Title'), {
            target: { value: 'Preferred report voice' },
        });
        fireEvent.change(screen.getByLabelText('Memory'), {
            target: { value: 'Use commercial tone.' },
        });
        fireEvent.click(screen.getByRole('button', { name: /save/i }));

        await waitFor(() => {
            expect(createEntry).toHaveBeenCalledWith({
                category: 'preference',
                title: 'Preferred report voice',
                content: 'Use commercial tone.',
                status: 'active',
            });
        });
    });
});
