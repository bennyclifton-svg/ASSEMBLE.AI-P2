import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import {
    consultants,
    contractors,
    companies,
    evaluationPrice,
    evaluationRows,
    evaluationCells,
    costLines,
} from '@/lib/db';
import { eq, and, ne, desc, isNull, inArray } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

interface AwardFirmRequest {
    projectId: string;
    firmId: string;
    firmType: 'consultant' | 'contractor';
    stakeholderId: string;
    awarded: boolean;
}

interface AwardFirmResponse {
    success: boolean;
    firm?: {
        id: string;
        companyName: string;
        awarded: boolean;
        companyId: string | null;
    };
    companyId?: string | null;
    contractValueCents?: number;
    costLineId?: string | null;
    deawardedFirmIds?: string[];
    error?: string;
}

/**
 * POST /api/firms/award
 * Handle all award-related logic atomically:
 * - De-award existing firms for same discipline
 * - Find/create company in master list
 * - Update firm's awarded status
 * - Calculate total price from latest evaluation price instance
 * - Update cost line's approvedContractCents
 */
export async function POST(request: NextRequest) {
    try {
        const body: AwardFirmRequest = await request.json();
        const { projectId, firmId, firmType, stakeholderId, awarded } = body;

        // Validate required fields
        if (!projectId || !firmId || !firmType || !stakeholderId) {
            return NextResponse.json(
                { success: false, error: 'Missing required fields: projectId, firmId, firmType, stakeholderId' },
                { status: 400 }
            );
        }

        if (firmType !== 'consultant' && firmType !== 'contractor') {
            return NextResponse.json(
                { success: false, error: 'firmType must be "consultant" or "contractor"' },
                { status: 400 }
            );
        }

        const table = firmType === 'consultant' ? consultants : contractors;
        const disciplineField = firmType === 'consultant' ? 'discipline' : 'trade';

        // 1. Get the firm
        const [firm] = await db
            .select()
            .from(table)
            .where(eq(table.id, firmId));

        if (!firm) {
            return NextResponse.json(
                { success: false, error: `${firmType} not found` },
                { status: 404 }
            );
        }

        // Get discipline/trade name from the firm
        const disciplineName = firmType === 'consultant'
            ? (firm as typeof consultants.$inferSelect).discipline
            : (firm as typeof contractors.$inferSelect).trade;

        const deawardedFirmIds: string[] = [];
        let companyId = firm.companyId;
        let contractValueCents = 0;
        let costLineId: string | null = null;

        // 2. If awarding, de-award other firms with same discipline/trade
        if (awarded) {
            const existingAwarded = await db
                .select()
                .from(table)
                .where(
                    and(
                        eq(table.projectId, projectId),
                        eq(firmType === 'consultant'
                            ? (table as typeof consultants).discipline
                            : (table as typeof contractors).trade, disciplineName),
                        eq(table.awarded, true),
                        ne(table.id, firmId)
                    )
                );

            for (const oldFirm of existingAwarded) {
                await db
                    .update(table)
                    .set({ awarded: false, updatedAt: new Date() })
                    .where(eq(table.id, oldFirm.id));
                deawardedFirmIds.push(oldFirm.id);
            }

            // 3. Find or create company if awarding
            if (!companyId) {
                const normalizedName = firm.companyName.trim().toLowerCase();

                // Find existing company
                const existingCompanies = await db
                    .select()
                    .from(companies)
                    .where(isNull(companies.deletedAt));

                const match = existingCompanies.find(
                    (c) => c.name.toLowerCase() === normalizedName
                );

                if (match) {
                    companyId = match.id;
                } else {
                    // Create new company
                    const newCompanyId = uuidv4();
                    const now = new Date();

                    await db.insert(companies).values({
                        id: newCompanyId,
                        name: firm.companyName.trim(),
                        abn: firm.abn || null,
                        contactName: firm.contactPerson || null,
                        contactEmail: firm.email || null,
                        contactPhone: firm.phone || null,
                        address: firm.address || null,
                        createdAt: now,
                        updatedAt: now,
                    });

                    companyId = newCompanyId;
                }
            }

            // 4. Get latest evaluation price instance and map prices LINE BY LINE to cost lines
            const [latestEvalPrice] = await db
                .select()
                .from(evaluationPrice)
                .where(
                    and(
                        eq(evaluationPrice.projectId, projectId),
                        eq(evaluationPrice.stakeholderId, stakeholderId)
                    )
                )
                .orderBy(desc(evaluationPrice.evaluationPriceNumber))
                .limit(1);

            // Build a map of costLineId → amountCents for this firm
            const costLineAmounts = new Map<string, number>();

            if (latestEvalPrice) {
                // Get all rows for this evaluation price instance (includes costLineId)
                const rows = await db
                    .select()
                    .from(evaluationRows)
                    .where(eq(evaluationRows.evaluationPriceId, latestEvalPrice.id));

                const rowIds = rows.map((r) => r.id);

                if (rowIds.length > 0) {
                    // Get all cells for this firm
                    const cells = await db
                        .select()
                        .from(evaluationCells)
                        .where(
                            and(
                                inArray(evaluationCells.rowId, rowIds),
                                eq(evaluationCells.firmId, firmId)
                            )
                        );

                    // Create a map of rowId → amountCents
                    const rowAmounts = new Map<string, number>();
                    for (const cell of cells) {
                        rowAmounts.set(cell.rowId, cell.amountCents || 0);
                    }

                    // Map each evaluation row's amount to its linked costLineId
                    for (const row of rows) {
                        if (row.costLineId) {
                            const amount = rowAmounts.get(row.id) || 0;
                            costLineAmounts.set(row.costLineId, amount);
                        }
                    }

                    // Calculate total for response
                    contractValueCents = cells.reduce(
                        (sum, cell) => sum + (cell.amountCents || 0),
                        0
                    );
                }
            }

            // 5. Update cost lines with their individual amounts (line-by-line mapping)
            const matchingCostLines = await db
                .select()
                .from(costLines)
                .where(
                    and(
                        eq(costLines.projectId, projectId),
                        eq(costLines.stakeholderId, stakeholderId),
                        isNull(costLines.deletedAt)
                    )
                );

            // Update each cost line with its specific amount from evaluation
            for (const cl of matchingCostLines) {
                const lineAmount = costLineAmounts.get(cl.id) ?? 0;
                await db
                    .update(costLines)
                    .set({
                        approvedContractCents: lineAmount,
                        updatedAt: new Date(),
                    })
                    .where(eq(costLines.id, cl.id));

                // Store first cost line ID for response
                if (!costLineId) {
                    costLineId = cl.id;
                }
            }
        }
        // Note: When de-awarding, we do NOT modify cost line values (preserve existing)

        // 6. Update firm's awarded status
        await db
            .update(table)
            .set({
                awarded,
                companyId: awarded ? companyId : firm.companyId, // Only update companyId if awarding
                updatedAt: new Date(),
            })
            .where(eq(table.id, firmId));

        // Get updated firm
        const [updatedFirm] = await db
            .select()
            .from(table)
            .where(eq(table.id, firmId));

        const response: AwardFirmResponse = {
            success: true,
            firm: {
                id: updatedFirm.id,
                companyName: updatedFirm.companyName,
                awarded: updatedFirm.awarded ?? false,
                companyId: updatedFirm.companyId,
            },
            companyId: awarded ? companyId : firm.companyId,
            contractValueCents: awarded ? contractValueCents : undefined,
            costLineId: awarded ? costLineId : undefined,
            deawardedFirmIds: deawardedFirmIds.length > 0 ? deawardedFirmIds : undefined,
        };

        return NextResponse.json(response);
    } catch (error) {
        console.error('Error in award firm:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to update award status' },
            { status: 500 }
        );
    }
}
