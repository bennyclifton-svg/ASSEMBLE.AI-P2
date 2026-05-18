import { NextResponse } from 'next/server';
import { getSaasHealth } from '@/lib/health/saas-health';

export async function GET() {
    const response = await getSaasHealth();
    return NextResponse.json(response, {
        status: response.status === 'unhealthy' ? 503 : 200,
    });
}
