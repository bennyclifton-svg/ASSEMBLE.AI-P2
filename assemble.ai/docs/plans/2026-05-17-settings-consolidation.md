# Settings Consolidation Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Collapse three dropdown destinations (Billing, Admin, Account Settings) into one Settings section with a unified left-nav + content layout under `/settings/*`, and fully remove dark-mode infrastructure.

**Architecture:** New `SettingsLayout` (2-panel resizable) lives at `src/app/(dashboard)/settings/layout.tsx`. All settings pages move under `/settings/*`. A nested `(admin)` route group enforces `requireSuperAdminPage()` for admin-only sections. Old URLs become server-side redirects. `UserProfileDropdown` is trimmed to Visit Website / Settings / Sign Out. `useTheme` hook, `ThemeToggle` component, and `precision` CSS variables are deleted — app ships light-only.

**Tech Stack:** Next.js 15 App Router, `react-resizable-panels`, Tailwind via `globals.css` design tokens, Jest + React Testing Library, ESLint.

**Design doc:** [docs/plans/2026-05-17-settings-consolidation-design.md](2026-05-17-settings-consolidation-design.md)

**Working directory:** All paths below are relative to `d:\AI Projects\assemble.ai P2\assemble.ai\` (the Next.js root). Run commands from this directory. Branch: `sitewise/brief-building-port` (current branch, no worktree).

**Commit cadence:** One commit per task. Each task ends with a verified-passing state.

**Verification commands referenced throughout:**
- `npm run lint` — ESLint
- `npm run test` — Jest
- `npx tsc --noEmit` — TypeScript typecheck (no dedicated script in package.json)
- `npm run dev:next` — Local dev server for manual smoke

---

## Task 1: Add SettingsLayout component with active-state test

**Files:**
- Create: `src/components/layout/SettingsLayout.tsx`
- Create: `src/components/layout/__tests__/SettingsLayout.test.tsx`

**Step 1: Write the failing test**

Create `src/components/layout/__tests__/SettingsLayout.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import { SettingsLayout } from '../SettingsLayout';

jest.mock('next/navigation', () => ({
    usePathname: jest.fn(),
}));
jest.mock('@/lib/auth-client', () => ({
    useSession: jest.fn(),
}));

const { usePathname } = jest.requireMock('next/navigation') as { usePathname: jest.Mock };
const { useSession } = jest.requireMock('@/lib/auth-client') as { useSession: jest.Mock };

describe('SettingsLayout', () => {
    beforeEach(() => {
        useSession.mockReturnValue({
            data: { user: { name: 'Test', email: 't@example.com', isSuperAdmin: false } },
            isPending: false,
        });
    });

    it('renders Account and Billing nav for non-admin', () => {
        usePathname.mockReturnValue('/settings/account');
        render(<SettingsLayout>content</SettingsLayout>);
        expect(screen.getByRole('link', { name: /account/i })).toBeInTheDocument();
        expect(screen.getByRole('link', { name: /billing/i })).toBeInTheDocument();
        expect(screen.queryByText(/admin/i)).not.toBeInTheDocument();
    });

    it('renders admin subhead and links for super admin', () => {
        useSession.mockReturnValue({
            data: { user: { name: 'Admin', email: 'a@example.com', isSuperAdmin: true } },
            isPending: false,
        });
        usePathname.mockReturnValue('/settings/users');
        render(<SettingsLayout>content</SettingsLayout>);
        expect(screen.getByText(/admin/i)).toBeInTheDocument();
        expect(screen.getByRole('link', { name: /users/i })).toBeInTheDocument();
        expect(screen.getByRole('link', { name: /ai models/i })).toBeInTheDocument();
        expect(screen.getByRole('link', { name: /storage/i })).toBeInTheDocument();
        expect(screen.getByRole('link', { name: /products/i })).toBeInTheDocument();
    });

    it('marks the active nav item with data-state=active', () => {
        usePathname.mockReturnValue('/settings/billing');
        render(<SettingsLayout>content</SettingsLayout>);
        const billing = screen.getByRole('link', { name: /billing/i });
        expect(billing).toHaveAttribute('data-state', 'active');
        const account = screen.getByRole('link', { name: /account/i });
        expect(account).toHaveAttribute('data-state', 'inactive');
    });
});
```

**Step 2: Run test to verify it fails**

Run: `npx jest src/components/layout/__tests__/SettingsLayout.test.tsx`
Expected: FAIL — `Cannot find module '../SettingsLayout'`

**Step 3: Implement SettingsLayout**

Create `src/components/layout/SettingsLayout.tsx`:

```tsx
'use client';

