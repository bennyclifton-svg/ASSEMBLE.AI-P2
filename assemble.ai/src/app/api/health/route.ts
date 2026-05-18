import { NextResponse } from 'next/server';
import { getApplianceHealth, type ApplianceHealthResponse } from '@/lib/health/appliance-health';

export const dynamic = 'force-dynamic';

export async function GET(): Promise<NextResponse<ApplianceHealthResponse>> {
    const response = await getApplianceHealth();

    return NextResponse.json(response, {
        status: response.status === 'unhealthy' ? 503 : 200,
        headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
        },
    });
}
