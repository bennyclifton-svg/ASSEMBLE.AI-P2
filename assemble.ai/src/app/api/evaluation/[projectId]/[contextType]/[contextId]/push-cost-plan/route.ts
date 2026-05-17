import { NextRequest, NextResponse } from 'next/server';
import { and, asc, eq, inArray, isNull } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import {
    consultants,
    contractors,
    costLines,
    db,
    evaluationPrice,
    evaluationRows,
    evaluations,
    projectStakeholders,
} from '@/lib/db';
import { emitProjectEvent } from '@/lib/agents/project-events';
import type { CostLineSection } from '@/types/cost-plan';
import type { EvaluationCellValueType, EvaluationTableType } from '@/types/evaluation';

interface RouteParams {
    params: Promise<{
        projectId: string;
        contextType: string;
        contextId: string;
    }>;
}

interface PushCostPlanRequest {
    evaluationPriceId?: string | null;
    firmId?: string;
    firmType?: 'consultant' | 'contractor';
    rowIds?: string[];
}

const TABLE_ORDER: Record<EvaluationTableType, number> = {
    initial_price: 0,
    adds_subs: 1,
    value_management: 2,
};

const TABLE_LABELS: Record<EvaluationTableType, string> = {
    initial_price: 'Price',
    adds_subs: 'Adds & Subs',
    value_management: 'Value Management',
};

class PushCostPlanError extends Error {
    constructor(message: string, readonly status = 400) {
        super(message);
    }
}

function fail(message: string, status = 400): never {
    throw new PushCostPlanError(message, status);
}

function getCostPlanSection(stakeholderGroup: string): CostLineSection {
    if (stakeholderGroup === 'consultant') return 'CONSULTANTS';
    if (stakeholderGroup === 'contractor') return 'CONSTRUCTION';
    fail('Cost plan push is only available for consultant and contractor tenders');
}

function normaliseAmount(value: number | null | undefined): number {
    return Number.isFinite(value) ? Number(value) : 0;
}

function cellContributesToCostPlan(valueType: string | null | undefined): boolean {
    const typedValue = (valueType || 'amount') as EvaluationCellValueType;
    return typedValue === 'amount' || typedValue === 'blank';
}

function isEligibleTableType(value: string): value is EvaluationTableType {
    return value === 'initial_price' || value === 'adds_subs' || value === 'value_management';
}

function validateSelectedRows<T extends {
    id: string;
    tableType: string;
    description: string;
    orderIndex: number;
    vmAdoptionStatus: string | null;
    vmEmbeddedInBase: boolean | null;
    cells?: Array<{
        firmId: string;
        firmType: string;
        amountCents: number | null;
        valueType: string | null;
    }>;
}>(
    rows: T[],
    firmId: string,
    firmType: 'consultant' | 'contractor'
) {
    return rows.map(row => {
        if (!isEligibleTableType(row.tableType)) {
            fail('Selected rows include an unsupported evaluation table');
        }

        if (row.tableType === 'value_management') {
            if (row.vmAdoptionStatus !== 'adopted' || row.vmEmbeddedInBase === true) {
                fail('Only adopted, non-embedded Value Management rows can be pushed to the cost plan');
            }
        }

        const cell = row.cells?.find(c => c.firmId === firmId && c.firmType === firmType);
        const amountCents = cellContributesToCostPlan(cell?.valueType)
            ? normaliseAmount(cell?.amountCents)
            : 0;

        return {
            row,
            amountCents,
            tableType: row.tableType,
        };
    });
}

