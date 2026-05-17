import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { SettingsLayout } from '../SettingsLayout';

jest.mock('next/navigation', () => ({
    usePathname: jest.fn(),
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

    it('renders Account and Billing nav for non-admin', () => {
        usePathname.mockReturnValue('/settings/account');
        render(<SettingsLayout>content</SettingsLayout>);
        expect(screen.getByRole('link', { name: /account/i })).toBeInTheDocument();
        expect(screen.getByRole('link', { name: /billing/i })).toBeInTheDocument();
        expect(screen.queryByText(/admin/i)).not.toBeInTheDocument();
    });

    it('renders admin subhead and links for super admin', () => {
        useIsSuperAdmin.mockReturnValue(true);
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