import { ReactNode, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import { ArrowLeft, CreditCard, Cpu, HardDrive, Package, Settings as SettingsIcon, User, Users } from 'lucide-react';
import { SitewiseWordmark } from '@/components/brand/SitewiseWordmark';
import { UserProfileDropdown } from './UserProfileDropdown';
import { useSession } from '@/lib/auth-client';
import { cn } from '@/lib/utils';

const STORAGE_KEY = 'settings-panel-sizes';
const DEFAULT_SIZES = [17, 83];

interface NavItem {
    href: string;
    label: string;
    icon: typeof User;
}

const ACCOUNT_ITEMS: NavItem[] = [
    { href: '/settings/account', label: 'Account', icon: User },
    { href: '/settings/billing', label: 'Billing', icon: CreditCard },
];

const ADMIN_ITEMS: NavItem[] = [
    { href: '/settings/users', label: 'Users', icon: Users },
    { href: '/settings/models', label: 'AI Models', icon: Cpu },
    { href: '/settings/storage', label: 'Storage', icon: HardDrive },
    { href: '/settings/products', label: 'Products', icon: Package },
];

interface SettingsLayoutProps {
    children: ReactNode;
}

export function SettingsLayout({ children }: SettingsLayoutProps) {
    const pathname = usePathname();
    const { data: session } = useSession();
    const isSuperAdmin = (session?.user as { isSuperAdmin?: boolean } | undefined)?.isSuperAdmin === true;

    const [panelSizes, setPanelSizes] = useState<number[]>(DEFAULT_SIZES);

    useEffect(() => {
        const saved = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null;
        if (saved) {
            try {
                const sizes = JSON.parse(saved);
                if (Array.isArray(sizes) && sizes.length === 2) setPanelSizes(sizes);
            } catch {
                /* ignore */
            }
        }
    }, []);

    const handlePanelResize = useCallback((sizes: number[]) => {
        setPanelSizes(sizes);
        if (typeof window !== 'undefined') {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(sizes));
        }
    }, []);

    const renderItem = (item: NavItem) => {
        const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
        const Icon = item.icon;
        return (
            <Link
                key={item.href}
                href={item.href}
                data-state={active ? 'active' : 'inactive'}
                aria-current={active ? 'page' : undefined}
                className={cn('sitewise-button', active && 'sitewise-button-active')}
            >
                <Icon className="h-4 w-4" />
                {item.label}
            </Link>
        );
    };

    return (
        <div className="sitewise-control-surface h-screen w-full relative bg-[var(--sw-paper)]">
            <PanelGroup direction="horizontal" className="h-full w-full relative" onLayout={handlePanelResize}>
                <Panel defaultSize={panelSizes[0]} minSize={12} className="border-r border-[var(--sw-rule)]">
                    <div className="h-full flex flex-col animate-slide-in-up">
                        <header className="flex items-center px-6 py-3 border-b border-[var(--sw-rule)] bg-[var(--sw-paper-2)] flex-shrink-0 min-h-[57px]">
                            <Link href="/dashboard" className="hover:opacity-80 transition-opacity" aria-label="Sitewise — dashboard">
                                <SitewiseWordmark size={20} color="var(--color-text-primary)" accent="var(--sw-rose)" />
                            </Link>
                        </header>
                        <div className="flex-1 overflow-auto bg-[var(--sw-paper-2)] px-4 py-4">
                            <Link href="/dashboard" className="sitewise-button sitewise-button-muted">
                                <ArrowLeft className="h-4 w-4" />
                                Dashboard
                            </Link>
                            <div className="mt-4 grid gap-2">{ACCOUNT_ITEMS.map(renderItem)}</div>
                            {isSuperAdmin && (
                                <>
                                    <div className="mt-6 mb-2 px-2 sitewise-page-kicker text-[var(--sw-muted)]">Admin</div>
                                    <div className="grid gap-2">{ADMIN_ITEMS.map(renderItem)}</div>
                                </>
                            )}
                        </div>
                    </div>
                </Panel>

                <PanelResizeHandle className="w-1 bg-[var(--sw-rule)] hover:bg-[var(--sw-rose)] transition-colors cursor-col-resize h-full" />

                <Panel defaultSize={panelSizes[1]} minSize={40} className="bg-[var(--sw-paper)]">
                    <div className="h-full flex flex-col animate-slide-in-up animate-delay-100 relative">
                        <header className="flex items-center justify-end px-6 py-3 border-b border-[var(--sw-rule)] bg-[var(--sw-paper-2)] flex-shrink-0 min-h-[57px]">
                            <UserProfileDropdown />
                        </header>
                        <img
                            src="/images/logo-mask.svg"
                            alt=""
                            aria-hidden="true"
                            draggable={false}
                            className="absolute inset-0 w-full h-full object-contain pointer-events-none select-none panel-watermark"
                        />
                        <div className="flex-1 min-h-0 overflow-auto relative z-10">{children}</div>
                    </div>
                </Panel>
            </PanelGroup>
        </div>
    );
}
```

**Step 4: Run test to verify it passes**

Run: `npx jest src/components/layout/__tests__/SettingsLayout.test.tsx`
Expected: PASS — 3 tests passing.

**Step 5: Commit**

```bash
git add src/components/layout/SettingsLayout.tsx src/components/layout/__tests__/SettingsLayout.test.tsx
git commit -m "feat(settings): add SettingsLayout component with admin-gated nav"
```

---

## Task 2: Scaffold /settings route with layout + index redirect

**Files:**
- Create: `src/app/(dashboard)/settings/layout.tsx`
- Create: `src/app/(dashboard)/settings/page.tsx`

**Step 1: Create the route layout**

`src/app/(dashboard)/settings/layout.tsx`:

```tsx
import { ReactNode } from 'react';
import { SettingsLayout } from '@/components/layout/SettingsLayout';

