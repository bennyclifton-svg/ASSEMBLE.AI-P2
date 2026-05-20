'use client';

/**
 * ObjectiveListEditor — TipTap-based objective list editor.
 *
 * Replaces the raw contentEditable <ol> that previously powered each
 * objectives section. TipTap (ProseMirror) provides predictable selection
 * behaviour (double-click word, triple-click line, click-drag hit-testing)
 * that the browser's built-in contentEditable does not.
 *
 * Server row identity is preserved through edits via a custom ListItem
 * extension that round-trips a `data-row-id` attribute. On blur, the editor
 * HTML is parsed back into `{ id, text }` items and handed to the parent
 * for reconciliation (POST new, PATCH changed, DELETE missing).
 *
 * Numbering is provided by the .sw-obj-list CSS counter — the digits live
 * outside the editable text so the user can never delete them by accident.
 */

import { useEffect, useRef, useState } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import ListItem from '@tiptap/extension-list-item';
import type { ObjectiveType } from '@/lib/db/objectives-schema';
import type { ObjectiveRow } from '@/components/profiler/objectives/ObjectivesWorkspace';
import type { ReconcileItem } from './BriefPreviewPane';

type ViewMode = 'short' | 'long';

interface ObjectiveListEditorProps {
    rows: ObjectiveRow[];
    type: ObjectiveType;
    mode: ViewMode;
    sectionStart: number;
    onReconcile: (type: ObjectiveType, mode: ViewMode, items: ReconcileItem[]) => void;
    revisionKey: number;
}

// Custom ListItem that preserves `data-row-id` through the TipTap round-trip.
// Without this, an edit looks like delete+create to the reconcile pass.
const RowIdListItem = ListItem.extend({
    addAttributes() {
        return {
            ...this.parent?.(),
            dataRowId: {
                default: null,
                parseHTML: (element) => element.getAttribute('data-row-id') ?? null,
                renderHTML: (attributes) => {
                    const id = (attributes as { dataRowId?: string | null }).dataRowId;
                    return id ? { 'data-row-id': id } : {};
                },
            },
        };
    },
});

function escapeHtml(s: string): string {
    return s
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function rowsToHtml(rows: ObjectiveRow[], mode: ViewMode): string {
    if (rows.length === 0) {
        return '<ol><li><p></p></li></ol>';
    }
    const items = rows
        .map((r) => {
            const text = mode === 'long' && r.textPolished ? r.textPolished : r.text;
            // Optimistic placeholder ids (`temp-…`) are kept off the DOM so the
            // next blur treats them as fresh inserts if the refetch hasn't
            // landed yet.
            const idAttr = r.id.startsWith('temp-') ? '' : ` data-row-id="${r.id}"`;
            return `<li${idAttr}><p>${escapeHtml(text)}</p></li>`;
        })
        .join('');
    return `<ol>${items}</ol>`;
}

export function ObjectiveListEditor({
    rows,
    type,
    mode,
    sectionStart,
    onReconcile,
    revisionKey,
}: ObjectiveListEditorProps) {
    const isFocusedRef = useRef(false);

    // Capture the latest `onReconcile` and `rows` snapshot for the blur
    // handler. Without this, useEditor's onBlur closure would lock onto the
    // first render's values.
    const onReconcileRef = useRef(onReconcile);
    useEffect(() => { onReconcileRef.current = onReconcile; }, [onReconcile]);
    const typeRef = useRef(type);
    useEffect(() => { typeRef.current = type; }, [type]);
    const modeRef = useRef(mode);
    useEffect(() => { modeRef.current = mode; }, [mode]);

    // Seed once at mount via a lazy state initialiser. Subsequent row/mode
    // changes flow through the effect below so the editor instance is kept
    // alive (focus/selection survive parent re-renders).
    const [initialContent] = useState(() => rowsToHtml(rows, mode));

    const editor = useEditor({
        extensions: [
            StarterKit.configure({
                listItem: false,
                bulletList: false,
                heading: false,
                blockquote: false,
                codeBlock: false,
                horizontalRule: false,
                strike: false,
                code: false,
                orderedList: {
                    HTMLAttributes: { class: 'sw-obj-list' },
                },
            }),
            RowIdListItem,
        ],
        content: initialContent,
        immediatelyRender: false,
        editorProps: {
            attributes: {
                class: 'sw-obj-list-editor focus:outline-none',
                'aria-label': `Edit ${type} objectives`,
            },
        },
        onFocus: () => { isFocusedRef.current = true; },
        onBlur: ({ editor }) => {
            isFocusedRef.current = false;
            const html = editor.getHTML();
            const doc = new DOMParser().parseFromString(html, 'text/html');
            const items: ReconcileItem[] = [];
            doc.querySelectorAll('li').forEach((li) => {
                const id = li.getAttribute('data-row-id');
                const text = (li.textContent ?? '').replace(/\s+/g, ' ').trim();
                items.push({ id: id && id.length > 0 ? id : null, text });
            });
            onReconcileRef.current(typeRef.current, modeRef.current, items);
        },
    });

    // Re-seed editor when rows change from outside (regenerate, refetch). Skip
    // while focused so the caret isn't clobbered mid-edit.
    useEffect(() => {
        if (!editor) return;
        if (isFocusedRef.current) return;
        const next = rowsToHtml(rows, mode);
        const current = editor.getHTML();
        if (next === current) return;
        editor.commands.setContent(next);
    }, [editor, rows, mode, revisionKey]);

    return (
        <div
            className="sw-obj-list-wrap"
            style={{
                counterReset: `sw-obj ${sectionStart - 1}`,
            }}
        >
            <EditorContent editor={editor} />
        </div>
    );
}

export default ObjectiveListEditor;
