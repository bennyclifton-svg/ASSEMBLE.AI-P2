'use client';

/**
 * Rich Text Editor - Reusable TipTap-based editor with configurable toolbar
 *
 * Provides a WYSIWYG editor with:
 * - Configurable size variants (mini, compact, full)
 * - Configurable toolbar variants (mini, full, none)
 * - Formatting options (bold, italic, underline, headings, lists)
 * - Auto-save integration via onBlur
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
import { cn } from '@/lib/utils';

export type RichTextEditorVariant = 'mini' | 'compact' | 'full';
export type RichTextToolbarVariant = 'mini' | 'full' | 'none';

export interface RichTextEditorProps {
  content: string;
  onChange: (content: string) => void;
  placeholder?: string;

  /** Size variant: 'mini' (80px), 'compact' (200px), 'full' (500px) */
  variant?: RichTextEditorVariant;

  /** Toolbar variant: 'mini' (B, I, List), 'full' (all options), 'none' (hidden) */
  toolbarVariant?: RichTextToolbarVariant;

  /** Optional callback when editor loses focus (useful for auto-save) */
  onBlur?: () => void;

  /** Optional callback when editor gains focus */
  onFocus?: () => void;

  /** Disable editing */
  disabled?: boolean;

  /** Additional class for the container */
  className?: string;

  /** Additional class for the editor content area */
  editorClassName?: string;
}

const SIZE_CLASSES: Record<RichTextEditorVariant, string> = {
  mini: 'min-h-[80px]',
  compact: 'min-h-[200px]',
  full: 'min-h-[500px]',
};

const PROSE_BASE_CLASSES = 'prose prose-invert prose-sm max-w-none focus:outline-none px-3 py-2 [&_h1]:text-base [&_h1]:font-bold [&_h1]:mb-0 [&_h1]:mt-2 [&_h1]:text-[var(--color-accent-teal)] [&_h2]:text-sm [&_h2]:font-semibold [&_h2]:mb-0 [&_h2]:mt-1 [&_h2]:text-[var(--color-accent-teal)] [&_h3]:text-sm [&_h3]:font-medium [&_h3]:mb-0 [&_h3]:mt-1 [&_h3]:text-[var(--color-accent-teal)] [&_p]:mb-1 [&_p]:leading-normal [&_ul]:list-disc [&_ul]:ml-4 [&_ol]:list-decimal [&_ol]:ml-4 [&_li]:my-0';

interface ToolbarButtonProps {
  onClick: () => void;
  isActive?: boolean;
  disabled?: boolean;
  title: string;
  children: React.ReactNode;
  small?: boolean;
}

function ToolbarButton({ onClick, isActive, disabled, title, children, small }: ToolbarButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'rounded hover:bg-[var(--color-bg-tertiary)] disabled:opacity-50 disabled:cursor-not-allowed',
        isActive && 'bg-[var(--color-bg-tertiary)]',
        small ? 'p-1' : 'p-1.5'
      )}
      title={title}
    >
      {children}
    </button>
  );
}

function ToolbarDivider() {
  return <div className="w-px h-5 bg-[var(--color-border)] mx-0.5" />;
}

