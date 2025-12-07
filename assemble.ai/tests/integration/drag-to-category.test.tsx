import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { DocumentRepository } from '@/components/documents/DocumentRepository';
import '@testing-library/jest-dom';

// Mock fetch
global.fetch = jest.fn();

// Mock the useToast hook
const mockToast = jest.fn();
jest.mock('@/components/ui/use-toast', () => ({
  useToast: () => ({
    toast: mockToast,
  }),
}));

// Mock the child components to simplify testing
jest.mock('@/components/documents/UploadZone', () => ({
  UploadZone: ({ onFilesSelected }: any) => (
    <div data-testid="upload-zone" onClick={() => onFilesSelected([])}>
      Upload Zone
    </div>
  ),
}));

jest.mock('@/components/documents/CategoryUploadTiles', () => ({
  CategoryUploadTiles: ({ onFilesDropped }: any) => (
    <div data-testid="category-tiles">
      <button
        data-testid="planning-tile"
        onClick={() => {
          const files = [new File(['test'], 'test.pdf', { type: 'application/pdf' })];
          onFilesDropped(files, 'planning');
        }}
      >
        Planning
      </button>
      <button
        data-testid="structural-tile"
        onClick={() => {
          const files = [new File(['test'], 'structural.pdf', { type: 'application/pdf' })];
          onFilesDropped(files, 'consultants', 'structural');
        }}
      >
        Structural (Consultants)
      </button>
      <button
        data-testid="multi-file-tile"
        onClick={() => {
          const files = [
            new File(['test1'], 'test1.pdf', { type: 'application/pdf' }),
            new File(['test2'], 'test2.pdf', { type: 'application/pdf' }),
          ];
          onFilesDropped(files, 'planning');
        }}
      >
        Multi File
      </button>
    </div>
  ),
}));

jest.mock('@/components/documents/CategorizedList', () => ({
  CategorizedList: () => <div data-testid="categorized-list">Categorized List</div>,
}));

jest.mock('@/components/documents/UploadProgress', () => ({
  UploadProgress: () => <div data-testid="upload-progress">Upload Progress</div>,
}));

describe('Drag-to-Category Integration', () => {
  const mockProjectId = 'test-project';

  beforeEach(() => {
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockClear();
  });

  test('uploads file to category when dropped on category tile and shows toast', async () => {
    (global.fetch as jest.Mock).mockImplementation((url, options) => {
      if (url === '/api/documents' && options?.method === 'POST') {
        const formData = options.body as FormData;
        const categoryId = formData.get('categoryId');

        return Promise.resolve({
          ok: true,
          json: async () => ({
            success: true,
            documentId: 'doc-123',
            versionId: 'v-123',
            versionNumber: 1,
            categoryId,
          }),
        });
      }
      return Promise.resolve({
        ok: true,
        json: async () => [],
      });
    });

    render(
      <DocumentRepository
        projectId={mockProjectId}
        selectedIds={new Set()}
        onSelectionChange={() => {}}
      />
    );

    // Click the Planning tile to trigger file upload
    const planningTile = screen.getByTestId('planning-tile');
    fireEvent.click(planningTile);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/documents',
        expect.objectContaining({
          method: 'POST',
          body: expect.any(FormData),
        })
      );
    });

    // Verify the FormData contained the correct categoryId
    const calls = (global.fetch as jest.Mock).mock.calls;
    const uploadCall = calls.find(call => call[0] === '/api/documents');
    const formData = uploadCall[1].body as FormData;
    expect(formData.get('categoryId')).toBe('planning');
    expect(formData.get('projectId')).toBe(mockProjectId);

    // Verify toast notification
    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({
        title: 'Upload complete',
        description: expect.stringContaining('1 file(s) → Planning'),
      }));
    });
  });

  test('uploads file to subcategory when dropped on subcategory tile', async () => {
    (global.fetch as jest.Mock).mockImplementation((url, options) => {
      if (url === '/api/documents' && options?.method === 'POST') {
        const formData = options.body as FormData;
        const categoryId = formData.get('categoryId');
        const subcategoryId = formData.get('subcategoryId');

        return Promise.resolve({
          ok: true,
          json: async () => ({
            success: true,
            documentId: 'doc-456',
            versionId: 'v-456',
            versionNumber: 1,
            categoryId,
            subcategoryId,
          }),
        });
      }
      return Promise.resolve({
        ok: true,
        json: async () => [],
      });
    });

    render(
      <DocumentRepository
        projectId={mockProjectId}
        selectedIds={new Set()}
        onSelectionChange={() => {}}
      />
    );

    // Click the Structural tile to trigger file upload
    const structuralTile = screen.getByTestId('structural-tile');
    fireEvent.click(structuralTile);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/documents',
        expect.objectContaining({
          method: 'POST',
          body: expect.any(FormData),
        })
      );
    });

    // Verify the FormData contained the correct categoryId and subcategoryId
    const calls = (global.fetch as jest.Mock).mock.calls;
    const uploadCall = calls.find(call => call[0] === '/api/documents');
    const formData = uploadCall[1].body as FormData;
    expect(formData.get('categoryId')).toBe('consultants');
    expect(formData.get('subcategoryId')).toBe('structural');
  });

  test('uploads multiple files and shows correct toast count', async () => {
    let uploadCount = 0;
    (global.fetch as jest.Mock).mockImplementation((url, options) => {
      if (url === '/api/documents' && options?.method === 'POST') {
        uploadCount++;
        return Promise.resolve({
          ok: true,
          json: async () => ({
            success: true,
            documentId: `doc-${uploadCount}`,
            versionId: `v-${uploadCount}`,
            versionNumber: 1,
          }),
        });
      }
      return Promise.resolve({
        ok: true,
        json: async () => [],
      });
    });

    render(
      <DocumentRepository
        projectId={mockProjectId}
        selectedIds={new Set()}
        onSelectionChange={() => {}}
      />
    );

    // Click the Multi File tile
    const multiFileTile = screen.getByTestId('multi-file-tile');
    fireEvent.click(multiFileTile);

    // Verify multiple uploads happened
    await waitFor(() => {
      expect(uploadCount).toBe(2);
    });

    // Verify toast notification with correct count
    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({
        title: 'Upload complete',
        description: expect.stringContaining('2 file(s) → Planning'),
      }));
    });
  });

  test('handles upload errors gracefully and shows error toast', async () => {
    (global.fetch as jest.Mock).mockImplementation((url) => {
      if (url === '/api/documents') {
        return Promise.resolve({
          ok: false,
          status: 500,
          json: async () => ({ error: 'Upload failed' }),
        });
      }
      return Promise.resolve({
        ok: true,
        json: async () => [],
      });
    });

    render(
      <DocumentRepository
        projectId={mockProjectId}
        selectedIds={new Set()}
        onSelectionChange={() => {}}
      />
    );

    // Click the Planning tile to trigger file upload
    const planningTile = screen.getByTestId('planning-tile');
    fireEvent.click(planningTile);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/documents',
        expect.objectContaining({
          method: 'POST',
        })
      );
    });

    // Verify error toast
    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({
        title: 'Upload error',
        variant: 'destructive',
      }));
    });
  });
});