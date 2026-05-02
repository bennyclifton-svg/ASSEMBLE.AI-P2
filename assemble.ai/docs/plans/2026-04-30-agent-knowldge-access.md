# Agent Knowledge Library Access + Granular Model Configuration

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Give the three specialist agents direct access to the curated knowledge domain libraries via a new `search_knowledge_library` tool, update their system prompts to prefer those libraries for authoritative guidance, and introduce per-agent model feature groups so each agent can be independently tuned to the cheapest model that produces acceptable output quality.

**Architecture:** Two independent features. Feature A adds a new read-only `search_knowledge_library` tool wrapping the existing `retrieveFromDomains()` function (already used by objectives generation and report pipelines) and updates specialist system prompts with explicit knowledge-library awareness. Feature B splits the coarse `agent_specialist` feature group into three per-agent groups seeded with smart defaults (Haiku for orchestrator and design, Sonnet for finance and program), adds missing groups to the admin models UI, adds an `objectives_generation` feature group, and restores the model registry call in `model.ts` (an explicitly logged deviation in `docs/plans/2026-04-29-agent-integration.md`).

**Tech Stack:** TypeScript, Drizzle ORM / PostgreSQL, Anthropic SDK, Next.js App Router, pgvector RAG pipeline (Voyage AI embeddings, BAAI/Cohere reranking).

---

## Relationship to existing plans

### `docs/plans/2026-04-29-agent-integration.md`
This is the master agent roadmap. **Outstanding Item #1** in its implementation log explicitly calls for this exact work:
> *"Knowledge-library + domain-repo retrieval tools (`search_knowledge_libraries`, `search_domain_repos`). Currently `search_rag` only searches documents owned by the current project; firm-wide knowledge libraries and global/seed domain repos are invisible to the agent."*

The `model.ts` deviation log also notes that the raw-SQL model lookup should be replaced with `getProviderAndModelFor()` once the admin schema lands — Task 4 of this plan resolves that.

### `docs/plans/2026-04-30-phase-3x-broad-write-tools.md`
Phase 3X modifies `allowedTools` and `BASE_PROMPT` in all three specialist files (Tasks 8–10). **This plan's Task 2 must be implemented AFTER Phase 3X lands** to avoid merge conflicts. The combined `allowedTools` shown in Task 2 below already includes the Phase 3X tools so the implementer can apply them atomically.

**Recommended implementation order:**
1. Phase 3X broad write tools (existing plan, Tasks 1–13)
2. This plan Task 1 (`search_knowledge_library` tool file + index)
3. This plan Task 2 (system prompts + `allowedTools` — post-Phase-3X state)
4. This plan Tasks 3–5 (per-agent feature groups)

---

## Context

### Current state
- `search_rag` tool (`src/lib/agents/tools/search-rag.ts`) is explicitly project-scoped — line 87 comment: *"Global/seed domain repos are addressed via separate tools later — Phase 1 is just project-scoped."*
- `retrieveFromDomains()` exists in `src/lib/rag/retrieval.ts`, used by objectives generation and report pipelines, but no agent tool wraps it.
- 15 curated knowledge domains are pre-built (NCC Reference, Contract Administration, Cost Management, Program & Scheduling, MEP Services, etc.) and ingested via `scripts/ingest-seed-knowledge.ts` — agents are completely unaware they exist.
- All three specialists share one `agent_specialist` feature group → you can't make Design use Haiku without also making Finance use Haiku.
- Admin models page (`/admin/models`) `FEATURE_GROUP_LABELS` object is missing `agent_specialist` and `agent_orchestrator` entries — they exist in the DB and are configurable via API but are invisible in the UI (bug).
- Objectives generation uses `content_generation` (Sonnet) — same bucket as report writing, so you can't cheaply tune objectives independently of long-form reports.
- `model.ts` uses a raw SQL lookup against `model_settings` as a workaround for a missing Drizzle symbol. This is a logged deviation; it should be restored to `getProviderAndModelFor()` once the auth-schema types are available.

---

## Critical files

