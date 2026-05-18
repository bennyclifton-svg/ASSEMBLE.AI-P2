# Briefing-Pack-Aware Objectives Generation Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Inject the full text of a project's "briefing" documents (everything in the `Planning` category — DA, SEE, Design Brief, etc.) into the existing objectives-generation flow, so the frontier model can add objectives that are grounded in narrative-coherent source documents instead of just inference rules over profiler state.

**Architecture:** Three-layer change. **Layer 1 (ingest):** persist LlamaParse output to a new `fileAssets.parsedText` column instead of discarding it after chunking — chunks still happen unchanged. **Layer 2 (retrieval):** new service `getBriefingPack(projectId)` returns the full text of all docs in `Planning`, with token-budget guardrails. **Layer 3 (generation):** extend the existing generate-pass prompt with the briefing pack and constrain `ai_added` to grounded additions only (Position B, no source citations required for now). The polish pass and inference rules are untouched.

**Tech Stack:** Next.js 15 (App Router), PostgreSQL via Drizzle ORM, BullMQ doc-worker, LlamaParse for parsing, Voyage Large 2 for embeddings, Anthropic SDK for generation, Jest for tests.

**Out of scope for MVP:** User-driven note summarisation (Workflow 2), backfill of existing documents, source citations on AI-added items, AI document classification.

---

## Pre-Implementation Context

### What exists today

- **Doc-worker:** `workers/document-processor/index.ts` — at line 91 calls `parseDocument(buffer, filename)` returning `{ content: string, metadata }`. At line 96 the `content` is passed straight to `chunkDocument` and the variable is then garbage-collected. **The full text is currently discarded.**
- **Schema:** `src/lib/db/pg-schema.ts:46-62` defines `fileAssets`. It already has an `ocrText` column populated *only* by the invoice OCR pipeline — semantically distinct from LlamaParse output, do not reuse.
- **Categories:** `src/lib/constants/categories.ts:6-13` defines `DOCUMENT_CATEGORIES.PLANNING.id = 'planning'`. The user's screenshot confirms 9 subcategories under Planning; all qualify as briefing in MVP.
- **Objectives generation entry point:** `src/lib/services/objectives-generation.ts:140` `generateObjectives(projectData, objectiveType, aiClient)`. The polish pass at `:173` is unchanged in this plan.
- **Prompt builder:** `src/lib/prompts/objectives-prompts.ts:28` `buildObjectivesGeneratePrompt(ctx)`. The prompt today contains no document context.
- **Token estimator:** `src/lib/rag/chunking.ts:45` `estimateTokens(text)` — exported via `src/lib/rag/index.ts`. Reuse.
- **Latest migration:** `drizzle-pg/0048_correspondence_program_evidence.sql`. New migration is `0049`.

### Constants the plan uses

- Per-doc token cap: **100,000 tokens.** Docs above this are skipped from the briefing pack with a warning.
- Total briefing-pack token cap: **500,000 tokens.** If exceeded after per-doc caps, drop oldest first.
- Briefing category list: `['planning']`. Hardcoded in code, easy to extend.

### Workflow

```
Upload → User picks Planning > <subcategory> → Click Ingest
   ↓
   LlamaParse runs once
   ↓
   Persist full text to fileAssets.parsedText  AND  embed chunks (unchanged)
   ↓
Later, user clicks "Generate objectives":
   ↓
   getBriefingPack(projectId) → list of { type, text } in Planning category, gated by caps
   ↓
   buildObjectivesGeneratePrompt(ctx, briefingPack) → prompt with <briefing_pack> block
   ↓
   AI returns { explicit, inferred, ai_added } — ai_added now permitted to expand from briefing docs
   ↓
   Polish pass unchanged
```

---

## Task 1: Add `parsedText` column to `fileAssets`

**Files:**
- Create: `drizzle-pg/0049_file_assets_parsed_text.sql`
- Modify: `src/lib/db/pg-schema.ts:46-62`

**Step 1: Write the migration SQL**

Create `drizzle-pg/0049_file_assets_parsed_text.sql`:

```sql
ALTER TABLE "file_assets" ADD COLUMN "parsed_text" text;
```

That's the entire migration. No index — we always look this up by `id` joined through versions, never by content.

**Step 2: Update the Drizzle schema**

In `src/lib/db/pg-schema.ts`, modify the `fileAssets` table definition. Find the block at line 46-62 and add the column before `createdAt`:

