# Wire Context Orchestrator Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace all fragmented context assembly points with the unified `assembleContext()` entry point, adding missing modules for procurement docs (RFT/addendum/TRR/evaluations), project info (name/address/objectives), and note-attached documents.

**Architecture:** Three new module fetchers slot into the existing `MODULE_FETCHERS` registry in `src/lib/context/orchestrator.ts`. Each consumer file (`ai-content-generation.ts`, `note-content-generation.ts`, `retrieve-context.ts`) replaces its hand-rolled fetch+format logic with a single `assembleContext()` call, then reads the pre-formatted `moduleContext`/`ragContext` strings from the result. The legacy `report-context-orchestrator.ts` gets `@deprecated` markers and a redirect function.

**Tech Stack:** Next.js, TypeScript, Drizzle ORM (pg-schema), Supabase/PostgreSQL

---

## Task 1: Add New Module Types

**Files:**
- Modify: `src/lib/context/types.ts`

**Step 1: Add 3 new module names and noteId to ContextRequest**

In `types.ts`, update the `ModuleName` union (line 16-28) to add 3 new entries, and add `noteId` to `ContextRequest`.

```typescript
// Replace the ModuleName type (lines 16-28):
export type ModuleName =
  | 'profile'
  | 'costPlan'
  | 'variations'
  | 'invoices'
  | 'program'
  | 'milestones'
  | 'risks'
  | 'procurement'
  | 'stakeholders'
  | 'planningCard'
  | 'starredNotes'
  | 'ragDocuments'
  | 'projectInfo'
  | 'procurementDocs'
  | 'attachedDocuments';
```

Add `noteId` to `ContextRequest` (after `stakeholderId` at line 68):

```typescript
  /** For note context: specific note ID for fetching attached documents */
  noteId?: string;
```

**Step 2: Commit**

```bash
git add src/lib/context/types.ts
git commit -m "feat(context): add projectInfo, procurementDocs, attachedDocuments module types"
```

---

## Task 2: Create `projectInfo` Module

**Files:**
- Create: `src/lib/context/modules/project-info.ts`

**Step 1: Write the module**

```typescript
// src/lib/context/modules/project-info.ts
// Project info module fetcher - projectDetails + projectObjectives tables

import { db } from '@/lib/db';
import { projectDetails, projectObjectives } from '@/lib/db/pg-schema';
import { eq } from 'drizzle-orm';
import type { ModuleResult } from '../types';

export interface ProjectInfoData {
  projectName: string | null;
  address: string | null;
  jurisdiction: string | null;
  functional: string | null;
  quality: string | null;
  budget: string | null;
  program: string | null;
}

export async function fetchProjectInfo(
  projectId: string
): Promise<ModuleResult<ProjectInfoData>> {
  try {
    const [details] = await db
      .select({
        projectName: projectDetails.projectName,
        address: projectDetails.address,
        jurisdiction: projectDetails.jurisdiction,
      })
      .from(projectDetails)
      .where(eq(projectDetails.projectId, projectId));

    const [objectives] = await db
      .select({
        functional: projectObjectives.functional,
        quality: projectObjectives.quality,
        budget: projectObjectives.budget,
        program: projectObjectives.program,
      })
      .from(projectObjectives)
      .where(eq(projectObjectives.projectId, projectId));

    const data: ProjectInfoData = {
      projectName: details?.projectName || null,
      address: details?.address || null,
      jurisdiction: details?.jurisdiction || null,
      functional: objectives?.functional || null,
      quality: objectives?.quality || null,
      budget: objectives?.budget || null,
      program: objectives?.program || null,
    };

    // Count non-null fields for token estimate
    const fieldCount = Object.values(data).filter(Boolean).length;
    const estimatedTokens = 15 + fieldCount * 20;

    return {
      moduleName: 'projectInfo',
      success: true,
      data,
      estimatedTokens,
    };
  } catch (error) {
    return {
      moduleName: 'projectInfo',
      success: false,
      data: {
        projectName: null,
        address: null,
        jurisdiction: null,
        functional: null,
        quality: null,
        budget: null,
        program: null,
      },
      error: `Project info fetch failed: ${error}`,
      estimatedTokens: 0,
    };
  }
}
```

**Step 2: Commit**

```bash
git add src/lib/context/modules/project-info.ts
git commit -m "feat(context): add projectInfo module fetcher"
```

---

## Task 3: Create `procurementDocs` Module

**Files:**
- Create: `src/lib/context/modules/procurement-docs.ts`

**Step 1: Write the module**

This migrates the logic from `ai-content-generation.ts` lines 146-262 into the orchestrator module pattern.

