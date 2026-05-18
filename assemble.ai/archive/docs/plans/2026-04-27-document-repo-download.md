# Document Repository Bulk Download Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a Download button to the document repository table that zips and downloads all selected documents.

**Architecture:** Reuse the JSZip + `getFileFromStorage` pattern from the existing RFT transmittal download. Add a POST API route that accepts document IDs and returns a ZIP blob. Wire the button into `CategorizedList` where selection state already lives — no new state management needed.

**Tech Stack:** Next.js App Router API route, JSZip, `getFileFromStorage` utility, React state, Lucide icons, existing Button component.

---

### Task 1: Create the API Route

**Files:**
- Create: `src/app/api/projects/[projectId]/documents/download/route.ts`

This route follows the exact same pattern as `src/app/api/rft-new/[id]/transmittal/download/route.ts`. It accepts a list of document IDs, fetches their file assets, and returns a ZIP. No cover sheet PDF needed — keep it simple.

**Step 1: Create the route file**

```ts
/**
 * POST /api/projects/[projectId]/documents/download
 * Body: { documentIds: string[] }
 * Returns: application/zip blob
 */

import { NextRequest, NextResponse } from 'next/server';
import { handleApiError } from '@/lib/api-utils';
import { db } from '@/lib/db';
import { documents, versions, fileAssets } from '@/lib/db';
import { eq, inArray } from 'drizzle-orm';
import JSZip from 'jszip';
import { getFileFromStorage } from '@/lib/storage';

interface RouteContext {
    params: Promise<{ projectId: string }>;
}

export async function POST(request: NextRequest, context: RouteContext) {
    return handleApiError(async () => {
        const { projectId } = await context.params;
        const { documentIds } = await request.json() as { documentIds: string[] };

        if (!documentIds || documentIds.length === 0) {
            return NextResponse.json({ error: 'No document IDs provided' }, { status: 400 });
        }

        // Fetch document file assets via: documents → versions → fileAssets
        const items = await db
            .select({
                originalName: fileAssets.originalName,
                storagePath: fileAssets.storagePath,
            })
            .from(documents)
            .leftJoin(versions, eq(documents.latestVersionId, versions.id))
            .leftJoin(fileAssets, eq(versions.fileAssetId, fileAssets.id))
            .where(inArray(documents.id, documentIds));

        if (items.length === 0) {
            return NextResponse.json({ error: 'No documents found' }, { status: 404 });
        }

        // Build ZIP
        const zip = new JSZip();

        for (const item of items) {
            try {
                if (item.storagePath) {
                    const fileData = await getFileFromStorage(item.storagePath);
                    if (fileData) {
                        zip.file(item.originalName || 'unknown_file', fileData);
                    } else {
                        zip.file(`${item.originalName || 'unknown'}.txt`, `Error: File not found on server.`);
                    }
                } else {
                    zip.file(`${item.originalName || 'unknown'}.txt`, `Error: No storage path.`);
                }
            } catch (e) {
                console.error(`Failed to add file ${item.originalName} to zip`, e);
            }
        }

        const zipContent = await zip.generateAsync({ type: 'nodebuffer' });
        const filename = `Documents_${new Date().toISOString().split('T')[0]}.zip`;

        return new NextResponse(zipContent as unknown as BodyInit, {
            status: 200,
            headers: {
                'Content-Type': 'application/zip',
                'Content-Disposition': `attachment; filename="${filename}"`,
            },
        });
    });
}
```

**Step 2: Verify the route compiles**

```bash
npx tsc --noEmit
```

Expected: no errors related to the new file.

**Step 3: Commit**

```bash
git add src/app/api/projects/[projectId]/documents/download/route.ts
git commit -m "feat: add POST /api/projects/[projectId]/documents/download route"
```

---

### Task 2: Add Download Handler to CategorizedList

**Files:**
- Modify: `src/components/documents/CategorizedList.tsx`

**Step 1: Add `Download` to the lucide-react import**

Current import at line 13:
```ts
import { Trash2, Loader2, FileIcon, Folder, ChevronUp, ChevronDown, Trash, FileText, Upload } from 'lucide-react';
```

Replace with:
```ts
import { Trash2, Loader2, FileIcon, Folder, ChevronUp, ChevronDown, Trash, FileText, Upload, Download } from 'lucide-react';
```

**Step 2: Add `isDownloading` state**

In the state declarations block (after line 110), add:
```ts
const [isDownloading, setIsDownloading] = useState(false);
```

**Step 3: Add `handleDownload` function**

Add this after the existing `handleSelectAll` function. It mirrors the `handleDownloadTransmittal` pattern from `src/components/rft-new/RFTNewSection.tsx:134-167` exactly:

```ts
const handleDownload = useCallback(async () => {
    if (selectedIds.size === 0) return;

    setIsDownloading(true);
    try {
        const response = await fetch(`/api/projects/${projectId}/documents/download`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ documentIds: Array.from(selectedIds) }),
        });

        if (!response.ok) throw new Error('Download failed');

        const blob = await response.blob();
        const contentDisposition = response.headers.get('Content-Disposition');
        let filename = `Documents_${new Date().toISOString().split('T')[0]}.zip`;
        if (contentDisposition) {
            const match = contentDisposition.match(/filename="(.+)"/);
            if (match) filename = match[1];
        }

        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
    } catch (error) {
        console.error('Download error:', error);
    } finally {
        setIsDownloading(false);
    }
}, [selectedIds, projectId]);
```

**Step 4: Verify no TypeScript errors**

```bash
npx tsc --noEmit
```

Expected: no errors.

---

### Task 3: Add Download Button UI Above the Table

**Files:**
- Modify: `src/components/documents/CategorizedList.tsx`

The button goes inside the `/* Table View */` block (around line 638), directly before the `<div className="border border-[var(--color-border)] rounded-md overflow-hidden...">` table wrapper. Add a toolbar row with the Download button pinned to the right.

**Step 1: Insert toolbar row**

Find this comment and the div immediately after it (around line 639-640):
```tsx
/* Table View */
<div className="border border-[var(--color-border)] rounded-md overflow-hidden @container" ...>
```

Insert before that div:
```tsx
{/* Table Toolbar */}
<div className="flex items-center justify-end mb-2">
    <Button
        variant="ghost"
        size="sm"
        onClick={handleDownload}
        disabled={selectedIds.size === 0 || isDownloading}
        className="gap-1.5 text-xs text-[var(--color-text-muted)] disabled:opacity-30"
        title={selectedIds.size === 0 ? 'Select documents to download' : `Download ${selectedIds.size} document${selectedIds.size !== 1 ? 's' : ''}`}
    >
        {isDownloading ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
        ) : (
            <Download className="w-3.5 h-3.5" />
        )}
        {isDownloading ? 'Downloading...' : 'Download'}
    </Button>
</div>
```

**Step 2: Verify it renders correctly**

Start dev server and open a project's document repository. Confirm:
- Button is visible above table, right-aligned
- Button is dimmed when nothing is selected
- Button becomes active (full opacity) after selecting one or more documents
- Button shows spinner and "Downloading..." during download
- ZIP downloads with the selected files

**Step 3: Commit**

```bash
git add src/components/documents/CategorizedList.tsx
git commit -m "feat: add download button to document repository table"
```

---

### Verification Checklist

- [ ] Select 0 documents → Download button is greyed out and unclickable
- [ ] Select 1+ documents → Download button is active
- [ ] Click Download → spinner shows, ZIP downloaded, correct files inside
- [ ] Button returns to normal state after download completes
- [ ] Works in both local dev (filesystem storage) and production (Supabase storage)