```typescript
export const fileAssets = pgTable('file_assets', {
    id: text('id').primaryKey(),
    storagePath: text('storage_path').notNull(),
    originalName: text('original_name').notNull(),
    mimeType: text('mime_type').notNull(),
    sizeBytes: integer('size_bytes').notNull(),
    hash: text('hash').notNull(),
    ocrStatus: text('ocr_status').default('PENDING'),
    ocrText: text('ocr_text'),
    parsedText: text('parsed_text'),  // ← NEW: full LlamaParse output, persisted at ingest
    // Drawing extraction fields
    drawingNumber: text('drawing_number'),
    drawingName: text('drawing_name'),
    drawingRevision: text('drawing_revision'),
    drawingExtractionStatus: text('drawing_extraction_status').default('PENDING'),
    drawingExtractionConfidence: integer('drawing_extraction_confidence'),
    createdAt: timestamp('created_at').defaultNow(),
});
```

**Step 3: Apply the migration**

Run: `npm run db:push`

Expected: column added without errors. Confirm with `npm run db:studio` → `file_assets` table → `parsed_text` column visible.

**Step 4: Commit**

```bash
git add drizzle-pg/0049_file_assets_parsed_text.sql src/lib/db/pg-schema.ts
git commit -m "feat(schema): add file_assets.parsed_text for full-text retrieval"
```

---

## Task 2: Persist parsed content in the doc-worker

**Files:**
- Modify: `workers/document-processor/index.ts:87-119`

**Step 1: Locate the parse-then-chunk block**

The current sequence (line 87-96):

```typescript
// Step 1: Read file from disk and parse document
job.updateProgress(10);
console.log(`[worker] Reading and parsing document: ${filename}`);
const buffer = await storage.get(storagePath);
const parsed = await parseDocument(buffer, filename);

// Step 2: Chunk document
job.updateProgress(30);
console.log(`[worker] Chunking document: ${filename}`);
const chunks = chunkDocument(parsed.content, documentId);
```

We will insert one persistence step between parse and chunk. The worker needs to know the `fileAssetId` for the document being processed. It currently isn't in the job payload — we need to look it up.

**Step 2: Add fileAssets import and a lookup helper**

In the dynamic-import block at the top of `bootstrap()` (around line 36-46), add:

```typescript
const { fileAssets, versions } = await import('../../src/lib/db/pg-schema');
const { db } = await import('../../src/lib/db');
```

Note: confirm `db` (the main Postgres client) is exported from `src/lib/db/index.ts`. If the worker uses `ragDb` for everything currently, you may need to re-use `ragDb` — both point at the same Postgres database in this project. Confirm this once during implementation; if there's only one client, use it.

**Step 3: Insert the persistence step**

After the `const parsed = await parseDocument(buffer, filename);` line (line 91), and BEFORE the chunking step, add:

```typescript
// Step 1b: Persist full parsed text on the file asset
//
// Why: enables retrieval-time full-text consumption (e.g. briefing-pack
// objectives generation) without re-parsing. Chunking still happens below.
job.updateProgress(20);
const fileAssetRow = await db
    .select({ id: fileAssets.id })
    .from(versions)
    .innerJoin(fileAssets, eq(versions.fileAssetId, fileAssets.id))
    .where(eq(versions.documentId, documentId))
    .orderBy(desc(versions.versionNumber))
    .limit(1);

if (fileAssetRow.length > 0) {
    await db
        .update(fileAssets)
        .set({ parsedText: parsed.content })
        .where(eq(fileAssets.id, fileAssetRow[0].id));
    console.log(`[worker] Persisted full text (${parsed.content.length} chars) to fileAssets.parsed_text`);
}
```

Add the `desc` import to the existing `drizzle-orm` dynamic import:

```typescript
const { eq, and, desc } = await import('drizzle-orm');
```

**Step 4: Manual smoke test**

1. Start docker + workers: `npm run db:up && npm run dev`
2. Upload a small PDF in any project, assign to Planning > Development Application, click Ingest
3. Wait for the worker log: `[worker] Persisted full text (NNN chars)…`
4. Run `npm run db:studio`, open `file_assets`, find the row, verify `parsed_text` is non-null and looks like the document content

Expected: `parsed_text` populated, chunks still created (existing behaviour unchanged).

**Step 5: Commit**

```bash
git add workers/document-processor/index.ts
git commit -m "feat(worker): persist LlamaParse output to file_assets.parsed_text"
```

---

## Task 3: Briefing-pack retrieval service (TDD)

This is the central reusable primitive. Two functions: `getDocumentFullText(versionId)` (per-doc, with cap) and `getBriefingPack(projectId)` (assembles the pack with total cap).

**Files:**
- Create: `src/lib/services/briefing-pack.ts`
- Create: `src/lib/services/__tests__/briefing-pack.test.ts`

### Step 1: Write failing tests

