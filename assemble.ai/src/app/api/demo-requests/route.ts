import { NextRequest, NextResponse } from 'next/server';
import { db, demoRequests } from '@/lib/db';
import { randomUUID } from 'crypto';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();

        if (!body.email || typeof body.email !== 'string') {
            return NextResponse.json({ error: 'Email is required' }, { status: 400 });
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(body.email)) {
            return NextResponse.json({ error: 'Invalid email format' }, { status: 400 });
        }

        const id = randomUUID();

        await db.insert(demoRequests).values({
            id,
            name: body.name || null,
            email: body.email.trim().toLowerCase(),
            company: body.company || null,
            message: body.message || null,
            source: body.source === 'hero_email' ? 'hero_email' : 'demo_form',
        });

        return NextResponse.json({ success: true, id }, { status: 201 });
    } catch (error) {
        console.error('[POST /api/demo-requests] Error:', error);
        return NextResponse.json({ error: 'Failed to submit demo request' }, { status: 500 });
    }
}
