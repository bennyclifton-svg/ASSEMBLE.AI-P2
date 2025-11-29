import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { CategoryTile } from '@/components/documents/CategoryTile';
import { ActiveCategory, Subcategory } from '@/lib/constants/categories';
import '@testing-library/jest-dom';

// Mock react-dropzone
jest.mock('react-dropzone', () => ({
  useDropzone: jest.fn((options) => ({
    getRootProps: () => ({
      onDragOver: jest.fn(),
      onDragLeave: jest.fn(),
      onDrop: (e: any) => {
        const files = e.dataTransfer?.files ? Array.from(e.dataTransfer.files) : [];
        options.onDrop(files);
      },
    }),
    getInputProps: () => ({ type: 'file' }),
    isDragActive: false,
  })),
}));

describe('CategoryTile', () => {
  const mockCategory: ActiveCategory = {
    id: 'planning',
    name: 'Planning',
    color: '#007ACC',
    row: 1,
    hasSubcategories: false,
  };

  const mockCategoryWithSubs: ActiveCategory = {
    id: 'consultants',
    name: 'Consultants',
    color: '#00BCD4',
    row: 2,
    hasSubcategories: true,
    subcategorySource: 'consultants',
    subcategories: [
      { id: 'structural', name: 'Structural', parentCategoryId: 'consultants' },
      { id: 'mep', name: 'MEP', parentCategoryId: 'consultants' },
    ],
  };

  const mockSubcategory: Subcategory = {
    id: 'structural',
    name: 'Structural',
    parentCategoryId: 'consultants',
  };

  const mockOnFilesDropped = jest.fn();
  const mockOnClick = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders category tile with correct name', () => {
    render(
      <CategoryTile
        category={mockCategory}
        onFilesDropped={mockOnFilesDropped}
      />
    );

    expect(screen.getByText('Planning')).toBeInTheDocument();
  });

  test('renders subcategory tile with correct name', () => {
    render(
      <CategoryTile
        category={mockCategoryWithSubs}
        subcategory={mockSubcategory}
        onFilesDropped={mockOnFilesDropped}
        isSubcategory={true}
      />
    );

    expect(screen.getByText('Structural')).toBeInTheDocument();
  });

  test('displays expansion indicator for categories with subcategories', () => {
    render(
      <CategoryTile
        category={mockCategoryWithSubs}
        onFilesDropped={mockOnFilesDropped}
        onClick={mockOnClick}
        isExpanded={false}
      />
    );

    expect(screen.getByText(/▶/)).toBeInTheDocument();
    expect(screen.getByText(/2 items/)).toBeInTheDocument();
  });

  test('displays expanded indicator when expanded', () => {
    render(
      <CategoryTile
        category={mockCategoryWithSubs}
        onFilesDropped={mockOnFilesDropped}
        onClick={mockOnClick}
        isExpanded={true}
      />
    );

    expect(screen.getByText(/▼/)).toBeInTheDocument();
  });

  test('handles file drop on category without subcategories', async () => {
    const { container } = render(
      <CategoryTile
        category={mockCategory}
        onFilesDropped={mockOnFilesDropped}
      />
    );

    const dropzone = container.firstChild as HTMLElement;
    const files = [new File(['content'], 'test.pdf', { type: 'application/pdf' })];

    const dropEvent = new Event('drop', { bubbles: true });
    Object.defineProperty(dropEvent, 'dataTransfer', {
      value: { files },
    });

    fireEvent(dropzone, dropEvent);

    await waitFor(() => {
      expect(mockOnFilesDropped).toHaveBeenCalledWith(files, 'planning');
    });
  });

  test('handles file drop on subcategory', async () => {
    const { container } = render(
      <CategoryTile
        category={mockCategoryWithSubs}
        subcategory={mockSubcategory}
        onFilesDropped={mockOnFilesDropped}
        isSubcategory={true}
      />
    );

    const dropzone = container.firstChild as HTMLElement;
    const files = [new File(['content'], 'test.pdf', { type: 'application/pdf' })];

    const dropEvent = new Event('drop', { bubbles: true });
    Object.defineProperty(dropEvent, 'dataTransfer', {
      value: { files },
    });

    fireEvent(dropzone, dropEvent);

    await waitFor(() => {
      expect(mockOnFilesDropped).toHaveBeenCalledWith(files, 'consultants', 'structural');
    });
  });

  test('handles click for bulk categorization when documents are selected', () => {
    const { container } = render(
      <CategoryTile
        category={mockCategory}
        onFilesDropped={mockOnFilesDropped}
        hasSelection={true}
      />
    );

    const tile = container.firstChild as HTMLElement;
    fireEvent.click(tile);

    expect(mockOnFilesDropped).toHaveBeenCalledWith([], 'planning');
  });

  test('handles click to expand category with subcategories', () => {
    const { container } = render(
      <CategoryTile
        category={mockCategoryWithSubs}
        onFilesDropped={mockOnFilesDropped}
        onClick={mockOnClick}
        hasSelection={false}
      />
    );

    const tile = container.firstChild as HTMLElement;
    fireEvent.click(tile);

    expect(mockOnClick).toHaveBeenCalled();
    expect(mockOnFilesDropped).not.toHaveBeenCalled();
  });

  test('applies selection ring when documents are selected', () => {
    const { container } = render(
      <CategoryTile
        category={mockCategory}
        onFilesDropped={mockOnFilesDropped}
        hasSelection={true}
      />
    );

    const tile = container.firstChild as HTMLElement;
    expect(tile).toHaveClass('ring-2');
  });

  test('applies correct color from category', () => {
    const { container } = render(
      <CategoryTile
        category={mockCategory}
        onFilesDropped={mockOnFilesDropped}
      />
    );

    const tile = container.firstChild as HTMLElement;
    expect(tile).toHaveStyle({ borderLeftColor: '#007ACC' });
  });

  test('applies hover styles when drag is active', () => {
    // Override mock for this specific test
    const useDropzone = require('react-dropzone').useDropzone;
    useDropzone.mockImplementationOnce(() => ({
      getRootProps: () => ({
        onDragOver: jest.fn(),
        onDragLeave: jest.fn(),
        onDrop: jest.fn(),
      }),
      getInputProps: () => ({ type: 'file' }),
      isDragActive: true,
    }));

    const { container } = render(
      <CategoryTile
        category={mockCategory}
        onFilesDropped={mockOnFilesDropped}
      />
    );

    const tile = container.firstChild as HTMLElement;
    expect(tile).toHaveClass('scale-105');
    expect(tile).toHaveClass('ring-2');
  });
});