Create `src/lib/services/__tests__/briefing-pack.test.ts`:

```typescript
import { describe, it, expect, jest, beforeEach } from '@jest/globals';

// Mock the db before importing the service.
jest.mock('@/lib/db', () => ({
  db: {
    select: jest.fn(),
  },
}));

import { db } from '@/lib/db';
import {
  getDocumentFullText,
  getBriefingPack,
  PER_DOC_TOKEN_CAP,
  TOTAL_BRIEFING_TOKEN_CAP,
} from '../briefing-pack';

const mockSelect = db.select as jest.MockedFunction<typeof db.select>;

function chainable(rows: any[]) {
  const chain: any = {};
  chain.from = jest.fn(() => chain);
  chain.innerJoin = jest.fn(() => chain);
  chain.leftJoin = jest.fn(() => chain);
  chain.where = jest.fn(() => chain);
  chain.orderBy = jest.fn(() => chain);
  chain.limit = jest.fn(() => Promise.resolve(rows));
  chain.then = (resolve: any) => resolve(rows);
  return chain;
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('getDocumentFullText', () => {
  it('returns parsed text when present and within cap', async () => {
    mockSelect.mockReturnValueOnce(
      chainable([{ parsedText: 'small doc content', subcategoryName: 'DA' }])
    );

    const result = await getDocumentFullText('version-1');

    expect(result.text).toBe('small doc content');
    expect(result.truncated).toBeUndefined();
  });

  it('returns truncated marker when doc exceeds per-doc cap', async () => {
    const huge = 'x'.repeat(PER_DOC_TOKEN_CAP * 5); // ~5x the cap in chars

    mockSelect.mockReturnValueOnce(
      chainable([{ parsedText: huge, subcategoryName: 'DD Technical' }])
    );

    const result = await getDocumentFullText('version-1');

    expect(result.truncated).toBe('oversized');
    expect(result.text).toBe('');
  });

  it('returns null when parsedText is missing (not yet ingested)', async () => {
    mockSelect.mockReturnValueOnce(
      chainable([{ parsedText: null, subcategoryName: 'DA' }])
    );

    const result = await getDocumentFullText('version-1');

    expect(result.text).toBe('');
    expect(result.truncated).toBe('not_ingested');
  });
});

describe('getBriefingPack', () => {
  it('returns documents in Planning category with their subcategory label', async () => {
    mockSelect.mockReturnValueOnce(
      chainable([
        { documentId: 'd1', versionId: 'v1', parsedText: 'DA content', subcategoryName: 'Development Application' },
        { documentId: 'd2', versionId: 'v2', parsedText: 'Brief content', subcategoryName: 'Design Brief' },
      ])
    );

    const pack = await getBriefingPack('project-1');

    expect(pack.documents).toHaveLength(2);
    expect(pack.documents[0]).toMatchObject({
      subcategoryLabel: 'Development Application',
      text: 'DA content',
    });
    expect(pack.totalTokens).toBeGreaterThan(0);
    expect(pack.warnings).toEqual([]);
  });

  it('skips oversized docs and records a warning', async () => {
    const huge = 'x'.repeat(PER_DOC_TOKEN_CAP * 5);

    mockSelect.mockReturnValueOnce(
      chainable([
        { documentId: 'd1', versionId: 'v1', parsedText: 'DA content', subcategoryName: 'Development Application' },
        { documentId: 'd2', versionId: 'v2', parsedText: huge, subcategoryName: 'DD Technical' },
      ])
    );

    const pack = await getBriefingPack('project-1');

    expect(pack.documents.map(d => d.subcategoryLabel)).toEqual(['Development Application']);
    expect(pack.warnings).toHaveLength(1);
    expect(pack.warnings[0]).toMatch(/DD Technical/);
    expect(pack.warnings[0]).toMatch(/exceeded/i);
  });

  it('skips docs missing parsedText and records a warning', async () => {
    mockSelect.mockReturnValueOnce(
      chainable([
        { documentId: 'd1', versionId: 'v1', parsedText: null, subcategoryName: 'Site Analysis' },
      ])
    );

    const pack = await getBriefingPack('project-1');

    expect(pack.documents).toHaveLength(0);
    expect(pack.warnings[0]).toMatch(/not.*ingested|re-?ingest/i);
  });

  it('returns empty pack with no warnings when project has no Planning docs', async () => {
    mockSelect.mockReturnValueOnce(chainable([]));

    const pack = await getBriefingPack('project-1');

    expect(pack.documents).toEqual([]);
    expect(pack.warnings).toEqual([]);
    expect(pack.totalTokens).toBe(0);
  });

  it('drops oldest documents when total cap exceeded', async () => {
    // Three docs, each ~40% of total cap → third must be dropped.
    const sized = 'x'.repeat(Math.floor(TOTAL_BRIEFING_TOKEN_CAP * 0.4 * 4));

    mockSelect.mockReturnValueOnce(
      chainable([
        { documentId: 'd1', versionId: 'v1', parsedText: sized, subcategoryName: 'DA' },
        { documentId: 'd2', versionId: 'v2', parsedText: sized, subcategoryName: 'SEE' },
        { documentId: 'd3', versionId: 'v3', parsedText: sized, subcategoryName: 'Brief' },
      ])
    );

    const pack = await getBriefingPack('project-1');

    expect(pack.documents).toHaveLength(2);
    expect(pack.warnings.some(w => /total.*cap/i.test(w))).toBe(true);
  });
});
```

