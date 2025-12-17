import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { costLines, consultantDisciplines, contractorTrades } from '@/lib/db';
import { eq, isNull, and, desc } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import type { CreateCostLineInput } from '@/types/cost-plan';

/**
 * GET /api/projects/[projectId]/cost-lines
 * List all cost lines for a project
 */
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ projectId: string }> }
) {
    try {
        const { projectId } = await params;

        const { searchParams } = new URL(request.url);
        const disciplineId = searchParams.get('disciplineId');

        const filters = [
            eq(costLines.projectId, projectId),
            isNull(costLines.deletedAt),
        ];

        if (disciplineId) {
            filters.push(eq(costLines.disciplineId, disciplineId));
        }

        const projectCostLines = await db
            .select()
            .from(costLines)
            .where(and(...filters))
            .orderBy(costLines.section, costLines.sortOrder);

        // Fetch disciplines and trades for each cost line
        const result = await Promise.all(
            projectCostLines.map(async (cl) => {
                let discipline = null;
                let trade = null;
                if (cl.disciplineId) {
                    const [disc] = await db
                        .select()
                        .from(consultantDisciplines)
                        .where(eq(consultantDisciplines.id, cl.disciplineId));
                    discipline = disc || null;
                }
                if (cl.tradeId) {
                    const [tr] = await db
                        .select()
                        .from(contractorTrades)
                        .where(eq(contractorTrades.id, cl.tradeId));
                    trade = tr || null;
                }
                return { ...cl, discipline, trade };
            })
        );

        return NextResponse.json(result);
    } catch (error) {
        console.error('Error fetching cost lines:', error);
        return NextResponse.json(
            { error: 'Failed to fetch cost lines' },
            { status: 500 }
        );
    }
}

/**
 * POST /api/projects/[projectId]/cost-lines
 * Create a new cost line
 */
export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ projectId: string }> }
) {
    try {
        const { projectId } = await params;
        const body: CreateCostLineInput = await request.json();

        // Validate required fields
        if (!body.activity || !body.section) {
            return NextResponse.json(
                { error: 'Activity and section are required' },
                { status: 400 }
            );
        }

        // Get next sort order if not provided
        let sortOrder = body.sortOrder;
        if (sortOrder === undefined) {
            const existing = await db
                .select({ sortOrder: costLines.sortOrder })
                .from(costLines)
                .where(
                    and(
                        eq(costLines.projectId, projectId),
                        eq(costLines.section, body.section),
                        isNull(costLines.deletedAt)
                    )
                )
                .orderBy(desc(costLines.sortOrder))
                .limit(1);

            sortOrder = existing.length > 0 ? existing[0].sortOrder + 1 : 1;
        }

        const id = uuidv4();
        const now = new Date();

        await db.insert(costLines).values({
            id,
            projectId,
            disciplineId: body.disciplineId || null,
            tradeId: body.tradeId || null,
            section: body.section,
            costCode: body.costCode || null,
            activity: body.activity,
            reference: body.reference || null,
            budgetCents: body.budgetCents || 0,
            approvedContractCents: body.approvedContractCents || 0,
            sortOrder,
            createdAt: now,
            updatedAt: now,
        });

        // Return the created cost line
        const [created] = await db
            .select()
            .from(costLines)
            .where(eq(costLines.id, id));

        return NextResponse.json(created, { status: 201 });
    } catch (error) {
        console.error('Error creating cost line:', error);
        return NextResponse.json(
            { error: 'Failed to create cost line' },
            { status: 500 }
        );
    }
}
