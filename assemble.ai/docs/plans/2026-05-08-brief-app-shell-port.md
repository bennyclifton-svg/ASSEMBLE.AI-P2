# Brief App Shell — Phase 2 Wireframe Port Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Port the outer Sitewise app shell (left nav, top-tab removal, surface tones, watermark, avatar position, save/load button consolidation) to match the locked wireframe — keeping the right-rail Documents repository as a global affordance.

**Architecture:** Rebuild `PlanningCard` from scratch as the wireframe-shaped left nav (wordmark + project switcher card + workflow nav group + reference nav group + Ask card). Move the section tabs (Cost Planning / Program / Procurement / Notes / Correspondence / Meet & Report) out of `ProcurementCard`'s top strip into the left nav as items. Remove the center-panel watermark. Promote `ProfilerMiddlePanel`'s stranded Save / Load Profile buttons into `BriefPanel`'s chrome strip. Confirm `[data-theme="sitewise"]` is the default and document the localStorage flush for existing users.

**Tech Stack:** Next.js 15 App Router · React 18 · Tailwind v4 · Sitewise tokens (`--sw-*`, `[data-theme="sitewise"]`) · existing `centerActiveTab` URL-driven state in `ProjectWorkspace` · existing `ProjectSwitcher` / `StakeholderNav` / `KnowledgeNav` data sources

**Branch:** Continue on `sitewise/brief-building-port` (already on origin) so Phase 1 + Phase 2 ship as one PR. Same review cadence.

