# Brief Building Tab — Wireframe Port Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the live Brief → Building sub-tab UI with the locked Devtools-Rose wireframe layout (chip rows + aggregate sliders + AI brief preview pane), preserving every existing data binding (state, API calls, complexity score calculation, downstream cost/program triggers).

**Architecture:** Refactor `ProfilerMiddlePanel.tsx` in place — keep its state, handlers, and `/api/projects/{id}/profile` GET/PUT calls verbatim, but rewrite the JSX from spec-style sections + PowerFeatures sidebar into:
1. A single-column stack of cards (Class · Type, Scale, Complexity, Scope of Work, NCC + Est. Cost, Risk Flags, Disciplines) for the **left column** of a new 2-column grid.
2. A new `BriefPreviewPane.tsx` for the **right column** (Brief Generated status strip + Narrative + Inferred Objectives + Sources). Initial cut derives the narrative client-side from profile data; objectives reuse the existing `/api/projects/{id}/objectives/generate` endpoint.

`BriefPanel.tsx` (the sub-tab shell) hosts the new chrome (breadcrumb, H1, status pills, sub-tab meta lines) above the grid. The wireframe at `src/app/dev/brief-wireframe/page.tsx` becomes the visual reference and is deleted at the end.

**Tech Stack:** Next.js 15 App Router · React 18 · Tailwind v4 · Sitewise tokens (`--sw-*`, `[data-theme="sitewise"]`) · existing profile state/API · existing objectives endpoint

**Reference files:**
- Wireframe (visual ground truth): `src/app/dev/brief-wireframe/page.tsx`
- Live target component: `src/components/profiler/ProfilerMiddlePanel.tsx` (928 lines)
- Sub-tab shell: `src/components/brief/BriefPanel.tsx`
- Parent state container: `src/components/dashboard/ProcurementCard.tsx`
- Profile API: `src/app/api/projects/[projectId]/profile/route.ts`
- Objectives API: `src/app/api/projects/[projectId]/objectives/generate/route.ts`
- Chip option data source: `src/lib/data/profile-templates.json`
- Types: `src/types/profiler.ts`

---

## Task 0: Create feature branch

**Step 1:** From the project root, create a working branch.

```bash
git checkout -b sitewise/brief-building-port
```

**Step 2:** Confirm clean checkout.

```bash
git status
```

Expected: only the existing in-flight `M` files from prior sweeps. No new files.

---

## Task 1: Extract reusable primitives from the wireframe

**Files:**
- Create: `src/components/brief/primitives/Chip.tsx`
- Create: `src/components/brief/primitives/CardShell.tsx`
- Create: `src/components/brief/primitives/AggregateSlider.tsx`
- Create: `src/components/brief/primitives/index.ts`

These three components are copied verbatim from `src/app/dev/brief-wireframe/page.tsx` (the `Chip`, `CardShell`, `AggregateSlider` functions). Move them into `primitives/` as named exports so both the wireframe and the real Brief panel can import them; the wireframe will then import from `@/components/brief/primitives` until it's deleted.

**Step 1: Create `Chip.tsx`** — copy the `Chip` function from `src/app/dev/brief-wireframe/page.tsx` (lines ~316–344). Make it a **named** export with the same props (`label, selected?, accent?, onAccent?`). Add an optional `onClick?: () => void` prop and apply `cursor: pointer` when `onClick` is set. (Note: a11y handling for clickable chips — `role="button"`, `tabIndex={0}`, `aria-pressed`, key handler — is added in Task 3 when the first interactive caller is wired.)

**Step 2: Create `CardShell.tsx`** — copy `CardShell` (lines ~286–314). Same prop shape `{ label, meta?, children }`. Named export.

**Step 3: Create `AggregateSlider.tsx`** — copy `AggregateSlider` (lines ~389–456). Mark `'use client'` at the top. Named export.

**Step 4: Create `index.ts` barrel:**

```ts
export { Chip } from './Chip';
export { CardShell } from './CardShell';
export { AggregateSlider } from './AggregateSlider';
```

**Step 5: Update wireframe page** to import from the new location instead of having local copies. Delete the local definitions.

