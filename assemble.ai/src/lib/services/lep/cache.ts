/**
 * GIS Cache Service
 * Reads/writes LEP data to the gis_cache table with coordinate-based keys.
 * Cache TTL: 48 hours (planning controls change infrequently).
 */

import { db, gisCache } from '@/lib/db';
import { eq } from 'drizzle-orm';
import type { LEPData, SiteInfo } from '@/types/lep';

const CACHE_TTL_MS = 48 * 60 * 60 * 1000; // 48 hours

function makeCoordKey(lat: number, lng: number, state: string): string {
    return `${state}:${lat.toFixed(6)},${lng.toFixed(6)}`;
}

export async function getCachedLEP(lat: number, lng: number, state: string): Promise<{ lepData: LEPData; siteInfo: SiteInfo | null } | null> {
    const key = makeCoordKey(lat, lng, state);

    const [cached] = await db.select().from(gisCache).where(eq(gisCache.coordKey, key));
    if (!cached) return null;

    // Check expiry
    if (cached.expiresAt && new Date(cached.expiresAt) < new Date()) {
        return null; // Expired
    }

    // Parse siteInfo from rawData if present
    let siteInfo: SiteInfo | null = null;
    if (cached.rawData) {
        try {
            const raw = JSON.parse(cached.rawData);
            if (raw.siteInfo) siteInfo = raw.siteInfo;
        } catch { /* ignore parse errors */ }
    }

    return {
        lepData: {
            landZone: cached.landZone,
            floorSpaceRatio: cached.floorSpaceRatio,
            buildingHeight: cached.buildingHeight,
            heritageStatus: cached.heritageStatus,
            floodZone: cached.floodZone,
            bushfireProne: cached.bushfireProne,
            minLotSize: cached.minLotSize,
            state: cached.state,
            fetchedAt: cached.cachedAt?.toISOString() || new Date().toISOString(),
            errors: {},
        },
        siteInfo,
    };
}

export async function cacheLEPData(lat: number, lng: number, state: string, data: LEPData, siteInfo?: SiteInfo | null): Promise<void> {
    const key = makeCoordKey(lat, lng, state);
    const expiresAt = new Date(Date.now() + CACHE_TTL_MS);

    const values = {
        coordKey: key,
        latitude: lat.toFixed(6),
        longitude: lng.toFixed(6),
        state,
        landZone: data.landZone,
        floorSpaceRatio: data.floorSpaceRatio,
        buildingHeight: data.buildingHeight,
        heritageStatus: data.heritageStatus,
        floodZone: data.floodZone,
        bushfireProne: data.bushfireProne,
        minLotSize: data.minLotSize,
        rawData: JSON.stringify({ errors: data.errors, fetchedAt: data.fetchedAt, siteInfo: siteInfo || null }),
        cachedAt: new Date(),
        expiresAt,
    };

    // Upsert: try update first, insert if not found
    const [existing] = await db.select({ id: gisCache.id }).from(gisCache).where(eq(gisCache.coordKey, key));

    if (existing) {
        await db.update(gisCache).set(values).where(eq(gisCache.coordKey, key));
    } else {
        await db.insert(gisCache).values({
            id: crypto.randomUUID(),
            ...values,
        });
    }
}
