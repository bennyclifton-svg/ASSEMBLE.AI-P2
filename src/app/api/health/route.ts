/**
 * Health Check API Endpoint
 * Returns application health status including database connectivity
 *
 * GET /api/health
 */

import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { sql } from 'drizzle-orm';

// Version from package.json (or default)
const APP_VERSION = process.env.npm_package_version || '1.0.0';

export interface HealthResponse {
    status: 'healthy' | 'unhealthy';
    version: string;
    environment: string;
    database: {
        connected: boolean;
        type: 'postgresql' | 'sqlite';
        latencyMs: number;
        error?: string;
    };
    timestamp: string;
}

export async function GET(): Promise<NextResponse<HealthResponse>> {
    const startTime = Date.now();
    const isProduction = process.env.NODE_ENV === 'production';
    const usePostgres = !!(process.env.DATABASE_URL || process.env.SUPABASE_POSTGRES_URL);

    let databaseConnected = false;
    let databaseError: string | undefined;

    try {
        // Execute a simple query to check database connectivity
        if (usePostgres) {
            // PostgreSQL health check
            await db.execute(sql`SELECT 1`);
        } else {
            // SQLite health check
            await db.execute(sql`SELECT 1`);
        }
        databaseConnected = true;
    } catch (error) {
        databaseConnected = false;
        databaseError = error instanceof Error ? error.message : 'Unknown database error';
    }

    const latencyMs = Date.now() - startTime;
    const isHealthy = databaseConnected;

    const response: HealthResponse = {
        status: isHealthy ? 'healthy' : 'unhealthy',
        version: APP_VERSION,
        environment: isProduction ? 'production' : 'development',
        database: {
            connected: databaseConnected,
            type: usePostgres ? 'postgresql' : 'sqlite',
            latencyMs,
            ...(databaseError && { error: databaseError }),
        },
        timestamp: new Date().toISOString(),
    };

    return NextResponse.json(response, {
        status: isHealthy ? 200 : 503,
        headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
        },
    });
}
