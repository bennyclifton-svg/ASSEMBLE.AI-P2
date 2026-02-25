# Pillar 3: Inline AI Instructions (`//` Command) - Comprehensive Design

**Date**: 2026-02-21
**Status**: Design complete, pending approval
**Depends on**: None for MVP (reuses existing context assembly; swaps in Pillar 2 Context Orchestrator later)

---

## Table of Contents

1. [Current State: What Already Exists](#1-current-state-what-already-exists)
2. [Key Design Decisions](#2-key-design-decisions)
3. [UX Flow](#3-ux-flow)
4. [API Endpoint Design](#4-api-endpoint-design)
5. [Content Replacement Strategy (TipTap/ProseMirror)](#5-content-replacement-strategy-tiptapprosemirror)
6. [Instruction Extraction and Validation](#6-instruction-extraction-and-validation)
7. [RichTextEditor Modifications](#7-richtexteditor-modifications)
8. [Integration Points by Module](#8-integration-points-by-module)
9. [System Prompt for Inline Instructions](#9-system-prompt-for-inline-instructions)
10. [Edge Cases and Pitfalls](#10-edge-cases-and-pitfalls)
11. [Security Considerations](#11-security-considerations)
12. [Implementation Approach](#12-implementation-approach)
13. [Files Created/Modified Summary](#13-files-createdmodified-summary)

---

## 1. Current State: What Already Exists

### 1.1 `//` Detection and Violet Highlighting

**File**: `src/lib/editor/inline-instruction-extension.ts` (complete, shipped)

A TipTap extension using ProseMirror's `Plugin` and `DecorationSet` that detects `//` markers in editor text and applies a visual decoration. The decoration is purely visual -- it does not modify the document model.

```typescript
// Existing extension (complete)
import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';

export const InlineInstructionHighlight = Extension.create({
  name: 'inlineInstructionHighlight',

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey('inlineInstructionHighlight'),
        props: {
          decorations(state) {
            const decorations: Decoration[] = [];
            const { doc } = state;

            doc.descendants((node, pos) => {
              if (!node.isText || !node.text) return;

              const text = node.text;
              // Match // that's NOT preceded by : (avoids https://)
              const regex = /(?<!:)\/\/.*/g;
              let match;

              while ((match = regex.exec(text)) !== null) {
                const from = pos + match.index;
                const to = pos + match.index + match[0].length;
                decorations.push(
                  Decoration.inline(from, to, {
                    class: 'inline-instruction',
                  })
                );
              }
            });

            return DecorationSet.create(doc, decorations);
          },
        },
      }),
    ];
  },
});
```

**Key detail**: The regex `(?<!:)\/\/.*` uses a negative lookbehind to exclude URLs like `https://`. The match spans from `//` to the end of the text node (within a single paragraph -- ProseMirror paragraph boundaries are natural delimiters).

### 1.2 CSS Styling

**File**: `src/app/globals.css` (lines 593-602, complete)

```css
.inline-instruction {
  color: var(--color-accent-violet);
  font-style: italic;
  background: var(--color-accent-violet-tint);
  border-radius: 2px;
  padding: 0 2px;
}
```

The violet highlight with italic styling provides immediate visual feedback that the text is an AI instruction, distinct from normal content.

### 1.3 RichTextEditor Component

**File**: `src/components/ui/RichTextEditor.tsx` (complete)

The central editor component already:

- **Loads the `InlineInstructionHighlight` extension** (line 199 of the current source)
- **Has a `toolbarExtra` prop** that renders arbitrary React content at the right end of the toolbar (line 70, used in line 422-427)
- **Supports `onEditorReady` callback** -- not yet implemented, but the prop slot pattern is established

The `toolbarExtra` prop is already used by NoteContent to render the Generate button, establishing the exact pattern we follow for the Execute button.

### 1.4 Existing AI Generation Pattern

The codebase has a mature pattern for AI content generation across Notes, Meetings, and Reports:

| Component | File | AI Actions |
|---|---|---|
| NoteContent | `src/components/notes-meetings-reports/NoteContent.tsx` | Generate via toolbar |
| ReportContentsSection | `src/components/notes-meetings-reports/ReportContentsSection.tsx` | Generate + Polish in section header |
| ReportEditor | `src/components/notes-meetings-reports/ReportEditor.tsx` | Manages generation handlers |
| MeetingAgendaSection | `src/components/notes-meetings-reports/MeetingAgendaSection.tsx` | Generate + Polish in section header |
| MeetingEditor | `src/components/notes-meetings-reports/MeetingEditor.tsx` | Manages generation handlers |

**Common pattern**:
1. Parent component defines `handleGenerate` / `handlePolish` callbacks
2. Callback calls `fetch('/api/ai/generate-content', ...)` or `/api/ai/polish-content`
3. API authenticates with `getCurrentUser()`, validates with Zod, calls Claude
4. Response content replaces or enhances the editor content
5. DiamondIcon with copper accent + `animate-diamond-spin` for loading state

The `//` Execute feature follows this same pattern exactly, with one critical difference: instead of replacing the entire section content, it performs a **surgical replacement of only the `//` paragraph**.

### 1.5 Files Explored in Depth

| File | What it provides |
|---|---|
| `src/lib/editor/inline-instruction-extension.ts` | Existing `//` decoration plugin |
| `src/components/ui/RichTextEditor.tsx` | Central editor component with `toolbarExtra` |
| `src/lib/services/ai-content-generation.ts` | Existing AI generation service (context assembly, Claude call, cleanup) |
| `src/lib/services/note-content-generation.ts` | Note-specific AI generation with RAG |
| `src/components/notes-meetings-reports/NoteContent.tsx` | Note editing with Generate button pattern |
| `src/components/notes-meetings-reports/ReportContentsSection.tsx` | Report section editor with Generate/Polish |
| `src/components/notes-meetings-reports/ReportEditor.tsx` | Report editor managing AI handlers |
| `src/components/notes-meetings-reports/MeetingAgendaSection.tsx` | Meeting section editor with Generate/Polish |
| `src/components/notes-meetings-reports/MeetingEditor.tsx` | Meeting editor managing AI handlers |
| `src/app/api/ai/generate-content/route.ts` | API route pattern (auth + Zod + service call) |
| `src/app/api/ai/polish-content/route.ts` | API route pattern |
| `src/app/api/ai/generate-note-content/route.ts` | Note-specific API with RAG |
| `src/lib/auth/get-user.ts` | `getCurrentUser()` auth pattern |
| `src/lib/prompts/system-prompts.ts` | `BASE_SYSTEM_PROMPT` + feature-specific layers |
| `src/lib/rag/retrieval.ts` | RAG retrieval pipeline |
| `src/lib/validations/notes-meetings-reports-schema.ts` | Zod validation patterns |
| `src/components/reports/VisualEditor.tsx` | Separate TipTap editor (NOT targeted for MVP) |

---

## 2. Key Design Decisions

### 2.1 Surgical Line-Level Replacement

Only the `//` paragraph is replaced by the AI output. All surrounding content in the editor remains untouched. This is fundamentally different from the existing Generate button (which replaces entire section content) and Polish button (which rewrites entire section content).

**Rationale**: Users type `//` instructions inline, surrounded by their own content. Replacing everything would destroy their work. The `//` command is a precision tool, not a bulk generator.

### 2.2 ProseMirror Transactions (Not `setContent()`)

Content replacement uses ProseMirror transactions (`tr.replaceWith()` or `tr.replaceRange()`) instead of TipTap's `editor.commands.setContent()`.

**Why this matters**:
- `setContent()` destroys the entire undo history -- the user cannot Ctrl+Z to recover their instruction
- ProseMirror transactions preserve the undo stack -- the user can Ctrl+Z to restore the original `//` instruction after seeing the AI output
- Transactions also correctly handle cursor position, selection state, and collaborative editing (if added later)

### 2.3 `onEditorReady` Callback

Add an `onEditorReady` callback prop to `RichTextEditor` that exposes the TipTap `Editor` instance to parent components. This gives parent components (NoteContent, ReportContentsSection, MeetingAgendaSection) access to the editor for programmatic operations like scanning for `//` instructions and dispatching replacement transactions.

**Why not use `ref`?**: The editor instance is created asynchronously by `useEditor()`. A callback is more reliable than a ref for capturing the instance once it's ready.

### 2.4 One Instruction at a Time

When the user clicks Execute, the system finds and processes the **first** `//` instruction in the editor. If there are multiple `//` paragraphs, the user clicks Execute again for each subsequent one.

**Rationale**: Processing all instructions simultaneously would create unpredictable results (instructions might reference each other, earlier replacements shift document positions for later ones, and the user loses control over execution order). One-at-a-time gives the user explicit control.

### 2.5 Single-Paragraph Instructions Only

An instruction starts at `//` and ends at the paragraph boundary. Pressing Enter in the editor creates a new paragraph, which ends the instruction. Multi-line instructions are not supported.

**Rationale**: The ProseMirror decoration already works within paragraph text nodes. Multi-paragraph instructions would require a different document model (e.g., a custom node type), adding complexity without proportional value. Users can write long single-line instructions -- TipTap wraps text visually.

### 2.6 Re-Scan After API Response

After the API call returns, the system does not use the original document positions (from before the call). Instead, it **re-scans the editor document** to find the `//` instruction by matching the instruction text. This handles the case where the user typed additional content during the API call, shifting positions.

### 2.7 MVP Scope Exclusions

- **VisualEditor** (`src/components/reports/VisualEditor.tsx`): A separate TipTap editor used for visual report layouts. Not targeted for MVP.
- **AddendumContent**: Addendum editors in procurement. Not targeted for MVP.
- **Pillar 2 dependency**: MVP reuses existing context assembly (starred notes, procurement docs, project context). The Context Orchestrator from Pillar 2 is swapped in later for richer context.

### 2.8 Execute Button Placement

| Context | Placement | Rationale |
|---|---|---|
| Notes | In toolbar via `toolbarExtra` prop | Notes have a single editor with a toolbar; matches existing Generate button |
| Reports | In section header, alongside Generate/Polish | Report sections have per-section action buttons in the header row |
| Meetings | In section header, alongside Generate/Polish | Same pattern as Reports |

The Execute button only appears when a `//` instruction is detected in the editor. It is hidden when there are no instructions.

---

## 3. UX Flow

### 3.1 Step-by-Step User Journey

**Step 1: User types an instruction**

The user types in any editor (note, report section, meeting section):

```
The structural tender responses have been received.
// summarize the tender responses for structural engineering
We recommend proceeding with the evaluation this week.
```

**Step 2: Immediate violet highlighting**

As the user types, the existing `InlineInstructionHighlight` extension decorates the `//` line in violet italic with a tinted background. No button click required -- this is real-time via ProseMirror's decoration system.

```
The structural tender responses have been received.
[VIOLET] // summarize the tender responses for structural engineering
We recommend proceeding with the evaluation this week.
```

**Step 3: Execute button appears**

The Execute button renders in the toolbar (Notes) or section header (Reports/Meetings) with the DiamondIcon in copper accent. The button is conditionally visible -- it only shows when the editor contains at least one `//` instruction.

```
┌──────────────────────────────────────────────────┐
│ B  I  U  H1  H2  H3  |  •  1.  |  ...  ◇ Execute │
└──────────────────────────────────────────────────┘
```

**Step 4: User clicks Execute**

The DiamondIcon begins spinning (`animate-diamond-spin`). The button text changes to "Executing..." with the aurora text animation. The button is disabled to prevent concurrent execution.

**Step 5: API call**

`POST /api/ai/execute-instruction` is called with:
- The instruction text (everything after `//`, trimmed)
- Editor context (surrounding content)
- Document context (projectId, contextType, contextId, sectionId)

**Step 6: Response replaces the instruction**

The AI response (HTML content) replaces **only the `//` paragraph** via a ProseMirror transaction. The surrounding paragraphs remain exactly as written.

Before:
```
The structural tender responses have been received.
// summarize the tender responses for structural engineering
We recommend proceeding with the evaluation this week.
```

After:
```
The structural tender responses have been received.
Three firms submitted structural engineering tenders: ABC Structural ($185,000),
XYZ Engineers ($210,000), and Smith Consulting ($195,000). All submissions met
the mandatory requirements. ABC Structural's fee is 12% below the budget
allowance of $210,000.
We recommend proceeding with the evaluation this week.
```

**Step 7: Undo available**

The user can press Ctrl+Z to undo the replacement and restore the original `// summarize the tender responses for structural engineering` text.

### 3.2 Visual State Machine

```
   [No // in editor]     -->  Execute button HIDDEN
         |
   [User types //...]    -->  Execute button VISIBLE (copper accent, idle)
         |
   [User clicks Execute] -->  Execute button DISABLED (diamond spinning, "Executing...")
         |
   [API returns]          -->  // paragraph replaced, Execute button re-evaluates:
         |                      - More // instructions? VISIBLE (idle)
         |                      - No more instructions? HIDDEN
         |
   [API error]            -->  Toast error, instruction unchanged, button returns to VISIBLE (idle)
```

### 3.3 Instruction Discoverability

Users will not discover `//` syntax on their own. Add a subtle placeholder hint:

**Implementation**: When the editor is empty or the cursor is on a new empty paragraph, show a faded placeholder hint:
```
Type // to give AI an instruction  •  e.g. // summarize the tender responses
```

This uses TipTap's existing `placeholder` extension (already available in `RichTextEditor.tsx`). The hint disappears as soon as the user starts typing. Only shown when `enableInlineInstructions` prop is true.

**Styling**: Use `var(--color-text-tertiary)` at 60% opacity, matching existing placeholder patterns.

---

## 4. API Endpoint Design

### 4.1 Endpoint: `POST /api/ai/execute-instruction`

**File to create**: `src/app/api/ai/execute-instruction/route.ts`

#### Request Body

```typescript
interface ExecuteInstructionRequest {
  projectId: string;
  instruction: string;         // Text after "//" (trimmed)
  contextType: 'note' | 'meeting' | 'report';
  contextId: string;           // noteId, meetingId, or reportId
  sectionId?: string;          // For report/meeting sections (optional for notes)
  existingContent?: string;    // Surrounding content in the editor for context
}
```

#### Response Body

```typescript
interface ExecuteInstructionResponse {
  content: string;             // HTML content to insert (replacing the // paragraph)
  sourcesUsed: {
    ragChunks: number;
    knowledgeDomains: string[];  // Future: populated when Pillar 1 is active
  };
}
```

#### Zod Validation Schema

```typescript
// In src/lib/validations/notes-meetings-reports-schema.ts

export const executeInstructionSchema = z.object({
  projectId: z.string().min(1, 'Project ID is required'),
  instruction: z.string()
    .min(1, 'Instruction text is required')
    .max(500, 'Instruction must be 500 characters or fewer'),
  contextType: z.enum(['note', 'meeting', 'report']),
  contextId: z.string().min(1, 'Context ID is required'),
  sectionId: z.string().optional(),
  existingContent: z.string().max(10000).optional(),
});
```

#### Route Implementation

```typescript
// src/app/api/ai/execute-instruction/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/get-user';
import { executeInstructionSchema } from '@/lib/validations/notes-meetings-reports-schema';
import { executeInlineInstruction } from '@/lib/services/inline-instruction-service';

export async function POST(req: NextRequest) {
  try {
    // 1. Authenticate
    const authResult = await getCurrentUser();
    if (!authResult.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Parse and validate
    const body = await req.json();
    const validationResult = executeInstructionSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: validationResult.error.issues },
        { status: 400 }
      );
    }

    const request = validationResult.data;

    // 3. Execute instruction
    const result = await executeInlineInstruction({
      projectId: request.projectId,
      instruction: request.instruction,
      contextType: request.contextType,
      contextId: request.contextId,
      sectionId: request.sectionId,
      existingContent: request.existingContent,
    });

    return NextResponse.json(result);

  } catch (error) {
    console.error('[ai/execute-instruction] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
```

### 4.2 Service Layer

**File to create**: `src/lib/services/inline-instruction-service.ts`

The service layer follows the same structure as `ai-content-generation.ts`:

```typescript
// src/lib/services/inline-instruction-service.ts

import Anthropic from '@anthropic-ai/sdk';
import {
  fetchStarredNotes,
  fetchProcurementDocs,
} from '@/lib/services/ai-content-generation';
import {
  BASE_SYSTEM_PROMPT,
  INLINE_INSTRUCTION_SYSTEM_LAYER,
} from '@/lib/prompts/system-prompts';
import { retrieveChunks } from '@/lib/rag/retrieval';

interface ExecuteInstructionParams {
  projectId: string;
  instruction: string;
  contextType: 'note' | 'meeting' | 'report';
  contextId: string;
  sectionId?: string;
  existingContent?: string;
}

interface ExecuteInstructionResult {
  content: string;
  sourcesUsed: {
    ragChunks: number;
    knowledgeDomains: string[];
  };
}

export async function executeInlineInstruction(
  params: ExecuteInstructionParams
): Promise<ExecuteInstructionResult> {
  const {
    projectId,
    instruction,
    contextType,
    contextId,
    sectionId,
    existingContent,
  } = params;

  // 1. Assemble context (MVP: reuse existing context assembly)
  const [starredNotes, procurementDocs, ragChunks] = await Promise.all([
    fetchStarredNotes(projectId),
    fetchProcurementDocs(projectId),
    retrieveChunks({
      projectId,
      query: instruction,
      limit: 5,
    }),
  ]);

  // 2. Build context string
  const contextParts: string[] = [];

  if (existingContent?.trim()) {
    contextParts.push(
      `## Surrounding Editor Content\n${existingContent}`
    );
  }

  if (starredNotes.length > 0) {
    const notesText = starredNotes
      .slice(0, 5)  // Limit to 5 most recent starred notes
      .map(n => `- **${n.title}**: ${(n.content || '').slice(0, 300)}`)
      .join('\n');
    contextParts.push(`## Starred Notes\n${notesText}`);
  }

  if (procurementDocs.length > 0) {
    const docsText = procurementDocs
      .slice(0, 5)
      .map(d => `- ${d.type.toUpperCase()} for ${d.stakeholderName || 'Unknown'} (${d.date || 'no date'})`)
      .join('\n');
    contextParts.push(`## Procurement Documents\n${docsText}`);
  }

  if (ragChunks.length > 0) {
    const ragText = ragChunks
      .map(c => `- [${c.documentName}]: ${c.content.slice(0, 400)}`)
      .join('\n');
    contextParts.push(`## Relevant Document Excerpts\n${ragText}`);
  }

  const contextString = contextParts.join('\n\n---\n\n');

  // 3. Build system prompt
  const systemPrompt = `${BASE_SYSTEM_PROMPT}\n${INLINE_INSTRUCTION_SYSTEM_LAYER}`;

  // 4. Build user message
  const userMessage = `## Inline Instruction
${instruction}

## Context Type
${contextType}${sectionId ? ` (section: ${sectionId})` : ''}

## Available Context
${contextString || 'No additional context available. Execute the instruction based on professional best practices.'}

Execute the instruction above. Return ONLY the replacement content as HTML. Do not include the original "//" instruction in your output.`;

  // 5. Call Claude
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

  // 6. Clean up formatting
  const cleanedContent = textContent.text
    .split('\n')
    .map(line => line.trim())
    .filter(line => !(line === '' && false))
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  return {
    content: cleanedContent,
    sourcesUsed: {
      ragChunks: ragChunks.length,
      knowledgeDomains: [],  // Populated when Pillar 1 is active
    },
  };
}
```

### 4.3 Future: Context Orchestrator Integration

When Pillar 2 (Context Orchestrator) is implemented, the context assembly in step 1 is replaced with a single call:

```typescript
// Future replacement for the MVP context assembly
const context = await assembleContext({
  projectId,
  task: instruction,
  contextType: 'inline-instruction',
  sectionKey: sectionId,
  includeKnowledgeDomains: true,
  domainTags: inferDomainTags(instruction),
});
```

This is a drop-in replacement -- the API contract and user experience remain identical.

---

## 5. Content Replacement Strategy (TipTap/ProseMirror)

This is the most technically critical section. The replacement must be done via ProseMirror transactions to preserve the undo stack and handle edge cases correctly.

### 5.1 Instruction Scanning

Scan the editor document for `//` instruction paragraphs. This function finds the **first** instruction and returns its position, text, and the paragraph node containing it.

```typescript
// src/lib/editor/instruction-utils.ts

import type { Node as ProseMirrorNode } from '@tiptap/pm/model';
import type { EditorState } from '@tiptap/pm/state';

export interface InstructionMatch {
  /** The instruction text after "//" (trimmed) */
  instruction: string;
  /** The full text of the paragraph containing the instruction */
  fullText: string;
  /** Start position of the paragraph node in the document */
  paragraphFrom: number;
  /** End position of the paragraph node in the document */
  paragraphTo: number;
  /** Start position of the "//" marker within the paragraph's text content */
  markerOffset: number;
}

/**
 * Find the first // instruction in the editor document.
 * Returns null if no instruction is found.
 */
export function findFirstInstruction(
  state: EditorState
): InstructionMatch | null {
  const { doc } = state;
  let result: InstructionMatch | null = null;

  doc.descendants((node, pos) => {
    // Stop if we already found one
    if (result) return false;

    // Only check paragraph-level nodes
    if (node.type.name !== 'paragraph') return;

    const text = node.textContent;
    const regex = /(?<!:)\/\/(.*)/;
    const match = regex.exec(text);

    if (match) {
      const instruction = match[1].trim();
      result = {
        instruction,
        fullText: text,
        paragraphFrom: pos,
        paragraphTo: pos + node.nodeSize,
        markerOffset: match.index,
      };
      return false; // Stop traversal
    }
  });

  return result;
}

/**
 * Check if the editor document contains any // instructions.
 * Lightweight check for showing/hiding the Execute button.
 */
export function hasInstructions(state: EditorState): boolean {
  const { doc } = state;
  let found = false;

  doc.descendants((node) => {
    if (found) return false;
    if (!node.isText || !node.text) return;

    if (/(?<!:)\/\//.test(node.text)) {
      found = true;
      return false;
    }
  });

  return found;
}

/**
 * Re-find an instruction by matching its text content.
 * Used after API call to relocate the instruction in case
 * the document changed during the request.
 */
export function refindInstruction(
  state: EditorState,
  instructionText: string
): InstructionMatch | null {
  const { doc } = state;
  let result: InstructionMatch | null = null;

  doc.descendants((node, pos) => {
    if (result) return false;
    if (node.type.name !== 'paragraph') return;

    const text = node.textContent;
    if (text.includes(`//${instructionText}`) || text.includes(`// ${instructionText}`)) {
      const regex = /(?<!:)\/\/(.*)/;
      const match = regex.exec(text);
      if (match && match[1].trim() === instructionText) {
        result = {
          instruction: instructionText,
          fullText: text,
          paragraphFrom: pos,
          paragraphTo: pos + node.nodeSize,
          markerOffset: match.index,
        };
        return false;
      }
    }
  });

  return result;
}
```

### 5.2 Transaction-Based Replacement

After the API returns HTML content, we replace the `//` paragraph using a ProseMirror transaction.

```typescript
// Also in src/lib/editor/instruction-utils.ts

import type { Editor } from '@tiptap/core';
import { DOMParser as ProseMirrorDOMParser } from '@tiptap/pm/model';

/**
 * Replace the // instruction paragraph with AI-generated HTML content.
 * Uses a ProseMirror transaction to preserve undo history.
 *
 * @param editor - The TipTap editor instance
 * @param match - The instruction match to replace
 * @param htmlContent - The AI-generated HTML to insert
 * @returns true if replacement succeeded, false otherwise
 */
export function replaceInstructionWithContent(
  editor: Editor,
  match: InstructionMatch,
  htmlContent: string
): boolean {
  const { state, view } = editor;
  const { schema } = state;

  // 1. Parse the HTML content into ProseMirror nodes
  const domParser = ProseMirrorDOMParser.fromSchema(schema);
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = htmlContent;
  const parsedSlice = domParser.parseSlice(tempDiv);

  if (!parsedSlice.content.childCount) {
    console.warn('[instruction-utils] Parsed HTML produced no content');
    return false;
  }

  // 2. Determine replacement range
  //    If the // is the entire paragraph content, replace the whole paragraph node.
  //    If the // is part of a paragraph (text before it), replace only from the //
  //    marker to the end of the paragraph.
  let from: number;
  let to: number;

  if (match.markerOffset === 0) {
    // The // is at the start of the paragraph -- replace entire paragraph
    from = match.paragraphFrom;
    to = match.paragraphTo;
  } else {
    // There's text before the // -- replace from the // marker to end of paragraph
    // +1 accounts for the paragraph node's opening token
    from = match.paragraphFrom + 1 + match.markerOffset;
    to = match.paragraphTo - 1; // -1 for closing token
  }

  // 3. Create and dispatch the transaction
  const tr = state.tr;

  if (match.markerOffset === 0) {
    // Replace entire paragraph node with parsed content
    tr.replaceWith(from, to, parsedSlice.content);
  } else {
    // Replace just the // portion within the paragraph
    // First delete the // text, then insert the new content after
    tr.delete(from, to);
    tr.insert(from, parsedSlice.content);
  }

  // 4. Set cursor to end of inserted content
  const mappedPos = tr.mapping.map(to);
  tr.setSelection(
    state.selection.constructor.near(tr.doc.resolve(mappedPos))
  );

  // 5. Dispatch the transaction (preserves undo stack)
  view.dispatch(tr);

  return true;
}
```

### 5.3 Why This Approach Preserves Undo

ProseMirror maintains a history of transactions. Each transaction is a discrete change that can be reversed:

1. User types content -> transactions recorded in history
2. User types `// summarize the tender responses` -> transaction recorded
3. User clicks Execute -> replacement transaction dispatched
4. **Ctrl+Z**: ProseMirror reverses the replacement transaction, restoring the `//` instruction

If we used `editor.commands.setContent()` instead, ProseMirror would:
1. Clear the entire document
2. Insert the new content as a fresh document
3. The history is destroyed -- Ctrl+Z has nothing to undo back to

### 5.4 Complete Execution Flow

```
User clicks Execute
  |
  v
findFirstInstruction(editor.state)
  |
  v
Extract instruction text: "summarize the tender responses for structural"
  |
  v
Build request body with instruction + surrounding content + contextId
  |
  v
POST /api/ai/execute-instruction
  |
  v
[Wait for response]
  |
  v
refindInstruction(editor.state, instructionText)  <-- Re-scan for position shifts
  |
  v
replaceInstructionWithContent(editor, match, response.content)
  |
  v
Editor updated via ProseMirror transaction
  |
  v
hasInstructions(editor.state) ? show Execute : hide Execute
```

---

## 6. Instruction Extraction and Validation

### 6.1 Extraction Rules

| Input | Extracted Instruction | Valid? |
|---|---|---|
| `// summarize the tender` | `summarize the tender` | Yes |
| `//summarize the tender` | `summarize the tender` | Yes (no space required after //) |
| `// ` | `` (empty after trim) | No -- show toast |
| `//` | `` (empty after trim) | No -- show toast |
| `https://example.com` | Not matched (lookbehind) | N/A |
| `Code: // this is a comment` | `this is a comment` | Yes (but unlikely in practice) |

### 6.2 Validation Before API Call

```typescript
function validateInstruction(instruction: string): {
  valid: boolean;
  error?: string;
} {
  const trimmed = instruction.trim();

  if (!trimmed) {
    return {
      valid: false,
      error: 'Please add an instruction after //. Example: // summarize the tender responses',
    };
  }

  if (trimmed.length > 500) {
    return {
      valid: false,
      error: `Instruction is too long (${trimmed.length}/500 characters). Please shorten your instruction.`,
    };
  }

  return { valid: true };
}
```

### 6.3 Surrounding Content Extraction

The surrounding content sent to the API provides context for the AI to understand what the user is writing about. We extract up to 2000 characters of content before and after the `//` instruction:

```typescript
/**
 * Extract surrounding content from the editor for context.
 * Returns the editor's full HTML content with the // instruction removed,
 * capped at a reasonable size.
 */
export function extractSurroundingContent(
  editor: Editor,
  match: InstructionMatch
): string {
  const html = editor.getHTML();

  // Simple approach: return the full editor content.
  // The instruction itself is included but the API prompt tells the AI
  // to focus on executing the instruction, not echoing it back.
  // Cap at 10,000 characters to stay within token budgets.
  return html.slice(0, 10000);
}
```

### 6.4 Output Style Directives

Users can append optional format directives to instructions:

| Directive | Example | Effect |
|-----------|---------|--------|
| `as table` | `// compare tender prices as table` | Appends "Format your response as a markdown table" to prompt |
| `as bullets` / `as list` | `// list key risks as bullets` | Appends "Format your response as a bullet-point list" |
| `formally` | `// summarize scope formally` | Appends "Use formal, professional language suitable for client reports" |
| `briefly` | `// explain the variation briefly` | Appends "Keep your response concise — maximum 2-3 sentences" |

**Implementation**: In `instruction-utils.ts`, add a `parseDirectives()` function that checks the last 2-3 words of the instruction against known directives. If found, strip them from the instruction and return them separately:

```typescript
export function parseDirectives(instruction: string): {
  cleanInstruction: string;
  directives: string[];
}
```

The API endpoint appends matching directive prompts to the system message. This is a prompt-level enhancement only — no architectural changes needed.

---

## 7. RichTextEditor Modifications

### 7.1 New Props

Add two new props to `RichTextEditor`:

```typescript
export interface RichTextEditorProps {
  // ... existing props ...

  /** Callback fired when the TipTap editor instance is ready.
   *  Provides direct access to the Editor for programmatic operations
   *  like scanning for // instructions and dispatching replacement transactions. */
  onEditorReady?: (editor: Editor) => void;

  /** Whether to show the inline instruction Execute button in the toolbar.
   *  When true, the component scans for // instructions and shows/hides
   *  the button automatically. Defaults to false. */
  enableInlineInstructions?: boolean;

  /** Callback fired when the user clicks the Execute button.
   *  Receives the extracted instruction text. The parent component is
   *  responsible for the API call and calling replaceInstructionWithContent. */
  onExecuteInstruction?: (instruction: string) => void;

  /** Whether an instruction is currently being executed (loading state). */
  isExecutingInstruction?: boolean;
}
```

### 7.2 Implementation Changes

```typescript
// Inside the RichTextEditor component

export function RichTextEditor({
  // ... existing props ...
  onEditorReady,
  enableInlineInstructions = false,
  onExecuteInstruction,
  isExecutingInstruction = false,
}: RichTextEditorProps) {

  // Track whether the editor has // instructions
  const [hasInlineInstruction, setHasInlineInstruction] = useState(false);

  const editor = useEditor({
    // ... existing config ...
    onCreate: ({ editor }) => {
      onEditorReady?.(editor);
    },
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      onChange(html);

      // Check for // instructions if feature is enabled
      if (enableInlineInstructions) {
        setHasInlineInstruction(hasInstructions(editor.state));
      }
    },
  });

  // Also fire onEditorReady when editor is created via useEditor
  useEffect(() => {
    if (editor) {
      onEditorReady?.(editor);

      // Initial check for instructions
      if (enableInlineInstructions) {
        setHasInlineInstruction(hasInstructions(editor.state));
      }
    }
  }, [editor, onEditorReady, enableInlineInstructions]);

  // Build the Execute button (shown alongside toolbarExtra)
  const executeButton = enableInlineInstructions && hasInlineInstruction && onExecuteInstruction ? (
    <button
      onClick={() => {
        if (!editor) return;
        const match = findFirstInstruction(editor.state);
        if (match) {
          const validation = validateInstruction(match.instruction);
          if (validation.valid) {
            onExecuteInstruction(match.instruction);
          } else {
            // Toast notification for validation errors
            toast.error(validation.error);
          }
        }
      }}
      disabled={isExecutingInstruction}
      className={cn(
        'flex items-center gap-1.5 text-sm font-medium transition-all',
        isExecutingInstruction
          ? 'text-[var(--color-accent-copper)] cursor-wait'
          : 'text-[var(--color-accent-copper)] hover:opacity-80'
      )}
      title="Execute // instruction"
    >
      <DiamondIcon
        className={cn('w-4 h-4', isExecutingInstruction && 'animate-diamond-spin')}
        variant="empty"
      />
      <span className={isExecutingInstruction ? 'animate-text-aurora' : ''}>
        {isExecutingInstruction ? 'Executing...' : 'Execute'}
      </span>
    </button>
  ) : null;

  // In the toolbar rendering:
  // {/* Extra toolbar content (e.g. Generate button, Execute button) */}
  // {(toolbarExtra || executeButton) && (
  //   <div className="ml-auto flex items-center gap-2">
  //     {executeButton}
  //     {toolbarExtra}
  //   </div>
  // )}
```

### 7.3 Alternative: Execute Button in Parent Components

For Reports and Meetings, the Execute button goes in the **section header** (not the toolbar), because that's where Generate/Polish buttons already live. In this case, the parent component manages the button directly:

```typescript
// In ReportContentsSection.tsx / MeetingAgendaSection.tsx

{onExecuteInstruction && hasInstruction && (
  <button
    onClick={() => onExecuteInstruction(section.id)}
    disabled={isExecuting || isGenerating || isPolishing}
    className={cn(
      'flex items-center gap-1.5 text-sm font-medium transition-all',
      isExecuting
        ? 'text-[var(--color-accent-copper)] cursor-wait'
        : 'text-[var(--color-accent-copper)] hover:opacity-80'
    )}
    title="Execute // instruction"
  >
    <DiamondIcon
      className={cn('w-4 h-4', isExecuting && 'animate-diamond-spin')}
      variant="empty"
    />
    <span className={isExecuting ? 'animate-text-aurora' : ''}>
      {isExecuting ? 'Executing...' : 'Execute'}
    </span>
  </button>
)}
```

---

## 8. Integration Points by Module

### 8.1 Notes: NoteContent.tsx

**Current state**: NoteContent already has `handleGenerateContent` callback and a Generate button in the toolbar via `toolbarExtra`.

**Changes**:

1. Add `handleExecuteInstruction` callback following the same pattern as `handleGenerate`
2. Store a ref to the TipTap editor via `onEditorReady`
3. Pass `enableInlineInstructions={true}` and `onExecuteInstruction` to `NoteEditor` -> `RichTextEditor`

```typescript
// In NoteContent.tsx

const editorRef = useRef<Editor | null>(null);
const [isExecuting, setIsExecuting] = useState(false);

const handleExecuteInstruction = useCallback(async (instruction: string) => {
  if (!editorRef.current) return;

  try {
    setIsExecuting(true);

    const response = await fetch('/api/ai/execute-instruction', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        projectId: note.projectId,
        instruction,
        contextType: 'note',
        contextId: note.id,
        existingContent: extractSurroundingContent(
          editorRef.current,
          findFirstInstruction(editorRef.current.state)!
        ),
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to execute instruction');
    }

    const result = await response.json();

    // Re-find the instruction (may have moved if user typed during request)
    const match = refindInstruction(editorRef.current.state, instruction);
    if (!match) {
      toast.error('Could not find the instruction. It may have been modified.');
      return;
    }

    // Replace via ProseMirror transaction
    const success = replaceInstructionWithContent(
      editorRef.current,
      match,
      result.content
    );

    if (!success) {
      toast.error('Failed to insert AI content');
    }

    console.log(
      `[NoteContent] Executed instruction using ${result.sourcesUsed.ragChunks} RAG chunks`
    );
  } catch (error) {
    console.error('[NoteContent] Failed to execute instruction:', error);
    toast.error('Failed to execute instruction');
  } finally {
    setIsExecuting(false);
  }
}, [note.id, note.projectId]);
```

**Toolbar**: The Execute button appears in the toolbar alongside the existing Generate button. Both use the `toolbarExtra` area with `DiamondIcon` + copper accent.

### 8.2 Reports: ReportContentsSection.tsx + ReportEditor.tsx

**Current state**: ReportContentsSection renders per-section editors with Generate/Polish buttons in the section header. ReportEditor manages the `handleGenerate` and `handlePolish` callbacks and passes them down.

**Changes to ReportEditor.tsx**:

1. Add `handleExecuteInstruction(sectionId: string)` callback
2. Maintain a map of `editorRefs: Map<string, Editor>` (one per section)
3. Pass `onExecuteInstruction` and `onEditorReady` down to `ReportContentsSection`

```typescript
// In ReportEditor.tsx

const editorRefs = useRef<Map<string, Editor>>(new Map());
const [executingSectionId, setExecutingSectionId] = useState<string | null>(null);

const handleEditorReady = useCallback((sectionId: string, editor: Editor) => {
  editorRefs.current.set(sectionId, editor);
}, []);

const handleExecuteInstruction = useCallback(async (sectionId: string) => {
  const editor = editorRefs.current.get(sectionId);
  if (!editor) return;

  const match = findFirstInstruction(editor.state);
  if (!match) return;

  const validation = validateInstruction(match.instruction);
  if (!validation.valid) {
    toast.error(validation.error);
    return;
  }

  try {
    setExecutingSectionId(sectionId);

    const section = sections.find(s => s.id === sectionId);

    const response = await fetch('/api/ai/execute-instruction', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        projectId,
        instruction: match.instruction,
        contextType: 'report',
        contextId: reportId,
        sectionId,
        existingContent: extractSurroundingContent(editor, match),
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to execute instruction');
    }

    const result = await response.json();

    // Re-find and replace
    const updatedMatch = refindInstruction(editor.state, match.instruction);
    if (updatedMatch) {
      replaceInstructionWithContent(editor, updatedMatch, result.content);
    }
  } catch (error) {
    console.error('[ReportEditor] Failed to execute instruction:', error);
    toast.error('Failed to execute instruction');
  } finally {
    setExecutingSectionId(null);
  }
}, [projectId, reportId, sections]);
```

**Changes to ReportContentsSection.tsx**:

1. Add `onExecuteInstruction` prop (same signature as `onGenerate`)
2. Add `onEditorReady` prop to capture the editor ref
3. Add Execute button alongside Generate/Polish in the section header
4. Track `hasInstruction` state per section

```typescript
// New props for ReportContentsSection
interface ReportContentsSectionProps {
  // ... existing props ...
  onExecuteInstruction?: (sectionId: string) => void;
  onEditorReady?: (sectionId: string, editor: Editor) => void;
  isExecuting?: boolean;
}
```

### 8.3 Meetings: MeetingAgendaSection.tsx + MeetingEditor.tsx

The pattern is **identical** to Reports. MeetingAgendaSection has the same structure as ReportContentsSection (section header with Generate/Polish buttons, per-section editors). MeetingEditor manages handlers the same way ReportEditor does.

**Changes to MeetingEditor.tsx**: Add `handleExecuteInstruction`, `editorRefs`, `handleEditorReady` -- same pattern as ReportEditor.

**Changes to MeetingAgendaSection.tsx**: Add `onExecuteInstruction`, `onEditorReady`, `isExecuting` props. Add Execute button in section header.

### 8.4 NOT in MVP

| Editor | File | Reason |
|---|---|---|
| VisualEditor | `src/components/reports/VisualEditor.tsx` | Separate TipTap instance with different extension stack; complex block-based editor |
| AddendumContent | Procurement module | Different editing context; low usage frequency |

---

## 9. System Prompt for Inline Instructions

### 9.1 Prompt Layer

Add `INLINE_INSTRUCTION_SYSTEM_LAYER` to `src/lib/prompts/system-prompts.ts`:

```typescript
/**
 * Inline instruction system prompt -- appended to BASE_SYSTEM_PROMPT
 */
export const INLINE_INSTRUCTION_SYSTEM_LAYER = `

DOCUMENT CONTEXT: Inline Instruction Execution
You are executing a specific instruction that a user typed inline in their document using the // command. The user types "// [instruction]" as a directive for you to generate content that replaces the instruction line.

EXECUTION RULES:
- Execute the instruction literally and precisely
- Generate ONLY the replacement content -- no meta-commentary, no "Here is..." prefix
- The content you generate will surgically replace the // line in the document
- Match the tone and style of the surrounding content (if provided)
- If the instruction asks to "summarize", "list", "describe", "draft", etc., do exactly that
- If the instruction references specific project data (e.g., "structural tender"), use the provided context
- Output HTML formatting: use <p>, <strong>, <em>, <ul>, <li> as appropriate
- Keep output concise and focused -- this is inline content, not a full report section
- If you cannot fulfill the instruction with the available context, generate placeholder content marked with [brackets] indicating what data is needed

WHAT NOT TO DO:
- Do NOT include the original // instruction in your output
- Do NOT add section headers unless the instruction explicitly asks for them
- Do NOT generate more than 3-4 paragraphs unless the instruction explicitly requests more
- Do NOT add "Note:" or "Disclaimer:" wrappers around the content
- Do NOT reference yourself or the AI process ("As an AI...", "Based on the context provided...")`;
```

### 9.2 How the Prompt Differs from Generate/Polish

| Aspect | Generate | Polish | Execute (//) |
|---|---|---|---|
| Scope | Entire section | Entire section | Single paragraph replacement |
| Input | Section key + project context | Existing content | User's natural language instruction |
| Output | Full section content | Rewritten section content | Focused replacement content |
| Tone source | Section-specific prompt (e.g., MEETING_SYSTEM_LAYER) | Tone parameter (professional/formal/concise) | Matches surrounding content |
| Context | Starred notes + procurement docs | Just the content to polish | Surrounding editor content + project data + RAG |

---

## 10. Edge Cases and Pitfalls

### 10.1 URL False Positives

**Scenario**: User pastes `https://example.com` in the editor.

**Handling**: Already solved by the existing regex `(?<!:)\/\/.*`. The negative lookbehind `(?<!:)` ensures that `//` preceded by `:` (as in `https://`) is not matched.

**Edge case within the edge case**: What about `ftp://server.com`? Also handled -- `ftp:` ends with `:` before `//`.

### 10.2 Code Blocks

**Scenario**: User writes `// TODO: fix this` inside a TipTap code block.

**Handling**: Safe by default. TipTap's code blocks use a different node type (`codeBlock`) that does not receive inline decorations. The `InlineInstructionHighlight` extension only processes text nodes within paragraph nodes. Code blocks are not paragraphs in ProseMirror's schema.

### 10.3 Empty Instructions

**Scenario**: User types `//` followed by Enter (creating a paragraph that is just `//`).

**Handling**: The `validateInstruction()` function checks for empty instructions after trimming and shows a toast: "Please add an instruction after //. Example: // summarize the tender responses".

### 10.4 Very Long Instructions

**Scenario**: User writes a `//` instruction exceeding 500 characters.

**Handling**: The Zod validation schema caps `instruction` at 500 characters. Client-side validation shows a warning: "Instruction is too long (623/500 characters). Please shorten your instruction."

### 10.5 Multiple Instructions in One Editor

**Scenario**: User writes three `//` instructions in a single editor.

**Handling**: Execute processes the **first** `//` found (top of document). After replacement, the button re-evaluates: if more `//` instructions remain, the button stays visible. The user clicks again for the next one.

**User communication**: The button tooltip could show "Execute first // instruction (2 remaining)" in a future enhancement.

### 10.6 API Failure or Timeout

**Scenario**: The API returns a 500 error or times out.

**Handling**:
1. Show error toast with the error message
2. The `//` instruction remains unchanged in the editor
3. The Execute button returns to idle state
4. The user can retry by clicking Execute again

The instruction is never removed from the editor unless the API successfully returns content.

### 10.7 User Types During Execution

**Scenario**: User clicks Execute, then continues typing in the editor while the API call is in progress (2-5 seconds).

**Handling**: After the API responds, `refindInstruction()` re-scans the editor document by matching the instruction text. This handles position shifts caused by the user's edits. If the instruction text itself was modified during the API call (user edited the `//` line), `refindInstruction` returns null and a toast is shown: "Could not find the instruction. It may have been modified."

### 10.8 Concurrent Executions

**Scenario**: User quickly clicks Execute twice (e.g., double-click).

**Handling**: The Execute button is disabled (`isExecutingInstruction` state) while a request is in progress. The second click is a no-op.

### 10.9 ProseMirror Position Mapping

**Scenario**: The replacement transaction targets stale positions because the document changed between finding the instruction and dispatching the transaction.

**Handling**: The `refindInstruction()` function runs on the **current** editor state (not a cached state from before the API call). The replacement transaction is built against the current state, so positions are always valid.

### 10.10 HTML Content from AI Contains Invalid ProseMirror Nodes

**Scenario**: The AI returns HTML with elements that ProseMirror's schema doesn't support (e.g., `<table>`, `<img>`).

**Handling**: ProseMirror's `DOMParser.parseSlice()` silently drops unsupported elements and preserves their text content. This is acceptable behavior -- the text content is preserved even if some formatting is lost.

### 10.11 Note Color and Dark Text Interaction

**Scenario**: Notes use colored backgrounds (yellow, blue, green, pink) with forced dark text (`note-dark-text` class). The `//` violet styling must remain visible against these backgrounds.

**Handling**: The existing `.inline-instruction` CSS uses `var(--color-accent-violet)` which has sufficient contrast against all note color backgrounds. The `var(--color-accent-violet-tint)` background is semi-transparent and blends with the note color. No changes needed.

---

## 11. Security Considerations

### 11.1 Authentication

Same `getCurrentUser()` pattern as all other AI endpoints. Unauthenticated requests receive 401.

```typescript
const authResult = await getCurrentUser();
if (!authResult.user) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}
```

### 11.2 Input Validation

All inputs validated with Zod schema before processing:
- `instruction`: max 500 characters
- `existingContent`: max 10,000 characters
- `projectId`, `contextId`: required non-empty strings
- `contextType`: enum restricted to `'note' | 'meeting' | 'report'`

### 11.3 Rate Limiting

Inherits from existing AI endpoint patterns. The application uses the same Anthropic API key for all AI calls, so Claude's built-in rate limiting applies. If needed, a per-user rate limit can be added at the middleware level (same approach as other AI endpoints).

### 11.4 Token Budget

The system prompt + instruction + context + response is budgeted as follows:
- System prompt (BASE + INLINE_INSTRUCTION layer): ~500 tokens
- Instruction text: max ~150 tokens (500 chars)
- Surrounding content: max ~3,000 tokens (10,000 chars)
- RAG chunks: max ~2,000 tokens (5 chunks x ~400 chars)
- Starred notes + procurement docs: max ~1,500 tokens
- **Total input**: ~7,000 tokens
- **Max output**: 1,500 tokens

Well within Claude's context window and keeps costs low (~$0.01-0.03 per execution).

### 11.5 Prompt Injection

The user's instruction is passed to Claude as a user message, not injected into the system prompt. The system prompt includes explicit rules about what to generate and what not to do. Standard AI safety practices apply -- the AI should not execute instructions that ask it to reveal system prompts, generate harmful content, etc. Claude's built-in safety features handle these cases.

---

## 12. Implementation Approach

### Phase 1: Instruction Utilities and API (2-3 days)

**Step 1: Create instruction utility functions**
- Create `src/lib/editor/instruction-utils.ts`
- Implement `findFirstInstruction()`, `hasInstructions()`, `refindInstruction()`, `replaceInstructionWithContent()`, `validateInstruction()`, `extractSurroundingContent()`
- Write unit tests for extraction logic (regex matching, position calculation)
- Files: `src/lib/editor/instruction-utils.ts`

**Step 2: Add Zod validation schema**
- Add `executeInstructionSchema` to `src/lib/validations/notes-meetings-reports-schema.ts`
- Files: `src/lib/validations/notes-meetings-reports-schema.ts`

**Step 3: Create inline instruction system prompt**
- Add `INLINE_INSTRUCTION_SYSTEM_LAYER` to `src/lib/prompts/system-prompts.ts`
- Files: `src/lib/prompts/system-prompts.ts`

**Step 4: Create service layer**
- Create `src/lib/services/inline-instruction-service.ts`
- Implement `executeInlineInstruction()` with context assembly + Claude call
- Files: `src/lib/services/inline-instruction-service.ts`

**Step 5: Create API endpoint**
- Create `src/app/api/ai/execute-instruction/route.ts`
- Implement POST handler with auth + validation + service call
- Test with curl/Postman to verify end-to-end
- Files: `src/app/api/ai/execute-instruction/route.ts`

### Phase 2: RichTextEditor Modifications (1-2 days)

**Step 6: Add new props to RichTextEditor**
- Add `onEditorReady`, `enableInlineInstructions`, `onExecuteInstruction`, `isExecutingInstruction` props
- Implement `hasInlineInstruction` state tracking on editor updates
- Add Execute button rendering in toolbar area
- Pass props through NoteEditor (which wraps RichTextEditor)
- Files: `src/components/ui/RichTextEditor.tsx`, `src/components/notes-meetings-reports/NoteEditor.tsx`

### Phase 3: Notes Integration (1 day)

**Step 7: Wire Execute into NoteContent**
- Add `editorRef`, `isExecuting` state, `handleExecuteInstruction` callback
- Pass `enableInlineInstructions={true}` and `onExecuteInstruction` down through NoteEditor
- Files: `src/components/notes-meetings-reports/NoteContent.tsx`

### Phase 4: Reports Integration (1-2 days)

**Step 8: Wire Execute into ReportEditor + ReportContentsSection**
- Add `editorRefs` map, `executingSectionId` state, `handleEditorReady`, `handleExecuteInstruction` to ReportEditor
- Add `onExecuteInstruction`, `onEditorReady`, `isExecuting` props to ReportContentsSection
- Add Execute button in section header alongside Generate/Polish
- Files: `src/components/notes-meetings-reports/ReportEditor.tsx`, `src/components/notes-meetings-reports/ReportContentsSection.tsx`

### Phase 5: Meetings Integration (1 day)

**Step 9: Wire Execute into MeetingEditor + MeetingAgendaSection**
- Same pattern as Reports (identical component structure)
- Add `editorRefs` map, `executingSectionId` state, handlers to MeetingEditor
- Add props and Execute button to MeetingAgendaSection
- Files: `src/components/notes-meetings-reports/MeetingEditor.tsx`, `src/components/notes-meetings-reports/MeetingAgendaSection.tsx`

### Phase 6: Polish and Test (1 day)

**Step 10: End-to-end testing and refinement**
- Test all three contexts (note, report section, meeting section)
- Test edge cases: empty instructions, long instructions, multiple instructions, concurrent execution
- Test undo (Ctrl+Z) after replacement
- Test URL exclusion (`https://` not matched)
- Verify loading states, error handling, toast messages
- Files: No new files -- testing and bug fixes only

### Total estimated effort: 7-10 days

### Implementation dependencies:

- **Phase 1** is backend-only and independent of all other Pillars
- **Phases 2-5** are frontend work that depends on Phase 1
- **No dependency on Pillar 1 or 2** for MVP -- existing context assembly is sufficient
- **Pillar 2 upgrade** is a drop-in replacement in the service layer (Phase 1, Step 4) after Pillar 2 ships

### Recommended build order:

1. Ship Phases 1-3 first (API + Notes integration) -- smallest surface area, fastest to validate the full loop
2. Ship Phases 4-5 (Reports + Meetings) -- extends the same pattern to section-based editors
3. Ship Phase 6 (testing/polish) -- comprehensive edge case verification
4. After Pillar 2 ships: swap context assembly in `inline-instruction-service.ts`

---

## 13. Files Created/Modified Summary

| Action | File | Phase | Notes |
|--------|------|-------|-------|
| Create | `src/lib/editor/instruction-utils.ts` | 1 | Extraction, validation, replacement utilities |
| Create | `src/lib/services/inline-instruction-service.ts` | 1 | Service layer: context assembly + Claude call |
| Create | `src/app/api/ai/execute-instruction/route.ts` | 1 | API endpoint |
| Modify | `src/lib/validations/notes-meetings-reports-schema.ts` | 1 | Add `executeInstructionSchema` |
| Modify | `src/lib/prompts/system-prompts.ts` | 1 | Add `INLINE_INSTRUCTION_SYSTEM_LAYER` |
| Modify | `src/components/ui/RichTextEditor.tsx` | 2 | Add `onEditorReady`, instruction detection, Execute button |
| Modify | `src/components/notes-meetings-reports/NoteEditor.tsx` | 2 | Pass through new RichTextEditor props |
| Modify | `src/components/notes-meetings-reports/NoteContent.tsx` | 3 | Wire `handleExecuteInstruction`, `editorRef` |
| Modify | `src/components/notes-meetings-reports/ReportEditor.tsx` | 4 | Add `editorRefs`, `handleExecuteInstruction` |
| Modify | `src/components/notes-meetings-reports/ReportContentsSection.tsx` | 4 | Add Execute button, `onEditorReady` prop |
| Modify | `src/components/notes-meetings-reports/MeetingEditor.tsx` | 5 | Add `editorRefs`, `handleExecuteInstruction` |
| Modify | `src/components/notes-meetings-reports/MeetingAgendaSection.tsx` | 5 | Add Execute button, `onEditorReady` prop |

**Total**: 3 new files, 9 modified files.
