# Notes: Date Picker, Export Header & Formatting Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a note date field (F1), a standard project header table to PDF/DOCX exports (F2), and attach a formatted transmittal table to exports (F3).

**Architecture:** Add `noteDate` to the DB/types/validation layer; surface it as a clickable date in the expanded panel header. For exports, prepend a header HTML table and append a transmittal HTML table to the note's HTML content in the export route — the existing `pdf-enhanced.ts` / `docx-enhanced.ts` renderers already know how to parse `class="project-info"` and `class="transmittal"` tables, so no changes to those utilities are needed.

**Tech Stack:** Next.js 14 App Router, Drizzle ORM (PostgreSQL), jsPDF + jsPDF-autoTable (PDF), docx library (DOCX), Zod validation, React with native `<input type="date">`.

---

## Task 1: Add `noteDate` to DB schema and run migration

**Files:**
- Modify: `src/lib/db/pg-schema.ts` (notes table, ~line 1332)

**Step 1: Add the column**

In the `notes` pgTable definition, after the `color` line add:
```ts
noteDate: text('note_date'),
```

**Step 2: Push migration**
```bash
npm run db:push
```
Expected: schema updated, no data loss.

**Step 3: Commit**
```bash
git add src/lib/db/pg-schema.ts
git commit -m "feat: add noteDate column to notes table"
```

---

## Task 2: Update types and validation

**Files:**
- Modify: `src/types/notes-meetings-reports.ts` (Note interface ~line 41, UpdateNoteRequest ~line 75)
- Modify: `src/lib/validations/notes-meetings-reports-schema.ts` (updateNoteSchema ~line 24)

**Step 1: Add to Note interface**

In `Note`:
```ts
noteDate: string | null;
```

In `UpdateNoteRequest`:
```ts
noteDate?: string | null;
```

**Step 2: Add to zod schema**

In `updateNoteSchema`:
```ts
noteDate: z.string().nullable().optional(),
```

**Step 3: Commit**
```bash
git add src/types/notes-meetings-reports.ts src/lib/validations/notes-meetings-reports-schema.ts
git commit -m "feat: add noteDate to Note type and validation schema"
```

---

## Task 3: Handle `noteDate` in the PATCH API route

**Files:**
- Modify: `src/app/api/notes/[id]/route.ts` (~line 118)

**Step 1: Destructure from validated data**

Change the destructure at ~line 118 to:
```ts
const { title, content, isStarred, color, reportingPeriodStart, reportingPeriodEnd, noteDate } = validationResult.data;
```

**Step 2: Add to updateData block** (after the `reportingPeriodEnd` block):
```ts
if (noteDate !== undefined) {
    updateData.noteDate = noteDate;
}
```

**Step 3: Commit**
```bash
git add src/app/api/notes/[id]/route.ts
git commit -m "feat: handle noteDate in note PATCH route"
```

---

## Task 4: Feature 1 — Date picker in SingleNotePanel expanded header

**Files:**
- Modify: `src/components/notes-meetings-reports/SingleNotePanel.tsx`

**Goal:** In the expanded header, show the note's date formatted as `"27 Apr 2026"` to the far right of the title segment (inside the coloured title bar). Clicking it opens a hidden native date picker. Saving fires `onUpdate({ noteDate })`.

**Step 1: Add state and refs**

After the existing `inputRef`/`textareaRef` refs, add:
```tsx
const dateInputRef = useRef<HTMLInputElement>(null);
const [localDate, setLocalDate] = useState<string>(note.noteDate || '');
```

**Step 2: Sync localDate when note changes**

After the existing `useEffect` that syncs `localTitle`, add:
```tsx
useEffect(() => {
    setLocalDate(note.noteDate || '');
}, [note.id, note.noteDate]);
```

**Step 3: Add format helper and handler**

After the `handleColorChange` callback, add:
```tsx
const formatNoteDate = (iso: string) => {
    if (!iso) return '';
    const d = new Date(iso + 'T00:00:00');
    return d.toLocaleDateString('en-AU', { day: '2-digit', month: 'short', year: 'numeric' });
};

const handleDateClick = () => {
    if (!dateInputRef.current) return;
    if (!localDate) {
        const today = new Date().toISOString().split('T')[0];
        dateInputRef.current.value = today;
    }
    dateInputRef.current.showPicker?.();
    dateInputRef.current.click();
};

const handleDateChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value; // ISO YYYY-MM-DD or empty
    setLocalDate(val);
    await onUpdate({ noteDate: val || null });
};
```

**Step 4: Add date display to expanded header title segment**

