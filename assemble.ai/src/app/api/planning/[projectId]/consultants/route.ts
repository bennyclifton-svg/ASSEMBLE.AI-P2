import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { consultantDisciplines, consultantStatuses } from '@/lib/db';
import { eq } from 'drizzle-orm';
import { CONSULTANT_DISCIPLINES, STATUS_TYPES } from '@/lib/constants/disciplines';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ projectId: string }> }
) {
    try {
        const { projectId } = await params;

        // Fetch all disciplines for the project
        const disciplines = await db
            .select()
            .from(consultantDisciplines)
            .where(eq(consultantDisciplines.projectId, projectId))
            .orderBy(consultantDisciplines.order);

        // Fetch all statuses for these disciplines
        const disciplineIds = disciplines.map(d => d.id);
        const statuses = disciplineIds.length > 0
            ? await db
                .select()
                .from(consultantStatuses)
                .where(eq(consultantStatuses.disciplineId, disciplineIds[0])) // We'll fix this with a better query
            : [];

        // For now, fetch statuses for each discipline individually (can be optimized later)
        const disciplinesWithStatuses = await Promise.all(
            disciplines.map(async (discipline) => {
                const disciplineStatuses = await db
                    .select()
                    .from(consultantStatuses)
                    .where(eq(consultantStatuses.disciplineId, discipline.id));

                const statusMap = {
                    brief: disciplineStatuses.find(s => s.statusType === 'brief')?.isActive || false,
                    tender: disciplineStatuses.find(s => s.statusType === 'tender')?.isActive || false,
                    rec: disciplineStatuses.find(s => s.statusType === 'rec')?.isActive || false,
                    award: disciplineStatuses.find(s => s.statusType === 'award')?.isActive || false,
                };

                return {
                    id: discipline.id,
                    disciplineName: discipline.disciplineName,
                    isEnabled: discipline.isEnabled,
                    order: discipline.order,
                    statuses: statusMap,
                };
            })
        );

        return NextResponse.json(disciplinesWithStatuses);
    } catch (error) {
        console.error('Error fetching consultants:', error);
        return NextResponse.json({ error: 'Failed to fetch consultants' }, { status: 500 });
    }
}

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ projectId: string }> }
) {
    try {
        const { projectId } = await params;

        // Check if disciplines already exist for this project
        const existing = await db
            .select()
            .from(consultantDisciplines)
            .where(eq(consultantDisciplines.projectId, projectId));

        if (existing.length > 0) {
            return NextResponse.json({ message: 'Consultants already initialized' }, { status: 200 });
        }

        // Create all 37 default disciplines
        const disciplineRecords = CONSULTANT_DISCIPLINES.map((discipline) => ({
            id: crypto.randomUUID(),
            projectId,
            disciplineName: discipline.name,
            isEnabled: false, // Default to disabled
            order: discipline.order,
        }));

        const createdDisciplines = await db
            .insert(consultantDisciplines)
            .values(disciplineRecords)
            .returning();

        // Create status records for each discipline
        const statusRecords = createdDisciplines.flatMap((discipline) =>
            STATUS_TYPES.map((statusType) => ({
                id: crypto.randomUUID(),
                disciplineId: discipline.id,
                statusType,
                isActive: false, // Default to inactive
            }))
        );

        await db.insert(consultantStatuses).values(statusRecords);

        return NextResponse.json(
            { message: 'Consultants initialized successfully', count: createdDisciplines.length },
            { status: 201 }
        );
    } catch (error) {
        console.error('Error initializing consultants:', error);
        return NextResponse.json({ error: 'Failed to initialize consultants' }, { status: 500 });
    }
}
