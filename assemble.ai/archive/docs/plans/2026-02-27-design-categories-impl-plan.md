# Design Categories & Document Repo Relinking — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add 3 new knowledge categories (Scheme Design, Detail Design, IFC Design) to the Knowledge tab, relink document repo tiles from stakeholder-driven to knowledge-driven subcategories, and add per-project visibility toggles.

**Architecture:** Extend the existing knowledge subcategory system to include 3 design categories. Add a `category_visibility` table for per-project show/hide. Change `subcategorySource` for Scheme/Detail Design from `'consultants'` to `'knowledge'`. Add "Adopt Consultant List" endpoint to optionally populate from stakeholders.

**Tech Stack:** Next.js, TypeScript, Drizzle ORM (PostgreSQL), React, shadcn/ui, Tailwind CSS, Lucide icons

**Design doc:** `docs/plans/2026-02-27-design-categories-knowledge-relink.md`

---

## Task 1: Database Migration — New Table + Category Rows

**Files:**
- Create: `drizzle-pg/0037_design_categories_visibility.sql`
- Modify: `src/lib/db/pg-schema.ts` (lines 13-26, add `categoryVisibility` table)

**Step 1: Create migration SQL**

Create `drizzle-pg/0037_design_categories_visibility.sql`:

```sql
-- Add 3 new design categories
INSERT INTO "categories" ("id", "name", "is_system") VALUES ('scheme-design', 'Scheme Design', true) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "categories" ("id", "name", "is_system") VALUES ('detail-design', 'Detail Design', true) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "categories" ("id", "name", "is_system") VALUES ('ifc-design', 'IFC Design', true) ON CONFLICT ("id") DO NOTHING;

-- Category visibility table (per-project toggle)
CREATE TABLE IF NOT EXISTS "category_visibility" (
    "project_id" text NOT NULL REFERENCES "projects"("id"),
    "category_id" text NOT NULL REFERENCES "categories"("id"),
    "is_visible" boolean NOT NULL DEFAULT true,
    PRIMARY KEY ("project_id", "category_id")
);
```

**Step 2: Add Drizzle schema for `categoryVisibility`**

In `src/lib/db/pg-schema.ts`, add after the `subcategories` table definition (after line 26):

```typescript
export const categoryVisibility = pgTable('category_visibility', {
    projectId: text('project_id').references(() => projects.id).notNull(),
    categoryId: text('category_id').references(() => categories.id).notNull(),
    isVisible: boolean('is_visible').notNull().default(true),
}, (table) => ({
    pk: { columns: [table.projectId, table.categoryId] },
}));
```

Also add the export in the db barrel file if needed.

**Step 3: Commit**

```bash
git add drizzle-pg/0037_design_categories_visibility.sql src/lib/db/pg-schema.ts
git commit -m "feat: add category_visibility table and design category rows"
```

---

## Task 2: Update Categories Constants

**Files:**
- Modify: `src/lib/constants/categories.ts`

**Step 1: Add IFC Design category, change subcategorySource, update colors**

In `src/lib/constants/categories.ts`:

1. Change `SCHEME_DESIGN.subcategorySource` from `'consultants'` to `'knowledge'`
2. Change `DETAIL_DESIGN.subcategorySource` from `'consultants'` to `'knowledge'`
3. Add `IFC_DESIGN` category after `DETAIL_DESIGN`
4. Update `CONSULTANTS.color` to `'#6B7FA6'` (muted blue-gray)
5. Update `CONTRACTORS.color` to `'#7B8A6B'` (olive/khaki)
6. Add `'knowledge'` to the `subcategorySource` union type

Updated constants:

```typescript
SCHEME_DESIGN: {
    id: 'scheme-design',
    name: 'Scheme Design',
    color: '#5B9E9E',
    hasSubcategories: true,
    subcategorySource: 'knowledge' as const,  // CHANGED from 'consultants'
    row: 1,
},
DETAIL_DESIGN: {
    id: 'detail-design',
    name: 'Detail Design',
    color: '#7B68A6',
    hasSubcategories: true,
    subcategorySource: 'knowledge' as const,  // CHANGED from 'consultants'
    row: 1,
},
IFC_DESIGN: {
    id: 'ifc-design',
    name: 'IFC Design',
    color: '#8B7BA6',  // Soft Violet
    hasSubcategories: true,
    subcategorySource: 'knowledge' as const,
    row: 1,
},
```

