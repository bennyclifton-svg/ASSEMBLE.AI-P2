import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/get-user';

export async function PATCH(request: NextRequest) {
    const authResult = await getCurrentUser();
    if (!authResult.user) {
        return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    const body = await request.json().catch(() => null);
    const name = typeof body?.name === 'string' ? body.name.trim() : '';
    if (name.length < 1 || name.length > 100) {
        return NextResponse.json({ error: 'Name must be 1-100 characters.' }, { status: 400 });
    }

    const [{ db }, { user }, { eq }] = await Promise.all([
        import('@/lib/db'),
        import('@/lib/db/auth-schema'),
        import('drizzle-orm'),
    ]);

    await db
        .update(user)
        .set({ name, updatedAt: new Date() })
        .where(eq(user.id, authResult.user.id));

    return NextResponse.json({
        user: {
            id: authResult.user.id,
            name,
            email: authResult.user.email,
        },
    });
}
