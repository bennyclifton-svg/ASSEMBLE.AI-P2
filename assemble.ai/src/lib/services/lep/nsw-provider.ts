/**
 * NSW LEP Provider
 * Fetches planning controls from NSW Planning Portal ArcGIS REST services.
 *
 * Verified 2025-02-09 against live ArcGIS service endpoints:
 * - EPI_Primary_Planning_Layers: layers 0-6 (Heritage, FSR, Zoning, Reservation, Lot Size, Height, Land Application)
 * - Planning_Portal_Hazard: layers 228-232 (Hazard group, Bushfire 229, Flood 230, Hunter Flood 231, Landslide 232)
 */

import type { LEPData, SiteInfo, ArcGISFeatureResult } from '@/types/lep';

const PRIMARY_BASE = 'https://mapprod3.environment.nsw.gov.au/arcgis/rest/services/Planning/EPI_Primary_Planning_Layers/MapServer';
const HAZARD_BASE = 'https://mapprod3.environment.nsw.gov.au/arcgis/rest/services/ePlanning/Planning_Portal_Hazard/MapServer';
const CADASTRE_BASE = 'https://maps.six.nsw.gov.au/arcgis/rest/services/public/NSW_Cadastre/MapServer';

const LAYER_CONFIG = {
    zoning:   { base: PRIMARY_BASE, layerId: 2 },
    fsr:      { base: PRIMARY_BASE, layerId: 1 },
    height:   { base: PRIMARY_BASE, layerId: 5 },
    heritage: { base: PRIMARY_BASE, layerId: 0 },
    lotSize:  { base: PRIMARY_BASE, layerId: 4 },
    flood:    { base: HAZARD_BASE,  layerId: 230 },
    bushfire: { base: HAZARD_BASE,  layerId: 229 },
} as const;

type LayerKey = keyof typeof LAYER_CONFIG;

const FETCH_TIMEOUT = 10_000; // 10s per layer
const MAX_RETRIES = 2;
const RETRY_DELAY = 1000; // 1s

// 25m buffer handles geocoding to road centerlines (Nominatim/Google)
// rather than property lots - ensures parcel-based layers (FSR, height, lot size) are hit
const SPATIAL_BUFFER_M = 25;

function buildQueryUrl(base: string, layerId: number, lat: number, lng: number): string {
    const params = new URLSearchParams({
        geometry: `${lng},${lat}`,
        geometryType: 'esriGeometryPoint',
        spatialRel: 'esriSpatialRelIntersects',
        distance: String(SPATIAL_BUFFER_M),
        units: 'esriSRUnit_Meter',
        outFields: '*',
        returnGeometry: 'false',
        f: 'json',
        inSR: '4326',
    });
    return `${base}/${layerId}/query?${params}`;
}

async function fetchWithTimeout(url: string, timeoutMs: number): Promise<Response> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
        return await fetch(url, { signal: controller.signal });
    } finally {
        clearTimeout(timer);
    }
}

async function fetchLayerWithRetry(url: string): Promise<ArcGISFeatureResult | null> {
    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
        try {
            const response = await fetchWithTimeout(url, FETCH_TIMEOUT);
            if (!response.ok) {
                if (response.status === 503 || response.status === 429) {
                    // Retryable errors
                    if (attempt < MAX_RETRIES - 1) {
                        await new Promise(r => setTimeout(r, RETRY_DELAY * (attempt + 1)));
                        continue;
                    }
                }
                return null;
            }
            const data = await response.json();
            if (data.error) return null;
            return data as ArcGISFeatureResult;
        } catch (err) {
            if (attempt < MAX_RETRIES - 1) {
                await new Promise(r => setTimeout(r, RETRY_DELAY * (attempt + 1)));
                continue;
            }
            return null;
        }
    }
    return null;
}

// --- Extraction functions ---

// With spatial buffer, queries may return multiple features from adjacent parcels.
// Extraction functions iterate to find the first feature with a meaningful value.

function extractZoning(result: ArcGISFeatureResult | null): string | null {
    if (!result?.features?.length) return null;
    for (const feature of result.features) {
        const attrs = feature.attributes;
        const code = String(attrs['SYM_CODE'] || attrs['LAB_ZONE'] || '');
        const label = String(attrs['LAB_ZONE'] || attrs['LAY_CLASS'] || '');
        if (code && label && code !== label) return `${code} - ${label}`;
        if (code || label) return code || label;
    }
    return null;
}