### Step 2: Run tests to confirm they fail

Run: `npm test -- briefing-pack`

Expected: failures of the form *"Cannot find module '../briefing-pack'"* — module doesn't exist yet.

### Step 3: Implement the service

Create `src/lib/services/briefing-pack.ts`:

```typescript
import { eq, desc, and, inArray } from 'drizzle-orm';
import { db } from '@/lib/db';
import {
  documents,
  versions,
  fileAssets,
  subcategories,
} from '@/lib/db/pg-schema';
import { estimateTokens } from '@/lib/rag';

export const PER_DOC_TOKEN_CAP = 100_000;
export const TOTAL_BRIEFING_TOKEN_CAP = 500_000;
const BRIEFING_CATEGORY_IDS = ['planning'];

export type Truncation = 'oversized' | 'not_ingested';

export interface DocumentFullText {
  text: string;
  tokenCount: number;
  truncated?: Truncation;
  subcategoryLabel: string;
}

export interface BriefingPackDocument {
  documentId: string;
  versionId: string;
  subcategoryLabel: string;
  text: string;
  tokenCount: number;
}

export interface BriefingPack {
  documents: BriefingPackDocument[];
  totalTokens: number;
  warnings: string[];
}

export async function getDocumentFullText(versionId: string): Promise<DocumentFullText> {
  const rows = await db
    .select({
      parsedText: fileAssets.parsedText,
      subcategoryName: subcategories.name,
    })
    .from(versions)
    .innerJoin(fileAssets, eq(versions.fileAssetId, fileAssets.id))
    .innerJoin(documents, eq(versions.documentId, documents.id))
    .leftJoin(subcategories, eq(documents.subcategoryId, subcategories.id))
    .where(eq(versions.id, versionId))
    .limit(1);

  if (rows.length === 0) {
    return { text: '', tokenCount: 0, truncated: 'not_ingested', subcategoryLabel: 'Unknown' };
  }

  const { parsedText, subcategoryName } = rows[0];
  const subcategoryLabel = subcategoryName ?? 'Uncategorised';

  if (!parsedText) {
    return { text: '', tokenCount: 0, truncated: 'not_ingested', subcategoryLabel };
  }

  const tokenCount = estimateTokens(parsedText);
  if (tokenCount > PER_DOC_TOKEN_CAP) {
    return { text: '', tokenCount, truncated: 'oversized', subcategoryLabel };
  }

  return { text: parsedText, tokenCount, subcategoryLabel };
}

export async function getBriefingPack(projectId: string): Promise<BriefingPack> {
  const rows = await db
    .select({
      documentId: documents.id,
      versionId: versions.id,
      parsedText: fileAssets.parsedText,
      subcategoryName: subcategories.name,
      createdAt: documents.createdAt,
    })
    .from(documents)
    .innerJoin(versions, eq(documents.latestVersionId, versions.id))
    .innerJoin(fileAssets, eq(versions.fileAssetId, fileAssets.id))
    .leftJoin(subcategories, eq(documents.subcategoryId, subcategories.id))
    .where(
      and(
        eq(documents.projectId, projectId),
        inArray(documents.categoryId, BRIEFING_CATEGORY_IDS)
      )
    )
    .orderBy(desc(documents.createdAt));

  const warnings: string[] = [];
  const accepted: BriefingPackDocument[] = [];
  let totalTokens = 0;

  for (const row of rows) {
    const subcategoryLabel = row.subcategoryName ?? 'Uncategorised';

    if (!row.parsedText) {
      warnings.push(`${subcategoryLabel}: not yet ingested with full text. Re-ingest to include in briefing.`);
      continue;
    }

    const tokenCount = estimateTokens(row.parsedText);

    if (tokenCount > PER_DOC_TOKEN_CAP) {
      warnings.push(
        `${subcategoryLabel}: ${tokenCount.toLocaleString()} tokens — exceeded per-doc cap of ${PER_DOC_TOKEN_CAP.toLocaleString()}, skipped.`
      );
      continue;
    }

    if (totalTokens + tokenCount > TOTAL_BRIEFING_TOKEN_CAP) {
      warnings.push(
        `${subcategoryLabel}: skipped to stay under total cap of ${TOTAL_BRIEFING_TOKEN_CAP.toLocaleString()} tokens.`
      );
      continue;
    }

    accepted.push({
      documentId: row.documentId,
      versionId: row.versionId,
      subcategoryLabel,
      text: row.parsedText,
      tokenCount,
    });
    totalTokens += tokenCount;
  }

  return { documents: accepted, totalTokens, warnings };
}
```

