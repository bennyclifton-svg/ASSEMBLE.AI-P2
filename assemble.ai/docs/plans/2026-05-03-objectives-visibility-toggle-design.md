# Objectives Visibility Toggle on RFT — Design

**Date:** 2026-05-03
**Status:** Approved — implementing
**Origin:** User wants objectives on the Request For Tender hidden by default, with an eye-icon toggle that controls both the in-app display and the generated Word/PDF export.

---

## 1. Behavior

- Each RFT instance has an `objectivesVisible` flag (default `false`).
- A small eye / eye-off icon button sits next to the "Objectives" header in the RFT Short tab.
- Click toggles the flag. State is per-RFT, persisted server-side.
- When `false`: the in-app objectives list is collapsed and the OBJECTIVES section is omitted entirely from generated PDF/DOCX.
- When `true`: list is rendered in-app and the OBJECTIVES section appears in the export.

## 2. Storage

A new boolean column on the `rft_new` table, defaulting to `false`. No backfill needed — default covers existing rows.

```ts
objectivesVisible: boolean('objectives_visible').notNull().default(false),
```

## 3. Files materially affected

- [src/lib/db/pg-schema.ts](../../src/lib/db/pg-schema.ts) — add column to `rftNew`.
- [src/app/api/rft-new/[id]/route.ts](../../src/app/api/rft-new/[id]/route.ts) — `PUT` accepts `objectivesVisible`.
- [src/lib/hooks/use-rft-new.ts](../../src/lib/hooks/use-rft-new.ts) — `RftNew` interface gets the field; new `updateObjectivesVisible` mirroring `updateRftDate`.
- [src/components/rft-new/RFTNewSection.tsx](../../src/components/rft-new/RFTNewSection.tsx) — wire `handleToggleObjectives` callback to `RFTNewShortTab`.
- [src/components/rft-new/RFTNewShortTab.tsx](../../src/components/rft-new/RFTNewShortTab.tsx) — eye/eye-off button next to header; conditionally render `<ObjectivesReadOnlyList>`.
- [src/lib/export/rft-export.ts](../../src/lib/export/rft-export.ts) — add `objectivesVisible: boolean` to `RFTExportData`.
- [src/app/api/rft-new/[id]/export/route.ts](../../src/app/api/rft-new/[id]/export/route.ts) — pass `report.objectivesVisible` into `exportData`.
- [src/lib/export/pdf-enhanced.ts](../../src/lib/export/pdf-enhanced.ts) — skip OBJECTIVES block when flag is false.
- [src/lib/export/docx-enhanced.ts](../../src/lib/export/docx-enhanced.ts) — skip OBJECTIVES block when flag is false.

## 4. Out of scope

- No animation, no `<details>`/`<summary>`.
- No global "show all" preference.
- No analogous toggle on TRR / Addendum / Evaluation (only RFT was requested).
- No tests (pure UI/data toggle, low value to test in this codebase's current state).
