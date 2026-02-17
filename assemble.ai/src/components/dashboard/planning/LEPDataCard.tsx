'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import {
    MapPin, Building2, Ruler, Shield,
    Droplets, Flame, Maximize, AlertTriangle,
} from 'lucide-react';
import { DiamondIcon } from '@/components/ui/diamond-icon';
import type { LEPData, LEPFetchStatus, LEPApiResponse, SiteInfo } from '@/types/lep';

interface LEPDataCardProps {
    projectId: string;
    hasCoordinates: boolean;
    /** Pass lat,lng so we re-fetch when address changes (not just when coordinates appear/disappear) */
    coordinates?: { lat: string; lng: string };
    onSiteInfo?: (info: SiteInfo) => void;
}

interface LEPRowProps {
    label: string;
    value: string | null;
    icon: React.ComponentType<{ className?: string }>;
    error?: string;
    isLast?: boolean;
}

function LEPRow({ label, value, icon: Icon, error, isLast = false }: LEPRowProps) {
    return (
        <div className={`flex ${!isLast ? 'border-b border-[var(--color-border)]' : ''}`}>
            <div className="w-[120px] shrink-0 px-3 py-2 flex items-center gap-1.5">
                <Icon className="w-3.5 h-3.5 text-[var(--color-text-muted)]" />
                <span className="text-sm font-medium text-[var(--color-text-muted)]">{label}</span>
            </div>
            <div className="flex-1 px-3 py-2">
                {error ? (
                    <span className="text-sm text-[var(--color-text-muted)] italic">Unavailable</span>
                ) : (
                    <span className="text-sm text-[var(--color-text-primary)]">
                        {value || 'N/A'}
                    </span>
                )}
            </div>
        </div>
    );
}

function LoadingSkeleton() {
    return (
        <div className="animate-pulse">
            {Array.from({ length: 7 }).map((_, i) => (
                <div key={i} className={`flex ${i < 6 ? 'border-b border-[var(--color-border)]' : ''}`}>
                    <div className="w-[120px] shrink-0 px-3 py-2">
                        <div className="h-4 bg-[var(--color-border)] rounded w-16" />
                    </div>
                    <div className="flex-1 px-3 py-2">
                        <div className="h-4 bg-[var(--color-border)] rounded w-32" />
                    </div>
                </div>
            ))}
        </div>
    );
}

