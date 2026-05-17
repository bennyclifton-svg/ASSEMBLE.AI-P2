import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { SettingsLayout } from '../SettingsLayout';

jest.mock('next/navigation', () => ({
    usePathname: jest.fn(),
    useRouter: () => ({ push: jest.fn() }),
}));
jest.mock('@/lib/auth-client', () => ({
    useIsSuperAdmin: jest.fn(),
}));
// react-resizable-panels ships as ESM and isn't transformed by Jest's default
// config; stub the panel primitives so the layout renders synchronously.
jest.mock('react-resizable-panels', () => ({
    PanelGroup: ({ children }: { children: ReactNode }) => <div>{children}</div>,
    Panel: ({ children }: { children: ReactNode }) => <div>{children}</div>,
    PanelResizeHandle: () => <div />,
}));
// next/image renders fine in jsdom but the dashboard logo isn't load-bearing
// for the nav assertions; stub to a plain img to keep the test focused.
jest.mock('next/image', () => ({
    __esModule: true,
    default: ({ alt, ...rest }: { alt: string; [key: string]: unknown }) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img alt={alt} {...(rest as Record<string, unknown>)} />
    ),
}));
// UserProfileDropdown drags in next/navigation's useRouter, theme hooks, and
// Radix dropdowns; stub it so SettingsLayout's nav surface is what we assert.
jest.mock('../UserProfileDropdown', () => ({
    UserProfileDropdown: () => <div data-testid="user-profile-dropdown" />,
}));

const { usePathname } = jest.requireMock('next/navigation') as { usePathname: jest.Mock };
const { useIsSuperAdmin } = jest.requireMock('@/lib/auth-client') as {
    useIsSuperAdmin: jest.Mock;
};

describe('SettingsLayout', () => {
    beforeEach(() => {
        useIsSuperAdmin.mockReturnValue(false);
    });

    it('renders Account, Billing, and AI Memory nav for non-admin', () => {
        usePathname.mockReturnValue('/settings/account');
        render(<SettingsLayout>content</SettingsLayout>);
        expect(screen.getByRole('button', { name: /account/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /billing/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /ai memory/i })).toBeInTheDocument();
        // Admin label is not in the group label when non-admin
        expect(screen.queryByText('Admin')).not.toBeInTheDocument();
    });

    it('renders admin subhead and links for super admin', () => {
        useIsSuperAdmin.mockReturnValue(true);
        usePathname.mockReturnValue('/settings/users');
        render(<SettingsLayout>content</SettingsLayout>);
        expect(screen.getByText('Admin')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /users/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /ai models/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /storage/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /products/i })).toBeInTheDocument();
    });

    it('marks the active nav item with sitewise-nav-item-active class', () => {
        usePathname.mockReturnValue('/settings/billing');
        render(<SettingsLayout>content</SettingsLayout>);
        const billing = screen.getByRole('button', { name: /billing/i });
        expect(billing).toHaveClass('sitewise-nav-item-active');
        const account = screen.getByRole('button', { name: /account/i });
        expect(account).not.toHaveClass('sitewise-nav-item-active');
    });
});
