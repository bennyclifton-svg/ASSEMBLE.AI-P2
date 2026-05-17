# Client-Side Pivot — Landing, Health Check, Pricing Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Reposition Sitewise from "tender intelligence" to "client-side PM workspace" across the three public pages (`/`, `/assessment`, `/pricing`) and the NavBar. Tender becomes one module. The agent team (7 specialists) becomes the differentiator.

**Architecture:** Copy + structure rewrite, not a re-platform. New `AgentRosterSection` component carries the lifecycle story. Existing `TenderFeaturesSection` is recycled and slimmed to 3 cards as a "spotlight". `TenderIntelligenceSection` and `TenderCredibilitySection` are deleted (off-message). Health Check is rebuilt from 3 tender-only pillars (Scope/Field/Process) to 3 lifecycle pillars (Design/Procure/Deliver), 9 questions, "2-min". Pricing is copy-only — no Polar product changes. Schema gets new pillar columns added (additive, old columns preserved for historical data).

**Tech Stack:** Next.js 15 App Router · React 19 · Tailwind v4 with TESSERA design tokens (`--sw-*`) · Drizzle ORM on Supabase Postgres · Lucide icons · Vitest for unit tests.

**Positioning anchor (verbatim copy that recurs across the plan):**
- Headline: *"Brief to handover. From your side of the table."*
- Sub: *"The AI-staffed workspace for architects, project managers and in-house developer teams running building projects on behalf of an owner."*
- ProcurePro is **not** named anywhere on site. The phrase "client-side" does the foil work.

**Design constraints from project memory:**
- TESSERA tokens only — no hardcoded colors/spacing (`feedback_global_styles.md`)
- No dropdowns; prefer inline buttons / segmented controls (`feedback_no_dropdowns.md`)
- "Client-side" terminology, not "owner-side" (`project_au_construction_roles.md`)
- Wordmark: `sitewise/` mono lowercase (`project_product_name_sitewise.md`)

---

## Verification approach

Most of this work is UI copy + structure. There are no useful behavioural tests for marketing copy. Verification is:

- **Unit tests** only for the pure scoring function (`calculateScores`) and the API request shape — `vitest run`
- **Visual** for everything else — `npm run dev`, open `/`, `/assessment`, `/pricing` in a browser, confirm the section renders, confirm no console errors, confirm responsive layout at 1280 / 768 / 375 widths
- **Schema** for the migration — `npm run db:push` succeeds, `npm run db:studio` shows the new columns

If you cannot run a browser, say so explicitly in the commit message and request the user verify visually.

---

## Task 1: NavBar — update primary CTA label

**Files:**
- Modify: `src/components/landing/NavBar.tsx:65` (the "Take Health Check" link text)

**Step 1: Edit the label**

Change the visible text on the primary CTA from `Take Health Check` to `Project Health Check`. The `href="/assessment"` stays.

```tsx
// before (line 56-66)
<Link
    href="/assessment"
    className="inline-flex items-center gap-2 px-4 py-2 text-[12px] font-bold uppercase tracking-[0.12em] transition-colors"
    style={{
        fontFamily: 'var(--sw-font-mono)',
        background: 'var(--sw-rose)',
        color: 'var(--sw-ink)',
    }}
>
    Take Health Check
</Link>
```

```tsx
// after
<Link
    href="/assessment"
    className="inline-flex items-center gap-2 px-4 py-2 text-[12px] font-bold uppercase tracking-[0.12em] transition-colors"
    style={{
        fontFamily: 'var(--sw-font-mono)',
        background: 'var(--sw-rose)',
        color: 'var(--sw-ink)',
    }}
>
    Project Health Check
</Link>
```

**Step 2: Verify in browser**

Run: `npm run dev`
Open: `http://localhost:3000`
Confirm: NavBar shows `PROJECT HEALTH CHECK` (uppercase via `tracking` class) on the right.

**Step 3: Commit**

```bash
git add src/components/landing/NavBar.tsx
git commit -m "nav(landing): rename CTA from 'Take Health Check' → 'Project Health Check'"
```

---

## Task 2: FinalCTASection — replace tender-only copy

**Files:**
- Modify: `src/components/landing/FinalCTASection.tsx` (eyebrow, h2, sub, button label)

**Step 1: Edit copy in place**

Edit the four copy blocks. Layout, animations, colors stay identical.

```tsx
// eyebrow (line 27)
{'// Free project diagnostic'}

// h2 (line 40)
Find the weak point in your project before the next package goes out.

// sub paragraph (line 51-52)
Answer 9 questions across design, procurement and delivery. Get an instant score and meet the agents that close your weakest gap.

// button label (line 64)
Take the 2-min Health Check
```

**Step 2: Verify in browser**

Reload `/`. Scroll to the rose-tinted CTA section near the bottom. Confirm new copy renders. Click button → goes to `/assessment`.

**Step 3: Commit**

```bash
git add src/components/landing/FinalCTASection.tsx
git commit -m "landing(cta): broaden final CTA from tender to project-wide"
```

---

## Task 3: TenderFeaturesSection — slim to 3 cards + reframe heading

**Files:**
- Modify: `src/components/landing/TenderFeaturesSection.tsx`

**Step 1: Cut the FEATURES array from 5 to 3**

Keep only `Scope packages`, `Compare submissions`, `Generate award reports` (codes `01`, `04`, `05`). Renumber to `01`, `02`, `03`.

