/**
 * Polar SDK Client
 * Initializes and exports the Polar client for billing operations
 */

import { Polar } from '@polar-sh/sdk';

// Validate required environment variables
const POLAR_ACCESS_TOKEN = process.env.POLAR_ACCESS_TOKEN;
const POLAR_ORGANIZATION_ID = process.env.POLAR_ORGANIZATION_ID;

if (!POLAR_ACCESS_TOKEN) {
    console.warn('POLAR_ACCESS_TOKEN not set - billing features will be disabled');
}

// Initialize Polar client
export const polar = new Polar({
    accessToken: POLAR_ACCESS_TOKEN || '',
});

// Export organization ID for use in API calls
export const polarOrganizationId = POLAR_ORGANIZATION_ID || '';

// Check if Polar is properly configured
export function isPolarConfigured(): boolean {
    return !!(POLAR_ACCESS_TOKEN && POLAR_ORGANIZATION_ID);
}

// Helper to get the app URL for redirects
export function getAppUrl(): string {
    return process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
}