| File | Role |
|------|------|
| `src/lib/rag/retrieval.ts` | Source of `retrieveFromDomains()` + `DomainRetrievalOptions` — DO NOT modify |
| `src/lib/agents/tools/search-rag.ts` | **Reference implementation** for new tool |
| `src/lib/agents/tools/catalog.ts` | `registerTool`, `AgentToolDefinition` — pattern to follow |
| `src/lib/agents/tools/_context.ts` | `ToolContext` — provides `projectId`, `organizationId` |
| `src/lib/agents/tools/index.ts` | Side-effect import bundle — add new tool here |
| `src/lib/agents/specialists/finance.ts` | Update `allowedTools` + `BASE_PROMPT` + `featureGroup` |
| `src/lib/agents/specialists/program.ts` | Update `allowedTools` + `BASE_PROMPT` + `featureGroup` |
| `src/lib/agents/specialists/design.ts` | Update `allowedTools` + `BASE_PROMPT` + `featureGroup` |
| `src/lib/agents/specialists/orchestrator.ts` | `featureGroup` stays `agent_orchestrator` — no tool changes |
| `src/lib/agents/model.ts` | Replace raw SQL with `getProviderAndModelFor()` from registry |
| `src/lib/ai/types.ts` | Add 4 new entries to `FEATURE_GROUPS` const |
| `src/lib/ai/registry.ts` | `getProviderAndModelFor()` — the function `model.ts` should call |
| `drizzle-auth/0004_per_agent_feature_groups.sql` | Seed new groups; update orchestrator default to Haiku |
| `src/app/admin/models/page.tsx` | Add labels for all agent groups (fix missing + add new) |
| `src/app/api/projects/[projectId]/objectives/generate/route.ts` | Switch to `objectives_generation` feature group |

---

## Task 1 — Create `search_knowledge_library` tool

**Files:**
- Create: `src/lib/agents/tools/search-knowledge-library.ts`
- Modify: `src/lib/agents/tools/index.ts`

**Step 1: Write the tool file**