export default function SettingsRouteLayout({ children }: { children: ReactNode }) {
    return <SettingsLayout>{children}</SettingsLayout>;
}
```

**Step 2: Create the index redirect**

`src/app/(dashboard)/settings/page.tsx`:

```tsx
import { redirect } from 'next/navigation';

export default function SettingsIndexPage() {
    redirect('/settings/account');
}
```

**Step 3: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors.

**Step 4: Verify lint passes**

Run: `npm run lint -- src/app/(dashboard)/settings src/components/layout/SettingsLayout.tsx`
Expected: No errors.

**Step 5: Commit**

```bash
git add src/app/\(dashboard\)/settings/layout.tsx src/app/\(dashboard\)/settings/page.tsx
git commit -m "feat(settings): scaffold /settings route with layout + index redirect"
```

---

## Task 3: Move /account → /settings/account, redirect old path

**Files:**
- Create: `src/app/(dashboard)/settings/account/page.tsx`
- Modify: `src/app/(dashboard)/account/page.tsx` (replace with redirect)

**Step 1: Create the new page**

`src/app/(dashboard)/settings/account/page.tsx`:

```tsx
import { AccountSettingsPanel } from '@/components/account/AccountSettingsPanel';
import { getCurrentUser } from '@/lib/auth/get-user';
import { getAccountStateForUser } from '@/lib/account/account-state';
import { redirect } from 'next/navigation';

export default async function AccountSettingsPage() {
    const authResult = await getCurrentUser();
    if (!authResult.user) {
        redirect('/login?redirect=/settings/account');
    }

    const accountState = await getAccountStateForUser(authResult.user.id);
    if (!accountState) {
        redirect('/dashboard');
    }

    return <AccountSettingsPanel initialState={accountState} />;
}
```

Note: no `BillingLayout` wrapper — the route layout handles that now.

**Step 2: Replace the old page with a redirect**

Overwrite `src/app/(dashboard)/account/page.tsx`:

```tsx
import { redirect } from 'next/navigation';

export default function AccountRedirectPage() {
    redirect('/settings/account');
}
```

**Step 3: Verify typecheck + lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: No errors.

**Step 4: Verify existing AccountSettingsPanel test still passes**

Run: `npx jest src/components/account/__tests__/AccountSettingsPanel.test.tsx`
Expected: PASS (unchanged — we moved the page, not the panel).

**Step 5: Manual smoke**

Start the dev server (if not running): `npm run dev:next`

In a browser:
1. Visit `http://localhost:3000/settings/account` — renders Account page inside SettingsLayout, left nav shows Account active.
2. Visit `http://localhost:3000/account` — redirects to `/settings/account`.

**Step 6: Commit**

```bash
git add src/app/\(dashboard\)/settings/account/page.tsx src/app/\(dashboard\)/account/page.tsx
git commit -m "feat(settings): move account page under /settings, redirect old path"
```

---

## Task 4: Move /billing → /settings/billing, redirect old path

**Files:**
- Create: `src/app/(dashboard)/settings/billing/page.tsx`
- Modify: `src/app/(dashboard)/billing/page.tsx` (replace with redirect)

**Step 1: Create the new page**

`src/app/(dashboard)/settings/billing/page.tsx`:

