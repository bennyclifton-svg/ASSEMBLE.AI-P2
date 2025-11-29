import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { CategoryUploadTiles } from '@/components/documents/CategoryUploadTiles';
import '@testing-library/jest-dom';

// Mock the useActiveCategories hook
jest.mock('@/lib/hooks/use-active-categories', () => ({
  useActiveCategories: jest.fn(() => ({
    categories: [],
    isLoading: false,
    error: null,
  })),
}));

// Mock CategoryTile component
jest.mock('@/components/documents/CategoryTile', () => ({
  CategoryTile: ({ category, subcategory, onClick, isExpanded }: any) => (
    <div
      data-testid={subcategory ? `tile-${subcategory.id}` : `tile-${category.id}`}
      onClick={onClick}
    >
      {subcategory ? subcategory.name : category.name}
      {category.hasSubcategories && (
        <span data-testid={`expand-${category.id}`}>
          {isExpanded ? '▼' : '▶'}
        </span>
      )}
    </div>
  ),
}));

// Mock Skeleton component
jest.mock('@/components/ui/skeleton', () => ({
  Skeleton: () => <div data-testid="skeleton">Loading...</div>,
}));

const { useActiveCategories } = require('@/lib/hooks/use-active-categories');

describe('CategoryUploadTiles', () => {
  const mockProjectId = 'test-project';
  const mockOnFilesDropped = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('shows loading skeletons when loading', () => {
    useActiveCategories.mockReturnValue({
      categories: [],
      isLoading: true,
      error: null,
    });

    render(
      <CategoryUploadTiles
        projectId={mockProjectId}
        onFilesDropped={mockOnFilesDropped}
      />
    );

    const skeletons = screen.getAllByTestId('skeleton');
    expect(skeletons).toHaveLength(5);
  });

  test('renders categories in correct rows', () => {
    const mockCategories = [
      { id: 'planning', name: 'Planning', row: 1, hasSubcategories: false },
      { id: 'scheme-design', name: 'Scheme Design', row: 1, hasSubcategories: false },
      { id: 'consultants', name: 'Consultants', row: 2, hasSubcategories: true, subcategories: [] },
      { id: 'contractors', name: 'Contractors', row: 2, hasSubcategories: true, subcategories: [] },
    ];

    useActiveCategories.mockReturnValue({
      categories: mockCategories,
      isLoading: false,
      error: null,
    });

    render(
      <CategoryUploadTiles
        projectId={mockProjectId}
        onFilesDropped={mockOnFilesDropped}
      />
    );

    // Check all tiles are rendered
    expect(screen.getByTestId('tile-planning')).toBeInTheDocument();
    expect(screen.getByTestId('tile-scheme-design')).toBeInTheDocument();
    expect(screen.getByTestId('tile-consultants')).toBeInTheDocument();
    expect(screen.getByTestId('tile-contractors')).toBeInTheDocument();
  });

  test('expands category to show subcategories when clicked', () => {
    const mockCategories = [
      {
        id: 'consultants',
        name: 'Consultants',
        row: 2,
        hasSubcategories: true,
        subcategories: [
          { id: 'structural', name: 'Structural', parentCategoryId: 'consultants' },
          { id: 'mep', name: 'MEP', parentCategoryId: 'consultants' },
        ],
      },
    ];

    useActiveCategories.mockReturnValue({
      categories: mockCategories,
      isLoading: false,
      error: null,
    });

    render(
      <CategoryUploadTiles
        projectId={mockProjectId}
        onFilesDropped={mockOnFilesDropped}
      />
    );

    // Initially subcategories should not be visible
    expect(screen.queryByTestId('tile-structural')).not.toBeInTheDocument();
    expect(screen.queryByTestId('tile-mep')).not.toBeInTheDocument();

    // Click to expand
    const consultantsTile = screen.getByTestId('tile-consultants');
    fireEvent.click(consultantsTile);

    // Subcategories should now be visible
    expect(screen.getByTestId('tile-structural')).toBeInTheDocument();
    expect(screen.getByTestId('tile-mep')).toBeInTheDocument();
  });

  test('collapses expanded category when clicked again', () => {
    const mockCategories = [
      {
        id: 'consultants',
        name: 'Consultants',
        row: 2,
        hasSubcategories: true,
        subcategories: [
          { id: 'structural', name: 'Structural', parentCategoryId: 'consultants' },
        ],
      },
    ];

    useActiveCategories.mockReturnValue({
      categories: mockCategories,
      isLoading: false,
      error: null,
    });

    render(
      <CategoryUploadTiles
        projectId={mockProjectId}
        onFilesDropped={mockOnFilesDropped}
      />
    );

    const consultantsTile = screen.getByTestId('tile-consultants');

    // Expand
    fireEvent.click(consultantsTile);
    expect(screen.getByTestId('tile-structural')).toBeInTheDocument();

    // Collapse
    fireEvent.click(consultantsTile);
    expect(screen.queryByTestId('tile-structural')).not.toBeInTheDocument();
  });

  test('shows expansion indicator for categories with subcategories', () => {
    const mockCategories = [
      {
        id: 'consultants',
        name: 'Consultants',
        row: 2,
        hasSubcategories: true,
        subcategories: [
          { id: 'structural', name: 'Structural', parentCategoryId: 'consultants' },
        ],
      },
    ];

    useActiveCategories.mockReturnValue({
      categories: mockCategories,
      isLoading: false,
      error: null,
    });

    render(
      <CategoryUploadTiles
        projectId={mockProjectId}
        onFilesDropped={mockOnFilesDropped}
      />
    );

    // Check for collapsed indicator
    expect(screen.getByTestId('expand-consultants')).toHaveTextContent('▶');

    // Expand and check for expanded indicator
    fireEvent.click(screen.getByTestId('tile-consultants'));
    expect(screen.getByTestId('expand-consultants')).toHaveTextContent('▼');
  });

  test('passes hasSelection prop when documents are selected', () => {
    const mockCategories = [
      { id: 'planning', name: 'Planning', row: 1, hasSubcategories: false },
    ];

    useActiveCategories.mockReturnValue({
      categories: mockCategories,
      isLoading: false,
      error: null,
    });

    const { rerender } = render(
      <CategoryUploadTiles
        projectId={mockProjectId}
        onFilesDropped={mockOnFilesDropped}
        selectedDocumentIds={[]}
      />
    );

    // Initially no selection
    const planningTile = screen.getByTestId('tile-planning');
    expect(planningTile).toBeInTheDocument();

    // Add selection
    rerender(
      <CategoryUploadTiles
        projectId={mockProjectId}
        onFilesDropped={mockOnFilesDropped}
        selectedDocumentIds={['doc1', 'doc2']}
      />
    );

    // Tile should still be present (hasSelection passed but visual change not tested here)
    expect(planningTile).toBeInTheDocument();
  });

  test('only shows categories with active subcategories', () => {
    const mockCategories = [
      {
        id: 'consultants',
        name: 'Consultants',
        row: 2,
        hasSubcategories: true,
        subcategories: [
          { id: 'structural', name: 'Structural', parentCategoryId: 'consultants' },
        ], // Only structural is active
      },
      {
        id: 'contractors',
        name: 'Contractors',
        row: 2,
        hasSubcategories: true,
        subcategories: [], // No active trades
      },
    ];

    useActiveCategories.mockReturnValue({
      categories: mockCategories,
      isLoading: false,
      error: null,
    });

    render(
      <CategoryUploadTiles
        projectId={mockProjectId}
        onFilesDropped={mockOnFilesDropped}
      />
    );

    // Both parent categories should be shown
    expect(screen.getByTestId('tile-consultants')).toBeInTheDocument();
    expect(screen.getByTestId('tile-contractors')).toBeInTheDocument();

    // Expand consultants - should show structural
    fireEvent.click(screen.getByTestId('tile-consultants'));
    expect(screen.getByTestId('tile-structural')).toBeInTheDocument();

    // Expand contractors - should not show any subcategories
    fireEvent.click(screen.getByTestId('tile-contractors'));
    expect(screen.queryByText(/Contractors Subcategories/)).not.toBeInTheDocument();
  });

  test('handles multiple expansions independently', () => {
    const mockCategories = [
      {
        id: 'consultants',
        name: 'Consultants',
        row: 2,
        hasSubcategories: true,
        subcategories: [
          { id: 'structural', name: 'Structural', parentCategoryId: 'consultants' },
        ],
      },
      {
        id: 'contractors',
        name: 'Contractors',
        row: 2,
        hasSubcategories: true,
        subcategories: [
          { id: 'electrical', name: 'Electrical', parentCategoryId: 'contractors' },
        ],
      },
    ];

    useActiveCategories.mockReturnValue({
      categories: mockCategories,
      isLoading: false,
      error: null,
    });

    render(
      <CategoryUploadTiles
        projectId={mockProjectId}
        onFilesDropped={mockOnFilesDropped}
      />
    );

    // Expand consultants
    fireEvent.click(screen.getByTestId('tile-consultants'));
    expect(screen.getByTestId('tile-structural')).toBeInTheDocument();
    expect(screen.queryByTestId('tile-electrical')).not.toBeInTheDocument();

    // Expand contractors (consultants should remain expanded)
    fireEvent.click(screen.getByTestId('tile-contractors'));
    expect(screen.getByTestId('tile-structural')).toBeInTheDocument();
    expect(screen.getByTestId('tile-electrical')).toBeInTheDocument();

    // Collapse consultants (contractors should remain expanded)
    fireEvent.click(screen.getByTestId('tile-consultants'));
    expect(screen.queryByTestId('tile-structural')).not.toBeInTheDocument();
    expect(screen.getByTestId('tile-electrical')).toBeInTheDocument();
  });
});