```typescript
/**
 * search_knowledge_library — semantic search across the organization's curated
 * knowledge domain libraries (NCC reference, contract administration, cost
 * management, program & scheduling, MEP services, etc.).
 *
 * Wraps retrieveFromDomains() scoped to the caller's organization. Unlike
 * search_rag (which searches project-uploaded documents), this searches the
 * pre-ingested seed knowledge and any org-uploaded domain libraries.
 *
 * Read-only. Call this before citing regulatory requirements, industry
 * benchmarks, or best-practice guidance.
 */

import { retrieveFromDomains } from '@/lib/rag/retrieval';
import { registerTool, type AgentToolDefinition } from './catalog';
import { assertProjectOrg, type ToolContext } from './_context';

interface SearchKnowledgeLibraryInput {
    query: string;
    tags?: string[];
    domainTypes?: string[];
    maxResults?: number;
}

interface SearchKnowledgeLibraryOutput {
    query: string;
    resultCount: number;
    results: Array<{
        domainName: string;
        domainType: string;
        sectionTitle: string | null;
        clauseNumber: string | null;
        relevanceScore: number;
        excerpt: string;
    }>;
}

const DEFAULT_MAX = 5;
const HARD_MAX = 10;
const EXCERPT_CHARS = 600;
const VALID_DOMAIN_TYPES = ['reference', 'regulatory', 'best_practices', 'templates', 'project_history', 'custom'];

const definition: AgentToolDefinition<SearchKnowledgeLibraryInput, SearchKnowledgeLibraryOutput> = {
    spec: {
        name: 'search_knowledge_library',
        description:
            'Search the organization\'s curated knowledge domain libraries — NCC/AS Standards references, ' +
            'contract administration guides (AS 2124, AS 4000), cost management principles, program & ' +
            'scheduling guides, MEP services, and more. Returns excerpts with domain and section references. ' +
            'Use this BEFORE citing regulatory requirements, industry benchmarks, or best-practice guidance. ' +
            'Examples: "what contingency rate is appropriate for concept stage", ' +
            '"NCC requirements for fire egress Class 5", "EOT entitlement under AS 4000".',
        inputSchema: {
            type: 'object',
            properties: {
                query: {
                    type: 'string',
                    description: 'Natural-language search query.',
                },
                tags: {
                    type: 'array',
                    items: { type: 'string' },
                    description:
                        'Optional domain tag filters. Examples: "cost-management", "variations", "eot", ' +
                        '"ncc", "programming", "contracts", "procurement", "milestones", "structural".',
                },
                domainTypes: {
                    type: 'array',
                    items: { type: 'string' },
                    description:
                        'Optional domain type filters: "reference", "regulatory", "best_practices", ' +
                        '"templates", "project_history". Omit to search all types.',
                },
                maxResults: {
                    type: 'integer',
                    minimum: 1,
                    maximum: HARD_MAX,
                    description: `Maximum result chunks to return (default ${DEFAULT_MAX}).`,
                },
            },
            required: ['query'],
        },
    },
    mutating: false,
    validate(input: unknown): SearchKnowledgeLibraryInput {
        if (!input || typeof input !== 'object') throw new Error('search_knowledge_library: input must be an object');
        const obj = input as Record<string, unknown>;
        if (typeof obj.query !== 'string' || obj.query.trim().length === 0) {
            throw new Error('search_knowledge_library: "query" must be a non-empty string');
        }
        let tags: string[] | undefined;
        if (obj.tags !== undefined) {
            if (!Array.isArray(obj.tags) || !obj.tags.every((t) => typeof t === 'string')) {
                throw new Error('search_knowledge_library: "tags" must be an array of strings');
            }
            tags = obj.tags as string[];
        }
        let domainTypes: string[] | undefined;
        if (obj.domainTypes !== undefined) {
            if (!Array.isArray(obj.domainTypes) || !obj.domainTypes.every((t) => typeof t === 'string')) {
                throw new Error('search_knowledge_library: "domainTypes" must be an array of strings');
            }
            domainTypes = (obj.domainTypes as string[]).filter((t) => VALID_DOMAIN_TYPES.includes(t));
        }
        let maxResults: number | undefined;
        if (obj.maxResults !== undefined) {
            if (typeof obj.maxResults !== 'number' || !Number.isInteger(obj.maxResults)) {
                throw new Error('search_knowledge_library: "maxResults" must be an integer');
            }
            maxResults = Math.max(1, Math.min(HARD_MAX, obj.maxResults));
        }
        return { query: obj.query.trim(), tags, domainTypes, maxResults };
    },
    async execute(ctx: ToolContext, input: SearchKnowledgeLibraryInput): Promise<SearchKnowledgeLibraryOutput> {
        await assertProjectOrg(ctx);
        const topK = input.maxResults ?? DEFAULT_MAX;
        const results = await retrieveFromDomains(input.query, {
            organizationId: ctx.organizationId,
            domainTags: input.tags,
            domainTypes: input.domainTypes,
            topK: topK * 3,   // broad initial search gives the reranker more material
            rerankTopK: topK,
            minRelevanceScore: 0.2,
            includePrebuilt: true,
            includeOrganization: true,
        });
        return {
            query: input.query,
            resultCount: results.length,
            results: results.map((r) => ({
                domainName: r.domainName ?? 'Unknown Domain',
                domainType: r.domainType ?? 'reference',
                sectionTitle: r.sectionTitle,
                clauseNumber: r.clauseNumber,
                relevanceScore: Number(r.relevanceScore.toFixed(3)),
                excerpt: r.content.length > EXCERPT_CHARS
                    ? r.content.slice(0, EXCERPT_CHARS) + '…'
                    : r.content,
            })),
        };
    },
};

registerTool(definition);
export { definition as searchKnowledgeLibraryTool };
```

**Step 2: Register in `src/lib/agents/tools/index.ts`**

Add immediately after `import './search-rag';`:
```typescript
import './search-knowledge-library';
```

**Step 3: Type check**
```bash
npx tsc --noEmit
```
Expected: no errors. If `retrieveFromDomains` is not found, check whether it needs to be imported from `@/lib/rag/retrieval` directly (not the index) — `search-rag.ts` imports `retrieve` from `@/lib/rag/retrieval` which is the same file.

