import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { variations, costLines } from '@/lib/db';
import { eq, isNull, and, desc } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { generateVariationNumber } from '@/lib/calculations/cost-plan-formulas';
import type { CreateVariationInput } from '@/types/variation';

/**
 * GET /api/projects/[projectId]/variations
 * List all variations for a project
 */
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ projectId: string }> }
) {
    try {
        const { projectId } = await params;
        const { searchParams } = new URL(request.url);

        // Optional filters
        const costLineId = searchParams.get('costLineId');
        const status = searchParams.get('status');
        const category = searchParams.get('category');

        const projectVariations = await db
            .select()
            .from(variations)
            .where(
                and(
                    eq(variations.projectId, projectId),
                    isNull(variations.deletedAt)
                )
            )
            .orderBy(variations.variationNumber);

        // Apply optional filters in memory
        let filtered = projectVariations;
        if (costLineId) {
            filtered = filtered.filter((v) => v.costLineId === costLineId);
        }
        if (status) {
            filtered = filtered.filter((v) => v.status === status);
        }
        if (category) {
            filtered = filtered.filter((v) => v.category === category);
        }

        // Fetch related cost line data
        const result = await Promise.all(
            filtered.map(async (v) => {
                let costLine = null;
                if (v.costLineId) {
                    const [cl] = await db
                        .select({ id: costLines.id, costCode: costLines.costCode, activity: costLines.activity, section: costLines.section })
                        .from(costLines)
                        .where(eq(costLines.id, v.costLineId));
                    costLine = cl || null;
                }
                return { ...v, costLine };
            })
        );

        return NextResponse.json(result);
    } catch (error) {
        console.error('Error fetching variations:', error);
        return NextResponse.json(
            { error: 'Failed to fetch variations' },
            { status: 500 }
        );
    }
}

/**
 * POST /api/projects/[projectId]/variations
 * Create a new variation (auto-generates variation number)
 */
export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ projectId: string }> }
) {
    try {
        const { projectId } = await params;
        const body: CreateVariationInput = await request.json();

        // Validate required fields
        if (!body.category || !body.description) {
            return NextResponse.json(
                { error: 'category and description are required' },
                { status: 400 }
            );
        }

        // Get existing variations to generate next number
        const existingVariations = await db
            .select()
            .from(variations)
            .where(eq(variations.projectId, projectId));

        const variationNumber = generateVariationNumber(existingVariations, body.category);

        const id = uuidv4();
        const now = new Date().toISOString();

        await db.insert(variations).values({
            id,
            projectId,
            costLineId: body.costLineId || null,
            variationNumber,
            category: body.category,
            description: body.description,
            status: body.status || 'Forecast',
            amountForecastCents: body.amountForecastCents || 0,
            amountApprovedCents: body.amountApprovedCents || 0,
            dateSubmitted: body.dateSubmitted || null,
            dateApproved: body.dateApproved || null,
            requestedBy: body.requestedBy || null,
            approvedBy: body.approvedBy || null,
            createdAt: now,
            updatedAt: now,
        });

        const [created] = await db
            .select()
            .from(variations)
            .where(eq(variations.id, id));

        return NextResponse.json(created, { status: 201 });
    } catch (error) {
        console.error('Error creating variation:', error);
        return NextResponse.json(
            { error: 'Failed to create variation' },
            { status: 500 }
        );
    }
}
