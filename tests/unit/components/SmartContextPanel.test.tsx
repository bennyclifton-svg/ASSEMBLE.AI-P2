/**
 * T062: SmartContextPanel Unit Tests
 * Tests source display, relevance scores, toggles, and progress bars
 */

import React from 'react';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { SmartContextPanel } from '@/components/reports/SmartContextPanel';
import '@testing-library/jest-dom';

// Mock lucide-react icons
jest.mock('lucide-react', () => ({
  FileText: () => <span data-testid="icon-file-text">FileText</span>,
  ExternalLink: () => <span data-testid="icon-external-link">ExternalLink</span>,
  ChevronDown: () => <span data-testid="icon-chevron-down">ChevronDown</span>,
  ChevronRight: () => <span data-testid="icon-chevron-right">ChevronRight</span>,
  Check: () => <span data-testid="icon-check">Check</span>,
  X: () => <span data-testid="icon-x">X</span>,
}));

describe('SmartContextPanel', () => {
  const mockSources = [
    {
      id: 'chunk-1',
      documentId: 'doc-1',
      documentName: 'Fire Detection Spec Rev 2.pdf',
      chunkIndex: 0,
      content: 'This section covers fire detection systems including smoke detectors, heat sensors, and alarm panels.',
      relevanceScore: 95,
      metadata: {
        page: 12,
        section: 'Section 3.2 - Detection Equipment',
        category: 'Fire Services',
      },
    },
    {
      id: 'chunk-2',
      documentId: 'doc-2',
      documentName: 'AS1851-2012.pdf',
      chunkIndex: 3,
      content: 'Maintenance requirements for fire protection systems shall comply with AS1851.',
      relevanceScore: 87,
      metadata: {
        section: 'Clause 7.4 - Maintenance Requirements',
        category: 'Standards',
      },
    },
    {
      id: 'chunk-3',
      documentId: 'doc-3',
      documentName: 'Project Brief v1.3',
      chunkIndex: 1,
      content: 'The fire strategy shall include both active and passive fire protection measures.',
      relevanceScore: 72,
      metadata: {
        section: 'Fire Strategy Overview',
      },
    },
    {
      id: 'chunk-4',
      documentId: 'doc-4',
      documentName: 'Meeting Notes Oct 12',
      chunkIndex: 0,
      content: 'Discussion of sprinkler options for the basement level parking.',
      relevanceScore: 41,
    },
  ];

  const mockOnToggle = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Source Display', () => {
    test('renders all sources', () => {
      render(
        <SmartContextPanel
          sources={mockSources}
          excludedIds={[]}
          onToggle={mockOnToggle}
        />
      );

      expect(screen.getByText('Fire Detection Spec Rev 2.pdf')).toBeInTheDocument();
      expect(screen.getByText('AS1851-2012.pdf')).toBeInTheDocument();
      expect(screen.getByText('Project Brief v1.3')).toBeInTheDocument();
      expect(screen.getByText('Meeting Notes Oct 12')).toBeInTheDocument();
    });

    test('displays included count correctly', () => {
      render(
        <SmartContextPanel
          sources={mockSources}
          excludedIds={['chunk-4']}
          onToggle={mockOnToggle}
        />
      );

      expect(screen.getByText(/3\/4 included/)).toBeInTheDocument();
    });

    test('displays all included when none excluded', () => {
      render(
        <SmartContextPanel
          sources={mockSources}
          excludedIds={[]}
          onToggle={mockOnToggle}
        />
      );

      expect(screen.getByText(/4\/4 included/)).toBeInTheDocument();
    });

    test('displays empty state when no sources', () => {
      render(
        <SmartContextPanel
          sources={[]}
          excludedIds={[]}
          onToggle={mockOnToggle}
        />
      );

      expect(screen.getByText(/No sources retrieved for this section/)).toBeInTheDocument();
    });
  });

  describe('Relevance Scores (0-100%)', () => {
    test('displays relevance score as percentage for high relevance (>=80)', () => {
      render(
        <SmartContextPanel
          sources={[mockSources[0]]} // 95% relevance
          excludedIds={[]}
          onToggle={mockOnToggle}
        />
      );

      expect(screen.getByText(/High/)).toBeInTheDocument();
      expect(screen.getByText(/95%/)).toBeInTheDocument();
    });

    test('displays relevance score as percentage for medium relevance (60-79)', () => {
      render(
        <SmartContextPanel
          sources={[mockSources[2]]} // 72% relevance
          excludedIds={[]}
          onToggle={mockOnToggle}
        />
      );

      expect(screen.getByText(/Medium/)).toBeInTheDocument();
      expect(screen.getByText(/72%/)).toBeInTheDocument();
    });

    test('displays relevance score as percentage for low relevance (<60)', () => {
      render(
        <SmartContextPanel
          sources={[mockSources[3]]} // 41% relevance
          excludedIds={[]}
          onToggle={mockOnToggle}
        />
      );

      expect(screen.getByText(/Low/)).toBeInTheDocument();
      expect(screen.getByText(/41%/)).toBeInTheDocument();
    });

    test('applies correct color class for high relevance', () => {
      const { container } = render(
        <SmartContextPanel
          sources={[mockSources[0]]}
          excludedIds={[]}
          onToggle={mockOnToggle}
        />
      );

      const scoreElement = container.querySelector('.text-green-600');
      expect(scoreElement).toBeInTheDocument();
    });

    test('applies correct color class for medium relevance', () => {
      const { container } = render(
        <SmartContextPanel
          sources={[mockSources[2]]}
          excludedIds={[]}
          onToggle={mockOnToggle}
        />
      );

      const scoreElement = container.querySelector('.text-yellow-600');
      expect(scoreElement).toBeInTheDocument();
    });

    test('applies correct color class for low relevance', () => {
      const { container } = render(
        <SmartContextPanel
          sources={[mockSources[3]]}
          excludedIds={[]}
          onToggle={mockOnToggle}
        />
      );

      const scoreElement = container.querySelector('.text-red-600');
      expect(scoreElement).toBeInTheDocument();
    });
  });

  describe('Source Toggle', () => {
    test('calls onToggle when include button is clicked', () => {
      render(
        <SmartContextPanel
          sources={mockSources}
          excludedIds={[]}
          onToggle={mockOnToggle}
        />
      );

      // Find toggle buttons (they show Check icon when included)
      const toggleButtons = screen.getAllByRole('button').filter(btn =>
        btn.querySelector('[data-testid="icon-check"]') || btn.querySelector('[data-testid="icon-x"]')
      );

      fireEvent.click(toggleButtons[0]);

      expect(mockOnToggle).toHaveBeenCalledWith('chunk-1');
    });

    test('displays X icon for excluded sources', () => {
      render(
        <SmartContextPanel
          sources={mockSources}
          excludedIds={['chunk-1']}
          onToggle={mockOnToggle}
        />
      );

      // The excluded source should show X icon
      const firstSource = screen.getByText('Fire Detection Spec Rev 2.pdf').closest('div')?.parentElement;
      expect(firstSource?.querySelector('[data-testid="icon-x"]')).toBeInTheDocument();
    });

    test('displays Check icon for included sources', () => {
      render(
        <SmartContextPanel
          sources={mockSources}
          excludedIds={[]}
          onToggle={mockOnToggle}
        />
      );

      // All sources should show Check icon
      const checkIcons = screen.getAllByTestId('icon-check');
      expect(checkIcons.length).toBe(4);
    });

    test('applies opacity styling to excluded sources', () => {
      const { container } = render(
        <SmartContextPanel
          sources={mockSources}
          excludedIds={['chunk-1']}
          onToggle={mockOnToggle}
        />
      );

      // The first source card should have opacity-50 class
      const sourceCards = container.querySelectorAll('.border.rounded-lg');
      expect(sourceCards[0]).toHaveClass('opacity-50');
    });

    test('shows tip when sources are excluded', () => {
      render(
        <SmartContextPanel
          sources={mockSources}
          excludedIds={['chunk-1']}
          onToggle={mockOnToggle}
        />
      );

      expect(screen.getByText(/Excluded sources will not be used when regenerating/)).toBeInTheDocument();
    });

    test('does not show tip when no sources excluded', () => {
      render(
        <SmartContextPanel
          sources={mockSources}
          excludedIds={[]}
          onToggle={mockOnToggle}
        />
      );

      expect(screen.queryByText(/Excluded sources will not be used/)).not.toBeInTheDocument();
    });
  });

  describe('Source Expansion', () => {
    test('expands source to show content when clicked', () => {
      render(
        <SmartContextPanel
          sources={mockSources}
          excludedIds={[]}
          onToggle={mockOnToggle}
        />
      );

      // Click on the first source to expand
      const firstSourceHeader = screen.getByText('Fire Detection Spec Rev 2.pdf');
      fireEvent.click(firstSourceHeader);

      // Content should now be visible
      expect(screen.getByText(/fire detection systems including smoke detectors/)).toBeInTheDocument();
    });

    test('shows metadata when expanded', () => {
      render(
        <SmartContextPanel
          sources={mockSources}
          excludedIds={[]}
          onToggle={mockOnToggle}
        />
      );

      // Click to expand
      fireEvent.click(screen.getByText('Fire Detection Spec Rev 2.pdf'));

      // Metadata should be visible
      expect(screen.getByText(/Section: Section 3.2 - Detection Equipment/)).toBeInTheDocument();
      expect(screen.getByText(/Category: Fire Services/)).toBeInTheDocument();
    });

    test('displays page number in header when available', () => {
      render(
        <SmartContextPanel
          sources={mockSources}
          excludedIds={[]}
          onToggle={mockOnToggle}
        />
      );

      expect(screen.getByText(/\(p\.12\)/)).toBeInTheDocument();
    });

    test('shows chunk index when expanded', () => {
      render(
        <SmartContextPanel
          sources={mockSources}
          excludedIds={[]}
          onToggle={mockOnToggle}
        />
      );

      // Click to expand
      fireEvent.click(screen.getByText('Fire Detection Spec Rev 2.pdf'));

      expect(screen.getByText(/Chunk 1/)).toBeInTheDocument();
    });
  });

  describe('Sorting', () => {
    test('sorts by relevance by default (descending)', () => {
      render(
        <SmartContextPanel
          sources={mockSources}
          excludedIds={[]}
          onToggle={mockOnToggle}
        />
      );

      const sourceNames = screen.getAllByRole('button')
        .filter(btn => btn.textContent?.includes('.pdf') || btn.textContent?.includes('Project') || btn.textContent?.includes('Meeting'))
        .map(btn => btn.textContent);

      // First source should have highest relevance (95%)
      expect(sourceNames[0]).toContain('Fire Detection Spec Rev 2.pdf');
    });

    test('sorts by document name when selected', () => {
      render(
        <SmartContextPanel
          sources={mockSources}
          excludedIds={[]}
          onToggle={mockOnToggle}
        />
      );

      // Change sort option
      const sortSelect = screen.getByRole('combobox');
      fireEvent.change(sortSelect, { target: { value: 'document' } });

      const sourceNames = screen.getAllByRole('button')
        .filter(btn => btn.textContent?.includes('.pdf') || btn.textContent?.includes('Project') || btn.textContent?.includes('Meeting'))
        .map(btn => btn.textContent);

      // Should be alphabetical: AS1851-2012.pdf comes before Fire Detection
      expect(sourceNames[0]).toContain('AS1851-2012.pdf');
    });
  });

  describe('Accessibility', () => {
    test('toggle buttons have appropriate titles', () => {
      render(
        <SmartContextPanel
          sources={mockSources}
          excludedIds={['chunk-1']}
          onToggle={mockOnToggle}
        />
      );

      // Find toggle button for excluded source
      expect(screen.getByTitle('Include this source')).toBeInTheDocument();
      // Find toggle button for included source
      expect(screen.getAllByTitle('Exclude this source').length).toBe(3);
    });
  });
});
