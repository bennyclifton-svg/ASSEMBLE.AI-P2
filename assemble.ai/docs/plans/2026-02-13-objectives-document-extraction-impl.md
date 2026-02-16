# Objectives Document Extraction — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make the objectives Generate button context-aware — extract from attached documents when available, fall back to inference rules when not.

**Architecture:** New `objectivesTransmittals` junction table links documents to objectives. The existing generate API route branches based on whether documents are attached: documents → RAG retrieval + extraction prompt; no documents → current inference rules path. The `AttachmentSection` component is reused below the two objectives columns.

**Tech Stack:** Next.js API routes, Drizzle ORM (PostgreSQL), RAG retrieval pipeline (pgvector + Voyage embeddings), Anthropic Claude API, shadcn/ui components.

---

### Task 1: Add `objectivesTransmittals` Table to PostgreSQL Schema

**Files:**
- Modify: `src/lib/db/pg-schema.ts`
- Modify: `src/lib/db/index.ts`

**Step 1: Add the table definition to pg-schema.ts**

Find the `profilerObjectives` table and its relations (around line 1122). Add the new table and relations after the existing `profilerObjectivesRelations`:

```typescript
// Objectives Transmittals (document attachments for objectives extraction)
export const objectivesTransmittals = pgTable('objectives_transmittals', {
    id: text('id').primaryKey(),
    objectivesId: text('objectives_id').references(() => profilerObjectives.id, { onDelete: 'cascade' }).notNull(),
    documentId: text('document_id').references(() => documents.id).notNull(),
    addedAt: text('added_at'),
});

export const objectivesTransmittalsRelations = relations(objectivesTransmittals, ({ one }) => ({
    objectives: one(profilerObjectives, {
        fields: [objectivesTransmittals.objectivesId],
        references: [profilerObjectives.id],
    }),
    document: one(documents, {
        fields: [objectivesTransmittals.documentId],
        references: [documents.id],
    }),
}));
```

Also add a `transmittals` relation to the existing `profilerObjectivesRelations`:

```typescript
export const profilerObjectivesRelations = relations(profilerObjectives, ({ one, many }) => ({
    project: one(projects, {
        fields: [profilerObjectives.projectId],
        references: [projects.id],
    }),
    transmittals: many(objectivesTransmittals),
}));
```

**Step 2: Export from db/index.ts**

Add `objectivesTransmittals` to the destructured exports from `pgSchema` (after `profilerObjectives` on line 90):

```typescript
    profilerObjectives,
    objectivesTransmittals,
    profilePatterns,
```

**Step 3: Run the database migration**

Run: `cd assemble.ai && npx drizzle-kit push`
Expected: Table `objectives_transmittals` created successfully.

**Step 4: Commit**

```bash
git add src/lib/db/pg-schema.ts src/lib/db/index.ts
git commit -m "feat: add objectivesTransmittals table for document-based objectives extraction"
```

---

### Task 2: Create Objectives Transmittal API Route

**Files:**
- Create: `src/app/api/projects/[projectId]/objectives/transmittal/route.ts`

**Step 1: Create the API route**

Model this on the existing `src/app/api/notes/[id]/transmittal/route.ts` pattern. The route handles:
- `GET` — Fetch documents attached to this project's objectives
- `POST` — Save document attachments (replace all)

