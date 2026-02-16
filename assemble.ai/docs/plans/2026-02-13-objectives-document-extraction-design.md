# Objectives Document Extraction Design

## Overview

Enhance the objectives module so the Generate button adapts to context: when documents are attached, it extracts objectives from those documents; when no documents are attached, it uses the existing profile/inference-rules pipeline. No new buttons — the system detects what's available and acts accordingly.

## Problem

Two distinct user profiles exist:

1. **No prior documents** — User has limited domain knowledge, no existing brief. The current profile-driven inference workflow guides them to sensible objectives.
2. **Existing brief/documents** — Commercial PMs often arrive with client briefs, Statements of Environmental Effects, client design objective documents. They need to extract objectives from these and feed them into the application to proceed with procurement.

Currently only path 1 is supported. Path 2 requires manual reading and copy/paste.

## Design

### Smart Generate Button

The existing Generate button (empty diamond icon) in each column's ribbon header becomes context-aware:

- **Documents attached AND RAG-processed** → Extract objectives from linked documents
- **No documents attached** → Use profile/inference rules (current behaviour, unchanged)
- **Documents attached but NOT processed** → Block generation, show notification that documents need processing first

The **Polish button** (filled diamond) is unchanged — it expands short bullets into detailed objectives with standards references, regardless of how the initial content was created.

**Priority rule:** Documents always win. If documents are attached, inference rules are not used. No blending or merging — the user's brief is the source of truth.

### Document Attachment Section

Add an attachment section below the two objectives columns, following the same pattern used in Notes:

- User selects document(s) in the **document repo panel** (right nav)
- Clicks **Save** at the bottom of the objectives section to link selected documents
- Linked documents display in an attachment table (same as Notes: DWG #, Name, Rev, Category)
- **Load** button opens the transmittal editor for modifications
- User can attach multiple documents (e.g., a brief + an SEE + a client design objectives doc)

This reuses existing components: `AttachmentSection`, `AttachmentTable`, and the transmittal junction table pattern.

### Database

New junction table following the existing pattern:

```sql
objectives_transmittals:
  - id (PK)
  - objectives_id (FK → profilerObjectives)
  - document_id (FK → documents)
  - added_at (timestamp)
```

### Generation Flow (Document Path)

When Generate is clicked and documents are attached:

1. Fetch linked document IDs from `objectives_transmittals`
2. Check all documents have RAG chunks (sync_status = 'synced')
3. If any unprocessed → show notification, block generation
4. RAG retrieval with broad query covering both columns:
   - Functional/quality query: "project objectives, functional requirements, quality standards, design features, performance criteria"
   - Planning/compliance query: "planning approvals, compliance requirements, building codes, authority requirements, certifications, statutory requirements"
5. Extraction prompt asks Claude to:
   - Extract objective-like statements from retrieved chunks
   - Sort into **Functional & Quality** vs **Planning & Compliance**
   - Format as short bullets (2-5 words) — same as current Stage 1 output
6. Replace content in both columns
7. User can then **Polish** as normal

### Generation Flow (Profile Path — Unchanged)

When Generate is clicked and no documents are attached:

1. Existing flow: fetch profile → evaluate inference rules → generate via Claude
2. No changes to prompts, logic, or output format

### Output Format

Identical regardless of source. Short bullets (2-5 words) in HTML format:

```html
<p><strong>Functional & Quality</strong></p>
<ul>
  <li>High-performance glazing systems</li>
  <li>Acoustic separation requirements</li>
  ...
</ul>
```

This ensures Polish works identically on extracted content as it does on inference-generated content.

## Error Handling

| Scenario | Behaviour |
|----------|-----------|
| Document attached but not RAG-processed | Block generation, show warning badge on attachment + notification prompting user to process document |
| RAG retrieval returns thin results | Generate what's available, user can polish or manually add more |
| User attaches docs, generates, then detaches | Generated content stays (it's just text). Next Generate uses inference rules |
| User has existing content, attaches doc, hits Generate | Replace action. Edit history preserves previous version |
| No documents AND no complete profile | Generate button disabled (existing behaviour) |

## What's NOT Changing

- Polish button behaviour
- Inference rules engine
- Two-stage flow (short bullets → polished content)
- Edit history tracking
- Pattern learning on manual edits
- RichTextEditor fields
- Ribbon header layout (still two buttons: Generate + Polish)

## Implementation Scope

**Reuse existing:**
- `AttachmentSection` / `AttachmentTable` components
- RAG retrieval pipeline (`src/lib/rag/retrieval.ts`)
- Transmittal junction table pattern
- Document selector (right nav repo panel)

**New:**
- `objectives_transmittals` database table + migration
- API endpoint for linking/unlinking documents to objectives
- Modified `/api/projects/[projectId]/objectives/generate` route to detect attached documents and branch logic
- Extraction prompt (new prompt template for document-based generation)
- Conditional UI in `ObjectivesProfilerSection.tsx` for attachment section + unprocessed document warning