export function RichTextEditor({
  content,
  onChange,
  placeholder = 'Start typing...',
  variant = 'compact',
  toolbarVariant = 'full',
  onBlur,
  onFocus,
  disabled = false,
  className,
  editorClassName,
}: RichTextEditorProps) {
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
    editable: !disabled,
    immediatelyRender: false, // Prevent SSR hydration mismatch
    editorProps: {
      attributes: {
        class: cn(PROSE_BASE_CLASSES, SIZE_CLASSES[variant], editorClassName),
      },
    },
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      onChange(html);
    },
    onBlur: () => {
      onBlur?.();
    },
    onFocus: () => {
      onFocus?.();
    },
  });

  // Update editor content when prop changes (external updates)
  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content);
    }
  }, [content, editor]);

  // Update editable state when disabled changes
  useEffect(() => {
    if (editor) {
      editor.setEditable(!disabled);
    }
  }, [disabled, editor]);

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
    return (
      <div className={cn('rounded-md border border-[var(--color-border)] bg-[var(--color-bg-primary)]', className)}>
        <div className={cn('p-3 text-[var(--color-text-muted)]', SIZE_CLASSES[variant])}>
          Loading editor...
        </div>
      </div>
    );
  }

  const iconSize = toolbarVariant === 'mini' ? 'w-3.5 h-3.5' : 'w-4 h-4';
  const isSmall = toolbarVariant === 'mini';

  return (
    <div className={cn('flex flex-col rounded-md border border-[var(--color-border)] bg-[var(--color-bg-primary)] overflow-hidden', className)}>
      {/* Toolbar */}
      {toolbarVariant !== 'none' && (
        <div className="flex items-center gap-0.5 px-2 py-1 border-b border-[var(--color-border)] bg-[var(--color-bg-secondary)] flex-wrap">
          <ToolbarButton
            onClick={toggleBold}
            isActive={editor.isActive('bold')}
            title="Bold (Ctrl+B)"
            small={isSmall}
          >
            <Bold className={iconSize} />
          </ToolbarButton>
          <ToolbarButton
            onClick={toggleItalic}
            isActive={editor.isActive('italic')}
            title="Italic (Ctrl+I)"
            small={isSmall}
          >
            <Italic className={iconSize} />
          </ToolbarButton>

          {toolbarVariant === 'full' && (
            <>
              <ToolbarButton
                onClick={toggleUnderline}
                isActive={editor.isActive('underline')}
                title="Underline (Ctrl+U)"
                small={isSmall}
              >
                <UnderlineIcon className={iconSize} />
              </ToolbarButton>

              <ToolbarDivider />

              <ToolbarButton
                onClick={() => setHeading(1)}
                isActive={editor.isActive('heading', { level: 1 })}
                title="Heading 1"
                small={isSmall}
              >
                <Heading1 className={iconSize} />
              </ToolbarButton>
              <ToolbarButton
                onClick={() => setHeading(2)}
                isActive={editor.isActive('heading', { level: 2 })}
                title="Heading 2"
                small={isSmall}
              >
                <Heading2 className={iconSize} />
              </ToolbarButton>
              <ToolbarButton
                onClick={() => setHeading(3)}
                isActive={editor.isActive('heading', { level: 3 })}
                title="Heading 3"
                small={isSmall}
              >
                <Heading3 className={iconSize} />
              </ToolbarButton>
            </>
          )}

          <ToolbarDivider />

          <ToolbarButton
            onClick={toggleBulletList}
            isActive={editor.isActive('bulletList')}
            title="Bullet List"
            small={isSmall}
          >
            <List className={iconSize} />
          </ToolbarButton>

          {toolbarVariant === 'full' && (
            <>
              <ToolbarButton
                onClick={toggleOrderedList}
                isActive={editor.isActive('orderedList')}
                title="Numbered List"
                small={isSmall}
              >
                <ListOrdered className={iconSize} />
              </ToolbarButton>

              <ToolbarDivider />

              <ToolbarButton
                onClick={setLink}
                isActive={editor.isActive('link')}
                title="Insert Link"
                small={isSmall}
              >
                <LinkIcon className={iconSize} />
              </ToolbarButton>

              <ToolbarDivider />

              <ToolbarButton
                onClick={undo}
                disabled={!editor.can().undo()}
                title="Undo (Ctrl+Z)"
                small={isSmall}
              >
                <Undo className={iconSize} />
              </ToolbarButton>
              <ToolbarButton
                onClick={redo}
                disabled={!editor.can().redo()}
                title="Redo (Ctrl+Y)"
                small={isSmall}
              >
                <Redo className={iconSize} />
              </ToolbarButton>
            </>
          )}
        </div>
      )}

      {/* Editor Content */}
      <div className="flex-1 overflow-auto">
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}

export default RichTextEditor;
