import type { ObjectiveRow } from './ObjectivesWorkspace';

export interface EditorItem {
  id: string | null;
  html: string;
}

export interface RowOps {
  creates: { html: string; sortOrder: number }[];
  updates: { id: string; html?: string; sortOrder?: number }[];
  deletes: string[];
}

function isMeaningfullyDifferent(rowText: string, editorHtml: string): boolean {
  // AI / saved text is plain; TipTap may wrap it in a single <p>. Strip exactly
  // one outer <p> so a no-op edit doesn't look dirty.
  const norm = (s: string) => s.replace(/^<p>([\s\S]*?)<\/p>$/i, '$1').trim();
  return norm(rowText) !== norm(editorHtml);
}

export function computeRowOps(input: {
  currentRows: ObjectiveRow[];
  editorItems: EditorItem[];
}): RowOps {
  const { currentRows, editorItems } = input;
  const ops: RowOps = { creates: [], updates: [], deletes: [] };

  const seenIds = new Set<string>();

  editorItems.forEach((item, idx) => {
    if (!item.id) {
      ops.creates.push({ html: item.html, sortOrder: idx });
      return;
    }

    seenIds.add(item.id);
    const existing = currentRows.find((r) => r.id === item.id);
    if (!existing) {
      ops.creates.push({ html: item.html, sortOrder: idx });
      return;
    }

    const update: { id: string; html?: string; sortOrder?: number } = { id: item.id };
    const currentText =
      existing.status === 'polished' && existing.textPolished
        ? existing.textPolished
        : existing.text;
    if (isMeaningfullyDifferent(currentText, item.html)) update.html = item.html;
    if (existing.sortOrder !== idx) update.sortOrder = idx;
    if (update.html !== undefined || update.sortOrder !== undefined) ops.updates.push(update);
  });

  for (const row of currentRows) {
    if (!seenIds.has(row.id)) ops.deletes.push(row.id);
  }

  return ops;
}