```tsx
'use client';

import { Suspense } from 'react';
import { BillingPanel } from '@/components/billing/BillingPanel';

function BillingContent() {
    return <BillingPanel />;
}

export default function BillingSettingsPage() {
    return (
        <Suspense
            fallback={
                <div className="h-screen flex items-center justify-center bg-[var(--sw-paper)]">
                    <div className="animate-pulse font-mono text-[var(--sw-muted)]">Loading...</div>
                </div>
            }
        >
            <BillingContent />
        </Suspense>
    );
}
```

**Step 2: Replace the old page with a redirect**

Overwrite `src/app/(dashboard)/billing/page.tsx`:

```tsx
import { redirect } from 'next/navigation';

export default function BillingRedirectPage() {
    redirect('/settings/billing');
}
```

**Step 3: Verify typecheck + lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: No errors.

**Step 4: Run billing-related tests**

Run: `npx jest src/components/billing`
Expected: PASS.

**Step 5: Manual smoke**

In a browser:
1. Visit `http://localhost:3000/settings/billing` — renders Billing page inside SettingsLayout.
2. Visit `http://localhost:3000/billing` — redirects to `/settings/billing`.
3. Visit `http://localhost:3000/billing?upgrade=growth` — redirect preserves the query string.

**Step 6: Commit**

```bash
git add src/app/\(dashboard\)/settings/billing/page.tsx src/app/\(dashboard\)/billing/page.tsx
git commit -m "feat(settings): move billing page under /settings, redirect old path"
```

---

## Task 5: Add (admin) route group with super-admin guard

**Files:**
- Create: `src/app/(dashboard)/settings/(admin)/layout.tsx`

**Step 1: Create the gated layout**

`src/app/(dashboard)/settings/(admin)/layout.tsx`:

```tsx
import { ReactNode } from 'react';
import { requireSuperAdminPage } from '@/lib/admin/guard';

export default async function AdminSettingsLayout({ children }: { children: ReactNode }) {
    await requireSuperAdminPage();
    return <>{children}</>;
}
```

The `(admin)` parens make this a route group — no URL segment — so children live at `/settings/users`, `/settings/models`, etc.

**Step 2: Verify typecheck + lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: No errors.

**Step 3: Commit**

```bash
git add src/app/\(dashboard\)/settings/\(admin\)/layout.tsx
git commit -m "feat(settings): add (admin) route group with super-admin guard"
```

---

## Task 6: Move /admin/users → /settings/users

**Files:**
- Create: `src/app/(dashboard)/settings/(admin)/users/page.tsx`
- Create: `src/app/(dashboard)/settings/(admin)/users/UsersTable.tsx` (move from `src/app/admin/users/UsersTable.tsx`)
- Modify: `src/app/admin/users/page.tsx` (replace with redirect)
- Delete: `src/app/admin/users/UsersTable.tsx` (after move)

**Step 1: Read the existing files**

Read `src/app/admin/users/page.tsx` and `src/app/admin/users/UsersTable.tsx` to capture the current content.

**Step 2: Copy contents to new locations**

Copy `src/app/admin/users/UsersTable.tsx` verbatim to `src/app/(dashboard)/settings/(admin)/users/UsersTable.tsx`.

Copy the body of `src/app/admin/users/page.tsx` to `src/app/(dashboard)/settings/(admin)/users/page.tsx`, but:
- Update the `UsersTable` import path to `'./UsersTable'`.
- Remove any `requireSuperAdminPage` call from the page itself (the route-group layout handles it now). If the page also fetches data, keep that logic.

**Step 3: Replace old page with redirect**

Overwrite `src/app/admin/users/page.tsx`:

```tsx
import { redirect } from 'next/navigation';

export default function AdminUsersRedirectPage() {
    redirect('/settings/users');
}
```

**Step 4: Delete the old UsersTable**

```bash
git rm src/app/admin/users/UsersTable.tsx
```

**Step 5: Verify typecheck + lint + tests**

Run: `npx tsc --noEmit && npm run lint && npm run test -- --testPathIgnorePatterns=node_modules`
Expected: No errors.

**Step 6: Manual smoke**

In a browser as a super-admin user:
1. Visit `http://localhost:3000/settings/users` — renders users table inside SettingsLayout, ADMIN subhead visible, Users active.
2. Visit `http://localhost:3000/admin/users` — redirects to `/settings/users`.

As a non-admin user:
3. Visit `http://localhost:3000/settings/users` — gets 403/redirect via `requireSuperAdminPage()`.

**Step 7: Commit**

```bash
git add src/app/\(dashboard\)/settings/\(admin\)/users src/app/admin/users/page.tsx
git commit -m "feat(settings): move admin users page under /settings"
```

---