**Step 6: Verify wireframe still renders.** Visit `/dev/brief-wireframe` in the browser — the layout must look identical to before. (We're moving code, not changing it.)

**Step 7: Commit.**

```bash
git add src/components/brief/primitives/ src/app/dev/brief-wireframe/page.tsx
git commit -m "refactor: extract Brief wireframe primitives into shared components

Chip, CardShell, AggregateSlider moved from the dev wireframe into
src/components/brief/primitives/ so the live Brief panel can reuse
them in the Building tab port."
```

---

## Task 2: Build `BriefPreviewPane.tsx` (right column)

**Files:**
- Create: `src/components/brief/BriefPreviewPane.tsx`

This component takes the live profile data + project id and renders the right column shown in the wireframe: status strip (timestamp, model, token count), Narrative card, Inferred Objectives card, Sources footer.

**Initial cut:**
- **Status strip** — show `BRIEF GENERATED · {generatedAt} · {model} · {tokens} tok`. For now hardcode `model = 'claude-haiku-4-5'`, `tokens = 1840` and pass `generatedAt = new Date().toISOString()` from the parent. Wire to a real backend in a follow-up.
- **Narrative** — a derived sentence built client-side from `{ buildingClass, projectType, subclass, scaleData, complexity }`. Format: `"{ProjectName} is a {storeys}-storey, {units}-unit {subclass} {projectType} development… delivered as a {procurement_route} head contract on a {site_conditions} site adjacent to {heritage}." ` etc. Use the same inline-highlight tokens as the wireframe (rose-tint for the lede, lavender for procurement, cyan for performance targets, peach for currency).
  - Implement as a small pure function `buildNarrative(profile, projectName): React.ReactNode` co-located in this file.
- **Inferred Objectives** — fetch from `/api/projects/{projectId}/objectives/generate` (POST, no body needed per existing route). Render up to 6, each with `{id, text, tag}`. Tag colour by category: `programme`/`risk` → rose, `cost` → peach, `quality`/`stakeholder` → cyan, `authority` → lavender. Show counter `{reviewedCount} reviewed · {pendingCount} pending`.
  - Loading state: show 6 skeleton rows (mono `OBJ-0X` placeholder + grey shimmer line).
  - Error state: red status banner with "Failed to load objectives — retry".
- **Sources footer** — read counts from props (`docCount`, `profileFieldCount`, `knowledgeCount`). Initial cut: hardcode `(3, 12, 6)` — refine when real data is wired.

**Step 1: Sketch the component shape (write the file with its props interface).**

```tsx
'use client';
import type { ProfileInput } from '@/types/profiler';

interface BriefPreviewPaneProps {
  projectId: string;
  projectName: string;
  profile: ProfileInput;
}

export function BriefPreviewPane({ projectId, projectName, profile }: BriefPreviewPaneProps) {
  // ...
}
```

**Step 2: Implement the four sub-pieces (status strip, narrative, objectives, sources footer)** — copy structures from `src/app/dev/brief-wireframe/page.tsx` (functions `BriefStatusStrip`, `NarrativeCard`, `InferredObjectivesCard`, `SourcesFooter`, lines ~960–1110), adjusted to consume `profile` instead of stub data.

**Step 3: Implement `buildNarrative`** as a pure function that returns a `React.ReactNode` paragraph. Use the same inline `<span>` highlight pattern as the wireframe. If profile fields are missing, render placeholder spans like `[—]` so the narrative degrades gracefully.

**Step 4: Wire the objectives fetch.**

```tsx
useEffect(() => {
  let cancelled = false;
  setStatus('loading');
  fetch(`/api/projects/${projectId}/objectives/generate`, { method: 'POST' })
    .then(r => r.ok ? r.json() : Promise.reject(r))
    .then(data => { if (!cancelled) { setObjectives(data.objectives); setStatus('ready'); }})
    .catch(() => { if (!cancelled) setStatus('error'); });
  return () => { cancelled = true; };
}, [projectId]);
```

**Step 5: Run the dev server and verify the pane renders standalone** (drop it into `dev/brief-wireframe` temporarily, replacing the static right column, just to verify before wiring into the real BriefPanel).

**Step 6: Commit.**

```bash
git add src/components/brief/BriefPreviewPane.tsx
git commit -m "feat: add BriefPreviewPane (right column of Brief Building tab)

Renders status strip, narrative (derived client-side from profile),
inferred objectives (fetched from existing endpoint), sources footer.
Standalone verification only — not yet wired into BriefPanel."
```

---

## Task 3: Build `BuildingTabView.tsx` (left column — chip-row layout)

**Files:**
- Create: `src/components/brief/BuildingTabView.tsx`

This component renders the seven cards from the wireframe's left column, but consuming **live state and handlers from `ProfilerMiddlePanel`**. The cleanest move is to make `BuildingTabView` a controlled view that receives all state + setters as props, and have `ProfilerMiddlePanel` (later) become a thin wrapper that owns the state and renders this view.

**Step 1: Define the props interface** mirroring the existing internal state of `ProfilerMiddlePanel`:

```tsx
interface BuildingTabViewProps {
  // identity
  buildingClass: BuildingClass | null;
  projectType: ProjectType | null;
  // selections
  subclasses: string[];
  scaleData: Record<string, number | string>;
  complexity: Record<string, string | string[]>;
  workScope: string[];
  // aggregates
  complexityLevel: number;
  scopeLevel: number;
  // setters
  onClassChange: (cls: BuildingClass) => void;
  onTypeChange: (type: ProjectType) => void;
  onSubclassToggle: (subclassValue: string) => void;
  onScaleChange: (field: string, value: number | string) => void;
  onComplexityChange: (dimension: string, value: string) => void;
  onScopeToggle: (scopeValue: string) => void;
  onComplexityLevelChange: (level: number) => void;
  onScopeLevelChange: (level: number) => void;
  // template-driven option lists
  templates: ProfileTemplates;
}
```

**Step 2: Render the seven cards** matching the wireframe exactly:

1. **Class · Type card** — building class chips (8 options from `templates.buildingClasses`), project type chips (5 options), subclass chips (from selected building class's `subclasses`). Selected styles from wireframe.
2. **Scale card** — read field schema from `templates.scaleFields[buildingClass]`. Render each field with `{label, value, note?}` row. Edit affordance can be a click-to-edit input later; for now read-only display matches the wireframe.
3. **Complexity card** — composite score header (from existing `/api/projects/{id}/profile` GET response), then chip rows for each dimension in `templates.complexityOptions[buildingClass]`. Active chip uses per-dimension accent (peach for `quality_tier`, amber for `site_conditions / heritage / contamination / environmental_sensitivity`, cyan for `approval_pathway / access_constraints / operational_constraints`, lavender for `procurement_route / stakeholder_complexity`). Aggregate slider beneath.
4. **Scope of Work card** — chip rows grouped by category from `templates.workScopeOptions[projectType]`. Cyan accent for selected. Aggregate slider beneath, labelled `minimum` → `full scope`.
5. **NCC + Est. Cost strip** — read NCC class + Type from a new helper `deriveNCCClass(buildingClass, subclasses)` co-located in this file (initial mapping table — extract to its own file if it grows). Est. cost band from existing `complexityScore` × elemental rate range or a hardcoded band per project type for now (mark with a `// TODO: replace with real cost band derivation`).
6. **Risk Flags card** — render any `complexity` selections that have an associated `riskFlag` per `templates.complexityOptions[*][*].riskFlag` field. Existing `RiskFlags` component logic from `ProfilerMiddlePanel` (lines ~878–924) can be lifted/inlined.
7. **Disciplines card** — required + suggested split. Disciplines list is derived from `complexity` + `workScope` selections. Use existing `ConsultantPreview`/`deriveDisciplines` logic from `ProfilerMiddlePanel` if available; otherwise stub with `templates.disciplines.required` / `templates.disciplines.suggested` for now.

**Step 3: Add a11y handling to `Chip` for the new clickable callers.** Now that `BuildingTabView` invokes `Chip` with an `onClick`, harden `src/components/brief/primitives/Chip.tsx` so screen-reader and keyboard users can operate the chips:

```tsx
const interactive = Boolean(onClick);
<span
    onClick={onClick}
    role={interactive ? 'button' : undefined}
    tabIndex={interactive ? 0 : undefined}
    aria-pressed={interactive ? Boolean(selected) : undefined}
    onKeyDown={
        interactive
            ? (e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      onClick?.();
                  }
              }
            : undefined
    }
    style={{ ..., cursor: interactive ? 'pointer' : undefined }}
>
```

Verify: tabbing through a chip row focuses each chip, Space / Enter toggles selection, screen reader announces `pressed` / `not pressed`.

**Step 4: Visual verification** — drop `BuildingTabView` into `dev/brief-wireframe` temporarily, replacing the static left column with this component fed by mock data. Confirm it renders identically to the static wireframe.

**Step 5: Commit.**

```bash
git add src/components/brief/BuildingTabView.tsx
git commit -m "feat: add BuildingTabView (left column of Brief Building tab)

Controlled component rendering Class·Type, Scale, Complexity (chip
rows + slider), Scope of Work (chip rows + slider), NCC + Est. Cost,
Risk Flags, Disciplines. Consumes templates + state via props."
```

---

## Task 4: Refactor `ProfilerMiddlePanel.tsx` to use `BuildingTabView`

**Files:**
- Modify: `src/components/profiler/ProfilerMiddlePanel.tsx`

Task 3 introduced an exported `BuildingTabTemplates` interface in `BuildingTabView.tsx` — a flattened, per-class shape (`buildingClasses`, `projectTypes`, `subclassOptions`, `complexityDimensions`, `scopeGroups`, `scaleFields`). Task 4 must derive this from the underlying `ProfileTemplates` (class-indexed) by `useMemo` — do the flattening at the parent so `BuildingTabView` stays template-agnostic.

**Step 1: Read the current file end-to-end** to identify the rendering JSX (lines 580–924 per the survey) vs the state + handler logic above it. The state + handlers stay; the JSX is replaced.

**Step 2: Replace the rendering JSX** with a single `<BuildingTabView />` invocation, passing all the existing state values and handler functions through. The PowerFeatures sidebar (`ContextChips`, `ComplexityScore`, `MarketContext`, `RiskFlags`, `ConsultantPreview`) is no longer rendered separately — its content is now inline cards inside `BuildingTabView`.

**Step 3: Map current handlers to the props of `BuildingTabView`:**

| BuildingTabView prop | ProfilerMiddlePanel handler |
|---|---|
| `onClassChange` | existing `onClassChange` prop |
| `onSubclassToggle` | existing `selectSubclass` |
| `onComplexityChange` | existing `selectComplexityOption` |
| `onScopeToggle` | existing `selectScopeItem` |
| `onComplexityLevelChange` | existing `setComplexityLevel` setter |
| `onScopeLevelChange` | existing `setScopeLevel` setter |

**Step 4: Verify no regressions** — visit `/projects/{any-existing-projectId}?tab=brief&sub=building` in the browser. Confirm:
- Class/type/subclass chips show correctly
- Selecting a chip persists (PUT `/api/projects/{id}/profile` fires; check Network tab)
- Reloading the page restores the selection
- Complexity score updates after save

**Step 5: Commit.**

```bash
git add src/components/profiler/ProfilerMiddlePanel.tsx
git commit -m "refactor: render Brief Building tab via BuildingTabView

ProfilerMiddlePanel keeps its state + handlers + API calls; the JSX
is replaced with a single BuildingTabView invocation. Visual layout
moves from spec-sections + PowerFeatures sidebar to the Devtools
Rose chip-row + slider layout."
```

---

## Task 5: Wire the AI Brief preview pane in `BriefPanel.tsx`

**Files:**
- Modify: `src/components/brief/BriefPanel.tsx`

**Step 1: Update the `building` `<TabsContent>` block** to render a 2-column grid:

```tsx
<TabsContent value="building" className="...">
  <div className="grid gap-5 p-5" style={{ gridTemplateColumns: '1.4fr 1fr' }}>
    <ProfilerMiddlePanel /* existing props */ />
    <aside className="self-start sticky top-5">
      <BriefPreviewPane
        projectId={projectId}
        projectName={projectName ?? 'Project'}
        profile={profileData ?? defaultProfile()}
      />
    </aside>
  </div>
</TabsContent>
```

**Step 2: Add the missing `projectName` prop** to `BriefPanelProps` (and thread it down from `ProcurementCard`, which already has `selectedProject.name` available).

**Step 3: Pass `profile` correctly.** `profileData` already exists in `BriefPanelProps` (lines 24–30); just pass it through.

**Step 4: Visual verify** in the browser. The Building tab should now show the 7 cards on the left and the AI brief preview pane on the right.

**Step 5: Commit.**

```bash
git add src/components/brief/BriefPanel.tsx
git commit -m "feat: render BriefPreviewPane alongside Building tab

Building sub-tab now uses a 2-column grid: ProfilerMiddlePanel
(left), BriefPreviewPane (right, sticky)."
```

---

## Task 6: Add the chrome strip (breadcrumb, title, status pills, sub-tab meta)

**Files:**
- Modify: `src/components/brief/BriefPanel.tsx`

**Step 1: Add a chrome region above the `<TabsList>`** — breadcrumb + title block + status pills, mirroring the wireframe's `ChromeStrip` and `TitleBlock` functions (lines ~205–290 of the wireframe). Use the live `projectName` and a derived subtitle from `profileData`.

**Step 2: Update the sub-tab triggers** to render mono meta lines under each (`Lot — 14-22 Macquarie St · DP 1184227`, `Building — class 2 · 9 storeys · 87 units`, `Objectives — 6 generated · 4 reviewed`). Pull these from the live data: `projectName` for Lot, `profileData` for Building, objectives endpoint for Objectives.

**Step 3: Add `Export PDF` (stub — `console.log('export pdf clicked')` for now) and `Regenerate brief →` (calls the same objectives generate endpoint).**

**Step 4: Visual verify.**

**Step 5: Commit.**

```bash
git add src/components/brief/BriefPanel.tsx
git commit -m "feat: add Brief chrome (breadcrumb, title, status pills, sub-tab meta)

Top-of-panel chrome matches the locked wireframe; sub-tab triggers
gain mono meta lines. Export PDF + Regenerate Brief buttons added."
```

---

## Task 7: Delete the wireframe page

**Files:**
- Delete: `src/app/dev/brief-wireframe/page.tsx`

**Step 1: Verify the wireframe primitives are now imported only by real Brief components** (not by the wireframe page).

```bash
rg "from '@/components/brief/primitives'" src/
```

Expected: at least three matches inside `src/components/brief/`, no matches inside `src/app/dev/`.

**Step 2: Delete the wireframe page and the now-empty `dev/` directory if appropriate.**

```bash
rm src/app/dev/brief-wireframe/page.tsx
rmdir src/app/dev/brief-wireframe src/app/dev 2>/dev/null || true
```

**Step 3: Typecheck.**

```bash
npx tsc --noEmit -p tsconfig.json 2>&1 | grep -E "(brief|profiler|dev/)" | head
```

Expected: no errors mentioning the deleted path.

**Step 4: Commit.**

```bash
git add src/app/dev/brief-wireframe/page.tsx
git commit -m "chore: remove Brief wireframe page

Wireframe served its purpose; the real Brief Building tab is now
in BriefPanel + BuildingTabView + BriefPreviewPane."
```

> **Important:** stage ONLY the wireframe file. `git add -A` will sweep up unrelated in-flight changes from the working tree.

---

## Task 8: Cross-browser visual verification

**Step 1: Start the dev server.**

```bash
npm run dev
```

**Step 2: Hit `/projects/{existingProjectId}?tab=brief&sub=building`** and verify:
- Chrome strip: breadcrumb, H1 "Brief", status pills, action buttons
- Sub-tab strip: Lot · **Building** (active, rose underlined) · Objectives, with mono meta below each
- Left column cards render in the right order with chip rows + sliders
- Right column: status strip (black), narrative with rose/cyan/peach/lavender highlights, OBJ list with tag colours, sources footer
- Sliders are draggable; their dot is brown; releasing the dot updates state
- Selecting a chip triggers a PUT to `/api/projects/{id}/profile`
- Refreshing the page restores all selections

**Step 3: Test the Lot and Objectives sub-tabs** still work (we didn't touch them, but verify the chrome change didn't break tab switching).

**Step 4: If anything is off, file follow-up tasks** rather than patching here. The plan's scope is the Building tab.

---

## Task 9: Final wrap

**Step 1: Run typecheck.**

```bash
npx tsc --noEmit -p tsconfig.json 2>&1 | wc -l
```

Expected: same count as before this plan started (currently 253) — no new errors introduced.

**Step 2: Push branch.**

```bash
git push -u origin sitewise/brief-building-port
```

**Step 3: Open a PR** with a screenshot of the new Building tab, list of files changed, and a "follow-ups" section noting:
- AI brief generation endpoint (currently the narrative is derived client-side; objectives are fetched from the existing endpoint)
- Real "Export PDF" wiring
- Slider snap-to-tier logic (currently the sliders update local state but don't yet drive chip selections — that's a UX refinement to land separately)
- Disciplines / Risk Flags derivation may need extracting from `ProfilerMiddlePanel` into shared helpers if the cards live in `BuildingTabView`

---

## Out of scope for this plan

- **Lot sub-tab redesign** — separate plan when needed.
- **Objectives sub-tab redesign** — separate plan when needed.
- **Real AI brief generation endpoint** — current cut derives narrative client-side and reuses objectives endpoint; an `/api/projects/{id}/brief/generate` endpoint that returns `{ narrative, objectives, sources, model, tokens, generatedAt }` is the obvious follow-up.
- **Slider snap-to-tier logic** — sliders are draggable but the dimensions don't yet snap to the slider position. UX refinement task.
- **Status pill data** — `profile: 92% complete` and `stage: detail design` are currently static; wire to real progress / project-stage data later.
- **Restore Scale-field editability.** Task 4 made Scale rows read-only per Task 3's spec; Task 5 must reintroduce `onScaleChange` plumbing so users can edit storeys / GFA / units inline.
- **Restore the ~9 risk rules dropped from `RiskFlags`.** The legacy `RiskFlags` component checked hotel scale plausibility (luxury + 200+ rooms; 3-star + <50), aged-care viability (<60 beds, dementia ratio), data-centre Tier IV, mixed-use transfer structures, top-secret / SCI security, very-remote sites, live operations, biosafety 3+, and heritage adaptive reuse. `deriveRiskFlags` in Task 4 covers ~half. Port the remaining checks.
- **Restore scale-threshold disciplines.** Legacy `ConsultantPreview` triggered Wind (storeys ≥ 15), Traffic (car_parks ≥ 100), Cost Planning (gfa_sqm ≥ 10000) from scale thresholds. `deriveDisciplines` no longer reads `scaleData`. Add scale-threshold triggers.
- **MarketContext / ContextChips data**: the per-subclass benchmark tables (typical GFA, beds/keys, cost ranges with AIQS/AIHW/HVS source attribution) and region/currency/programme chips are intentionally absent from the new layout. Future task: add a "Benchmarks" expansion of the Cost card or a Sources drawer.
- **NCC Type A/B/C derivation** — current helper conservatively omits `typeAndVolume` for everything except Class 1a (Vol 2). Implement the full NCC C2D2 rise-in-storeys mapping (function of class + storeys + storey separation) when needed.
- **Real `estCostBand` derivation** — currently returns `null` for all inputs. Wire to `CostBenchmark` per region/subclass/quality_tier.
- **Move `Save` / `Load Profile` buttons from `ProfilerMiddlePanel` into the chrome strip.** Task 4 left them stranded above the cards with a TODO; Task 6 added the chrome but didn't relocate them. Today the user sees two button rows (chrome `Export PDF`/`Regenerate brief`, then internal `Load profile`/`Save`). Consolidate into the chrome strip.
- **Real generation metadata.** `generatedAt`, `model`, `tokens` in `BriefPreviewPane`'s status strip are hardcoded (`claude-haiku-4-5`, `1840`). Wire to real metadata when a `/api/projects/{id}/brief/generate` endpoint lands.
- **Single-source POST on regenerate.** `BriefPanel.handleRegenerateBrief` POSTs to `/objectives/generate`, then bumps `refreshKey` which makes `BriefPreviewPane` GET the same data. Acceptable but redundant — collapse to one round-trip via an imperative callback or by lifting `objectives` state to `BriefPanel`.
