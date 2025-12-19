/**
 * Feature 013: Non-Price Evaluation API Route
 * GET: Fetch non-price evaluation data (auto-create criteria if not exists)
 * PUT: Update non-price cell content and rating
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import {
    evaluations,
    evaluationNonPriceCriteria,
    evaluationNonPriceCells,
    consultants,
    contractors,
    consultantDisciplines,
    contractorTrades,
} from '@/lib/db';
import { eq, and, asc } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { NON_PRICE_CRITERIA } from '@/lib/constants/non-price-criteria';
import type { QualityRating } from '@/types/evaluation';

interface RouteParams {
    params: Promise<{
        projectId: string;
        contextType: string;
        contextId: string;
    }>;
}

// GET: Fetch or initialize non-price evaluation data
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

        // Find or create evaluation
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
        }

        // Check if criteria exist for this evaluation
        const existingCriteria = await db.query.evaluationNonPriceCriteria.findMany({
            where: eq(evaluationNonPriceCriteria.evaluationId, evaluation!.id),
            orderBy: [asc(evaluationNonPriceCriteria.orderIndex)],
        });

        // If no criteria exist, auto-create the 7 fixed criteria (T008)
        if (existingCriteria.length === 0) {
            const criteriaToCreate = NON_PRICE_CRITERIA.map((c, index) => ({
                id: nanoid(),
                evaluationId: evaluation!.id,
                criteriaKey: c.key,
                criteriaLabel: c.label,
                orderIndex: index,
            }));

            await db.insert(evaluationNonPriceCriteria).values(criteriaToCreate);
        }

        // Fetch all criteria with cells
        const criteria = await db.query.evaluationNonPriceCriteria.findMany({
            where: eq(evaluationNonPriceCriteria.evaluationId, evaluation!.id),
            orderBy: [asc(evaluationNonPriceCriteria.orderIndex)],
        });

        // Fetch all cells for these criteria
        const criteriaIds = criteria.map(c => c.id);
        const cells: Array<{
            id: string;
            criteriaId: string;
            firmId: string;
            firmType: 'consultant' | 'contractor';
            extractedContent: string | null;
            qualityRating: 'good' | 'average' | 'poor' | null;
            userEditedContent: string | null;
            userEditedRating: 'good' | 'average' | 'poor' | null;
            source: 'manual' | 'ai';
            confidence: number | null;
            sourceChunks: string[] | null;
            sourceSubmissionId: string | null;
            createdAt: string | null;
            updatedAt: string | null;
        }> = [];

        if (criteriaIds.length > 0) {
            // Fetch cells for all criteria
            for (const criteriaId of criteriaIds) {
                const criteriaCells = await db.query.evaluationNonPriceCells.findMany({
                    where: eq(evaluationNonPriceCells.criteriaId, criteriaId),
                });
                cells.push(...criteriaCells.map(cell => ({
                    id: cell.id,
                    criteriaId: cell.criteriaId,
                    firmId: cell.firmId,
                    firmType: cell.firmType,
                    extractedContent: cell.extractedContent,
                    qualityRating: cell.qualityRating,
                    userEditedContent: cell.userEditedContent,
                    userEditedRating: cell.userEditedRating,
                    source: (cell.source || 'manual') as 'manual' | 'ai',
                    confidence: cell.confidence,
                    sourceChunks: cell.sourceChunks ? JSON.parse(cell.sourceChunks) : null,
                    sourceSubmissionId: cell.sourceSubmissionId,
                    createdAt: cell.createdAt,
                    updatedAt: cell.updatedAt,
                })));
            }
        }

        // Fetch shortlisted firms
        let firms: Array<{ id: string; companyName: string; shortlisted: boolean; awarded: boolean }> = [];

        if (isDiscipline) {
            const discipline = await db.query.consultantDisciplines.findFirst({
                where: eq(consultantDisciplines.id, contextId),
            });

            if (discipline) {
                const disciplineConsultants = await db.query.consultants.findMany({
                    where: and(
                        eq(consultants.projectId, projectId),
                        eq(consultants.discipline, discipline.disciplineName)
                    ),
                });

                firms = disciplineConsultants
                    .filter(c => c.shortlisted)
                    .map(c => ({
                        id: c.id,
                        companyName: c.companyName,
                        shortlisted: c.shortlisted ?? false,
                        awarded: c.awarded ?? false,
                    }));
            }
        } else {
            const trade = await db.query.contractorTrades.findFirst({
                where: eq(contractorTrades.id, contextId),
            });

            if (trade) {
                const tradeContractors = await db.query.contractors.findMany({
                    where: and(
                        eq(contractors.projectId, projectId),
                        eq(contractors.trade, trade.tradeName)
                    ),
                });

                firms = tradeContractors
                    .filter(c => c.shortlisted)
                    .map(c => ({
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
                criteria,
                cells,
                firms,
            },
        });
    } catch (error) {
        console.error('Error fetching non-price evaluation:', error);
        return NextResponse.json(
            { error: 'Failed to fetch non-price evaluation data' },
            { status: 500 }
        );
    }
}

// PUT: Update cell content and rating (T009, T010)
export async function PUT(
    request: NextRequest,
    { params }: RouteParams
) {
    try {
        const { projectId, contextType, contextId } = await params;
        const body = await request.json();

        const { criteriaId, firmId, firmType, content, rating } = body;

        // Validate required fields
        if (!criteriaId || !firmId || !firmType) {
            return NextResponse.json(
                { error: 'Missing required fields: criteriaId, firmId, firmType' },
                { status: 400 }
            );
        }

        // Validate rating if provided
        if (rating && !['good', 'average', 'poor'].includes(rating)) {
            return NextResponse.json(
                { error: 'Invalid rating. Must be "good", "average", or "poor".' },
                { status: 400 }
            );
        }

        // Check if cell exists (T010 - upsert logic)
        const existingCell = await db.query.evaluationNonPriceCells.findFirst({
            where: and(
                eq(evaluationNonPriceCells.criteriaId, criteriaId),
                eq(evaluationNonPriceCells.firmId, firmId),
                eq(evaluationNonPriceCells.firmType, firmType)
            ),
        });

        const now = new Date();

        if (existingCell) {
            // Update existing cell - user edits override AI content (T020)
            await db.update(evaluationNonPriceCells)
                .set({
                    userEditedContent: content || null,
                    userEditedRating: rating as QualityRating || null,
                    updatedAt: now,
                })
                .where(eq(evaluationNonPriceCells.id, existingCell.id));

            // Fetch updated cell
            const updatedCell = await db.query.evaluationNonPriceCells.findFirst({
                where: eq(evaluationNonPriceCells.id, existingCell.id),
            });

            return NextResponse.json({
                success: true,
                cell: updatedCell ? {
                    ...updatedCell,
                    sourceChunks: updatedCell.sourceChunks ? JSON.parse(updatedCell.sourceChunks) : null,
                } : null,
            });
        } else {
            // Create new cell (manual entry)
            const cellId = nanoid();

            await db.insert(evaluationNonPriceCells).values({
                id: cellId,
                criteriaId,
                firmId,
                firmType: firmType as 'consultant' | 'contractor',
                // For manual entry, store directly in userEdited fields
                userEditedContent: content || null,
                userEditedRating: rating as QualityRating || null,
                source: 'manual',
                createdAt: now,
                updatedAt: now,
            });

            // Fetch created cell
            const newCell = await db.query.evaluationNonPriceCells.findFirst({
                where: eq(evaluationNonPriceCells.id, cellId),
            });

            return NextResponse.json({
                success: true,
                cell: newCell ? {
                    ...newCell,
                    sourceChunks: null,
                } : null,
            });
        }
    } catch (error) {
        console.error('Error updating non-price cell:', error);
        return NextResponse.json(
            { error: 'Failed to update non-price cell' },
            { status: 500 }
        );
    }
}