```typescript
/**
 * Objectives Transmittal API Route
 * GET /api/projects/[projectId]/objectives/transmittal - Get attached documents
 * POST /api/projects/[projectId]/objectives/transmittal - Save document attachments
 */

import { NextRequest, NextResponse } from 'next/server';
import { handleApiError } from '@/lib/api-utils';
import { db } from '@/lib/db';
import {
    profilerObjectives,
    objectivesTransmittals,
    documents,
    versions,
    fileAssets,
    categories,
    subcategories,
} from '@/lib/db';
import { getCurrentUser } from '@/lib/auth/get-user';
import { v4 as uuidv4 } from 'uuid';
import { eq, inArray } from 'drizzle-orm';

interface RouteContext {
    params: Promise<{ projectId: string }>;
}

export async function GET(
    request: NextRequest,
    context: RouteContext
) {
    return handleApiError(async () => {
        const authResult = await getCurrentUser();
        if (!authResult.user) {
            return NextResponse.json({ error: authResult.error }, { status: authResult.status });
        }

        const { projectId } = await context.params;

        // Find objectives record for this project
        const [objectives] = await db
            .select({ id: profilerObjectives.id })
            .from(profilerObjectives)
            .where(eq(profilerObjectives.projectId, projectId))
            .limit(1);

        if (!objectives) {
            return NextResponse.json({
                projectId,
                documents: [],
            });
        }

        // Fetch transmittal items with document details
        const transmittalItems = await db
            .select({
                id: objectivesTransmittals.id,
                documentId: objectivesTransmittals.documentId,
                categoryId: documents.categoryId,
                subcategoryId: documents.subcategoryId,
                categoryName: categories.name,
                subcategoryName: subcategories.name,
                fileName: fileAssets.originalName,
                versionNumber: versions.versionNumber,
                uploadedAt: versions.createdAt,
                addedAt: objectivesTransmittals.addedAt,
                drawingNumber: fileAssets.drawingNumber,
                drawingName: fileAssets.drawingName,
                drawingRevision: fileAssets.drawingRevision,
                drawingExtractionStatus: fileAssets.drawingExtractionStatus,
            })
            .from(objectivesTransmittals)
            .innerJoin(documents, eq(objectivesTransmittals.documentId, documents.id))
            .leftJoin(versions, eq(documents.latestVersionId, versions.id))
            .leftJoin(fileAssets, eq(versions.fileAssetId, fileAssets.id))
            .leftJoin(categories, eq(documents.categoryId, categories.id))
            .leftJoin(subcategories, eq(documents.subcategoryId, subcategories.id))
            .where(eq(objectivesTransmittals.objectivesId, objectives.id))
            .orderBy(objectivesTransmittals.addedAt);

        const result = transmittalItems.map((item) => ({
            ...item,
            documentName: item.drawingName || item.fileName || 'Unknown',
            revision: item.versionNumber || 0,
        }));

        return NextResponse.json({
            projectId,
            objectivesId: objectives.id,
            documents: result,
        });
    });
}

export async function POST(
    request: NextRequest,
    context: RouteContext
) {
    return handleApiError(async () => {
        const authResult = await getCurrentUser();
        if (!authResult.user) {
            return NextResponse.json({ error: authResult.error }, { status: authResult.status });
        }

        const { projectId } = await context.params;
        const body = await request.json();
        const { documentIds } = body;

        if (!Array.isArray(documentIds)) {
            return NextResponse.json(
                { error: 'documentIds must be an array' },
                { status: 400 }
            );
        }

        // Find or create objectives record
        let [objectives] = await db
            .select({ id: profilerObjectives.id })
            .from(profilerObjectives)
            .where(eq(profilerObjectives.projectId, projectId))
            .limit(1);

        if (!objectives) {
            // Create empty objectives record so we can attach documents
            const emptyObjective = JSON.stringify({
                content: '',
                source: 'pending',
                originalAi: null,
                editHistory: null,
            });
            const newId = uuidv4();
            await db.insert(profilerObjectives).values({
                id: newId,
                projectId,
                functionalQuality: emptyObjective,
                planningCompliance: emptyObjective,
            });
            objectives = { id: newId };
        }

        // Clear existing transmittals
        await db
            .delete(objectivesTransmittals)
            .where(eq(objectivesTransmittals.objectivesId, objectives.id));

        // Add new documents
        if (documentIds.length > 0) {
            const now = new Date().toISOString();
            for (const documentId of documentIds) {
                await db.insert(objectivesTransmittals).values({
                    id: uuidv4(),
                    objectivesId: objectives.id,
                    documentId,
                    addedAt: now,
                });
            }
        }

        return NextResponse.json({
            success: true,
            count: documentIds.length,
        });
    });
}
```

**Step 2: Verify the route loads**

Run: `cd assemble.ai && npx next build --no-lint 2>&1 | head -30`
Expected: No compile errors for the new route.

**Step 3: Commit**

```bash
git add src/app/api/projects/[projectId]/objectives/transmittal/route.ts
git commit -m "feat: add objectives transmittal API for document attachments"
```

---

### Task 3: Create `useObjectivesTransmittal` Hook

**Files:**
- Create: `src/lib/hooks/use-objectives-transmittal.ts`

**Step 1: Create the hook**

Model on `useNoteTransmittal` from `src/lib/hooks/use-notes.ts` (lines 259-308):