```typescript
// src/lib/context/modules/procurement-docs.ts
// Procurement documents module fetcher - RFT, addenda, TRR, evaluations

import { db } from '@/lib/db';
import {
  rftNew,
  addenda,
  trr,
  evaluations,
  projectStakeholders,
} from '@/lib/db/pg-schema';
import { eq } from 'drizzle-orm';
import type { ModuleResult, ReportingPeriod } from '../types';

export interface ProcurementDocsData {
  documents: ProcurementDocEntry[];
  summary: {
    rftCount: number;
    addendumCount: number;
    trrCount: number;
    evaluationCount: number;
    totalCount: number;
  };
}

export interface ProcurementDocEntry {
  id: string;
  type: 'rft' | 'addendum' | 'trr' | 'evaluation';
  stakeholderName: string | null;
  date: string | null;
  content?: string;
}

export interface ProcurementDocsFetchParams {
  reportingPeriod?: ReportingPeriod;
}

async function getStakeholderName(stakeholderId: string): Promise<string | null> {
  try {
    const [stakeholder] = await db
      .select({ name: projectStakeholders.name })
      .from(projectStakeholders)
      .where(eq(projectStakeholders.id, stakeholderId));
    return stakeholder?.name || null;
  } catch {
    return null;
  }
}

function shouldIncludeDocument(
  documentDate: string | null,
  period?: ReportingPeriod
): boolean {
  if (!period) return true;
  if (!documentDate) return true;
  return documentDate >= period.start && documentDate <= period.end;
}

export async function fetchProcurementDocs(
  projectId: string,
  params?: ProcurementDocsFetchParams
): Promise<ModuleResult<ProcurementDocsData>> {
  const documents: ProcurementDocEntry[] = [];

  try {
    // Fetch RFT documents
    const rftDocs = await db
      .select({
        id: rftNew.id,
        date: rftNew.rftDate,
        stakeholderId: rftNew.stakeholderId,
      })
      .from(rftNew)
      .where(eq(rftNew.projectId, projectId));

    for (const doc of rftDocs) {
      if (shouldIncludeDocument(doc.date, params?.reportingPeriod)) {
        const stakeholderName = doc.stakeholderId
          ? await getStakeholderName(doc.stakeholderId)
          : null;
        documents.push({
          id: doc.id,
          type: 'rft',
          stakeholderName,
          date: doc.date,
        });
      }
    }

    // Fetch Addenda
    const addendaDocs = await db
      .select({
        id: addenda.id,
        date: addenda.addendumDate,
        stakeholderId: addenda.stakeholderId,
        content: addenda.content,
      })
      .from(addenda)
      .where(eq(addenda.projectId, projectId));

    for (const doc of addendaDocs) {
      if (shouldIncludeDocument(doc.date, params?.reportingPeriod)) {
        const stakeholderName = doc.stakeholderId
          ? await getStakeholderName(doc.stakeholderId)
          : null;
        documents.push({
          id: doc.id,
          type: 'addendum',
          stakeholderName,
          date: doc.date,
          content: doc.content || undefined,
        });
      }
    }

    // Fetch TRR documents
    const trrDocs = await db
      .select({
        id: trr.id,
        date: trr.reportDate,
        stakeholderId: trr.stakeholderId,
        executiveSummary: trr.executiveSummary,
        recommendation: trr.recommendation,
      })
      .from(trr)
      .where(eq(trr.projectId, projectId));

    for (const doc of trrDocs) {
      if (shouldIncludeDocument(doc.date, params?.reportingPeriod)) {
        const stakeholderName = doc.stakeholderId
          ? await getStakeholderName(doc.stakeholderId)
          : null;
        const content = [doc.executiveSummary, doc.recommendation]
          .filter(Boolean)
          .join('\n\n');
        documents.push({
          id: doc.id,
          type: 'trr',
          stakeholderName,
          date: doc.date,
          content: content || undefined,
        });
      }
    }

    // Fetch Evaluations
    const evalDocs = await db
      .select({
        id: evaluations.id,
        stakeholderId: evaluations.stakeholderId,
        updatedAt: evaluations.updatedAt,
      })
      .from(evaluations)
      .where(eq(evaluations.projectId, projectId));

    for (const doc of evalDocs) {
      const dateStr = doc.updatedAt?.toISOString?.() ?? null;
      if (shouldIncludeDocument(dateStr, params?.reportingPeriod)) {
        const stakeholderName = doc.stakeholderId
          ? await getStakeholderName(doc.stakeholderId)
          : null;
        documents.push({
          id: doc.id,
          type: 'evaluation',
          stakeholderName,
          date: dateStr,
        });
      }
    }

    const summary = {
      rftCount: documents.filter((d) => d.type === 'rft').length,
      addendumCount: documents.filter((d) => d.type === 'addendum').length,
      trrCount: documents.filter((d) => d.type === 'trr').length,
      evaluationCount: documents.filter((d) => d.type === 'evaluation').length,
      totalCount: documents.length,
    };

    const estimatedTokens = 20 + documents.length * 25;

    return {
      moduleName: 'procurementDocs',
      success: true,
      data: { documents, summary },
      estimatedTokens,
    };
  } catch (error) {
    return {
      moduleName: 'procurementDocs',
      success: false,
      data: { documents: [], summary: { rftCount: 0, addendumCount: 0, trrCount: 0, evaluationCount: 0, totalCount: 0 } },
      error: `Procurement docs fetch failed: ${error}`,
      estimatedTokens: 0,
    };
  }
}
```