**Reference files:**
- Wireframe (visual ground truth — now deleted, recover from `bb515f1^` if needed): `src/app/dev/brief-wireframe/page.tsx` at base `16d72ca`. Or read `src/components/brief/primitives/Chip.tsx` etc. for the design language.
- Live target: `src/components/dashboard/PlanningCard.tsx` (left nav — ~80 lines, complete rebuild)
- Live target: `src/components/dashboard/ProcurementCard.tsx` (top tabs strip removal — lines 299-318)
- Layout: `src/components/layout/ResizableLayout.tsx` (left header + watermark + right-rail header)
- Brief chrome shell: `src/components/brief/BriefPanel.tsx` (Save/Load promotion target)
- Profiler form: `src/components/profiler/ProfilerMiddlePanel.tsx` (Save/Load source — already TODO'd)
- State container: `src/app/projects/[projectId]/page.tsx` (passes `setCenterActiveTab` down — needs to thread to PlanningCard)

---

## Task 0: Confirm branch + theme starting state

**Step 1:** Confirm we're on the right branch and clean.

```bash
cd "D:/AI Projects/assemble.ai P2/assemble.ai"
git status
git branch --show-current   # expect: sitewise/brief-building-port
git log --oneline -3
```

**Step 2:** Confirm `data-theme="sitewise"` is the default in the theme init script.

```bash
grep -A 3 "validThemes" src/app/layout.tsx
```

Expected: the script lists `'sitewise', 'precision', 'precision-light'` and defaults to `'sitewise'` when localStorage is empty. Already done in Phase 1 — verify only.

**Step 3:** Note the localStorage caveat for users on existing browsers. The init script reads `localStorage.theme`. Anyone who set `'precision'` or `'precision-light'` in a prior session keeps that — they won't see Sitewise tones until they clear it. Add a one-line dev note to the plan's Out-of-Scope section saying "users with stored theme preferences need a one-time DevTools → Application → Local Storage flush; documented in PR description."

---

## Task 1: Move section tabs OUT of ProcurementCard

**Files:**
- Modify: `src/components/dashboard/ProcurementCard.tsx` lines 281-318 (remove `tabClassName` const + `<TabsList>` JSX block)

The `<Tabs>` wrapper stays so the existing `<TabsContent value="..." />` branches keep working. We only delete the `<TabsList>` (the visible tab strip) — `activeMainTab` continues to drive content via `<TabsContent>` value matching. The new left nav (Task 3) will call `setActiveMainTab` instead.

**Step 1:** Remove the `tabClassName` const (lines ~281-289) — no longer needed.

**Step 2:** Remove the `<TabsList>...</TabsList>` block (lines ~299-318). Keep the surrounding `<Tabs value={activeMainTab} onValueChange={setActiveMainTab}>` wrapper and all `<TabsContent>` children.

**Step 3:** Adjust outer container — the original `<Tabs>` had `flex-1 flex flex-col px-6 min-h-0` to leave room for the tab strip; now the content can fill the panel. Check whether `px-6` should stay (probably yes for consistent gutter) or come down (Brief content owns its own padding). Default: keep `px-6`.

**Step 4: Verify** — `npx tsc --noEmit` clean for `ProcurementCard.tsx`. Visit any project page; visually confirm no tab strip at the top of the middle panel. The current `activeMainTab` (default 'brief') still renders its content (BriefPanel).

**Step 5: Commit.**

```bash
git add src/components/dashboard/ProcurementCard.tsx
git commit -m "refactor: remove ProcurementCard top tabs strip

Section navigation moves to the left nav per the locked wireframe.
The Tabs wrapper + TabsContent branches stay so activeMainTab still
drives content switching."
```

---

## Task 2: Sitewise nav primitives

**Files:**
- Create: `src/components/dashboard/nav/SitewiseNavItem.tsx`
- Create: `src/components/dashboard/nav/SitewiseNavGroup.tsx`
- Create: `src/components/dashboard/nav/SitewiseProjectSwitcherCard.tsx`
- Create: `src/components/dashboard/nav/SitewiseAskCard.tsx`
- Create: `src/components/dashboard/nav/index.ts`

These four primitives are the wireframe's left-nav atoms. Each should be a pure functional component, no external state.

**Step 1: Create `SitewiseNavItem.tsx`** — vertical menu item with optional rose left edge when active, label on the left, mono `⌥N` shortcut on the right, white-fill on active. Visual reference: wireframe `NavItem` function (recover via `git show 16d72ca:src/app/dev/brief-wireframe/page.tsx | grep -A 30 'function NavItem'`).

```tsx
'use client';

interface SitewiseNavItemProps {
    label: string;
    kbd?: string;
    active?: boolean;
    onClick?: () => void;
}

export function SitewiseNavItem({ label, kbd, active, onClick }: SitewiseNavItemProps) {
    return (
        <button
            type="button"
            onClick={onClick}
            className="flex items-center justify-between px-2.5 py-2 transition-colors text-left"
            style={{
                fontSize: 13,
                fontWeight: active ? 600 : 500,
                color: active ? 'var(--sw-ink)' : 'var(--sw-muted)',
                background: active ? 'white' : 'transparent',
                border: active ? '1px solid var(--sw-rule)' : '1px solid transparent',
                borderLeft: active ? '2px solid var(--sw-rose)' : '2px solid transparent',
                cursor: 'pointer',
            }}
        >
            <span>{label}</span>
            {kbd && (
                <span style={{
                    fontFamily: 'var(--sw-font-mono)',
                    fontSize: 10,
                    color: 'var(--sw-muted)',
                    opacity: 0.7,
                }}>
                    {kbd}
                </span>
            )}
        </button>
    );
}
```

**Step 2: Create `SitewiseNavGroup.tsx`** — section header (mono uppercase 0.18em label) + slot for `SitewiseNavItem` children, with optional hairline divider above.

```tsx
'use client';

interface SitewiseNavGroupProps {
    label?: string;
    showDivider?: boolean;
    children: React.ReactNode;
}

export function SitewiseNavGroup({ label, showDivider, children }: SitewiseNavGroupProps) {
    return (
        <div className="flex flex-col gap-px">
            {showDivider && <div style={{ height: 1, background: 'var(--sw-rule)', margin: '8px 0' }} />}
            {label && (
                <div style={{
                    fontFamily: 'var(--sw-font-mono)',
                    fontSize: 10,
                    color: 'var(--sw-muted)',
                    letterSpacing: '0.18em',
                    textTransform: 'uppercase',
                    padding: '0 10px 4px',
                }}>
                    {label}
                </div>
            )}
            {children}
        </div>
    );
}
```

**Step 3: Create `SitewiseProjectSwitcherCard.tsx`** — paper-on-paper card showing `foundry/` mono prefix + project name + `⌄` chevron. Wraps the existing `ProjectSwitcher` so clicking opens its dropdown. This is the wireframe's project switcher card pattern.

```tsx
'use client';

import { ChevronDown } from 'lucide-react';
import { ProjectSwitcher } from '../ProjectSwitcher';

interface SitewiseProjectSwitcherCardProps {
    selectedProject: { id: string; name: string; code: string; status: string } | null;
    onSelectProject: (project: { id: string; name: string; code: string; status: string } | null) => void;
    refreshTrigger?: number;
}

export function SitewiseProjectSwitcherCard({
    selectedProject,
    onSelectProject,
    refreshTrigger,
}: SitewiseProjectSwitcherCardProps) {
    if (!selectedProject) return null;
    return (
        <ProjectSwitcher
            selectedProject={selectedProject}
            onSelectProject={onSelectProject}
            refreshTrigger={refreshTrigger}
        >
            <button
                type="button"
                className="flex items-center justify-between px-3 py-2 w-full text-left transition-colors hover:bg-white"
                style={{ background: 'white', border: '1px solid var(--sw-rule)' }}
            >
                <span className="flex flex-col items-start min-w-0">
                    <span style={{
                        fontFamily: 'var(--sw-font-mono)',
                        fontSize: 10,
                        color: 'var(--sw-muted)',
                        letterSpacing: '0.05em',
                    }}>
                        foundry/
                    </span>
                    <span style={{
                        fontSize: 13,
                        fontWeight: 600,
                        color: 'var(--sw-ink)',
                    }} className="truncate">
                        {selectedProject.name}
                    </span>
                </span>
                <ChevronDown className="w-3.5 h-3.5 flex-shrink-0" style={{ color: 'var(--sw-muted)' }} />
            </button>
        </ProjectSwitcher>
    );
}
```

**Step 4: Create `SitewiseAskCard.tsx`** — pinned-bottom widget with `// ASK` mono label, the current question text, and a `⌘K` + `↵` row. For v1 it's a click-to-focus trigger that emits an `onActivate?` event (the parent decides whether to focus the existing ChatDock or just no-op).

```tsx
'use client';

interface SitewiseAskCardProps {
    placeholder?: string;
    onActivate?: () => void;
}

export function SitewiseAskCard({
    placeholder = 'Ask sitewise…',
    onActivate,
}: SitewiseAskCardProps) {
    return (
        <button
            type="button"
            onClick={onActivate}
            className="p-3 w-full text-left transition-colors hover:bg-white"
            style={{ background: 'white', border: '1px solid var(--sw-rule)' }}
        >
            <div style={{
                fontFamily: 'var(--sw-font-mono)',
                fontSize: 10,
                color: 'var(--sw-rose-dk)',
                letterSpacing: '0.1em',
                marginBottom: 8,
            }}>
                // ASK
            </div>
            <div style={{ fontSize: 12, lineHeight: 1.45, color: 'var(--sw-ink)' }}>
                {placeholder}
            </div>
            <div className="mt-2 flex justify-between items-center">
                <span style={{
                    fontFamily: 'var(--sw-font-mono)',
                    fontSize: 10,
                    color: 'var(--sw-muted)',
                }}>
                    ⌘K
                </span>
                <span style={{
                    background: 'var(--sw-rose)',
                    color: 'var(--sw-ink)',
                    padding: '2px 6px',
                    fontSize: 10,
                    fontFamily: 'var(--sw-font-mono)',
                    fontWeight: 700,
                }}>
                    ↵
                </span>
            </div>
        </button>
    );
}
```

**Step 5: Create `index.ts` barrel:**

```ts
export { SitewiseNavItem } from './SitewiseNavItem';
export { SitewiseNavGroup } from './SitewiseNavGroup';
export { SitewiseProjectSwitcherCard } from './SitewiseProjectSwitcherCard';
export { SitewiseAskCard } from './SitewiseAskCard';
```

**Step 6: Typecheck.**

```bash
npx tsc --noEmit -p tsconfig.json 2>&1 | grep -E "dashboard/nav" | head
```

Expected: clean.

**Step 7: Commit.**

```bash
git add src/components/dashboard/nav/
git commit -m "feat: add Sitewise left-nav primitives

SitewiseNavItem, SitewiseNavGroup, SitewiseProjectSwitcherCard,
SitewiseAskCard — atoms for the wireframe-shaped left nav.
Pure presentational; no internal state."
```

---

## Task 3: Rebuild `PlanningCard` against the wireframe

**Files:**
- Modify: `src/components/dashboard/PlanningCard.tsx` (complete rewrite — file currently ~80 lines)

The new `PlanningCard` becomes a single column: wordmark + project switcher card + workflow nav group + reference nav group + Ask card pinned at bottom.

**Step 1: Add new prop `onMainTabChange?: (tab: string) => void`** to `PlanningCardProps`. This fires when the user clicks a workflow nav item — wired by `ProjectWorkspace` to `setCenterActiveTab`.

**Step 2: Define the nav items as data:**

```tsx
const WORKFLOW_ITEMS: Array<{ tab: string; label: string; kbd: string }> = [
    { tab: 'brief',          label: 'Brief',         kbd: '⌥1' },
    { tab: 'cost-planning',  label: 'Cost Planning', kbd: '⌥2' },
    { tab: 'program',        label: 'Program',       kbd: '⌥3' },
    { tab: 'procurement',    label: 'Procurement',   kbd: '⌥4' },
    { tab: 'notes',          label: 'Notes',         kbd: '⌥5' },
    { tab: 'correspondence', label: 'Correspondence', kbd: '⌥6' },
    { tab: 'meetings-reports', label: 'Meet & Report', kbd: '⌥7' },
];

const REFERENCE_ITEMS: Array<{ tab: string; label: string; kbd: string }> = [
    { tab: 'stakeholders', label: 'Stakeholders', kbd: '⌥8' },
    { tab: 'knowledge',    label: 'Knowledge',    kbd: '⌥9' },
];
```

(The exact `tab` slugs MUST match what `<TabsContent value="..." />` expects in `ProcurementCard.tsx`. Read that file to confirm slug alignment — the live values are likely `'cost-planning' | 'program' | 'procurement' | 'notes' | 'correspondence' | 'meetings-reports' | 'stakeholders' | 'knowledge' | 'brief'`. Any mismatch will silently render nothing.)

**Step 3: Render the new layout:**

```tsx
return (
    <aside
        className="flex flex-col h-full p-4 gap-4 overflow-hidden"
        style={{ background: 'var(--sw-paper-2)', borderRight: '1px solid var(--sw-rule)' }}
    >
        {/* ResizableLayout already renders the wordmark in its left header,
            so PlanningCard does NOT render it again. If Task 5 deletes the
            ResizableLayout left header, move the wordmark in here. */}

        {selectedProject && onSelectProject && (
            <SitewiseProjectSwitcherCard
                selectedProject={selectedProject}
                onSelectProject={onSelectProject}
                refreshTrigger={refreshKey}
            />
        )}

        <SitewiseNavGroup>
            {WORKFLOW_ITEMS.map(item => (
                <SitewiseNavItem
                    key={item.tab}
                    label={item.label}
                    kbd={item.kbd}
                    active={activeMainTab === item.tab}
                    onClick={() => onMainTabChange?.(item.tab)}
                />
            ))}
        </SitewiseNavGroup>

        <SitewiseNavGroup label="Reference" showDivider>
            {REFERENCE_ITEMS.map(item => (
                <SitewiseNavItem
                    key={item.tab}
                    label={item.label}
                    kbd={item.kbd}
                    active={activeMainTab === item.tab}
                    onClick={() => onMainTabChange?.(item.tab)}
                />
            ))}
        </SitewiseNavGroup>

        <div className="mt-auto">
            <SitewiseAskCard onActivate={() => {/* TODO: focus ChatDock */}} />
        </div>
    </aside>
);
```

**Step 4: Drop the old imports** — `BriefSection`, `StakeholderNav`, `KnowledgeNav`, the `Box` lucide icon, the inline `ProjectSwitcher` markup. Keep `ProjectSwitcher` referenced via `SitewiseProjectSwitcherCard`.

**Step 5: Don't delete the old components yet** — `BriefSection` carried the brief / tender / rec / award status indicators. The wireframe drops these per design intent. Add a comment in `PlanningCard` linking to the deferral note in the plan's "Out of scope" section, and leave `BriefSection.tsx`, `StakeholderNav.tsx`, `KnowledgeNav.tsx` in place (other files may still import them — confirm with grep).

```bash
grep -rn "from.*BriefSection\|from.*StakeholderNav\|from.*KnowledgeNav" src/ --include="*.tsx" | head
```

If only `PlanningCard.tsx` referenced them (which is now removed), they're orphaned but safe — flag for follow-up cleanup.

**Step 6: Visual + type verify** — typecheck `PlanningCard.tsx`. Run dev server, click each new nav item, confirm `centerActiveTab` URL changes correctly and content swaps.

**Step 7: Commit.**

```bash
git add src/components/dashboard/PlanningCard.tsx
git commit -m "refactor(PlanningCard): rebuild as Sitewise wireframe left nav

Replaces the BriefSection / StakeholderNav / KnowledgeNav stack with
a single workflow nav group (Brief, Cost Planning, Program, Procurement,
Notes, Correspondence, Meet & Report) + a Reference group (Stakeholders,
Knowledge). Project switcher card at top, Ask card pinned at bottom.

Brief sub-state indicators (brief/tender/rec/award dots from BriefSection)
are intentionally dropped to match the locked wireframe; restoration is
queued as a follow-up."
```

---

## Task 4: Wire `PlanningCard` to `ProjectWorkspace`'s tab setter

**Files:**
- Modify: `src/app/projects/[projectId]/page.tsx` (the `ProjectWorkspace` component — find the `<PlanningCard ... />` invocation)

**Step 1:** Locate the `<PlanningCard />` JSX (likely inside `<ResizableLayout>`'s `leftContent` slot).

**Step 2:** Add `onMainTabChange={setCenterActiveTab}` to the prop list. `setCenterActiveTab` already exists in `ProjectWorkspace` and is passed to `ProcurementCard` as `onMainTabChange`.

**Step 3:** Visual verify — click a workflow item in the left nav, confirm:
- The URL updates (`?tab=program` etc.)
- The middle panel renders the new tab's content
- The clicked left nav item gets the rose left edge

**Step 4: Commit.**

```bash
git add src/app/projects/[projectId]/page.tsx
git commit -m "feat: wire PlanningCard tab clicks to centerActiveTab

Left-nav workflow items now drive the middle panel via the existing
setCenterActiveTab; URL stays the source of truth."
```

---

## Task 5: Remove the center-panel watermark + tighten ResizableLayout

**Files:**
- Modify: `src/components/layout/ResizableLayout.tsx`

The watermark was the old `logo-mask.svg` rendered absolute-positioned in the center panel. The wireframe doesn't show one; it's just visual noise on paper.

**Step 1:** Remove the `<img src="/images/logo-mask.svg" ... />` block inside the center Panel content. Keep the `data-chat-dock-anchor="center"` div and the spacer div.

**Step 2:** Confirm the left panel header still renders the wordmark (per Task 6 of the previous plan). Decide: keep the wordmark in `ResizableLayout`'s left header, OR move it into `PlanningCard` itself for a single-column-feel (like the wireframe). PRAGMATIC: keep it in `ResizableLayout` so it sticks at the very top of the panel even when the nav scrolls. Leave alone unless visual review says otherwise.

**Step 3:** The right panel header already renders `Documents /repo` mono, the chevron toggle, and `<UserProfileDropdown />` (the avatar). Per the wireframe the "BC" avatar lives in the right rail header, top-right corner — confirm this is what live shows. If the avatar is somewhere else, move it into the `<UserProfileDropdown>` slot or replace.

**Step 4: Commit.**

```bash
git add src/components/layout/ResizableLayout.tsx
git commit -m "chore: drop logo-mask watermark from center panel

The wireframe's paper background carries no watermark; the mask was
adding visual noise. Avatar position in the right-rail header is
unchanged (already wireframe-aligned)."
```

---

## Task 6: Promote Save / Load Profile into BriefPanel chrome strip

**Files:**
- Modify: `src/components/profiler/ProfilerMiddlePanel.tsx` (remove the Save / Load buttons block)
- Modify: `src/components/brief/BriefPanel.tsx` (add Save / Load to the chrome action row, conditionally rendered for the Building sub-tab)

**Step 1:** Read `ProfilerMiddlePanel.tsx` lines around 1019-1039 (the action row with Save / Load Profile buttons). Note their handler names (`handleSave`, `handleLoad`) and the `isSaving` / `isLoading` state.

**Step 2:** Lift the handlers and state up to `ProfilerMiddlePanel`'s parent (`BriefPanel.tsx`)? No — that's invasive. Instead, expose them as imperative callbacks: `BriefPanel` keeps a `useRef<{ save: () => void; load: () => void } | null>(null)` and `ProfilerMiddlePanel` accepts a `controlsRef` prop and assigns the ref's current value to `{ save: handleSave, load: handleLoad }` on mount.

```tsx
// In BriefPanel.tsx, near the chrome buttons:
const profilerControlsRef = useRef<{ save: () => void; load: () => void; isSaving: boolean; isLoading: boolean } | null>(null);

// In the chrome's action row, before Export PDF / Regenerate brief:
{activeSubTab === 'building' && (
    <>
        <button onClick={() => profilerControlsRef.current?.load()} ...>Load profile</button>
        <button onClick={() => profilerControlsRef.current?.save()} ...>Save</button>
    </>
)}
```

```tsx
// In ProfilerMiddlePanel.tsx:
useImperativeHandle(controlsRef, () => ({
    save: handleSave,
    load: handleLoad,
    isSaving,
    isLoading,
}));
```

This is more wiring than is ideal but avoids reflowing all of `ProfilerMiddlePanel`'s state up. Acceptable for v1.

**ALTERNATIVE (preferred if simple):** Just delete the buttons from `ProfilerMiddlePanel` and add a `Save` / `Load` to the chrome that fires PUT/GET against `/api/projects/{id}/profile` directly using the data already in `BriefPanel`'s scope (`profileData`, `buildingClass`, etc.). The handler logic is small (PUT body construction is ~10 lines). This duplicates a tiny bit of code but keeps `ProfilerMiddlePanel` cleaner.

**Decision: go with the alternative.** Co-locate small `briefPanelHandleSave` / `briefPanelHandleLoad` inside `BriefPanel.tsx`. Read `ProfilerMiddlePanel.handleSave` at lines ~850-900 to mirror the payload shape exactly. Pass `onProfileLoad` callback to refresh derived state.

**Step 3:** Style Save / Load buttons to match the chrome's `Export PDF` ghost style (1px ink rule border, mono uppercase 11px). Active states: `Saving…` / `Loading…` while in-flight.

**Step 4:** Remove the action row from `ProfilerMiddlePanel.tsx`. The `handleSave` / `handleLoad` functions can stay (or be deleted if `BriefPanel` now owns them — your call) but the JSX block goes away.

**Step 5:** Visual verify — clicking Save / Load in the chrome triggers PUT / GET respectively (Network tab); clicking Save persists; reloading the page restores selections.

**Step 6: Commit.**

```bash
git add src/components/brief/BriefPanel.tsx src/components/profiler/ProfilerMiddlePanel.tsx
git commit -m "feat(BriefPanel): consolidate Save / Load Profile into chrome strip

Removes the stranded Load profile / Save action row from
ProfilerMiddlePanel; the buttons now live in BriefPanel's chrome
alongside Export PDF and Regenerate brief, gated to the Building
sub-tab.

PUT/GET payload shape preserved verbatim against the existing
/api/projects/{id}/profile contract."
```

---

## Task 7: Cross-browser visual verification

**Step 1:** Start the dev server.

```bash
npm run dev
```

**Step 2:** **Clear `localStorage.theme` first** if you've been testing — DevTools → Application → Local Storage → delete the `theme` key (or set to `'sitewise'`). Hard refresh.

**Step 3:** Visit `/projects/{id}?tab=brief&sub=building`. Verify:

- **Left nav**:
  - `sitewise` two-tone wordmark in panel header
  - Project switcher card with `foundry/` + project name + chevron
  - Workflow group: Brief (active, rose edge) / Cost Planning / Program / Procurement / Notes / Correspondence / Meet & Report — each with `⌥N` mono shortcut on the right
  - `Reference` divider with mono uppercase label
  - Reference group: Stakeholders / Knowledge — same styling
  - Ask card pinned at the bottom with `// ASK` mono label and `⌘K`/`↵` row
- **Top of middle panel**:
  - NO section tab strip (Cost Planning / Program / etc. — those moved to the left nav)
  - Chrome strip from Phase 1 still in place (breadcrumb, H1, status pills, Export PDF / Regenerate brief, with Save / Load now alongside)
  - Sub-tabs: Lot · Building · Objectives with mono meta lines
- **Right rail**:
  - `Documents /repo` mono header with avatar in top-right
  - No watermark in the center panel
- **Surfaces**:
  - Left nav: warm paper-2
  - Center: warm paper
  - Right rail: warm paper-2
  - All text in ink, mono labels in muted

**Step 4:** Click each left-nav workflow item. Confirm:
- URL updates to `?tab={slug}`
- Center panel renders matching content
- Active state shifts (rose edge)

**Step 5:** Click `Save` then `Load` in the chrome — Network tab should show PUT then GET against `/api/projects/{id}/profile`.

**Step 6:** Click `Regenerate brief →` — chrome subtitle stamps `regenerated HH:MM:SS`, right pane re-fetches objectives, status strip timestamp updates (this is the fix from `f1d3a9d`).

---

## Task 8: Final wrap

**Step 1:** Run typecheck.

```bash
npx tsc --noEmit -p tsconfig.json 2>&1 | wc -l
```

Expected: 253 (the pre-Phase-1 baseline). No regression introduced by the shell port.

**Step 2:** Confirm clean diff against origin.

```bash
git status
git log --oneline origin/sitewise/brief-building-port..HEAD
```

**Step 3:** Push.

```bash
git push
```

The existing PR at `https://github.com/bennyclifton-svg/ASSEMBLE.AI-P2/pull/new/sitewise/brief-building-port` updates automatically. Update the PR body to add a "Phase 2 — App shell" section listing the new commits.

---

## Out of scope for this plan

- **Brief sub-state indicators** (brief / tender / rec / award dots from `BriefSection.tsx`) — intentionally dropped to match wireframe. If users miss them, restore as small mono status chips in the Brief nav item itself or as a status pill in the chrome strip.
- **Stakeholders / Knowledge nav iconography** — the live `StakeholderNav` and `KnowledgeNav` had icon affordances. The wireframe is icon-free; this matches user direction. Keep `StakeholderNav.tsx` and `KnowledgeNav.tsx` files in place (they're orphaned by `PlanningCard` but other places may still import them — confirm via grep before any cleanup pass).
- **`BriefSection.tsx`** is now orphaned. Leave in place for one PR cycle; delete in a follow-up after confirming nothing else imports it.
- **Theme migration for existing users** — anyone with `localStorage.theme` set to `'precision'` or `'precision-light'` keeps that until they clear it. Document in PR description with the DevTools instruction. Optional: add a one-time migration that flips legacy values to `'sitewise'` if we want to force everyone onto the new theme.
- **Ask card → ChatDock wiring** — Task 2's `SitewiseAskCard` accepts an `onActivate` prop but `PlanningCard` passes a no-op. Wire to focus / open the existing global ChatDock when ready.
- **Keyboard shortcuts** — `⌥1`–`⌥9` are visual only. Wiring real keyboard handlers (likely a `useEffect` in `ProjectWorkspace` listening on `keydown` with `event.altKey`) is a small follow-up.
- **Avatar position** — assumed to already be in the right-rail header from Phase 1. If it isn't, move into `UserProfileDropdown`'s render slot inside `ResizableLayout`'s right header.
