import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/get-user';
import { getAccountStateForUser } from '@/lib/account/account-state';

export async function GET() {
    const authResult = await getCurrentUser();
    if (!authResult.user) {
        return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    const account = await getAccountStateForUser(authResult.user.id);
    if (!account) {
        return NextResponse.json({ error: 'Account not found' }, { status: 404 });
    }

    return NextResponse.json({ account });
}
