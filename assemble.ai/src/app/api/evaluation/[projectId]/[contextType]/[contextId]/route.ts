/**
 * T007: Evaluation API Route
 * GET: Fetch evaluation data (or create if not exists)
 * PUT: Update evaluation cell values
 * Feature 011 - Evaluation Report
 *
 * Now uses stakeholderId (contextId is the stakeholder ID)
 * contextType is retained for URL compatibility but both map to stakeholder
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import {
    evaluations,
    evaluationRows,
    evaluationCells,
    costLines,
    projectStakeholders,
    consultants,
    contractors,
} from '@/lib/db';
import { eq, and, asc, isNull } from 'drizzle-orm';
import { nanoid } from 'nanoid';

interface RouteParams {
    params: Promise<{
        projectId: string;
        contextType: string;
        contextId: string;
    }>;
}

// GET: Fetch or initialize evaluation data
export async function GET(
    request: NextRequest,
    { params }: RouteParams
) {
    try {
        const { projectId, contextType, contextId } = await params;

        // Extract evaluationPriceId from query params for multi-instance support
        const { searchParams } = new URL(request.url);
        const evaluationPriceId = searchParams.get('evaluationPriceId');

        // contextId is now the stakeholderId
        const stakeholderId = contextId;

        // Validate the stakeholder exists
        const stakeholder = await db.query.projectStakeholders.findFirst({
            where: eq(projectStakeholders.id, stakeholderId),
        });

        if (!stakeholder) {
            return NextResponse.json(
                { error: 'Stakeholder not found' },
                { status: 404 }
            );
        }

        // Try to find existing evaluation by stakeholderId
        let evaluation = await db.query.evaluations.findFirst({
            where: and(
                eq(evaluations.projectId, projectId),
                eq(evaluations.stakeholderId, stakeholderId)
            ),
        });

        // If no evaluation exists, create one
        if (!evaluation) {
            const evalId = nanoid();

            await db.insert(evaluations).values({
                id: evalId,
                projectId,
                stakeholderId,
            });

            evaluation = await db.query.evaluations.findFirst({
                where: eq(evaluations.id, evalId),
            });

            // Create 3 default Adds & Subs rows (blank descriptions)
            const addSubsRowsData = [1, 2, 3].map((n, i) => ({
                id: nanoid(),
                evaluationId: evalId,
                evaluationPriceId: evaluationPriceId || undefined,
                tableType: 'adds_subs' as const,
                description: '',
                orderIndex: i,
                source: 'manual' as const,
            }));

            if (addSubsRowsData.length > 0) {
                await db.insert(evaluationRows).values(addSubsRowsData);
            }
        }

        // Sync evaluation rows with current cost lines for this stakeholder
        // Filter by section based on stakeholder group:
        // - consultant stakeholders use CONSULTANTS section
        // - contractor stakeholders use CONSTRUCTION section
        const expectedSection = stakeholder.stakeholderGroup === 'consultant' ? 'CONSULTANTS' : 'CONSTRUCTION';
        const currentCostLines = await db.query.costLines.findMany({
            where: and(
                eq(costLines.projectId, projectId),
                eq(costLines.stakeholderId, stakeholderId),
                eq(costLines.section, expectedSection),
                isNull(costLines.deletedAt)
            ),
            orderBy: [asc(costLines.sortOrder)],
        });

        // Parse deleted cost line IDs to skip during sync
        // deletedCostLineIds is now keyed by evaluationPriceId (or "null" for legacy)
        // This allows each evaluation price instance to independently track deletions
        const rawDeletedIds = JSON.parse(evaluation?.deletedCostLineIds || '[]');
        let deletedCostLineIds: Set<string>;

        if (Array.isArray(rawDeletedIds)) {
            // Legacy format: simple array - applies only to null evaluationPriceId (original tab)
            deletedCostLineIds = evaluationPriceId
                ? new Set<string>() // New instances start fresh
                : new Set<string>(rawDeletedIds);
        } else {
            // New format: object keyed by evaluationPriceId
            const key = evaluationPriceId || 'null';
            deletedCostLineIds = new Set<string>(rawDeletedIds[key] || []);
        }

        // Get existing evaluation rows (filtered by evaluationPriceId if provided)
        const existingRows = await db.query.evaluationRows.findMany({
            where: evaluationPriceId
                ? and(
                    eq(evaluationRows.evaluationId, evaluation!.id),
                    eq(evaluationRows.evaluationPriceId, evaluationPriceId)
                )
                : and(
                    eq(evaluationRows.evaluationId, evaluation!.id),
                    isNull(evaluationRows.evaluationPriceId)
                ),
        });

        // Find which cost lines need new rows and which need updates
        const existingCostLineIds = new Set(
            existingRows.filter(r => r.costLineId).map(r => r.costLineId)
        );

        const rowsToCreate: Array<{
            id: string;
            evaluationId: string;
            evaluationPriceId?: string;
            tableType: 'initial_price';
            description: string;
            orderIndex: number;
            costLineId: string;
            source: 'cost_plan';
        }> = [];

        const rowsToUpdate: Array<{ id: string; description: string; orderIndex: number }> = [];

        // Build a map of costLineId to existing row for updates
        const costLineIdToRow = new Map<string | null, typeof existingRows[number]>(
            existingRows.filter(r => r.costLineId).map(r => [r.costLineId, r])
        );

        // Build a map of normalized description to unlinked rows (no costLineId)
        // for smart duplicate detection during sync — prevents creating duplicate
        // rows when cost plan items match existing AI-parsed or manual rows
        const descriptionToUnlinkedRow = new Map<string, typeof existingRows[number]>();
        existingRows
            .filter(r => !r.costLineId && r.tableType === 'initial_price')
            .forEach(r => {
                const key = r.description.trim().toLowerCase();
                if (!descriptionToUnlinkedRow.has(key)) {
                    descriptionToUnlinkedRow.set(key, r);
                }
            });

        const rowsToLink: Array<{ id: string; costLineId: string; orderIndex: number }> = [];

        currentCostLines.forEach((line, i) => {
            // Skip cost lines that user has explicitly deleted
            if (deletedCostLineIds.has(line.id)) {
                return;
            }

            if (!existingCostLineIds.has(line.id)) {
                // Check if an unlinked row with matching description exists
                const descKey = line.activity.trim().toLowerCase();
                const matchingRow = descriptionToUnlinkedRow.get(descKey);

                if (matchingRow) {
                    // Link existing row to this cost line instead of creating duplicate
                    rowsToLink.push({
                        id: matchingRow.id,
                        costLineId: line.id,
                        orderIndex: i,
                    });
                    // Remove from unlinked map so it can't match again
                    descriptionToUnlinkedRow.delete(descKey);
                } else {
                    // No match found - create new evaluation row
                    rowsToCreate.push({
                        id: nanoid(),
                        evaluationId: evaluation!.id,
                        evaluationPriceId: evaluationPriceId || undefined,
                        tableType: 'initial_price' as const,
                        description: line.activity,
                        orderIndex: i,
                        costLineId: line.id,
                        source: 'cost_plan' as const,
                    });
                }
            } else {
                // Existing cost line - check if description or order needs update
                const existingRow = costLineIdToRow.get(line.id);
                if (existingRow && (existingRow.description !== line.activity || existingRow.orderIndex !== i)) {
                    rowsToUpdate.push({
                        id: existingRow.id,
                        description: line.activity,
                        orderIndex: i,
                    });
                }
            }
        });

        // Remove evaluation rows whose cost lines have been deleted from the cost plan
        const activeCostLineIds = new Set(currentCostLines.map(l => l.id));
        const rowsToDelete = existingRows.filter(
            r => r.costLineId && r.source === 'cost_plan' && !activeCostLineIds.has(r.costLineId)
        );

        for (const row of rowsToDelete) {
            await db.delete(evaluationRows).where(eq(evaluationRows.id, row.id));
        }

        // Insert new rows
        if (rowsToCreate.length > 0) {
            await db.insert(evaluationRows).values(rowsToCreate);
        }

        // Update existing rows with changed descriptions or order
        for (const update of rowsToUpdate) {
            await db.update(evaluationRows)
                .set({ description: update.description, orderIndex: update.orderIndex })
                .where(eq(evaluationRows.id, update.id));
        }

        // Link existing rows to their matching cost lines (duplicate prevention)
        for (const link of rowsToLink) {
            await db.update(evaluationRows)
                .set({ costLineId: link.costLineId, orderIndex: link.orderIndex, source: 'cost_plan' })
                .where(eq(evaluationRows.id, link.id));
        }

        // Fetch rows with cells (filtered by evaluationPriceId if provided)
        const rows = await db.query.evaluationRows.findMany({
            where: evaluationPriceId
                ? and(
                    eq(evaluationRows.evaluationId, evaluation!.id),
                    eq(evaluationRows.evaluationPriceId, evaluationPriceId)
                )
                : and(
                    eq(evaluationRows.evaluationId, evaluation!.id),
                    isNull(evaluationRows.evaluationPriceId)
                ),
            orderBy: [asc(evaluationRows.orderIndex)],
            with: {
                cells: true,
            },
        });

        // Fetch firms from consultants/contractors tables based on stakeholder group
        let firms: Array<{ id: string; companyName: string; shortlisted: boolean; awarded: boolean; firmType: 'consultant' | 'contractor' }> = [];

        // Use disciplineOrTrade (preferred) or name to match firms
        // This must match what ProcurementCard passes to galleries: s.disciplineOrTrade || s.name
        const matchName = stakeholder.disciplineOrTrade || stakeholder.name;

        if (stakeholder.stakeholderGroup === 'consultant') {
            // Query consultants table matching the stakeholder's discipline
            // Order by createdAt to match firm tiles display order
            const stakeholderConsultants = await db.query.consultants.findMany({
                where: and(
                    eq(consultants.projectId, projectId),
                    eq(consultants.discipline, matchName)
                ),
                orderBy: [asc(consultants.createdAt)],
            });

            firms = stakeholderConsultants.map(c => ({
                id: c.id,
                companyName: c.companyName,
                shortlisted: c.shortlisted ?? false,
                awarded: c.awarded ?? false,
                firmType: 'consultant' as const,
            }));
        } else {
            // Query contractors table matching the stakeholder's trade
            // Order by createdAt to match firm tiles display order
            const stakeholderContractors = await db.query.contractors.findMany({
                where: and(
                    eq(contractors.projectId, projectId),
                    eq(contractors.trade, matchName)
                ),
                orderBy: [asc(contractors.createdAt)],
            });

            firms = stakeholderContractors.map(c => ({
                id: c.id,
                companyName: c.companyName,
                shortlisted: c.shortlisted ?? false,
                awarded: c.awarded ?? false,
                firmType: 'contractor' as const,
            }));
        }

        return NextResponse.json({
            success: true,
            data: {
                evaluation,
                rows,
                firms,
            },
        });
    } catch (error) {
        console.error('Error fetching evaluation:', error);
        return NextResponse.json(
            { error: 'Failed to fetch evaluation data' },
            { status: 500 }
        );
    }
}

// PUT: Update cell values
export async function PUT(
    request: NextRequest,
    { params }: RouteParams
) {
    try {
        const { projectId, contextType, contextId } = await params;
        const body = await request.json();

        if (body.action === 'updateCell') {
            const { rowId, firmId, firmType, amountCents, source, confidence } = body;

            // Check if cell exists
            const existingCell = await db.query.evaluationCells.findFirst({
                where: and(
                    eq(evaluationCells.rowId, rowId),
                    eq(evaluationCells.firmId, firmId)
                ),
            });

            if (existingCell) {
                // Update existing cell
                await db.update(evaluationCells)
                    .set({
                        amountCents,
                        source: source || 'manual',
                        confidence,
                        updatedAt: new Date(),
                    })
                    .where(eq(evaluationCells.id, existingCell.id));
            } else {
                // Create new cell
                await db.insert(evaluationCells).values({
                    id: nanoid(),
                    rowId,
                    firmId,
                    firmType,
                    amountCents,
                    source: source || 'manual',
                    confidence,
                });
            }

            return NextResponse.json({ success: true });
        }

        return NextResponse.json(
            { error: 'Invalid action' },
            { status: 400 }
        );
    } catch (error) {
        console.error('Error updating evaluation:', error);
        return NextResponse.json(
            { error: 'Failed to update evaluation' },
            { status: 500 }
        );
    }
}
