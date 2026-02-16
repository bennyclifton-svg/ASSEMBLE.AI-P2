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
import { InlineInstructionHighlight } from '@/lib/editor/inline-instruction-extension';
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

  /** Use transparent background (inherits from parent) */
  transparentBg?: boolean;

  /** Extra content rendered at the right end of the toolbar */
  toolbarExtra?: React.ReactNode;
}

const SIZE_CLASSES: Record<RichTextEditorVariant, string> = {
  mini: 'min-h-[80px]',
  compact: 'min-h-[200px]',
  full: 'min-h-[500px]',
};

const PROSE_BASE_CLASSES = 'prose prose-invert prose-sm max-w-none focus:outline-none px-3 py-2 leading-normal [&_h1]:text-base [&_h1]:font-bold [&_h1]:mb-0 [&_h1]:mt-3 [&_h1]:text-[var(--color-accent-teal)] [&_h2]:text-sm [&_h2]:font-semibold [&_h2]:mb-0 [&_h2]:mt-2.5 [&_h2]:text-[var(--color-accent-teal)] [&_h3]:text-sm [&_h3]:font-medium [&_h3]:mb-0 [&_h3]:mt-2 [&_h3]:text-[var(--color-accent-teal)] [&_p]:mt-0 [&_p]:mb-1 [&_p]:leading-normal [&_p:last-child]:mb-0 [&_ul]:list-disc [&_ul]:ml-4 [&_ul]:my-0 [&_ol]:list-decimal [&_ol]:ml-4 [&_ol]:my-0 [&_li]:my-0 [&_li]:leading-normal';

/**
 * Convert markdown syntax to HTML for TipTap rendering
 * Handles common patterns from AI-generated content
 */
function markdownToHtml(text: string): string {
  // Skip if already HTML (contains tags)
  if (/<[a-z][\s\S]*>/i.test(text) && !text.includes('**')) {
    return text;
  }

  let html = text;

  // Handle ## headings (must be at start of line or after newline)
  html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>');
  html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');

  // Handle **bold** text
  html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');

  // Handle *italic* text (but not ** which is bold)
  html = html.replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, '<em>$1</em>');

  // Handle bullet points: • at start of line
  html = html.replace(/^[•\-]\s*(.+)$/gm, '<li>$1</li>');

  // Wrap consecutive <li> elements in <ul>
  html = html.replace(/(<li>.*<\/li>\n?)+/g, (match) => `<ul>${match}</ul>`);

  // Handle line breaks - convert double newlines to paragraph breaks
  // and single newlines within text to <br>
  const paragraphs = html.split(/\n\n+/);
  if (paragraphs.length > 1) {
    html = paragraphs
      .map(p => {
        // Don't wrap if already has block-level tags
        if (/^<(h[1-6]|ul|ol|li|p|div)/i.test(p.trim())) {
          return p;
        }
        // Replace single newlines with <br> within paragraphs
        const withBreaks = p.replace(/\n/g, '<br>');
        return `<p>${withBreaks}</p>`;
      })
      .join('');
  } else if (!/<(h[1-6]|ul|ol|p|div)/i.test(html)) {
    // Single block without paragraphs - wrap in <p> if not already block-level
    html = `<p>${html.replace(/\n/g, '<br>')}</p>`;
  }

  return html;
}

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
  transparentBg = false,
  toolbarExtra,
}: RichTextEditorProps) {
  // Convert markdown to HTML for initial content
  const processedContent = React.useMemo(() => markdownToHtml(content), [content]);

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
      InlineInstructionHighlight,
    ],
    content: processedContent,
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
    if (editor) {
      const currentHtml = editor.getHTML();
      const newProcessedContent = markdownToHtml(content);
      // Only update if content is actually different (comparing processed versions)
      if (newProcessedContent !== currentHtml && content !== currentHtml) {
        editor.commands.setContent(newProcessedContent);
      }
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
      <div className={cn(
        'rounded-md',
        !transparentBg && 'border border-[var(--color-border)] bg-[var(--color-bg-primary)]',
        transparentBg && 'bg-transparent',
        className
      )}>
        <div className={cn('p-3 text-[var(--color-text-muted)]', SIZE_CLASSES[variant])}>
          Loading editor...
        </div>
      </div>
    );
  }

  const iconSize = toolbarVariant === 'mini' ? 'w-3.5 h-3.5 text-[var(--color-text-muted)]' : 'w-4 h-4 text-[var(--color-text-muted)]';
  const isSmall = toolbarVariant === 'mini';

  return (
    <div className={cn(
      'flex flex-col rounded-md overflow-hidden',
      !transparentBg && 'border border-[var(--color-border)] bg-[var(--color-bg-primary)]',
      transparentBg && 'bg-transparent',
      className
    )}>
      {/* Toolbar */}
      {toolbarVariant !== 'none' && (
        <div className={cn(
          "flex items-center gap-0.5 px-2 py-1 flex-wrap",
          !transparentBg && "border-b border-[var(--color-border)] bg-[var(--color-bg-secondary)]",
          transparentBg && "border-b border-black/10"
        )}>
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

          {/* Extra toolbar content (e.g. Generate button) */}
          {toolbarExtra && (
            <div className="ml-auto flex items-center">
              {toolbarExtra}
            </div>
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
