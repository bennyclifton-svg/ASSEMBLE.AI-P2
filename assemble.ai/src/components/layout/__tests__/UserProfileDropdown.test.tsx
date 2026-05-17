import { fireEvent, render, screen } from '@testing-library/react';
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

    it('shows only Visit Website, Settings, and Sign Out (no Billing/Admin/Account/Theme)', () => {
        render(<UserProfileDropdown />);
        // Radix dropdown's Trigger opens on pointerdown (mousedown won't do it,
        // and click is ignored). Pressing Enter on the focused trigger is the
        // accessibility-compliant path and works in jsdom without user-event.
        const trigger = screen.getByRole('button', { name: /open user menu/i });
        trigger.focus();
        fireEvent.keyDown(trigger, { key: 'Enter', code: 'Enter' });

        expect(screen.getByRole('menuitem', { name: /visit website/i })).toBeInTheDocument();
        expect(screen.getByRole('menuitem', { name: /^settings$/i })).toBeInTheDocument();
        expect(screen.getByRole('menuitem', { name: /sign out/i })).toBeInTheDocument();

        expect(screen.queryByRole('menuitem', { name: /^billing$/i })).not.toBeInTheDocument();
        expect(screen.queryByRole('menuitem', { name: /^admin$/i })).not.toBeInTheDocument();
        expect(screen.queryByRole('menuitem', { name: /account settings/i })).not.toBeInTheDocument();
        expect(screen.queryByRole('menuitem', { name: /(dark|light) mode/i })).not.toBeInTheDocument();
    });
});