**Step 2: Commit**

```bash
git add src/lib/context/modules/procurement-docs.ts
git commit -m "feat(context): add procurementDocs module fetcher"
```

---

## Task 4: Create `attachedDocuments` Module

**Files:**
- Create: `src/lib/context/modules/attached-documents.ts`

**Step 1: Write the module**

This migrates the logic from `note-content-generation.ts` lines 61-121 into the orchestrator module pattern.

```typescript
// src/lib/context/modules/attached-documents.ts
// Attached documents module fetcher - note transmittals → documents → file assets

import { db } from '@/lib/db';
import {
  noteTransmittals,
  documents,
  versions,
  fileAssets,
} from '@/lib/db/pg-schema';
import { eq, inArray } from 'drizzle-orm';
import type { ModuleResult } from '../types';

export interface AttachedDocumentsData {
  documents: AttachedDocumentEntry[];
  totalCount: number;
  documentIds: string[];
}

export interface AttachedDocumentEntry {
  id: string;
  documentId: string;
  documentName: string;
  categoryName: string | null;
}

export interface AttachedDocumentsFetchParams {
  noteId?: string;
}

export async function fetchAttachedDocuments(
  projectId: string,
  params?: AttachedDocumentsFetchParams
): Promise<ModuleResult<AttachedDocumentsData>> {
  const noteId = params?.noteId;

  if (!noteId) {
    return {
      moduleName: 'attachedDocuments',
      success: true,
      data: { documents: [], totalCount: 0, documentIds: [] },
      estimatedTokens: 0,
    };
  }

  try {
    const transmittals = await db
      .select({
        id: noteTransmittals.id,
        documentId: noteTransmittals.documentId,
      })
      .from(noteTransmittals)
      .where(eq(noteTransmittals.noteId, noteId));

    if (transmittals.length === 0) {
      return {
        moduleName: 'attachedDocuments',
        success: true,
        data: { documents: [], totalCount: 0, documentIds: [] },
        estimatedTokens: 0,
      };
    }

    const documentIds = transmittals.map((t) => t.documentId);

    // Fetch document details
    const docs = await db
      .select({
        id: documents.id,
        categoryId: documents.categoryId,
      })
      .from(documents)
      .where(inArray(documents.id, documentIds));

    // Fetch latest versions for document names
    const docVersions = await db
      .select({
        documentId: versions.documentId,
        fileAssetId: versions.fileAssetId,
      })
      .from(versions)
      .where(inArray(versions.documentId, documentIds));

    // Fetch file assets for names
    const fileAssetIds = docVersions
      .map((v) => v.fileAssetId)
      .filter(Boolean) as string[];
    const assets =
      fileAssetIds.length > 0
        ? await db
            .select({
              id: fileAssets.id,
              originalName: fileAssets.originalName,
            })
            .from(fileAssets)
            .where(inArray(fileAssets.id, fileAssetIds))
        : [];

    // Build lookup maps
    const assetMap = new Map(assets.map((a) => [a.id, a.originalName]));
    const versionMap = new Map(
      docVersions.map((v) => [v.documentId, v.fileAssetId])
    );

    const entries: AttachedDocumentEntry[] = docs.map((doc) => ({
      id: doc.id,
      documentId: doc.id,
      documentName:
        assetMap.get(versionMap.get(doc.id) || '') || 'Unknown Document',
      categoryName: doc.categoryId || null,
    }));

    const estimatedTokens = 10 + entries.length * 8;

    return {
      moduleName: 'attachedDocuments',
      success: true,
      data: {
        documents: entries,
        totalCount: entries.length,
        documentIds,
      },
      estimatedTokens,
    };
  } catch (error) {
    return {
      moduleName: 'attachedDocuments',
      success: false,
      data: { documents: [], totalCount: 0, documentIds: [] },
      error: `Attached documents fetch failed: ${error}`,
      estimatedTokens: 0,
    };
  }
}
```

**Step 2: Commit**

```bash
git add src/lib/context/modules/attached-documents.ts
git commit -m "feat(context): add attachedDocuments module fetcher"
```

---

## Task 5: Register Modules in Orchestrator

**Files:**
- Modify: `src/lib/context/orchestrator.ts`

**Step 1: Add imports for new modules**

After line 19 (`import { fetchRagDocuments } from './modules/documents';`), add:

```typescript
import { fetchProjectInfo } from './modules/project-info';
import { fetchProcurementDocs } from './modules/procurement-docs';
import { fetchAttachedDocuments } from './modules/attached-documents';
```

**Step 2: Register in MODULE_FETCHERS**

Add 3 entries to the `MODULE_FETCHERS` record (after line 49, `ragDocuments: fetchRagDocuments`):

```typescript
  projectInfo: fetchProjectInfo,
  procurementDocs: fetchProcurementDocs,
  attachedDocuments: fetchAttachedDocuments,
```

**Step 3: Pass noteId in fetch params**

In `assembleContext()`, update the `params` object (around line 143) to include `noteId`:

