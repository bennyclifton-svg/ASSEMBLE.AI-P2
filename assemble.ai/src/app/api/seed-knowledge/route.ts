import { NextResponse } from 'next/server';
import { listSeedSummaries } from '@/lib/seed-knowledge/read-seed-files';

export const dynamic = 'force-dynamic';

export async function GET() {
    const summaries = listSeedSummaries();
    return NextResponse.json(summaries);
}