function extractFSR(result: ArcGISFeatureResult | null): string | null {
    if (!result?.features?.length) return null;
    // Iterate features to find first non-null FSR value
    for (const feature of result.features) {
        const attrs = feature.attributes;
        const fsr = attrs['FSR'] ?? attrs['LAB_FSR'] ?? attrs['FSR_SZ'];
        if (fsr === null || fsr === undefined) continue;
        const num = typeof fsr === 'number' ? fsr : parseFloat(String(fsr));
        if (isNaN(num)) return String(fsr);
        return `${num}:1`;
    }
    // Check for clause-based FSR (LAY_CLASS = "CA")
    const first = result.features[0].attributes;
    if (String(first['LAY_CLASS'] || '') === 'CA') {
        const clause = String(first['LEGIS_REF_CLAUSE'] || '');
        return clause ? `See ${clause}` : 'See LEP clause';
    }
    return null;
}

function extractHeight(result: ArcGISFeatureResult | null): string | null {
    if (!result?.features?.length) return null;
    // Iterate features to find first numeric height
    for (const feature of result.features) {
        const attrs = feature.attributes;
        const height = attrs['MAX_B_H'] ?? attrs['MAX_B_H_M'] ?? attrs['LAB_HOB'];
        if (height === null || height === undefined) continue;
        const num = typeof height === 'number' ? height : parseFloat(String(height));
        if (isNaN(num)) continue;
        return `${num}m`;
    }
    // Many LGAs use "CA" (Clause Application) instead of numeric height
    const first = result.features[0].attributes;
    if (String(first['LAY_CLASS'] || '') === 'CA') {
        const clause = String(first['LEGIS_REF_CLAUSE'] || '');
        return clause ? `See ${clause}` : 'See LEP clause';
    }
    return null;
}

function extractHeritage(result: ArcGISFeatureResult | null): string | null {
    if (!result?.features?.length) return null;
    for (const feature of result.features) {
        const attrs = feature.attributes;
        const name = String(attrs['HER_NAME'] || attrs['LAB_HER'] || attrs['ITEM_NAME'] || '');
        if (name) {
            const significance = String(attrs['SIG'] || attrs['SIGNIFICANCE'] || '');
            return significance ? `${name} (${significance})` : name;
        }
    }
    return 'Heritage Item';
}

function extractLotSize(result: ArcGISFeatureResult | null): string | null {
    if (!result?.features?.length) return null;
    for (const feature of result.features) {
        const attrs = feature.attributes;
        const size = attrs['LOT_SIZE'] ?? attrs['MIN_LOT'] ?? attrs['LAB_LSZ'] ?? attrs['LSZ_SZ'];
        if (size === null || size === undefined) continue;
        const num = typeof size === 'number' ? size : parseFloat(String(size));
        if (isNaN(num)) continue;
        return `${num} m\u00B2`;
    }
    return null;
}

function extractFlood(result: ArcGISFeatureResult | null): string | null {
    if (!result?.features?.length) return null;
    for (const feature of result.features) {
        const attrs = feature.attributes;
        const label = String(attrs['LAB_FLOOD'] || attrs['LABEL'] || '');
        if (label) return label;
    }
    return 'Flood Planning Area';
}

function extractBushfire(result: ArcGISFeatureResult | null): string | null {
    if (!result?.features?.length) return null;
    for (const feature of result.features) {
        const attrs = feature.attributes;
        const category = String(attrs['CATEGORY'] || attrs['BFP_CAT'] || '');
        if (category) return category;
    }
    return 'Bushfire Prone Land';
}

// --- Site info extraction ---

function extractJurisdiction(zoningResult: ArcGISFeatureResult | null): string | null {
    if (!zoningResult?.features?.length) return null;
    for (const feature of zoningResult.features) {
        const lga = String(feature.attributes['LGA_NAME'] || '');
        if (lga) {
            // Title case: "INNER WEST" → "Inner West Council"
            const titleCase = lga.toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
            return `${titleCase} Council`;
        }
    }
    return null;
}

