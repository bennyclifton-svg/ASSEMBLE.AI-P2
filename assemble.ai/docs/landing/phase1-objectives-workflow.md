# Phase 1 — Landing Copy & Design Spec

**Purpose:** Marketing landing page copy for the Objectives generation workflow, with enough UI detail to feed into Claude Design for high-fidelity prototyping.

**Workflow covered:** Two-path Objectives generation — Configure & Infer (Path A) and Upload & Extract (Path B) — both refined through a two-stage Generate → Polish loop.

---

## Workflow summary (for design tool context)

The Objectives tab in assemble.ai produces structured project objectives via two distinct user-triggered stages:

- **Stage 1 — Generate.** One click. Combines three parallel inputs (175 hand-written rules, semantic search across 15 expert guides, raw profile values) and feeds them to Claude. Output: short bullets (2-5 words each), grouped by category, split into Functional & Quality and Planning & Compliance.

- **Stage 2 — Polish.** One click. Re-runs the knowledge retrieval (no rules), takes the existing bullets, and feeds them to Claude with strict expansion instructions. Output: same bullets expanded to 10-15 words with cited Australian Standards (AS / NCC) — references constrained to those found in retrieved knowledge chunks.

Both stages preserve user edits. Every AI-generated state is saved with `originalAi` for revert.

---

# Section 1 — Two paths intro

**Eyebrow:** `HOW PROJECTS START`

**Headline (serif):** *Two paths to a configured project. One iterative refinement loop.*

**Subhead:**
> Whether you're starting from a blank brief or an existing one, your project objectives go through the same two-stage flow: **Generate** a structured shortlist, then **Polish** it into tender-ready language. Grounded in **175 construction-specific rules** and **15 expert guides** at every step.

**Anchor CTAs (pill buttons, copper accent):** `Configure & Infer →` `Upload & Extract →`

### Graphic spec

- Horizontally split hero diagram
- **Left half:** Form-icon stack representing Building tab (slider + dropdown + checkbox icons in muted gray)
- **Right half:** Document-icon stack representing uploads (PDF + DOCX glyphs)
- Both halves connect to a **central two-circle motif** — Circle 1 labelled `Generate` (small bullets), Circle 2 labelled `Polish` (expanded bullets), connected by a thin copper arrow
- Final output panel below the circles shows the polished bullet structure
- On scroll, both halves animate inward, then the Generate→Polish chain pulses copper twice

---

# Section 2 — Path A: Configure & Infer

**Eyebrow:** `PATH A — STARTING FROM SCRATCH`

**Headline (serif):** *Configure your building. Generate. Polish. Done.*

**Lede:**
> No brief? Configure the project once, then watch a two-stage AI workflow turn your selections into a structured set of objectives — first as a fast shortlist, then as tender-ready language with cited Australian Standards.

---

## Sub-section 2A — The Configuration

**Step indicator:** `Stage 0 — Configuration`

**Body:**
> Answer structured questions across seven dimensions: **Region**, **Building Class**, **Project Type**, **Subclass**, **Scale** (numeric), **Complexity factors**, and **Work Scope**. No blank-page anxiety — every field is a constrained choice with an inference attached.

### Visual element

A 3-column grid of input cards, each card representing one dimension. Cards animate in left-to-right with a faint copper border-glow as they "complete." Card content matches the actual UI (region pill at top, class buttons row, type buttons row, etc.).

---

## Sub-section 2B — Stage 1: Generate

**Step indicator:** `Stage 1 — Generate`

**Headline:** *One click. Three signals. A structured shortlist.*

**Body:**
> The Generate button kicks off three parallel processes — all reading from your project profile:

### Three-column inline grid

| **Rules engine** | **Knowledge retrieval** | **Profile values** |
|---|---|---|
| 175 hand-written rules evaluate against your selections | Semantic search across 15 expert guides (NCC, AS Standards, residential, commercial, structural, MEP, contracts, more) | Your raw selections passed verbatim |
| Returns a deduped list of suggested objective items, each with a confidence flag and `explicit` / `inferred` source tag | Returns the top 5 most relevant chunks, with relevance scores, from filtered domains | Sets the scene — "commercial new build, 6 storeys, premium tier" |

**Body continues:**
> Claude receives all three as parallel context and writes **Iteration 1** — short, scannable bullets (2-5 words each), grouped by category, split into Functional & Quality and Planning & Compliance.

### Iteration 1 example panel (mockup design)

A two-column "after Generate" preview card showing real output:

```
FUNCTIONAL & QUALITY                PLANNING & COMPLIANCE
Design Requirements                 Regulatory Compliance
• 6-storey commercial offices      • NCC 2022 compliance
• Open-plan floor plates           • Fire engineering report
• Premium specification level      • BASIX certification

Quality Standards                   Certification Requirements
• Curtain wall facade              • DDA accessibility
• Engineered timber finishes       • Acoustic separation
```

