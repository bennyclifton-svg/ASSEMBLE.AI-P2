'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import ListItem from '@tiptap/extension-list-item';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import { InlineInstructionHighlight } from '@/lib/editor/inline-instruction-extension';
import { useEffect, useMemo, useRef } from 'react';
import { cn } from '@/lib/utils';

export interface EditorRow {
  id: string;
  text: string;
}

export interface EditorItem {
  id: string | null;
  html: string;
}

export interface ObjectivesEditorProps {
  rows: EditorRow[];
  onChange: (items: EditorItem[]) => void;
  onBlur?: () => void;
  onFocus?: () => void;
  placeholder?: string;
  className?: string;
}

const ID_ATTRIBUTE = 'data-row-id';

const RowListItem = ListItem.extend({
  addAttributes() {
    return {
      rowId: {
        default: null,
        parseHTML: (el: HTMLElement) => el.getAttribute(ID_ATTRIBUTE),
        renderHTML: (attrs: Record<string, unknown>) =>
          attrs.rowId ? { [ID_ATTRIBUTE]: attrs.rowId as string } : {},
      },
    };
  },
});

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function isPlainText(s: string): boolean {
  return !/<[a-z][^>]*>/i.test(s);
}

function rowsToHtml(rows: EditorRow[]): string {
  if (rows.length === 0) return '';
  const items = rows
    .map((r) => {
      const inner = isPlainText(r.text) ? escapeHtml(r.text) : r.text;
      return `<li ${ID_ATTRIBUTE}="${r.id}">${inner}</li>`;
    })
    .join('');
  return `<ul>${items}</ul>`;
}

export function parseEditorContent(html: string): EditorItem[] {
  if (typeof window === 'undefined') return [];
  const doc = new DOMParser().parseFromString(`<div>${html}</div>`, 'text/html');
  const items = Array.from(doc.querySelectorAll('li'));
  return items.map((li) => ({
    id: li.getAttribute(ID_ATTRIBUTE),
    html: li.innerHTML.trim(),
  }));
}

export function ObjectivesEditor({
  rows,
  onChange,
  onBlur,
  onFocus,
  placeholder = 'Type objectives — one per line',
  className,
}: ObjectivesEditorProps) {
  // Compute the initial HTML once on mount; afterwards the effect below syncs
  // external row changes that arrive while the editor is unfocused.
  const initialHtml = useMemo(() => rowsToHtml(rows), []); // eslint-disable-line react-hooks/exhaustive-deps
  const externalRowsKey = useMemo(
    () => rows.map((r) => `${r.id}:${r.text}`).join('|'),
    [rows],
  );
  const isFocusedRef = useRef(false);

  const editor = useEditor({
    extensions: [
      // StarterKit bundles Document, Paragraph, Text, BulletList, ListItem,
      // Bold, Italic, History etc. We override ListItem with the row-aware variant.
      StarterKit.configure({ listItem: false, heading: false, codeBlock: false, blockquote: false, horizontalRule: false, hardBreak: false }),
      RowListItem,
      Link.configure({ openOnClick: false, HTMLAttributes: { class: 'text-blue-400 hover:text-blue-300 underline' } }),
      Placeholder.configure({ placeholder }),
      InlineInstructionHighlight,
    ],
    content: initialHtml || `<ul><li ${ID_ATTRIBUTE}=""></li></ul>`,
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: cn(
          'objectives-editor prose prose-sm max-w-none focus:outline-none px-4 py-3 leading-relaxed text-sm text-[var(--color-text-primary)]',
          className,
        ),
      },
    },
    onUpdate: ({ editor }) => {
      onChange(parseEditorContent(editor.getHTML()));
    },
    onFocus: () => {
      isFocusedRef.current = true;
      onFocus?.();
    },
    onBlur: () => {
      isFocusedRef.current = false;
      onBlur?.();
    },
  });

  // Sync external row changes (AI generation, deletes from elsewhere) into the
  // editor — but only when the user isn't actively editing.
  useEffect(() => {
    if (!editor) return;
    if (isFocusedRef.current) return;
    const incoming = rowsToHtml(rows);
    if (editor.getHTML() === incoming) return;
    editor.commands.setContent(
      incoming || `<ul><li ${ID_ATTRIBUTE}=""></li></ul>`,
      { emitUpdate: false },
    );
  }, [editor, externalRowsKey, rows]);

  return <EditorContent editor={editor} />;
}
