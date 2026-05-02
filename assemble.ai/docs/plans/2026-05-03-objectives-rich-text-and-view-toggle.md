# Objectives — Rich Text Editor + Short/Long View Toggle Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the plain `<textarea>` per objectives section with a TipTap rich-text editor; introduce a Short/Long view toggle and a single regenerate (↻) action per section; preserve user formatting and the dual `text` / `textPolished` storage; respect `// instruction` markers as per-bullet steering for the polish pass.

**Architecture:** Each objectives section becomes a TipTap bullet-list editor where each `<li>` is mapped 1:1 to a `projectObjectives` row via a `data-row-id` attribute. The schema is unchanged — `text` holds the short HTML, `textPolished` holds the long HTML; both columns store HTML (plain text is valid HTML, so no migration). A new section header renders `[Short | Long]` as a segmented view toggle (pure display switch — flips per-row `status`, no AI cost) plus a `↻` regenerate action that operates on the column currently being viewed. ↻ on Short calls the existing generate route; ↻ on Long calls a generalised polish route that accepts `{ section }` (rather than only `{ ids }`) and either polishes existing rows or generates fresh polished content if the section is empty. The polish prompt learns to extract `// instructions` per bullet, treat them as steering, and strip them from the output. Inline AI keeps writing directly; the chat dock keeps the approval gate.

**Tech Stack:** Next.js 15 (App Router) · React 19 · TipTap 2 (already in repo) · Drizzle ORM · PostgreSQL · Jest + ts-jest for unit tests · Anthropic SDK via existing `aiComplete` wrapper.

---

## Design Decisions Reference

These were resolved in the grilling session of 2026-05-03. Re-read before deviating from the plan:

1. Polished bullets (10-15 words, AS/NCC refs) are the canonical "long" form; terse bullets (2-5 words) are the canonical "short" form. Both stored independently per row.
2. AI always emits plain text. User formatting is layered on top via TipTap.
3. `[Short | Long]` is a pure view toggle — no AI cost. The `↻` action is the only thing that calls the AI.
4. ↻ on Short = destructive; ↻ on Long = non-destructive. ↻ on Short shows a confirmation modal *only* when manual edits are detected (snapshot diff or HTML markup beyond plain text).
5. ↻ on Long with empty section = single AI call producing polished bullets directly (no two-pass round-trip).
6. `// instructions` inside any bullet are per-bullet steering, scoped to that bullet only. After ↻, markers are stripped.
7. Adding new bullets via instruction is the chat dock's job (`set_project_objectives` with `mode: 'append'`), not the inline editor.
8. Autosave is debounced at 1.5s plus on blur, using ID-based row diffing.

---

## Phase 1 — Backend: prompt and API changes (no UI yet)

These tasks ship behind the unchanged textarea UI. They make the backend ready for the new frontend; the existing UI continues to work.

### Task 1: Add `// marker` handling to the polish prompt

**Files:**
- Modify: `src/app/api/projects/[projectId]/objectives/polish/route.ts` (the inline prompt at lines ~156-173)

**Step 1: Write the failing test**

Create `src/app/api/projects/[projectId]/objectives/polish/__tests__/prompt-builder.test.ts`:

```ts
/**
 * @jest-environment node
 *
 * Tests the polish-prompt construction logic — specifically that:
 *   1. // markers in bullet text become per-bullet steering instructions in the prompt
 *   2. The prompt instructs the AI to strip markers from output
 *   3. A bullet that is ONLY a // line is flagged as "no-op / drop"
 */

import { buildPolishPrompt } from '../prompt-builder';

describe('buildPolishPrompt', () => {
  const baseCtx = {
    profileContext: 'Project Context: ...',
    domainContextSection: '',
  };

  it('extracts // instructions per bullet and includes them as steering', () => {
    const prompt = buildPolishPrompt({
      ...baseCtx,
      bullets: [
        { text: 'Premium materials // make this measurable' },
        { text: 'Open-plan living' },
      ],
    });

    expect(prompt).toContain('Premium materials');
    expect(prompt).toContain('STEERING for bullet 1: make this measurable');
    expect(prompt).not.toContain('STEERING for bullet 2');
  });

  it('instructs the AI to strip // markers from polished output', () => {
    const prompt = buildPolishPrompt({
      ...baseCtx,
      bullets: [{ text: 'Foo // bar' }],
    });
    expect(prompt).toMatch(/strip.*\/\/.*marker/i);
  });

  it('marks bullets that are ONLY a // line as no-op', () => {
    const prompt = buildPolishPrompt({
      ...baseCtx,
      bullets: [
        { text: 'Premium materials' },
        { text: '// add a bullet about acoustic separation' },
      ],
    });
    expect(prompt).toContain('Premium materials');
    expect(prompt).toMatch(/bullet 2.*no-op|drop bullet 2/i);
  });
});
```

**Step 2: Run the test to verify it fails**

Run: `npx jest src/app/api/projects/[projectId]/objectives/polish/__tests__/prompt-builder.test.ts`
Expected: `Cannot find module '../prompt-builder'`

**Step 3: Extract the prompt into a pure builder function**

Create `src/app/api/projects/[projectId]/objectives/polish/prompt-builder.ts`:

```ts
/**
 * Pure prompt-builder for the objectives polish pass.
 * Extracted so it can be unit-tested without touching the database or AI client.
 */

const INSTRUCTION_REGEX = /(?<!:)\/\/\s*(.+)/;

export interface PolishBullet {
  text: string;
}

export interface PolishPromptInput {
  profileContext: string;
  domainContextSection: string;
  bullets: PolishBullet[];
}

interface ParsedBullet {
  index: number;
  cleanedText: string;
  instruction: string | null;
  isInstructionOnly: boolean;
}

function parseBullet(rawText: string, idx: number): ParsedBullet {
  const trimmed = rawText.trim();
  const match = INSTRUCTION_REGEX.exec(trimmed);

  if (!match) {
    return { index: idx, cleanedText: trimmed, instruction: null, isInstructionOnly: false };
  }

  const instruction = match[1].trim();
  const beforeMarker = trimmed.slice(0, match.index).trim();

  if (beforeMarker.length === 0) {
    return { index: idx, cleanedText: '', instruction, isInstructionOnly: true };
  }

  return {
    index: idx,
    cleanedText: beforeMarker,
    instruction,
    isInstructionOnly: false,
  };
}

export function buildPolishPrompt(input: PolishPromptInput): string {
  const { profileContext, domainContextSection, bullets } = input;
  const parsed = bullets.map((b, i) => parseBullet(b.text, i));

  const bulletList = parsed
    .map((p) => `${p.index + 1}. ${p.isInstructionOnly ? '[NO-OP — drop bullet ' + (p.index + 1) + ']' : p.cleanedText}`)
    .join('\n');

  const steeringLines = parsed
    .filter((p) => p.instruction && !p.isInstructionOnly)
    .map((p) => `- STEERING for bullet ${p.index + 1}: ${p.instruction}`)
    .join('\n');

  const steeringSection = steeringLines
    ? `\nPER-BULLET STEERING (apply only to the indicated bullet):\n${steeringLines}\n`
    : '';

  return `You are an expert construction project manager and technical writer in Australia.