```typescript
/**
 * Hook for managing objectives transmittal (document attachments)
 */

import { useCallback } from 'react';
import useSWR, { mutate as globalMutate } from 'swr';

interface TransmittalDocument {
    id: string;
    documentId: string;
    documentName: string;
    categoryName: string | null;
    subcategoryName: string | null;
    fileName: string | null;
    versionNumber: number | null;
    drawingNumber: string | null;
    drawingName: string | null;
    drawingRevision: string | null;
    addedAt: string | null;
}

interface UseObjectivesTransmittalReturn {
    documents: TransmittalDocument[];
    isLoading: boolean;
    error: Error | null;
    saveTransmittal: (documentIds: string[]) => Promise<void>;
    refetch: () => void;
}

const fetcher = (url: string) => fetch(url).then(res => {
    if (!res.ok) throw new Error('Failed to fetch');
    return res.json();
});

export function useObjectivesTransmittal(projectId: string | null): UseObjectivesTransmittalReturn {
    const swrKey = projectId ? `/api/projects/${projectId}/objectives/transmittal` : null;

    const { data, error, isLoading, mutate } = useSWR<{ projectId: string; documents: TransmittalDocument[] }>(
        swrKey,
        fetcher,
        {
            revalidateOnFocus: false,
        }
    );

    const saveTransmittal = useCallback(async (documentIds: string[]): Promise<void> => {
        if (!projectId) {
            throw new Error('Project ID is required');
        }

        const response = await fetch(`/api/projects/${projectId}/objectives/transmittal`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ documentIds }),
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({ error: 'Failed to save transmittal' }));
            throw new Error(error.error || 'Failed to save transmittal');
        }

        mutate();
    }, [projectId, mutate]);

    const refetch = useCallback(() => {
        mutate();
    }, [mutate]);

    return {
        documents: data?.documents ?? [],
        isLoading,
        error: error ?? null,
        saveTransmittal,
        refetch,
    };
}
```

**Step 2: Commit**

```bash
git add src/lib/hooks/use-objectives-transmittal.ts
git commit -m "feat: add useObjectivesTransmittal hook"
```

---

### Task 4: Modify Generate API to Branch on Attached Documents

**Files:**
- Modify: `src/app/api/projects/[projectId]/objectives/generate/route.ts`

**Step 1: Add document-based extraction logic**

The existing `POST` handler currently only does inference-rules generation. Modify it to:
1. Check for attached documents via `objectivesTransmittals`
2. If documents exist → use RAG retrieval + extraction prompt
3. If no documents → use existing inference rules path (unchanged)

At the top of the file, add imports:

```typescript
import { objectivesTransmittals } from '@/lib/db/pg-schema';
import { retrieve } from '@/lib/rag/retrieval';
```

Inside the `POST` function, after fetching the profile (line ~60), add the document check **before** the inference rules block. The logic branches:

```typescript
// Check for attached documents
const [objectives] = await db
    .select({ id: profilerObjectives.id })
    .from(profilerObjectives)
    .where(eq(profilerObjectives.projectId, projectId))
    .limit(1);

let attachedDocumentIds: string[] = [];
if (objectives) {
    const transmittals = await db
        .select({ documentId: objectivesTransmittals.documentId })
        .from(objectivesTransmittals)
        .where(eq(objectivesTransmittals.objectivesId, objectives.id));
    attachedDocumentIds = transmittals.map(t => t.documentId);
}

const hasAttachedDocuments = attachedDocumentIds.length > 0;
```

Then wrap the existing inference code in `if (!hasAttachedDocuments)` and add the document extraction path in `if (hasAttachedDocuments)`:

**Document extraction path:**

```typescript
if (hasAttachedDocuments) {
    console.log(`[objectives-generate] Extracting from ${attachedDocumentIds.length} attached documents`);

    // RAG retrieval — broad queries to cover both sections
    const functionalQuery = 'project objectives, functional requirements, quality standards, design features, performance criteria, operational requirements, spatial requirements, material specifications';
    const planningQuery = 'planning approvals, compliance requirements, building codes, authority requirements, certifications, statutory requirements, environmental compliance, regulatory framework';

    const [functionalResults, planningResults] = await Promise.all([
        retrieve(functionalQuery, {
            documentIds: attachedDocumentIds,
            topK: 30,
            rerankTopK: 15,
            includeParentContext: true,
            minRelevanceScore: 0.2,
        }),
        retrieve(planningQuery, {
            documentIds: attachedDocumentIds,
            topK: 30,
            rerankTopK: 15,
            includeParentContext: true,
            minRelevanceScore: 0.2,
        }),
    ]);

    // Build context from retrieved chunks
    const formatChunks = (results: any[]) => results
        .map((r, i) => `[Source ${i + 1}${r.sectionTitle ? `: ${r.sectionTitle}` : ''}]\n${r.content}`)
        .join('\n\n');

    const functionalContext = formatChunks(functionalResults);
    const planningContext = formatChunks(planningResults);

    const extractionPrompt = `You are an expert construction project manager in Australia.