### Step 4: Run tests to confirm they pass

Run: `npm test -- briefing-pack`

Expected: all 8 tests pass. If a test fails on the chainable query mock, adjust the chain stubs to match the exact call sequence in the implementation. The `mockSelect.mockReturnValueOnce(chainable(rows))` pattern returns the rows once `.then` or `.limit` resolves it.

### Step 5: Commit

```bash
git add src/lib/services/briefing-pack.ts src/lib/services/__tests__/briefing-pack.test.ts
git commit -m "feat: getBriefingPack service for full-text retrieval of Planning docs"
```

---

## Task 4: Extend the objectives generate prompt to accept a briefing pack

**Files:**
- Modify: `src/lib/prompts/objectives-prompts.ts:7-75`

**Step 1: Extend the prompt context type**

In `src/lib/prompts/objectives-prompts.ts`, add to `ObjectivesPromptContext`:

```typescript
export interface ObjectivesPromptContext {
  objectiveType: ObjectiveType;
  projectName: string;
  projectAddress: string;
  jurisdiction: string;
  buildingClass: string;
  buildingCodeLabel: string;
  projectType: string;
  subclass: string[];
  scaleDataFormatted: string;
  complexityFormatted: string;
  explicitRules: string;
  inferredRules: string;
  briefingPack?: BriefingPackForPrompt;  // ← NEW (optional so polish prompt isn't disturbed)
}

export interface BriefingPackForPrompt {
  documents: Array<{ subcategoryLabel: string; text: string }>;
  warnings: string[];
}
```

**Step 2: Extend `buildObjectivesGeneratePrompt`**

Replace the existing function body so the prompt includes a briefing-pack block when present, and gives the model Position B instructions.

```typescript
export function buildObjectivesGeneratePrompt(ctx: ObjectivesPromptContext): string {
  const typeLabel = (ctx.objectiveType === 'functional' || ctx.objectiveType === 'quality')
    ? 'Functional & Quality'
    : 'Planning & Compliance';

  const briefingBlock = formatBriefingPack(ctx.briefingPack);

  return `# Role
You are a senior project manager with deep expertise in construction procurement, cost planning, and project delivery in the Australian development industry.

# Task
Generate ${typeLabel} objectives for this project.
This is Iteration 1: Output very short bullet points (2-5 words each).
The user will review and edit before the Polish step.

# Project Details
- Project: ${ctx.projectName}
- Address: ${ctx.projectAddress}
- Jurisdiction: ${ctx.jurisdiction}

# Profiler Summary
- Building Class: ${ctx.buildingClass} (${ctx.buildingCodeLabel})
- Project Type: ${ctx.projectType}
- Subclass: ${ctx.subclass.join(', ')}
- Scale: ${ctx.scaleDataFormatted}
- Complexity: ${ctx.complexityFormatted}

# Matched Requirements

## From User Selections (Explicit)
${ctx.explicitRules || '(None)'}

## Recommended for This Project (Inferred)
${ctx.inferredRules || '(None)'}
${briefingBlock}
# Instructions
1. Include ALL explicit items (user confirmed these — do not modify).
2. Include inferred items where confidence is high or medium (do not modify).
3. You MAY add objectives in "ai_added" ONLY when the briefing pack above contains
   substantive content that warrants them. If no briefing pack is provided, or it
   contains nothing relevant, return "ai_added": [].
4. Do NOT invent objectives that are not grounded in either the rules above or the
   briefing pack. Speculation is not allowed.
5. Do NOT duplicate items already covered by the explicit or inferred lists.
6. Keep each bullet to 2-5 words maximum.

# Output Format
Return valid JSON only, no markdown:
{
  "explicit": ["item1", "item2"],
  "inferred": ["item1", "item2"],
  "ai_added": ["item1", "item2"]
}`;
}

function formatBriefingPack(pack: BriefingPackForPrompt | undefined): string {
  if (!pack || pack.documents.length === 0) {
    return '';
  }

  const docs = pack.documents.map(d => {
    const tag = slugify(d.subcategoryLabel);
    return `<${tag}>\n${d.text}\n</${tag}>`;
  }).join('\n\n');

  return `

