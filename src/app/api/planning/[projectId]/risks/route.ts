import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { risks } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { riskSchema } from '@/lib/validations/planning-schema';

export async function GET(
    request: NextRequest,
    { params }: { params: { projectId: string } }
) {
    try {
        const { projectId } = params;
        const projectRisks = await db.select().from(risks).where(eq(risks.projectId, projectId));
        return NextResponse.json(projectRisks);
    } catch (error) {
        return NextResponse.json({ error: 'Failed to fetch risks' }, { status: 500 });
    }
}

export async function POST(
    request: NextRequest,
    { params }: { params: { projectId: string } }
) {
    try {
        const { projectId } = params;
        const body = await request.json();
        const validated = riskSchema.parse(body);

        const existingRisks = await db.select().from(risks).where(eq(risks.projectId, projectId));
        const order = existingRisks.length;

        const [newRisk] = await db.insert(risks).values({
            id: crypto.randomUUID(),
            projectId,
            ...validated,
            order,
        }).returning();

        return NextResponse.json(newRisk, { status: 201 });
    } catch (error) {
        return NextResponse.json({ error: 'Failed to create risk' }, { status: 500 });
    }
}
