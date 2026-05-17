import { render, screen } from '@testing-library/react';
import { AccountSettingsPanel } from '../AccountSettingsPanel';
import type { AccountState } from '@/lib/account/account-state';

function accountState(overrides: Partial<AccountState> = {}): AccountState {
    return {
        user: {
            id: 'user-1',
            email: 'person@example.com',
            name: 'Person Example',
            emailVerified: true,
            organizationId: 'org-1',
            organizationName: 'Person Workspace',
            createdAt: '2026-05-17T10:00:00.000Z',
        },
        trial: {
            planId: 'starter',
            status: 'active',
            startedAt: '2026-05-17T10:00:00.000Z',
            endsAt: '2026-05-31T10:00:00.000Z',
            daysRemaining: 14,
        },
        subscription: {
            planId: 'starter',
            planName: 'Starter',
            status: 'active_trial',
            currentPeriodEnd: null,
            cancelAtPeriodEnd: false,
            hasPolarCustomer: true,
            billingUrl: '/settings/billing?plan=starter',
            readOnly: false,
        },
        workspace: {
            organizationId: 'org-1',
            organizationName: 'Person Workspace',
            projectCount: 1,
        },
        dataControls: {
            accountExportHref: '/api/account/state',
            projectExportHint: 'Project document and programme exports remain available from each project workspace.',
            deletionRequestHref: 'mailto:support@sitewise.au?subject=Sitewise%20data%20deletion%20request',
            deletionRequestCopy: 'Email support to request deletion.',
        },
        ...overrides,
    };
}

describe('AccountSettingsPanel', () => {
    it('renders profile, trial, billing, export, and deletion state', () => {
        render(<AccountSettingsPanel initialState={accountState()} />);

        expect(screen.getByDisplayValue('Person Example')).toBeInTheDocument();
        expect(screen.getByText('person@example.com')).toBeInTheDocument();
        expect(screen.getAllByText('Starter').length).toBeGreaterThan(0);
        expect(screen.getByText('Manage subscription')).toBeInTheDocument();
        expect(screen.getByText('Download account state')).toBeInTheDocument();
        expect(screen.getByText('Request deletion')).toBeInTheDocument();
        expect(screen.getByText('Person Workspace')).toBeInTheDocument();
    });

    it('shows expired/read-only messaging', () => {
        render(<AccountSettingsPanel initialState={accountState({
            subscription: {
                planId: 'starter',
                planName: 'Starter',
                status: 'expired_trial',
                currentPeriodEnd: null,
                cancelAtPeriodEnd: false,
                hasPolarCustomer: false,
                billingUrl: '/settings/billing?plan=starter',
                readOnly: true,
            },
        })} />);

        expect(screen.getByText('Workspace is read-only')).toBeInTheDocument();
        expect(screen.getByText(/Viewing and export stay available/)).toBeInTheDocument();
    });
});
