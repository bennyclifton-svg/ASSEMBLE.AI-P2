/**
 * T007: Evaluation API Route
 * GET: Fetch evaluation data (or create if not exists)
 * PUT: Update evaluation cell values
 * Feature 011 - Evaluation Report
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import {
    evaluations,
    evaluationRows,
    evaluationCells,
    costLines,
    consultants,
    contractors,
    consultantDisciplines,
    contractorTrades,
} from '@/lib/db';
import { eq, and, asc } from 'drizzle-orm';
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

        // Validate context type
        if (contextType !== 'discipline' && contextType !== 'trade') {
            return NextResponse.json(
                { error: 'Invalid context type. Must be "discipline" or "trade".' },
                { status: 400 }
            );
        }

        const isDiscipline = contextType === 'discipline';

        // Try to find existing evaluation
        let evaluation = await db.query.evaluations.findFirst({
            where: isDiscipline
                ? and(
                    eq(evaluations.projectId, projectId),
                    eq(evaluations.disciplineId, contextId)
                )
                : and(
                    eq(evaluations.projectId, projectId),
                    eq(evaluations.tradeId, contextId)
                ),
        });

        // If no evaluation exists, create one
        if (!evaluation) {
            const evalId = nanoid();

            await db.insert(evaluations).values({
                id: evalId,
                projectId,
                disciplineId: isDiscipline ? contextId : null,
                tradeId: isDiscipline ? null : contextId,
            });

            evaluation = await db.query.evaluations.findFirst({
                where: eq(evaluations.id, evalId),
            });

            // Create 3 default Adds & Subs rows (blank descriptions)
            const addSubsRowsData = [1, 2, 3].map((n, i) => ({
                id: nanoid(),
                evaluationId: evalId,
                tableType: 'adds_subs' as const,
                description: '',
                orderIndex: i,
                source: 'manual' as const, // Default rows should always be visible
            }));

            if (addSubsRowsData.length > 0) {
                await db.insert(evaluationRows).values(addSubsRowsData);
            }
        }

        // Always sync evaluation rows with current cost lines
        const costLineQuery = isDiscipline
            ? eq(costLines.disciplineId, contextId)
            : eq(costLines.tradeId, contextId);

        const currentCostLines = await db.query.costLines.findMany({
            where: and(eq(costLines.projectId, projectId), costLineQuery),
            orderBy: [asc(costLines.sortOrder)],
        });

        // Get existing evaluation rows
        const existingRows = await db.query.evaluationRows.findMany({
            where: eq(evaluationRows.evaluationId, evaluation!.id),
        });

        // Find which cost lines need new rows and which need updates
        const existingCostLineIds = new Set(
            existingRows.filter(r => r.costLineId).map(r => r.costLineId)
        );

        const rowsToCreate: Array<{
            id: string;
            evaluationId: string;
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

        currentCostLines.forEach((line, i) => {
            if (!existingCostLineIds.has(line.id)) {
                // New cost line - create evaluation row
                rowsToCreate.push({
                    id: nanoid(),
                    evaluationId: evaluation!.id,
                    tableType: 'initial_price' as const,
                    description: line.activity,
                    orderIndex: i,
                    costLineId: line.id,
                    source: 'cost_plan' as const, // Explicitly set source for visibility filtering
                });
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

        // Fetch all rows with cells
        const rows = await db.query.evaluationRows.findMany({
            where: eq(evaluationRows.evaluationId, evaluation!.id),
            orderBy: [asc(evaluationRows.orderIndex)],
            with: {
                cells: true,
            },
        });

        // Fetch firms filtered by discipline or trade
        let firms: Array<{ id: string; companyName: string; shortlisted: boolean; awarded: boolean }> = [];
        if (isDiscipline) {
            // Get the discipline name from consultantDisciplines
            const discipline = await db.query.consultantDisciplines.findFirst({
                where: eq(consultantDisciplines.id, contextId),
            });

            if (discipline) {
                // Get consultants that match this discipline name
                const disciplineConsultants = await db.query.consultants.findMany({
                    where: and(
                        eq(consultants.projectId, projectId),
                        eq(consultants.discipline, discipline.disciplineName)
                    ),
                });

                firms = disciplineConsultants.map(c => ({
                    id: c.id,
                    companyName: c.companyName,
                    shortlisted: c.shortlisted ?? false,
                    awarded: c.awarded ?? false,
                }));
            }
        } else {
            // Get the trade name from contractorTrades
            const trade = await db.query.contractorTrades.findFirst({
                where: eq(contractorTrades.id, contextId),
            });

            if (trade) {
                // Get contractors that match this trade name
                const tradeContractors = await db.query.contractors.findMany({
                    where: and(
                        eq(contractors.projectId, projectId),
                        eq(contractors.trade, trade.tradeName)
                    ),
                });

                firms = tradeContractors.map(c => ({
                    id: c.id,
                    companyName: c.companyName,
                    shortlisted: c.shortlisted ?? false,
                    awarded: c.awarded ?? false,
                }));
            }
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