```tsx
const FEATURES = [
    {
        code: '01',
        title: 'Scope packages',
        body: 'Turn project requirements into tenderable scopes, inclusions, exclusions and deliverables.',
        icon: ClipboardList,
        accent: 'var(--sw-rose)',
    },
    {
        code: '02',
        title: 'Compare submissions',
        body: 'Review price, scope gaps, qualifications and non-price criteria in a structured evaluation.',
        icon: GitCompare,
        accent: 'var(--sw-cyan)',
    },
    {
        code: '03',
        title: 'Generate award reports',
        body: 'Draft tender recommendations from the evidence already captured in the workspace.',
        icon: ScrollText,
        accent: 'var(--sw-amber)',
    },
];
```

**Step 2: Find the section heading inside the JSX and reframe it**

Locate the existing `<h2>` and eyebrow in the section. Change the eyebrow and headline copy to reframe this as a spotlight on one of the agents:

- Eyebrow: `// One module · Procurement Agent`
- Headline: `Starting with the most painful module — tender.`
- Sub: `The Procurement Agent runs every tender package from scope to award. It's the deepest module today; the rest of the team works the same way.`

Read the existing heading block to find exact line numbers before editing — the file's `Read` output earlier only covered lines 1-50.

**Step 3: Remove unused icon imports**

The original imports `ClipboardList, FileCheck2, FileSearch, GitCompare, ScrollText`. With the cut we only use `ClipboardList, GitCompare, ScrollText`. Remove `FileCheck2` and `FileSearch` from the import line.

**Step 4: Verify in browser**

Reload `/`. The tender section should now show 3 cards instead of 5, with the new heading.

**Step 5: Commit**

```bash
git add src/components/landing/TenderFeaturesSection.tsx
git commit -m "landing(tender): slim spotlight to 3 cards, reframe as one agent's module"
```

---

## Task 4: Create AgentRosterSection — the new lifecycle/team section

**Files:**
- Create: `src/components/landing/AgentRosterSection.tsx`
- Modify: `src/components/landing/index.ts` (export)

**Step 1: Write the component**

Create `src/components/landing/AgentRosterSection.tsx` with this content:

```tsx
import {
    Compass,
    PencilRuler,
    GavelIcon,
    HardHat,
    Calculator,
    Calendar,
    Mail,
} from 'lucide-react';
import { ScrollReveal } from './shared/ScrollReveal';

type Agent = {
    code: string;
    name: string;
    role: string;
    icon: typeof Compass;
    accent: string;
    crossCutting?: boolean;
};

const PHASE_AGENTS: Agent[] = [
    {
        code: '01',
        name: 'Feasibility Agent',
        role: 'Site, planning, environmental DD, stakeholders.',
        icon: Compass,
        accent: 'var(--sw-rose)',
    },
    {
        code: '02',
        name: 'Design Agent',
        role: 'Brief, consultants, design review, DA.',
        icon: PencilRuler,
        accent: 'var(--sw-peach)',
    },
    {
        code: '03',
        name: 'Procurement Agent',
        role: 'Tender, evaluation, contract execution.',
        icon: GavelIcon,
        accent: 'var(--sw-cyan)',
    },
    {
        code: '04',
        name: 'Delivery Agent',
        role: 'Contract admin, variations, claims, defects.',
        icon: HardHat,
        accent: 'var(--sw-lav)',
    },
];

const ALWAYS_ON_AGENTS: Agent[] = [
    {
        code: '05',
        name: 'Finance Agent',
        role: 'Cost plan, cashflow, contingency, monthly reporting.',
        icon: Calculator,
        accent: 'var(--sw-amber)',
        crossCutting: true,
    },
    {
        code: '06',
        name: 'Program Agent',
        role: 'Master programme, milestones, delays, EOT support.',
        icon: Calendar,
        accent: 'var(--sw-amber)',
        crossCutting: true,
    },
    {
        code: '07',
        name: 'Correspondence Agent',
        role: 'Emails, letters, RFIs, transmittals, register.',
        icon: Mail,
        accent: 'var(--sw-amber)',
        crossCutting: true,
    },
];

export function AgentRosterSection() {
    return (
        <section
            id="team"
            className="relative overflow-hidden py-24"
            style={{ background: 'var(--sw-paper-2)', fontFamily: 'var(--sw-font-sans)' }}
        >
            <div className="relative max-w-[1280px] mx-auto px-8">
                <ScrollReveal>
                    <p
                        className="mb-3"
                        style={{
                            fontFamily: 'var(--sw-font-mono)',
                            fontSize: 11,
                            color: 'var(--sw-rose-dk)',
                            letterSpacing: '0.18em',
                            textTransform: 'uppercase',
                            fontWeight: 700,
                        }}
                    >
                        // Your client-side team
                    </p>
                    <h2
                        className="m-0 max-w-[820px] text-balance"
                        style={{
                            fontFamily: 'var(--sw-font-sans)',
                            fontSize: 'clamp(34px, 4.4vw, 54px)',
                            fontWeight: 800,
                            lineHeight: 1.04,
                            letterSpacing: '-0.03em',
                            color: 'var(--sw-ink)',
                        }}
                    >
                        Seven specialists. One workspace. Always on.
                    </h2>
                    <p
                        className="mt-5 max-w-[680px]"
                        style={{
                            fontFamily: 'var(--sw-font-body)',
                            fontSize: 17,
                            lineHeight: 1.6,
                            color: 'var(--sw-muted)',
                        }}
                    >
                        Sitewise gives you a virtual team built for the client side of the table.
                        Four agents move with the project. Three more work across every phase.
                    </p>
                </ScrollReveal>

                <ScrollReveal>
                    <div
                        className="mt-12"
                        style={{
                            fontFamily: 'var(--sw-font-mono)',
                            fontSize: 10,
                            color: 'var(--sw-muted)',
                            letterSpacing: '0.18em',
                            textTransform: 'uppercase',
                            fontWeight: 700,
                            marginBottom: 12,
                        }}
                    >
                        Phase team
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                        {PHASE_AGENTS.map((agent) => (
                            <AgentCard key={agent.code} agent={agent} />
                        ))}
                    </div>
                </ScrollReveal>

                <ScrollReveal>
                    <div
                        className="mt-10"
                        style={{
                            fontFamily: 'var(--sw-font-mono)',
                            fontSize: 10,
                            color: 'var(--sw-muted)',
                            letterSpacing: '0.18em',
                            textTransform: 'uppercase',
                            fontWeight: 700,
                            marginBottom: 12,
                        }}
                    >
                        Always-on team
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        {ALWAYS_ON_AGENTS.map((agent) => (
                            <AgentCard key={agent.code} agent={agent} />
                        ))}
                    </div>
                </ScrollReveal>
            </div>
        </section>
    );
}

function AgentCard({ agent }: { agent: Agent }) {
    const Icon = agent.icon;
    return (
        <div
            className="p-5"
            style={{
                background: 'var(--sw-paper)',
                border: '1px solid var(--sw-rule)',
            }}
        >
            <div className="flex items-center gap-2.5">
                <Icon
                    size={18}
                    strokeWidth={1.8}
                    style={{ color: agent.accent }}
                    aria-hidden="true"
                />
                <span
                    style={{
                        fontFamily: 'var(--sw-font-mono)',
                        fontSize: 10,
                        color: agent.accent,
                        letterSpacing: '0.18em',
                        textTransform: 'uppercase',
                        fontWeight: 700,
                    }}
                >
                    {agent.code}
                </span>
            </div>
            <div
                className="mt-3"
                style={{
                    fontFamily: 'var(--sw-font-sans)',
                    fontSize: 17,
                    fontWeight: 700,
                    color: 'var(--sw-ink)',
                    letterSpacing: '-0.01em',
                }}
            >
                {agent.name}
            </div>
            <div
                className="mt-2"
                style={{
                    fontFamily: 'var(--sw-font-body)',
                    fontSize: 14,
                    lineHeight: 1.5,
                    color: 'var(--sw-muted)',
                }}
            >
                {agent.role}
            </div>
        </div>
    );
}
```

