# Document Repository — Compact Category Navigation

**Date:** 2026-02-27
**Status:** Approved

## Problem

The category/subcategory tile area in the Document Repository consumes too much vertical space:
- Category tiles wrap to 2 rows (9 items in auto-fit grid)
- Subcategory tiles wrap to 4 rows (e.g., 18 subcategories for Scheme Design)
- ~280px consumed before the document table starts

## Design

### Layout: Single-Row Horizontal Scroll

**Categories:** 1 horizontal row with mouse-wheel scrolling
**Subcategories:** 1 horizontal row (slides in below when a category is expanded)
**Maximum vertical space:** 2 rows (~88px) instead of 6 rows (~280px)

### Scroll Behavior

- `onWheel` handler converts vertical scroll to horizontal: `container.scrollLeft += event.deltaY`
- `event.preventDefault()` stops page from scrolling while hovering the row
- Native scrollbar hidden (`scrollbar-width: none` + webkit pseudo-element)
- `scroll-snap-type: x mandatory` with `scroll-snap-align: start` for snap-to-tile
- CSS `mask-image` gradient fades on left/right edges when content overflows

### Tile Changes

- **No upload icons** on named category/subcategory tiles (upload icon only on the upload-only tile)
- **No chevron/triangle** indicators for expand/collapse
- **No text truncation** — `whitespace-nowrap`, auto-width based on content
- **Compact sizing:** categories `h-9`, subcategories `h-8`
- Each tile uses `flex-shrink-0` to prevent compression in the flex row

### Interaction (Unchanged)

- Click, Ctrl+click, drag-and-drop all work the same
- Expand/collapse via click (no chevron needed — selected state styling provides feedback)
- Active subcategory dot indicator remains

## Files Modified

| File | Changes |
|------|---------|
| `CategoryUploadTiles.tsx` | Grid → flex nowrap, overflow-x-auto, onWheel handler, fade mask, hide scrollbar |
| `CategoryTile.tsx` | Remove chevron, remove upload icons (except upload tile), whitespace-nowrap, h-9/h-8, flex-shrink-0 |

## New Code

- `useHorizontalScroll` hook (~20 lines) — wheel→horizontal conversion + overflow state for fade edges
