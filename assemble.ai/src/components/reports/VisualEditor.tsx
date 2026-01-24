'use client';

/**
 * Visual Editor - Enhanced Rich Text Editor with TipTap
 * 
 * Provides a full-featured WYSIWYG editor with:
 * - Formatting toolbar (bold, italic, underline, headings, lists, etc.)
 * - Color-coded headings (H1/H2/H3)
 * - Link support
 * - Table support
 * - Auto-save integration
 */

import React, { useCallback, useEffect } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Underline from '@tiptap/extension-underline';
import Link from '@tiptap/extension-link';
import { TextStyle } from '@tiptap/extension-text-style';
import Color from '@tiptap/extension-color';
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Link as LinkIcon,
  Undo,
  Redo,
} from 'lucide-react';

interface VisualEditorProps {
  content: string;
  onChange: (content: string) => void;
  onSave: () => Promise<void>;
  placeholder?: string;
}

const HEADING_COLOR = 'var(--color-accent-teal)'; // Teal color for headings

export default function VisualEditor({
  content,
  onChange,
  onSave,
  placeholder = 'Start typing...',
}: VisualEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
      }),
      Placeholder.configure({
        placeholder,
      }),
      Underline,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-blue-400 hover:text-blue-300 underline',
        },
      }),
      TextStyle,
      Color,
    ],
    content,
    editorProps: {
      attributes: {
        class: 'prose prose-invert prose-base max-w-none focus:outline-none min-h-[500px] px-8 py-6 [&_h1]:text-lg [&_h1]:font-bold [&_h1]:mb-0 [&_h1]:mt-2 [&_h1]:text-[var(--color-accent-teal)] [&_h2]:text-base [&_h2]:font-semibold [&_h2]:mb-0 [&_h2]:mt-1 [&_h2]:text-[var(--color-accent-teal)] [&_h3]:text-base [&_h3]:font-medium [&_h3]:mb-0 [&_h3]:mt-1 [&_h3]:text-[var(--color-accent-teal)] [&_p]:mb-1 [&_p]:leading-normal [&_ul]:list-disc [&_ul]:ml-6 [&_ol]:list-decimal [&_ol]:ml-6 [&_table]:w-full [&_table]:border-collapse [&_table]:my-2 [&_th]:border [&_th]:border-[var(--color-border)] [&_th]:px-4 [&_th]:py-2 [&_th]:bg-[#2d2d30] [&_th]:text-[var(--color-text-muted)] [&_th]:font-medium [&_td]:border [&_td]:border-[var(--color-border)] [&_td]:px-4 [&_td]:py-2',
      },
    },
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      onChange(html);
    },
  });

  // Update editor content when prop changes (external updates)
  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content);
    }
  }, [content, editor]);

  // Keyboard shortcuts
  useEffect(() => {
    if (!editor) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+S: Save
      if (e.ctrlKey && e.key === 's') {
        e.preventDefault();
        onSave();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [editor, onSave]);

  // Apply heading color after content changes
  useEffect(() => {
    if (!editor) return;

    const updateHeadingColors = () => {
      const { $from } = editor.state.selection;
      const node = $from.node();
      
      // Apply color to headings via CSS classes (handled by Tailwind classes)
      // The color is applied via the editorProps attributes above
    };

    editor.on('update', updateHeadingColors);
    return () => {
      editor.off('update', updateHeadingColors);
    };
  }, [editor]);

  const toggleBold = useCallback(() => {
    editor?.chain().focus().toggleBold().run();
  }, [editor]);

  const toggleItalic = useCallback(() => {
    editor?.chain().focus().toggleItalic().run();
  }, [editor]);

  const toggleUnderline = useCallback(() => {
    editor?.chain().focus().toggleUnderline().run();
  }, [editor]);

  const setHeading = useCallback((level: 1 | 2 | 3) => {
    editor?.chain().focus().toggleHeading({ level }).run();
  }, [editor]);

  const toggleBulletList = useCallback(() => {
    editor?.chain().focus().toggleBulletList().run();
  }, [editor]);

  const toggleOrderedList = useCallback(() => {
    editor?.chain().focus().toggleOrderedList().run();
  }, [editor]);

  const setLink = useCallback(() => {
    const url = window.prompt('Enter URL:');
    if (url) {
      editor?.chain().focus().setLink({ href: url }).run();
    }
  }, [editor]);

  const undo = useCallback(() => {
    editor?.chain().focus().undo().run();
  }, [editor]);

  const redo = useCallback(() => {
    editor?.chain().focus().redo().run();
  }, [editor]);

  if (!editor) {
    return <div className="p-8">Loading editor...</div>;
  }

  return (
    <div className="flex flex-col h-full bg-[var(--color-bg-primary)]">
      {/* Formatting Toolbar */}
      <div className="flex items-center gap-1 p-2 border-b border-[var(--color-border)] bg-[var(--color-bg-secondary)] flex-wrap">
        <button
          type="button"
          onClick={toggleBold}
          className={`p-2 rounded hover:bg-[var(--color-bg-tertiary)] ${
            editor.isActive('bold') ? 'bg-[var(--color-bg-tertiary)]' : ''
          }`}
          title="Bold (Ctrl+B)"
        >
          <Bold className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={toggleItalic}
          className={`p-2 rounded hover:bg-[var(--color-bg-tertiary)] ${
            editor.isActive('italic') ? 'bg-[var(--color-bg-tertiary)]' : ''
          }`}
          title="Italic (Ctrl+I)"
        >
          <Italic className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={toggleUnderline}
          className={`p-2 rounded hover:bg-[var(--color-bg-tertiary)] ${
            editor.isActive('underline') ? 'bg-[var(--color-bg-tertiary)]' : ''
          }`}
          title="Underline (Ctrl+U)"
        >
          <UnderlineIcon className="w-4 h-4" />
        </button>
        
        <div className="w-px h-6 bg-[var(--color-border)] mx-1" />
        
        <button
          type="button"
          onClick={() => setHeading(1)}
          className={`p-2 rounded hover:bg-[var(--color-bg-tertiary)] ${
            editor.isActive('heading', { level: 1 }) ? 'bg-[var(--color-bg-tertiary)]' : ''
          }`}
          title="Heading 1 (Ctrl+1)"
        >
          <Heading1 className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => setHeading(2)}
          className={`p-2 rounded hover:bg-[var(--color-bg-tertiary)] ${
            editor.isActive('heading', { level: 2 }) ? 'bg-[var(--color-bg-tertiary)]' : ''
          }`}
          title="Heading 2 (Ctrl+2)"
        >
          <Heading2 className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => setHeading(3)}
          className={`p-2 rounded hover:bg-[var(--color-bg-tertiary)] ${
            editor.isActive('heading', { level: 3 }) ? 'bg-[var(--color-bg-tertiary)]' : ''
          }`}
          title="Heading 3 (Ctrl+3)"
        >
          <Heading3 className="w-4 h-4" />
        </button>
        
        <div className="w-px h-6 bg-[var(--color-border)] mx-1" />
        
        <button
          type="button"
          onClick={toggleBulletList}
          className={`p-2 rounded hover:bg-[var(--color-bg-tertiary)] ${
            editor.isActive('bulletList') ? 'bg-[var(--color-bg-tertiary)]' : ''
          }`}
          title="Bullet List"
        >
          <List className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={toggleOrderedList}
          className={`p-2 rounded hover:bg-[var(--color-bg-tertiary)] ${
            editor.isActive('orderedList') ? 'bg-[var(--color-bg-tertiary)]' : ''
          }`}
          title="Numbered List"
        >
          <ListOrdered className="w-4 h-4" />
        </button>
        
        <div className="w-px h-6 bg-[var(--color-border)] mx-1" />
        
        <button
          type="button"
          onClick={setLink}
          className={`p-2 rounded hover:bg-[var(--color-bg-tertiary)] ${
            editor.isActive('link') ? 'bg-[var(--color-bg-tertiary)]' : ''
          }`}
          title="Insert Link"
        >
          <LinkIcon className="w-4 h-4" />
        </button>
        
        <div className="w-px h-6 bg-[var(--color-border)] mx-1" />
        
        <button
          type="button"
          onClick={undo}
          disabled={!editor.can().undo()}
          className="p-2 rounded hover:bg-[var(--color-bg-tertiary)] disabled:opacity-50 disabled:cursor-not-allowed"
          title="Undo (Ctrl+Z)"
        >
          <Undo className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={redo}
          disabled={!editor.can().redo()}
          className="p-2 rounded hover:bg-[var(--color-bg-tertiary)] disabled:opacity-50 disabled:cursor-not-allowed"
          title="Redo (Ctrl+Y)"
        >
          <Redo className="w-4 h-4" />
        </button>
      </div>

      {/* Editor Content */}
      <div className="flex-1 overflow-auto">
        <EditorContent editor={editor} />
      </div>

      {/* Print-specific styles */}
      <style jsx global>{`
        @media print {
          .prose h1, .prose h2, .prose h3 {
            filter: brightness(0.85);
          }
          .prose {
            max-width: none;
          }
          table {
            page-break-inside: avoid;
          }
          h1, h2, h3 {
            page-break-after: avoid;
          }
          body {
            background: white !important;
            color: black !important;
          }
          button {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
}

