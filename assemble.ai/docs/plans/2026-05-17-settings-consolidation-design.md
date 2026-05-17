# Settings consolidation — design

**Date:** 2026-05-17
**Status:** Design approved, ready for implementation plan
**Author:** brainstormed with user

## Problem

The user profile dropdown today exposes three separate destinations that all conceptually belong to "settings": Billing, Admin (super-admin only), and Account Settings. Two of them (`/billing`, `/account`) share `BillingLayout`; the third (`/admin/*`) has its own different layout with horizontal tabs. The dropdown also carries a dark/light theme toggle.

Goals:

1. Collapse the three dropdown destinations into a single **Settings** entry with a cog icon.
2. Remove the theme toggle from the dropdown — dark mode is being retired entirely. App ships light-only.
3. Build a unified Settings UI that mirrors the main dashboard's left-nav + content shape, where every settings sub-page is reachable from the left nav and the content renders in the right panel.

## Out of scope

- Changing the content or behaviour of any individual settings page (account form, billing flows, admin tables). Those move as-is.
- Restyling the dropdown beyond the items being removed/added.
- Right-panel content (the new layout is two panels, not three).

## Final dropdown contents

```
[ User identity ]
---
Visit Website
Settings           <- new, cog icon, navigates to /settings
---
Sign Out           (red, distinct)
```

Removed: Billing, Admin, Account Settings, Dark/Light Mode toggle. Imports for `Moon`, `Sun`, `CreditCard`, `Shield`, `useTheme`, and the `isPrecisionDark` / `isSuperAdmin` reads come out of [UserProfileDropdown.tsx](src/components/layout/UserProfileDropdown.tsx).

## Route structure

All settings live under `/settings/*` in the existing `(dashboard)` route group:

```
src/app/(dashboard)/settings/
  layout.tsx                 SettingsLayout (2-panel)
  page.tsx                   redirect -> /settings/account
  account/page.tsx           moved from (dashboard)/account/page.tsx
  billing/page.tsx           moved from (dashboard)/billing/page.tsx
  (admin)/                   route group, layout enforces requireSuperAdminPage()
    users/page.tsx           moved from app/admin/users/page.tsx
    models/page.tsx          moved from app/admin/models/page.tsx
    storage/page.tsx         moved from app/admin/storage/page.tsx
    products/page.tsx        moved from app/admin/products/page.tsx
```

Co-located helpers move with their pages: `UsersTable.tsx`, `ModelSettingsForm.tsx`, `ProductsTable.tsx`, `StorageSettingsForm.tsx`, `FolderBrowserModal.tsx`.

Old layout files deleted: `src/app/admin/layout.tsx`, `src/app/admin/AdminTabs.tsx`, `src/components/layout/BillingLayout.tsx`.

Redirects preserved for back-compat (cheap insurance against existing deep links):

| Old path | New path |
| --- | --- |
| `/account` | `/settings/account` |
| `/billing` | `/settings/billing` |
| `/admin` | `/settings/users` (admin) or `/settings/account` (non-admin) |
| `/admin/users` | `/settings/users` |
| `/admin/models` | `/settings/models` |
| `/admin/storage` | `/settings/storage` |
| `/admin/products` | `/settings/products` |

Redirects are implemented as `page.tsx` files that call `redirect()` from `next/navigation`.

## SettingsLayout

New component: `src/components/layout/SettingsLayout.tsx`. Used by `src/app/(dashboard)/settings/layout.tsx`.

```
+----------+-------------------------------------------+
| sitewise/|                            [UserAvatar v] |
+----------+-------------------------------------------+
| [< App]  |                                           |
|          |                                           |
| Account  |                                           |
| Billing  |        section content (children)         |
|          |                                           |
| --ADMIN--|                                           |
| Users    |                                           |
| AI Models|                                           |
| Storage  |                                           |
| Products |                                           |
+----------+-------------------------------------------+
```

