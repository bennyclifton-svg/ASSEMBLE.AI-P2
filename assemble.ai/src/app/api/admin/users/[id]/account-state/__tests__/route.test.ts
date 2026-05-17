import { GET } from '../route';
import { requireSuperAdminApi } from '@/lib/admin/guard';
import { getAccountStateForUser } from '@/lib/account/account-state';

function jsonResponse(body: unknown, init?: ResponseInit): Response {
    return {
        status: init?.status ?? 200,
        json: async () => body,
        text: async () => JSON.stringify(body),
    } as Response;
}

jest.mock('next/server', () => ({
    NextResponse: {
        json: jsonResponse,
    },
}));

jest.mock('@/lib/admin/guard', () => ({
    requireSuperAdminApi: jest.fn(),
}));

jest.mock('@/lib/account/account-state', () => ({
    getAccountStateForUser: jest.fn(),
}));

describe('admin account-state route', () => {
    beforeEach(() => {
        jest.resetAllMocks();
    });

    it('requires super-admin access before returning account state', async () => {
        (requireSuperAdminApi as jest.Mock).mockRejectedValue(
            jsonResponse({ error: 'Forbidden' }, { status: 403 })
        );

        const response = await GET({} as Request, {
            params: Promise.resolve({ id: 'user-1' }),
        });

        expect(response.status).toBe(403);
        expect(getAccountStateForUser).not.toHaveBeenCalled();
    });

    it('returns support-facing account state for super-admins', async () => {
        (requireSuperAdminApi as jest.Mock).mockResolvedValue({ userId: 'admin-1' });
        (getAccountStateForUser as jest.Mock).mockResolvedValue({
            user: { id: 'user-1', email: 'person@example.com' },
            trial: { status: 'active' },
            subscription: { status: 'active_trial' },
            workspace: { projectCount: 1 },
        });

        const response = await GET({} as Request, {
            params: Promise.resolve({ id: 'user-1' }),
        });
        const body = await response.json();

        expect(response.status).toBe(200);
        expect(getAccountStateForUser).toHaveBeenCalledWith('user-1');
        expect(body.account.user.email).toBe('person@example.com');
    });
});