## Task 7: Move /admin/models → /settings/models

Same shape as Task 6.

**Files:**
- Create: `src/app/(dashboard)/settings/(admin)/models/page.tsx`
- Create: `src/app/(dashboard)/settings/(admin)/models/ModelSettingsForm.tsx` (move from `src/app/admin/models/ModelSettingsForm.tsx`)
- Modify: `src/app/admin/models/page.tsx` (replace with redirect)
- Delete: `src/app/admin/models/ModelSettingsForm.tsx`

Follow Steps 1-7 from Task 6 with `models` substituted for `users` and `ModelSettingsForm` for `UsersTable`.

**Manual smoke target:** `/settings/models` renders; `/admin/models` redirects.

**Commit:**

```bash
git add src/app/\(dashboard\)/settings/\(admin\)/models src/app/admin/models/page.tsx
git commit -m "feat(settings): move admin models page under /settings"
```

---

## Task 8: Move /admin/storage → /settings/storage

Same shape as Task 6. Note: storage has two co-located components.

**Files:**
- Create: `src/app/(dashboard)/settings/(admin)/storage/page.tsx`
- Create: `src/app/(dashboard)/settings/(admin)/storage/StorageSettingsForm.tsx`
- Create: `src/app/(dashboard)/settings/(admin)/storage/FolderBrowserModal.tsx`
- Modify: `src/app/admin/storage/page.tsx` (replace with redirect)
- Delete the two source files under `src/app/admin/storage/`.

**Manual smoke target:** `/settings/storage` renders, folder browser modal still works; `/admin/storage` redirects.

**Commit:**

```bash
git add src/app/\(dashboard\)/settings/\(admin\)/storage src/app/admin/storage/page.tsx
git commit -m "feat(settings): move admin storage page under /settings"
```

---

## Task 9: Move /admin/products → /settings/products

Same shape as Task 6.

**Files:**
- Create: `src/app/(dashboard)/settings/(admin)/products/page.tsx`
- Create: `src/app/(dashboard)/settings/(admin)/products/ProductsTable.tsx`
- Modify: `src/app/admin/products/page.tsx` (replace with redirect)
- Delete: `src/app/admin/products/ProductsTable.tsx`

**Manual smoke target:** `/settings/products` renders; `/admin/products` redirects.

**Commit:**

```bash
git add src/app/\(dashboard\)/settings/\(admin\)/products src/app/admin/products/page.tsx
git commit -m "feat(settings): move admin products page under /settings"
```

---

## Task 10: Redirect /admin → /settings/users and remove old admin layout

**Files:**
- Modify: `src/app/admin/page.tsx` (already redirects to /admin/users — change target to /settings/users)
- Delete: `src/app/admin/layout.tsx`
- Delete: `src/app/admin/AdminTabs.tsx`

**Step 1: Update the /admin index redirect**

Overwrite `src/app/admin/page.tsx`:

```tsx
import { redirect } from 'next/navigation';

export default function AdminIndexRedirectPage() {
    redirect('/settings/users');
}
```

**Step 2: Delete the dead layout files**

```bash
git rm src/app/admin/layout.tsx src/app/admin/AdminTabs.tsx
```

**Step 3: Verify typecheck + lint + tests**

Run: `npx tsc --noEmit && npm run lint && npm run test`
Expected: No errors.

**Step 4: Manual smoke**

As a super-admin user, visit `http://localhost:3000/admin` — redirects to `/settings/users`. The old admin tab bar no longer appears.

As a non-admin user, visit `http://localhost:3000/admin` — redirects to `/settings/users`, which then redirects/403s via the (admin) layout guard.

**Step 5: Commit**

```bash
git add src/app/admin
git commit -m "refactor(settings): remove old admin layout, point /admin to /settings"
```

---

## Task 11: Update UserProfileDropdown — single Settings entry, no theme toggle

**Files:**
- Modify: `src/components/layout/UserProfileDropdown.tsx`

**Step 1: Write a test for the new dropdown contents**

