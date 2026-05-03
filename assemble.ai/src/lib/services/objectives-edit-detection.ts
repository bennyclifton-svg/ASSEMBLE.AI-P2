interface DetectionRow {
  id: string;
  text: string;
}

export interface DetectionInput {
  rows: DetectionRow[];
  snapshot: string[] | null;
}

/**
 * Strip <p> wrappers (harmless TipTap output) but preserve any other HTML marks.
 * Returns the plain text inside, plus a flag indicating whether other marks remain.
 */
function analyseHtml(html: string): { plain: string; hasOtherMarks: boolean } {
  const stripped = html.replace(/^<p>([\s\S]*?)<\/p>$/i, '$1').trim();
  const hasOtherMarks = /<(?!p\b|\/p\b)[a-z][^>]*>/i.test(stripped);
  const plain = stripped.replace(/<[^>]*>/g, '').trim();
  return { plain, hasOtherMarks };
}

export function hasManualEdits(input: DetectionInput): boolean {
  const { rows, snapshot } = input;

  if (!snapshot) return rows.length > 0;
  if (rows.length !== snapshot.length) return true;

  for (let i = 0; i < rows.length; i++) {
    const { plain, hasOtherMarks } = analyseHtml(rows[i].text);
    if (hasOtherMarks) return true;
    if (plain.trim() !== snapshot[i].trim()) return true;
  }

  return false;
}
