import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import {
    projects,
    costLines,
    costLineAllocations,
    variations,
    invoices,
    consultantDisciplines,
    contractorTrades,
} from '@/lib/db';
import { eq, isNull, and } from 'drizzle-orm';
import {
    calculateCostLineFields,
    calculateCostPlanTotals,
} from '@/lib/calculations/cost-plan-formulas';
import type { CostLineWithCalculations, CostPlan } from '@/types/cost-plan';

/**
 * GET /api/projects/[projectId]/cost-plan
 * Returns the full cost plan with all calculated fields
 */
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ projectId: string }> }
) {
    try {
        const { projectId } = await params;

        // Fetch project details
        const [project] = await db
            .select()
            .from(projects)
            .where(eq(projects.id, projectId));

        if (!project) {
            return NextResponse.json(
                { error: 'Project not found' },
                { status: 404 }
            );
        }

        // Parse current period from query param, project settings, or default to current month
        const { searchParams } = new URL(request.url);
        const reportMonthParam = searchParams.get('reportMonth');

        const currentPeriod = reportMonthParam
            ? {
                year: parseInt(reportMonthParam.split('-')[0], 10),
                month: parseInt(reportMonthParam.split('-')[1], 10),
            }
            : project.currentReportMonth
                ? {
                    year: new Date(project.currentReportMonth).getFullYear(),
                    month: new Date(project.currentReportMonth).getMonth() + 1,
                }
                : {
                    year: new Date().getFullYear(),
                    month: new Date().getMonth() + 1,
                };

        // Fetch all cost lines (excluding soft deleted)
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

        // Fetch all allocations for these cost lines
        const costLineIds = projectCostLines.map((cl) => cl.id);
        const allAllocations = costLineIds.length > 0
            ? await db
                .select()
                .from(costLineAllocations)
                .where(
                    // SQLite doesn't have array operations, so we'll filter in memory
                    // or fetch all and filter
                    eq(costLineAllocations.costLineId, costLineIds[0]) // Placeholder - we'll fetch all
                )
            : [];

        // Actually fetch all allocations for all cost lines
        const allocationsMap = new Map<string, typeof allAllocations>();
        for (const cl of projectCostLines) {
            const clAllocations = await db
                .select()
                .from(costLineAllocations)
                .where(eq(costLineAllocations.costLineId, cl.id));
            allocationsMap.set(cl.id, clAllocations);
        }

        // Fetch all variations (excluding soft deleted)
        const projectVariations = await db
            .select()
            .from(variations)
            .where(
                and(
                    eq(variations.projectId, projectId),
                    isNull(variations.deletedAt)
                )
            );

        // Fetch all invoices (excluding soft deleted)
        const projectInvoices = await db
            .select()
            .from(invoices)
            .where(
                and(
                    eq(invoices.projectId, projectId),
                    isNull(invoices.deletedAt)
                )
            );

        // Fetch disciplines for cost lines
        const disciplineIds: string[] = projectCostLines
            .filter(cl => cl.disciplineId)
            .map(cl => cl.disciplineId as string)
            .filter((v, i, a) => a.indexOf(v) === i);
        const disciplinesMap = new Map<string, typeof consultantDisciplines.$inferSelect>();
        for (let i = 0; i < disciplineIds.length; i++) {
            const disciplineId: string = disciplineIds[i];
            const [discipline] = await db
                .select()
                .from(consultantDisciplines)
                .where(eq(consultantDisciplines.id, disciplineId));
            if (discipline) {
                disciplinesMap.set(disciplineId, discipline);
            }
        }

        // Fetch trades for cost lines
        const tradeIds: string[] = projectCostLines
            .filter(cl => cl.tradeId)
            .map(cl => cl.tradeId as string)
            .filter((v, i, a) => a.indexOf(v) === i);
        const tradesMap = new Map<string, typeof contractorTrades.$inferSelect>();
        for (let i = 0; i < tradeIds.length; i++) {
            const tradeId: string = tradeIds[i];
            const [trade] = await db
                .select()
                .from(contractorTrades)
                .where(eq(contractorTrades.id, tradeId));
            if (trade) {
                tradesMap.set(tradeId, trade);
            }
        }

        // Calculate fields for each cost line
        const costLinesWithCalculations: CostLineWithCalculations[] = projectCostLines.map((cl) => {
            const clAllocations = allocationsMap.get(cl.id) || [];
            const calculated = calculateCostLineFields(
                cl,
                clAllocations,
                projectVariations,
                projectInvoices,
                currentPeriod
            );

            return {
                ...cl,
                discipline: cl.disciplineId ? disciplinesMap.get(cl.disciplineId) || null : null,
                trade: cl.tradeId ? tradesMap.get(cl.tradeId) || null : null,
                allocations: clAllocations,
                calculated,
            };
        });

        // Calculate totals
        const totals = calculateCostPlanTotals(costLinesWithCalculations);

        // Build response
        const costPlan: CostPlan = {
            project: {
                id: project.id,
                name: project.name,
                code: project.code,
                currentReportMonth: project.currentReportMonth,
                revision: project.revision || 'REV A',
                currencyCode: project.currencyCode || 'AUD',
                showGst: project.showGst || false,
            },
            costLines: costLinesWithCalculations,
            totals,
            invoicesCount: projectInvoices.length,
            variationsCount: projectVariations.length,
        };

        return NextResponse.json(costPlan);
    } catch (error) {
        console.error('Error fetching cost plan:', error);
        return NextResponse.json(
            { error: 'Failed to fetch cost plan' },
            { status: 500 }
        );
    }
}
