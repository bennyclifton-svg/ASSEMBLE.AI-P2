import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { CategoryTile } from '@/components/documents/CategoryTile';
import { ActiveCategory } from '@/lib/constants/categories';
import '@testing-library/jest-dom';

// Mock react-dropzone to control isDragActive state
let mockIsDragActive = false;
jest.mock('react-dropzone', () => ({
  useDropzone: jest.fn((options) => ({
    getRootProps: () => ({
      onDragEnter: () => { mockIsDragActive = true; },
      onDragLeave: () => { mockIsDragActive = false; },
    }),
    getInputProps: () => ({ type: 'file' }),
    isDragActive: mockIsDragActive,
  })),
}));

describe('CategoryTile - Visual Feedback (US3)', () => {
  const mockCategory: ActiveCategory = {
    id: 'planning',
    name: 'Planning',
    color: '#007ACC',
    row: 1,
    hasSubcategories: false,
  };

  const mockOnFilesDropped = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockIsDragActive = false;
  });

  test('applies hover state styling when drag is active', () => {
    // Set drag active state
    mockIsDragActive = true;

    const { container } = render(
      <CategoryTile
        category={mockCategory}
        onFilesDropped={mockOnFilesDropped}
      />
    );

    const tile = container.firstChild as HTMLElement;

    // Check for active drag styling
    expect(tile).toHaveClass('border-[#0e639c]');
    expect(tile).toHaveClass('bg-[#0e639c]/10');
    expect(tile).toHaveClass('scale-105');
  });

  test('applies default styling when not dragging', () => {
    mockIsDragActive = false;

    const { container } = render(
      <CategoryTile
        category={mockCategory}
        onFilesDropped={mockOnFilesDropped}
      />
    );

    const tile = container.firstChild as HTMLElement;

    // Check for default styling
    expect(tile).toHaveClass('border-[#3e3e42]');
    expect(tile).toHaveClass('bg-[#252526]');
    expect(tile).toHaveClass('hover:border-[#0e639c]/50');
    expect(tile).toHaveClass('hover:scale-102');
  });

  test('has transition classes for smooth animations', () => {
    const { container } = render(
      <CategoryTile
        category={mockCategory}
        onFilesDropped={mockOnFilesDropped}
      />
    );

    const tile = container.firstChild as HTMLElement;

    // Check for transition classes
    expect(tile).toHaveClass('transition-all');
    expect(tile).toHaveClass('duration-200');
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

    // Check for selection ring
    expect(tile).toHaveClass('ring-2');
    expect(tile).toHaveClass('ring-[#0e639c]');
    expect(tile).toHaveClass('ring-offset-2');
    expect(tile).toHaveClass('ring-offset-[#1e1e1e]');
  });

  test('shows expansion indicator animation', () => {
    const categoryWithSubs: ActiveCategory = {
      id: 'consultants',
      name: 'Consultants',
      color: '#00BCD4',
      row: 2,
      hasSubcategories: true,
      subcategories: [],
    };

    const { rerender } = render(
      <CategoryTile
        category={categoryWithSubs}
        onFilesDropped={mockOnFilesDropped}
        isExpanded={false}
      />
    );

    // Check collapsed state
    expect(screen.getByText(/▶/)).toBeInTheDocument();

    // Rerender with expanded state
    rerender(
      <CategoryTile
        category={categoryWithSubs}
        onFilesDropped={mockOnFilesDropped}
        isExpanded={true}
      />
    );

    // Check expanded state
    expect(screen.getByText(/▼/)).toBeInTheDocument();
  });

  test('applies category-specific color to left border', () => {
    const { container } = render(
      <CategoryTile
        category={mockCategory}
        onFilesDropped={mockOnFilesDropped}
      />
    );

    const tile = container.firstChild as HTMLElement;

    // Check for category color on left border
    expect(tile).toHaveStyle({
      borderLeftWidth: '4px',
      borderLeftColor: '#007ACC',
    });
  });

  test('applies correct size for subcategory tiles', () => {
    const { container } = render(
      <CategoryTile
        category={mockCategory}
        onFilesDropped={mockOnFilesDropped}
        isSubcategory={true}
      />
    );

    const tile = container.firstChild as HTMLElement;

    // Check for smaller size on subcategory
    expect(tile).toHaveClass('h-16'); // Smaller than h-20 for categories
    expect(tile).toHaveClass('px-3'); // Smaller padding
    expect(tile).toHaveClass('py-2');
  });

  test('applies correct size for main category tiles', () => {
    const { container } = render(
      <CategoryTile
        category={mockCategory}
        onFilesDropped={mockOnFilesDropped}
        isSubcategory={false}
      />
    );

    const tile = container.firstChild as HTMLElement;

    // Check for standard size on main category
    expect(tile).toHaveClass('h-20');
    expect(tile).toHaveClass('px-4');
    expect(tile).toHaveClass('py-3');
  });
});