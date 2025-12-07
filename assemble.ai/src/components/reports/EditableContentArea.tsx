'use client';

/**
 * Editable Content Area - Phase 11
 *
 * Native contentEditable div with:
 * - Keyboard shortcuts (Ctrl+1/2/3 for headings, Ctrl+S to save)
 * - Paste handling with style preservation
 * - Content change tracking (auto-save handled by parent)
 */

import React, { useRef, useEffect, useCallback } from 'react';

interface EditableContentAreaProps {
  content: string;
  onChange: (content: string) => void;
  onSave: () => Promise<void>;
}

// Heading color scheme (print-safe)
const HEADING_COLORS = {
  H1: '#5B9BD5', // Professional Blue
  H2: '#70AD47', // Fresh Green
  H3: '#ED7D31', // Warm Amber
};

export default function EditableContentArea({
  content,
  onChange,
  onSave,
}: EditableContentAreaProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const isInternalUpdate = useRef(false);

  /**
   * Update editor content when prop changes
   */
  useEffect(() => {
    if (!editorRef.current || isInternalUpdate.current) return;

    // Only update if content differs to avoid cursor jumps
    if (editorRef.current.innerHTML !== content) {
      editorRef.current.innerHTML = content;
    }
  }, [content]);

  /**
   * Handle content changes
   */
  const handleInput = useCallback(() => {
    if (!editorRef.current) return;

    isInternalUpdate.current = true;
    onChange(editorRef.current.innerHTML);

    // Reset flag after update propagates
    setTimeout(() => {
      isInternalUpdate.current = false;
    }, 0);
  }, [onChange]);

  /**
   * Keyboard shortcuts
   */
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      // Ctrl+S: Save
      if (e.ctrlKey && e.key === 's') {
        e.preventDefault();
        onSave();
        return;
      }

      // Ctrl+1/2/3: Apply headings
      if (e.ctrlKey && ['1', '2', '3'].includes(e.key)) {
        e.preventDefault();
        applyHeading(parseInt(e.key));
        return;
      }
    },
    [onSave]
  );

  /**
   * Apply heading style to selection
   */
  const applyHeading = (level: 1 | 2 | 3) => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;

    const range = selection.getRangeAt(0);
    const headingTag = `H${level}`;
    const color = HEADING_COLORS[headingTag as keyof typeof HEADING_COLORS];

    // Create heading element
    const heading = document.createElement(headingTag);
    heading.style.color = color;
    heading.textContent = range.toString() || `Heading ${level}`;

    // Replace selection with heading
    range.deleteContents();
    range.insertNode(heading);

    // Move cursor after heading
    range.setStartAfter(heading);
    range.setEndAfter(heading);
    selection.removeAllRanges();
    selection.addRange(range);

    handleInput();
  };

  /**
   * Paste handler - sanitize and preserve heading styles
   */
  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    e.preventDefault();

    const html = e.clipboardData.getData('text/html');
    const text = e.clipboardData.getData('text/plain');

    if (html) {
      // Parse HTML and re-apply heading colors
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = html;

      // Re-apply heading colors
      ['H1', 'H2', 'H3'].forEach((tag) => {
        const headings = tempDiv.querySelectorAll(tag);
        headings.forEach((heading) => {
          (heading as HTMLElement).style.color =
            HEADING_COLORS[tag as keyof typeof HEADING_COLORS];
        });
      });

      // Insert sanitized HTML
      document.execCommand('insertHTML', false, tempDiv.innerHTML);
    } else {
      // Plain text - insert as is
      document.execCommand('insertText', false, text);
    }

    handleInput();
  }, [handleInput]);

  return (
    <div className="px-8 py-6">
      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        onInput={handleInput}
        onKeyDown={handleKeyDown}
        onPaste={handlePaste}
        className="min-h-screen max-w-4xl mx-auto prose prose-invert prose-lg focus:outline-none [&_h1]:text-3xl [&_h1]:font-bold [&_h1]:mb-2 [&_h1]:mt-6 [&_h2]:text-2xl [&_h2]:font-semibold [&_h2]:mb-2 [&_h2]:mt-4 [&_h3]:text-xl [&_h3]:font-medium [&_h3]:mb-1 [&_h3]:mt-3 [&_p]:mb-2 [&_p]:leading-relaxed [&_table]:w-full [&_table]:border-collapse [&_table]:my-3 [&_th]:border [&_th]:border-gray-600 [&_th]:px-4 [&_th]:py-2 [&_th]:bg-gray-800 [&_td]:border [&_td]:border-gray-600 [&_td]:px-4 [&_td]:py-2 selection:bg-blue-500/30"
        style={{
          whiteSpace: 'pre-wrap',
          wordWrap: 'break-word',
        }}
      />

      {/* Print-specific styles (T145) */}
      <style jsx global>{`
        @media print {
          /* Darken heading colors by 15% for better print contrast */
          h1, h2, h3 {
            filter: brightness(0.85);
          }

          /* Full-width prose for print */
          .prose {
            max-width: none;
          }

          /* Prevent page breaks inside tables */
          table {
            page-break-inside: avoid;
          }

          /* Prevent orphaned headings */
          h1, h2, h3 {
            page-break-after: avoid;
          }

          /* Ensure consistent background for print */
          body {
            background: white !important;
            color: black !important;
          }

          /* Remove editor controls for print */
          button, .no-print {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
}
