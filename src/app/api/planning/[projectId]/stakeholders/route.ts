import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { stakeholders } from '@/lib/db';
import { eq } from 'drizzle-orm';
import { stakeholderSchema } from '@/lib/validations/planning-schema';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ projectId: string }> }
) {
    try {
        const { projectId } = await params;
        const projectStakeholders = await db.select().from(stakeholders).where(eq(stakeholders.projectId, projectId));
        return NextResponse.json(projectStakeholders);
    } catch (error) {
        return NextResponse.json({ error: 'Failed to fetch stakeholders' }, { status: 500 });
    }
}

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ projectId: string }> }
) {
    try {
        const { projectId } = await params;
        const body = await request.json();
        const validated = stakeholderSchema.parse(body);

        const existing = await db.select().from(stakeholders).where(eq(stakeholders.projectId, projectId));
        const order = existing.length;

        const [newStakeholder] = await db.insert(stakeholders).values({
            id: crypto.randomUUID(),
            projectId,
            ...validated,
            order,
        }).returning();

        return NextResponse.json(newStakeholder, { status: 201 });
    } catch (error) {
        return NextResponse.json({ error: 'Failed to create stakeholder' }, { status: 500 });
    }
}