Inside the expanded `<div className="flex items-center flex-1 ...">` (the title bar), after the title span/input, add:
```tsx
{/* Date — hidden native picker triggered by click */}
<input
    ref={dateInputRef}
    type="date"
    value={localDate}
    onChange={handleDateChange}
    className="absolute opacity-0 pointer-events-none w-0 h-0"
    tabIndex={-1}
/>
{localDate && (
    <span
        onClick={handleDateClick}
        className="ml-3 shrink-0 text-xs font-medium opacity-70 hover:opacity-100 cursor-pointer transition-opacity whitespace-nowrap"
        title="Click to change date"
    >
        {formatNoteDate(localDate)}
    </span>
)}
{!localDate && (
    <span
        onClick={handleDateClick}
        className="ml-3 shrink-0 text-xs opacity-40 hover:opacity-70 cursor-pointer transition-opacity whitespace-nowrap"
        title="Set date"
    >
        + date
    </span>
)}
```

**Step 5: Commit**
```bash
git add src/components/notes-meetings-reports/SingleNotePanel.tsx
git commit -m "feat: add clickable date picker to expanded note header"
```

---

## Task 5: Features 2 & 3 — Enhance export route with header + transmittal table

**Files:**
- Modify: `src/app/api/notes/[id]/export/route.ts`
- Modify: `src/lib/db/index.ts` (check `documents` and `projectDetails` are exported; add if missing)

**Background:** The existing `exportToPDF`/`exportToDOCX` functions parse HTML and apply special rendering when they encounter `class="project-info"` or `class="transmittal"` tables. We generate those HTML tables in the route and prepend/append them to the note's content — zero changes to the export utilities.

**The header table layout (from the image):**
```
| Project Name  | [project name]                              |         |
| Address       | [address]                                   |         |
| Document      | [note title]                    Issued DD/MM/YYYY |
```
3-column consistent layout: col 0 = label (blue bold), col 1 = value, col 2 = issued date (blue bold right-aligned) or empty.

**Step 1: Add imports**

At top of `export/route.ts`, add:
```ts
import { projects, projectDetails, noteTransmittals, documents } from '@/lib/db';
import { leftJoin } from 'drizzle-orm';
```
(Use whichever imports are already present from `@/lib/db`.)

**Step 2: Fetch project details after the note query**

After fetching `note`, add:
```ts
// Fetch project header data
const [projectRow] = await db
    .select({
        projectCode: projects.code,
        projectName: projects.name,
        address: projectDetails.address,
    })
    .from(projects)
    .leftJoin(projectDetails, eq(projectDetails.projectId, projects.id))
    .where(eq(projects.id, note.projectId))
    .limit(1);

// Fetch attached transmittal documents
const transmittalDocs = await db
    .select({
        drawingNumber: documents.drawingNumber,
        drawingName: documents.drawingName,
        drawingRevision: documents.drawingRevision,
        originalName: documents.originalName,
        categoryName: documents.categoryName,
    })
    .from(noteTransmittals)
    .leftJoin(documents, eq(documents.id, noteTransmittals.documentId))
    .where(eq(noteTransmittals.noteId, note.id));
```

