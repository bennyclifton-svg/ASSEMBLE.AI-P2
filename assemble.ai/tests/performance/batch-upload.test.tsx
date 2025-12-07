import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { DocumentRepository } from '@/components/documents/DocumentRepository';
import '@testing-library/jest-dom';

// Mock fetch
global.fetch = jest.fn();

// Mock useToast
jest.mock('@/components/ui/use-toast', () => ({
    useToast: () => ({
        toast: jest.fn(),
    }),
}));

// Mock child components
jest.mock('@/components/documents/UploadZone', () => ({
    UploadZone: () => <div data-testid="upload-zone">Upload Zone</div>,
}));

jest.mock('@/components/documents/CategoryUploadTiles', () => ({
    CategoryUploadTiles: ({ onFilesDropped }: any) => (
        <button
            data-testid="batch-upload-btn"
            onClick={() => {
                // Create 50 files
                const files = Array.from({ length: 50 }, (_, i) =>
                    new File(['content'], `file-${i}.pdf`, { type: 'application/pdf' })
                );
                onFilesDropped(files, 'planning');
            }}
        >
            Batch Upload
        </button>
    ),
}));

jest.mock('@/components/documents/CategorizedList', () => ({
    CategorizedList: () => <div data-testid="categorized-list">List</div>,
}));

jest.mock('@/components/documents/UploadProgress', () => ({
    UploadProgress: () => <div data-testid="upload-progress">Progress</div>,
}));

describe('Batch Upload Performance', () => {
    test('uploads 50 files within 12 seconds (simulated latency)', async () => {
        // Simulate 200ms network latency per request
        (global.fetch as jest.Mock).mockImplementation(async () => {
            await new Promise(resolve => setTimeout(resolve, 200));
            return {
                ok: true,
                json: async () => ({ success: true }),
            };
        });

        render(
            <DocumentRepository
                projectId="test-project"
                selectedIds={new Set()}
                onSelectionChange={() => {}}
            />
        );

        const startTime = Date.now();

        // Trigger batch upload
        await act(async () => {
            fireEvent.click(screen.getByTestId('batch-upload-btn'));
        });

        // Wait for all fetches to complete
        await waitFor(() => {
            expect(global.fetch).toHaveBeenCalledTimes(50);
        }, { timeout: 15000 });

        const endTime = Date.now();
        const duration = endTime - startTime;

        console.log(`Batch upload duration: ${duration}ms`);

        // SC-001: <= 12 seconds
        expect(duration).toBeLessThanOrEqual(12000);
    }, 20000); // 20 second timeout for this test
});