export async function POST(
    request: NextRequest,
    { params }: RouteParams
) {
    try {
        const { projectId, contextId } = await params;
        const stakeholderId = contextId;
        const body: PushCostPlanRequest = await request.json();
        const evaluationPriceId = body.evaluationPriceId || null;
        const firmId = body.firmId;
        const firmType = body.firmType;
        const rowIds = Array.from(new Set(body.rowIds || []));

        if (!stakeholderId || !firmId || !firmType || rowIds.length === 0) {
            return NextResponse.json(
                { success: false, error: 'Awarded firm and selected rows are required' },
                { status: 400 }
            );
        }

        const result = await db.transaction(async (tx) => {
            const stakeholder = await tx.query.projectStakeholders.findFirst({
                where: and(
                    eq(projectStakeholders.id, stakeholderId),
                    eq(projectStakeholders.projectId, projectId),
                    isNull(projectStakeholders.deletedAt)
                ),
            });

            if (!stakeholder) {
                fail('Stakeholder not found', 404);
            }

            if (
                (stakeholder.stakeholderGroup === 'consultant' && firmType !== 'consultant') ||
                (stakeholder.stakeholderGroup === 'contractor' && firmType !== 'contractor')
            ) {
                fail('Awarded firm does not match this tender package');
            }

            const expectedSection = getCostPlanSection(stakeholder.stakeholderGroup);
            const firm = firmType === 'consultant'
                ? await tx.query.consultants.findFirst({
                    where: and(
                        eq(consultants.id, firmId),
                        eq(consultants.projectId, projectId)
                    ),
                })
                : await tx.query.contractors.findFirst({
                    where: and(
                        eq(contractors.id, firmId),
                        eq(contractors.projectId, projectId)
                    ),
                });

            if (!firm) {
                fail('Awarded firm not found', 404);
            }

            if (!firm.awarded) {
                fail('Award a tenderer before pushing prices to the cost plan');
            }

            const evaluation = await tx.query.evaluations.findFirst({
                where: and(
                    eq(evaluations.projectId, projectId),
                    eq(evaluations.stakeholderId, stakeholderId)
                ),
            });

            if (!evaluation) {
                fail('Evaluation not found', 404);
            }

            let evaluationPriceNumber = 1;
            if (evaluationPriceId) {
                const priceRecord = await tx.query.evaluationPrice.findFirst({
                    where: and(
                        eq(evaluationPrice.id, evaluationPriceId),
                        eq(evaluationPrice.projectId, projectId),
                        eq(evaluationPrice.stakeholderId, stakeholderId)
                    ),
                });

                if (!priceRecord) {
                    fail('Evaluation price record not found', 404);
                }
                evaluationPriceNumber = priceRecord.evaluationPriceNumber;
            }

            const selectedRows = await tx.query.evaluationRows.findMany({
                where: evaluationPriceId
                    ? and(
                        eq(evaluationRows.evaluationId, evaluation.id),
                        eq(evaluationRows.evaluationPriceId, evaluationPriceId),
                        inArray(evaluationRows.id, rowIds)
                    )
                    : and(
                        eq(evaluationRows.evaluationId, evaluation.id),
                        isNull(evaluationRows.evaluationPriceId),
                        inArray(evaluationRows.id, rowIds)
                    ),
                with: {
                    cells: true,
                },
                orderBy: [asc(evaluationRows.orderIndex)],
            });

            if (selectedRows.length !== rowIds.length) {
                fail('Some selected rows could not be found');
            }

            const rowsForCostPlan = validateSelectedRows(selectedRows, firmId, firmType)
                .sort((a, b) => {
                    const tableDelta = TABLE_ORDER[a.tableType] - TABLE_ORDER[b.tableType];
                    if (tableDelta !== 0) return tableDelta;
                    return (a.row.orderIndex || 0) - (b.row.orderIndex || 0);
                });

            const activeExistingRows = await tx
                .select({ id: costLines.id })
                .from(costLines)
                .where(
                    and(
                        eq(costLines.projectId, projectId),
                        eq(costLines.stakeholderId, stakeholderId),
                        eq(costLines.section, expectedSection),
                        isNull(costLines.deletedAt)
                    )
                );

            const now = new Date();
            if (activeExistingRows.length > 0) {
                await tx
                    .update(costLines)
                    .set({ deletedAt: now, updatedAt: now })
                    .where(
                        and(
                            eq(costLines.projectId, projectId),
                            eq(costLines.stakeholderId, stakeholderId),
                            eq(costLines.section, expectedSection),
                            isNull(costLines.deletedAt)
                        )
                    );
            }

            const sectionSortRows = await tx
                .select({ sortOrder: costLines.sortOrder })
                .from(costLines)
                .where(
                    and(
                        eq(costLines.projectId, projectId),
                        eq(costLines.section, expectedSection),
                        isNull(costLines.deletedAt)
                    )
                );

            const maxSortOrder = sectionSortRows.length > 0
                ? Math.max(...sectionSortRows.map(row => row.sortOrder || 0))
                : 0;

            const referencePrefix = `Evaluation Price ${String(evaluationPriceNumber).padStart(2, '0')}`;
            const insertValues = rowsForCostPlan.map((item, index) => ({
                id: nanoid(),
                projectId,
                stakeholderId,
                section: expectedSection,
                costCode: null,
                activity: item.row.description.trim() || TABLE_LABELS[item.tableType],
                reference: `${referencePrefix} - ${TABLE_LABELS[item.tableType]}`,
                budgetCents: item.amountCents,
                approvedContractCents: item.amountCents,
                sortOrder: maxSortOrder + index + 1,
                createdAt: now,
                updatedAt: now,
            }));

            const insertedRows = await tx.insert(costLines).values(insertValues).returning({
                id: costLines.id,
                budgetCents: costLines.budgetCents,
                approvedContractCents: costLines.approvedContractCents,
            });

            const totalCents = insertedRows.reduce(
                (sum, row) => sum + normaliseAmount(row.approvedContractCents),
                0
            );

            return {
                createdIds: insertedRows.map(row => row.id),
                deletedIds: activeExistingRows.map(row => row.id),
                createdCount: insertedRows.length,
                replacedCount: activeExistingRows.length,
                totalCents,
            };
        });

        for (const id of result.deletedIds) {
            emitProjectEvent(projectId, { type: 'entity_updated', entity: 'cost_line', op: 'deleted', id });
        }
        for (const id of result.createdIds) {
            emitProjectEvent(projectId, { type: 'entity_updated', entity: 'cost_line', op: 'created', id });
        }

        return NextResponse.json({
            success: true,
            data: result,
        });
    } catch (error) {
        if (error instanceof PushCostPlanError) {
            return NextResponse.json(
                { success: false, error: error.message },
                { status: error.status }
            );
        }

        console.error('Error pushing evaluation price to cost plan:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to push awarded price to the cost plan' },
            { status: 500 }
        );
    }
}