**Step 4: Commit**
```bash
git add src/lib/agents/tools/search-knowledge-library.ts src/lib/agents/tools/index.ts
git commit -m "feat(agents): add search_knowledge_library tool wrapping retrieveFromDomains"
```

---

## Task 2 — Add knowledge library awareness to specialist system prompts

> **Prerequisite:** Phase 3X broad write tools plan must be fully shipped before this task.
> The `allowedTools` arrays below show the complete post-Phase-3X-plus-this-plan state.

**Files:**
- Modify: `src/lib/agents/specialists/finance.ts`
- Modify: `src/lib/agents/specialists/program.ts`
- Modify: `src/lib/agents/specialists/design.ts`
- Modify: `docs/agents/Agent-Finance.md`
- Modify: `docs/agents/Agent-Program.md`
- Modify: `docs/agents/Agent-Design.md`

### Step 1: Update Finance specialist

**`allowedTools` final state (Phase 3X + this plan):**
```typescript
allowedTools: [
    'search_knowledge_library',  // ← this plan
    'search_rag',
    'list_cost_lines',
    'update_cost_line',
    'create_cost_line',
    'record_invoice',
    'list_risks',               // Phase 3X
    'list_variations',          // Phase 3X
    'create_variation',         // Phase 3X
    'update_variation',         // Phase 3X
    'list_notes',               // Phase 3X
    'create_note',              // Phase 3X
],
```

**Knowledge library section to add to `BASE_PROMPT`** (add before `## How to respond`):

```
## Knowledge libraries
The organization maintains curated knowledge domain libraries covering Australian construction
best practices, NCC/AS Standards references, cost management, contract administration
(AS 2124, AS 4000), procurement, and more. These libraries are pre-ingested as vector
embeddings and are searchable via search_knowledge_library.

**Call search_knowledge_library BEFORE**:
- Citing regulatory requirements, AS Standards clauses, or NCC provisions
- Quoting industry cost benchmarks or contingency rates (e.g. Rawlinsons, Cordell)
- Describing best-practice methodology for variations, EOT, or progress claims
- Answering questions about contract clause entitlements

Knowledge library results take precedence over training knowledge for Australian construction
practice questions. If the library returns relevant content, cite it. If not, flag it:
"Based on general practice (not found in project libraries):…"
```

**`search_knowledge_library` entry in the capabilities section** (add after `search_rag`):
```
- search_knowledge_library — search the organization's curated domain libraries (NCC, contract
  administration, cost management, procurement). Call this BEFORE citing benchmarks, standards,
  or best-practice figures. Preferred tags for Finance: "cost-management", "variations",
  "progress-claims", "contracts", "eot", "procurement".
```

### Step 2: Update Program specialist

**`allowedTools` final state:**
```typescript
allowedTools: [
    'search_knowledge_library',  // ← this plan
    'search_rag',
    'list_program',
    'list_risks',               // Phase 3X
    'create_risk',              // Phase 3X
    'update_risk',              // Phase 3X
    'update_program_activity',  // Phase 3X
    'create_program_milestone', // Phase 3X
    'update_program_milestone', // Phase 3X
    'list_notes',               // Phase 3X
    'create_note',              // Phase 3X
    'list_meetings',            // Phase 3X
],
```

**Knowledge library section + capability entry** (same structure as Finance):
```
## Knowledge libraries
... (same boilerplate as Finance)

- search_knowledge_library — search the organization's curated domain libraries (programming,
  milestones, critical path, contract administration). Call this BEFORE citing schedule
  methodology, float calculations, or delay analysis principles.
  Preferred tags for Program: "programming", "milestones", "critical-path", "eot",
  "contracts", "construction".
```

### Step 3: Update Design specialist

**`allowedTools` final state:**
```typescript
allowedTools: [
    'search_knowledge_library',  // ← this plan
    'search_rag',
    'list_stakeholders',        // Phase 3X
    'update_stakeholder',       // Phase 3X
    'list_notes',               // Phase 3X
    'create_note',              // Phase 3X
    'update_note',              // Phase 3X
    'list_meetings',            // Phase 3X
],
```