**Step 2: Add export to landing index**

Modify `src/components/landing/index.ts` — add line near the other exports:

```ts
export { AgentRosterSection } from './AgentRosterSection';
```

**Step 3: Verify it compiles**

Run: `npm run dev`
Expected: server starts without TypeScript errors. The component is exported but not yet used — confirm no build break.

**Step 4: Commit**

```bash
git add src/components/landing/AgentRosterSection.tsx src/components/landing/index.ts
git commit -m "landing(agents): add AgentRosterSection for the seven-agent team"
```

---

## Task 5: Wire the new landing page shape

**Files:**
- Modify: `src/app/(public)/page.tsx`

**Step 1: Replace the current section list**

The new shape: `Hero → AgentRoster → TenderFeatures (slimmed) → FinalCTA`. Drop `TenderIntelligenceSection` and `TenderCredibilitySection`.

```tsx
import { NavBar } from '@/components/landing/NavBar';
import { HeroSection } from '@/components/landing/HeroSection';
import { AgentRosterSection } from '@/components/landing/AgentRosterSection';
import { TenderFeaturesSection } from '@/components/landing/TenderFeaturesSection';
import { FinalCTASection } from '@/components/landing/FinalCTASection';
import { FooterSection } from '@/components/landing/FooterSection';

export default function LandingPage() {
    return (
        <>
            <NavBar />
            <main>
                <HeroSection />
                <AgentRosterSection />
                <TenderFeaturesSection />
                <FinalCTASection />
            </main>
            <FooterSection />
        </>
    );
}
```

**Step 2: Verify in browser**

Reload `/`. Confirm sections in order: Hero (still old copy at this point) → Agent Roster (new) → Tender (3 cards) → Final CTA. No console errors.

**Step 3: Commit**

```bash
git add src/app/(public)/page.tsx
git commit -m "landing(page): wire new four-section shape, drop intelligence + credibility sections"
```

---

## Task 6: Rewrite HeroSection — new copy + Agent Roster panel

**Files:**
- Modify: `src/components/landing/HeroSection.tsx`

This is the biggest single edit. Replace the headline, sub, hero feature chips, and the right-side `TenderConsole` mockup. The `BookDemoDialog` plumbing and the layout grid stay as they are.

**Step 1: Replace the eyebrow, headline, sub, and feature chips**