Create `src/components/layout/__tests__/UserProfileDropdown.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { UserProfileDropdown } from '../UserProfileDropdown';

jest.mock('next/navigation', () => ({ useRouter: () => ({ push: jest.fn() }) }));
jest.mock('@/lib/auth-client', () => ({
    useSession: jest.fn(),
    signOut: jest.fn(),
}));

const { useSession } = jest.requireMock('@/lib/auth-client') as { useSession: jest.Mock };

describe('UserProfileDropdown', () => {
    beforeEach(() => {
        useSession.mockReturnValue({
            data: { user: { name: 'Test', email: 't@example.com', isSuperAdmin: true } },
            isPending: false,
        });
    });

    it('shows only Visit Website, Settings, and Sign Out (no Billing/Admin/Account/Theme)', async () => {
        const user = userEvent.setup();
        render(<UserProfileDropdown />);
        await user.click(screen.getByRole('button', { name: /open user menu/i }));

        expect(screen.getByRole('menuitem', { name: /visit website/i })).toBeInTheDocument();
        expect(screen.getByRole('menuitem', { name: /^settings$/i })).toBeInTheDocument();
        expect(screen.getByRole('menuitem', { name: /sign out/i })).toBeInTheDocument();

        expect(screen.queryByRole('menuitem', { name: /billing/i })).not.toBeInTheDocument();
        expect(screen.queryByRole('menuitem', { name: /^admin$/i })).not.toBeInTheDocument();
        expect(screen.queryByRole('menuitem', { name: /account settings/i })).not.toBeInTheDocument();
        expect(screen.queryByRole('menuitem', { name: /(dark|light) mode/i })).not.toBeInTheDocument();
    });
});
```

**Step 2: Run test to verify it fails**

Run: `npx jest src/components/layout/__tests__/UserProfileDropdown.test.tsx`
Expected: FAIL — current dropdown still has Billing/Admin/Account Settings/Theme items.

**Step 3: Edit `src/components/layout/UserProfileDropdown.tsx`**

Apply these edits:

1. **Imports** — remove `CreditCard`, `Moon`, `Shield`, `Sun`. Keep `ExternalLink`, `LogOut`, `Settings`. Remove the `useTheme` import line.
2. **Component body** — delete the `useTheme` destructure and the `isPrecisionDark` and `isSuperAdmin` local variable declarations.
3. **Menu items** — delete the three navigation items (Billing, Admin conditional, Account Settings) and the theme toggle item. Insert a single new item after "Visit Website":

```tsx
<DropdownMenuItem onClick={() => handleNavigation('/settings')}>
    <Settings className="mr-2 h-4 w-4" />
    <span>Settings</span>
</DropdownMenuItem>
```

Final menu order: User identity → separator → Visit Website → Settings → separator → Sign Out.

**Step 4: Run test to verify it passes**

Run: `npx jest src/components/layout/__tests__/UserProfileDropdown.test.tsx`
Expected: PASS.

**Step 5: Verify typecheck + lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: No errors.

**Step 6: Manual smoke**

In a browser:
1. Open the user avatar dropdown — see only Visit Website, Settings, Sign Out.
2. Click Settings — lands on `/settings/account`.

**Step 7: Commit**

```bash
git add src/components/layout/UserProfileDropdown.tsx src/components/layout/__tests__/UserProfileDropdown.test.tsx
git commit -m "feat(settings): trim UserProfileDropdown to Settings entry only"
```

---

## Task 12: Update internal links pointing at old paths

**Files:**
- Modify: `src/components/billing/UpgradeModal.tsx` — change `href={\`/billing?upgrade=${requiredPlan}\`}` to `href={\`/settings/billing?upgrade=${requiredPlan}\`}`.
- Modify: `src/components/account/AccountSettingsPanel.tsx` — change `<Link href="/billing" ...>` to `<Link href="/settings/billing" ...>`.

**Step 1: Find any other stragglers**

Run a search for direct internal links to old paths.

Search 1: `grep -rE "href=[\"'](\/billing|\/account|\/admin)[\"']" src/ --include="*.tsx" --include="*.ts"`

Search 2: `grep -rE "router\.push\([\"'](\/billing|\/account|\/admin)" src/ --include="*.tsx" --include="*.ts"`

Search 3: `grep -rE "redirect\([\"'](\/billing|\/account|\/admin)[\"']" src/app/ --include="*.tsx" --include="*.ts"`

Expected: For each hit that is **not** in a redirect-page itself or in test fixtures used for URL-string assertions, update the link to the `/settings/*` equivalent.

Hits in the redirect pages we created (e.g. `src/app/admin/page.tsx` → `redirect('/settings/users')`) are correct — don't touch.

Hits in fixture data like `billingUrl: '/billing?plan=starter'` in `AccountSettingsPanel.test.tsx` and `account-state.ts` should be updated to `/settings/billing?plan=starter` so the canonical URL is the new one — old path still works via redirect, but the test data should reflect the new truth.

**Step 2: Apply each edit**

For each hit found in Step 1, update the URL string to the `/settings/*` equivalent.

**Step 3: Verify typecheck + lint + tests**

Run: `npx tsc --noEmit && npm run lint && npm run test`
Expected: All pass.

