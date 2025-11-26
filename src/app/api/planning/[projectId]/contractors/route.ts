import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { contractorTrades, contractorStatuses } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { CONTRACTOR_TRADES, STATUS_TYPES } from '@/lib/constants/disciplines';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ projectId: string }> }
) {
    try {
        const { projectId } = await params;

        // Fetch all trades for the project
        const trades = await db
            .select()
            .from(contractorTrades)
            .where(eq(contractorTrades.projectId, projectId))
            .orderBy(contractorTrades.order);

        // Fetch statuses for each trade
        const tradesWithStatuses = await Promise.all(
            trades.map(async (trade) => {
                const tradeStatuses = await db
                    .select()
                    .from(contractorStatuses)
                    .where(eq(contractorStatuses.tradeId, trade.id));

                const statusMap = {
                    brief: tradeStatuses.find(s => s.statusType === 'brief')?.isActive || false,
                    tender: tradeStatuses.find(s => s.statusType === 'tender')?.isActive || false,
                    rec: tradeStatuses.find(s => s.statusType === 'rec')?.isActive || false,
                    award: tradeStatuses.find(s => s.statusType === 'award')?.isActive || false,
                };

                return {
                    id: trade.id,
                    tradeName: trade.tradeName,
                    isEnabled: trade.isEnabled,
                    order: trade.order,
                    statuses: statusMap,
                };
            })
        );

        return NextResponse.json(tradesWithStatuses);
    } catch (error) {
        console.error('Error fetching contractors:', error);
        return NextResponse.json({ error: 'Failed to fetch contractors' }, { status: 500 });
    }
}

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ projectId: string }> }
) {
    try {
        const { projectId } = await params;

        // Check if trades already exist for this project
        const existing = await db
            .select()
            .from(contractorTrades)
            .where(eq(contractorTrades.projectId, projectId));

        if (existing.length > 0) {
            return NextResponse.json({ message: 'Contractors already initialized' }, { status: 200 });
        }

        // Create all 21 default trades
        const tradeRecords = CONTRACTOR_TRADES.map((trade) => ({
            id: crypto.randomUUID(),
            projectId,
            tradeName: trade.name,
            isEnabled: false, // Default to disabled
            order: trade.order,
        }));

        const createdTrades = await db
            .insert(contractorTrades)
            .values(tradeRecords)
            .returning();

        // Create status records for each trade
        const statusRecords = createdTrades.flatMap((trade) =>
            STATUS_TYPES.map((statusType) => ({
                id: crypto.randomUUID(),
                tradeId: trade.id,
                statusType,
                isActive: false, // Default to inactive
            }))
        );

        await db.insert(contractorStatuses).values(statusRecords);

        return NextResponse.json(
            { message: 'Contractors initialized successfully', count: createdTrades.length },
            { status: 201 }
        );
    } catch (error) {
        console.error('Error initializing contractors:', error);
        return NextResponse.json({ error: 'Failed to initialize contractors' }, { status: 500 });
    }
}