You have been given excerpts from project documents (briefs, Statements of Environmental Effects, client design objectives, etc.). Extract project objectives from these documents and sort them into two categories.

## Retrieved Content — Functional & Quality Related
${functionalContext || '(No relevant content found)'}

## Retrieved Content — Planning & Compliance Related
${planningContext || '(No relevant content found)'}

## Section Definitions — CRITICAL:

FUNCTIONAL & QUALITY — What the building provides and how well:
- Physical attributes (bedrooms, floors, spaces, areas)
- Design features (open plan, layout, configuration)
- Operational requirements (storage, parking, amenities)
- Quality/finish standards (premium finishes, materials, fixtures)
- Performance requirements (acoustic, thermal, structural)
- User experience (accessibility features, natural light)
Headers to use: Design Requirements, Quality Standards, Operational Requirements

PLANNING & COMPLIANCE — Approvals, regulations, and certifications needed:
- Building codes (NCC, BCA classification)
- Regulatory approvals (DA, CDC, permits)
- Australian Standards (AS 2419.1, AS 3959, etc.)
- Certifications required (BASIX, NatHERS, fire engineering)
- Authority requirements (council, fire brigade, utilities)
- Environmental compliance (contamination, stormwater)
Headers to use: Regulatory Compliance, Certification Requirements, Authority Approvals

## Instructions:
1. Extract ONLY objectives/requirements that are explicitly stated or clearly implied in the source documents
2. DO NOT invent or hallucinate any objectives not supported by the documents
3. Sort each item into the correct section (functional vs planning)
4. Format as SHORT bullet points (2-5 words each)
5. Group by category using bold headers
6. Output 8-15 bullets per section where the documents support it
7. DO NOT duplicate items between sections
8. OUTPUT FORMAT: HTML tags — <p><strong>Header</strong></p> for headers, <ul><li>item</li></ul> for bullets

Respond in JSON format:
{
  "functionalQuality": "objectives as HTML with <strong>Headers</strong> and <ul><li> bullet points",
  "planningCompliance": "objectives as HTML with <strong>Headers</strong> and <ul><li> bullet points"
}`;

    const response = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2000,
        messages: [{ role: 'user', content: extractionPrompt }],
    });

    // ... rest of response parsing is identical to existing code
}
```

The response parsing, JSON extraction, and database save logic after the Claude call remains the same for both paths. Keep the existing code for the `else` (no documents) path.

**Step 2: Verify build**

Run: `cd assemble.ai && npx next build --no-lint 2>&1 | head -30`
Expected: No compile errors.

**Step 3: Commit**

```bash
git add src/app/api/projects/[projectId]/objectives/generate/route.ts
git commit -m "feat: smart objectives generation — extract from documents or use inference rules"
```

---

### Task 5: Add Attachment Section to ObjectivesProfilerSection UI

**Files:**
- Modify: `src/components/profiler/ObjectivesProfilerSection.tsx`

**Step 1: Add the attachment section below the two-column grid**

Import the required components and hook:

```typescript
import { AttachmentSection } from '@/components/notes-meetings-reports/shared/AttachmentSection';
import { useObjectivesTransmittal } from '@/lib/hooks/use-objectives-transmittal';
```

Inside the `ObjectivesProfilerSection` component, add the transmittal hook:

```typescript
const { documents: attachedDocuments, isLoading: isLoadingTransmittals, saveTransmittal } = useObjectivesTransmittal(projectId);
```

Update the `canGenerate` check to allow generation when documents are attached (even without a complete profile):

```typescript
const hasAttachedDocuments = attachedDocuments.length > 0;
const canGenerateFromProfile = profileData?.buildingClass && profileData?.projectType && profileData?.subclass?.length > 0;
const canGenerate = canGenerateFromProfile || hasAttachedDocuments;
```

Update the Generate button title to reflect the current mode:

```typescript
title={
    hasAttachedDocuments
        ? 'Extract objectives from attached documents'
        : canGenerateFromProfile
        ? 'Generate objectives from profile'
        : 'Complete profile or attach documents to enable'
}
```