${profileContext}
${domainContextSection ? `${domainContextSection}\n` : ''}OBJECTIVES TO EXPAND:

${bulletList}
${steeringSection}
INSTRUCTIONS:
Expand each bullet point to 10-15 words while preserving meaning.
1. Use the KNOWLEDGE DOMAIN CONTEXT above to add accurate Australian standards references (NCC 2022, BCA, AS standards) — cite only references found in the domain context, do not invent standards.
2. Make objectives measurable where possible (quantities, percentages, ratings, timeframes).
3. Keep language professional, formal, and concise — suitable for tender documentation.
4. If a STEERING note is given for a bullet, treat it as the user's refinement instruction for that bullet only — do NOT apply it to any other bullet.
5. STRIP any "//" markers and the text after them from your output. The polished bullet must contain no "//" notation.
6. For bullets marked "[NO-OP — drop bullet N]", return an empty string for that index.
7. Do NOT add new objectives not present in the input.
8. Maintain the same numbered order as the input.

Return a JSON array of expanded strings (same count and order as input). Use empty strings for dropped bullets:
["expanded bullet 1", "", "expanded bullet 3", ...]`;
}
```

**Step 4: Run the test to verify it passes**

Run: `npx jest src/app/api/projects/[projectId]/objectives/polish/__tests__/prompt-builder.test.ts`
Expected: PASS (3 tests)

**Step 5: Wire the builder into the route handler**

Modify `src/app/api/projects/[projectId]/objectives/polish/route.ts`. Replace the inline prompt construction (lines ~152-173) with:

```ts
import { buildPolishPrompt } from './prompt-builder';

// ... inside POST, after profileContext + domainContextSection are computed:

const prompt = buildPolishPrompt({
  profileContext,
  domainContextSection,
  bullets: validRows.map((r) => ({ text: r.textPolished || r.text })),
});
```

Then, after parsing `polishedTexts`, drop any rows whose polished text is an empty string (the "instruction-only bullet" case):

```ts
// Update each row with its polished text — skip rows whose polished text is empty
// (instruction-only bullets that the user wants dropped).
const updatedRows = [];
for (let i = 0; i < validRows.length; i++) {
  const row = validRows[i];
  const polishedText = polishedTexts[i];

  if (typeof polishedText !== 'string' || polishedText.trim() === '') {
    // Drop this bullet — soft-delete the row.
    await db
      .update(projectObjectives)
      .set({ isDeleted: true, updatedAt: new Date() })
      .where(eq(projectObjectives.id, row.id));
    continue;
  }

  const [updated] = await db
    .update(projectObjectives)
    .set({
      textPolished: polishedText,
      status: 'polished',
      updatedAt: new Date(),
    })
    .where(eq(projectObjectives.id, row.id))
    .returning();

  if (updated) updatedRows.push(updated);
}
```

**Step 6: Smoke-test the route in dev**

Start the dev server (`npm run dev`), open an existing project with objectives, and via browser devtools fetch:

```
fetch('/api/projects/<projectId>/objectives/polish', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ ids: ['<row-id>'] }),
}).then(r => r.json()).then(console.log)
```

Manually edit the row's `text` in the database to include `// make this measurable` first. Verify the response's `data.polished[0].textPolished` does NOT contain `//`.

**Step 7: Commit**

```bash
git add src/app/api/projects/[projectId]/objectives/polish/prompt-builder.ts src/app/api/projects/[projectId]/objectives/polish/__tests__/prompt-builder.test.ts src/app/api/projects/[projectId]/objectives/polish/route.ts
git commit -m "feat(objectives): polish prompt extracts // markers as per-bullet steering"
```

---

### Task 2: Generalise the polish route to accept `{ section }` and handle empty sections

**Files:**
- Modify: `src/app/api/projects/[projectId]/objectives/polish/route.ts`
- Reuse: `src/app/api/projects/[projectId]/objectives/generate/route.ts` (for the Long-fresh prompt path)

**Background.** The polish route currently requires `{ ids: string[] }`. With the view-toggle UI, ↻ on Long sends `{ section: 'functional' }` instead. The route needs to:
- If `section` is provided and the section has rows → polish all rows in that section.
- If `section` is provided and the section has no rows → run the merged "Long fresh" prompt: profile + inference rules + RAG + polish-style instructions in a single call, write the result as new rows with `status='polished'` and both `text` (terse fallback) + `textPolished` populated.
- Keep the `{ ids }` path for backwards compatibility with anything else that uses it.

**Step 1: Write the failing test**

Add to `src/app/api/projects/[projectId]/objectives/polish/__tests__/prompt-builder.test.ts` (or new file `polish-fresh-prompt-builder.test.ts`):

```ts
import { buildPolishFreshPrompt } from '../polish-fresh-prompt-builder';

describe('buildPolishFreshPrompt', () => {
  it('asks for both terse fallback AND polished bullets in a single response', () => {
    const prompt = buildPolishFreshPrompt({
      section: 'functional',
      profileContext: 'Project Context: ...',
      domainContextSection: '',
      inferenceRulesFormatted: '- Open-plan living\n- Storage requirements',
    });
    expect(prompt).toContain('functional');
    expect(prompt).toContain('Open-plan living');
    expect(prompt).toMatch(/short.*and.*polished|both/i);
    expect(prompt).toContain('"short"');
    expect(prompt).toContain('"polished"');
  });

  it('includes Australian standards instruction in polished section', () => {
    const prompt = buildPolishFreshPrompt({
      section: 'compliance',
      profileContext: '',
      domainContextSection: '',
      inferenceRulesFormatted: '- NCC 2022 compliance',
    });
    expect(prompt).toMatch(/NCC|AS standards/);
    expect(prompt).toMatch(/10-15 words/);
  });
});
```

**Step 2: Run the test to verify it fails**

Run: `npx jest src/app/api/projects/[projectId]/objectives/polish/__tests__/`
Expected: `Cannot find module '../polish-fresh-prompt-builder'`

**Step 3: Create the fresh-prompt builder**

Create `src/app/api/projects/[projectId]/objectives/polish/polish-fresh-prompt-builder.ts`:

```ts
import type { ObjectiveType } from '@/lib/db/objectives-schema';

export interface PolishFreshPromptInput {
  section: ObjectiveType;
  profileContext: string;
  domainContextSection: string;
  inferenceRulesFormatted: string;
}

const SECTION_DEFINITIONS: Record<ObjectiveType, string> = {
  functional: 'What the building physically provides and how it operates (physical attributes, design features, operational requirements).',
  quality: 'How well the building performs and materials/finish standards (quality, performance, user experience).',
  planning: 'Planning approvals and regulatory compliance (DA/CDC, environmental, council/authority requirements).',
  compliance: 'Building codes and certification requirements (NCC/BCA, Australian Standards, certifications).',
};

export function buildPolishFreshPrompt(input: PolishFreshPromptInput): string {
  const { section, profileContext, domainContextSection, inferenceRulesFormatted } = input;
  return `You are an expert construction project manager in Australia.

${profileContext}
${domainContextSection ? `${domainContextSection}\n` : ''}TARGET SECTION: ${section.toUpperCase()}
${SECTION_DEFINITIONS[section]}

