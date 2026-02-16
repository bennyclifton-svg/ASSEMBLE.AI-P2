/** LEP (Local Environmental Plan) Planning Controls - structured result from ArcGIS queries */
export interface LEPData {
    landZone: string | null;
    floorSpaceRatio: string | null;
    buildingHeight: string | null;
    heritageStatus: string | null;
    floodZone: string | null;
    bushfireProne: string | null;
    minLotSize: string | null;
    state: string;
    fetchedAt: string; // ISO timestamp
    /** Per-field errors when individual layers fail e.g. { flood: "Service unavailable" } */
    errors: Record<string, string>;
}

/** Coordinates from Google Places / Nominatim geocoding */
export interface GeoCoordinates {
    lat: number;
    lng: number;
}

/** Address selection result from autocomplete */
export interface PlaceSelection {
    formattedAddress: string;
    placeId: string;
    coordinates: GeoCoordinates;
    /** Australian state code extracted from address components */
    state: string | null;
}

/** LEP fetch status for UI display */
export type LEPFetchStatus = 'idle' | 'loading' | 'success' | 'partial' | 'error' | 'unsupported-state';

/** ArcGIS layer query result (raw response shape) */
export interface ArcGISFeatureResult {
    features: Array<{
        attributes: Record<string, unknown>;
    }>;
    error?: {
        code: number;
        message: string;
    };
}

/** Site info extracted from cadastral + zoning data */
export interface SiteInfo {
    jurisdiction: string | null;
    legalAddress: string | null;
    lotAreaSqm: number | null;
}

/** API response shape from /api/planning/[projectId]/lep */
export interface LEPApiResponse {
    data: LEPData | null;
    siteInfo?: SiteInfo | null;
    status: 'success' | 'partial' | 'error' | 'no-coordinates' | 'unsupported-state';
    source?: 'cache' | 'api';
    state?: string;
    error?: string;
}