```typescript
CONSULTANTS: {
    id: 'consultants',
    name: 'Consultants',
    color: '#6B7FA6',  // CHANGED: Muted Blue-Gray (distinct from knowledge tiles)
    hasSubcategories: true,
    subcategorySource: 'consultants' as const,
    row: 2,
},
CONTRACTORS: {
    id: 'contractors',
    name: 'Contractors',
    color: '#7B8A6B',  // CHANGED: Olive/Khaki (distinct from knowledge tiles)
    hasSubcategories: true,
    subcategorySource: 'contractors' as const,
    row: 2,
},
```

Update the `Category` interface to include `'knowledge'` in the subcategorySource union:

```typescript
export interface Category {
    id: string;
    name: string;
    color: string;
    hasSubcategories: boolean;
    subcategorySource?: 'consultants' | 'contractors' | 'knowledge';
    row: number;
    isKnowledgeSource?: boolean;
}
```

**Step 2: Commit**

```bash
git add src/lib/constants/categories.ts
git commit -m "feat: add IFC Design category, relink design tiles to knowledge source"
```

---

## Task 3: Extend Knowledge Subcategory Defaults

**Files:**
- Modify: `src/lib/services/knowledge-subcategory-defaults.ts`

**Step 1: Extend KNOWLEDGE_CATEGORY_IDS and DEFAULT_SUBCATEGORIES**

```typescript
export const KNOWLEDGE_CATEGORY_IDS = [
  'planning', 'procurement', 'delivery', 'authorities',
  'scheme-design', 'detail-design', 'ifc-design',
] as const;

export const DEFAULT_SUBCATEGORIES: Record<string, string[]> = {
  planning: [
    'Feaso', 'Title', 'Site Analysis', 'Design Brief', 'DD Planning',
    'DD Environmental', 'DD Technical', 'DD Heritage', 'Development Application',
  ],
  procurement: ['EOI', 'RFT', 'Addendum', 'Submission', 'Evaluation', 'TRR'],
  delivery: [
    'LOI', 'FIOA & Contract', 'Insurance & BGs', 'Management Plans',
    'Progress Claims', 'Variations', 'Programme & EOT', 'RFI & Notices',
    'CC PC OC', 'Commissioning', 'Defects', 'Reports', 'Photos',
  ],
  authorities: ['Council', 'Electricity', 'Gas', 'Water', 'Telco', 'Traffic', 'Certifier', 'Heritage'],
  'scheme-design': [],
  'detail-design': [],
  'ifc-design': [],
};
```

**Step 2: Commit**

```bash
git add src/lib/services/knowledge-subcategory-defaults.ts
git commit -m "feat: extend knowledge category IDs with 3 design categories"
```

---

## Task 4: Update Knowledge Subcategories API Route

**Files:**
- Modify: `src/app/api/projects/[projectId]/knowledge-subcategories/route.ts`

**Step 1: Update GET handler to include design category groups**

In the GET handler, update the `grouped` initialization to include the 3 new categories:

```typescript
const grouped: Record<string, typeof rows> = {
  planning: [],
  procurement: [],
  delivery: [],
  authorities: [],
  'scheme-design': [],
  'detail-design': [],
  'ifc-design': [],
};
```

**Step 2: Commit**

```bash
git add src/app/api/projects/[projectId]/knowledge-subcategories/route.ts
git commit -m "feat: extend knowledge subcategories API to include design categories"
```

---

## Task 5: Update Knowledge Subcategories Hook

**Files:**
- Modify: `src/lib/hooks/use-knowledge-subcategories.ts`

**Step 1: Update EMPTY_GROUPS to include design categories**

```typescript
const EMPTY_GROUPS: GroupedSubcategories = {
  planning: [],
  procurement: [],
  delivery: [],
  authorities: [],
  'scheme-design': [],
  'detail-design': [],
  'ifc-design': [],
};
```

**Step 2: Commit**

```bash
git add src/lib/hooks/use-knowledge-subcategories.ts
git commit -m "feat: extend knowledge subcategories hook with design category groups"
```

---

## Task 6: Category Visibility API Route

**Files:**
- Create: `src/app/api/projects/[projectId]/category-visibility/route.ts`

**Step 1: Create GET and PATCH endpoints**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { db, categoryVisibility } from '@/lib/db';
import { eq, and } from 'drizzle-orm';

interface RouteParams {
  params: Promise<{ projectId: string }>;
}