**Step 4: Commit**

```bash
git add -A src/
git commit -m "refactor(settings): point internal links at /settings/* paths"
```

---

## Task 13: Delete BillingLayout

**Files:**
- Delete: `src/components/layout/BillingLayout.tsx`

**Step 1: Confirm no remaining references**

Run: `grep -r "BillingLayout" src/`
Expected: No hits. (We replaced the imports in Tasks 3 and 4.)

If anything still imports `BillingLayout`, fix that file first before deleting.

**Step 2: Delete the file**

```bash
git rm src/components/layout/BillingLayout.tsx
```

**Step 3: Verify typecheck + lint + tests**

Run: `npx tsc --noEmit && npm run lint && npm run test`
Expected: All pass.

**Step 4: Commit**

```bash
git commit -m "refactor(settings): delete dead BillingLayout component"
```

---

## Task 14: Rip out `useTheme` hook

**Files:**
- Delete: `src/lib/hooks/use-theme.ts`

**Step 1: Confirm no remaining references**

Run: `grep -r "useTheme\|use-theme" src/`
Expected: hits only in `src/lib/hooks/use-theme.ts` itself and in `src/components/ui/theme-toggle.tsx`. We will handle the latter in Task 15.

If `UserProfileDropdown.tsx` still has any reference, go back to Task 11 — that should have been cleaned up.

**Step 2: Delete the hook file**

```bash
git rm src/lib/hooks/use-theme.ts
```

**Step 3: Don't run tests yet** — `ThemeToggle` still imports the hook, so typecheck will fail until Task 15. Proceed straight to Task 15 in the same logical unit if you prefer one commit; otherwise commit only after Task 15.

**Step 4: (Optional) Skip commit, fold into Task 15**

Move on to Task 15. Combine commits at the end.

---

## Task 15: Delete ThemeToggle component

**Files:**
- Delete: `src/components/ui/theme-toggle.tsx`

**Step 1: Confirm ThemeToggle is unused outside its own file**

Run: `grep -r "ThemeToggle\|theme-toggle" src/`
Expected: hits only in `src/components/ui/theme-toggle.tsx` itself. If anything else imports it, those imports must be removed first.

**Step 2: Delete the file**

```bash
git rm src/components/ui/theme-toggle.tsx
```

**Step 3: Verify typecheck + lint + tests**

Run: `npx tsc --noEmit && npm run lint && npm run test`
Expected: All pass.

**Step 4: Commit (combined with Task 14)**

```bash
git commit -m "refactor(theme): remove useTheme hook and ThemeToggle component"
```

---

## Task 16: Strip precision theme CSS from globals.css

**Files:**
- Modify: `src/app/globals.css`

**Step 1: Read current globals.css**

Open `src/app/globals.css` and identify:
- The `[data-theme="precision"]` selector block (or `.precision`, `:root[data-theme="precision"]`, etc.).
- Any CSS variables defined only inside the precision block.
- Any references to `var(--precision-*)` elsewhere in the stylesheet.

**Step 2: Remove the precision block**

Delete the entire `[data-theme="precision"]` / precision-only variable block. The remaining `:root` (light) variables become the sole set.

**Step 3: Hunt for any remaining theme conditionals**

Run: `grep -nE "(precision|data-theme)" src/app/globals.css`
Expected: 0 hits.

**Step 4: Verify lint + manual visual smoke**

Run: `npm run lint`
Expected: No errors.

In a browser, walk through the main app surfaces — dashboard, project register, settings (account/billing/users/models/storage/products), chat, documents. Confirm everything still looks correct in light mode. There should be no visible difference from before since the app was defaulting to light anyway.

**Step 5: Commit**

```bash
git add src/app/globals.css
git commit -m "refactor(theme): remove precision (dark) theme CSS variables"
```

---

## Task 17: Remove theme initialization from app/layout.tsx

**Files:**
- Modify: `src/app/layout.tsx`

**Step 1: Read the current file**

Open `src/app/layout.tsx`. Identify:
- Any `<script>` blocks that read a theme preference from localStorage and set `document.documentElement.dataset.theme`.
- Any `data-theme` attribute set on `<html>` or `<body>`.
- Any imports related to theme initialization.

**Step 2: Remove all theme-related code**

Delete the theme init script and any `data-theme` attributes. The `<html>` and `<body>` tags should be plain — no theme attributes.

**Step 3: Verify typecheck + lint + tests**

Run: `npx tsc --noEmit && npm run lint && npm run test`
Expected: All pass.

**Step 4: Manual smoke**

Reload the app. The page should render in light mode immediately with no flash. View HTML source — no `data-theme` attribute anywhere.

