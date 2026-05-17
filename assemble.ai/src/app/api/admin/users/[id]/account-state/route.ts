import { NextResponse } from 'next/server';
import { requireSuperAdminApi } from '@/lib/admin/guard';

export async function GET(
    _request: Request,
    context: { params: Promise<{ id: string }> | { id: string } }
) {
    try {
        await requireSuperAdminApi();
    } catch (response) {
        return response as Response;
    }

    const params = await context.params;
    const { getAccountStateForUser } = await import('@/lib/account/account-state');
    const account = await getAccountStateForUser(params.id);

    if (!account) {
        return NextResponse.json({ error: 'Account not found' }, { status: 404 });
    }

    return NextResponse.json({ account });
}