SUGGESTED ITEMS FROM PROJECT ANALYSIS:
${inferenceRulesFormatted || '(No specific rules matched — generate based on project profile)'}

INSTRUCTIONS:
Generate 4-8 objectives for this section. For EACH objective, produce TWO forms:
- "short": 2-5 words, terse bullet
- "polished": 10-15 words, professional tender-grade language with Australian standards references (NCC 2022, BCA, AS standards) where supported by the KNOWLEDGE DOMAIN CONTEXT. Make measurable where possible.

Cite ONLY standards present in the domain context — do NOT invent standards.

Respond in JSON format:
{
  "items": [
    { "short": "Premium material selection", "polished": "Premium material selection meeting NCC 2022 Section J energy efficiency standards" },
    ...
  ]
}`;
}
```

**Step 4: Run the test to verify it passes**

Run: `npx jest src/app/api/projects/[projectId]/objectives/polish/__tests__/`
Expected: PASS

**Step 5: Wire the new path into the route handler**

Modify `src/app/api/projects/[projectId]/objectives/polish/route.ts`. At the top of the handler, parse `section` and decide which path to take:

```ts
import { buildPolishFreshPrompt } from './polish-fresh-prompt-builder';
import { evaluateRules, formatRulesForPrompt, type ProjectData } from '@/lib/services/inference-engine';
import { VALID_OBJECTIVE_TYPES, type ObjectiveType } from '@/lib/db/objectives-schema';

// Inside POST after auth + projectId:
const body = await request.json();
const { ids, section } = body as { ids?: unknown; section?: unknown };

// Validate that exactly one of ids/section is provided
const hasIds = Array.isArray(ids) && ids.length > 0;
const hasSection = typeof section === 'string' && VALID_OBJECTIVE_TYPES.includes(section as ObjectiveType);

if (!hasIds && !hasSection) {
  return NextResponse.json(
    { success: false, error: { code: 'VALIDATION_ERROR', message: 'Provide either ids[] or section' } },
    { status: 400 }
  );
}

// If section provided, resolve to the section's existing row IDs
let resolvedIds: string[];
if (hasSection) {
  const existing = await db
    .select({ id: projectObjectives.id })
    .from(projectObjectives)
    .where(
      and(
        eq(projectObjectives.projectId, projectId),
        eq(projectObjectives.objectiveType, section as ObjectiveType),
        eq(projectObjectives.isDeleted, false),
      )
    );
  resolvedIds = existing.map((r) => r.id);
} else {
  resolvedIds = (ids as unknown[]).filter((x): x is string => typeof x === 'string');
}

// If section is provided AND there are no existing rows, branch to "Long fresh" path
if (hasSection && resolvedIds.length === 0) {
  return await handleLongFresh({ projectId, section: section as ObjectiveType });
}

// Otherwise the existing per-IDs polish flow continues using `resolvedIds` instead of `idStrings`.
```

Add the `handleLongFresh` function (in the same file or a separate `long-fresh-handler.ts`). It mirrors the inference-rules path of the generate route, but uses `buildPolishFreshPrompt` instead of the short prompt, and inserts rows with both `text` (from `short`) and `textPolished` (from `polished`), `status: 'polished'`. After insertion, also write an `objectiveGenerationSessions` audit row with `iteration: 2`.

Pseudo-code shape (engineer fills in details from generate/route.ts patterns):

```ts
async function handleLongFresh(args: { projectId: string; section: ObjectiveType }) {
  // 1. Load profile, build profile context
  // 2. Resolve domain tags + retrieve domain context (same as generate route)
  // 3. Build ProjectData, evaluate inference rules for the section's rule set
  // 4. Call aiComplete with buildPolishFreshPrompt(...)
  // 5. Parse JSON { items: [{ short, polished }, ...] }
  // 6. Soft-delete any existing rows for this projectId+section (defensive — should be empty)
  // 7. Insert new rows: { text: item.short, textPolished: item.polished, status: 'polished', source: 'ai_added', sortOrder: idx }
  // 8. Insert objectiveGenerationSessions row with iteration: 2
  // 9. Return { success: true, data: { polished: insertedRows } }
}
```

**Step 6: Smoke-test in dev**

```js
// Section that has rows — should polish them
fetch('/api/projects/<id>/objectives/polish', {
  method: 'POST', headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ section: 'functional' }),
}).then(r => r.json()).then(console.log)

// Section that is empty (delete its rows first via UI) — should generate polished from scratch
// Same call, expect new rows with both text and textPolished populated.
```

**Step 7: Commit**

```bash
git add src/app/api/projects/[projectId]/objectives/polish/
git commit -m "feat(objectives): polish route accepts section[] and runs Long-fresh on empty"
```

---

### Task 3: Build a manual-edits detection helper

**Files:**
- Create: `src/lib/services/objectives-edit-detection.ts`
- Test: `src/lib/services/__tests__/objectives-edit-detection.test.ts`

**Step 1: Write the failing test**

```ts
/**
 * @jest-environment node
 *
 * Pure helper — given a set of objective rows and the most recent generation
 * snapshot for that section, decide whether the section "has manual edits"
 * (which means ↻ on Short should ask for confirmation).
 */

import { hasManualEdits } from '../objectives-edit-detection';

const baseRow = {
  id: 'r1',
  text: 'Premium materials',
  textPolished: null as string | null,
  status: 'draft' as const,
  source: 'ai_added' as const,
};

describe('hasManualEdits', () => {
  it('returns false when every row matches the snapshot exactly and has no HTML marks', () => {
    const result = hasManualEdits({
      rows: [
        { ...baseRow, id: 'r1', text: 'Premium materials' },
        { ...baseRow, id: 'r2', text: 'Open-plan living' },
      ],
      snapshot: ['Premium materials', 'Open-plan living'],
    });
    expect(result).toBe(false);
  });

  it('returns true when a row text differs from the snapshot', () => {
    const result = hasManualEdits({
      rows: [{ ...baseRow, text: 'Premium luxury materials' }],
      snapshot: ['Premium materials'],
    });
    expect(result).toBe(true);
  });

  it('returns true when a row contains HTML marks beyond plain text', () => {
    const result = hasManualEdits({
      rows: [{ ...baseRow, text: 'Premium <strong>materials</strong>' }],
      snapshot: ['Premium materials'],
    });
    expect(result).toBe(true);
  });

  it('returns true when row count differs from snapshot', () => {
    const result = hasManualEdits({
      rows: [{ ...baseRow }, { ...baseRow, id: 'r2', text: 'Extra bullet' }],
      snapshot: ['Premium materials'],
    });
    expect(result).toBe(true);
  });

  it('returns true when there is no snapshot (user-only content)', () => {
    const result = hasManualEdits({
      rows: [{ ...baseRow, text: 'User added bullet' }],
      snapshot: null,
    });
    expect(result).toBe(true);
  });

  it('strips harmless <p> wrappers when comparing text', () => {
    const result = hasManualEdits({
      rows: [{ ...baseRow, text: '<p>Premium materials</p>' }],
      snapshot: ['Premium materials'],
    });
    expect(result).toBe(false);
  });
});
```

**Step 2: Run the test to verify it fails**

