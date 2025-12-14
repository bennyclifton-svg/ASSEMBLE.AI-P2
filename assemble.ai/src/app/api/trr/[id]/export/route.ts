/**
 * TRR Export API Route
 * Feature 012 - TRR Report
 *
 * POST /api/trr/[id]/export - Export TRR to PDF or Word
 */

import { NextRequest, NextResponse } from 'next/server';
import { handleApiError } from '@/lib/api-utils';
import { db } from '@/lib/db';
import { trr, consultantDisciplines, contractorTrades } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

interface RouteContext {
    params: Promise<{ id: string }>;
}

export async function POST(
    request: NextRequest,
    context: RouteContext
) {
    return handleApiError(async () => {
        const { id } = await context.params;
        const body = await request.json();
        const { format } = body;

        // Verify TRR exists
        const existing = await db
            .select()
            .from(trr)
            .where(eq(trr.id, id))
            .get();

        if (!existing) {
            return NextResponse.json({ error: 'TRR not found' }, { status: 404 });
        }

        // Get discipline or trade name
        let contextName = 'Unknown';
        if (existing.disciplineId) {
            const discipline = await db
                .select()
                .from(consultantDisciplines)
                .where(eq(consultantDisciplines.id, existing.disciplineId))
                .get();
            contextName = discipline?.disciplineName || 'Unknown';
        } else if (existing.tradeId) {
            const trade = await db
                .select()
                .from(contractorTrades)
                .where(eq(contractorTrades.id, existing.tradeId))
                .get();
            contextName = trade?.tradeName || 'Unknown';
        }

        // For now, return a 501 Not Implemented - export will be added in Phase 4
        return NextResponse.json({
            message: `Export to ${format?.toUpperCase() || 'unknown format'} coming soon in Phase 4`,
            trrId: id,
            contextName,
        }, { status: 501 });
    });
}