```typescript
          const params = {
            reportingPeriod: request.reportingPeriod,
            documentIds: request.documentIds,
            stakeholderId: request.stakeholderId,
            noteId: request.noteId,
            query: request.task,
          };
```

**Step 4: Commit**

```bash
git add src/lib/context/orchestrator.ts
git commit -m "feat(context): register projectInfo, procurementDocs, attachedDocuments in orchestrator"
```

---

## Task 6: Update Strategies

**Files:**
- Modify: `src/lib/context/strategies.ts`

**Step 1: Add `projectInfo` to all report-section strategies**

For each `report-section:*` strategy, add `projectInfo` as a relevant module at priority 4. Example for `report-section:brief` (line 18-27):

```typescript
  'report-section:brief': {
    modules: [
      { module: 'profile', level: 'required', priority: 9 },
      { module: 'costPlan', level: 'required', priority: 8 },
      { module: 'program', level: 'required', priority: 7 },
      { module: 'risks', level: 'required', priority: 7 },
      { module: 'procurement', level: 'required', priority: 6 },
      { module: 'stakeholders', level: 'relevant', priority: 4 },
      { module: 'projectInfo', level: 'relevant', priority: 4 },
    ],
  },
```

Do the same for: `report-section:summary`, `report-section:procurement`, `report-section:cost_planning`, `report-section:programme`, `report-section:design`, `report-section:construction`, `report-section:planning_authorities`.

**Step 2: Add `procurementDocs` to procurement-heavy strategies**

Add `procurementDocs` as required to `report-section:procurement`:

```typescript
  'report-section:procurement': {
    modules: [
      { module: 'procurement', level: 'required', priority: 10 },
      { module: 'procurementDocs', level: 'required', priority: 9 },
      { module: 'costPlan', level: 'required', priority: 7 },
      { module: 'stakeholders', level: 'required', priority: 6 },
      { module: 'projectInfo', level: 'relevant', priority: 4 },
      { module: 'risks', level: 'relevant', priority: 3 },
      { module: 'milestones', level: 'relevant', priority: 3 },
    ],
  },
```

**Step 3: Add new `meeting-section` strategy**

After the report-section strategies block (after line 95), add:

```typescript
  'meeting-section': {
    modules: [
      { module: 'projectInfo', level: 'required', priority: 9 },
      { module: 'starredNotes', level: 'required', priority: 8 },
      { module: 'procurementDocs', level: 'required', priority: 7 },
      { module: 'profile', level: 'relevant', priority: 5 },
      { module: 'procurement', level: 'relevant', priority: 4 },
    ],
  },
```

**Step 4: Update `note` strategy**

Replace the existing `note` strategy (lines 118-124):

```typescript
  note: {
    modules: [
      { module: 'attachedDocuments', level: 'required', priority: 9 },
      { module: 'projectInfo', level: 'required', priority: 8 },
      { module: 'ragDocuments', level: 'required', priority: 7 },
      { module: 'starredNotes', level: 'relevant', priority: 4 },
    ],
  },
```

**Step 5: Add `meeting-section` to ContextRequest contextType**

In `types.ts`, update the `contextType` union (line 44-50) to add `'meeting-section'`:

```typescript
  contextType:
    | 'report-section'
    | 'meeting-section'
    | 'inline-instruction'
    | 'coaching-qa'
    | 'trr'
    | 'note'
    | 'rft';
```

**Step 6: Add auto-mode keywords for new modules**

In `strategies.ts`, add two new keyword groups to the `AUTO_MODE_KEYWORDS` array (after the notes/meetings group at line 266):

```typescript
  {
    keywords: [
      'rft',
      'addendum',
      'trr',
      'tender report',
      'tender recommendation',
      'evaluation',
    ],
    modules: [{ module: 'procurementDocs', priority: 9 }],
  },
  {
    keywords: [
      'objective',
      'quality',
      'compliance',
      'functional',
      'project info',
      'project name',
    ],
    modules: [{ module: 'projectInfo', priority: 8 }],
  },
```

**Step 7: Commit**

```bash
git add src/lib/context/strategies.ts src/lib/context/types.ts
git commit -m "feat(context): add meeting-section strategy, update all strategies with new modules"
```

---

## Task 7: Add Formatters for New Modules

**Files:**
- Modify: `src/lib/context/formatter.ts`

**Step 1: Add imports**

After line 18 (`import type { PlanningCardData } from './modules/planning-card';`), add:

```typescript
import type { ProjectInfoData } from './modules/project-info';
import type { ProcurementDocsData } from './modules/procurement-docs';
import type { AttachedDocumentsData } from './modules/attached-documents';
```

**Step 2: Add cases to `formatModule()` switch**

In the `formatModule` function (line 101-131), add 3 new cases before the `default` (before line 128):

```typescript
    case 'projectInfo':
      return formatProjectInfo(data as ProjectInfoData, tier);
    case 'procurementDocs':
      return formatProcurementDocs(data as ProcurementDocsData, tier);
    case 'attachedDocuments':
      return formatAttachedDocuments(data as AttachedDocumentsData, tier);
```