Run: `npx jest src/lib/services/__tests__/objectives-edit-detection.test.ts`
Expected: `Cannot find module '../objectives-edit-detection'`

**Step 3: Implement**

```ts
// src/lib/services/objectives-edit-detection.ts

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
```

**Step 4: Run the test to verify it passes**

Run: `npx jest src/lib/services/__tests__/objectives-edit-detection.test.ts`
Expected: PASS (6 tests)

**Step 5: Add an API endpoint to fetch the latest snapshot for a section**

The frontend needs the snapshot to call `hasManualEdits` before deciding whether to show the confirmation modal. Add a small helper API.

Modify `src/app/api/projects/[projectId]/objectives/route.ts` (the existing GET) to also include the latest snapshot per section in its response:

```ts
// After fetching rows, also fetch the latest objective_generation_session per section
import { objectiveGenerationSessions } from '@/lib/db/objectives-schema';
import { desc } from 'drizzle-orm';

const sessions = await db
  .select()
  .from(objectiveGenerationSessions)
  .where(eq(objectiveGenerationSessions.projectId, projectId))
  .orderBy(desc(objectiveGenerationSessions.createdAt));

const latestSnapshotBySection: Record<ObjectiveType, string[] | null> = {
  planning: null, functional: null, quality: null, compliance: null,
};

for (const session of sessions) {
  const sec = session.objectiveType;
  if (latestSnapshotBySection[sec] !== null) continue;
  const items = (session.generatedItems as { explicit?: string[]; ai_added?: string[] }) || {};
  latestSnapshotBySection[sec] = [...(items.explicit ?? []), ...(items.ai_added ?? [])];
}

return NextResponse.json({
  success: true,
  data: groupedRows,
  snapshots: latestSnapshotBySection,
});
```

**Step 6: Commit**

```bash
git add src/lib/services/objectives-edit-detection.ts src/lib/services/__tests__/objectives-edit-detection.test.ts src/app/api/projects/[projectId]/objectives/route.ts
git commit -m "feat(objectives): add manual-edit detection helper + expose snapshots in GET response"
```

---

## Phase 2 — Frontend: TipTap editor swap (no UI behaviour change)

This phase swaps the textarea for a TipTap editor while preserving every existing behaviour. View toggle and ↻ come in Phase 3.

### Task 4: Create the `ObjectivesEditor` TipTap component

**Files:**
- Create: `src/components/profiler/objectives/ObjectivesEditor.tsx`
- Test: `src/components/profiler/objectives/__tests__/ObjectivesEditor.test.tsx`

The editor renders a single bullet list. Each `<li>` carries `data-row-id` so the diff in `saveSection` can match rows by ID. The extension set is intentionally narrow — bullet list, list item, bold, italic, link, plus the existing inline-instruction highlight. No headings, no tables, no images.

**Step 1: Write the failing test**

```tsx
// src/components/profiler/objectives/__tests__/ObjectivesEditor.test.tsx
/**
 * @jest-environment jsdom
 */
import { render, screen } from '@testing-library/react';
import { ObjectivesEditor } from '../ObjectivesEditor';

describe('ObjectivesEditor', () => {
  it('renders one <li> per row, each with data-row-id', async () => {
    render(
      <ObjectivesEditor
        rows={[
          { id: 'a', text: 'First bullet' },
          { id: 'b', text: 'Second bullet' },
        ]}
        onChange={() => {}}
        placeholder="Type bullets"
      />,
    );

    const items = await screen.findAllByRole('listitem');
    expect(items).toHaveLength(2);
    expect(items[0].getAttribute('data-row-id')).toBe('a');
    expect(items[1].getAttribute('data-row-id')).toBe('b');
  });

  it('shows placeholder when rows is empty', async () => {
    render(<ObjectivesEditor rows={[]} onChange={() => {}} placeholder="Type bullets" />);
    expect(await screen.findByText('Type bullets')).toBeInTheDocument();
  });
});
```

**Step 2: Run the test to verify it fails**

Run: `npx jest src/components/profiler/objectives/__tests__/ObjectivesEditor.test.tsx`
Expected: `Cannot find module '../ObjectivesEditor'`

**Step 3: Implement the component**

```tsx
// src/components/profiler/objectives/ObjectivesEditor.tsx
'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import Document from '@tiptap/extension-document';
import Paragraph from '@tiptap/extension-paragraph';
import Text from '@tiptap/extension-text';
import BulletList from '@tiptap/extension-bullet-list';
import ListItem from '@tiptap/extension-list-item';
import Bold from '@tiptap/extension-bold';
import Italic from '@tiptap/extension-italic';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import History from '@tiptap/extension-history';
import { InlineInstructionHighlight } from '@/lib/editor/inline-instruction-extension';
import { useEffect, useMemo, useRef } from 'react';
import { cn } from '@/lib/utils';

export interface EditorRow {
  id: string;
  text: string; // HTML or plain text (plain text is valid HTML)
}

export interface ObjectivesEditorProps {
  rows: EditorRow[];
  /** Fires on every TipTap update with the parsed bullet list (id + html per <li>). */
  onChange: (items: { id: string | null; html: string }[]) => void;
  /** Fires when the editor loses focus. */
  onBlur?: () => void;
  /** Fires when the editor gains focus. */
  onFocus?: () => void;
  placeholder?: string;
  className?: string;
}

const ID_ATTRIBUTE = 'data-row-id';

// A ListItem variant that round-trips a data-row-id attribute.
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

function rowsToHtml(rows: EditorRow[]): string {
  if (rows.length === 0) return '';
  const items = rows
    .map((r) => `<li ${ID_ATTRIBUTE}="${r.id}">${r.text}</li>`)
    .join('');
  return `<ul>${items}</ul>`;
}

/**
 * Parse the editor's current state into [{ id, html }] per <li>.
 * id is null for newly-typed bullets that haven't been persisted yet.
 */
function parseEditorContent(html: string): { id: string | null; html: string }[] {
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
  const initialHtml = useMemo(() => rowsToHtml(rows), []); // intentionally only on first render
  const externalRowsKey = useMemo(() => rows.map((r) => `${r.id}:${r.text}`).join('|'), [rows]);
  const isFocusedRef = useRef(false);

  const editor = useEditor({
    extensions: [
      Document,
      Paragraph,
      Text,
      BulletList,
      RowListItem,
      Bold,
      Italic,
      Link.configure({ openOnClick: false, HTMLAttributes: { class: 'text-blue-400 hover:text-blue-300 underline' } }),
      Placeholder.configure({ placeholder }),
      History,
      InlineInstructionHighlight,
    ],
    content: initialHtml || `<ul><li ${ID_ATTRIBUTE}=""></li></ul>`,
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: cn('prose prose-invert prose-sm max-w-none focus:outline-none px-4 py-3 leading-relaxed', className),
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

  // Sync external row changes (AI generation, deletes from elsewhere) into the editor —
  // but only when the user isn't actively editing.
  useEffect(() => {
    if (!editor) return;
    if (isFocusedRef.current) return;
    const incoming = rowsToHtml(rows);
    if (editor.getHTML() === incoming) return;
    editor.commands.setContent(incoming || `<ul><li ${ID_ATTRIBUTE}=""></li></ul>`, false);
  }, [editor, externalRowsKey, rows]);

  return <EditorContent editor={editor} />;
}
```