Style: card with subtle shadow, copper-coloured `<strong>` headers, gray `<li>` items, monospace-ish feel to convey "structured output."

### Graphic spec

- Pipeline visualisation, left to right, scroll-animated
- Three input nodes (Rules / RAG / Profile) merge into a single Claude node (copper-glowing core)
- Claude node "emits" the bullet card on the right
- Below the pipeline, three small counters animate up as the pipeline runs:
  - `Rules matched: 0 → 12`
  - `Domain chunks: 0 → 5`
  - `Bullets generated: 0 → 14`
- Total time ~3 seconds — show a thin time bar underneath

---

## Sub-section 2C — Stage 2: Polish

**Step indicator:** `Stage 2 — Polish`

**Headline:** *One more click. Tender-ready language with cited standards.*

**Body:**
> The Polish button takes your existing bullets and runs **Iteration 2** — Claude expands each bullet to 10-15 words, adds specific Australian Standards references, and makes objectives measurable where possible. Two strict rules applied:
>
> **1. No invented standards.** Polish only cites AS/NCC references found in the retrieved knowledge chunks.
>
> **2. No reordering or removing.** Every input bullet maps to exactly one output bullet. User edits are preserved.

### Iteration 2 transformation panel (side-by-side mockup)

A horizontally split "before / after" card:

| Before Polish | After Polish |
|---|---|
| `NCC 2022 compliance` | `Deliver design documentation compliant with NCC 2022 Volume One requirements` |
| `Fire safety provisions` | `Incorporate fire safety provisions per AS 1530.4 and AS 1668.1 standards` |
| `BASIX certification` | `Achieve BASIX certification with minimum 40% energy reduction target` |
| `Acoustic separation` | `Provide acoustic separation per AS 2107 occupancy classification` |
| `Curtain wall facade` | `Specify curtain wall system meeting AS 4284 weatherproofing performance` |

Visual treatment: left column gray background, right column subtle copper background. A thin animated "expansion" arrow between the two columns. Standards references (AS XXXX, NCC) highlighted in copper.

### Graphic spec

- Same Claude core glow as Stage 1 but **without** the rules engine input — only RAG + existing content + profile feed in
- Animation shows the bullets *growing* horizontally, with new tokens fading in
- Highlight the AS/NCC citations as they appear with a subtle copper underline pulse
- Above the diagram, a small note: *"No new bullets added. No bullets removed. Just expanded."*

---

## Sub-section 2D — The user is in control

**Headline:** *Edit at any step. Revert to the original. Re-polish.*

**Body:**
> Bullets are editable in the Rich Text Editor at any stage. Every AI-generated state is saved with `originalAi` preserved, so a user can revert to the original generation, manually rewrite, or re-polish their edits. Edit history compounds — earlier versions are kept.

### Visual element

A small "version stack" component showing three states:

- `ai_generated` (Stage 1 output)
- `manual` (user edit shown as gray-bordered box)
- `ai_polished` (Stage 2 output)

Each badge clickable to show its content. Restore button next to each.

---

# Section 3 — Path B: Upload & Extract

**Eyebrow:** `PATH B — STARTING WITH DOCUMENTS`

**Headline (serif):** *Already have a brief? Same flow, different first move.*

**Lede:**
> Drop client briefs, Statements of Environmental Effects, or design objective documents into the project. We extract objectives directly from your files — same two-stage workflow, but Stage 1 reads from your documents, not from rules.

### Three-stage rail

**Stage 0 — Attach documents.**
Documents are auto-OCR'd, chunked, and indexed in pgvector. Drag-and-drop on the right-hand document panel.

**Stage 1 — Generate (extraction mode).**
Two purpose-built RAG queries — one for functional/quality, one for planning/compliance — search across your attached documents. The top 15 chunks per query, reranked to 5, plus your domain knowledge context, plus your profile, all feed Claude. Claude **extracts** rather than *invents* — the prompt explicitly constrains it to objectives that are stated or clearly implied in the source documents.

**Stage 2 — Polish (identical to Path A).**
The Polish button works the same way — expand bullets to 10-15 words, add cited Australian Standards, preserve structure.

### Cross-mode parity callout

> **Path B's Polish behaves identically to Path A's Polish.** Once your bullets exist — whether they came from rules or from documents — the same expansion, the same citations, the same constraints apply.

### Graphic spec

- Mirror Section 2's Stage-1/Stage-2 diagram
- Stage 1 column shows: documents (left) → RAG lens (centre) → bullet output (right)
- Stage 2 column is a *literal copy* of Section 2's Polish diagram — visually emphasises that this stage is identical across paths
- Labelled badge above Stage 2: *"Same as Path A"*

---

# Section 4 — Tech credibility strip