# Briefing Pack
The following documents are provided in full. Treat them as authoritative context.
Cross-reference is allowed (e.g. a condition on page 30 referring to clause on page 5).

${docs}
`;
}

function slugify(label: string): string {
  return label.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
}
```

**Step 3: Manual verification (no test yet — covered by Task 6)**

The prompt change is exercised in Task 6's integration test. For now, eyeball the function: with a briefing pack of two docs, the produced prompt should contain:

- The existing `# Matched Requirements` section unchanged
- A new `# Briefing Pack` block with `<development_application>...</development_application>` style tags
- The instructions block with the new Position B rules

**Step 4: Commit**

```bash
git add src/lib/prompts/objectives-prompts.ts
git commit -m "feat(prompts): briefing-pack-aware objectives generate prompt"
```

---

## Task 5: Wire the briefing pack into `generateObjectives` (TDD)

**Files:**
- Modify: `src/lib/services/objectives-generation.ts:140-171`
- Create: `src/lib/services/__tests__/objectives-generation-briefing.test.ts`

### Step 1: Write a failing integration test

Create `src/lib/services/__tests__/objectives-generation-briefing.test.ts`:

```typescript
import { describe, it, expect, jest, beforeEach } from '@jest/globals';

jest.mock('../briefing-pack');

import * as briefingPackModule from '../briefing-pack';
import { generateObjectives } from '../objectives-generation';
import type { ProjectData } from '../inference-engine';

const fakeProjectData: ProjectData = {
  projectDetails: {
    projectId: 'project-1',
    projectName: 'Test Project',
    projectAddress: '1 Test St',
    jurisdiction: 'NSW',
  } as any,
  profiler: {
    buildingClass: 'residential',
    projectType: 'new_build',
    subclass: [],
  } as any,
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe('generateObjectives — briefing pack injection', () => {
  it('passes briefing pack into the prompt when projectId is provided', async () => {
    const getBriefingPack = jest
      .spyOn(briefingPackModule, 'getBriefingPack')
      .mockResolvedValue({
        documents: [
          {
            documentId: 'd1',
            versionId: 'v1',
            subcategoryLabel: 'Development Application',
            text: 'The consent permits 24-hour operation subject to acoustic treatment per Condition 14.',
            tokenCount: 100,
          },
        ],
        totalTokens: 100,
        warnings: [],
      });

    let capturedPrompt = '';
    const fakeAi = {
      generate: jest.fn(async (prompt: string) => {
        capturedPrompt = prompt;
        return JSON.stringify({
          explicit: [],
          inferred: [],
          ai_added: ['Acoustic treatment per consent'],
        });
      }),
    };

    const result = await generateObjectives(fakeProjectData, 'functional', fakeAi);

    expect(getBriefingPack).toHaveBeenCalledWith('project-1');
    expect(capturedPrompt).toMatch(/Briefing Pack/);
    expect(capturedPrompt).toMatch(/development_application/);
    expect(capturedPrompt).toMatch(/Condition 14/);
    expect(result.ai_added).toEqual(['Acoustic treatment per consent']);
  });

  it('omits briefing block when project has no Planning docs', async () => {
    jest.spyOn(briefingPackModule, 'getBriefingPack').mockResolvedValue({
      documents: [],
      totalTokens: 0,
      warnings: [],
    });

    let capturedPrompt = '';
    const fakeAi = {
      generate: jest.fn(async (prompt: string) => {
        capturedPrompt = prompt;
        return JSON.stringify({ explicit: [], inferred: [], ai_added: [] });
      }),
    };

    await generateObjectives(fakeProjectData, 'functional', fakeAi);

    expect(capturedPrompt).not.toMatch(/Briefing Pack/);
  });

  it('still works when projectId is missing from projectDetails (legacy callers)', async () => {
    const noIdProjectData = {
      ...fakeProjectData,
      projectDetails: { ...fakeProjectData.projectDetails, projectId: undefined },
    };
    const getBriefingPack = jest.spyOn(briefingPackModule, 'getBriefingPack');

    const fakeAi = {
      generate: jest.fn(async () => JSON.stringify({ explicit: [], inferred: [], ai_added: [] })),
    };

    await generateObjectives(noIdProjectData as any, 'functional', fakeAi);

    expect(getBriefingPack).not.toHaveBeenCalled();
  });
});
```

### Step 2: Run tests to confirm they fail