export function LEPDataCard({ projectId, hasCoordinates, coordinates, onSiteInfo }: LEPDataCardProps) {
    const [lepData, setLepData] = useState<LEPData | null>(null);
    const [status, setStatus] = useState<LEPFetchStatus>('idle');
    const [unsupportedState, setUnsupportedState] = useState<string | null>(null);
    const [fetchedAt, setFetchedAt] = useState<string | null>(null);

    // Use ref to avoid onSiteInfo in fetchLEP dependencies (prevents re-fetch cascade)
    const onSiteInfoRef = useRef(onSiteInfo);
    onSiteInfoRef.current = onSiteInfo;

    const fetchLEP = useCallback(async (force = false) => {
        if (!hasCoordinates) return;

        setStatus('loading');
        try {
            const url = `/api/planning/${projectId}/lep`;
            const response = force
                ? await fetch(url, { method: 'POST' })
                : await fetch(url);

            const result: LEPApiResponse = await response.json();

            if (result.status === 'unsupported-state') {
                setStatus('unsupported-state');
                setUnsupportedState(result.state || 'Unknown');
                setLepData(null);
                return;
            }

            if (result.status === 'no-coordinates') {
                setStatus('idle');
                setLepData(null);
                return;
            }

            if (result.status === 'error') {
                setStatus('error');
                setLepData(null);
                return;
            }

            setLepData(result.data);
            setStatus(result.status === 'partial' ? 'partial' : 'success');
            setFetchedAt(result.data?.fetchedAt || null);

            // Pass site info back to parent for auto-filling Site Details
            if (result.siteInfo && onSiteInfoRef.current) {
                onSiteInfoRef.current(result.siteInfo);
            }
        } catch {
            setStatus('error');
            setLepData(null);
        }
    }, [projectId, hasCoordinates]);

    // Track previous coordinates to detect address changes
    const prevCoordsRef = useRef<string | null>(null);

    // Track whether coordinates were absent at any point (meaning user selected a new address during this session)
    const hadNoCoordsRef = useRef(!hasCoordinates);

    // Fetch on mount, when coordinates become available, or when address changes
    useEffect(() => {
        if (hasCoordinates) {
            const coordKey = coordinates ? `${coordinates.lat},${coordinates.lng}` : null;
            const coordsChanged = coordKey && prevCoordsRef.current && prevCoordsRef.current !== coordKey;
            // Force refresh when coordinates change OR when they appear for the first time
            // after being absent (user just selected an address)
            const isNewAddress = coordKey && !prevCoordsRef.current && hadNoCoordsRef.current;
            prevCoordsRef.current = coordKey;

            fetchLEP(!!coordsChanged || !!isNewAddress);
        } else {
            hadNoCoordsRef.current = true;
            prevCoordsRef.current = null;
            setStatus('idle');
            setLepData(null);
        }
    }, [hasCoordinates, coordinates?.lat, coordinates?.lng, fetchLEP]);

    const formatTimestamp = (iso: string | null) => {
        if (!iso) return null;
        try {
            const date = new Date(iso);
            return date.toLocaleDateString('en-AU', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
            });
        } catch {
            return null;
        }
    };

    const rows: Array<{ label: string; key: string; icon: React.ComponentType<{ className?: string }> }> = [
        { label: 'Zone', key: 'landZone', icon: MapPin },
        { label: 'FSR', key: 'floorSpaceRatio', icon: Ruler },
        { label: 'Height', key: 'buildingHeight', icon: Building2 },
        { label: 'Heritage', key: 'heritageStatus', icon: Shield },
        { label: 'Flood', key: 'floodZone', icon: Droplets },
        { label: 'Bushfire', key: 'bushfireProne', icon: Flame },
        { label: 'Min. Lot', key: 'minLotSize', icon: Maximize },
    ];

    return (
        <div className="border border-[var(--color-border)]/50 rounded overflow-hidden">
            {/* Header */}
            <div
                className="flex items-center justify-between px-4 py-2.5 backdrop-blur-md border-b border-[var(--color-border)]/50"
                style={{ backgroundColor: 'color-mix(in srgb, var(--color-bg-primary) 60%, transparent)' }}
            >
                <div className="flex items-center gap-2">
                    <span className="text-[var(--color-text-primary)] font-bold text-sm uppercase tracking-wide">
                        LEP Planning Controls
                    </span>
                    {fetchedAt && status !== 'loading' && (
                        <span className="text-[10px] text-[var(--color-text-muted)]">
                            {formatTimestamp(fetchedAt)}
                        </span>
                    )}
                </div>
                {hasCoordinates && status !== 'loading' && (
                    <button
                        onClick={() => fetchLEP(true)}
                        className="p-1 rounded hover:bg-[var(--color-accent-copper)]/10 transition-colors"
                        title="Refresh LEP data"
                    >
                        <DiamondIcon variant="empty" className="w-3.5 h-3.5 text-[var(--color-accent-copper)]" />
                    </button>
                )}
                {status === 'loading' && (
                    <DiamondIcon variant="empty" className="w-3.5 h-3.5 text-[var(--color-accent-copper)] animate-diamond-spin" />
                )}
            </div>

            {/* Content */}
            <div
                className="backdrop-blur-md"
                style={{ backgroundColor: 'color-mix(in srgb, var(--color-bg-secondary) 60%, transparent)' }}
            >
                {/* No coordinates yet */}
                {!hasCoordinates && (
                    <div className="px-4 py-6 text-center">
                        <MapPin className="w-5 h-5 mx-auto mb-2 text-[var(--color-text-muted)]" />
                        <p className="text-sm text-[var(--color-text-muted)]">
                            Select an address above to fetch LEP data
                        </p>
                    </div>
                )}

                {/* Loading */}
                {hasCoordinates && status === 'loading' && <LoadingSkeleton />}

                {/* Unsupported state */}
                {status === 'unsupported-state' && (
                    <div className="px-4 py-6 text-center">
                        <AlertTriangle className="w-5 h-5 mx-auto mb-2 text-[var(--color-text-muted)]" />
                        <p className="text-sm text-[var(--color-text-muted)]">
                            LEP data is currently available for NSW only
                        </p>
                        {unsupportedState && unsupportedState !== 'UNKNOWN' && (
                            <p className="text-xs text-[var(--color-text-muted)] mt-1">
                                Detected state: {unsupportedState}
                            </p>
                        )}
                    </div>
                )}

                {/* Error */}
                {status === 'error' && (
                    <div className="px-4 py-6 text-center">
                        <AlertTriangle className="w-5 h-5 mx-auto mb-2 text-[var(--color-text-muted)]" />
                        <p className="text-sm text-[var(--color-text-muted)]">
                            Failed to fetch LEP data
                        </p>
                        <button
                            onClick={() => fetchLEP(true)}
                            className="mt-2 text-xs text-[var(--color-accent-copper)] hover:underline"
                        >
                            Try again
                        </button>
                    </div>
                )}

                {/* Data display */}
                {lepData && (status === 'success' || status === 'partial') && (
                    <>
                        {rows.map((row, index) => (
                            <LEPRow
                                key={row.key}
                                label={row.label}
                                value={(lepData as unknown as Record<string, string | null>)[row.key] ?? null}
                                icon={row.icon}
                                error={lepData.errors[row.key.replace(/([A-Z])/g, (m) => m.toLowerCase())] ||
                                       // Map LEPData field keys back to layer keys for error lookup
                                       (row.key === 'landZone' ? lepData.errors['zoning'] : undefined) ||
                                       (row.key === 'floorSpaceRatio' ? lepData.errors['fsr'] : undefined) ||
                                       (row.key === 'buildingHeight' ? lepData.errors['height'] : undefined) ||
                                       (row.key === 'heritageStatus' ? lepData.errors['heritage'] : undefined) ||
                                       (row.key === 'floodZone' ? lepData.errors['flood'] : undefined) ||
                                       (row.key === 'bushfireProne' ? lepData.errors['bushfire'] : undefined) ||
                                       (row.key === 'minLotSize' ? lepData.errors['lotSize'] : undefined)
                                }
                                isLast={index === rows.length - 1}
                            />
                        ))}
                        {status === 'partial' && (
                            <div className="px-4 py-1.5 text-[10px] text-[var(--color-text-muted)] border-t border-[var(--color-border)]">
                                Some layers were unavailable. Click refresh to retry.
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}
