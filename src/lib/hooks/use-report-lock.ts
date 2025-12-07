/**
 * T061: use-report-lock hook
 * Manages report lock acquisition and heartbeat
 */

import { useState, useEffect, useCallback, useRef } from 'react';

export interface LockState {
    locked: boolean;
    lockedBy: string | null;
    lockedByName: string | null;
    lockedAt: string | null;
    expiresAt: string | null;
    isOwner: boolean;
}

export interface LockError {
    error: string;
    lockedBy: string;
    lockedByName: string;
    lockedAt: string;
    expiresAt: string;
}

// Heartbeat interval (5 minutes - well before 15 min expiry)
const HEARTBEAT_INTERVAL_MS = 5 * 60 * 1000;

/**
 * Hook for managing report lock
 */
export function useReportLock(reportId: string | null) {
    const [lockState, setLockState] = useState<LockState>({
        locked: false,
        lockedBy: null,
        lockedByName: null,
        lockedAt: null,
        expiresAt: null,
        isOwner: false,
    });

    const [error, setError] = useState<string | null>(null);
    const [isAcquiring, setIsAcquiring] = useState(false);

    const heartbeatRef = useRef<NodeJS.Timeout | null>(null);

    // Acquire lock
    const acquireLock = useCallback(async () => {
        if (!reportId) return false;

        setIsAcquiring(true);
        setError(null);

        try {
            const res = await fetch(`/api/reports/${reportId}/lock`, {
                method: 'POST',
            });

            if (!res.ok) {
                const err: LockError = await res.json();
                setError(err.error);
                setLockState({
                    locked: true,
                    lockedBy: err.lockedBy,
                    lockedByName: err.lockedByName,
                    lockedAt: err.lockedAt,
                    expiresAt: err.expiresAt,
                    isOwner: false,
                });
                return false;
            }

            const result = await res.json();
            setLockState({
                locked: true,
                lockedBy: null, // Self
                lockedByName: null,
                lockedAt: new Date().toISOString(),
                expiresAt: result.expiresAt,
                isOwner: true,
            });

            return true;
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to acquire lock');
            return false;
        } finally {
            setIsAcquiring(false);
        }
    }, [reportId]);

    // Release lock
    const releaseLock = useCallback(async () => {
        if (!reportId) return;

        // Stop heartbeat
        if (heartbeatRef.current) {
            clearInterval(heartbeatRef.current);
            heartbeatRef.current = null;
        }

        try {
            await fetch(`/api/reports/${reportId}/lock`, {
                method: 'DELETE',
            });

            setLockState({
                locked: false,
                lockedBy: null,
                lockedByName: null,
                lockedAt: null,
                expiresAt: null,
                isOwner: false,
            });
        } catch (err) {
            console.error('Failed to release lock:', err);
        }
    }, [reportId]);

    // Heartbeat to keep lock alive
    const sendHeartbeat = useCallback(async () => {
        if (!reportId || !lockState.isOwner) return;

        try {
            const res = await fetch(`/api/reports/${reportId}/lock`, {
                method: 'PATCH',
            });

            if (res.ok) {
                const result = await res.json();
                setLockState(prev => ({
                    ...prev,
                    expiresAt: result.expiresAt,
                }));
            } else {
                // Lock was lost
                setLockState(prev => ({
                    ...prev,
                    isOwner: false,
                }));
                setError('Lock was lost');

                if (heartbeatRef.current) {
                    clearInterval(heartbeatRef.current);
                    heartbeatRef.current = null;
                }
            }
        } catch (err) {
            console.error('Heartbeat failed:', err);
        }
    }, [reportId, lockState.isOwner]);

    // Start heartbeat when lock is acquired
    useEffect(() => {
        if (lockState.isOwner) {
            // Start heartbeat
            heartbeatRef.current = setInterval(sendHeartbeat, HEARTBEAT_INTERVAL_MS);
        }

        return () => {
            if (heartbeatRef.current) {
                clearInterval(heartbeatRef.current);
                heartbeatRef.current = null;
            }
        };
    }, [lockState.isOwner, sendHeartbeat]);

    // Release lock on unmount
    useEffect(() => {
        return () => {
            if (lockState.isOwner && reportId) {
                // Fire and forget - don't wait for response
                fetch(`/api/reports/${reportId}/lock`, {
                    method: 'DELETE',
                }).catch(() => {});
            }
        };
    }, [lockState.isOwner, reportId]);

    // Check if lock is expired
    const isExpired = useCallback(() => {
        if (!lockState.expiresAt) return false;
        return new Date(lockState.expiresAt).getTime() < Date.now();
    }, [lockState.expiresAt]);

    // Time until expiry
    const timeUntilExpiry = useCallback(() => {
        if (!lockState.expiresAt) return null;
        const ms = new Date(lockState.expiresAt).getTime() - Date.now();
        return ms > 0 ? ms : 0;
    }, [lockState.expiresAt]);

    return {
        ...lockState,
        error,
        isAcquiring,
        acquireLock,
        releaseLock,
        isExpired,
        timeUntilExpiry,
    };
}

/**
 * Format time until expiry for display
 */
export function formatTimeUntilExpiry(ms: number | null): string {
    if (ms === null || ms <= 0) return 'Expired';

    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);

    if (minutes > 0) {
        return `${minutes}m ${seconds}s`;
    }
    return `${seconds}s`;
}