Run: `npm test -- objectives-generation-briefing`

Expected: failures because `generateObjectives` doesn't yet call `getBriefingPack` or pass anything to the prompt builder.

### Step 3: Modify `generateObjectives` and `buildObjectivesContext`

In `src/lib/services/objectives-generation.ts`:

1. **Add import** at the top of the file:

```typescript
import { getBriefingPack, type BriefingPack } from './briefing-pack';
```

2. **Modify `buildObjectivesContext`** (lines 82-111) to accept an optional briefing pack:

```typescript
function buildObjectivesContext(
  projectData: ProjectData,
  objectiveType: ObjectiveType,
  briefingPack?: BriefingPack
): ObjectivesPromptContext {
  const contentType = (objectiveType === 'functional' || objectiveType === 'quality')
    ? 'objectives_functional_quality'
    : 'objectives_planning_compliance';

  const matchedRules = evaluateRules(contentType, projectData);
  const explicitRules = matchedRules.filter(r => r.source === 'explicit');
  const inferredRules = matchedRules.filter(r => r.source === 'inferred');

  return {
    objectiveType,
    projectName: projectData.projectDetails.projectName || 'Unnamed Project',
    projectAddress: projectData.projectDetails.projectAddress || 'Not specified',
    jurisdiction: projectData.projectDetails.jurisdiction || 'Not specified',
    buildingClass: projectData.profiler.buildingClass || 'Not specified',
    buildingCodeLabel: projectData.profiler.buildingClass || '',
    projectType: projectData.profiler.projectType || 'Not specified',
    subclass: projectData.profiler.subclass || [],
    scaleDataFormatted: formatScaleData(projectData.profiler.scaleData),
    complexityFormatted: formatComplexity(projectData.profiler.complexity),
    explicitRules: formatRulesForPrompt(explicitRules, { groupBySource: false }),
    inferredRules: formatRulesForPrompt(inferredRules, {
      groupBySource: false,
      includeConfidence: true
    }),
    briefingPack: briefingPack && briefingPack.documents.length > 0
      ? {
          documents: briefingPack.documents.map(d => ({
            subcategoryLabel: d.subcategoryLabel,
            text: d.text,
          })),
          warnings: briefingPack.warnings,
        }
      : undefined,
  };
}
```

3. **Modify `generateObjectives`** (lines 140-171) to fetch the pack:

```typescript
export async function generateObjectives(
  projectData: ProjectData,
  objectiveType: ObjectiveType,
  aiClient: { generate: (prompt: string) => Promise<string> }
): Promise<GeneratedObjectives> {
  const projectId = projectData.projectDetails.projectId;

  const briefingPack: BriefingPack | undefined = projectId
    ? await getBriefingPack(projectId)
    : undefined;

  const context = buildObjectivesContext(projectData, objectiveType, briefingPack);
  const prompt = buildObjectivesGeneratePrompt(context);

  const response = await aiClient.generate(prompt);

  try {
    return JSON.parse(response) as GeneratedObjectives;
  } catch {
    // Fallback: extract from matched rules
    const matchedRules = evaluateRules(
      (objectiveType === 'functional' || objectiveType === 'quality')
        ? 'objectives_functional_quality'
        : 'objectives_planning_compliance',
      projectData
    );

    return {
      explicit: matchedRules
        .filter(r => r.source === 'explicit')
        .flatMap(r => r.resolvedItems.map(i => 'text' in i ? i.text : '')),
      inferred: matchedRules
        .filter(r => r.source === 'inferred')
        .flatMap(r => r.resolvedItems.map(i => 'text' in i ? i.text : '')),
      ai_added: []
    };
  }
}
```

> **Note on `projectData.projectDetails.projectId`:** confirm this field exists in `ProjectData`. Look at `src/lib/services/inference-engine.ts` for the type. If it's named differently (e.g. `id`), use the actual field. If `ProjectData` doesn't carry it at all today, add `projectId: string` to `ProjectDetails` in the type, and audit callers (the Grep in pre-impl identified five) to ensure they pass it. Each caller already has a `projectId` in scope.

### Step 4: Run tests to confirm they pass

Run: `npm test -- objectives-generation-briefing`

Expected: all 3 tests pass.

Also run the existing objectives tests to make sure nothing regressed:

Run: `npm test -- objectives`

Expected: all pass — the polish pass and existing generate behaviour (without briefing pack) are untouched.

### Step 5: Commit

```bash
git add src/lib/services/objectives-generation.ts src/lib/services/__tests__/objectives-generation-briefing.test.ts
git commit -m "feat(objectives): inject briefing pack into generate-pass prompt"
```

---

## Task 6: Surface briefing-pack warnings to the API consumer

