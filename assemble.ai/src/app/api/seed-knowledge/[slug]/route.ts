import { NextResponse } from 'next/server';
import { readSeedDocument } from '@/lib/seed-knowledge/read-seed-files';

export const dynamic = 'force-dynamic';

export async function GET(
    _request: Request,
    { params }: { params: Promise<{ slug: string }> }
) {
    const { slug } = await params;
    const doc = readSeedDocument(slug);
    if (!doc) {
        return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    return NextResponse.json(doc);
}