**Knowledge library section + capability entry:**
```
- search_knowledge_library — search the organization's curated domain libraries (NCC compliance,
  DA requirements, architectural best practices). Call this BEFORE citing planning legislation,
  NCC building classification rules, or consultant procurement methodology.
  Preferred tags for Design: "ncc", "regulatory", "architectural", "procurement", "contracts".
```

### Step 4: Sync all three `docs/agents/Agent-*.md` spec files

Add the same knowledge library section and updated tool list to each corresponding markdown spec document.

### Step 5: Type check + commit
```bash
npx tsc --noEmit
git add src/lib/agents/specialists/finance.ts src/lib/agents/specialists/program.ts \
        src/lib/agents/specialists/design.ts \
        docs/agents/Agent-Finance.md docs/agents/Agent-Program.md docs/agents/Agent-Design.md
git commit -m "feat(agents): add search_knowledge_library to all specialists + knowledge-library system prompt"
```

---

## Task 3 — Per-agent feature groups in types and DB

**Files:**
- Modify: `src/lib/ai/types.ts`
- Create: `drizzle-auth/0004_per_agent_feature_groups.sql`

### Step 1: Update `FEATURE_GROUPS` in `src/lib/ai/types.ts`

```typescript
export const FEATURE_GROUPS = [
    'document_extraction',
    'text_extraction',
    'cost_line_matching',
    'content_generation',
    'content_polishing',
    'objectives_generation',     // ← new: independent from content_generation
    // Agent-runtime groups
    'agent_specialist',          // legacy — no specialist uses this now; kept for backwards compat
    'agent_orchestrator',
    'agent_finance',             // ← new
    'agent_program',             // ← new
    'agent_design',              // ← new
] as const;
```

### Step 2: Create the migration

`drizzle-auth/0004_per_agent_feature_groups.sql`:
```sql
-- Migration: 0004_per_agent_feature_groups.sql
-- Adds per-agent feature groups so Finance/Program/Design/Orchestrator
-- can be independently tuned. Also adds objectives_generation.
-- Idempotent (ON CONFLICT DO NOTHING for inserts).

INSERT INTO "model_settings" ("feature_group", "provider", "model_id") VALUES
    -- Finance: Sonnet — complex QS reasoning, multi-turn tool loops
    ('agent_finance',         'anthropic', 'claude-sonnet-4-6'),
    -- Program: Sonnet — schedule analysis, milestone interpretation
    ('agent_program',         'anthropic', 'claude-sonnet-4-6'),
    -- Design: Haiku — primarily searches + stakeholder reads, simpler tasks
    ('agent_design',          'anthropic', 'claude-haiku-4-5-20251001'),
    -- Objectives: Sonnet — high-quality strategic output
    ('objectives_generation', 'anthropic', 'claude-sonnet-4-6')
ON CONFLICT ("feature_group") DO NOTHING;

-- Orchestrator only routes messages (1024 max tokens) — downgrade default to Haiku.
-- UPDATE so this always applies even if the row was seeded by 0003.
UPDATE "model_settings"
SET "model_id" = 'claude-haiku-4-5-20251001'
WHERE "feature_group" = 'agent_orchestrator'
  AND "model_id" = 'claude-sonnet-4-6';
```

### Step 3: Apply migration
```bash
# Against local Docker Postgres:
psql $DATABASE_URL -f drizzle-auth/0004_per_agent_feature_groups.sql
# Against Supabase production (apply before deploying code):
# Run same script via Supabase SQL editor or psql with production DATABASE_URL
```

### Step 4: Commit
```bash
git add src/lib/ai/types.ts drizzle-auth/0004_per_agent_feature_groups.sql
git commit -m "feat(models): add per-agent feature groups (finance/program/design) and objectives_generation"
```

---

## Task 4 — Wire specialists to per-agent groups + restore model registry call

**Files:**
- Modify: `src/lib/agents/specialists/finance.ts`
- Modify: `src/lib/agents/specialists/program.ts`
- Modify: `src/lib/agents/specialists/design.ts`
- Modify: `src/lib/agents/model.ts`

### Step 1: Update `featureGroup` in each specialist

