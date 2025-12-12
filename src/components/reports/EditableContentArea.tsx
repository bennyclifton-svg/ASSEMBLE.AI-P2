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

// Single heading color (consistent, clean look) - matches Addendum styling
const HEADING_COLOR = '#4fc1ff'; // Highlight blue - matches Addendum reports

export default function EditableContentArea({
  content,
  onChange,
  onSave,
}: EditableContentAreaProps) {
  const editorRef = useRef<HTMLDivElement>(null);

  // Track whether we've done the initial render
  const hasInitialized = useRef(false);
  // Track the last content we sent to parent to avoid unnecessary updates
  const lastSentContent = useRef(content);

  /**
   * Update editor content when prop changes (after initial render)
   * Only update if the change came from outside (not from user typing)
   */
  useEffect(() => {
    if (!editorRef.current) return;

    // Skip the first update since we use dangerouslySetInnerHTML for initial render
    if (!hasInitialized.current) {
      hasInitialized.current = true;
      lastSentContent.current = content;
      console.log('[EditableContentArea] Initialized');
      return;
    }

    // Skip if this is content we just sent to parent (user typing)
    if (content === lastSentContent.current) {
      console.log('[EditableContentArea] Skipping update - same as lastSent');
      return;
    }

    // Skip if content matches what's in editor (handles HTML normalization)
    if (editorRef.current.innerHTML === content) {
      lastSentContent.current = content;
      console.log('[EditableContentArea] Skipping update - same as editor innerHTML');
      return;
    }

    // External content change - update editor
    console.log('[EditableContentArea] UPDATING EDITOR - cursor will jump!', {
      contentLength: content.length,
      lastSentLength: lastSentContent.current.length,
      editorLength: editorRef.current.innerHTML.length,
    });
    lastSentContent.current = content;
    editorRef.current.innerHTML = content;
  }, [content]);

  /**
   * Handle content changes
   */
  const handleInput = useCallback(() => {
    if (!editorRef.current) return;

    const newContent = editorRef.current.innerHTML;
    lastSentContent.current = newContent;
    onChange(newContent);
  }, [onChange]);

  /**
   * Apply heading style to selection or current line
   */
  const applyHeading = useCallback((level: 1 | 2 | 3, textContent?: string) => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;

    const range = selection.getRangeAt(0);
    const headingTag = `H${level}`;

    // Create heading element
    const heading = document.createElement(headingTag);
    heading.style.color = HEADING_COLOR;
    heading.textContent = textContent ?? range.toString() ?? '';

    // Replace selection with heading
    range.deleteContents();
    range.insertNode(heading);

    // Move cursor inside heading for typing
    if (!heading.textContent) {
      range.setStart(heading, 0);
      range.setEnd(heading, 0);
    } else {
      range.setStartAfter(heading);
      range.setEndAfter(heading);
    }
    selection.removeAllRanges();
    selection.addRange(range);

    handleInput();
  }, [handleInput]);

  /**
   * Keyboard shortcuts and markdown prefix detection
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
        applyHeading(parseInt(e.key) as 1 | 2 | 3);
        return;
      }

      // Markdown-style prefix detection: # , ## , ### at line start
      if (e.key === ' ') {
        const selection = window.getSelection();
        if (!selection || !selection.anchorNode) return;

        const node = selection.anchorNode;
        if (node.nodeType !== Node.TEXT_NODE) return;

        const text = node.textContent || '';
        const offset = selection.anchorOffset;

        // Get text before cursor on current line
        const beforeCursor = text.slice(0, offset);
        const lineStart = beforeCursor.lastIndexOf('\n') + 1;
        const lineContent = beforeCursor.slice(lineStart);

        // Check for heading patterns (must be at start of line/node)
        let level: 1 | 2 | 3 | null = null;
        if (lineContent === '###') {
          level = 3;
        } else if (lineContent === '##') {
          level = 2;
        } else if (lineContent === '#') {
          level = 1;
        }

        if (level !== null) {
          e.preventDefault();

          // Delete the # characters
          const range = selection.getRangeAt(0);
          range.setStart(node, lineStart);
          range.setEnd(node, offset);
          range.deleteContents();

          // Apply heading
          applyHeading(level);
        }
      }
    },
    [onSave, applyHeading]
  );

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

      // Re-apply single heading color
      ['H1', 'H2', 'H3'].forEach((tag) => {
        const headings = tempDiv.querySelectorAll(tag);
        headings.forEach((heading) => {
          (heading as HTMLElement).style.color = HEADING_COLOR;
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
        dangerouslySetInnerHTML={{ __html: content }}
        onInput={handleInput}
        onKeyDown={handleKeyDown}
        onPaste={handlePaste}
        className="min-h-screen max-w-4xl mx-auto prose prose-invert prose-base focus:outline-none [&_h1]:text-lg [&_h1]:font-bold [&_h1]:mb-0 [&_h1]:mt-2 [&_h2]:text-base [&_h2]:font-semibold [&_h2]:mb-0 [&_h2]:mt-1 [&_h3]:text-base [&_h3]:font-medium [&_h3]:mb-0 [&_h3]:mt-1 [&_p]:mb-1 [&_p]:leading-normal [&_table]:w-full [&_table]:border-collapse [&_table]:my-2 [&_th]:border [&_th]:border-[#3e3e42] [&_th]:px-4 [&_th]:py-2 [&_th]:bg-[#2d2d30] [&_th]:text-[#858585] [&_th]:font-medium [&_td]:border [&_td]:border-[#3e3e42] [&_td]:px-4 [&_td]:py-2 selection:bg-[#4fc1ff]/30"
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