**Step 4: Run the test to verify it passes**

Run: `npx jest src/components/profiler/objectives/__tests__/ObjectivesEditor.test.tsx`
Expected: PASS

If TipTap fails to render in jsdom, ensure the test file imports `@testing-library/jest-dom` setup and that jsdom is configured. If the rendering test is brittle, prefer a unit test that imports `parseEditorContent` and `rowsToHtml` directly (extract them to a `parsing.ts` sub-module if needed) — keep the React render test minimal.

**Step 5: Commit**

```bash
git add src/components/profiler/objectives/ObjectivesEditor.tsx src/components/profiler/objectives/__tests__/ObjectivesEditor.test.tsx
git commit -m "feat(objectives): add ObjectivesEditor TipTap component"
```

---

### Task 5: Replace the textarea in `SectionGroup` with `ObjectivesEditor`

**Files:**
- Modify: `src/components/profiler/objectives/SectionGroup.tsx`
- Modify: `src/components/profiler/objectives/ObjectivesWorkspace.tsx` — `saveSection` becomes ID-based

**Step 1: Write a failing test for the ID-based diff**

Create `src/components/profiler/objectives/__tests__/save-section-diff.test.ts`:

```ts
import { computeRowOps } from '../save-section-diff';

const existing = (id: string, text: string) => ({
  id, projectId: 'p', objectiveType: 'functional' as const, source: 'ai_added' as const,
  text, textPolished: null, status: 'draft', sortOrder: 0, isDeleted: false,
  createdAt: '', updatedAt: '',
});

describe('computeRowOps', () => {
  it('detects no-ops when content matches', () => {
    const ops = computeRowOps({
      currentRows: [existing('a', 'One'), existing('b', 'Two')],
      editorItems: [{ id: 'a', html: 'One' }, { id: 'b', html: 'Two' }],
    });
    expect(ops.creates).toHaveLength(0);
    expect(ops.updates).toHaveLength(0);
    expect(ops.deletes).toHaveLength(0);
  });

  it('detects creates for items with no id', () => {
    const ops = computeRowOps({
      currentRows: [existing('a', 'One')],
      editorItems: [{ id: 'a', html: 'One' }, { id: null, html: 'New bullet' }],
    });
    expect(ops.creates).toEqual([{ html: 'New bullet', sortOrder: 1 }]);
  });

  it('detects updates when html differs for matched id', () => {
    const ops = computeRowOps({
      currentRows: [existing('a', 'One')],
      editorItems: [{ id: 'a', html: 'One refined' }],
    });
    expect(ops.updates).toEqual([{ id: 'a', html: 'One refined' }]);
  });

  it('detects deletes for ids missing from editor', () => {
    const ops = computeRowOps({
      currentRows: [existing('a', 'One'), existing('b', 'Two')],
      editorItems: [{ id: 'a', html: 'One' }],
    });
    expect(ops.deletes).toEqual(['b']);
  });

  it('handles reorder by writing sortOrder into updates', () => {
    const ops = computeRowOps({
      currentRows: [existing('a', 'One'), existing('b', 'Two')],
      editorItems: [{ id: 'b', html: 'Two' }, { id: 'a', html: 'One' }],
    });
    // Both rows get sortOrder updates; no text change, but the order changed.
    const idsInOrder = ops.updates.map((u) => u.id);
    expect(idsInOrder).toEqual(['b', 'a']);
    expect(ops.updates[0].sortOrder).toBe(0);
    expect(ops.updates[1].sortOrder).toBe(1);
  });
});
```

**Step 2: Run the test to verify it fails**

Run: `npx jest src/components/profiler/objectives/__tests__/save-section-diff.test.ts`
Expected: `Cannot find module '../save-section-diff'`

**Step 3: Implement the diff function**

```ts
// src/components/profiler/objectives/save-section-diff.ts
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
  // Normalise — strip a single outer <p> if present, since AI returns plain
  // text and TipTap may render it inside <p>.
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
      // ID is in the editor but not in the current rows — treat as create with that html
      ops.creates.push({ html: item.html, sortOrder: idx });
      return;
    }

    const update: { id: string; html?: string; sortOrder?: number } = { id: item.id };
    if (isMeaningfullyDifferent(existing.text, item.html)) update.html = item.html;
    if (existing.sortOrder !== idx) update.sortOrder = idx;
    if (update.html !== undefined || update.sortOrder !== undefined) ops.updates.push(update);
  });

  for (const row of currentRows) {
    if (!seenIds.has(row.id)) ops.deletes.push(row.id);
  }

  return ops;
}
```

**Step 4: Run the test to verify it passes**

Run: `npx jest src/components/profiler/objectives/__tests__/save-section-diff.test.ts`
Expected: PASS (5 tests)

**Step 5: Wire `ObjectivesEditor` into `SectionGroup`**

Replace the `<textarea>` block in [src/components/profiler/objectives/SectionGroup.tsx](src/components/profiler/objectives/SectionGroup.tsx) with `<ObjectivesEditor>`. The component's `value` / `onChange` / `onBlur` handlers go away — instead, hold the latest editor items in a ref and call `onSave` (the section save callback) on blur.

Approximate shape:

```tsx
// In SectionGroup.tsx
import { ObjectivesEditor, type EditorRow } from './ObjectivesEditor';
import { computeRowOps, type EditorItem } from './save-section-diff';

interface SectionGroupProps {
  type: ObjectiveType;
  label: string;
  rows: ObjectiveRow[];
  onSave: (type: ObjectiveType, items: EditorItem[]) => Promise<void>; // signature changes
  // ... rest unchanged
}

const editorRows: EditorRow[] = rows.map((r) => ({
  id: r.id,
  text: r.status === 'polished' && r.textPolished ? r.textPolished : r.text,
}));

const latestItemsRef = useRef<EditorItem[]>([]);
const lastSavedKeyRef = useRef<string>('');

const itemsKey = (items: EditorItem[]) => items.map((i) => `${i.id ?? '∅'}:${i.html}`).join('|');

// Initialise lastSaved from current rows (so we don't trigger a save with no real diff)
useEffect(() => {
  lastSavedKeyRef.current = itemsKey(editorRows.map((r) => ({ id: r.id, html: r.text })));
}, []); // eslint-disable-line react-hooks/exhaustive-deps

const handleEditorChange = useCallback((items: EditorItem[]) => {
  latestItemsRef.current = items;
}, []);

const handleEditorBlur = useCallback(async () => {
  const current = latestItemsRef.current;
  const key = itemsKey(current);
  if (key === lastSavedKeyRef.current) return;
  setIsSaving(true);
  try {
    await onSave(type, current);
    lastSavedKeyRef.current = key;
  } finally {
    setIsSaving(false);
  }
}, [onSave, type]);

return (
  <div /* unchanged outer wrapping */>
    {/* unchanged header bar */}
    <div className="backdrop-blur-md" style={{ backgroundColor: '...' }}>
      <ObjectivesEditor
        rows={editorRows}
        onChange={handleEditorChange}
        onBlur={handleEditorBlur}
        placeholder={`Type ${label.toLowerCase()} objectives — one per line`}
      />
    </div>
  </div>
);
```