When the briefing pack drops a doc (oversized, missing parsedText, or total cap), the user should see a hint in the UI explaining why. We'll plumb the warnings through the existing API response without touching UI yet — UI work is a follow-up.

**Files:**
- Modify: `src/lib/services/objectives-generation.ts` — add warnings to return type
- Modify: callers identified in pre-impl Grep (the API route under `src/app/api/...` for objectives generation)

**Step 1: Locate the API route**

Run: `Grep "generateObjectives" src/app/api`

Open the matching route handler and find the `return NextResponse.json(...)` block.

**Step 2: Extend the return type of `generateObjectives`**

In `src/lib/services/objectives-generation.ts`:

```typescript
export interface GeneratedObjectives {
  explicit: string[];
  inferred: string[];
  ai_added: string[];
  briefingWarnings?: string[];  // ← NEW
}
```

In the body of `generateObjectives`, after the JSON parse, attach warnings:

```typescript
try {
  const parsed = JSON.parse(response) as GeneratedObjectives;
  return {
    ...parsed,
    briefingWarnings: briefingPack?.warnings ?? [],
  };
} catch {
  // Existing fallback...
  return {
    explicit: ...,
    inferred: ...,
    ai_added: [],
    briefingWarnings: briefingPack?.warnings ?? [],
  };
}
```

**Step 3: Pass through in the API route**

In the route handler, ensure the JSON response includes `briefingWarnings` (it'll flow naturally if the route returns the whole object).

**Step 4: Manual end-to-end smoke test**

1. `npm run db:up && npm run dev`
2. Open a test project, upload a small PDF assigned to Planning > Development Application, click Ingest, wait for it to complete
3. Open the Objectives section, click Generate
4. In the network tab, confirm the response payload contains `briefingWarnings: []` (no warnings expected for a small DA)
5. Optionally upload another doc that's oversized (or simulate by setting `PER_DOC_TOKEN_CAP = 100` temporarily) and re-generate; warnings should appear in the response

**Step 5: Commit**

```bash
git add src/lib/services/objectives-generation.ts src/app/api/<route>
git commit -m "feat(api): surface briefing-pack warnings on objectives response"
```

---

## Task 7: End-to-end manual verification

No code change. Acceptance test of the whole feature.

**Steps:**

1. **Reset state.** Pick a test project. Note its current objectives.
2. **Upload a real DA or SEE** under `Planning > Development Application` (or any Planning subcategory). Click Ingest. Wait for the worker log: `[worker] Persisted full text (NNN chars)…`.
3. **Verify storage.** `npm run db:studio` → `file_assets` → row for the new file → `parsed_text` is populated.
4. **Re-generate objectives** for the project (Functional & Quality and Planning & Compliance both).
5. **Inspect output.** The `ai_added` bucket should now contain objectives that reflect the document content (e.g. specific consent conditions, design-brief intents, planning constraints). Without the doc, `ai_added` was usually empty or generic.
6. **Negative case.** Pick a project with NO Planning documents. Re-generate. Confirm `ai_added` is empty or generic — same as legacy behaviour. No regressions.
7. **Cap behaviour.** Temporarily lower `PER_DOC_TOKEN_CAP` to 100 in `briefing-pack.ts`. Re-generate on the project from step 2. Confirm the response carries a `briefingWarnings` entry naming the document. **Restore the cap before committing anything.**
8. **Polish pass.** Edit a generated objective and trigger Polish. Confirm polish behaviour is unchanged from before this feature.

**No commit unless step 7's restore is verified.**

---

## Done When

- [ ] `fileAssets.parsed_text` column exists in production schema
- [ ] New uploads to Planning subcategories populate `parsed_text` end-to-end
- [ ] `getBriefingPack(projectId)` returns the right docs with caps applied
- [ ] Objectives generation prompt contains a `# Briefing Pack` block when the project has Planning docs
- [ ] AI adds grounded `ai_added` items reflecting the briefing pack
- [ ] Existing polish pass and inference rules behaviour unchanged
- [ ] All Jest tests pass
- [ ] User has manually verified the end-to-end flow on a real project

## Follow-ups (out of MVP, do not implement)

- UI affordance to display `briefingWarnings` in the objectives editor.
- Workflow 2: Notes-with-attached-docs and inline-instruction execution.
- Source citations on `ai_added` items (`source_document_id`, `source_quote`).
- Per-subcategory briefing flag (promote hardcoded list to a DB flag) once user wants custom categories included.
- "Backfill parsed text" admin endpoint for power-users.
- Coordinator agent reusing `getDocumentFullText` for evidence collection (item 23-24 in the operating-model plan).