// GET — returns visibility map for this project
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { projectId } = await params;
    if (!projectId) {
      return NextResponse.json({ error: 'Project ID is required' }, { status: 400 });
    }

    const rows = await db
      .select()
      .from(categoryVisibility)
      .where(eq(categoryVisibility.projectId, projectId));

    // Build map: { [categoryId]: isVisible }
    const visibilityMap: Record<string, boolean> = {};
    for (const row of rows) {
      visibilityMap[row.categoryId] = row.isVisible;
    }

    return NextResponse.json(visibilityMap);
  } catch (error) {
    console.error('[GET /api/projects/[projectId]/category-visibility] Error:', error);
    return NextResponse.json({ error: 'Failed to fetch visibility' }, { status: 500 });
  }
}

// PATCH — toggle visibility for a specific category
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { projectId } = await params;
    const body = await request.json();
    const { categoryId, isVisible } = body;

    if (!projectId || !categoryId || typeof isVisible !== 'boolean') {
      return NextResponse.json(
        { error: 'projectId, categoryId, and isVisible (boolean) are required' },
        { status: 400 }
      );
    }

    // Upsert: insert or update visibility
    const existing = await db
      .select()
      .from(categoryVisibility)
      .where(
        and(
          eq(categoryVisibility.projectId, projectId),
          eq(categoryVisibility.categoryId, categoryId)
        )
      );

    if (existing.length > 0) {
      await db
        .update(categoryVisibility)
        .set({ isVisible })
        .where(
          and(
            eq(categoryVisibility.projectId, projectId),
            eq(categoryVisibility.categoryId, categoryId)
          )
        );
    } else {
      await db.insert(categoryVisibility).values({ projectId, categoryId, isVisible });
    }

    return NextResponse.json({ categoryId, isVisible });
  } catch (error) {
    console.error('[PATCH /api/projects/[projectId]/category-visibility] Error:', error);
    return NextResponse.json({ error: 'Failed to update visibility' }, { status: 500 });
  }
}
```

**Step 2: Export `categoryVisibility` from db barrel file**

Ensure `categoryVisibility` is exported from `src/lib/db/index.ts` (or wherever the barrel export is).

**Step 3: Commit**

```bash
git add src/app/api/projects/[projectId]/category-visibility/route.ts src/lib/db/pg-schema.ts
git commit -m "feat: add category visibility API route (GET + PATCH)"
```

---

## Task 7: Adopt Consultant List API Route

**Files:**
- Create: `src/app/api/projects/[projectId]/knowledge-subcategories/adopt-consultants/route.ts`

**Step 1: Create POST endpoint**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { db, projectStakeholders, subcategories } from '@/lib/db';
import { eq, and, asc, isNull, max } from 'drizzle-orm';
import { nanoid } from 'nanoid';

const DESIGN_CATEGORY_IDS = ['scheme-design', 'detail-design', 'ifc-design'];

interface RouteParams {
  params: Promise<{ projectId: string }>;
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { projectId } = await params;
    const body = await request.json();
    const { categoryId } = body;

    if (!projectId || !categoryId) {
      return NextResponse.json(
        { error: 'projectId and categoryId are required' },
        { status: 400 }
      );
    }

    if (!DESIGN_CATEGORY_IDS.includes(categoryId)) {
      return NextResponse.json(
        { error: `categoryId must be one of: ${DESIGN_CATEGORY_IDS.join(', ')}` },
        { status: 400 }
      );
    }

    // Fetch enabled consultant stakeholders
    const consultants = await db
      .select()
      .from(projectStakeholders)
      .where(
        and(
          eq(projectStakeholders.projectId, projectId),
          eq(projectStakeholders.stakeholderGroup, 'consultant'),
          eq(projectStakeholders.isEnabled, true),
          isNull(projectStakeholders.deletedAt)
        )
      )
      .orderBy(asc(projectStakeholders.disciplineOrTrade));

    // Extract unique disciplines
    const uniqueDisciplines = new Map<string, string>();
    for (const c of consultants) {
      const discipline = c.disciplineOrTrade?.trim();
      if (discipline) {
        const key = discipline.toLowerCase();
        if (!uniqueDisciplines.has(key)) {
          uniqueDisciplines.set(key, discipline);
        }
      }
    }

    if (uniqueDisciplines.size === 0) {
      return NextResponse.json(
        { error: 'No consultant disciplines found. Generate stakeholders first.' },
        { status: 400 }
      );
    }

    // Get current max sortOrder for this category+project
    const maxResult = await db
      .select({ maxSort: max(subcategories.sortOrder) })
      .from(subcategories)
      .where(
        and(
          eq(subcategories.projectId, projectId),
          eq(subcategories.categoryId, categoryId)
        )
      );

    let nextSort = (maxResult[0]?.maxSort ?? -1) + 1;

    // Get existing subcategory names for this category to avoid duplicates
    const existingRows = await db
      .select({ name: subcategories.name })
      .from(subcategories)
      .where(
        and(
          eq(subcategories.projectId, projectId),
          eq(subcategories.categoryId, categoryId)
        )
      );

    const existingNames = new Set(existingRows.map(r => r.name.toLowerCase()));

    // Create subcategories for new disciplines only
    const newRows: { id: string; categoryId: string; projectId: string; name: string; isSystem: boolean; sortOrder: number }[] = [];

    for (const discipline of uniqueDisciplines.values()) {
      if (!existingNames.has(discipline.toLowerCase())) {
        newRows.push({
          id: nanoid(),
          categoryId,
          projectId,
          name: discipline,
          isSystem: false,
          sortOrder: nextSort++,
        });
      }
    }

    if (newRows.length > 0) {
      await db.insert(subcategories).values(newRows);
    }

    return NextResponse.json({
      added: newRows.length,
      skipped: uniqueDisciplines.size - newRows.length,
      subcategories: newRows,
    }, { status: 201 });
  } catch (error) {
    console.error('[POST adopt-consultants] Error:', error);
    return NextResponse.json({ error: 'Failed to adopt consultant list' }, { status: 500 });
  }
}
```