function extractCadastralInfo(result: ArcGISFeatureResult | null): { legalAddress: string | null; lotAreaSqm: number | null } {
    if (!result?.features?.length) return { legalAddress: null, lotAreaSqm: null };
    // Pick the first lot (closest to point)
    const attrs = result.features[0].attributes;
    const lotId = String(attrs['lotidstring'] || '');
    const area = attrs['planlotarea'] as number | null;

    // Format lotidstring "23//DP1263161" → "Lot 23 DP 1263161"
    let legalAddress: string | null = null;
    if (lotId) {
        const match = lotId.match(/^(\d+[A-Za-z]?)\/\/(DP|SP)(\d+)$/);
        if (match) {
            legalAddress = `Lot ${match[1]} ${match[2]} ${match[3]}`;
        } else {
            legalAddress = lotId;
        }
    }

    return {
        legalAddress,
        lotAreaSqm: (area && typeof area === 'number') ? Math.round(area * 100) / 100 : null,
    };
}

// --- Main fetch function ---

export interface NSWFetchResult {
    lepData: LEPData;
    siteInfo: SiteInfo;
}

export async function fetchNSWLEPData(lat: number, lng: number): Promise<NSWFetchResult> {
    const layerKeys = Object.keys(LAYER_CONFIG) as LayerKey[];
    const urls = layerKeys.map(key => {
        const { base, layerId } = LAYER_CONFIG[key];
        return buildQueryUrl(base, layerId, lat, lng);
    });

    // Also fetch cadastral lot data
    const cadastreUrl = buildQueryUrl(CADASTRE_BASE, 9, lat, lng);

    // Fetch all layers + cadastre in parallel
    const [lepResults, cadastreResult] = await Promise.all([
        Promise.allSettled(urls.map(url => fetchLayerWithRetry(url))),
        fetchLayerWithRetry(cadastreUrl).catch(() => null),
    ]);

    const extractors: Record<LayerKey, (r: ArcGISFeatureResult | null) => string | null> = {
        zoning: extractZoning,
        fsr: extractFSR,
        height: extractHeight,
        heritage: extractHeritage,
        lotSize: extractLotSize,
        flood: extractFlood,
        bushfire: extractBushfire,
    };

    const fieldMap: Record<LayerKey, keyof LEPData> = {
        zoning: 'landZone',
        fsr: 'floorSpaceRatio',
        height: 'buildingHeight',
        heritage: 'heritageStatus',
        lotSize: 'minLotSize',
        flood: 'floodZone',
        bushfire: 'bushfireProne',
    };

    const errors: Record<string, string> = {};
    const data: Partial<LEPData> = {};
    let zoningResult: ArcGISFeatureResult | null = null;

    for (let i = 0; i < layerKeys.length; i++) {
        const key = layerKeys[i];
        const result = lepResults[i];
        const fieldName = fieldMap[key];

        if (result.status === 'rejected') {
            errors[key] = 'Service unavailable';
            (data as Record<string, unknown>)[fieldName] = null;
        } else {
            const value = result.value;
            if (value === null) {
                errors[key] = 'Service unavailable';
                (data as Record<string, unknown>)[fieldName] = null;
            } else {
                (data as Record<string, unknown>)[fieldName] = extractors[key](value);
                if (key === 'zoning') zoningResult = value;
            }
        }
    }

    // Extract site info from zoning + cadastre responses
    const jurisdiction = extractJurisdiction(zoningResult);
    const { legalAddress, lotAreaSqm } = extractCadastralInfo(cadastreResult);

    return {
        lepData: {
            landZone: (data.landZone as string) ?? null,
            floorSpaceRatio: (data.floorSpaceRatio as string) ?? null,
            buildingHeight: (data.buildingHeight as string) ?? null,
            heritageStatus: (data.heritageStatus as string) ?? null,
            floodZone: (data.floodZone as string) ?? null,
            bushfireProne: (data.bushfireProne as string) ?? null,
            minLotSize: (data.minLotSize as string) ?? null,
            state: 'NSW',
            fetchedAt: new Date().toISOString(),
            errors,
        },
        siteInfo: {
            jurisdiction,
            legalAddress,
            lotAreaSqm,
        },
    };
}
