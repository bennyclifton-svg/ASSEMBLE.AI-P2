/**
 * LEP Provider Registry
 * Routes LEP data requests to the correct state provider.
 * Currently supports NSW; VIC/QLD stubs ready for future implementation.
 */

import { fetchNSWLEPData } from './nsw-provider';
import type { NSWFetchResult } from './nsw-provider';
import type { LEPData, SiteInfo } from '@/types/lep';

type LEPProvider = (lat: number, lng: number) => Promise<NSWFetchResult>;

const STATE_PROVIDERS: Record<string, LEPProvider> = {
    'NSW': fetchNSWLEPData,
    // Future: 'VIC': fetchVICLEPData,
    // Future: 'QLD': fetchQLDLEPData,
};

export const SUPPORTED_STATES = Object.keys(STATE_PROVIDERS);

export interface FetchResult {
    lepData: LEPData;
    siteInfo: SiteInfo;
}

export async function fetchLEPData(lat: number, lng: number, state: string): Promise<FetchResult | null> {
    const provider = STATE_PROVIDERS[state.toUpperCase()];
    if (!provider) return null;
    return provider(lat, lng);
}

export function isStateSupported(state: string): boolean {
    return state.toUpperCase() in STATE_PROVIDERS;
}

/** Normalize Australian state names to standard codes */
const STATE_NAME_MAP: Record<string, string> = {
    'new south wales': 'NSW',
    'victoria': 'VIC',
    'queensland': 'QLD',
    'south australia': 'SA',
    'western australia': 'WA',
    'tasmania': 'TAS',
    'northern territory': 'NT',
    'australian capital territory': 'ACT',
};

const VALID_STATE_CODES = ['NSW', 'VIC', 'QLD', 'SA', 'WA', 'TAS', 'NT', 'ACT'];

/**
 * Detect Australian state from address string and/or coordinates.
 * Uses multiple strategies with fallbacks.
 */
export function detectState(formattedAddress: string, lat?: number, lng?: number): string {
    // Strategy 1: Look for state code in address string
    const codeMatch = formattedAddress.match(/\b(NSW|VIC|QLD|SA|WA|TAS|NT|ACT)\b/i);
    if (codeMatch) {
        const code = codeMatch[1].toUpperCase();
        if (VALID_STATE_CODES.includes(code)) return code;
    }

    // Strategy 2: Look for full state name in address string
    const lowerAddr = formattedAddress.toLowerCase();
    for (const [name, code] of Object.entries(STATE_NAME_MAP)) {
        if (lowerAddr.includes(name)) return code;
    }

    // Strategy 3: Rough lat/lng bounding box check
    if (lat !== undefined && lng !== undefined) {
        // ACT (small area within NSW)
        if (lat > -35.95 && lat < -35.1 && lng > 148.7 && lng < 149.4) return 'ACT';
        // NSW
        if (lat > -37.6 && lat < -28.1 && lng > 140.9 && lng < 154) return 'NSW';
        // VIC
        if (lat > -39.2 && lat < -34 && lng > 140.9 && lng < 150.1) return 'VIC';
        // QLD
        if (lat > -29.2 && lat < -10 && lng > 138 && lng < 154) return 'QLD';
        // SA
        if (lat > -38.1 && lat < -26 && lng > 129 && lng < 141) return 'SA';
        // WA
        if (lat > -35.2 && lat < -13.5 && lng > 112 && lng < 129) return 'WA';
        // TAS
        if (lat > -43.7 && lat < -40.5 && lng > 143.5 && lng < 148.5) return 'TAS';
        // NT
        if (lat > -26 && lat < -10.9 && lng > 129 && lng < 138) return 'NT';
    }

    return 'UNKNOWN';
}