In [src/components/profiler/objectives/ObjectivesWorkspace.tsx](src/components/profiler/objectives/ObjectivesWorkspace.tsx), rewrite `saveSection` to use `computeRowOps`:

```tsx
import { computeRowOps, type EditorItem } from './save-section-diff';

const saveSection = useCallback(async (type: ObjectiveType, items: EditorItem[]) => {
  const ops = computeRowOps({ currentRows: rowsRef.current[type], editorItems: items });

  for (const update of ops.updates) {
    const patch: Partial<ObjectiveRow> = {};
    if (update.html !== undefined) {
      // Decide which column we're writing to based on the row's current status.
      // Easy rule: when the section is in Long view, all writes go to textPolished;
      // otherwise to text. View-mode wiring lands in Phase 3 — for now derive from row.status.
      const row = rowsRef.current[type].find((r) => r.id === update.id)!;
      if (row.status === 'polished') patch.textPolished = update.html;
      else patch.text = update.html;
    }
    if (update.sortOrder !== undefined) patch.sortOrder = update.sortOrder;
    await updateObjective(update.id, patch);
  }

  for (const create of ops.creates) {
    await createObjective(type, create.html); // creates always go to `text` (short)
  }

  for (const id of ops.deletes) {
    await deleteObjective(id);
  }
}, [updateObjective, createObjective, deleteObjective]);
```

**Step 6: Smoke-test in dev**

Open a project, navigate to an objectives section. Verify:
- Existing rows render as bullets in TipTap.
- Typing creates new bullets (Enter to add).
- Backspacing on an empty bullet deletes it.
- Bold/italic via keyboard shortcuts works (⌘B, ⌘I).
- Tabbing out of the editor saves changes (network call to PATCH/POST/DELETE rows).
- AI generation from another path (e.g., the existing per-section Generate button still rendered in the header — we leave it alone in this task) still updates the editor when complete.

**Step 7: Commit**

```bash
git add src/components/profiler/objectives/SectionGroup.tsx src/components/profiler/objectives/ObjectivesWorkspace.tsx src/components/profiler/objectives/save-section-diff.ts src/components/profiler/objectives/__tests__/save-section-diff.test.ts
git commit -m "feat(objectives): swap textarea for TipTap editor with ID-based row diff"
```

---

## Phase 3 — Frontend: view toggle and ↻ regenerate

### Task 6: Add `viewMode` per section + segmented control UI

**Files:**
- Modify: `src/components/profiler/objectives/ObjectivesWorkspace.tsx`
- Modify: `src/components/profiler/objectives/SectionGroup.tsx`

The toggle is per-section. State lives in `ObjectivesWorkspace`. Switching modes also patches each row's `status` field (so subsequent reads from anywhere agree on which column is "current"). For simplicity, the patches happen as a single bulk PATCH per toggle.

**Step 1: Add a bulk-status PATCH endpoint**

The simplest path: extend the existing `objectives` GET/POST route, or add a small new route. Add `src/app/api/projects/[projectId]/objectives/view-mode/route.ts`:

```ts
import { NextRequest, NextResponse } from 'next/server';
import { eq, and } from 'drizzle-orm';
import { db } from '@/lib/db';
import { projectObjectives, VALID_OBJECTIVE_TYPES, type ObjectiveType } from '@/lib/db/objectives-schema';
import { getCurrentUser } from '@/lib/auth/get-user';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const auth = await getCurrentUser();
  if (!auth.user) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { projectId } = await params;
  const body = await request.json();
  const { section, viewMode } = body as { section?: unknown; viewMode?: unknown };

  if (typeof section !== 'string' || !VALID_OBJECTIVE_TYPES.includes(section as ObjectiveType)) {
    return NextResponse.json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'invalid section' } }, { status: 400 });
  }
  if (viewMode !== 'short' && viewMode !== 'long') {
    return NextResponse.json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'viewMode must be short or long' } }, { status: 400 });
  }

  const newStatus = viewMode === 'long' ? 'polished' : 'draft';

  await db
    .update(projectObjectives)
    .set({ status: newStatus, updatedAt: new Date() })
    .where(
      and(
        eq(projectObjectives.projectId, projectId),
        eq(projectObjectives.objectiveType, section as ObjectiveType),
        eq(projectObjectives.isDeleted, false),
      )
    );

  return NextResponse.json({ success: true });
}
```

**Step 2: Add the segmented control to the section header**

In `SectionGroup.tsx`, add new props:

```tsx
interface SectionGroupProps {
  // ... existing
  viewMode: 'short' | 'long';
  onViewModeChange: (mode: 'short' | 'long') => void;
  hasLongContent: boolean; // true if any row has textPolished
}
```

Replace the existing copper "Generate" button in the header with the segmented control + ↻ icon button (the ↻ wiring is Task 7):

```tsx
import { RotateCw } from 'lucide-react';

// In the header's right-aligned controls block:
<div className="flex items-center gap-2">
  {/* Segmented view toggle */}
  <div
    className="inline-flex items-center rounded border border-[var(--color-border)]/50 overflow-hidden text-xs font-medium"
    role="group"
    aria-label="View mode"
  >
    <button
      type="button"
      onClick={() => onViewModeChange('short')}
      className={cn(
        'px-2.5 py-1 transition-colors',
        viewMode === 'short'
          ? 'bg-[var(--color-accent-copper)]/20 text-[var(--color-accent-copper)]'
          : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]',
      )}
    >
      Short
    </button>
    <button
      type="button"
      onClick={() => onViewModeChange('long')}
      disabled={!hasLongContent && rows.length > 0}
      title={!hasLongContent && rows.length > 0 ? 'Click ↻ on Long to polish first' : undefined}
      className={cn(
        'px-2.5 py-1 transition-colors',
        viewMode === 'long'
          ? 'bg-[var(--color-accent-copper)]/20 text-[var(--color-accent-copper)]'
          : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] disabled:opacity-40 disabled:cursor-not-allowed',
      )}
    >
      Long
    </button>
  </div>

  {/* Regenerate (placeholder — wired in Task 7) */}
  <button
    type="button"
    onClick={() => onRegenerate(type, viewMode)}
    disabled={isAnyGenerating}
    title={`Regenerate ${viewMode} content`}
    className={cn(
      'p-1 rounded transition-colors',
      isAnyGenerating
        ? 'text-[var(--color-text-muted)]/40 cursor-not-allowed'
        : 'text-[var(--color-accent-copper)] hover:bg-[var(--color-bg-tertiary)]',
    )}
  >
    <RotateCw className={cn('w-4 h-4', isGenerating && 'animate-spin')} />
  </button>

  {/* Existing trash button — unchanged */}
</div>
```

**Step 3: Wire `viewMode` state in `ObjectivesWorkspace`**

