'use client';

/**
 * Heading Toolbar - Phase 11
 *
 * Toolbar for H1/H2/H3 formatting controls with color indicators
 */

import React from 'react';
import { Button } from '@/components/ui/button';
import { Type } from 'lucide-react';

const HEADING_STYLES = [
  { level: 1, label: 'H1', color: '#5B9BD5', description: 'Report Title' },
  { level: 2, label: 'H2', color: '#70AD47', description: 'Section' },
  { level: 3, label: 'H3', color: '#ED7D31', description: 'Subsection' },
] as const;

export default function HeadingToolbar() {
  const applyHeading = (level: 1 | 2 | 3) => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) {
      alert('Please select text first');
      return;
    }

    const range = selection.getRangeAt(0);
    const headingTag = `H${level}`;
    const heading = HEADING_STYLES.find((h) => h.level === level);
    if (!heading) return;

    // Create heading element
    const headingElement = document.createElement(headingTag);
    headingElement.style.color = heading.color;
    headingElement.textContent = range.toString() || `Heading ${level}`;

    // Replace selection
    range.deleteContents();
    range.insertNode(headingElement);

    // Move cursor after heading
    range.setStartAfter(headingElement);
    range.setEndAfter(headingElement);
    selection.removeAllRanges();
    selection.addRange(range);
  };

  return (
    <div className="flex items-center gap-2 px-6 py-3 border-b border-gray-700 bg-[#252526]">
      <Type className="w-4 h-4 text-gray-400 mr-2" />
      <span className="text-xs text-gray-400 mr-2">Headings:</span>

      {HEADING_STYLES.map((style) => (
        <Button
          key={style.level}
          variant="ghost"
          size="sm"
          onClick={() => applyHeading(style.level)}
          className="relative group"
        >
          <span
            className="font-bold"
            style={{ color: style.color }}
          >
            {style.label}
          </span>

          {/* Tooltip */}
          <div className="absolute -bottom-10 left-1/2 transform -translate-x-1/2
            bg-gray-800 text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100
            transition-opacity pointer-events-none whitespace-nowrap z-10">
            {style.description} <span className="text-gray-400">(Ctrl+{style.level})</span>
          </div>
        </Button>
      ))}

      <div className="ml-auto text-xs text-gray-400">
        Tip: Select text and press Ctrl+1/2/3 or click a heading button
      </div>
    </div>
  );
}
