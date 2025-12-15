import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { consultantDisciplines } from '@/lib/db';
import { eq, asc } from 'drizzle-orm';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');

    if (!projectId) {
        return NextResponse.json({ error: 'Project ID is required' }, { status: 400 });
    }

    try {
        const disciplines = await db.query.consultantDisciplines.findMany({
            where: eq(consultantDisciplines.projectId, projectId),
            orderBy: asc(consultantDisciplines.order),
            with: {
                statuses: true
            }
        });

        return NextResponse.json(disciplines);
    } catch (error) {
        console.error('Error fetching consultant disciplines:', error);
        return NextResponse.json({ error: 'Failed to fetch disciplines' }, { status: 500 });
    }
}