**Step 5: Commit**

```bash
git add src/app/layout.tsx
git commit -m "refactor(theme): remove theme initialization from root layout"
```

---

## Task 18: Audit corner-bracket-icon and other theme-conditional code

**Files:**
- Modify: `src/components/ui/corner-bracket-icon.tsx` (if it has theme conditionals)

**Step 1: Read the file**

Open `src/components/ui/corner-bracket-icon.tsx`. Look for any reference to `theme`, `precision`, or `data-theme`.

**Step 2: If theme-conditional rendering exists, remove the conditional**

Pick the "light" branch as the only path. Remove any `useTheme` import and conditional logic.

**Step 3: Final grep sweep**

Run these searches — all should return zero hits in `src/`:

- `grep -rE "useTheme" src/`
- `grep -rE "precision" src/`  (allow false positives in design tokens or comments, but no theme switching)
- `grep -rE "data-theme" src/`
- `grep -rE "ThemeToggle" src/`

If anything remains, clean it up before committing.

**Step 4: Verify typecheck + lint + tests**

Run: `npx tsc --noEmit && npm run lint && npm run test`
Expected: All pass.

**Step 5: Commit**

```bash
git add -A
git commit -m "refactor(theme): final cleanup of theme-conditional code"
```

---

## Task 19: Final verification pass

**No file changes** — this is a verification-only step. Confirms the whole feature works end-to-end before declaring done.

**Step 1: Full test suite**

Run: `npm run test`
Expected: PASS.

**Step 2: Lint**

Run: `npm run lint`
Expected: No errors or warnings introduced by this work.

**Step 3: TypeScript**

Run: `npx tsc --noEmit`
Expected: No errors.

**Step 4: Manual end-to-end smoke**

Start the dev server: `npm run dev:next`

As a **non-admin user**:
1. Sign in.
2. Open avatar dropdown — see Visit Website / Settings / Sign Out only.
3. Click Settings — lands on `/settings/account`.
4. Click Billing in left nav — lands on `/settings/billing`.
5. URL bar: `/account` redirects to `/settings/account`. `/billing` redirects to `/settings/billing`.
6. URL bar: `/settings/users` — redirects/403s (non-admin).
7. Confirm no ADMIN section header is visible in the left nav.

As a **super-admin user**:
8. Sign in.
9. Open avatar dropdown — same three items.
10. Click Settings — lands on `/settings/account`.
11. ADMIN subhead visible above Users / AI Models / Storage / Products.
12. Click each admin nav item — page renders.
13. URL bar: `/admin` redirects to `/settings/users`.
14. URL bar: `/admin/users`, `/admin/models`, `/admin/storage`, `/admin/products` each redirect to the `/settings/*` equivalent.

**Theme check (both users):**
15. View HTML source — no `data-theme` attribute. App in light mode. No dark mode reachable anywhere.

**Resize check:**
16. Drag the left/right panel resize handle in /settings — sizes persist after refresh.

**Step 5: Done**

If all steps pass, the feature is complete. No final commit needed — Task 18 was the last code change.

---

## Risk notes for the executor

1. **Route group `(admin)` is parens-not-curlies.** Next.js route groups use literal `(name)` directories. Make sure your shell isn't expanding the parens.
2. **App router server vs client components.** Pages that use server-side auth (`getCurrentUser`, `requireSuperAdminPage`) must NOT have `'use client'` at the top. Pages that use client hooks (e.g. `Suspense` query params) must. Match what the original page used.
3. **The dropdown's `useSession`** comes from `@/lib/auth-client` (better-auth), and `isSuperAdmin` is a narrowed read off the user object — see [UserProfileDropdown.tsx:64](src/components/layout/UserProfileDropdown.tsx#L64). The SettingsLayout reads it the same way.
4. **`requireSuperAdminPage()`** lives in `src/lib/admin/guard.ts`. The (admin) layout calls it once for the whole group.
5. **Redirects preserve query strings** automatically when using `redirect()` from `next/navigation` *only if* you pass them through. The simple `redirect('/settings/billing')` form does NOT preserve query. For pages that need query preservation (e.g. `/billing?upgrade=growth`), use a Route Handler or read `searchParams` in the page and append. **Decision:** for this feature, we'll accept that redirects drop query strings — internal callers were updated in Task 12, and external links are unlikely. If you find a flow that depends on query passthrough, raise it before declaring complete.
6. **Existing test fixtures** in `account-state.ts` may include URLs like `/billing?plan=starter`. These were updated in Task 12. If a test starts failing because it asserts on the old URL, that test fixture needs the same update.