**Step 3: Add the 3 formatting functions**

Add at the end of the file (after `formatPlanningCard` at line 590):

```typescript
function formatProjectInfo(
  data: ProjectInfoData,
  tier: FormattingTier
): string {
  if (!data.projectName && !data.functional) {
    return '## Project Information\nNo project details available.';
  }

  const lines = ['## Project Information'];

  if (data.projectName) lines.push(`Project: ${data.projectName}`);
  if (data.address) lines.push(`Address: ${data.address}`);
  if (data.jurisdiction) lines.push(`Jurisdiction: ${data.jurisdiction}`);

  if (tier !== 'summary') {
    if (data.functional) lines.push(`Functional Objectives: ${data.functional}`);
    if (data.quality) lines.push(`Quality Objectives: ${data.quality}`);
    if (data.budget) lines.push(`Budget Objectives: ${data.budget}`);
    if (data.program) lines.push(`Program Objectives: ${data.program}`);
  }

  return lines.join('\n');
}

function formatProcurementDocs(
  data: ProcurementDocsData,
  tier: FormattingTier
): string {
  if (!data || data.summary.totalCount === 0) {
    return '## Procurement Documents\nNo procurement documents available.';
  }

  const s = data.summary;

  if (tier === 'summary') {
    return [
      `## Procurement Documents (${s.totalCount})`,
      `RFT: ${s.rftCount} | Addenda: ${s.addendumCount} | TRR: ${s.trrCount} | Evaluations: ${s.evaluationCount}`,
    ].join('\n');
  }

  const lines = [`## Procurement Documents (${s.totalCount})`];

  const grouped: Record<string, typeof data.documents> = {
    rft: data.documents.filter((d) => d.type === 'rft'),
    addendum: data.documents.filter((d) => d.type === 'addendum'),
    trr: data.documents.filter((d) => d.type === 'trr'),
    evaluation: data.documents.filter((d) => d.type === 'evaluation'),
  };

  const labels: Record<string, string> = {
    rft: 'RFT Documents',
    addendum: 'Addenda',
    trr: 'Tender Recommendations',
    evaluation: 'Evaluations',
  };

  for (const [type, docs] of Object.entries(grouped)) {
    if (docs.length === 0) continue;
    lines.push(`\n### ${labels[type]} (${docs.length})`);
    for (const doc of docs) {
      const parts = [doc.type.toUpperCase()];
      if (doc.stakeholderName) parts.push(`for ${doc.stakeholderName}`);
      if (doc.date) parts.push(`(${doc.date})`);
      lines.push(`- ${parts.join(' ')}`);
      if (tier === 'detailed' && doc.content) {
        const maxChars = 500;
        const content =
          doc.content.length > maxChars
            ? doc.content.slice(0, maxChars) + '...'
            : doc.content;
        lines.push(`  ${content}`);
      }
    }
  }

  return lines.join('\n');
}

function formatAttachedDocuments(
  data: AttachedDocumentsData,
  tier: FormattingTier
): string {
  if (!data || data.totalCount === 0) {
    return '';
  }

  const lines = [`## Attached Documents (${data.totalCount})`];

  for (const doc of data.documents) {
    lines.push(
      `- ${doc.documentName}${doc.categoryName ? ` (${doc.categoryName})` : ''}`
    );
  }

  return lines.join('\n');
}
```

**Step 4: Update `formatProjectSummary` to use projectInfo if available**

In `formatProjectSummary()` (line 138-176), add a fallback to `projectInfo` data for project name. After line 145 (`? (profileResult.data as ProfileData | null)`), add:

```typescript
  const projectInfoResult = modules.get('projectInfo');
  const projectInfo = projectInfoResult?.success
    ? (projectInfoResult.data as ProjectInfoData | null)
    : null;
```

Then update the fallback at line 148 to use projectInfo:

```typescript
  if (!profile) {
    const name = projectInfo?.projectName ?? projectId;
    return `Project ${name}. Project type not yet configured.`;
  }
