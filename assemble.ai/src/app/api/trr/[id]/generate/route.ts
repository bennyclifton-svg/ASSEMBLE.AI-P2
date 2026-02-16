/**
 * TRR AI Generation API
 * POST /api/trr/[id]/generate
 *
 * Generates Executive Summary, Clarifications, or Recommendation
 * for a Tender Recommendation Report using rich evaluation context.
 */

import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { eq, and } from 'drizzle-orm';
import { db } from '@/lib/db';
import {
    trr,
    projectDetails,
    projectStakeholders,
    evaluationPrice,
    evaluationRows,
    evaluationCells,
    addenda,
    consultants,
    contractors,
} from '@/lib/db/pg-schema';
import {
    buildSystemPrompt,
    buildTrrExecutiveSummaryPrompt,
    buildTrrClarificationsPrompt,
    buildTrrRecommendationPrompt,
} from '@/lib/prompts/system-prompts';

type TrrField = 'executiveSummary' | 'clarifications' | 'recommendation';

// ============================================================================
// TYPES
// ============================================================================

interface FirmPriceData {
    companyName: string;
    totalCents: number;
    isLowest: boolean;
    isRecommended: boolean;
    lineItems: Array<{ description: string; amountCents: number }>;
}

interface NonPriceScore {
    firmName: string;
    overallRating: string;
    criteria: Record<string, string>;
}

// ============================================================================
// DATA FETCHING
// ============================================================================

async function fetchTrrContext(trrId: string) {
    // Fetch TRR record
    const [trrRecord] = await db
        .select()
        .from(trr)
        .where(eq(trr.id, trrId));

    if (!trrRecord) return null;

    // Fetch project details
    const [details] = await db
        .select({
            projectName: projectDetails.projectName,
            address: projectDetails.address,
        })
        .from(projectDetails)
        .where(eq(projectDetails.projectId, trrRecord.projectId));

    // Fetch stakeholder info
    let contextName = 'Unknown';
    let stakeholderGroup = 'consultant';
    if (trrRecord.stakeholderId) {
        const [stakeholder] = await db
            .select({
                name: projectStakeholders.name,
                disciplineOrTrade: projectStakeholders.disciplineOrTrade,
                stakeholderGroup: projectStakeholders.stakeholderGroup,
            })
            .from(projectStakeholders)
            .where(eq(projectStakeholders.id, trrRecord.stakeholderId));
        if (stakeholder) {
            contextName = stakeholder.disciplineOrTrade || stakeholder.name;
            stakeholderGroup = stakeholder.stakeholderGroup || 'consultant';
        }
    }

    // Fetch evaluation price data
    const firms = await fetchFirmPriceData(trrRecord.projectId, trrRecord.stakeholderId, stakeholderGroup);

    // Fetch non-price scores
    const nonPriceScores = await fetchNonPriceScores(trrRecord.projectId, trrRecord.stakeholderId);

    // Fetch addenda count
    const addendaList = trrRecord.stakeholderId
        ? await db
            .select({ id: addenda.id })
            .from(addenda)
            .where(and(
                eq(addenda.projectId, trrRecord.projectId),
                eq(addenda.stakeholderId, trrRecord.stakeholderId)
            ))
        : [];

    return {
        trrRecord,
        projectName: details?.projectName || 'Untitled Project',
        contextName,
        stakeholderGroup,
        firms,
        nonPriceScores,
        addendaCount: addendaList.length,
        rftDate: null as string | null, // TODO: fetch from RFT if available
    };
}

async function fetchFirmPriceData(
    projectId: string,
    stakeholderId: string | null,
    stakeholderGroup: string
): Promise<FirmPriceData[]> {
    if (!stakeholderId) return [];

    try {
        // Find the evaluation price instance for this stakeholder
        const priceInstances = await db
            .select()
            .from(evaluationPrice)
            .where(and(
                eq(evaluationPrice.projectId, projectId),
                eq(evaluationPrice.stakeholderId, stakeholderId)
            ));

        if (priceInstances.length === 0) return [];
        const evalPriceId = priceInstances[0].id;

        // Fetch rows and cells
        const rows = await db
            .select()
            .from(evaluationRows)
            .where(eq(evaluationRows.evaluationPriceId, evalPriceId));

        if (rows.length === 0) return [];

        const rowIds = rows.map(r => r.id);
        const allCells = await db
            .select()
            .from(evaluationCells)
            .where(
                // drizzle doesn't have inArray for this context, use raw query approach
                eq(evaluationCells.rowId, rowIds[0]) // Will need to collect all
            );

        // Actually fetch all cells for all rows
        const cellsByRow = new Map<string, typeof allCells>();
        for (const rowId of rowIds) {
            const cells = await db
                .select()
                .from(evaluationCells)
                .where(eq(evaluationCells.rowId, rowId));
            cellsByRow.set(rowId, cells);
        }

        // Collect unique firm IDs
        const firmIds = new Set<string>();
        for (const cells of cellsByRow.values()) {
            for (const cell of cells) {
                firmIds.add(cell.firmId);
            }
        }

        // Fetch firm names from consultants or contractors table
        const firmNameMap = new Map<string, string>();
        for (const firmId of firmIds) {
            if (stakeholderGroup === 'consultant') {
                const [firm] = await db
                    .select({ companyName: consultants.companyName, shortlisted: consultants.shortlisted })
                    .from(consultants)
                    .where(eq(consultants.id, firmId));
                if (firm?.shortlisted) firmNameMap.set(firmId, firm.companyName);
            } else {
                const [firm] = await db
                    .select({ companyName: contractors.companyName, shortlisted: contractors.shortlisted })
                    .from(contractors)
                    .where(eq(contractors.id, firmId));
                if (firm?.shortlisted) firmNameMap.set(firmId, firm.companyName);
            }
        }

        // Build firm price data
        const firmPriceMap = new Map<string, FirmPriceData>();

        for (const firmId of firmNameMap.keys()) {
            firmPriceMap.set(firmId, {
                companyName: firmNameMap.get(firmId)!,
                totalCents: 0,
                isLowest: false,
                isRecommended: false,
                lineItems: [],
            });
        }

        // Aggregate prices
        for (const row of rows) {
            const cells = cellsByRow.get(row.id) || [];
            for (const cell of cells) {
                const firmData = firmPriceMap.get(cell.firmId);
                if (firmData && cell.amountCents) {
                    firmData.totalCents += cell.amountCents;
                    firmData.lineItems.push({
                        description: row.description,
                        amountCents: cell.amountCents,
                    });
                }
            }
        }

        const result = Array.from(firmPriceMap.values()).filter(f => f.totalCents > 0);

        // Mark lowest
        if (result.length > 0) {
            const lowest = result.reduce((min, f) => f.totalCents < min.totalCents ? f : min);
            lowest.isLowest = true;
        }

        return result;
    } catch (error) {
        console.error('[trr-generate] Error fetching price data:', error);
        return [];
    }
}

