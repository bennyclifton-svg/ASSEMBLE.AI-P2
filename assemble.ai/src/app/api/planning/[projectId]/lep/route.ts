import { NextRequest, NextResponse } from 'next/server';
import { db, projectDetails } from '@/lib/db';
import { eq } from 'drizzle-orm';
import { fetchLEPData, isStateSupported, detectState } from '@/lib/services/lep';
import { getCachedLEP, cacheLEPData } from '@/lib/services/lep/cache';
import type { LEPApiResponse } from '@/types/lep';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ projectId: string }> }
) {
    try {
        const { projectId } = await params;

        const [details] = await db.select().from(projectDetails)
            .where(eq(projectDetails.projectId, projectId));

        if (!details?.latitude || !details?.longitude) {
            return NextResponse.json<LEPApiResponse>({
                data: null,
                status: 'no-coordinates',
            });
        }

        const lat = parseFloat(details.latitude);
        const lng = parseFloat(details.longitude);
        const state = detectState(
            details.formattedAddress || details.address || '',
            lat,
            lng
        );

        if (!isStateSupported(state)) {
            return NextResponse.json<LEPApiResponse>({
                data: null,
                status: 'unsupported-state',
                state,
            });
        }

        // Check cache first
        const cached = await getCachedLEP(lat, lng, state);
        if (cached) {
            return NextResponse.json<LEPApiResponse>({
                data: cached.lepData,
                siteInfo: cached.siteInfo,
                status: Object.keys(cached.lepData.errors).length > 0 ? 'partial' : 'success',
                source: 'cache',
            });
        }

        // Fetch fresh from provider
        const result = await fetchLEPData(lat, lng, state);
        if (result) {
            await cacheLEPData(lat, lng, state, result.lepData, result.siteInfo);
            const hasErrors = Object.keys(result.lepData.errors).length > 0;
            return NextResponse.json<LEPApiResponse>({
                data: result.lepData,
                siteInfo: result.siteInfo,
                status: hasErrors ? 'partial' : 'success',
                source: 'api',
            });
        }

        return NextResponse.json<LEPApiResponse>({
            data: null,
            status: 'error',
            error: 'No data returned from provider',
        });
    } catch (error) {
        console.error('Error fetching LEP data:', error);
        return NextResponse.json<LEPApiResponse>(
            { data: null, status: 'error', error: String(error) },
            { status: 500 }
        );
    }
}

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ projectId: string }> }
) {
    try {
        const { projectId } = await params;

        const [details] = await db.select().from(projectDetails)
            .where(eq(projectDetails.projectId, projectId));

        if (!details?.latitude || !details?.longitude) {
            return NextResponse.json<LEPApiResponse>(
                { data: null, status: 'no-coordinates' },
                { status: 400 }
            );
        }

        const lat = parseFloat(details.latitude);
        const lng = parseFloat(details.longitude);
        const state = detectState(
            details.formattedAddress || details.address || '',
            lat,
            lng
        );

        if (!isStateSupported(state)) {
            return NextResponse.json<LEPApiResponse>({
                data: null,
                status: 'unsupported-state',
                state,
            });
        }

        // Force refresh - bypass cache
        const result = await fetchLEPData(lat, lng, state);
        if (result) {
            await cacheLEPData(lat, lng, state, result.lepData, result.siteInfo);
            const hasErrors = Object.keys(result.lepData.errors).length > 0;
            return NextResponse.json<LEPApiResponse>({
                data: result.lepData,
                siteInfo: result.siteInfo,
                status: hasErrors ? 'partial' : 'success',
                source: 'api',
            });
        }

        return NextResponse.json<LEPApiResponse>({
            data: null,
            status: 'error',
            error: 'No data returned from provider',
        });
    } catch (error) {
        console.error('Error refreshing LEP data:', error);
        return NextResponse.json<LEPApiResponse>(
            { data: null, status: 'error', error: String(error) },
            { status: 500 }
        );
    }
}