```tsx
// eyebrow chip text
Brief to handover · client-side delivery

// h1 (replace the current "Run better tenders, faster.")
<h1 ...>
    Brief to handover.{' '}
    <span style={{ color: 'var(--sw-rose)' }}>From your side of the table.</span>
</h1>

// sub paragraph
Sitewise is the AI-staffed workspace for architects, project managers and in-house developer teams running building projects on behalf of an owner.

// HERO_FEATURES array — replace with five lifecycle verbs, not tender steps
const HERO_FEATURES = [
    { label: 'Develop the brief', icon: ClipboardCheck, color: 'var(--sw-rose)' },
    { label: 'Procure consultants', icon: Send, color: 'var(--sw-peach)' },
    { label: 'Tender packages', icon: FileSearch, color: 'var(--sw-cyan)' },
    { label: 'Run contract admin', icon: GitCompare, color: 'var(--sw-lav)' },
    { label: 'Close out and hand over', icon: ClipboardCheck, color: 'var(--sw-amber)' },
];
```

**Step 2: Update CTA labels**

```tsx
// primary CTA (the rose link)
Take the 2-min Health Check

// secondary CTA (Book a demo) — already correct, leave
```

**Step 3: Replace the TenderConsole mockup with an AgentRoster mini-panel**

Replace the entire `TenderConsole` function (currently lines 153-254) with `HeroAgentRoster`. The visual treatment (dark card, mono header bar, rose accent strip) stays similar so the hero composition isn't disrupted.

```tsx
function HeroAgentRoster() {
    const ROSTER = [
        { code: '01', name: 'Feasibility Agent',    role: 'Site · planning · DD',       active: false },
        { code: '02', name: 'Design Agent',         role: 'Brief · consultants',         active: true  },
        { code: '03', name: 'Procurement Agent',    role: 'Tender · evaluation',         active: true  },
        { code: '04', name: 'Delivery Agent',       role: 'CA · variations',             active: false },
        { code: '05', name: 'Finance Agent',        role: 'Cost plan · cashflow',        active: true  },
        { code: '06', name: 'Program Agent',        role: 'Master programme',            active: false },
        { code: '07', name: 'Correspondence Agent', role: 'RFIs · letters · register',   active: true  },
    ];

    return (
        <div
            className="overflow-hidden"
            style={{
                background: 'var(--sw-ink-2)',
                border: '1px solid rgba(255,255,255,0.08)',
                boxShadow: '0 30px 80px -20px rgba(0,0,0,0.62)',
            }}
        >
            <div
                className="flex items-center justify-between px-4 py-3"
                style={{
                    borderBottom: '1px solid rgba(255,255,255,0.06)',
                    fontFamily: 'var(--sw-font-mono)',
                    fontSize: 11,
                }}
            >
                <span style={{ color: 'rgba(232,228,218,0.55)' }}>team.workspace</span>
                <span style={{ color: 'var(--sw-amber)' }}>4 active</span>
            </div>

            <div className="p-5">
                <div
                    className="mb-4"
                    style={{
                        fontFamily: 'var(--sw-font-mono)',
                        fontSize: 10,
                        color: 'var(--sw-rose)',
                        letterSpacing: '0.18em',
                        textTransform: 'uppercase',
                        fontWeight: 700,
                    }}
                >
                    Your client-side team
                </div>

                <div className="grid gap-2">
                    {ROSTER.map((agent) => (
                        <div
                            key={agent.code}
                            className="grid grid-cols-[36px_1fr_auto] gap-3 items-center px-3 py-2.5"
                            style={{
                                background: 'rgba(255,255,255,0.035)',
                                border: '1px solid rgba(255,255,255,0.07)',
                            }}
                        >
                            <span
                                style={{
                                    fontFamily: 'var(--sw-font-mono)',
                                    fontSize: 10,
                                    color: 'rgba(232,228,218,0.45)',
                                    letterSpacing: '0.08em',
                                }}
                            >
                                {agent.code}
                            </span>
                            <div className="flex items-baseline gap-2 min-w-0">
                                <span
                                    style={{
                                        fontFamily: 'var(--sw-font-sans)',
                                        fontSize: 13,
                                        fontWeight: 700,
                                        color: '#E8E4DA',
                                    }}
                                >
                                    {agent.name}
                                </span>
                                <span
                                    style={{
                                        fontFamily: 'var(--sw-font-mono)',
                                        fontSize: 10,
                                        color: 'rgba(232,228,218,0.45)',
                                        letterSpacing: '0.04em',
                                    }}
                                >
                                    {agent.role}
                                </span>
                            </div>
                            <span
                                style={{
                                    width: 7,
                                    height: 7,
                                    background: agent.active ? 'var(--sw-cyan)' : 'rgba(232,228,218,0.18)',
                                }}
                                aria-hidden="true"
                            />
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
```

Then replace the `<TenderConsole />` call site (around line 144) with `<HeroAgentRoster />`. Delete the old `TenderConsole` function.

**Step 4: Verify in browser**

Reload `/`. The hero should show:
- Eyebrow "BRIEF TO HANDOVER · CLIENT-SIDE DELIVERY"
- Headline "Brief to handover. From your side of the table." (rose on the second sentence)
- Five lifecycle chip rows
- Two CTAs (rose primary "Take the 2-min Health Check", outline "Book a demo")
- Right side: dark agent roster card with 7 rows, 4 with cyan dots

Check at 1280, 768, 375 widths. The roster should stack below the headline at narrow widths.

