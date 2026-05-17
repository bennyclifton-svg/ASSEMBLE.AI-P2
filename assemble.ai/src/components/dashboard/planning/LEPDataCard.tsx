'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import {
    MapPin, Building2, Ruler, Shield,
    Droplets, Flame, Maximize, AlertTriangle,
} from 'lucide-react';
import type { LEPData, LEPFetchStatus, LEPApiResponse, SiteInfo } from '@/types/lep';

const muted = 'var(--sw-muted)';

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
        <div
            className="grid items-center"
            style={{
                gridTemplateColumns: '88px 1fr',
                gap: 12,
                padding: '1px 4px',
                borderBottom: !isLast ? '1px solid var(--sw-rule-2)' : undefined,
            }}
        >
            <span
                className="flex items-center gap-1.5"
                style={{
                    fontFamily: 'var(--sw-font-mono)',
                    fontSize: 10,
                    color: muted,
                    textTransform: 'lowercase',
                    letterSpacing: '0.02em',
                }}
            >
                <Icon className="w-3 h-3" />
                {label}
            </span>
            <span
                style={{
                    fontFamily: 'var(--sw-font-sans)',
                    fontSize: 13,
                    color: error ? muted : 'var(--sw-ink)',
                    fontStyle: error ? 'italic' : 'normal',
                    textTransform: 'none',
                }}
            >
                {error ? 'Unavailable' : (value || '—')}
            </span>
        </div>
    );
}

function LoadingSkeleton() {
    return (
        <div className="animate-pulse">
            {Array.from({ length: 7 }).map((_, i) => (
                <div
                    key={i}
                    className="grid items-center"
                    style={{
                        gridTemplateColumns: '88px 1fr',
                        gap: 12,
                        padding: '1px 4px',
                        borderBottom: i < 6 ? '1px solid var(--sw-rule-2)' : undefined,
                    }}
                >
                    <div className="h-3 w-16" style={{ background: 'var(--sw-rule)' }} />
                    <div className="h-3 w-32" style={{ background: 'var(--sw-rule)' }} />
                </div>
            ))}
        </div>
    );
}

export function LEPDataCard({ projectId, hasCoordinates, coordinates, onSiteInfo }: LEPDataCardProps) {
    const [lepData, setLepData] = useState<LEPData | null>(null);
    const [status, setStatus] = useState<LEPFetchStatus>('idle');
    const [unsupportedState, setUnsupportedState] = useState<string | null>(null);

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
        <div className="flex flex-col">
            <div className="flex flex-col">
                {/* No coordinates yet */}
                {!hasCoordinates && (
                    <div className="flex flex-col items-center py-6 gap-2">
                        <MapPin className="w-5 h-5" style={{ color: muted }} />
                        <p
                            style={{
                                fontFamily: 'var(--sw-font-mono)',
                                fontSize: 10,
                                color: muted,
                                textTransform: 'lowercase',
                            }}
                        >
                            select an address above to fetch lep data
                        </p>
                    </div>
                )}

                {/* Loading */}
                {hasCoordinates && status === 'loading' && <LoadingSkeleton />}

                {/* Unsupported state */}
                {status === 'unsupported-state' && (
                    <div className="flex flex-col items-center py-6 gap-2">
                        <AlertTriangle className="w-5 h-5" style={{ color: muted }} />
                        <p
                            style={{
                                fontFamily: 'var(--sw-font-mono)',
                                fontSize: 10,
                                color: muted,
                                textTransform: 'lowercase',
                            }}
                        >
                            lep data is currently available for nsw only
                        </p>
                        {unsupportedState && unsupportedState !== 'UNKNOWN' && (
                            <p
                                style={{
                                    fontFamily: 'var(--sw-font-mono)',
                                    fontSize: 10,
                                    color: muted,
                                    textTransform: 'lowercase',
                                }}
                            >
                                detected state · {unsupportedState.toLowerCase()}
                            </p>
                        )}
                    </div>
                )}

                {/* Error */}
                {status === 'error' && (
                    <div className="flex flex-col items-center py-6 gap-2">
                        <AlertTriangle className="w-5 h-5" style={{ color: muted }} />
                        <p
                            style={{
                                fontFamily: 'var(--sw-font-mono)',
                                fontSize: 10,
                                color: muted,
                                textTransform: 'lowercase',
                            }}
                        >
                            failed to fetch lep data
                        </p>
                        <button
                            onClick={() => fetchLEP(true)}
                            style={{
                                fontFamily: 'var(--sw-font-mono)',
                                fontSize: 10,
                                color: 'var(--sw-peach)',
                                textTransform: 'lowercase',
                                letterSpacing: '0.05em',
                                background: 'transparent',
                                border: 'none',
                                cursor: 'pointer',
                                textDecoration: 'underline',
                            }}
                        >
                            try again
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
                            <div
                                className="mt-1 pt-1.5"
                                style={{
                                    fontFamily: 'var(--sw-font-mono)',
                                    fontSize: 10,
                                    color: muted,
                                    borderTop: '1px solid var(--sw-rule-2)',
                                    textTransform: 'lowercase',
                                }}
                            >
                                some layers unavailable · click refresh to retry
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}