async function fetchNonPriceScores(
    _projectId: string,
    _stakeholderId: string | null
): Promise<NonPriceScore[]> {
    // TODO: Implement non-price score fetching from evaluation_non_price tables
    // For now, TRR generation proceeds without non-price data and the prompts
    // handle the empty case gracefully (noting data was unavailable).
    return [];
}

// ============================================================================
// ROUTE HANDLER
// ============================================================================

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id: trrId } = await params;
        const body = await request.json();
        const field = body.field as TrrField;

        if (!field || !['executiveSummary', 'clarifications', 'recommendation'].includes(field)) {
            return NextResponse.json(
                { error: 'Invalid field. Must be executiveSummary, clarifications, or recommendation.' },
                { status: 400 }
            );
        }

        // Fetch all TRR context
        const context = await fetchTrrContext(trrId);
        if (!context) {
            return NextResponse.json(
                { error: 'TRR not found' },
                { status: 404 }
            );
        }

        const { trrRecord, projectName, contextName, firms, nonPriceScores, addendaCount, rftDate } = context;

        // Detect recommended firm (lowest price as default, or user could set it)
        const recommendedFirm = firms.find(f => f.isRecommended)?.companyName
            || firms.find(f => f.isLowest)?.companyName
            || null;

        // Build field-specific prompt
        let userMessage: string;

        switch (field) {
            case 'executiveSummary':
                userMessage = buildTrrExecutiveSummaryPrompt({
                    contextName,
                    projectName,
                    firms: firms.map(f => ({
                        companyName: f.companyName,
                        totalCents: f.totalCents,
                        isLowest: f.isLowest,
                        isRecommended: f.isRecommended || f.isLowest,
                    })),
                    nonPriceScores,
                    addendaCount,
                    rftDate,
                    existingContent: trrRecord.executiveSummary || undefined,
                });
                break;

            case 'clarifications':
                userMessage = buildTrrClarificationsPrompt({
                    contextName,
                    recommendedFirm,
                    firms: firms.map(f => ({
                        companyName: f.companyName,
                        totalCents: f.totalCents,
                        lineItems: f.lineItems,
                    })),
                    nonPriceScores,
                    addendaCount,
                    existingContent: trrRecord.clarifications || undefined,
                });
                break;

            case 'recommendation':
                userMessage = buildTrrRecommendationPrompt({
                    contextName,
                    projectName,
                    recommendedFirm,
                    firms: firms.map(f => ({
                        companyName: f.companyName,
                        totalCents: f.totalCents,
                        isLowest: f.isLowest,
                    })),
                    nonPriceLeader: nonPriceScores.length > 0 ? nonPriceScores[0].firmName : null,
                    existingClarifications: trrRecord.clarifications || undefined,
                    existingExecutiveSummary: trrRecord.executiveSummary || undefined,
                });
                break;
        }

        // Call Claude with TRR system prompt
        const anthropic = new Anthropic();
        const systemPrompt = buildSystemPrompt('trr');

        const message = await anthropic.messages.create({
            model: 'claude-sonnet-4-20250514',
            max_tokens: 2000,
            system: systemPrompt,
            messages: [{
                role: 'user',
                content: userMessage,
            }],
        });

        // Extract text response
        const textContent = message.content.find(c => c.type === 'text');
        if (!textContent || textContent.type !== 'text') {
            throw new Error('No text response from AI');
        }

        // Clean up formatting
        const content = textContent.text
            .split('\n')
            .map(line => line.trim())
            .filter(line => {
                if (line === '') return true;
                if (/^[•\-\*]\s*$/.test(line)) return false;
                return true;
            })
            .join('\n')
            .replace(/\n{2,}/g, '\n\n')
            .trim();

        return NextResponse.json({
            success: true,
            field,
            content,
            metadata: {
                firmsUsed: firms.length,
                nonPriceDataAvailable: nonPriceScores.length > 0,
                addendaCount,
                recommendedFirm,
            },
        });

    } catch (error: any) {
        console.error('[trr-generate] Error:', error);

        if (error?.status === 529) {
            return NextResponse.json(
                { error: 'AI service is temporarily busy. Please try again.' },
                { status: 503 }
            );
        }

        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Failed to generate TRR content' },
            { status: 500 }
        );
    }
}