**Step 5: Commit**

```bash
git add src/components/landing/HeroSection.tsx
git commit -m "landing(hero): pivot to client-side positioning, swap TenderConsole for HeroAgentRoster"
```

---

## Task 7: Health Check schema migration

**Files:**
- Modify: `src/lib/db/pg-schema.ts:2158-2172` (assessmentWaitlist table)

**Step 1: Add new pillar columns alongside the old**

Old columns (`scope_score`, `field_score`, `process_score`, `weakest_pillar`) stay for historical data. New columns are added.

```ts
export const assessmentWaitlist = pgTable('assessment_waitlist', {
    id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
    email: text('email').notNull().unique(),
    name: text('name'),
    source: text('source').default('assessment_landing'),
    overallScore: integer('overall_score'),
    // legacy tender pillars — preserved for historical data, no longer written
    scopeScore: integer('scope_score'),
    fieldScore: integer('field_score'),
    processScore: integer('process_score'),
    // new lifecycle pillars
    designScore: integer('design_score'),
    procureScore: integer('procure_score'),
    deliverScore: integer('deliver_score'),
    weakestPillar: text('weakest_pillar'),
    answers: jsonb('answers'),
    createdAt: timestamp('created_at').defaultNow(),
}, (table) => [
    index('idx_assessment_waitlist_created').on(table.createdAt),
]);
```

**Step 2: Apply the migration**

Run: `npm run db:push`
Expected: Drizzle prompts for the additive schema change (3 new nullable columns). Confirm.

**Step 3: Verify in studio**

Run: `npm run db:studio`
Open the `assessment_waitlist` table. Confirm three new columns exist: `design_score`, `procure_score`, `deliver_score`. Existing rows have NULL in those columns.

**Step 4: Commit**

```bash
git add src/lib/db/pg-schema.ts drizzle-pg/
git commit -m "db(assessment): add design/procure/deliver score columns alongside legacy pillars"
```

---

## Task 8: Assessment API — accept new pillar names

**Files:**
- Modify: `src/app/api/assessment-waitlist/route.ts`

**Step 1: Extend the request body shape and validation**

Add the three new score fields. Update `weakestPillar` validation to accept the new pillar names. Keep accepting the old names so any in-flight requests don't 400.

```ts
// in the destructuring (around line 25-45)
const {
    email, name, source,
    overallScore,
    scopeScore, fieldScore, processScore,        // legacy
    designScore, procureScore, deliverScore,     // new
    weakestPillar, answers,
} = (body ?? {}) as {
    email?: unknown; name?: unknown; source?: unknown;
    overallScore?: unknown;
    scopeScore?: unknown; fieldScore?: unknown; processScore?: unknown;
    designScore?: unknown; procureScore?: unknown; deliverScore?: unknown;
    weakestPillar?: unknown; answers?: unknown;
};

// in resultFields (around line 56-66)
const ALL_PILLAR_NAMES = ['scope', 'field', 'process', 'design', 'procure', 'deliver'];
const resultFields = {
    overallScore:  toScore(overallScore),
    scopeScore:    toScore(scopeScore),
    fieldScore:    toScore(fieldScore),
    processScore:  toScore(processScore),
    designScore:   toScore(designScore),
    procureScore:  toScore(procureScore),
    deliverScore:  toScore(deliverScore),
    weakestPillar:
        typeof weakestPillar === 'string' && ALL_PILLAR_NAMES.includes(weakestPillar)
            ? weakestPillar
            : null,
    answers: isAnswerMap(answers) ? answers : null,
};
```

**Step 2: Verify the route compiles**

Run: `npm run dev`
Expected: no TypeScript errors. The route accepts both old and new payloads.

**Step 3: Commit**

```bash
git add src/app/api/assessment-waitlist/route.ts
git commit -m "api(assessment): accept design/procure/deliver scores; preserve legacy pillar names"
```

---

## Task 9: Health Check page — rebuild pillars + questions + scoring

**Files:**
- Modify: `src/app/(public)/assessment/page.tsx`

This is the largest content edit in the plan. The page structure (intro section, sticky pillar nav, question grid, results modal, email capture) stays. Only `PILLARS`, `QUESTIONS`, `RISK_COPY`, the `PillarId` type, and the `handleSubmit` body change.

**Step 1: Replace `PillarId`, `PILLARS`, `QUESTIONS`, `RISK_COPY`, and the intro/eyebrow copy**

