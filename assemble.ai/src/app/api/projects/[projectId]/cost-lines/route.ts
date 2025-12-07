import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { costLines, companies } from '@/lib/db/schema';
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

        const projectCostLines = await db
            .select()
            .from(costLines)
            .where(
                and(
                    eq(costLines.projectId, projectId),
                    isNull(costLines.deletedAt)
                )
            )
            .orderBy(costLines.section, costLines.sortOrder);

        // Fetch companies for each cost line
        const result = await Promise.all(
            projectCostLines.map(async (cl) => {
                let company = null;
                if (cl.companyId) {
                    const [comp] = await db
                        .select()
                        .from(companies)
                        .where(eq(companies.id, cl.companyId));
                    company = comp || null;
                }
                return { ...cl, company };
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
        if (!body.description || !body.section) {
            return NextResponse.json(
                { error: 'Description and section are required' },
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
        const now = new Date().toISOString();

        await db.insert(costLines).values({
            id,
            projectId,
            companyId: body.companyId || null,
            section: body.section,
            costCode: body.costCode || null,
            description: body.description,
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