**Step 2: Commit**

```bash
git add src/app/api/projects/[projectId]/knowledge-subcategories/adopt-consultants/route.ts
git commit -m "feat: add adopt-consultants endpoint for design categories"
```

---

## Task 8: Update Active Categories API — Visibility Filtering

**Files:**
- Modify: `src/app/api/categories/active/route.ts`

**Step 1: Add visibility filtering and update subcategory resolution**

Import `categoryVisibility` and update the GET handler:

```typescript
import { db } from '@/lib/db';
import { projectStakeholders, subcategories as subcategoriesTable, categoryVisibility } from '@/lib/db';
import { eq, and, asc, isNull, inArray } from 'drizzle-orm';
```

After fetching `knowledgeSubcats`, add visibility fetch:

```typescript
// Fetch visibility settings for this project
const visibilityRows = await db
    .select()
    .from(categoryVisibility)
    .where(eq(categoryVisibility.projectId, projectId));

const visibilityMap = new Map<string, boolean>();
for (const row of visibilityRows) {
    visibilityMap.set(row.categoryId, row.isVisible);
}
```

Update the `knowledgeSubcats` query to use the extended `KNOWLEDGE_CATEGORY_IDS` (which now includes design categories).

In the `activeCategories` map, add visibility filtering:

```typescript
const activeCategories: ActiveCategory[] = categories
    .filter(category => {
        // Check visibility — default to true if no row exists
        const visible = visibilityMap.get(category.id);
        return visible !== false; // undefined (no row) = visible
    })
    .map(category => {
        // ... existing subcategory resolution logic
    });
```

The subcategory resolution for `'knowledge'` source already handles the design categories because they're now in `KNOWLEDGE_CATEGORY_IDS` and the filter `s.categoryId === category.id` matches correctly.

**Step 2: Commit**

```bash
git add src/app/api/categories/active/route.ts
git commit -m "feat: add visibility filtering to active categories API"
```

---

## Task 9: Update KnowledgePanel — Row 2, Eye Toggle, Adopt Button

**Files:**
- Modify: `src/components/knowledge/KnowledgePanel.tsx`

This is the largest UI change. Key modifications:

**Step 1: Extend GROUP_ORDER and GROUP_LABELS**

```typescript
const GROUP_ORDER = ['planning', 'procurement', 'delivery', 'authorities'] as const;
const DESIGN_GROUP_ORDER = ['scheme-design', 'detail-design', 'ifc-design'] as const;
const ALL_GROUPS = [...GROUP_ORDER, ...DESIGN_GROUP_ORDER] as const;
type KnowledgeGroup = typeof ALL_GROUPS[number];

const GROUP_LABELS: Record<KnowledgeGroup, string> = {
  planning: 'Planning',
  procurement: 'Procurement',
  delivery: 'Delivery',
  authorities: 'Authorities',
  'scheme-design': 'Scheme Design',
  'detail-design': 'Detail Design',
  'ifc-design': 'IFC Design',
};
```

