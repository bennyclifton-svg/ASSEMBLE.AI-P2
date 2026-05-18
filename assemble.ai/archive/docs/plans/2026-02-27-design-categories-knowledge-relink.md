# Design Categories & Document Repo Relinking

**Date:** 2026-02-27
**Status:** Approved

## Summary

Add 3 new knowledge categories (Scheme Design, Detail Design, IFC Design) to the Knowledge tab in a second row. Delink Scheme Design and Detail Design in the document repo from stakeholder-driven subcategories and relink them to the knowledge subcategory system. Add per-project visibility toggles so users can hide categories from the document repo.

---

## 1. Knowledge Tab — New Design Categories

### Layout

```
Row 1 (existing):  Planning | Procurement | Delivery | Authorities
Row 2 (new):       Scheme Design | Detail Design | IFC Design
```

### Features

- **Eye icon** in each group card header — toggles whether the category appears in the Document Repository. Per-project state, default: visible.
- **"Adopt Consultant List" button** (design categories only) — `Users` icon in the header. Fetches enabled consultant stakeholders, extracts unique `disciplineOrTrade` values, creates knowledge subcategories pre-populated with those disciplines.
- **No default subcategories** — design categories start empty. Users manually add or adopt from consultant list.
- **Same editing** — inline add, rename, delete, bulk delete subcategories.
- **Compact layout** — same compact table style as existing Row 1 cards.

---

## 2. Document Repository — Relinking & New Tile

### Subcategory Source Changes

| Tile | Before | After |
|------|--------|-------|
| Scheme Design | `subcategorySource: 'consultants'` | `subcategorySource: 'knowledge'` |
| Detail Design | `subcategorySource: 'consultants'` | `subcategorySource: 'knowledge'` |
| IFC Design | *(new)* | `subcategorySource: 'knowledge'` |

### Visibility

Active categories API checks each knowledge category's visibility toggle per project. Toggled-off categories are excluded — tiles don't render.

### Consultants & Contractors Tiles

- Stay stakeholder-driven (`subcategorySource: 'consultants'` / `'contractors'`).
- Get **distinct colors** to visually differentiate from knowledge tiles.
- Visibility toggles managed from the **Stakeholder tab**.

### Layout

- Row 1: Planning, Scheme Design, Detail Design, IFC Design, Procurement, Delivery (horizontal scroll)
- Row 2: Consultants, Contractors, Authorities, Ingest
- Improved fade masks (~40px gradient, more gradual)
- More spacing between tiles so hover states don't overlap

---

## 3. Database & API Changes

### New Table: `category_visibility`

```
category_visibility
├── projectId   (FK → projects)
├── categoryId  (FK → categories)
├── isVisible   (boolean, default: true)
└── unique constraint on (projectId, categoryId)
```

No row = visible (default on). Only stores explicit toggles.

### Categories Table

Add 3 new system rows: `scheme-design`, `detail-design`, `ifc-design`.

### Knowledge Subcategory Defaults

Extend `KNOWLEDGE_CATEGORY_IDS` to include:

```typescript
['planning', 'procurement', 'delivery', 'authorities', 'scheme-design', 'detail-design', 'ifc-design']
```

Design categories seed with empty arrays.

### API Routes

- **`GET /api/categories/active`** — filters out categories where `isVisible = false`. Scheme/Detail/IFC Design resolve subcategories from knowledge table.
- **`PATCH /api/projects/[projectId]/category-visibility`** — toggles `isVisible` for a category. Used by Knowledge tab (7 categories) and Stakeholder tab (Consultants, Contractors).
- **`POST /api/projects/[projectId]/knowledge-subcategories/adopt-consultants`** — accepts `categoryId`, fetches enabled consultant disciplines, creates knowledge subcategories.
- **Existing knowledge subcategory CRUD** — extended to accept the 3 new design category IDs.

---

## 4. Colors

### Knowledge Tiles (warm/earthy)

| Category | Color |
|----------|-------|
| Planning | `#8B7355` (Warm Brown) |
| Procurement | `#A67373` (Muted Red) |
| Delivery | `#7A9B7E` (Sage Green) |
| Authorities | `#6B7B8C` (Slate Gray) |
| Scheme Design | `#5B9E9E` (Teal) — existing |
| Detail Design | `#7B68A6` (Purple) — existing |
| IFC Design | `#8B7BA6` (Soft Violet) — new |

### Stakeholder Tiles (cooler/neutral — visually distinct)

| Category | Color |
|----------|-------|
| Consultants | `#6B7FA6` (Muted Blue-Gray) |
| Contractors | `#7B8A6B` (Olive/Khaki) |

---

## 5. Implementation Scope

### Files to Create

- `drizzle-pg/0037_category_visibility.sql` — migration for visibility table + new category rows
- `src/app/api/projects/[projectId]/category-visibility/route.ts` — PATCH visibility toggle
- `src/app/api/projects/[projectId]/knowledge-subcategories/adopt-consultants/route.ts` — adopt consultant list

### Files to Modify

- `src/lib/constants/categories.ts` — add IFC Design, update Consultant/Contractor colors, change subcategorySource for Scheme/Detail Design
- `src/lib/db/pg-schema.ts` — add `categoryVisibility` table
- `src/lib/services/knowledge-subcategory-defaults.ts` — extend with 3 empty design categories
- `src/lib/hooks/use-knowledge-subcategories.ts` — extend category IDs
- `src/app/api/projects/[projectId]/knowledge-subcategories/route.ts` — extend allowed category IDs
- `src/app/api/categories/active/route.ts` — add visibility filtering, change subcategory resolution for design categories
- `src/components/knowledge/KnowledgePanel.tsx` — add Row 2, eye toggle, adopt button
- `src/components/documents/CategoryUploadTiles.tsx` — improved scroll fade, spacing
- `src/lib/hooks/use-active-categories.ts` — may need visibility refresh signal