```ts
type PillarId = 'design' | 'procure' | 'deliver';

const PILLARS: Record<PillarId, { label: string; code: string; color: string; description: string }> = {
    design: {
        label: 'Design',
        code: '01',
        color: 'var(--sw-rose)',
        description: 'How well the brief, consultant team and design coordination set the project up to be built.',
    },
    procure: {
        label: 'Procure',
        code: '02',
        color: 'var(--sw-peach)',
        description: 'How tightly tenders are scoped, issued, evaluated and awarded.',
    },
    deliver: {
        label: 'Deliver',
        code: '03',
        color: 'var(--sw-cyan)',
        description: 'How contract administration, variations, claims and completion are controlled.',
    },
};

const QUESTIONS: Question[] = [
    // DESIGN (3)
    { id: 'design-brief',        pillar: 'design',  text: 'The project brief is documented and used to test design decisions.' },
    { id: 'design-consultants',  pillar: 'design',  text: 'Consultants are appointed against scopes of service that match the project, with clear deliverables per stage.' },
    { id: 'design-coordination', pillar: 'design',  text: 'Drawings, specifications and reports are coordinated and revision-controlled before issue.' },
    // PROCURE (3)
    { id: 'procure-scope',       pillar: 'procure', text: 'Tender packages have clear scope, inclusions, exclusions and evaluation criteria before issue.' },
    { id: 'procure-rfi',         pillar: 'procure', text: 'RFIs and addenda are managed through one register so every bidder has the same information.' },
    { id: 'procure-award',       pillar: 'procure', text: 'Award recommendations are prepared from captured evidence, not rebuilt manually at the end.' },
    // DELIVER (3)
    { id: 'deliver-ca',          pillar: 'deliver', text: 'Contract administration runs through a structured workflow — directions, instructions, notices, EOTs.' },
    { id: 'deliver-cost',        pillar: 'deliver', text: 'Variations, progress claims and contingency are tracked against the contract sum month-on-month.' },
    { id: 'deliver-completion',  pillar: 'deliver', text: 'Practical completion, defects and final account run from a known checklist, not a scramble.' },
];

const RISK_COPY: Record<PillarId, { diagnosis: string; actions: string[]; agent: string }> = {
    design: {
        diagnosis: 'Your project starts on the back foot. Weak briefs, late consultant scopes or uncoordinated documents lock in cost and rework before tender.',
        actions: [
            'Tighten the brief and use it to test every major design decision.',
            'Lock consultant scopes of service against the project shape and stage deliverables.',
            'Run a coordination check across drawings, specs and reports before each issue.',
        ],
        agent: 'Design Agent',
    },
    procure: {
        diagnosis: 'Your procurement is leaking value. Loose scopes, scattered RFIs or end-of-tender scrambling can change the award and the price.',
        actions: [
            'Standardise package scope, inclusions, exclusions and evaluation criteria before issue.',
            'Run RFIs and addenda through one register so all bidders see the same information.',
            'Draft the award recommendation from live evidence, not a memory exercise at the end.',
        ],
        agent: 'Procurement Agent',
    },
    deliver: {
        diagnosis: 'Your delivery is exposed. Ad-hoc CA, late variation tracking or a scramble at completion is where margin and time disappear.',
        actions: [
            'Run contract admin through a structured workflow — directions, instructions, notices, EOTs.',
            'Track variations, progress claims and contingency against the contract sum each month.',
            'Use a known checklist for practical completion, defects and final account.',
        ],
        agent: 'Delivery Agent',
    },
};

const ALWAYS_ON_AGENTS = ['Finance Agent', 'Program Agent', 'Correspondence Agent'];
```

**Step 2: Update the intro section copy**

Find the eyebrow + h1 + sub paragraph block (around lines 222-260). Change to:

- Eyebrow: `Project Health Check`
- Headline: `Score your project before the next package goes out.`
- Sub: `Answer 9 questions across design, procurement and delivery. Get an instant score, your weakest pillar, and the agent that closes the gap.`

**Step 3: Update the `handleSubmit` payload**

```ts
body: JSON.stringify({
    email,
    name: name || undefined,
    source: 'assessment_result',
    overallScore: scores.overall,
    designScore:  scores.pillars.design,
    procureScore: scores.pillars.procure,
    deliverScore: scores.pillars.deliver,
    weakestPillar: scores.weakest,
    answers,
}),
```

**Step 4: Audit the rest of the file for `'scope' | 'field' | 'process'` references**

Search the file for `scope`, `field`, `process` and replace any remaining UI references with the new pillar ids. Run: `grep -n "scope\|field\|process" src/app/(public)/assessment/page.tsx` and address each hit. Common spots: `calculateScores` body, results section copy, pillar nav rendering.

**Step 5: Find and update the results section**

The results section displays `RISK_COPY[scores.weakest].diagnosis` and `.actions`. After the actions list, add a new "Meet the agent" block:

```tsx
<div
    className="mt-6 p-4"
    style={{
        background: 'var(--sw-rose-tint)',
        border: '1px solid var(--sw-rose-dk)',
    }}
>
    <p
        className="m-0"
        style={{
            fontFamily: 'var(--sw-font-mono)',
            fontSize: 10,
            color: 'var(--sw-rose-dk)',
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            fontWeight: 700,
        }}
    >
        Meet the agent
    </p>
    <p
        className="mt-2 m-0"
        style={{
            fontFamily: 'var(--sw-font-body)',
            fontSize: 15,
            lineHeight: 1.55,
            color: 'var(--sw-ink)',
        }}
    >
        Sitewise's <strong>{RISK_COPY[scores.weakest].agent}</strong> closes this gap.
        It works alongside your always-on team: {ALWAYS_ON_AGENTS.join(' · ')}.
    </p>
</div>
```

(Place this immediately after the actions list inside the result panel.)

**Step 6: Verify in browser**

Run `npm run dev`. Open `/assessment`. Confirm:
- Eyebrow says `PROJECT HEALTH CHECK`
- 3 pillars (Design / Procure / Deliver), 3 questions each, 9 total
- Pillar nav on the left shows the three pillars
- Completing all 9 reveals score + weakest pillar + agent block + email form
- Submit succeeds (network tab → 200 from `/api/assessment-waitlist`)