**Step 2: Add visibility state and fetch**

Add state and fetch for category visibility:

```typescript
const [visibility, setVisibility] = useState<Record<string, boolean>>({});
const [visibilityLoading, setVisibilityLoading] = useState(true);

// Fetch visibility on mount
useEffect(() => {
  async function fetchVisibility() {
    try {
      const res = await fetch(`/api/projects/${projectId}/category-visibility`);
      if (res.ok) {
        const data = await res.json();
        setVisibility(data);
      }
    } catch { /* ignore */ } finally {
      setVisibilityLoading(false);
    }
  }
  fetchVisibility();
}, [projectId]);

const toggleVisibility = async (categoryId: string) => {
  const current = visibility[categoryId] !== false; // default true
  const newValue = !current;
  // Optimistic update
  setVisibility(prev => ({ ...prev, [categoryId]: newValue }));
  try {
    await fetch(`/api/projects/${projectId}/category-visibility`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ categoryId, isVisible: newValue }),
    });
    triggerRefresh(); // Refresh active categories in doc repo
  } catch {
    // Revert on error
    setVisibility(prev => ({ ...prev, [categoryId]: current }));
  }
};
```

**Step 3: Add adopt consultant handler**

```typescript
const [adoptingGroup, setAdoptingGroup] = useState<string | null>(null);

const handleAdoptConsultants = async (categoryId: string) => {
  setAdoptingGroup(categoryId);
  try {
    const res = await fetch(`/api/projects/${projectId}/knowledge-subcategories/adopt-consultants`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ categoryId }),
    });
    if (res.ok) {
      await refetch(); // refetch subcategories from the hook
      triggerRefresh();
    }
  } catch { /* ignore */ } finally {
    setAdoptingGroup(null);
  }
};
```

Need to destructure `refetch` from `useKnowledgeSubcategories` and `triggerRefresh` from the knowledge refresh context. The hook already returns `refetch`. For `triggerRefresh`, import the context:

```typescript
import { useKnowledgeSubcategoryRefresh } from '@/lib/contexts/knowledge-subcategory-refresh-context';
// ...
const { triggerRefresh } = useKnowledgeSubcategoryRefresh();
```

**Step 4: Update render to show two rows of groups**

Replace the single `GROUP_ORDER.map(...)` with two sections:

```tsx
<div className="space-y-4">
  {/* Row 1: Operational categories */}
  {GROUP_ORDER.map(group => (
    <GroupCard
      key={group}
      group={group}
      // ... existing props ...
      isVisible={visibility[group] !== false}
      onToggleVisibility={() => toggleVisibility(group)}
    />
  ))}

  {/* Row 2: Design categories */}
  {DESIGN_GROUP_ORDER.map(group => (
    <GroupCard
      key={group}
      group={group}
      // ... existing props ...
      isVisible={visibility[group] !== false}
      onToggleVisibility={() => toggleVisibility(group)}
      isDesignCategory={true}
      onAdoptConsultants={() => handleAdoptConsultants(group)}
      isAdopting={adoptingGroup === group}
    />
  ))}
</div>
```

**Step 5: Update GroupCard to include eye toggle and adopt button**

Add new props to `GroupCardProps`:

```typescript
interface GroupCardProps {
  // ... existing props ...
  isVisible?: boolean;
  onToggleVisibility?: () => void;
  isDesignCategory?: boolean;
  onAdoptConsultants?: () => void;
  isAdopting?: boolean;
}
```

In the GroupCard header, add the eye and adopt buttons:

```tsx
<div className="flex items-center gap-2">
  <button
    onClick={onQuickAdd}
    className={cn('p-1 rounded transition-colors', 'text-blue-500 hover:text-blue-400 hover:bg-blue-500/10')}
    title={`Add ${GROUP_LABELS[group]} subcategory`}
  >
    <Plus className="w-4 h-4" />
  </button>

  {/* Adopt Consultant List — design categories only */}
  {isDesignCategory && onAdoptConsultants && (
    <button
      onClick={onAdoptConsultants}
      disabled={isAdopting}
      className={cn(
        'p-1 rounded transition-colors',
        isAdopting
          ? 'text-[var(--color-text-muted)]/50 cursor-wait'
          : 'text-[var(--color-text-muted)] hover:text-blue-400 hover:bg-blue-500/10'
      )}
      title="Populate from consultant list"
    >
      <Users className="w-4 h-4" />
    </button>
  )}

  <span className="text-[var(--color-text-primary)] font-bold text-sm uppercase tracking-wide">
    {GROUP_LABELS[group]} ({items.length})
  </span>
</div>

{/* Right side: eye toggle + trash */}
<div className="flex items-center gap-1">
  <button
    onClick={onToggleVisibility}
    className={cn(
      'p-1 rounded transition-colors',
      isVisible
        ? 'text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]'
        : 'text-[var(--color-text-muted)]/30 hover:text-[var(--color-text-muted)]'
    )}
    title={isVisible ? 'Visible in Document Repository (click to hide)' : 'Hidden from Document Repository (click to show)'}
  >
    {isVisible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
  </button>
  <button onClick={handleTrashClick} /* ... existing trash button ... */ >
    <Trash className="w-4 h-4" />
  </button>
</div>
```