One-line change per file:
```typescript
// finance.ts
featureGroup: 'agent_finance',    // was: 'agent_specialist'

// program.ts
featureGroup: 'agent_program',    // was: 'agent_specialist'

// design.ts
featureGroup: 'agent_design',     // was: 'agent_specialist'
```
`orchestrator.ts` keeps `featureGroup: 'agent_orchestrator'` — no change.

### Step 2: Restore model registry call in `model.ts`

The deviation log in `agent-integration.md` says: *"Once auth-schema exports `modelSettings` properly, this can be replaced with a one-line call to `getProviderAndModelFor()`."*

Check whether `src/lib/ai/registry.ts`'s `getProviderAndModelFor(group)` now compiles without the import error. If `modelSettings` is exported from `src/lib/db/auth-schema.ts`:

```typescript
// src/lib/agents/model.ts — replace the entire file contents with:
import { getProviderAndModelFor } from '@/lib/ai/registry';
import type { FeatureGroup, ModelChoice } from '@/lib/ai/types';

export async function resolveAgentModel(group: FeatureGroup): Promise<ModelChoice> {
    return getProviderAndModelFor(group);
}
```

If the import still fails (auth-schema still missing `modelSettings`), leave `model.ts` as-is and add a TODO comment. Do not break the build for this cleanup.

### Step 3: Type check
```bash
npx tsc --noEmit
```
Expected: no errors — new group names are in `FEATURE_GROUPS`.

### Step 4: Commit
```bash
git add src/lib/agents/specialists/finance.ts src/lib/agents/specialists/program.ts \
        src/lib/agents/specialists/design.ts src/lib/agents/model.ts
git commit -m "feat(agents): per-agent feature groups + restore model registry call"
```

---

## Task 5 — Fix + expand admin models page

**Files:**
- Modify: `src/app/admin/models/page.tsx`

Current `FEATURE_GROUP_LABELS` in this file only covers 5 of the 7 feature groups — `agent_specialist` and `agent_orchestrator` are missing (they exist in the DB but are invisible in the UI). This task adds all existing and new groups.

**Replace `FEATURE_GROUP_LABELS` with:**

```typescript
const FEATURE_GROUP_LABELS: Record<FeatureGroup, { title: string; description: string }> = {
    document_extraction: {
        title: 'Document extraction',
        description: 'Reads PDFs directly (invoices, variations, drawing fallback). PDF input requires native-PDF support.',
    },
    text_extraction: {
        title: 'Text extraction',
        description: 'Pulls structured fields from already-extracted text. Used by tender, planning, contractor, consultant flows.',
    },
    cost_line_matching: {
        title: 'Cost-line matching',
        description: 'Matches an invoice or variation to a cost line. Short prompts, high volume. Haiku is appropriate here.',
    },
    content_generation: {
        title: 'Content generation',
        description: 'Long-form writing — notes, reports, RFTs, sections. Quality matters here.',
    },
    content_polishing: {
        title: 'Content polishing',
        description: 'Refines existing prose. Lower stakes than generation.',
    },
    objectives_generation: {
        title: 'Objectives generation',
        description: 'Generates project objectives from profile + knowledge library context. High-quality strategic output — Sonnet recommended.',
    },
    agent_specialist: {
        title: 'Agent — specialist (legacy)',
        description: 'Legacy shared group — replaced by per-agent groups below. Safe to leave; no specialist uses it now.',
    },
    agent_orchestrator: {
        title: 'Agent — Orchestrator',
        description: 'Routes user messages to the right specialist(s). Simple routing logic — Haiku is sufficient (default).',
    },
    agent_finance: {
        title: 'Agent — Finance',
        description: 'QS agent: cost plans, invoices, variations, benchmarks. Multi-turn tool loops — Sonnet recommended.',
    },
    agent_program: {
        title: 'Agent — Program',
        description: 'Programmer agent: schedule, milestones, critical path. Complex analysis — Sonnet recommended.',
    },
    agent_design: {
        title: 'Agent — Design',
        description: 'Design manager agent: stakeholders, DA readiness, document searches. Simpler tasks — Haiku is appropriate (default).',
    },
};
```

