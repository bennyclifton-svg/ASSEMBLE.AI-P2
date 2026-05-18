import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { KnowledgePanel } from '@/components/knowledge/KnowledgePanel';

const mockTriggerRefresh = jest.fn();

jest.mock('@/lib/hooks/use-knowledge-subcategories', () => ({
  useKnowledgeSubcategories: jest.fn(() => ({
    subcategories: {
      planning: [],
      procurement: [],
      delivery: [],
      authorities: [],
      'scheme-design': [],
      'detail-design': [],
      'ifc-design': [],
    },
    isLoading: false,
    error: null,
    createSubcategory: jest.fn(),
    updateSubcategory: jest.fn(),
    deleteSubcategory: jest.fn(),
    bulkDeleteSubcategories: jest.fn(),
    refetch: jest.fn(),
  })),
}));

jest.mock('@/lib/contexts/knowledge-subcategory-refresh-context', () => ({
  useKnowledgeSubcategoryRefresh: () => ({
    version: 0,
    triggerRefresh: mockTriggerRefresh,
  }),
}));

jest.mock('@/components/ui/aurora-confirm-dialog', () => ({
  AuroraConfirmDialog: () => null,
}));

describe('KnowledgePanel', () => {
  const projectId = 'project-1';

  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ categoryId: 'planning', isVisible: false }),
      }) as jest.Mock;
  });

  test('notifies active category consumers when repository visibility changes', async () => {
    render(<KnowledgePanel projectId={projectId} />);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(`/api/projects/${projectId}/category-visibility`);
    });

    fireEvent.click(screen.getAllByTitle('Visible in Document Repository')[0]);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        `/api/projects/${projectId}/category-visibility`,
        expect.objectContaining({
          method: 'PATCH',
          body: JSON.stringify({ categoryId: 'planning', isVisible: false }),
        })
      );
    });

    expect(mockTriggerRefresh).toHaveBeenCalledTimes(1);
  });
});
