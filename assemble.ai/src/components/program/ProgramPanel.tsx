'use client';

import React, { useState, useMemo, createContext, useContext, useEffect } from 'react';
import { useProgram, buildActivityTree } from '@/lib/hooks/use-program';
import { ProgramToolbar } from './ProgramToolbar';
import { ProgramTable } from './ProgramTable';
import type { ZoomLevel } from '@/types/program';

// Context for refetch function
const RefetchContext = createContext<() => void>(() => {});
export const useRefetch = () => useContext(RefetchContext);

const ZOOM_STORAGE_KEY = 'program-zoom-level';

interface ProgramPanelProfileData {
    subclass?: string[];
    scaleData?: Record<string, number>;
    complexity?: Record<string, string | string[]>;
    workScope?: string[];
}

interface ProgramPanelProps {
    projectId: string;
    projectName?: string;
    buildingClass?: string | null;
    projectType?: string | null;
    profileData?: ProgramPanelProfileData;
}

const muted = 'var(--sw-muted)';

function slugifyProjectName(projectName: string): string {
    return projectName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'project';
}

function deriveProfileCompletion(args: {
    buildingClass?: string | null;
    projectType?: string | null;
    profile?: ProgramPanelProfileData;
}): number {
    const { buildingClass, projectType, profile } = args;
    let filled = 0;
    if (buildingClass) filled++;
    if (projectType) filled++;
    if ((profile?.subclass?.length ?? 0) > 0) filled++;
    if (profile?.scaleData?.gfa_sqm != null) filled++;
    if (profile?.scaleData?.storeys != null) filled++;
    if (profile?.scaleData?.units != null) filled++;
    if (profile?.complexity && Object.keys(profile.complexity).length >= 5) filled++;
    if ((profile?.workScope?.length ?? 0) > 0) filled++;
    return Math.round((filled / 8) * 100);
}

function formatProgrammeDate(date: Date): string {
    return date.toLocaleDateString('en-AU', { month: 'short', year: 'numeric' });
}

function getFallbackDateRange(now: Date) {
    return {
        start: new Date(now.getFullYear(), now.getMonth() - 1, 1),
        end: new Date(now.getFullYear(), now.getMonth() + 24, 0),
    };
}

function buildDateRanges(
    activities: Array<{ startDate: string | null; endDate: string | null }> | undefined,
    milestones: Array<{ date: string | null }> | undefined
) {
    const now = new Date();
    const fallback = getFallbackDateRange(now);

    if (!activities) {
        return { standard: fallback, fit: fallback };
    }

    const dates: Date[] = [];
    for (const activity of activities) {
        if (activity.startDate) dates.push(new Date(activity.startDate));
        if (activity.endDate) dates.push(new Date(activity.endDate));
    }
    for (const milestone of milestones || []) {
        if (milestone.date) dates.push(new Date(milestone.date));
    }

    if (dates.length === 0) {
        return { standard: fallback, fit: fallback };
    }

    const firstProgrammeDate = new Date(Math.min(...dates.map((date) => date.getTime())));
    const lastProgrammeDate = new Date(Math.max(...dates.map((date) => date.getTime())));

    const standardStart = new Date(firstProgrammeDate);
    standardStart.setDate(standardStart.getDate() - 7);

    let standardEnd = new Date(lastProgrammeDate);
    const eighteenMonthsFromNow = new Date(now.getFullYear(), now.getMonth() + 18, 0);
    if (standardEnd < eighteenMonthsFromNow) {
        standardEnd = eighteenMonthsFromNow;
    }
    standardEnd.setMonth(standardEnd.getMonth() + 1);

    const fitStart = new Date(firstProgrammeDate);
    fitStart.setDate(fitStart.getDate() - 7);

    const fitEnd = new Date(lastProgrammeDate);
    fitEnd.setMonth(fitEnd.getMonth() + 1);

    return {
        standard: { start: standardStart, end: standardEnd },
        fit: { start: fitStart, end: fitEnd },
    };
}

function ProgrammeBreadcrumb({
    projectName,
    activeCrumb,
}: {
    projectName: string;
    activeCrumb: string;
}) {
    return (
        <nav
            aria-label="Breadcrumb"
            className="flex items-center gap-2"
            style={{
                fontFamily: 'var(--sw-font-mono)',
                fontSize: 12,
                color: muted,
            }}
        >
            <span>{slugifyProjectName(projectName)}</span>
            <span style={{ opacity: 0.5 }}>/</span>
            <span style={{ color: 'var(--sw-ink)' }}>PROGRAMME</span>
            <span style={{ opacity: 0.5 }}>/</span>
            <span style={{ color: 'var(--sw-ink)' }}>{activeCrumb}</span>
        </nav>
    );
}

function StatusPill({ label, tone }: { label: string; tone?: 'dark' }) {
    const isDark = tone === 'dark';
    return (
        <span
            style={{
                fontFamily: 'var(--sw-font-mono)',
                fontSize: 11,
                padding: '4px 10px',
                background: isDark ? 'var(--sw-ink)' : 'var(--sw-paper)',
                border: isDark ? '1px solid var(--sw-ink)' : '1px solid var(--sw-rule)',
                color: isDark ? 'var(--sw-paper)' : 'var(--sw-ink)',
                letterSpacing: '0.02em',
            }}
        >
            {label}
        </span>
    );
}

