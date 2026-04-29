# Notes — Sort & View Modes

**Date:** 2026-04-27
**Component:** Notes panel (Feature 021)

## Summary

Add sort controls (date / color / title, each with toggleable direction) and a view-mode switch (tiles / list) to the Notes panel. Persist the user's choice per project in the database.

## Data

Add a single `uiPreferences` JSONB column to the `projects` table, default `{}`. Reusable for future per-project UI state.

```ts
uiPreferences: jsonb("ui_preferences").default({}).notNull()
```

Notes feature shape:

```json
{
  "notes": {
    "view": "tiles" | "list",
    "sortField": "date" | "color" | "title",
    "sortDir": "asc" | "desc"
  }
}
```

Each sort field remembers its own direction independently (kept in client state; only the active field's direction is persisted).

## API

`PATCH /api/projects/[projectId]/ui-preferences` — accepts a partial object, deep-merges into the existing `uiPreferences`, returns the merged result.

## Sort semantics (client-side; notes already loaded)

- **date** → `noteDate ?? createdAt`. Notes with explicit `noteDate` rank above implicit ones on ties.
- **title** → `localeCompare`, case-insensitive.
- **color** → fixed order (yellow → blue → pink → green → white) so tiles cluster.

Defaults on first activation: date desc (newest first), title asc (A→Z), color asc.

## Toolbar

Always rendered (even at zero notes). Sits above the notes grid.

```
[ ▦ Tiles | ☰ List ]    Sort:  [ Date ↓ ] [ Color ] [ Title ]
```

- View toggle: segmented pair, active = `bg-[var(--color-accent-copper-tint)] text-[var(--color-accent-copper)]`.
- Sort buttons: plain text, only the active button shows an `ArrowUp`/`ArrowDown` (lucide). Click active to flip direction; click inactive to switch (using its remembered direction).
- All styling uses TESSERA tokens — no hardcoded colors.

## List view row

Replaces the 140px tile grid when `view === "list"`. One row per note, full width, ~`h-10`, background = note color.

```
┌──────────────────────────────────────────────────────────────────────┐
│ ● [Title — click to edit]              23/04/2026   ⊙  ⧉  🗑  ⌐     │
└──────────────────────────────────────────────────────────────────────┘
```

- Color chip on left (8px, opens `NoteColorPicker`).
- Title in the middle, click-to-edit (same logic as collapsed tile, `<input>` instead of `<textarea>`).
- Date right-aligned, hidden native picker (existing pattern).
- Four icons on right, same order as collapsed tile: color picker, copy, delete, expand (`CornerBracketIcon`).

## Files

| File | Change |
|------|--------|
| `drizzle-pg/schema.ts` | Add `uiPreferences` JSONB column |
| `drizzle-pg/0xxx_*.sql` | Generated migration |
| `src/app/api/projects/[projectId]/ui-preferences/route.ts` | New PATCH endpoint |
| `src/lib/hooks/use-ui-preferences.ts` | New hook (read + write) |
| `src/components/notes-meetings-reports/NotesToolbar.tsx` | New toolbar component |
| `src/components/notes-meetings-reports/SingleNotePanel.tsx` | Add `isListMode` branch in collapsed path |
| `src/components/notes-meetings-reports/NotesPanel.tsx` | Toolbar + sort comparator + grid/list switch |

## Out of scope

- Filtering (color/starred) — design separately if needed.
- Drag-to-reorder — sort is comparator-driven only.
- Multi-select / bulk actions on rows.