```

**Step 5: Commit**

```bash
git add src/lib/context/formatter.ts
git commit -m "feat(context): add formatters for projectInfo, procurementDocs, attachedDocuments"
```

---

## Task 8: Wire Consumer — `ai-content-generation.ts`

**Files:**
- Modify: `src/lib/services/ai-content-generation.ts`

This is the highest-impact change. We replace ~250 lines of fetch+format with ~15 lines using `assembleContext()`.

**Step 1: Update imports**

Replace lines 9-22 (the large import block) with:

```typescript
import Anthropic from '@anthropic-ai/sdk';
import {
    db,
    meetingSections,
    reportSections,
} from '@/lib/db';
import { eq } from 'drizzle-orm';
import type {
    GenerateContentRequest,
    GenerateContentResponse,
    PolishContentRequest,
    PolishContentResponse,
    AITone,
} from '@/types/notes-meetings-reports';
import { getSectionLabel } from '@/lib/constants/sections';
import {
    BASE_SYSTEM_PROMPT,
    buildSystemPrompt,
    getSectionPrompt as getEnrichedSectionPrompt,
    type ContentFeature,
} from '@/lib/prompts/system-prompts';
import { assembleContext } from '@/lib/context/orchestrator';
import type { ContextRequest } from '@/lib/context/types';
```

Note: Remove `notes`, `rftNew`, `addenda`, `trr`, `evaluations`, `projectDetails`, `projectObjectives`, `projectStakeholders` from the db import — they are no longer needed. Keep `meetingSections`, `reportSections` if used elsewhere in the file. Remove `and`, `isNull`, `gte`, `lte`, `or`, `sql` from drizzle-orm imports (only `eq` may still be needed if other functions use it).

**Step 2: Delete the fetch functions and types**

Delete the following blocks entirely:
- Lines 64-86: `StarredNote`, `ProcurementDocument`, `ProjectContext` interfaces
- Lines 95-141: `fetchStarredNotes()` function
- Lines 146-262: `fetchProcurementDocs()` function
- Lines 267-306: `fetchProjectContext()` function
- Lines 311-335: `getStakeholderName()` and `shouldIncludeDocument()` helper functions
- Lines 344-421: `buildContextString()`, `groupProcurementDocs()`, `formatProcDocs()` functions

**Step 3: Rewrite `generateSectionContent()`**

Replace the body of `generateSectionContent()` (lines 430-511) with:

```typescript
export async function generateSectionContent(
    request: GenerateContentRequest
): Promise<GenerateContentResponse> {
    const {
        projectId,
        sectionKey,
        sectionLabel,
        contextType,
        reportingPeriodStart,
        reportingPeriodEnd,
        existingContent,
        stakeholderId,
    } = request;

    // Assemble context via unified orchestrator
    const ctxRequest: ContextRequest = {
        projectId,
        contextType: contextType === 'meeting' ? 'meeting-section' : 'report-section',
        sectionKey,
        task: sectionLabel || sectionKey,
        reportingPeriod:
            reportingPeriodStart && reportingPeriodEnd
                ? { start: reportingPeriodStart, end: reportingPeriodEnd }
                : undefined,
        stakeholderId: stakeholderId || undefined,
    };

    const ctx = await assembleContext(ctxRequest);

    // Build context string from orchestrator output
    let contextString = [ctx.projectSummary, ctx.moduleContext]
        .filter(Boolean)
        .join('\n\n');

    if (existingContent?.trim()) {
        contextString += `\n\n---\n\n## Existing Content (to enhance)\n${existingContent}`;
    }

    // Get enriched section-specific prompt
    const sectionPrompt = getEnrichedSectionPrompt(sectionKey);

    // Get stakeholder context from assembled data
    let stakeholderContext = '';
    if (stakeholderId) {
        const stakeholders = ctx.rawModules.get('stakeholders');
        if (stakeholders?.success) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const allStakeholders = stakeholders.data as any;
            const all = [
                ...(allStakeholders.consultants || []),
                ...(allStakeholders.contractors || []),
                ...(allStakeholders.authorities || []),
                ...(allStakeholders.other || []),
            ];
            const match = all.find((s: { id: string }) => s.id === stakeholderId);
            if (match) {
                stakeholderContext = `\nThis content is specifically for: ${match.name}`;
            }
        }
    }

    // Determine feature type for system prompt
    const feature: ContentFeature = contextType === 'meeting' ? 'meeting' : 'report';
    const systemPrompt = buildSystemPrompt(feature);

    // Build the user message
    const userMessage = `## Section: ${sectionLabel}

${sectionPrompt}${stakeholderContext}

## Available Project Context

${contextString || 'No specific project data available. Generate content based on professional best practices for this section type, and clearly indicate where project-specific data should be inserted.'}

Generate only the section content. Do not include headers, titles, or meta-commentary.`;

    // Call Claude API
    const anthropic = new Anthropic();
    const message = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1500,
        system: systemPrompt,
        messages: [{ role: 'user', content: userMessage }],
    });

    const textContent = message.content.find(c => c.type === 'text');
    if (!textContent || textContent.type !== 'text') {
        throw new Error('No text response from AI');
    }

    return {
        content: cleanupFormatting(textContent.text),
        sourcesUsed: {
            notes: ctx.metadata.modulesFetched.includes('starredNotes') ? 1 : 0,
            procurementDocs: ctx.metadata.modulesFetched.includes('procurementDocs') ? 1 : 0,
        },
    };
}
```

**Important:** Keep `cleanupFormatting()` (lines 46-58) and `polishContent()` (lines 516-569) untouched — they don't use context assembly.

**Step 4: Verify build**

Run: `cd assemble.ai && npx tsc --noEmit`
Expected: No type errors (or only pre-existing ones).

**Step 5: Commit**

```bash
git add src/lib/services/ai-content-generation.ts
git commit -m "refactor: wire ai-content-generation.ts to unified assembleContext()"
```

---

## Task 9: Wire Consumer — `note-content-generation.ts`

**Files:**
- Modify: `src/lib/services/note-content-generation.ts`

**Step 1: Update imports**

Replace lines 15-32 with:

```typescript
import Anthropic from '@anthropic-ai/sdk';
import type {
    GenerateNoteContentRequest,
    GenerateNoteContentResponse,
} from '@/types/notes-meetings-reports';
import { buildSystemPrompt } from '@/lib/prompts/system-prompts';
import { assembleContext } from '@/lib/context/orchestrator';
import type { ContextRequest } from '@/lib/context/types';
```

Remove all `db`, `notes`, `noteTransmittals`, `documents`, `versions`, `fileAssets`, `projectDetails`, `projectObjectives` imports and `retrieve` import — all handled by orchestrator now.

**Step 2: Delete the fetch functions and types**

Delete:
- Lines 38-52: `AttachedDocument`, `ProjectContext` interfaces
- Lines 61-121: `fetchAttachedDocuments()` function
- Lines 126-165: `fetchProjectContext()` function
- Lines 207-249: `buildContextString()` function

**Step 3: Rewrite `generateNoteContent()`**

Replace the body of `generateNoteContent()` (lines 262-378) with:

```typescript
export async function generateNoteContent(
    request: GenerateNoteContentRequest
): Promise<GenerateNoteContentResponse> {
    const {
        noteId,
        projectId,
        existingContent,
        existingTitle,
    } = request;

    console.log(`[note-content-generation] Generating content for note ${noteId}`);

    // Build query text for RAG from note content
    const rawQueryText = existingContent?.trim() || existingTitle || '';
    const queryText = rawQueryText.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();

    // Assemble context via unified orchestrator
    const ctxRequest: ContextRequest = {
        projectId,
        contextType: 'note',
        task: queryText.length > 10 ? queryText : 'project context',
        noteId,
    };

    const ctx = await assembleContext(ctxRequest);

    // Build context string from orchestrator output
    const contextString = [ctx.projectSummary, ctx.moduleContext, ctx.ragContext]
        .filter(Boolean)
        .join('\n\n---\n\n');

    // Build system prompt
    const systemPrompt = buildSystemPrompt('note');

    // Build user message with smart detection
    const userMessage = `## Note Title
${existingTitle || '(Untitled Note)'}

## Note Content
${existingContent || '(Empty)'}

## Available Context
${contextString || 'No additional context available.'}

## Instructions

First, analyze the note content to determine the user's intent:

**PROMPT MODE** — If the note content is an instruction (starts with "summarize", "review", "list", "create", "extract", "please", "give me", "I need", "can you"):
- Treat the note content as instructions to follow
- Use the attached documents and retrieved context as source material
- Generate new content that is the result of following the instruction

**CONTENT MODE** — If the note content is actual observations or notes (meeting notes, bullet points, paragraphs of information):
- Preserve the key points and intent of the existing content
- Expand and enhance with relevant details from attached documents and context
- Improve structure, clarity, and completeness
- Maintain the user's voice and style

## Critical Rules

1. **ONLY use information explicitly stated in the Retrieved Project Context above**
2. **DO NOT invent, fabricate, or hallucinate any information**
3. If the retrieved context doesn't contain requested information, clearly state what was found and what is missing
4. Quote or paraphrase directly from source material when possible

Output only the generated content with no headers or meta-commentary.`;

    // Call Claude API
    const anthropic = new Anthropic();
    const message = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2000,
        system: systemPrompt,
        messages: [{ role: 'user', content: userMessage }],
    });

    const textContent = message.content.find(c => c.type === 'text');
    if (!textContent || textContent.type !== 'text') {
        throw new Error('No text response from AI');
    }

    console.log(`[note-content-generation] Generated content successfully`);

    const cleanedContent = cleanupFormatting(textContent.text);

    return {
        content: cleanedContent,
        sourcesUsed: {
            attachedDocs: ctx.metadata.modulesFetched.includes('attachedDocuments') ? 1 : 0,
            ragChunks: ctx.metadata.modulesFetched.includes('ragDocuments') ? 1 : 0,
        },
    };
}
```

**Important:** Keep `cleanupFormatting()` (lines 178-198) untouched.

**Step 4: Verify build**

Run: `cd assemble.ai && npx tsc --noEmit`

**Step 5: Commit**

```bash
git add src/lib/services/note-content-generation.ts
git commit -m "refactor: wire note-content-generation.ts to unified assembleContext()"
```

---

## Task 10: Wire Consumer — LangGraph `retrieve-context.ts`

**Files:**
- Modify: `src/lib/langgraph/nodes/retrieve-context.ts`

This is the most surgical change. We inject `assembleContext()` output into `formatHybridContext()` to add lifecycle data alongside the existing Planning Card + RAG context.

**Step 1: Add imports**

After line 18 (`import { formatPlanningContextForPrompt } from '../../services/planning-context';`), add:

```typescript
import { assembleContext } from '../../context/orchestrator';
```

**Step 2: Update `formatHybridContext()`**

Replace the `formatHybridContext` function (lines 153-179) with a version that also includes orchestrator context:

```typescript
export async function formatHybridContext(state: ReportStateType): Promise<string> {
    const sections: string[] = [];

    // Planning Context (Exact - from Planning Card)
    if (state.planningContext) {
        sections.push('## Project Context (Exact - from Planning Card)\n');
        sections.push(formatPlanningContextForPrompt(state.planningContext));
    }

    // Lifecycle Context (from unified orchestrator)
    try {
        const currentSection = state.toc?.sections[state.currentSectionIndex];
        const sectionKey = currentSection?.id ?? 'brief';

        const ctx = await assembleContext({
            projectId: state.projectId,
            contextType: 'rft',
            sectionKey,
            task: currentSection?.title ?? 'report section',
        });

        if (ctx.moduleContext) {
            sections.push('\n\n## Lifecycle Context (from Project Data)\n');
            sections.push(ctx.moduleContext);
        }

        if (ctx.crossModuleInsights) {
            sections.push('\n\n' + ctx.crossModuleInsights);
        }
    } catch (error) {
        console.error('[retrieve-context] Orchestrator context failed, continuing with planning context:', error);
    }

    // RAG Context (Retrieved)
    if (state.currentRetrievedChunks.length > 0) {
        sections.push('\n\n## Document Context (Retrieved)\n');

        const activeChunks = state.currentRetrievedChunks.filter(c =>
            state.activeSourceIds.includes(c.chunkId)
        );

        for (const chunk of activeChunks) {
            sections.push(`### Source: ${chunk.sectionTitle || 'Document'}`);
            sections.push(`[Relevance: ${Math.round(chunk.relevanceScore * 100)}%]`);
            sections.push(chunk.content);
            sections.push('---');
        }
    }

    return sections.join('\n');
}
```

**Important:** The function signature changes from sync to async (`Promise<string>`). This means callers of `formatHybridContext` need to be updated to `await` it. Check `generate-section.ts` for the call site.

**Step 3: Update callers of `formatHybridContext`**

Find where `formatHybridContext` is called in the LangGraph pipeline (likely in `generate-section.ts`) and add `await`:

```typescript
// Before:
const context = formatHybridContext(state);
// After:
const context = await formatHybridContext(state);
```

**Step 4: Verify build**

Run: `cd assemble.ai && npx tsc --noEmit`

**Step 5: Commit**

```bash
git add src/lib/langgraph/nodes/retrieve-context.ts src/lib/langgraph/nodes/generate-section.ts
git commit -m "refactor: inject orchestrator lifecycle context into LangGraph hybrid context"
```

---

## Task 11: Deprecate Legacy `report-context-orchestrator.ts`

**Files:**
- Modify: `src/lib/services/report-context-orchestrator.ts`

**Step 1: Add deprecation notice and redirect**

Add at the top of the file (after the existing header comment):

```typescript
/**
 * @deprecated This file is superseded by src/lib/context/orchestrator.ts
 * All consumers should use assembleContext() from the unified orchestrator.
 * This file is kept for reference during migration but should not be imported.
 *
 * Migration guide:
 * - fetchBriefContext(projectId) → assembleContext({ projectId, contextType: 'report-section', sectionKey: 'brief' })
 * - fetchProcurementContext(projectId) → assembleContext({ projectId, contextType: 'report-section', sectionKey: 'procurement' })
 * - getOrchestratorForSection(key) → resolveStrategy({ contextType: 'report-section', sectionKey: key })
 */