Update the `handleGenerate` function to pass `hasDocuments` flag to the API:

```typescript
body: JSON.stringify({ profileId: profileData?.id, section, hasDocuments: hasAttachedDocuments }),
```

Add the `AttachmentSection` below the grid in the return JSX. Add `onSaveTransmittal` and `onLoadTransmittal` props to the component interface (these will be passed from the parent `ProcurementCard`):

```tsx
return (
    <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
            {/* Functional & Quality Objectives */}
            <ObjectiveEditor ... />
            {/* Planning & Compliance Objectives */}
            <ObjectiveEditor ... />
        </div>

        {/* Document Attachments */}
        <div className="px-2">
            <AttachmentSection
                documents={attachedDocuments.map(d => ({
                    id: d.id,
                    documentId: d.documentId,
                    documentName: d.documentName || d.fileName || 'Unknown',
                    categoryName: d.categoryName || null,
                    subcategoryName: d.subcategoryName || null,
                    revision: d.versionNumber || 0,
                    drawingNumber: d.drawingNumber || null,
                    drawingName: d.drawingName || null,
                    drawingRevision: d.drawingRevision || null,
                }))}
                isLoading={isLoadingTransmittals}
                onSave={onSaveTransmittal}
                onLoad={onLoadTransmittal}
                compact
            />
        </div>
    </div>
);
```

Add `onSaveTransmittal` and `onLoadTransmittal` to the component props interface:

```typescript
interface ObjectivesProfilerSectionProps {
    projectId: string;
    profileData: any;
    objectivesData: any;
    onUpdate: () => void;
    onSaveTransmittal?: () => void;
    onLoadTransmittal?: () => void;
}
```

**Step 2: Commit**

```bash
git add src/components/profiler/ObjectivesProfilerSection.tsx
git commit -m "feat: add document attachment section to objectives UI"
```

---

### Task 6: Wire Up Transmittal Save/Load in ProcurementCard

**Files:**
- Modify: `src/components/dashboard/ProcurementCard.tsx`

**Step 1: Add transmittal handling to ProcurementCard**

This is where the Save/Load buttons connect to the document repo panel (right nav). Follow the same pattern used by `NotesPanel` / `SingleNotePanel` for transmittal save/load.

Import the hook:

```typescript
import { useObjectivesTransmittal } from '@/lib/hooks/use-objectives-transmittal';
```

Inside the component, add the hook and handlers:

```typescript
const { documents: objectivesDocuments, saveTransmittal: saveObjectivesTransmittal, refetch: refetchObjectivesTransmittal } = useObjectivesTransmittal(projectId);
```

Create save/load handlers that interact with the document repo selection (check how NotesPanel does this — it likely uses a shared context or callback from the parent layout):

```typescript
// Pass onSaveTransmittal and onLoadTransmittal to ObjectivesProfilerSection
<ObjectivesProfilerSection
    projectId={projectId}
    profileData={{...}}
    objectivesData={objectivesData}
    onUpdate={() => {
        fetchObjectivesData();
    }}
    onSaveTransmittal={handleObjectivesSaveTransmittal}
    onLoadTransmittal={handleObjectivesLoadTransmittal}
/>
```

The exact wiring depends on how the document repo panel passes selected documents. Check `NotesPanel` for the pattern — it likely receives a `selectedDocumentIds` prop or uses a context.

**Step 2: Commit**

```bash
git add src/components/dashboard/ProcurementCard.tsx
git commit -m "feat: wire objectives transmittal save/load to document repo"
```

---

### Task 7: Manual Testing & Polish

**Step 1: Test document extraction path**

1. Open a project with uploaded, RAG-processed documents
2. Navigate to Objectives tab
3. Click Save in the attachment section, select documents from repo
4. Verify documents appear in the attachment table
5. Click Generate — should extract objectives from documents (not inference rules)
6. Verify output: short bullets in both columns, sorted correctly
7. Click Polish — should expand bullets with standards (existing behaviour)

**Step 2: Test inference rules fallback**

1. Open a project with NO attached documents
2. Ensure profile is complete (building class, type, subclass)
3. Click Generate — should use inference rules (existing behaviour unchanged)

**Step 3: Test edge cases**

1. Attach documents, generate, then detach documents → content stays, next generate uses inference
2. Generate with no profile and no documents → button should be disabled
3. Attach documents to objectives, verify they persist across page loads

**Step 4: Commit**

```bash
git add -A
git commit -m "feat: objectives document extraction — complete implementation"
```