Add `Eye, EyeOff, Users` to the Lucide imports.

**Step 6: Commit**

```bash
git add src/components/knowledge/KnowledgePanel.tsx
git commit -m "feat: add design category rows, visibility toggles, adopt consultant button"
```

---

## Task 10: Update CategoryUploadTiles — Scroll Improvements

**Files:**
- Modify: `src/components/documents/CategoryUploadTiles.tsx`

**Step 1: Improve fade mask gradient width**

In `getFadeMaskStyle`, change `32px` to `48px` for a more gradual fade:

```typescript
const getFadeMaskStyle = (canScrollLeft: boolean, canScrollRight: boolean): React.CSSProperties => {
    if (canScrollLeft && canScrollRight) {
        return {
            maskImage: 'linear-gradient(to right, transparent, black 48px, black calc(100% - 48px), transparent)',
            WebkitMaskImage: 'linear-gradient(to right, transparent, black 48px, black calc(100% - 48px), transparent)',
        };
    }
    if (canScrollLeft) {
        return {
            maskImage: 'linear-gradient(to right, transparent, black 48px)',
            WebkitMaskImage: 'linear-gradient(to right, transparent, black 48px)',
        };
    }
    if (canScrollRight) {
        return {
            maskImage: 'linear-gradient(to right, black calc(100% - 48px), transparent)',
            WebkitMaskImage: 'linear-gradient(to right, black calc(100% - 48px), transparent)',
        };
    }
    return {};
};
```

**Step 2: Increase tile spacing**

Change `gap-2` to `gap-3` on the category scroll container:

```tsx
className={cn(
    'flex gap-3 overflow-x-auto',  // gap-2 → gap-3
    '[scrollbar-width:none] [&::-webkit-scrollbar]:hidden',
    'snap-x snap-mandatory',
)}
```

Do the same for the subcategory scroll container.

**Step 3: Commit**

```bash
git add src/components/documents/CategoryUploadTiles.tsx
git commit -m "feat: improve document repo tile spacing and scroll fade"
```

---

## Task 11: Stakeholder Tab — Consultant/Contractor Visibility Toggles

**Files:**
- Identify: The stakeholder panel/tab component (likely `src/components/stakeholders/StakeholderPanel.tsx` or similar)

**Step 1: Locate the stakeholder tab component**

Search for the component that renders the stakeholder management UI. It should be in `src/components/stakeholders/` or `src/components/dashboard/`.

**Step 2: Add visibility toggle for Consultants and Contractors**

Add eye toggle buttons (same pattern as Knowledge tab) for the `consultants` and `contractors` category IDs. Use the same `/api/projects/[projectId]/category-visibility` endpoint.

This is a simpler version of the Knowledge tab toggle — just 2 toggle buttons in the stakeholder panel header or next to the Consultants/Contractors group headers.

**Step 3: Commit**

```bash
git add <stakeholder-component-file>
git commit -m "feat: add visibility toggles for consultant/contractor categories in stakeholder tab"
```

---

## Verification Checklist

After all tasks:

1. **Knowledge tab**: Shows 2 rows (4 operational + 3 design categories)
2. **Eye toggles**: All 7 knowledge categories have working eye toggle icons
3. **Adopt button**: Design categories show Users icon, clicking populates from consultant stakeholders
4. **Document repo**: Scheme/Detail/IFC Design tiles pull subcategories from knowledge system (not stakeholders)
5. **Visibility**: Toggling eye off hides the tile from document repo
6. **Consultant/Contractor tiles**: Different colors, visibility toggles in stakeholder tab
7. **No regressions**: Existing document upload, categorization, and RAG features work as before
8. **Build passes**: `npx next build` completes without errors