```tsx
type ViewMode = 'short' | 'long';

const [viewModes, setViewModes] = useState<Record<ObjectiveType, ViewMode>>({
  planning: 'short', functional: 'short', quality: 'short', compliance: 'short',
});

// Initialise from rows on mount: if a section has any polished rows, start in long view.
useEffect(() => {
  setViewModes((prev) => {
    const next = { ...prev };
    for (const type of SECTION_ORDER) {
      const anyPolished = rows[type].some((r) => r.status === 'polished');
      if (anyPolished) next[type] = 'long';
    }
    return next;
  });
}, [rows]);

const handleViewModeChange = useCallback(async (type: ObjectiveType, mode: ViewMode) => {
  setViewModes((prev) => ({ ...prev, [type]: mode }));
  // Persist by patching all rows in the section.
  await fetch(`/api/projects/${projectId}/objectives/view-mode`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ section: type, viewMode: mode }),
  });
  await fetchRows();
}, [projectId, fetchRows]);
```

The `editorRows` derivation in `SectionGroup` continues to use the existing per-row logic (`status === 'polished' && textPolished ? textPolished : text`). Since the toggle now updates `status` on the server and refetches, the editor content updates correctly.

**Step 4: Smoke-test**

- Toggle a section between Short and Long. The editor content swaps without an AI call.
- Long is greyed when the section has rows but no `textPolished` anywhere.
- Toggling back and forth doesn't lose user edits in either column.

**Step 5: Commit**

```bash
git add src/components/profiler/objectives/SectionGroup.tsx src/components/profiler/objectives/ObjectivesWorkspace.tsx src/app/api/projects/[projectId]/objectives/view-mode/route.ts
git commit -m "feat(objectives): per-section Short/Long view toggle"
```

---

### Task 7: Wire the ↻ regenerate action (no confirmation yet)

**Files:**
- Modify: `src/components/profiler/objectives/ObjectivesWorkspace.tsx` — replace the `handleGenerateSection` callback
- Modify: `src/components/profiler/objectives/SectionGroup.tsx` — accept `onRegenerate(type, viewMode)`

**Behaviour:**
- ↻ on Short → POST `/api/projects/[projectId]/objectives/generate` with `{ section: type }` (existing endpoint, unchanged).
- ↻ on Long → POST `/api/projects/[projectId]/objectives/polish` with `{ section: type }` (new behaviour from Task 2).

**Step 1: Implement `handleRegenerate` in `ObjectivesWorkspace`**

```tsx
const handleRegenerate = useCallback(async (type: ObjectiveType, mode: ViewMode) => {
  if (generatingSection) return;
  setGeneratingSection(type);
  try {
    const url = mode === 'short'
      ? `/api/projects/${projectId}/objectives/generate`
      : `/api/projects/${projectId}/objectives/polish`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ section: type }),
    });
    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}));
      throw new Error(errBody?.error?.message ?? 'Failed to regenerate');
    }
    await fetchRows();
    onUpdate?.();
    toast({
      title: mode === 'short' ? 'Short bullets generated' : 'Long bullets generated',
      description: `${SECTION_LABELS[type]} content is ready`,
      variant: 'success',
    });
  } catch (err) {
    toast({
      title: 'Regeneration failed',
      description: err instanceof Error ? err.message : 'Unknown error',
      variant: 'destructive',
    });
  } finally {
    setGeneratingSection(null);
  }
}, [projectId, generatingSection, fetchRows, onUpdate, toast]);
```

**Step 2: Pass `onRegenerate` to `SectionGroup`** and remove the obsolete `onGenerate` / `isGenerating` plumbing for the old copper button.

**Step 3: Smoke-test**

- ↻ on Short with empty section → short bullets appear (current generate behaviour).
- ↻ on Short with non-empty section → bullets replaced (no confirmation yet — Task 8).
- ↻ on Long with non-empty section → existing bullets gain `textPolished`, view stays in Long, polished content shown.
- ↻ on Long with empty section → polished bullets appear in a single AI call.

**Step 4: Commit**

```bash
git add src/components/profiler/objectives/SectionGroup.tsx src/components/profiler/objectives/ObjectivesWorkspace.tsx
git commit -m "feat(objectives): wire ↻ regenerate to generate (Short) and polish (Long)"
```

---

### Task 8: Confirmation modal for destructive ↻ on Short

**Files:**
- Modify: `src/components/profiler/objectives/ObjectivesWorkspace.tsx`

The existing `Modal` component is already imported and used for the bulk-delete confirmation. Reuse the same pattern.

**Step 1: Read snapshots from the GET response**

Update the `fetchRows` call in `ObjectivesWorkspace` to also store the `snapshots` field returned by the modified GET endpoint (Task 3, Step 5):

```tsx
const [snapshots, setSnapshots] = useState<Record<ObjectiveType, string[] | null>>({
  planning: null, functional: null, quality: null, compliance: null,
});

const fetchRows = useCallback(async () => {
  setIsLoading(true);
  try {
    const res = await fetch(`/api/projects/${projectId}/objectives`);
    const json = await res.json();
    if (json.success) {
      setRows(json.data as GroupedRows);
      if (json.snapshots) setSnapshots(json.snapshots);
    }
  } catch {
    toast({ title: 'Load Failed', description: '...', variant: 'destructive' });
  } finally {
    setIsLoading(false);
  }
}, [projectId, toast]);
```

**Step 2: Wire the detection check into `handleRegenerate`**

```tsx
import { hasManualEdits } from '@/lib/services/objectives-edit-detection';

const [pendingRegenerate, setPendingRegenerate] = useState<{ type: ObjectiveType; mode: ViewMode } | null>(null);

const handleRegenerate = useCallback(async (type: ObjectiveType, mode: ViewMode) => {
  if (generatingSection) return;

  if (mode === 'short' && rows[type].length > 0) {
    const dirty = hasManualEdits({
      rows: rows[type].map((r) => ({ id: r.id, text: r.text })),
      snapshot: snapshots[type],
    });
    if (dirty) {
      setPendingRegenerate({ type, mode });
      return;
    }
  }

  await runRegenerate(type, mode);
}, [generatingSection, rows, snapshots, runRegenerate]);

// `runRegenerate` is the body of the previous handleRegenerate — extracted for reuse from the modal's confirm callback.
```

**Step 3: Add the modal**

```tsx
<Modal
  isOpen={pendingRegenerate !== null}
  onClose={() => setPendingRegenerate(null)}
  title={`Replace ${pendingRegenerate ? SECTION_LABELS[pendingRegenerate.type] : ''} content?`}
>
  <div className="space-y-4">
    <p className="text-[var(--color-text-primary)]">
      This section has manual edits or formatting that will be lost.
      Regenerating will replace all bullets with fresh AI content.
    </p>
    <p className="text-sm text-[var(--color-text-muted)]">
      Tip: switch to Long view and click ↻ instead — that preserves your short bullets.
    </p>
    <div className="flex justify-end gap-2">
      <Button variant="outline" onClick={() => setPendingRegenerate(null)}>Cancel</Button>
      <Button
        variant="destructive"
        onClick={async () => {
          const p = pendingRegenerate!;
          setPendingRegenerate(null);
          await runRegenerate(p.type, p.mode);
        }}
      >
        Replace
      </Button>
    </div>
  </div>
</Modal>
```

**Step 4: Smoke-test**

- ↻ Short on a section that matches its last AI snapshot exactly → no modal.
- Edit a bullet's wording → ↻ Short → modal appears.
- Add bold to a bullet → ↻ Short → modal appears.
- ↻ Long on the same edited section → no modal (Long is non-destructive).