```

Mark the key exports as deprecated:

```typescript
/** @deprecated Use assembleContext() from src/lib/context/orchestrator.ts */
export async function fetchBriefContext(...) { ... }

/** @deprecated Use assembleContext() from src/lib/context/orchestrator.ts */
export async function fetchProcurementContext(...) { ... }

/** @deprecated Use resolveStrategy() from src/lib/context/strategies.ts */
export function getOrchestratorForSection(...) { ... }
```

**Step 2: Commit**

```bash
git add src/lib/services/report-context-orchestrator.ts
git commit -m "refactor: deprecate report-context-orchestrator.ts in favor of unified orchestrator"
```

---

## Task 12: Final Verification

**Step 1: Type check**

Run: `cd assemble.ai && npx tsc --noEmit`
Expected: No new type errors.

**Step 2: Build**

Run: `cd assemble.ai && npm run build`
Expected: Build succeeds.

**Step 3: Verify no dead imports**

Check that the removed functions from `ai-content-generation.ts` are not imported elsewhere:

```bash
cd assemble.ai && grep -r "fetchStarredNotes\|fetchProcurementDocs\|fetchProjectContext" --include="*.ts" --include="*.tsx" src/ | grep -v "node_modules" | grep -v "report-context-orchestrator" | grep -v "context/modules"
```

Expected: Only the API route files that call `generateSectionContent()` and `generateNoteContent()` — those are the public interfaces that remain unchanged.

**Step 4: Commit final verification**

If any fixes were needed, commit them:

```bash
git add -A
git commit -m "fix: resolve type/import issues from orchestrator wiring"
```