**Step 7: Commit**

```bash
git add src/app/(public)/assessment/page.tsx
git commit -m "assessment(page): rebuild as 3-pillar 9-question Project Health Check with agent mapping"
```

---

## Task 10: Unit-test the scoring transform

**Files:**
- Create: `src/app/(public)/assessment/__tests__/scoring.test.ts`
- Modify: `src/app/(public)/assessment/page.tsx` — extract `calculateScores` and `QUESTIONS` to a separate module so they can be imported without the React tree

**Step 1: Extract `calculateScores` to a pure module**

Create `src/app/(public)/assessment/scoring.ts`. Move `PILLARS`, `QUESTIONS`, `PillarId`, `Question`, `Scores` types, and the `calculateScores` function from `page.tsx` into it. Re-export from the page file via `import`.

This is purely a refactor — no behavioural change. Verify the page still works in the browser before continuing.

**Step 2: Write the failing test**

Create `src/app/(public)/assessment/__tests__/scoring.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { calculateScores, QUESTIONS, type PillarId } from '../scoring';

function answersAll(value: number) {
    return Object.fromEntries(QUESTIONS.map((q) => [q.id, value]));
}

function answersPillar(pillar: PillarId, value: number, others: number) {
    return Object.fromEntries(
        QUESTIONS.map((q) => [q.id, q.pillar === pillar ? value : others]),
    );
}

describe('calculateScores', () => {
    it('all 5s scores 100', () => {
        const s = calculateScores(answersAll(5));
        expect(s.overall).toBe(100);
        expect(s.pillars.design).toBe(100);
        expect(s.pillars.procure).toBe(100);
        expect(s.pillars.deliver).toBe(100);
    });

    it('all 1s scores 0 (or whatever the floor is)', () => {
        const s = calculateScores(answersAll(1));
        // 1/5 maps to 0% on a (value-1)/4 scale
        expect(s.overall).toBe(0);
    });

    it('weakest pillar is the lowest-scored one', () => {
        const s = calculateScores(answersPillar('procure', 1, 5));
        expect(s.weakest).toBe('procure');
    });

    it('handles ties by returning a deterministic pillar', () => {
        // all equal — assert the function returns SOME valid pillar, not undefined
        const s = calculateScores(answersAll(3));
        expect(['design', 'procure', 'deliver']).toContain(s.weakest);
    });
});
```

**Step 3: Run the test**