export function ProgramPanel({
    projectId,
    projectName = 'project',
    buildingClass,
    projectType,
    profileData,
}: ProgramPanelProps) {
    const { data, isLoading, error, refetch } = useProgram(projectId);
    const activities = data?.activities;
    const milestones = data?.milestones;
    const dependencies = data?.dependencies;
    const [zoomLevel, setZoomLevel] = useState<ZoomLevel>(() => {
        if (typeof window !== 'undefined') {
            const stored = localStorage.getItem(ZOOM_STORAGE_KEY);
            if (stored === 'week' || stored === 'month' || stored === 'fit') {
                return stored;
            }
        }
        return 'week';
    });

    // Persist zoom level to localStorage
    useEffect(() => {
        localStorage.setItem(ZOOM_STORAGE_KEY, zoomLevel);
    }, [zoomLevel]);

    // Build hierarchical tree from flat activities
    const activityTree = useMemo(() => {
        if (!activities) return [];
        return buildActivityTree(activities);
    }, [activities]);

    // Calculate date ranges from activities. Standard views keep the planning horizon;
    // fit view uses the programme's actual extent so it can compress onto one screen.
    const dateRanges = useMemo(
        () => buildDateRanges(activities, milestones),
        [activities, milestones]
    );
    const activeDateRange = zoomLevel === 'fit' ? dateRanges.fit : dateRanges.standard;

    const activityCount = activities?.length ?? 0;
    const scheduledCount = activities?.filter((activity) => activity.startDate && activity.endDate).length ?? 0;
    const milestoneCount = milestones?.length ?? 0;
    const dependencyCount = dependencies?.length ?? 0;
    const profileCompletionPct = useMemo(
        () => deriveProfileCompletion({ buildingClass, projectType, profile: profileData }),
        [buildingClass, projectType, profileData]
    );
    const programmeSubtitle = activityCount > 0
        ? `${activityCount} activities / ${scheduledCount} scheduled / ${milestoneCount} milestones / ${dependencyCount} dependencies / ${formatProgrammeDate(activeDateRange.start)} - ${formatProgrammeDate(activeDateRange.end)}`
        : 'No activities yet / add an activity or insert a template';
    const activeCrumb = zoomLevel === 'week'
        ? 'WEEK VIEW'
        : zoomLevel === 'month'
            ? 'MONTH VIEW'
            : 'FIT VIEW';

    if (isLoading && !data) {
        return (
            <div
                className="flex h-full items-center justify-center"
                style={{
                    background: 'var(--sw-canvas)',
                    color: muted,
                    fontFamily: 'var(--sw-font-mono)',
                }}
            >
                <div className="text-sm">Loading programme...</div>
            </div>
        );
    }

    if (error) {
        return (
            <div
                className="flex h-full items-center justify-center"
                style={{
                    background: 'var(--sw-canvas)',
                    color: 'var(--sw-rose-dk)',
                    fontFamily: 'var(--sw-font-mono)',
                }}
            >
                <div className="text-sm">Failed to load programme</div>
            </div>
        );
    }

    return (
        <RefetchContext.Provider value={refetch}>
            <div
                className="program-workspace flex h-full min-h-0 flex-col overflow-hidden"
                style={{ background: 'var(--sw-canvas)' }}
            >
                <header className="shrink-0 px-4 pt-2 pb-3" style={{ borderBottom: '1px solid var(--sw-rule-2)' }}>
                    <div className="mb-2 flex items-center justify-between gap-3">
                        <ProgrammeBreadcrumb projectName={projectName} activeCrumb={activeCrumb} />
                    </div>

                    <div className="mb-2 flex items-end justify-between gap-4">
                        <div className="min-w-0">
                            <h1
                                style={{
                                    fontFamily: 'var(--sw-font-sans)',
                                    fontSize: 30,
                                    fontWeight: 700,
                                    letterSpacing: '-0.025em',
                                    margin: 0,
                                    lineHeight: 1.1,
                                    color: 'var(--sw-ink)',
                                }}
                            >
                                Programme
                            </h1>
                            <div
                                className="truncate"
                                style={{
                                    fontFamily: 'var(--sw-font-mono)',
                                    fontSize: 12,
                                    color: muted,
                                    marginTop: 4,
                                    minHeight: 18,
                                }}
                            >
                                {programmeSubtitle}
                            </div>
                        </div>
                    </div>

                    <ProgramToolbar
                        projectId={projectId}
                        zoomLevel={zoomLevel}
                        onZoomChange={setZoomLevel}
                    />
                </header>

                <div className="min-h-0 flex-1 overflow-hidden p-4">
                    <ProgramTable
                        projectId={projectId}
                        activities={activityTree}
                        allActivities={activities || []}
                        dependencies={dependencies || []}
                        milestones={milestones || []}
                        dateRange={activeDateRange}
                        zoomLevel={zoomLevel}
                    />
                </div>
            </div>
        </RefetchContext.Provider>
    );
}
