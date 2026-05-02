# Notes - Typed Capture Register

**Date:** 2026-04-27
**Updated:** 2026-05-01
**Component:** Notes panel (Feature 021)

## Summary

Keep Notes as the lightweight project capture surface, separate from the fuller Meetings and Reports sections. Notes can now be typed as construction-management instruments, carry a simple open/closed status, and be sorted by date or type.

## Capture Types

Supported note types:

- RFI
- Notice
- EOT
- Defect
- Variation
- Risk
- Transmittal
- Review
- Note

Internal values are stored as lowercase keys:

```ts
'rfi' | 'notice' | 'eot' | 'defect' | 'variation' | 'risk' | 'transmittal' | 'review' | 'note'
```

## Status

Each note has a simple status:

```ts
'open' | 'closed'
```

No due date is included in this pass.

## Data

Add note metadata to the `notes` table:

```ts
type: text('type').notNull().default('note')
status: text('status').notNull().default('open')
```

Per-project UI state stays in `projects.ui_preferences`:

```json
{
  "notes": {
    "view": "tiles" | "list",
    "sortField": "date" | "type",
    "sortDir": "asc" | "desc"
  }
}
```

## Sort Semantics

Sorting remains client-side because notes are already loaded.

- **date** uses `noteDate ?? createdAt`, newest first by default.
- **type** uses the construction-management order listed above.

## UI

The Notes toolbar exposes:

```text
[ Tiles | List ]    Sort: [ Date ] [ Type ]
```

Each note exposes:

- Type selector
- Open/Closed toggle
- Existing title, date, colour, copy, delete, expand, attachment, and export controls

List view acts as the tidy register-style scan. Tile view remains the quick sticky-note workspace.

## Files

| File | Change |
|------|--------|
| `drizzle-pg/0043_notes_type_status.sql` | Add note `type` and `status` columns |
| `src/lib/db/pg-schema.ts` | Add `projects.uiPreferences`, `notes.type`, and `notes.status` |
| `src/types/notes-meetings-reports.ts` | Add note type/status constants and helpers |
| `src/lib/validations/notes-meetings-reports-schema.ts` | Validate type/status create and update payloads |
| `src/app/api/notes/**` | Create, update, copy, and export type/status metadata |
| `src/components/notes-meetings-reports/NotesToolbar.tsx` | Sort only by date or type |
| `src/components/notes-meetings-reports/NotesPanel.tsx` | Persist view/sort preferences and apply sorting |
| `src/components/notes-meetings-reports/SingleNotePanel.tsx` | Render type/status controls in tile, list, and expanded modes |
| `src/lib/agents/tools/*note*.ts` and applicators | Preserve type/status through agent note proposals |

## Out of Scope

- Due dates
- Formal RFI/EOT/Notice registers
- Multi-select and bulk status updates
- Promotion from note to formal register item
