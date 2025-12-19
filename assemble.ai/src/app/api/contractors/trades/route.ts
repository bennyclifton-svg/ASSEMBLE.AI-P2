import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { contractorTrades } from '@/lib/db';
import { eq, asc } from 'drizzle-orm';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');

    if (!projectId) {
        return NextResponse.json({ error: 'Project ID is required' }, { status: 400 });
    }

    try {
        const trades = await db.query.contractorTrades.findMany({
            where: eq(contractorTrades.projectId, projectId),
            orderBy: asc(contractorTrades.order),
            with: {
                statuses: true
            }
        });

        return NextResponse.json(trades);
    } catch (error) {
        console.error('Error fetching contractor trades:', error);
        return NextResponse.json({ error: 'Failed to fetch trades' }, { status: 500 });
    }
}