Run: `npx vitest run src/app/(public)/assessment/__tests__/scoring.test.ts`
Expected: PASS for all four cases (the `calculateScores` function itself isn't being changed — these tests just lock in its behaviour against the new pillar set).

If the second test fails because the floor is something other than 0, update the test to match the actual floor (e.g. `expect(s.overall).toBe(20)` if the function maps 1→20%). Match the test to actual behaviour, don't change the function.

**Step 4: Commit**

```bash
git add src/app/(public)/assessment/scoring.ts src/app/(public)/assessment/__tests__/scoring.test.ts src/app/(public)/assessment/page.tsx
git commit -m "test(assessment): extract scoring + lock pillar/weakest behaviour"
```

---

## Task 11: Pricing page — re-anchor copy on tiers

**Files:**
- Modify: `src/components/landing/PricingSection.tsx` (the `pricingTiers` array, lines 29-79)

**Step 1: Rewrite tier descriptions and feature bullets**

Tier names (`Free`, `Starter`, `Professional`) and `polarProductId` values stay. Only `description`, `features`, and `cta` text change.

```ts
export const pricingTiers: PricingTier[] = [
    {
        id: 'free',
        name: 'Free',
        description: 'Try the workspace solo, on one project',
        price: { monthly: 0, annually: 0 },
        features: [
            '1 active project',
            'Procurement Agent (limited)',
            'Document workspace',
            'Manual data entry',
            'Community support',
        ],
        cta: 'Get Started',
    },
    {
        id: 'starter',
        name: 'Starter',
        description: 'For architects and PMs running a few projects at a time',
        price: { monthly: 49, annually: 39 },
        features: [
            '5 active projects',
            'Procurement Agent + Correspondence Agent',
            'AI document processing',
            '100 AI queries/month',
            'Email support',
        ],
        cta: 'Start Free Trial',
        polarProductId: 'starter',
    },
    {
        id: 'professional',
        name: 'Professional',
        description: 'For practices and in-house teams running multiple projects with a full agent team',
        price: { monthly: 149, annually: 119 },
        features: [
            'Unlimited projects',
            'All seven agents — Feasibility, Design, Procurement, Delivery, Finance, Program, Correspondence',
            'Unlimited AI queries',
            'Cost planning + cashflow',
            'TRR + tender award reports',
            'Priority support',
        ],
        highlighted: true,
        cta: 'Start Free Trial',
        polarProductId: 'professional',
    },
];
```

**Step 2: Update the section heading and sub**

Find the `<h2>` "Choose the right plan for your team" and the eyebrow inside `PricingSection`. Replace with:

- Eyebrow: `// Pricing`  *(keep)*
- Heading: `Pick the team that matches your project load.`
- Sub: `Start free. All paid plans include a 14-day trial and the agent team that fits your practice.`

**Step 3: Verify in browser**

Reload `/pricing`. Confirm three tier cards render with new descriptions and feature bullets. Confirm checkout still works for logged-in users (or redirects to register for guests — that path is unchanged).

**Step 4: Commit**

```bash
git add src/components/landing/PricingSection.tsx
git commit -m "pricing: re-anchor tier copy on the agent-team narrative; keep Polar IDs intact"
```

---

## Task 12: Pricing FAQ — rewrite in client-side voice

**Files:**
- Modify: `src/app/(public)/pricing/page.tsx` (the `faqs` array, starts around line 41)

**Step 1: Rewrite the FAQ entries**

Existing FAQs are generic SaaS (plan changes, payment methods, free trial, data on cancel). Keep the same questions but rewrite answers to reflect the agent-team product. Add one new FAQ about the agent team.

```ts
const faqs = [
    {
        question: 'Can I change my plan later?',
        answer:
            'Yes. Upgrade or downgrade at any time. Upgrades are prorated; downgrades take effect at the next billing cycle. Your project data and agent history move with the plan.',
    },
    {
        question: 'What payment methods do you accept?',
        answer:
            'All major credit cards (Visa, Mastercard, American Express). Annual plans also support bank transfer. Payments are processed securely through Polar.',
    },
    {
        question: 'Is there a free trial?',
        answer:
            'Yes — every paid plan starts with a 14-day free trial of the full agent team. No credit card required to start. You\'re only charged after the trial if you decide to continue.',
    },
    {
        question: 'What happens to my data if I cancel?',
        answer:
            'Your projects stay accessible in read-only mode for 30 days after cancellation. Export at any time before then. After 30 days, project data is permanently deleted.',
    },
    {
        question: 'Which agents do I get on each plan?',
        answer:
            'Free includes the Procurement Agent in a limited form. Starter adds the Correspondence Agent. Professional unlocks the full team — Feasibility, Design, Procurement, Delivery, Finance, Program and Correspondence — across unlimited projects.',
    },
    {
        question: 'Is Sitewise for head contractors?',
        answer:
            'No — Sitewise is built for the client side of the table. Architects, project managers and in-house developer teams running building projects on behalf of an owner. Head contractors have their own tools.',
    },
];
```

**Step 2: Verify in browser**

Reload `/pricing`. Scroll to FAQ. Confirm 6 entries render with new copy.

**Step 3: Commit**

```bash
git add src/app/(public)/pricing/page.tsx
git commit -m "pricing(faq): rewrite FAQs in client-side voice; add agent + positioning entries"
```

---

## Task 13: Final verification across all three pages

**Files:** none (verification only)

**Step 1: Run the dev server fresh**

Run: `npm run dev`

**Step 2: Walk all three public pages at three breakpoints**

For each of `/`, `/assessment`, `/pricing`, at widths 1280 / 768 / 375:

- Page loads without console errors
- All sections render
- All CTAs land on their hrefs
- No remaining literal text containing "Run better tenders" outside the slimmed Tender Spotlight
- No remaining UI references to the legacy pillars (`scope`, `field`, `process`) on `/assessment`

**Step 3: Run the unit tests**

Run: `npx vitest run`
Expected: scoring.test.ts passes; no other tests break.

**Step 4: Run typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

**Step 5: Commit verification notes (only if anything was tweaked above)**

If you made any small fixes during verification, commit them with:

```bash
git commit -m "landing: post-pivot verification fixes"
```

If nothing was tweaked, no commit needed.

---

## Out of scope for this pass (do NOT do)

- Renaming Polar tier products (`Free`/`Starter`/`Professional` → `Solo`/`Studio`/`Practice`). Real engineering, real subscriber migration. Defer.
- Building a `/product/tender` deep page for the full 5-step tender workflow. Defer until at least one signed customer asks.
- Migrating legacy `assessment_waitlist` rows from old pillars (scope/field/process) to new pillars. Old data stays in old columns; new submissions write to new columns.
- A `/compare/procurepro` page. We agreed positioning is implicit.
- Touching the dashboard / app shell. This pass is public-pages only.
- Touching `BookDemoDialog`. The CTA opens the same dialog as before.
- Adding new routes (`/team`, `/agents`, etc.). The agent story lives in the landing section for now.

---

## Files summary

**Created (2):**
- `src/components/landing/AgentRosterSection.tsx`
- `src/app/(public)/assessment/__tests__/scoring.test.ts`
- `src/app/(public)/assessment/scoring.ts`  *(extracted from page.tsx)*

**Modified (10):**
- `src/components/landing/NavBar.tsx`
- `src/components/landing/HeroSection.tsx`
- `src/components/landing/TenderFeaturesSection.tsx`
- `src/components/landing/FinalCTASection.tsx`
- `src/components/landing/PricingSection.tsx`
- `src/components/landing/index.ts`
- `src/app/(public)/page.tsx`
- `src/app/(public)/assessment/page.tsx`
- `src/app/(public)/pricing/page.tsx`
- `src/app/api/assessment-waitlist/route.ts`
- `src/lib/db/pg-schema.ts`

**Untouched (intentionally):**
- `TenderIntelligenceSection.tsx`, `TenderCredibilitySection.tsx` — files stay on disk (in case copy is salvageable later) but are no longer imported. Drop them in a follow-up cleanup once the new positioning has bedded in.
- `BookDemoDialog.tsx` — same dialog opens from both hero and nav.
- `FooterSection.tsx` — generic, not part of the pivot.