- Two resizable panels via `react-resizable-panels` (same library used elsewhere). Initial split ~17/83. Sizes persisted to `localStorage` key `settings-panel-sizes` (matches the dashboard's pattern).
- **Left panel** — sitewise wordmark + "Back to App" muted button + nav list. Nav items use existing `sitewise-button` styling. Active item highlighted via `data-state="active"` driven by `usePathname()`.
- **Admin subhead** — `sitewise-page-kicker` style label `ADMIN` above the admin group. Renders only if `session.user.isSuperAdmin === true`. Non-admins see only Account and Billing.
- **Right panel** — small header strip with `UserProfileDropdown` aligned right. Scrollable content area below renders `{children}` from the route. Watermark optional (existing pattern from `BillingLayout`) — keep it.

Server-side gating: a nested `src/app/(dashboard)/settings/(admin)/layout.tsx` calls `requireSuperAdminPage()` once and wraps users/models/storage/products. Hand-crafted URLs to admin paths still bounce non-admins, even if the client-side nav never showed them.

### Why pathname-driven nav (not local state)

The `usePathname()` hook drives active state. Deep links, browser back/forward, refresh, and external links into a specific section all work without any client state to reconcile.

## Theme removal

Dark mode is being retired entirely. Touchpoints to remove:

- `src/lib/hooks/use-theme.ts` — delete.
- `src/components/ui/theme-toggle.tsx` — delete.
- `src/app/globals.css` — remove `precision` theme variable block + any `[data-theme="precision"]` selectors. Light variables become the sole set.
- `src/app/layout.tsx` — remove theme initialization script / attribute.
- `src/components/ui/corner-bracket-icon.tsx` — audit; remove any theme-conditional rendering (leave the rest intact).
- `src/components/layout/UserProfileDropdown.tsx` — remove `useTheme` import, the `Moon`/`Sun` imports, the `isPrecisionDark` derivation, and the toggle `<DropdownMenuItem>`.

After this work, light mode is the only mode. Grep for `precision`, `useTheme`, `data-theme` in `src/` should return zero hits.

## Implementation order

Recommended sequencing to keep each diff reviewable:

1. **Move pages, add redirects, add SettingsLayout** (no dropdown / theme changes yet). Verify each settings page renders inside the new layout with the new left nav. Verify redirects from the old paths work. Verify admin pages still gate via `requireSuperAdminPage()`.
2. **Update UserProfileDropdown** — replace 3 items with the single Settings entry; remove the theme toggle item.
3. **Rip out theme infrastructure** — `useTheme` hook, ThemeToggle component, theme CSS, layout init. Verify the app renders correctly with only light variables.
4. **Delete dead layouts** — `BillingLayout.tsx`, `admin/layout.tsx`, `admin/AdminTabs.tsx`.

Each step is independently testable and leaves the app in a working state.

## Verification

- Manual: open `/settings`, confirm it lands on Account. Click each nav item; URL updates; correct content renders. Resize the panel; refresh; sizes persist.
- Manual: as a non-super-admin user, confirm the Admin group is not rendered in the nav and that direct navigation to `/settings/users` redirects/403s via `requireSuperAdminPage()`.
- Manual: hit each old URL (`/billing`, `/account`, `/admin/*`) and confirm the redirect lands on the right new path.
- Manual: confirm the dropdown shows only Visit Website / Settings / Sign Out and that no theme switch is reachable from the UI.
- Grep: `useTheme`, `precision`, `data-theme="precision"` return no hits in `src/`.

## Open questions

None. All decisions resolved during the brainstorm.

## Decision log

| Question | Decision |
| --- | --- |
| Route shape | All settings under `/settings/*` |
| Panel count | 2 panels (nav + content), no third surface |
| Nav grouping | Two groups; admin group hidden entirely for non-admins |
| Theme toggle | Dark mode removed entirely; light-only ship |
| Old URLs | Preserved as server-side redirects, not deleted outright |