*(Check actual column names on `documents` table — use `name` if `originalName` doesn't exist, and omit missing columns.)*

**Step 3: Build the helper functions** (add near top of handler, after imports):

```ts
function buildNoteHeaderHtml(
    projectCode: string | null,
    projectName: string,
    address: string | null,
    noteTitle: string,
    noteDate: string | null,
): string {
    const projectLabel = projectCode ? `${projectCode} — ${projectName}` : projectName;
    const issuedStr = noteDate
        ? (() => {
            const d = new Date(noteDate + 'T00:00:00');
            const day = String(d.getDate()).padStart(2, '0');
            const month = String(d.getMonth() + 1).padStart(2, '0');
            const year = d.getFullYear();
            return `Issued ${day}/${month}/${year}`;
        })()
        : '';

    return `
<table class="project-info" style="width:100%;border-collapse:collapse;margin-bottom:12px;">
  <tbody>
    <tr>
      <td class="label-col" style="font-weight:bold;color:#1A6FB5;padding:4px 6px;border:1px solid #DADADA;width:18%;">Project Name</td>
      <td style="padding:4px 6px;border:1px solid #DADADA;">${escapeHtml(projectLabel)}</td>
      <td style="padding:4px 6px;border:1px solid #DADADA;width:22%;"></td>
    </tr>
    <tr>
      <td class="label-col" style="font-weight:bold;color:#1A6FB5;padding:4px 6px;border:1px solid #DADADA;">Address</td>
      <td style="padding:4px 6px;border:1px solid #DADADA;">${escapeHtml(address || '')}</td>
      <td style="padding:4px 6px;border:1px solid #DADADA;"></td>
    </tr>
    <tr>
      <td class="label-col" style="font-weight:bold;color:#1A6FB5;padding:4px 6px;border:1px solid #DADADA;">Document</td>
      <td style="padding:4px 6px;border:1px solid #DADADA;font-weight:bold;">${escapeHtml(noteTitle)}</td>
      <td class="issued-col" style="font-weight:bold;color:#1A6FB5;padding:4px 6px;border:1px solid #DADADA;text-align:right;">${escapeHtml(issuedStr)}</td>
    </tr>
  </tbody>
</table>
<br/>
`;
}

function buildTransmittalHtml(docs: { drawingNumber: string | null; drawingName: string | null; drawingRevision: string | null; originalName: string | null; categoryName: string | null }[]): string {
    if (docs.length === 0) return '';
    const rows = docs.map((d, i) => `
    <tr>
      <td style="padding:3px 6px;border:1px solid #DADADA;">${i + 1}</td>
      <td style="padding:3px 6px;border:1px solid #DADADA;">${escapeHtml(d.drawingNumber || '')}</td>
      <td style="padding:3px 6px;border:1px solid #DADADA;">${escapeHtml(d.drawingName || d.originalName || '')}</td>
      <td style="padding:3px 6px;border:1px solid #DADADA;">${escapeHtml(d.drawingRevision || '')}</td>
      <td style="padding:3px 6px;border:1px solid #DADADA;">${escapeHtml(d.categoryName || '')}</td>
    </tr>`).join('');

    return `
<br/>
<h3>Attachments</h3>
<table class="transmittal" style="width:100%;border-collapse:collapse;">
  <thead>
    <tr>
      <th style="padding:4px 6px;border:1px solid #DADADA;background:#F5F5F5;width:5%;">#</th>
      <th style="padding:4px 6px;border:1px solid #DADADA;background:#F5F5F5;width:10%;">DWG #</th>
      <th style="padding:4px 6px;border:1px solid #DADADA;background:#F5F5F5;width:45%;">Name</th>
      <th style="padding:4px 6px;border:1px solid #DADADA;background:#F5F5F5;width:8%;">Rev</th>
      <th style="padding:4px 6px;border:1px solid #DADADA;background:#F5F5F5;width:32%;">Category</th>
    </tr>
  </thead>
  <tbody>${rows}
  </tbody>
</table>
`;
}

function escapeHtml(str: string): string {
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
```

**Step 4: Compose the final HTML**

Replace the existing `htmlContent` construction with:
```ts
const headerHtml = buildNoteHeaderHtml(
    projectRow?.projectCode ?? null,
    projectRow?.projectName ?? title,
    projectRow?.address ?? null,
    title,
    note.noteDate ?? null,
);
const transmittalHtml = buildTransmittalHtml(transmittalDocs);
const bodyHtml = note.content && note.content.trim().length > 0
    ? note.content
    : '<p><em>(This note is empty)</em></p>';

const fullHtml = headerHtml + bodyHtml + transmittalHtml;
```

Then pass `fullHtml` instead of `htmlContent` to `exportToPDF` / `exportToDOCX`.

**Step 5: Check documents schema columns**

Run a quick grep to confirm exact column names on the `documents` table:
```bash
grep -n "drawingNumber\|drawingName\|drawingRevision\|categoryName\|originalName" src/lib/db/pg-schema.ts | head -20
```
Adjust the query in Step 2 to match actual column names.

**Step 6: Commit**
```bash
git add src/app/api/notes/[id]/export/route.ts
git commit -m "feat: add project header and transmittal table to note exports"
```

---

## Task 6: Verify end-to-end

**Manual test checklist:**
1. Open a project → Notes tab → expand a note
2. Verify date area shows `+ date` when no date is set
3. Click `+ date` → native date picker opens, select a date → date appears as `"27 Apr 2026"`
4. Click the date string again → picker opens, change date → updates
5. Export to PDF → header table shows at top with Project Name / Address / Document / Issued date
6. Export to PDF with transmittals attached → Attachments table appears at bottom
7. Export to DOCX → same header and transmittal table
8. Export with no transmittals → no Attachments section appears
9. Reload page → date persists on the note

---

## Key Constraints

- **No changes to `pdf-enhanced.ts` or `docx-enhanced.ts`** — we leverage their existing `project-info` and `transmittal` class detection
- **`noteDate` is nullable** — never force-set it; show `+ date` hint when null
- The date format in the header is `DD/MM/YYYY` (e.g., `Issued 27/02/2026`); in the panel it is `DD Mon YYYY` (e.g., `27 Apr 2026`)
- **No "Issued" prefix** on the note panel date — only in the export header