**Eyebrow:** `BUILT FOR AUSTRALIAN CONSTRUCTION`

**Headline (serif):** *AI that's grounded, then refined.*

**Lede:**
> Most "AI for construction" gives you one shot at output. We give you two — a structured generate, then a referenced polish. Grounded inputs at every step.

### Six-tile feature grid (3 cols × 2 rows)

| Tile | Headline | Body |
|---|---|---|
| 🇦🇺 | **Australian-first** | NCC 2022, AS Standards, BASIX, NatHERS, state-aware. Not retrofitted. |
| 📚 | **15 expert guides** | Hand-written knowledge across NCC, AS Standards, residential, commercial, structural, civil, MEP, contracts, procurement, scheduling, remediation. |
| ⚙️ | **175 rules** | Curated rule engine with explicit + inferred logic and confidence flags. JSON-evaluated, not vibes. |
| 🔁 | **Two-stage refinement** | Generate produces a shortlist. Polish expands and cites. Two distinct prompts, two distinct purposes. |
| 🎯 | **Cited, never invented** | Polish is constrained to AS/NCC references found in the retrieved chunks. No hallucinated standards. |
| 🔐 | **Bring your own knowledge** | Upload your firm's standard specs or prior project records as private domains. They join the same retrieval pipeline. |

### Graphic spec

- Subtle constellation/network SVG behind tiles
- Nodes labelled with tag names (`ncc`, `as-standards`, `commercial`, `structural`, etc.)
- Lines pulse copper as tiles enter viewport
- Reuses `CircuitBoardGraphic` aesthetic for visual consistency

---

# Section 5 — End-to-end timeline (optional)

**Eyebrow:** `THE WHOLE FLOW`

**Headline (serif):** *Configured project to tender-ready objectives. Two minutes.*

### Horizontal timeline component

```
0:00 ─── Project created
0:30 ─── Building configured (Stage 0)
0:45 ─── Generate clicked  (Stage 1 — short bullets in 3 seconds)
1:00 ─── User reviews, edits 2 bullets
1:15 ─── Polish clicked    (Stage 2 — expanded bullets in 4 seconds)
1:30 ─── Tender-ready objectives, with cited AS/NCC standards
```

Visual treatment: a thin horizontal track with 6 checkpoints. Each checkpoint glows copper as it's hit. Below the timeline, a small video/screen recording of the actual flow at 2× speed.

---

# Implementation handoff for Claude Design

## Component map (matching repo conventions)

```
src/components/landing/
├── PathsIntroSection.tsx                   ← Section 1
├── ConfigurePathSection/
│   ├── index.tsx                           ← Section 2 wrapper
│   ├── ConfigurationStage.tsx              ← 2A
│   ├── GenerateStage.tsx                   ← 2B
│   ├── PolishStage.tsx                     ← 2C
│   └── ControlPanel.tsx                    ← 2D
├── UploadPathSection.tsx                   ← Section 3
├── TechCredibilitySection.tsx              ← Section 4
├── EndToEndTimelineSection.tsx             ← Section 5
├── data/landing-data.ts                    ← All copy
└── graphics/
    ├── PathsSplitGraphic.tsx
    ├── GeneratePipelineGraphic.tsx
    ├── PolishExpansionGraphic.tsx
    ├── DocumentExtractionGraphic.tsx
    └── TimelineGraphic.tsx
```

## Key visual primitives to define

1. **Stage badge** — small copper-bordered chip, `Stage X — Label`, used at top of each sub-section
2. **Pipeline node** — circle with icon, gray default, copper-glow on activation
3. **Bullet card** — three states: `ai_generated` (gray border), `manual` (dashed border), `ai_polished` (copper border)
4. **Iteration arrow** — copper, thin, with optional duration label (`~3s`)
5. **Citation pill** — inline copper-tinted span for `AS XXXX` and `NCC XXXX` references
6. **Counter** — animated numeric counter (`0 → 12 rules matched`) — easing in over ~600ms

## Colour tokens

- Background: `var(--gray-50)`
- Headlines: `var(--gray-800)`, serif
- Body: `var(--gray-600)`
- Accent: `var(--color-accent-copper)` — used sparingly for emphasis, citations, active states
- Stage 1 mode: cool gray
- Stage 2 mode: warm copper-tinted gray

## Animation budget

- Each section: scroll-reveal with 200ms stagger
- Pipeline graphics: 1.5–2s play through
- Bullet expansion (Polish): 800ms width grow + token fade-in
- Counter increments: 600ms ease-out

## Numbers to keep accurate (build-time injection recommended)

- 175 rules (currently in metadata)
- 15 expert guides
- 16 knowledge domains
- 7 configuration dimensions
- 8 Australian states/territories
- 4 confidence/source flags (high/medium/low + explicit/inferred)
- 2 stages (Generate, Polish)