**Step 5: Commit**

```bash
git add src/components/profiler/objectives/ObjectivesWorkspace.tsx
git commit -m "feat(objectives): confirmation modal for ↻ Short when manual edits detected"
```

---

## Phase 4 — Polish: debounced autosave

### Task 9: Debounced autosave (1.5s) on the editor, in addition to blur

**Files:**
- Modify: `src/components/profiler/objectives/SectionGroup.tsx`

**Step 1: Add a debounced save**

Inside `SectionGroup`, alongside `handleEditorBlur`:

```tsx
const debouncedSave = useMemo(() => {
  let timer: ReturnType<typeof setTimeout> | null = null;
  return (items: EditorItem[]) => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(async () => {
      const key = itemsKey(items);
      if (key === lastSavedKeyRef.current) return;
      setIsSaving(true);
      try {
        await onSave(type, items);
        lastSavedKeyRef.current = key;
      } finally {
        setIsSaving(false);
      }
    }, 1500);
  };
}, [onSave, type]);

const handleEditorChange = useCallback((items: EditorItem[]) => {
  latestItemsRef.current = items;
  debouncedSave(items);
}, [debouncedSave]);
```

The blur handler (already in place from Task 5) is a backstop — if the user tabs away before the 1.5s timer fires, blur catches it.

**Step 2: Smoke-test**

- Type into a bullet, wait 1.5s, watch the network tab — PATCH fires.
- Type quickly across multiple bullets, then pause — single PATCH (or per-row patches) after the pause, not per-keystroke.
- Tab away mid-debounce — blur fires the save.
- "Saving…" indicator shows during the network request.

**Step 3: Commit**

```bash
git add src/components/profiler/objectives/SectionGroup.tsx
git commit -m "feat(objectives): debounced autosave at 1.5s on TipTap edits"
```

---

## Phase 5 — Verification

### Task 10: End-to-end smoke run

This is a manual verification pass — it covers the integration points the unit tests don't.

**Setup:**
1. `npm run db:up` (Docker postgres + redis).
2. `npm run dev`.
3. Open a project in the browser. Navigate to `Brief → Objectives`.

**Verification checklist (run through each):**

- [ ] **Short generate from empty.** All 4 sections empty → click ↻ on Short for Functional. Terse bullets appear. ↻ does not show a confirmation modal (section was empty).
- [ ] **Short regenerate (clean).** Without editing, click ↻ on Short again. New bullets appear. No modal (snapshot matches).
- [ ] **Short regenerate (dirty).** Edit a bullet's wording. Click ↻ Short. Modal appears. Cancel preserves the edit. Confirm replaces.
- [ ] **Format detection.** Bold a word in a bullet. Click ↻ Short. Modal appears (HTML markup detected). Cancel preserves the bold.
- [ ] **Long fresh.** On an empty section, toggle to Long view (greyed but allowed when empty? — verify it's greyed only when *rows exist but no polish has been run*). Click ↻ Long. Polished bullets appear in a single call.
- [ ] **Long polish from existing short.** On a section with short bullets, toggle Long → Long is greyed. Click ↻ on Long while still on Short view. After completion, toggle Long → polished bullets visible. Toggle back Short → original short bullets visible.
- [ ] **`//` markers.** In Short view, type ` // make this measurable` after a bullet's text. Toggle to Long, click ↻. Polished bullet incorporates the steering. The `//` text is gone from the polished output. Toggle back to Short — the `//` marker is still there in the short view (preserved).
- [ ] **`//` instruction-only line.** Add a bullet whose entire content is `// add bullet about acoustic`. Click ↻ Long. The polished output drops that bullet entirely (no orphan, no instruction text). The chat dock would be the right place to actually add a new bullet.
- [ ] **Autosave.** Type a new bullet. Wait 1.5s. Network tab shows POST to objectives endpoint. Refresh the page — bullet persists.
- [ ] **Reorder.** Cut a bullet (⌘X) and paste it into a different position. After 1.5s, the row's `sortOrder` updates server-side. Refresh — order persists.
- [ ] **Chat dock still works.** Open chat, ask "add a bullet to functional about wheelchair access." Approval card appears. Approve. Bullet shows up in editor.
- [ ] **Toggle preserves both states.** Generate Short. Edit one bullet to add bold. Click ↻ Long. Toggle to Long → polished bullets, no bold. Toggle back to Short → bullet's bold is preserved.

**Step 1: Run the verification.**

If any item fails, file the bug, fix it, and re-verify. Do not declare the feature complete until every item passes.

**Step 2: Commit any small fixes** as separate `fix:` commits.

---

## Files touched (summary)

**Backend:**
- `src/app/api/projects/[projectId]/objectives/polish/route.ts` (Tasks 1, 2)
- `src/app/api/projects/[projectId]/objectives/polish/prompt-builder.ts` (Task 1, new)
- `src/app/api/projects/[projectId]/objectives/polish/polish-fresh-prompt-builder.ts` (Task 2, new)
- `src/app/api/projects/[projectId]/objectives/route.ts` (Task 3 — add snapshots to GET)
- `src/app/api/projects/[projectId]/objectives/view-mode/route.ts` (Task 6, new)
- `src/lib/services/objectives-edit-detection.ts` (Task 3, new)

**Frontend:**
- `src/components/profiler/objectives/ObjectivesEditor.tsx` (Task 4, new)
- `src/components/profiler/objectives/save-section-diff.ts` (Task 5, new)
- `src/components/profiler/objectives/SectionGroup.tsx` (Tasks 5, 6, 7, 9)
- `src/components/profiler/objectives/ObjectivesWorkspace.tsx` (Tasks 5, 6, 7, 8)

**Tests:**
- `src/app/api/projects/[projectId]/objectives/polish/__tests__/prompt-builder.test.ts`
- `src/app/api/projects/[projectId]/objectives/polish/__tests__/polish-fresh-prompt-builder.test.ts`
- `src/lib/services/__tests__/objectives-edit-detection.test.ts`
- `src/components/profiler/objectives/__tests__/ObjectivesEditor.test.tsx`
- `src/components/profiler/objectives/__tests__/save-section-diff.test.ts`

**Unchanged (deliberately):**
- `src/lib/db/objectives-schema.ts`
- `src/lib/agents/tools/set-project-objectives.ts`
- The chat dock and approval flow.
- The reorder/transmittal/bulk-delete API routes.
- The drag/drop and paste extraction handlers in `ObjectivesWorkspace`.
- `src/lib/editor/inline-instruction-extension.ts`.

---

## Out of scope (explicitly)

Things you may notice while working in this area but should NOT pull into this plan:

- Cross-section bullet drag (move a bullet from Functional to Quality via drag). Cut/paste works; the chat dock can also do it via `set_project_objectives`.
- Streaming UX during ↻ (incremental bullet appearance). The spinner is acceptable for now.
- A standalone per-bullet AI rewrite trigger (hover button, slash command). The `//` marker workflow is the only inline-AI path.
- Multi-user editing / conflict resolution.
- Migrating the prompt for the Short generate path. It already works; only Long needs prompt changes.
- Removing the existing `/api/.../objectives/generate` route. It stays as the canonical Short path.
