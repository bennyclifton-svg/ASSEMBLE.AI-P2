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
    projectStakeholders,
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

            // 4. Get cost lines for this stakeholder (needed for both mapping and update)
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

            // 4b. Get latest evaluation price instance and map prices LINE BY LINE to cost lines
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

                    // Pass 1: Map evaluation rows with costLineId directly
                    for (const row of rows) {
                        if (row.costLineId) {
                            const amount = rowAmounts.get(row.id) || 0;
                            costLineAmounts.set(row.costLineId, amount);
                        }
                    }

                    // Pass 2: For unlinked rows (no costLineId), match by description to cost lines
                    // This handles AI-parsed rows that haven't been linked yet
                    const mappedCostLineIds = new Set(costLineAmounts.keys());
                    const unmappedCostLines = matchingCostLines.filter(cl => !mappedCostLineIds.has(cl.id));

                    // Build a lookup of normalized description → cost line for unmapped lines
                    const descToCostLine = new Map<string, typeof matchingCostLines[number]>();
                    for (const cl of unmappedCostLines) {
                        const key = cl.activity.trim().toLowerCase();
                        if (!descToCostLine.has(key)) {
                            descToCostLine.set(key, cl);
                        }
                    }

                    for (const row of rows) {
                        if (!row.costLineId && row.tableType === 'initial_price') {
                            const descKey = row.description.trim().toLowerCase();
                            const matchedCostLine = descToCostLine.get(descKey);
                            if (matchedCostLine) {
                                const amount = rowAmounts.get(row.id) || 0;
                                costLineAmounts.set(matchedCostLine.id, amount);
                                // Remove from lookup so it can't double-match
                                descToCostLine.delete(descKey);

                                // Also link the evaluation row to the cost line for future syncs
                                await db.update(evaluationRows)
                                    .set({ costLineId: matchedCostLine.id, source: 'cost_plan' })
                                    .where(eq(evaluationRows.id, row.id));
                            }
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
            // Only update cost lines that have a mapped amount — don't overwrite with $0
            for (const cl of matchingCostLines) {
                if (costLineAmounts.has(cl.id)) {
                    const lineAmount = costLineAmounts.get(cl.id)!;
                    await db
                        .update(costLines)
                        .set({
                            approvedContractCents: lineAmount,
                            updatedAt: new Date(),
                        })
                        .where(eq(costLines.id, cl.id));
                }

                // Store first cost line ID for response
                if (!costLineId) {
                    costLineId = cl.id;
                }
            }

            // 5b. Sync awarded firm's contact details to the stakeholder record
            const contactPhone = firmType === 'consultant'
                ? ((firm as typeof consultants.$inferSelect).mobile || firm.phone || null)
                : (firm.phone || null);

            await db
                .update(projectStakeholders)
                .set({
                    organization: firm.companyName.trim(),
                    contactName: firm.contactPerson || null,
                    contactEmail: firm.email || null,
                    contactPhone,
                    companyId: companyId || null,
                    updatedAt: new Date(),
                })
                .where(eq(projectStakeholders.id, stakeholderId));
        }
        // Note: When de-awarding, we do NOT modify cost line or stakeholder values (preserve existing)

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