### Step: Type check + commit
```bash
npx tsc --noEmit
git add src/app/admin/models/page.tsx
git commit -m "fix(admin): show all agent feature groups in models UI; add per-agent + objectives groups"
```

---

## Task 6 — Wire `objectives_generation` feature group

**Files:**
- Modify: `src/app/api/projects/[projectId]/objectives/generate/route.ts`

Find the model resolution call in this file. It currently uses `'content_generation'`. Switch it to `'objectives_generation'`:

```typescript
// Before:
const model = await getModelFor('content_generation');
// (or getProviderAndModelFor, or resolveAgentModel — check the actual call)

// After:
const model = await getModelFor('objectives_generation');
```

If the file uses the context orchestrator instead of a direct model call, trace to the LLM invocation and update the feature group there.

### Step: Commit
```bash
git add src/app/api/projects/[projectId]/objectives/generate/route.ts
git commit -m "feat(objectives): use objectives_generation feature group for independent model tuning"
```

---

## Verification

### 1. Knowledge library tool end-to-end
- Start the dev server with local DB
- Open chat for a project
- Ask the Finance agent: *"What contingency rate should I apply at concept stage?"*
- Observe server logs — agent should call `search_knowledge_library` with `tags: ["cost-management"]`
- Confirm response cites domain library content (not just bare training knowledge)

### 2. Knowledge library fallback
- Ask about a niche topic unlikely to be in libraries
- Agent should prefix answer: "Based on general practice (not found in project libraries):…"

### 3. Per-agent model isolation
- Navigate to `/admin/models`
- Confirm you can see independent rows for Finance, Program, Design, Orchestrator
- Design and Orchestrator should show Haiku as default
- Change Design to a different model → send a Design agent message → verify server logs show the new model ID being used

### 4. Token efficiency validation
- Orchestrator turns should now use `claude-haiku-4-5-20251001`
- Design agent uses Haiku by default
- Finance and Program should use Sonnet (configurable)
- Check Anthropic usage dashboard to confirm model distribution after a few agent runs

### 5. Objectives model isolation
- Change `objectives_generation` to Haiku in admin
- Trigger an objectives generate (project with profile)
- Confirm it uses Haiku in server logs
- Change `content_generation` → confirm objectives generation is unaffected

### 6. Admin UI completeness
- `/admin/models` now shows all 11 feature groups
- `agent_specialist` shows as "(legacy)" — no active agent uses it

---

## Notes

### Migration sequencing
Apply `drizzle-auth/0004_per_agent_feature_groups.sql` against **both** local Docker Postgres and Supabase production before deploying. Code changes degrade gracefully if rows are missing (fallback to `claude-sonnet-4-6`), so you can deploy code first without outages — but models won't be independently configurable until the migration runs.

### Phase 3X compatibility (merge strategy)
Task 2 of this plan shows the **combined final `allowedTools`** for each specialist (Phase 3X tools + `search_knowledge_library`). When Phase 3X lands first:
- Phase 3X Tasks 8–10 will set the Phase 3X tool lists
- This plan's Task 2 adds `search_knowledge_library` on top — a one-line prepend to each `allowedTools` array plus the system prompt knowledge-library section

If implementing in parallel (worktrees), the only merge conflict will be `allowedTools` arrays and `BASE_PROMPT` strings — easily resolved manually using the combined lists above.

### `agent_specialist` retirement
Once Tasks 3–4 are live, `agent_specialist` in the DB is unused. The row stays (admin page labels it "legacy"). It can be pruned from `FEATURE_GROUPS` and the DB in a future cleanup pass after verifying no remaining call sites reference it.

### Future: per-user model preference (Phase 6+)
Currently model config is super-admin only (`/admin/models`). The per-agent group architecture makes it straightforward to add a `project_id` or `organization_id` scoped override to `model_settings` in a future phase, enabling project owners to choose their own cost/quality tradeoff. Out of scope here.

### Phase 6 token observability
`agent-integration.md` Phase 6 plans a cost dashboard showing median and p95 token spend per agent, with alerts if spend jumps >25% week-on-week. The per-agent groups introduced here are a prerequisite for meaningful per-agent cost tracking in that dashboard.
